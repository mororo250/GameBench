import React, {ReactElement, useEffect, useRef} from 'react';
import {getPlayerSymbol, Player} from '../lib/TicTacToe';
import styles from './TicTacToe.module.css';

// Read-only LLM Chat
export function LlmChat({messages, llmPlayer}: { messages: string[], llmPlayer: Player | null }): ReactElement
{
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        chatEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    const title: string = llmPlayer ? `LLM (${getPlayerSymbol(llmPlayer)}) Thoughts` : 'LLM Thoughts';

    return (<div className={styles.chatContainer}>
            <h2>{title}</h2>
            <div className={`${styles.chatBox} ${styles.readOnlyChatBox}`}>
                {messages.map((msg: string, index: number) => (<p key={index}
                                                                  className={styles.chatMessage}>{msg.startsWith('LLM:') || msg.startsWith('System:') ? msg : `LLM: ${msg}`}</p>))}
                <div ref={chatEndRef}/>
            </div>
        </div>);
}
