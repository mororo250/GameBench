import { TicTacToeGame, Player, GameState, BoardState } from "../lib/TicTacToe";
import { MatchHistory, AddMatchInput } from "../lib/matchHistory";

export enum PlayerType
{
    Human = "Human",
    LLM = "LLM",
}

export interface PlayerConfig
{
    type: PlayerType;
    modelId?: string;
}

export interface TicTacToeState
{
    boardState: Readonly<BoardState>;
    gameState: GameState;
    nextPlayer: Player;
    playerXConfig: PlayerConfig;
    playerOConfig: PlayerConfig;
    statusMessage: string;
    error: string | null; // Error related to the last attempted move
}

export type TicTacToeStateChangeListener = (newState: TicTacToeState) => void;

/**
 * Manages the core logic and state of a Tic Tac Toe game,
 * including player configuration, status message generation,
 * and recording match history.
 */
export class TicTacToeController
{
    private game: TicTacToeGame;
    private state: TicTacToeState;
    private listeners: TicTacToeStateChangeListener[] = [];
    private historyManager: MatchHistory;

    constructor(historyManager: MatchHistory) 
    {
        this.game = new TicTacToeGame();
        this.historyManager = historyManager; 
        const initialPlayerXConfig: PlayerConfig = { type: PlayerType.LLM };
        const initialPlayerOConfig: PlayerConfig = { type: PlayerType.Human }; 
        this.state = {
            boardState: this.game.getBoardState(),
            gameState: this.game.getGameState(),
            nextPlayer: this.game.getNextPlayer(),
            playerXConfig: initialPlayerXConfig,
            playerOConfig: initialPlayerOConfig,
            statusMessage: "",
            error: null,
        };
        this.state.statusMessage = this.generateStatusMessage();
    }


    public getState(): Readonly<TicTacToeState>
    {
        return { ...this.state, boardState: [...this.state.boardState] };
    }

    public subscribe(listener: TicTacToeStateChangeListener): () => void
    {
        this.listeners.push(listener);
        return () =>
        {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void
    {
        const stateSnapshot = this.getState();
        this.listeners.forEach(listener => listener(stateSnapshot));
    }

    private updateState(updates: Partial<TicTacToeState>): void
    {
        const previousGameState = this.state.gameState; 
        const wasUpdatingConfig = 'playerXConfig' in updates || 'playerOConfig' in updates;
        this.state = { ...this.state, ...updates };

        if ('gameState' in updates || 'nextPlayer' in updates || wasUpdatingConfig || 'error' in updates)
        {
             this.state.statusMessage = this.generateStatusMessage();
        }
        this.notifyListeners();

        if (previousGameState === GameState.Ongoing && this.state.gameState !== GameState.Ongoing) {
            this.recordMatch();
        }
    }


    public setPlayerConfig(player: Player.X | Player.O, config: PlayerConfig): void
    {
        console.log(`Controller: Setting Player ${player === Player.X ? 'X' : 'O'} Config:`, config);
        if (player === Player.X)
        {
            if (config.type === this.state.playerXConfig.type && config.modelId === this.state.playerXConfig.modelId) return;
            this.updateState({ playerXConfig: config });
        } else
        {
            if (config.type === this.state.playerOConfig.type && config.modelId === this.state.playerOConfig.modelId) return;
            this.updateState({ playerOConfig: config });
        }
    }

    public makeMove(index: number): boolean
    {
        if (this.state.gameState !== GameState.Ongoing)
        {
            console.warn("Controller: Attempted move when game is not ongoing.");
            this.updateState({ error: "Game is already over." });
            return false;
        }

        try
        {
            this.game.makeMove(index);
            this.updateState({
                boardState: this.game.getBoardState(),
                gameState: this.game.getGameState(),
                nextPlayer: this.game.getNextPlayer(),
                error: null,
            });
            return true;
        }
        catch (error: any)
        {
            console.error(`Controller: Invalid move attempt at index ${index}`, error);
            this.updateState({ error: error.message || "Invalid move attempted." });
            return false;
        }
    }

    public resetGame(): void
    {
        console.log("Controller: Resetting game");
        this.game.resetGame();
        this.updateState({
            boardState: this.game.getBoardState(),
            gameState: this.game.getGameState(),
            nextPlayer: this.game.getNextPlayer(),
            error: null,
        });
    }

    private generateStatusMessage(): string
    {
        const { gameState, nextPlayer, playerXConfig, playerOConfig, error } = this.state;

        if (error) return `Game Error: ${error}`;

        switch (gameState)
        {
            case GameState.Draw: return "Game over: Draw";
            case GameState.XWins: return `Game over: X wins! (${playerXConfig.type})`;
            case GameState.OWins: return `Game over: O wins! (${playerOConfig.type})`;
            case GameState.Ongoing:
            default:
                const playerSymbol = nextPlayer === Player.X ? 'X' : 'O';
                const turnPlayerConfig = nextPlayer === Player.X ? playerXConfig : playerOConfig;
                if (turnPlayerConfig.type === PlayerType.LLM)
                {
                    return `LLM ${playerSymbol} is thinking...`;
                }
                else
                {
                    return `Game ongoing. ${turnPlayerConfig.type}'s turn (${playerSymbol}).`;
                }
        }
    }

    // --- LLM Interaction Helpers ---
    public buildLlmPrompt(player: Player, lastLlmError: string | null): string
    {
        const rules = this.game.explainGame();
        const moveFormat = this.game.explainNextMoveFormat();
        const boardStatus = this.game.displayGameStatus();
        const currentGameError = this.state.error;

        let prompt = `You are Player ${player === Player.X ? 'X' : 'O'} in a game of Tic-Tac-Toe.\n\n`;
        prompt += `Rules:\n${rules}\n\n`;
        prompt += `Current Game State:\n${boardStatus}\n\n`;
        prompt += `Move Format:\n${moveFormat}\n\n`;

        if (lastLlmError) {
              prompt += `Important: Your previous attempt resulted in an error: "${lastLlmError}". Please try again, ensuring you select a valid, empty square (1-9).\n\n`;
        } else if (currentGameError) {
            prompt += `Important: The last move attempt resulted in a game error: "${currentGameError}". ${this.game.invalidMoveWarning(currentGameError)} Please choose a valid, empty square.\n\n`; // Fixed dot
        }

        prompt += `Based on the current board and rules, what is your next move? Please respond with only the number of the square (1-9) you choose.`;
        return prompt;
    }

    public attemptLlmMove(llmResponse: string): boolean
    {
        const moveIndex = this.parseLlmMove(llmResponse);

        if (moveIndex === null)
        {
            const parseError = `Could not parse a valid move (1-9) from LLM response: "${llmResponse}"`;
            console.error(`Controller: ${parseError}`);
            this.updateState({ error: parseError }); // Update state triggers status/notification
            return false;
        }

        console.log(`Controller: Parsed LLM move: ${moveIndex + 1}`);
        return this.makeMove(moveIndex);
    }

    private parseLlmMove(responseText: string): number | null
    {
        const matches = responseText.match(/\b([1-9])\b/g);
        if (matches && matches.length > 0)
        {
            const lastNumberStr = matches[matches.length - 1];
            const move = parseInt(lastNumberStr, 10);
            if (!isNaN(move) && move >= 1 && move <= 9)
            {
                return move - 1;
            }
        }
         const singleDigitMatch = responseText.trim().match(/^([1-9])$/);
          if (singleDigitMatch) {
              const move = parseInt(singleDigitMatch[1], 10);
              if (!isNaN(move)) {
                  return move - 1;
              }
          }
        return null;
    }


    private recordMatch(): void
    {
        const { gameState, playerXConfig, playerOConfig } = this.state;
        if (gameState === GameState.Ongoing) {
             console.warn("Controller: recordMatch called while game is ongoing.");
             return;
        }

        const getPlayerName = (config: PlayerConfig): string => {
            return config.type === PlayerType.LLM ? (config.modelId || `LLM_${config === playerXConfig ? 'X' : 'O'}`) : PlayerType.Human;
        };

        const model1Name = getPlayerName(playerXConfig);
        const model2Name = getPlayerName(playerOConfig);
        let winnerName: string;

        switch (gameState) {
            case GameState.XWins: winnerName = model1Name; break;
            case GameState.OWins: winnerName = model2Name; break;
            case GameState.Draw:
            default: winnerName = "Draw"; break;
        }

        const matchData: AddMatchInput = {
            model1: model1Name,
            model2: model2Name,
            game: "TicTacToe",
            winner: winnerName,
        };

        console.log("Controller: Recording match:", matchData);
        this.historyManager.addMatch(matchData)
            .then(() => console.log("Controller: Match recorded successfully"))
            .catch(error => console.error("Controller: Failed to record match history:", error));
    }

}
