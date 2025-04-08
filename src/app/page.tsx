"use client";

import React, { ReactElement, useMemo, useState, useCallback } from "react";
import Game from "../components/game/TicTacToeGame";
import HistoryTable from "../components/history/HistoryTable";
import { MatchHistory } from "../lib/matchHistory";
import { TicTacToeController } from "../controller/TicTacToeController";
import { LlmController } from "../controller/LlmController";
import { Player } from "../lib/TicTacToe";
import { ApiKeyInput } from "../components/shared/ApiKeyInput";
import { PlayerPanel } from "../components/player/PlayerPanel";
import layoutStyles from "../components/shared/Layout.module.css";

export default function Page(): ReactElement
{
    const historyManager = useMemo(() => new MatchHistory(), []);
    const ticTacToeController = useMemo(() => new TicTacToeController(historyManager), [historyManager]);
    const llmControllerX = useMemo(() => new LlmController(), []);
    const llmControllerO = useMemo(() => new LlmController(), []);

    const [apiKey, setApiKey] = useState<string>("");

    // Handler to set API Key. PlayerPanel components will react via useEffect.
    const setApiKeyHandler = useCallback((key: string) =>
    {
        setApiKey(key);
    }, []);

    const handleRestart = useCallback(() => {
        ticTacToeController.resetGame();
        llmControllerX.reset(true);
        llmControllerO.reset(true);
    }, [ticTacToeController, llmControllerX, llmControllerO]);

    return (
        <React.StrictMode>
            <div className={layoutStyles.page}>
                <h1>Tic Tac Toe</h1>
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

                <HistoryTable historyManager={historyManager} />
            </div>
        </React.StrictMode>
    );
}
