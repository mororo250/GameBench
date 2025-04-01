import React, { useState, useEffect, useRef, ReactElement, FormEvent, ChangeEvent } from 'react'; // Import types
import { Player, GameState, getPlayerSymbol } from '../lib/tic-tac-toe'; // Import getPlayerSymbol
import styles from './TicTacToe.module.css';

// Player Input Game Chat
export function PlayerChat({ gameState, humanPlayer, nextPlayer, onMoveSubmit, onRestart }: {
  gameState: GameState;
  humanPlayer: Player | null;
  nextPlayer: Player;
  onMoveSubmit: (index: number) => void;
  onRestart: () => void;
}): ReactElement {
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isHumanTurn: boolean = humanPlayer !== null && gameState === GameState.Ongoing && nextPlayer === humanPlayer;
  const humanSymbol: string = getPlayerSymbol(humanPlayer);
  const title: string = humanPlayer ? `You (${humanSymbol})` : 'Player Chat';

  // Effect to initialize/reset chat on restart or role change
  useEffect(() => {
    const startingPlayerSymbol: string = getPlayerSymbol(Player.X);
    const initialMessage: string = humanPlayer
      ? `System: Game started! ${humanSymbol === startingPlayerSymbol ? 'Your turn' : `LLM's turn`} (${startingPlayerSymbol}). Enter a number (0-8) to make your move when it's your turn.`
      : 'System: Game starting...';
     setChatMessages([initialMessage]);
     setInputValue('');
  }, [onRestart, humanPlayer, humanSymbol]); 

  // Effect to scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleInternalChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isHumanTurn || !humanSymbol) return; // Only allow submission on human's turn

    const moveInput: string = inputValue.trim();
    const move: number = parseInt(moveInput, 10);

    if (!moveInput) return;

    let newMessages: string[] = [...chatMessages, `You (${humanSymbol}): ${moveInput}`];

    if (gameState !== GameState.Ongoing) {
      newMessages.push(`System: Game is already over. Please restart.`);
    } else if (isNaN(move) || move < 0 || move > 8) {
      newMessages.push(`System: Invalid input. Please enter a number between 0 and 8.`);
    } else {
      // const index = move - 1; // User input is 1-9, convert to 0-8
      const index: number = move; // Let's assume user enters 0-8 for simplicity now
      try {
          onMoveSubmit(index); // Call parent handler, it will throw if invalid
          // Don't add success message here, let board update be feedback
      } catch (error) { 
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
          <p key={index} className={styles.chatMessage}>{msg}</p>
        ))}
        <div ref={chatEndRef} /> {/* Element to scroll to */}
        </div>
        <form onSubmit={handleInternalChatSubmit} className={styles.chatForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
            placeholder={isHumanTurn ? "Enter move (0-8)" : "Wait for your turn..."}
            className={styles.chatInput}
            disabled={!isHumanTurn} // Disable input when not human's turn or game over
          />
          <button type="submit" className={styles.chatButton} disabled={!isHumanTurn}>Send</button>
        </form>
      </div>
  );
}
