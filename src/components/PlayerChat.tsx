import React, { ChangeEvent, FormEvent, ReactElement, useEffect, useRef, useState } from 'react';
import { GameState, getPlayerSymbol, Player } from '../lib/TicTacToe';
import styles from './TicTacToe.module.css';

interface PlayerChatProps
{
    gameState: GameState;
    humanPlayer: Player | null;
    onMoveSubmit: (index: number) => void;
    onRestart: () => void;
    isPlayerTurn: boolean;
}

export function PlayerChat({
    gameState,
    humanPlayer,
    onMoveSubmit,
    onRestart,
    isPlayerTurn
}: PlayerChatProps): ReactElement
{
    const [chatMessages, setChatMessages] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState<string>('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const humanSymbol: string = getPlayerSymbol(humanPlayer);
    const title: string = humanPlayer ? `You (${humanSymbol})` : 'Player Chat';

    useEffect(() =>
    {
        setChatMessages([]);
        setInputValue('');
    }, [onRestart, humanPlayer]);

    useEffect(() =>
    {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const handleInternalChatSubmit = (event: FormEvent<HTMLFormElement>) =>
    {
        event.preventDefault();
        if (!isPlayerTurn || !humanSymbol) return;

        const moveInput: string = inputValue.trim();
        const move: number = parseInt(moveInput, 10);

        if (!moveInput) return;

        let newMessages: string[] = [...chatMessages, `You (${humanSymbol}): ${moveInput}`];

        if (gameState !== GameState.Ongoing)
        {
            newMessages.push(`System: Game is already over. Please restart.`);
        }
        else if (isNaN(move) || move < 1 || move > 9)
        {
            newMessages.push(`System: Invalid input. Please enter a number between 1 and 9.`);
        }
        else
        {
            const index: number = move - 1;
            try
            {
                onMoveSubmit(index);
            } catch (error)
            {
                const errorMessage = error instanceof Error ? error.message : String(error);
                newMessages.push(`System: Invalid Move - ${errorMessage}`);
            }
        }

        setChatMessages(newMessages);
        setInputValue('');
    };

    return (
        <div className={styles.chatContainer}>
            <h2>{title}</h2>
            <div className={styles.chatBox}>
                {chatMessages.map((msg: string, index: number) => (
                    <p key={index} className={styles.chatMessage}>{msg}</p>))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleInternalChatSubmit} className={styles.chatForm}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    placeholder={isPlayerTurn ? "Enter move (1-9)" : "Wait for your turn..."}
                    className={styles.chatInput}
                    disabled={!isPlayerTurn}
                />
                <button type="submit" className={styles.chatButton} disabled={!isPlayerTurn}>Send</button>
            </form>
        </div>
    );
}
