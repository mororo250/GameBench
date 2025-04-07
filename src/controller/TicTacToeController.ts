import { TicTacToeGame, Player, GameState, BoardState } from "../lib/TicTacToe";
import { MatchHistory, AddMatchInput } from "../lib/matchHistory";
import { LlmController, LlmControllerState, ChatMessage } from "./LlmController";

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

export interface TicTacToeControllerState
{
    boardState: Readonly<BoardState>;
    gameState: GameState;
    nextPlayer: Player;
    playerXConfig: PlayerConfig;
    playerOConfig: PlayerConfig;
    apiKey: string;
    isThinkingX: boolean;
    isThinkingO: boolean;
    errorX: string | null;
    errorO: string | null;
    chatHistoryX: Readonly<ChatMessage[]>;
    chatHistoryO: Readonly<ChatMessage[]>;
    statusMessage: string;
}

export type StateChangeListener = (newState: TicTacToeControllerState) => void;

export class TicTacToeController
{
    private game: TicTacToeGame;
    private historyManager: MatchHistory;
    private state: TicTacToeControllerState;
    private listeners: StateChangeListener[] = [];

    private llmControllerX: LlmController;
    private llmControllerO: LlmController;
    private llmUnsubscribeX: (() => void) | null = null;
    private llmUnsubscribeO: (() => void) | null = null;


    constructor(historyManager: MatchHistory)
    {
        this.game = new TicTacToeGame();
        this.historyManager = historyManager;

        this.state = {
            boardState: this.game.getBoardState(),
            gameState: this.game.getGameState(),
            nextPlayer: this.game.getNextPlayer(),
            playerXConfig: { type: PlayerType.LLM }, // Default config
            playerOConfig: { type: PlayerType.Human }, // Default config
            apiKey: "",
            isThinkingX: false,
            isThinkingO: false,
            errorX: null,
            errorO: null,
            chatHistoryX: [],
            chatHistoryO: [],
            statusMessage: this.generateStatusMessage(),
        };

        this.llmControllerX = new LlmController();
        this.llmControllerO = new LlmController();

        this.configureAndSubscribeLlm(Player.X);
        this.configureAndSubscribeLlm(Player.O);

        this.triggerTurn();
    }

    // --- State Management & Subscription ---

    public getState(): Readonly<TicTacToeControllerState>
    {
        return this.state;
    }

    public subscribe(listener: StateChangeListener): () => void
    {
        this.listeners.push(listener);
        return () =>
        {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void
    {
        const stateSnapshot = { ...this.state };
        this.listeners.forEach(listener => listener(stateSnapshot));
    }

    private updateState(updates: Partial<TicTacToeControllerState>): void
    {
        this.state = { ...this.state, ...updates };
        this.state.statusMessage = this.generateStatusMessage();
        this.notifyListeners();
    }

    public async setApiKey(key: string): Promise<void>
    {
        console.log("Controller: Setting API Key");
        if (key === this.state.apiKey) return;

        this.updateState({ apiKey: key });

        await this.configureAndSubscribeLlm(Player.X);
        await this.configureAndSubscribeLlm(Player.O);
        this.triggerTurnIfLlm();
    }

    public async setPlayerConfig(player: Player.X | Player.O, config: PlayerConfig): Promise<void>
    {
        console.log(`Controller: Setting Player ${player === Player.X ? 'X' : 'O'} Config:`, config);
        const currentState = this.getState();
        const currentConfig = player === Player.X ? currentState.playerXConfig : currentState.playerOConfig;

        // Avoid unnecessary updates if config hasn't changed
        if (config.type === currentConfig.type && config.modelId === currentConfig.modelId)
        {
            return;
        }

        if (player === Player.X)
        {
            this.updateState({ playerXConfig: config });
            await this.configureAndSubscribeLlm(Player.X);
        } else
        {
            this.updateState({ playerOConfig: config });
            await this.configureAndSubscribeLlm(Player.O);
        }
        this.triggerTurnIfLlm();
    }

    public handleSquareClick(index: number): void
    {
        console.log(`Controller: Handling square click ${index}`);
        const currentPlayer = this.game.getNextPlayer();
        const currentPlayerConfig = currentPlayer === Player.X ? this.state.playerXConfig : this.state.playerOConfig;

        if (currentPlayerConfig.type === PlayerType.Human && this.game.getGameState() === GameState.Ongoing)
        {
            this.processHumanMove(index);
        } else
        {
            console.warn("Controller: Click ignored - not a human player's turn or game over.");
        }
    }

    public restartGame(): void
    {
        console.log("Controller: Restarting game");
        this.game.resetGame();
        this.llmControllerX.reset(true);
        this.llmControllerO.reset(true);
        this.updateState({
            boardState: this.game.getBoardState(),
            gameState: this.game.getGameState(),
            nextPlayer: this.game.getNextPlayer(),
            isThinkingX: false,
            isThinkingO: false,
            errorX: null,
            errorO: null,
            chatHistoryX: [],
            chatHistoryO: [],
        });
        this.triggerTurn();
    }

    private attemptMove(index: number, player: Player): void
    {
        try
        {
            this.game.makeMove(index);
            const newGameState = this.game.getGameState();
            this.updateState({
                boardState: this.game.getBoardState(),
                gameState: newGameState,
                nextPlayer: this.game.getNextPlayer(),
                errorX: player === Player.X ? null : this.state.errorX,
                errorO: player === Player.O ? null : this.state.errorO,
                isThinkingX: player === Player.X ? false : this.state.isThinkingX,
                isThinkingO: player === Player.O ? false : this.state.isThinkingO,
            });

            if (newGameState !== GameState.Ongoing)
            {
                this.recordMatch();
            } else
            {
                this.triggerTurn();
            }
        }
        catch (error: any)
        {
            console.error(`Controller: Invalid move by ${player === Player.X ? 'X' : 'O'}`, error);
            if (player === Player.X)
            {
                this.updateState({ errorX: error.message || "Invalid move", isThinkingX: false });
            } else
            {
                this.updateState({ errorO: error.message || "Invalid move", isThinkingO: false });
            }
        }
    }

    private triggerTurn(): void
    {
        const nextPlayer = this.game.getNextPlayer();
        const gameState = this.game.getGameState();

        if (gameState !== GameState.Ongoing)
        {
            return;
        }

        const nextPlayerConfig = nextPlayer === Player.X ? this.state.playerXConfig : this.state.playerOConfig;

        if (nextPlayerConfig.type === PlayerType.LLM)
        {
            console.log(`Controller: Triggering LLM turn for Player ${nextPlayer === Player.X ? 'X' : 'O'}`);
            this.requestLlmMove(nextPlayer);
        } else
        {
            console.log(`Controller: Waiting for Human Player ${nextPlayer === Player.X ? 'X' : 'O'}'s move`);
        }
    }

    private recordMatch(): void
    {
        const gameState = this.game.getGameState();
        if (gameState === GameState.Ongoing) return;

        const getPlayerName = (config: PlayerConfig): string =>
        {
            return config.type === PlayerType.LLM ? (config.modelId || `UnselectedLLM_${config === this.state.playerXConfig ? 'X' : 'O'}`) : PlayerType.Human;
        };

        const model1Name = getPlayerName(this.state.playerXConfig);
        const model2Name = getPlayerName(this.state.playerOConfig);
        let winnerName: string;

        switch (gameState)
        {
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

        this.historyManager.addMatch(matchData)
            .then(() => console.log("Controller: Match recorded successfully", matchData))
            .catch(error => console.error("Controller: Failed to record match history:", error));
    }

    private generateStatusMessage(): string
    {
        const { gameState, nextPlayer, playerXConfig, playerOConfig, isThinkingX, isThinkingO, errorX, errorO } = this.state;

        if (errorX) return `Player X Error: ${errorX}`;
        if (errorO) return `Player O Error: ${errorO}`;
        if (isThinkingX) return "LLM X is thinking...";
        if (isThinkingO) return "LLM O is thinking...";

        switch (gameState)
        {
            case GameState.Draw: return "Game over: Draw";
            case GameState.XWins: return `Game over: X wins! (${this.state.playerXConfig.type})`;
            case GameState.OWins: return `Game over: O wins! (${this.state.playerOConfig.type})`;
            case GameState.Ongoing:
            default:
                const playerSymbol = nextPlayer === Player.X ? 'X' : 'O';
                const turnPlayerConfig = nextPlayer === Player.X ? playerXConfig : playerOConfig;
                return `Game ongoing. ${turnPlayerConfig.type}'s turn (${playerSymbol}).`;
        }
    }

    private processHumanMove = (index: number): void =>
    {
        console.log("Controller: Received move from Human Handler:", index);
        this.attemptMove(index, this.game.getNextPlayer());
    };

    private handleLlmStateUpdate = (player: Player, llmState: LlmControllerState): void =>
    {
        console.log(`Controller: Received state update from LLM Controller (${player === Player.X ? 'X' : 'O'}):`, llmState);
        if (player === Player.X)
        {
            this.updateState({
                isThinkingX: llmState.isThinking,
                errorX: llmState.error,
                chatHistoryX: llmState.chatHistory,
            });
        } else
        {
            this.updateState({
                isThinkingO: llmState.isThinking,
                errorO: llmState.error,
                chatHistoryO: llmState.chatHistory,
            });
        }
    };

    private async configureAndSubscribeLlm(player: Player): Promise<void>
    {
        const config = player === Player.X ? this.state.playerXConfig : this.state.playerOConfig;
        const controller = player === Player.X ? this.llmControllerX : this.llmControllerO;
        const unsubscribeVar = player === Player.X ? 'llmUnsubscribeX' : 'llmUnsubscribeO';

        const currentUnsubscribe = this[unsubscribeVar];
        if (currentUnsubscribe)
        {
            currentUnsubscribe();
            this[unsubscribeVar] = null;
        }

        // Reset LLM state for the player if they are not LLM or lack config
        if (config.type !== PlayerType.LLM || !config.modelId || !this.state.apiKey)
        {
            controller.reset(true); // Keep API key if present, but clear history/errors
            if (player === Player.X) this.updateState({ isThinkingX: false, errorX: null, chatHistoryX: [] });
            else this.updateState({ isThinkingO: false, errorO: null, chatHistoryO: [] });

            if (config.type === PlayerType.LLM)
            {
                 const errorMsg = `LLM ${player === Player.X ? 'X' : 'O'} requires API Key and Model ID`;
                 this.updateState(player === Player.X ? { errorX: errorMsg } : { errorO: errorMsg });
            }
            return; // No need to configure or subscribe
        }

        // Configure and subscribe if LLM, model, and API key are set
        try
        {
                const configured = await controller.configure(this.state.apiKey, config.modelId);
                if (configured)
                {
                    this[unsubscribeVar] = controller.subscribe((newState) => this.handleLlmStateUpdate(player, newState));
                    this.handleLlmStateUpdate(player, controller.getState()); // Update state immediately after subscribing
                } else
                {
                    const errorMsg = `LLM ${player === Player.X ? 'X' : 'O'} configuration failed`;
                    this.updateState(player === Player.X ? { errorX: errorMsg } : { errorO: errorMsg });
                }
            } catch (error: any)
            {
                const errorMsg = `LLM ${player === Player.X ? 'X' : 'O'} config error: ${error.message}`;
                this.updateState(player === Player.X ? { errorX: errorMsg } : { errorO: errorMsg });
            }
    }

    private triggerTurnIfLlm(): void
    {
        const nextPlayer = this.game.getNextPlayer();
        const config = nextPlayer === Player.X ? this.state.playerXConfig : this.state.playerOConfig;
        if (this.game.getGameState() === GameState.Ongoing && config.type === PlayerType.LLM)
        {
            this.triggerTurn();
        }
    }

    private async requestLlmMove(player: Player): Promise<void>
    {
        const controller = player === Player.X ? this.llmControllerX : this.llmControllerO;
        const config = player === Player.X ? this.state.playerXConfig : this.state.playerOConfig;
        const playerSymbol = player === Player.X ? 'X' : 'O';

        if (config.type !== PlayerType.LLM)
        {
            console.warn(`Attempted to request LLM move for Player ${playerSymbol}, but they are configured as Human.`);
            return;
        }

        if (!controller || !config.modelId || !this.state.apiKey)
        {
            console.error(`LLM Controller for Player ${playerSymbol} not ready or not configured.`);
            this.updateState(player === Player.X ? { errorX: "LLM not ready", isThinkingX: false } : { errorO: "LLM not ready", isThinkingO: false });
            return;
        }

        if (player === Player.X && this.state.isThinkingX) return;
        if (player === Player.O && this.state.isThinkingO) return;


        try
        {
            const prompt = this.buildLlmPrompt(player);
            const responseText = await controller.generateResponse(prompt);
            const moveIndex = this.parseLlmMove(responseText);

            if (moveIndex === null)
            {
                throw new Error("LLM response did not contain a valid move (1-9).");
            }

            console.log(`Controller: LLM ${player === Player.X ? 'X' : 'O'} proposed move: ${moveIndex + 1}`);
            this.attemptMove(moveIndex, player);

        } catch (error: any)
        {
            console.error(`Controller: Error getting move from LLM ${player === Player.X ? 'X' : 'O'}:`, error);
        }
    }

    private buildLlmPrompt(player: Player): string
    {
        const rules = this.game.explainGame();
        const moveFormat = this.game.explainNextMoveFormat();
        const boardStatus = this.game.displayGameStatus();

        let prompt = `You are Player ${player === Player.X ? 'X' : 'O'} in a game of Tic-Tac-Toe.\n\n`;
        prompt += `Rules:\n${rules}\n\n`;
        prompt += `Current Game State:\n${boardStatus}\n\n`;
        prompt += `Move Format:\n${moveFormat}\n\n`;

        const lastError = player === Player.X ? this.state.errorX : this.state.errorO;
        if (lastError && lastError.includes("Invalid move")) {
             prompt += `Important: Your previous attempt resulted in an error: "${lastError}". ${this.game.invalidMoveWarning(lastError)} Please choose a valid, empty square.\n\n`;
        }

        prompt += `Based on the current board and rules, what is your next move? Please respond with only the number of the square (1-9) you choose.`;
        return prompt;
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
                return move - 1; // Convert 1-9 to 0-8 index
            }
        }
        return null;
    }

}
