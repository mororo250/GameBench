"use client";

import React, { ReactElement, useState, useEffect, useCallback } from "react";
import { TicTacToeController, TicTacToeState, PlayerType } from "../../controller/TicTacToeController";
import { Player, GameState } from "../../lib/TicTacToe";
import { Board } from "./Board";
import gameStyles from "./Game.module.css";

interface GameProps
{
    ticTacToeController: TicTacToeController;
}

export default function TicTacToeGame({ ticTacToeController }: GameProps): ReactElement
{
    const [ticTacToeState, setTicTacToeState] = useState<TicTacToeState>(() => ticTacToeController.getState());

    useEffect(() =>
    {
        const unsubscribe = ticTacToeController.subscribe(setTicTacToeState);
        return unsubscribe;
    }, [ticTacToeController]);

    const {
        boardState,
        statusMessage,
        gameState,
        nextPlayer,
        playerXConfig,
        playerOConfig
    } = ticTacToeState;

    const isGameOver = gameState !== GameState.Ongoing;
    const isHumanTurn = !isGameOver &&
        ((nextPlayer === Player.X && playerXConfig.type === PlayerType.Human) ||
         (nextPlayer === Player.O && playerOConfig.type === PlayerType.Human));
    const isDisabled = isGameOver || !isHumanTurn;

    const handleSquareClick = useCallback((index: number) =>
    {
        if (!isDisabled)
        {
            ticTacToeController.makeMove(index);
        }
    }, [isDisabled, ticTacToeController]);


    return (
        <>
            <div className={gameStyles.status}>{statusMessage}</div>
            <Board
                squares={boardState}
                onSquareClick={handleSquareClick}
                disabled={isDisabled}
            />
        </>
    );
}
