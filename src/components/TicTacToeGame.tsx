"use client";

import React, { ReactElement, useState, useRef, useCallback, useEffect } from "react";
import { GameState, getPlayerSymbol, Player, TicTacToeGame } from "../lib/TicTacToe";
import { usePlayerTicTacToe } from "../hooks/usePlayerTicTacToe";
import { useLlmTicTacToe } from "../hooks/useLlmTicTacToe";
import { Board } from "./Board";
import { LlmChat } from "./LlmChat";
import { PlayerChat } from "./PlayerChat";
import { ApiKeyInput } from "./ApiKeyInput";
import { ModelSelector } from "./ModelSelector";
import styles from "./TicTacToe.module.css";
import { ChatMessage } from "../lib/OpenRouter";

type PlayerType = "Human" | "LLM";

export default function Game(): ReactElement
{
    const [apiKey, setApiKey] = useState<string>("");
    const [playerXType, setPlayerXType] = useState<PlayerType>("LLM");
    const [playerXModelId, setPlayerXModelId] = useState<string>("");
    const [playerOType, setPlayerOType] = useState<PlayerType>("Human");
    const [playerOModelId, setPlayerOModelId] = useState<string>("");

    const gameRef = useRef<TicTacToeGame>(new TicTacToeGame());
    const [updateTrigger, setUpdateTrigger] = useState<number>(0);
    const [initialPlayerXRole, setInitialPlayerXRole] = useState<Player>(Player.X);

    const forceUpdate = useCallback((): void =>
    {
        setUpdateTrigger((prev: number) => prev + 1);
    }, []);

    const currentPlayerXRole = initialPlayerXRole;
    const currentPlayerORole = initialPlayerXRole === Player.X ? Player.O : Player.X;

    const playerXHook = usePlayerTicTacToe({
        gameInstance: gameRef.current,
        initialPlayerRole: currentPlayerXRole,
        onPlayerMove: forceUpdate,
        addErrorMessage: (msg) => console.error(`Player X Error: ${msg}`),
    });
    const llmXHook = useLlmTicTacToe({
        gameInstance: gameRef.current,
        playerRole: currentPlayerXRole,
        apiKey: apiKey,
        modelId: playerXModelId,
        onLlmMove: forceUpdate,
        isEnabled: playerXType === "LLM",
    });

    const playerOHook = usePlayerTicTacToe({
        gameInstance: gameRef.current,
        initialPlayerRole: currentPlayerORole,
        onPlayerMove: forceUpdate,
        addErrorMessage: (msg) => console.error(`Player O Error: ${msg}`),
    });
    const llmOHook = useLlmTicTacToe({
        gameInstance: gameRef.current,
        playerRole: currentPlayerORole,
        apiKey: apiKey,
        modelId: playerOModelId,
        onLlmMove: forceUpdate,
        isEnabled: playerOType === "LLM",
    });

    const currentBoardState = gameRef.current.getBoardState();
    const currentGameState = gameRef.current.getGameState();
    const currentNextPlayer = gameRef.current.getNextPlayer();

    const isThinking: boolean = (playerXType === "LLM" && llmXHook.isThinking) || (playerOType === "LLM" && llmOHook.isThinking);
    const combinedError: string | null = (playerXType === "LLM" ? llmXHook.error : null) || (playerOType === "LLM" ? llmOHook.error : null);

    const handleBoardClick = (index: number): void =>
    {
        const nextPlayer = gameRef.current.getNextPlayer();
        if (nextPlayer === currentPlayerXRole && playerXType === "Human")
        {
            playerXHook.handlePlayerClick(index);
        } else if (nextPlayer === currentPlayerORole && playerOType === "Human")
        {
            playerOHook.handlePlayerClick(index);
        } else
        {
            console.warn("Board click ignored: Not a human player's turn.");
        }
    };

    const handleRestart = useCallback(async (): Promise<void> =>
    {
        console.log("Restarting game...");
        gameRef.current.resetGame();
        const nextInitialPlayerXRole = initialPlayerXRole === Player.X ? Player.O : Player.X;
        setInitialPlayerXRole(nextInitialPlayerXRole);

        const nextPlayerXRole = nextInitialPlayerXRole;
        const nextPlayerORole = nextInitialPlayerXRole === Player.X ? Player.O : Player.X;

        if (playerXType === "Human") playerXHook.setPlayerRole(nextPlayerXRole);
        if (playerOType === "Human") playerOHook.setPlayerRole(nextPlayerORole);

        const resetPromises: Promise<void>[] = [];
        if (playerXType === "LLM") resetPromises.push(llmXHook.resetLlm(nextPlayerXRole));
        if (playerOType === "LLM") resetPromises.push(llmOHook.resetLlm(nextPlayerORole));

        await Promise.all(resetPromises);

        forceUpdate();
    }, [initialPlayerXRole, playerXType, playerOType, playerXHook, playerOHook, llmXHook, llmOHook, forceUpdate]);

    useEffect(() =>
    {
        if (playerXType === "Human" && playerOType === "LLM")
        {
            setPlayerXType("LLM");
            setPlayerOType("Human");
            console.warn("Configuration changed: Human player must be Player O (right side) when playing against an LLM.");
        }
    }, [playerXType, playerOType]);


    let gameStatusDisplay: string;
    if (combinedError)
    {
        gameStatusDisplay = `LLM Error: ${combinedError}`;
    } else if (isThinking)
    {
        gameStatusDisplay = "LLM is thinking...";
    } else
    {
        switch (currentGameState)
        {
            case GameState.Draw:
                gameStatusDisplay = "Game over: Draw";
                break;
            case GameState.XWins:
                gameStatusDisplay = `Game over: ${getPlayerSymbol(Player.X)} wins! (${playerXType === "Human" ? "Human" : "LLM"})`;
                break;
            case GameState.OWins:
                gameStatusDisplay = `Game over: ${getPlayerSymbol(Player.O)} wins! (${playerOType === "Human" ? "Human" : "LLM"})`;
                break;
            default:
                const currentPlayerSymbol: string = getPlayerSymbol(currentNextPlayer);
                const isXNext = currentNextPlayer === currentPlayerXRole;
                const turnPlayerType = isXNext ? playerXType : playerOType;
                gameStatusDisplay = `Game ongoing. ${turnPlayerType}'s turn (${currentPlayerSymbol}).`;
        }
    }

    const isHumanPlayerTurn = currentGameState === GameState.Ongoing && !isThinking &&
        ((currentNextPlayer === currentPlayerXRole && playerXType === "Human") ||
         (currentNextPlayer === currentPlayerORole && playerOType === "Human"));

    return (
        <div className={styles.page}>
            <h1>Tic Tac Toe</h1>
            <div className={styles.topConfigSection}>
                 <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
            </div>

            <div className={styles.gameLayout}>

                <div className={styles.leftColumn}>
                    <h2>Player X ({getPlayerSymbol(currentPlayerXRole)})</h2>
                    <div className={styles.playerSelection}>
                        <label>Type:</label>
                        <button
                            onClick={() => setPlayerXType("Human")}
                            className={playerXType === "Human" ? styles.activeButton : ""}
                            disabled={playerXType === "Human" || (playerXType === "LLM" && playerOType === "Human")}
                        >
                            Human
                        </button>
                        <button
                            onClick={() => setPlayerXType("LLM")}
                            className={playerXType === "LLM" ? styles.activeButton : ""}
                            disabled={playerXType === "LLM"}
                        >
                            LLM
                        </button>
                    </div>

                    {playerXType === "LLM" && (
                        <>
                            <div className={styles.configSection}>
                                <h3>LLM Config</h3>
                                {/* API Key Input removed from here */}
                                <ModelSelector
                                    apiKey={apiKey}
                                    selectedModelId={playerXModelId}
                                    setSelectedModelId={setPlayerXModelId}
                                />
                                {llmXHook.error && <div className={`${styles.configItem} ${styles.errorText}`}>LLM X Error: {llmXHook.error}</div>}
                            </div>
                            <LlmChat messages={llmXHook.chatMessages} />
                            {llmXHook.isThinking && <div className={styles.thinkingIndicator}>LLM X is thinking...</div>}
                        </>
                    )}
                    {playerXType === "Human" && (
                        <PlayerChat
                            gameState={currentGameState}
                            humanPlayer={currentPlayerXRole}
                            onMoveSubmit={(index) => playerXHook.handlePlayerClick(index)}
                            onRestart={handleRestart}
                            isPlayerTurn={currentNextPlayer === currentPlayerXRole && currentGameState === GameState.Ongoing}
                        />
                    )}
                </div>

                <div className={styles.centerColumn}>
                    <div className={styles.status}>{gameStatusDisplay}</div>
                    <Board
                        squares={currentBoardState}
                        onSquareClick={handleBoardClick}
                        disabled={!isHumanPlayerTurn || currentGameState !== GameState.Ongoing || isThinking}
                    />
                    <button onClick={handleRestart} className={styles.restartButton}>
                        Restart Game
                    </button>
                </div>

                <div className={styles.rightColumn}>
                    <h2>Player O ({getPlayerSymbol(currentPlayerORole)})</h2>
                     <div className={styles.playerSelection}>
                        <label>Type:</label>
                        <button
                            onClick={() => setPlayerOType("Human")}
                            className={playerOType === "Human" ? styles.activeButton : ""}
                            disabled={playerOType === "Human"}
                        >
                            Human
                        </button>
                        <button
                            onClick={() => setPlayerOType("LLM")}
                            className={playerOType === "LLM" ? styles.activeButton : ""}
                            disabled={playerOType === "LLM" || (playerOType === "Human" && playerXType === "Human")}
                        >
                            LLM
                        </button>
                    </div>

                    {playerOType === "LLM" && (
                        <>
                            <div className={styles.configSection}>
                                <h3>LLM Config</h3>
                                {/* API Key Input removed from here */}
                                <ModelSelector
                                    apiKey={apiKey}
                                    selectedModelId={playerOModelId}
                                    setSelectedModelId={setPlayerOModelId}
                                />
                                {llmOHook.error && <div className={`${styles.configItem} ${styles.errorText}`}>LLM O Error: {llmOHook.error}</div>}
                            </div>
                            <LlmChat messages={llmOHook.chatMessages} />
                            {llmOHook.isThinking && <div className={styles.thinkingIndicator}>LLM O is thinking...</div>}
                        </>
                    )}
                     {playerOType === "Human" && (
                        <PlayerChat
                            gameState={currentGameState}
                            humanPlayer={currentPlayerORole}
                            onMoveSubmit={(index) => playerOHook.handlePlayerClick(index)}
                            onRestart={handleRestart}
                            isPlayerTurn={currentNextPlayer === currentPlayerORole && currentGameState === GameState.Ongoing}
                        />
                    )}
                </div>

            </div>
        </div>
    );
}
