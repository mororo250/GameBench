import React, {ReactElement} from 'react';
import {BoardState, getPlayerSymbol, SquareValue} from '../../lib/TicTacToe';
import gameStyles from './Game.module.css';

function Square({value, onSquareClick, disabled}: {
    value: SquareValue, onSquareClick: () => void, disabled: boolean
}): ReactElement
{
    return (<button className={gameStyles.square} onClick={onSquareClick} disabled={disabled || value !== null}>
            {getPlayerSymbol(value)} {}
        </button>);
}

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
        boardRows.push(<div key={row} className={gameStyles.boardRow}>
            {squaresInRow}
        </div>);
    }

    return (
        <div className={gameStyles.board}>
            {boardRows}
        </div>);
}
