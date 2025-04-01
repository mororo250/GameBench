import {useCallback, useRef, useState} from 'react';
import {TicTacToeGame} from '../lib/TicTacToe';

interface UseTicTacToeGameReturn
{
    gameInstance: TicTacToeGame;
    handleSquareClick: (index: number) => void;
    handleRestart: () => void;
}

// --- Custom Hook for Game Logic ---
export function useTicTacToeGame(): UseTicTacToeGameReturn
{
    // Use useRef to keep the same game instance across renders without causing re-renders on change
    const gameRef = useRef<TicTacToeGame>(new TicTacToeGame());
    // State to trigger re-renders when the game state *inside* the ref changes
    const [updateTrigger, setUpdateTrigger] = useState<number>(0);

    const forceUpdate = useCallback<() => void>(() =>
    {
        // Increment to force re-render, ensuring UI reflects latest gameRef.current state
        setUpdateTrigger((prev: number) => prev + 1);
    }, []);

    const handleSquareClick = useCallback<(index: number) => void>((index: number) =>
    {
        try
        {
            gameRef.current.makeMove(index);
            forceUpdate();
        } catch (error)
        {
            console.error("Invalid move:", error);
            throw error;
        }
    }, [forceUpdate]);

    // Add explicit type for useCallback
    const handleRestart = useCallback<() => void>(() =>
    {
        gameRef.current.resetGame();
        forceUpdate();
    }, [forceUpdate]);

    return {
        gameInstance: gameRef.current, handleSquareClick, handleRestart,
    };
}
