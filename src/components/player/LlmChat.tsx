import React, { ReactElement, useEffect, useRef } from 'react';
import playerStyles from './Player.module.css';
import { ChatMessage } from '../../lib/OpenRouter';

interface LlmChatProps
{
    messages: Readonly<ChatMessage[]>; // Accept readonly array
}

export function LlmChat({ messages }: LlmChatProps): ReactElement
{
    const chatEndRef = useRef<HTMLDivElement>(null);

    // useEffect(() =>
    // {
    //     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [messages]); // REMOVED THIS HOOK

    const title: string = 'LLM Conversation Log';

    const getMessageClass = (role: ChatMessage['role']): string =>
    {
        switch (role)
        {
            case 'assistant':
                return playerStyles.messageLeft;
            case 'user':
            case 'system':
                return playerStyles.messageRight;
            case 'error':
                return playerStyles.messageError;
            default:
                return playerStyles.messageCenter;
        }
    };

    return (
        <div className={playerStyles.chatContainer}>
            <h2>{title}</h2>
            <div className={`${playerStyles.chatBox} ${playerStyles.readOnlyChatBox}`}>
                {messages.map((msg: ChatMessage, index: number) => (
                    <div key={index} className={`${playerStyles.chatMessageWrapper} ${getMessageClass(msg.role)}`}>
                        {msg.role === 'assistant' && msg.modelName && (
                            <div className={playerStyles.modelNameLabel}>{msg.modelName}</div>
                        )}
                        {msg.role === 'error' && (
                            <div className={playerStyles.errorLabel}>Error</div>
                        )}
                         {msg.role === 'system' && (
                            <div className={playerStyles.systemLabel}>System</div>
                        )}
                        <div className={playerStyles.chatMessage}>
                            <pre className={playerStyles.messageContent}>{msg.content}</pre>
                        </div>
                    </div>
                ))}
                {/* Keep the ref for potential future use, but don't scroll automatically */}
                <div ref={chatEndRef} />
            </div>
        </div>
    );
}
