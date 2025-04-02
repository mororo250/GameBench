import React, { ReactElement, useEffect, useRef } from 'react';
import styles from './TicTacToe.module.css';
import { ChatMessage } from '../lib/OpenRouter';

interface LlmChatProps
{
    messages: ChatMessage[];
}

export function LlmChat({ messages }: LlmChatProps): ReactElement
{
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const title: string = 'LLM Conversation Log';

    const getMessageClass = (role: ChatMessage['role']): string =>
    {
        switch (role)
        {
            case 'assistant':
                return styles.messageLeft;
            case 'user':
            case 'system':
                return styles.messageRight;
            case 'error':
                return styles.messageError;
            default:
                return styles.messageCenter;
        }
    };

    return (
        <div className={styles.chatContainer}>
            <h2>{title}</h2>
            <div className={`${styles.chatBox} ${styles.readOnlyChatBox}`}>
                {messages.map((msg: ChatMessage, index: number) => (
                    <div key={index} className={`${styles.chatMessageWrapper} ${getMessageClass(msg.role)}`}>
                        {msg.role === 'assistant' && msg.modelName && (
                            <div className={styles.modelNameLabel}>{msg.modelName}</div>
                        )}
                        {msg.role === 'error' && (
                            <div className={styles.errorLabel}>Error</div>
                        )}
                         {msg.role === 'system' && (
                            <div className={styles.systemLabel}>System</div>
                        )}
                        <div className={styles.chatMessage}>
                            <pre className={styles.messageContent}>{msg.content}</pre>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
        </div>
    );
}
