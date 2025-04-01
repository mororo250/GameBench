import React, {ReactElement} from 'react';
import {BoardState, getPlayerSymbol, SquareValue} from '../lib/TicTacToe';
import styles from './TicTacToe.module.css';

// Square component - Disable button when not human's turn or game over
export function Square({value, onSquareClick, disabled}: {
    value: SquareValue, onSquareClick: () => void, disabled: boolean
}): ReactElement
{
    return (<button className={styles.square} onClick={onSquareClick} disabled={disabled || value !== null}>
            {getPlayerSymbol(value)} {/* Use imported function */}
        </button>);
}

// Board component
export function Board({squares, onSquareClick, disabled}: {
    squares: Readonly<BoardState>, onSquareClick: (index: number) => void, disabled: boolean
}): ReactElement
{
    const boardRows: ReactElement[] = [];
    for (let row: number = 0; row < 3; row++)
    {
        const squaresInRow: ReactElement[] = [];
        for (let col: number = 0; col < 3; col++)
        {
            const index: number = row * 3 + col;
            squaresInRow.push(<Square
                key={index}
                value={squares[index]}
                onSquareClick={() => onSquareClick(index)}
                disabled={disabled} // Pass disabled prop
            />);
        }
        boardRows.push(<div key={row} className={styles.boardRow}>
            {squaresInRow}
        </div>);
    }

    return (
        <div className={styles.board}>
            {boardRows}
        </div>);
}
