import React, { ReactElement, useState, useEffect, useCallback } from "react";
import { Player, GameState, getPlayerSymbol } from "../../lib/TicTacToe";
import { TicTacToeController, TicTacToeState, PlayerConfig, PlayerType } from "../../controller/TicTacToeController";
import { LlmController, LlmControllerState, ChatMessage } from "../../controller/LlmController";
import { ModelSelector } from "../shared/ModelSelector";
import { LlmChat } from "./LlmChat";
import { OpponentSelection } from "./OpponentSelection";
import playerStyles from "./Player.module.css";
import layoutStyles from "../shared/Layout.module.css";

interface PlayerPanelProps
{
    playerRole: Player;
    ticTacToeController: TicTacToeController;
    llmController: LlmController;
    apiKey: string;
}

export function PlayerPanel({
    playerRole,
    ticTacToeController,
    llmController,
    apiKey,
}: PlayerPanelProps): ReactElement
{
    const [ticTacToeState, setTicTacToeState] = useState<TicTacToeState>(() => ticTacToeController.getState());
    const [llmState, setLlmState] = useState<LlmControllerState>(() => llmController.getState());

    useEffect(() =>
    {
        const unsubscribeTicTacToe = ticTacToeController.subscribe(setTicTacToeState);
        const unsubscribeLlm = llmController.subscribe(setLlmState);
        return () => {
            unsubscribeTicTacToe();
            unsubscribeLlm();
        };
    }, [ticTacToeController, llmController]);

    const {
        gameState,
        nextPlayer,
        playerXConfig,
        playerOConfig,
        error: gameError
    } = ticTacToeState;
    const {
        isThinking,
        error: llmError,
        chatHistory
    } = llmState;

    const playerConfig = playerRole === Player.X ? playerXConfig : playerOConfig;
    const opponentType = playerRole === Player.X ? playerOConfig.type : playerXConfig.type;
    const playerSymbol = getPlayerSymbol(playerRole);
    const isLLM = playerConfig.type === PlayerType.LLM;
    const isHuman = playerConfig.type === PlayerType.Human;
    const isPlayerTurn = gameState === GameState.Ongoing && nextPlayer === playerRole;

    const displayError = llmError || (isPlayerTurn ? gameError : null);

    const handleSetType = useCallback((type: PlayerType) =>
    {
        ticTacToeController.setPlayerConfig(playerRole, { ...playerConfig, type });
    }, [ticTacToeController, playerRole, playerConfig]);

    const handleSetModel = useCallback((modelId: string) =>
    {
        ticTacToeController.setPlayerConfig(playerRole, { type: PlayerType.LLM, modelId });
    }, [ticTacToeController, playerRole]);


    // Effect to configure LLM
    useEffect(() =>
    {
        const config = playerRole === Player.X ? ticTacToeState.playerXConfig : ticTacToeState.playerOConfig;

        if (config.type === PlayerType.LLM && config.modelId && apiKey)
        {
            llmController.configure(apiKey, config.modelId);
        } else if (config.type !== PlayerType.LLM)
        {
            llmController.resetChat();
            llmController.resetConfig
        } else if (!apiKey && config.type === PlayerType.LLM) {
             llmController.resetChat();
        }
    }, [apiKey, playerRole, ticTacToeState.playerXConfig, ticTacToeState.playerOConfig, llmController]);


    // Effect to trigger LLM move
    useEffect(() =>
    {
        const config = playerRole === Player.X ? ticTacToeState.playerXConfig : ticTacToeState.playerOConfig;
        const currentGameState = ticTacToeState.gameState;
        const currentNextPlayer = ticTacToeState.nextPlayer;
        const currentLlmError = llmState.error;

        if (currentGameState === GameState.Ongoing &&
            currentNextPlayer === playerRole &&
            config.type === PlayerType.LLM &&
            apiKey &&
            config.modelId &&
            !isThinking)
        {
            const requestMove = async () => {
                try
                {
                    const prompt = ticTacToeController.buildLlmPrompt(playerRole, currentLlmError);
                    const responseText = await llmController.generateResponse(prompt);
                    const moveSuccessful = ticTacToeController.attemptLlmMove(responseText);

                    if (!moveSuccessful && llmController.getState().isThinking) {
                         // Fallback to reset thinking state if attemptLlmMove failed (e.g., parse error)
                         // and LlmController didn't reset it.
                         setLlmState(prev => ({...prev, isThinking: false }));
                    }
                } catch (error: any)
                {
                    // Errors during generateResponse are handled by LlmController
                    console.error(`PlayerPanel ${playerSymbol}: Error during generateResponse:`, error);
                }
            };
            requestMove();
        }
    }, [
        playerRole,
        ticTacToeState.gameState,
        ticTacToeState.nextPlayer,
        ticTacToeState.playerXConfig,
        ticTacToeState.playerOConfig,
        llmState.isThinking,
        llmState.error,
        apiKey,
        ticTacToeController,
        llmController
    ]);


    return (
        <div className={playerRole === Player.X ? layoutStyles.leftColumn : layoutStyles.rightColumn}>
            <h2>Player {playerSymbol}</h2>
            <OpponentSelection
                playerType={playerConfig.type}
                opponentType={opponentType}
                onSetType={handleSetType}
            />

            {isLLM && (
                <>
                    <div className={playerStyles.configSection}>
                        <h3>LLM Config</h3>
                        <ModelSelector
                            isApiKeySet={!!apiKey}
                            selectedModelId={playerConfig.modelId || ""}
                            setSelectedModelId={handleSetModel}
                        />
                        {displayError && <div className={`${playerStyles.configItem} ${playerStyles.errorText}`}>Error: {displayError}</div>}
                    </div>
                    <LlmChat messages={chatHistory} />
                    {isThinking && <div className={playerStyles.thinkingIndicator}>LLM {playerSymbol} is thinking...</div>}
                </>
            )}
            {isHuman && (
                 <div className={playerStyles.humanPlaceholder}>
                    {isPlayerTurn ? "Your turn!" : "Waiting..."}
                    {/* Restart button removed */}
                 </div>
            )}
        </div>
    );
}
