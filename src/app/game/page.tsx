"use client";

import React, { ReactElement, useMemo, useState, useCallback } from "react";
import Game from "../../components/game/TicTacToeGame";
import { TicTacToeController } from "../../controller/TicTacToeController";
import { LlmController } from "../../controller/LlmController";
import { Player } from "../../lib/TicTacToe";
import { ApiKeyInput } from "../../components/shared/ApiKeyInput";
import { PlayerPanel } from "../../components/player/PlayerPanel";
import layoutStyles from "../../components/shared/Layout.module.css";
import Layout from "../../components/layout/Layout";
import { useHistory } from "../../context/HistoryContext";

export default function GamePage(): ReactElement
{
    const { historyManager } = useHistory();

    const ticTacToeController = useMemo(() => new TicTacToeController(historyManager), [historyManager]);
    const llmControllerX = useMemo(() => new LlmController(), []);
    const llmControllerO = useMemo(() => new LlmController(), []);

    const [apiKey, setApiKey] = useState<string>("");

    const setApiKeyHandler = useCallback((key: string) =>
    {
        setApiKey(key);
    }, []);

    const handleRestart = useCallback(() => {
        ticTacToeController.resetGame();
        llmControllerX.resetChat();
        llmControllerO.resetChat();
        llmControllerX.resetConfig();
        llmControllerO.resetConfig();
    }, [ticTacToeController, llmControllerX, llmControllerO]);

    return (
        <Layout> 
            <h1>Tic Tac Toe Game</h1>
            <ApiKeyInput apiKey={apiKey} setApiKey={setApiKeyHandler} />

            <div className={layoutStyles.gameLayout}>
                <PlayerPanel
                    playerRole={Player.X}
                    ticTacToeController={ticTacToeController}
                    llmController={llmControllerX}
                    apiKey={apiKey}
                />
                <div className={layoutStyles.centerColumn}>
                    <Game
                        ticTacToeController={ticTacToeController}
                    />
                </div>
                <PlayerPanel
                    playerRole={Player.O}
                    ticTacToeController={ticTacToeController}
                    llmController={llmControllerO}
                    apiKey={apiKey}
                />
            </div>

            <button onClick={handleRestart} className={layoutStyles.restartButton}>
                Restart Game
            </button>
        </Layout>
    );
}
