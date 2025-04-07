"use client";

import React, { ReactElement, useMemo, useState, useEffect } from "react";
import Game from "../components/game/TicTacToeGame";
import HistoryTable from "../components/history/HistoryTable";
import { MatchHistory } from "../lib/matchHistory";
import { TicTacToeController, TicTacToeControllerState, PlayerType, PlayerConfig } from "../controller/TicTacToeController";
import { Player, GameState } from "../lib/TicTacToe";
import { ApiKeyInput } from "../components/shared/ApiKeyInput";
import { PlayerPanel } from "../components/player/PlayerPanel";
import layoutStyles from "../components/shared/Layout.module.css";

export default function Page(): ReactElement
{
    const historyManager = useMemo(() => new MatchHistory(), []);
    const controller = useMemo(() => new TicTacToeController(historyManager), [historyManager]);

    const [controllerState, setControllerState] = useState<TicTacToeControllerState>(() => controller.getState());

    useEffect(() =>
    {
        const unsubscribe = controller.subscribe(setControllerState);
        return () => unsubscribe(); // Cleanup subscription
    }, [controller]);

    const {
        boardState,
        gameState,
        nextPlayer,
        playerXConfig,
        playerOConfig,
        apiKey,
        isThinkingX,
        isThinkingO,
        errorX,
        errorO,
        chatHistoryX,
        chatHistoryO,
        statusMessage,
    } = controllerState;

    const handleSquareClick = (index: number) => controller.handleSquareClick(index);
    const restartGame = () => controller.restartGame();
    const setApiKeyHandler = (key: string) => controller.setApiKey(key);

    const setPlayerXType = (type: PlayerType) => controller.setPlayerConfig(Player.X, { ...playerXConfig, type });
    // Use PlayerType enum when setting model
    const setPlayerXModel = (modelId: string) => controller.setPlayerConfig(Player.X, { ...playerXConfig, type: PlayerType.LLM, modelId });
    const setPlayerOType = (type: PlayerType) => controller.setPlayerConfig(Player.O, { ...playerOConfig, type });
    // Use PlayerType enum when setting model
    const setPlayerOModel = (modelId: string) => controller.setPlayerConfig(Player.O, { ...playerOConfig, type: PlayerType.LLM, modelId });

    // --- Derived State for UI Logic ---
    const isThinking = isThinkingX || isThinkingO;
    const isGameOver = gameState !== GameState.Ongoing;
    // Use PlayerType enum for checking human turn
    const isHumanTurnX = !isGameOver && !isThinking && nextPlayer === Player.X && playerXConfig.type === PlayerType.Human;
    const isHumanTurnO = !isGameOver && !isThinking && nextPlayer === Player.O && playerOConfig.type === PlayerType.Human;
    const canHumanClickBoard = isHumanTurnX || isHumanTurnO;


    return (
        <React.StrictMode>
            <div className={layoutStyles.page}>
                <h1>Tic Tac Toe</h1>
                {/* Removed div with undefined style styles.topConfigSection */}
                <ApiKeyInput apiKey={apiKey} setApiKey={setApiKeyHandler} />

                <div className={layoutStyles.gameLayout}>

                    {/* Left Column (Player X Panel) */}
                    <PlayerPanel
                        playerRole={Player.X}
                        playerConfig={playerXConfig}
                        isApiKeySet={!!apiKey} // Pass boolean instead of key
                        isThinking={isThinkingX}
                        error={errorX}
                        chatHistory={chatHistoryX}
                        gameState={gameState}
                        isPlayerTurn={isHumanTurnX} // Pass specific turn status for PlayerChat
                        opponentType={playerOConfig.type}
                        onSetType={setPlayerXType}
                        onSetModel={setPlayerXModel}
                        onMoveSubmit={handleSquareClick} // PlayerChat submits move via board click handler
                        onRestart={restartGame}
                    />

                    {/* Center Column (Game Board & Status) */}
                    <div className={layoutStyles.centerColumn}>
                        {/* Pass only necessary props to the simplified Game component */}
                        <Game
                            boardState={boardState}
                            statusMessage={statusMessage}
                            onSquareClick={handleSquareClick}
                            disabled={!canHumanClickBoard || isGameOver || isThinking}
                            onRestart={restartGame}
                        />
                    </div>

                    {/* Right Column (Player O Panel) */}
                    <PlayerPanel
                        playerRole={Player.O}
                        playerConfig={playerOConfig}
                        isApiKeySet={!!apiKey}
                        isThinking={isThinkingO}
                        error={errorO}
                        chatHistory={chatHistoryO}
                        gameState={gameState}
                        isPlayerTurn={isHumanTurnO} // Pass specific turn status for PlayerChat
                        opponentType={playerXConfig.type}
                        onSetType={setPlayerOType}
                        onSetModel={setPlayerOModel}
                        onMoveSubmit={handleSquareClick} // PlayerChat submits move via board click handler
                        onRestart={restartGame}
                    />

                </div> {/* Close gameLayout div */}
                <HistoryTable historyManager={historyManager} />
            </div> {/* Close page div */}
        </React.StrictMode>
    );
}
