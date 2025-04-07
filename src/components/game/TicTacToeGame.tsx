"use client";

import React, { ReactElement } from "react";
import { BoardState } from "../../lib/TicTacToe";
import { Board } from "./Board";
import gameStyles from "./Game.module.css";

interface GameProps
{
    boardState: Readonly<BoardState>;
    statusMessage: string;
    onSquareClick: (index: number) => void;
    disabled: boolean; // To disable board clicks
    onRestart: () => void;
}

export default function TicTacToeGame({
    boardState,
    statusMessage,
    onSquareClick,
    disabled,
    onRestart
}: GameProps): ReactElement
{
    return (
        <>
            <div className={gameStyles.status}>{statusMessage}</div>
            <Board
                squares={boardState}
                onSquareClick={onSquareClick}
                disabled={disabled}
            />
            <button onClick={onRestart} className={gameStyles.restartButton}>
                Restart Game
            </button>
        </>
    );
}
