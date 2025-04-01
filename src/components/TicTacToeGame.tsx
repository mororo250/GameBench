'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, GameState, SquareValue, BoardState, TicTacToeGame } from '../lib/tic-tac-toe'; // Import the class and types
import { ensureModelsFetched, getCachedModels, ModelInfo } from '../lib/openrouterModels'; // Import model functions and type
import styles from './TicTacToe.module.css'; // Import CSS Module

// --- Custom Hook for Game Logic using the TicTacToeGame class ---
function useTicTacToeGame() {
  const game = useMemo(() => new TicTacToeGame(), []);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const forceUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1); // Increment to force re-render
  }, []);

  const handleSquareClick = useCallback((index: number) => {
    try {
      game.makeMove(index);
      forceUpdate(); // Re-render after successful move
    } catch (error) {
      console.error("Invalid move:", error);
      // Optionally, provide feedback to the user here if needed
    }
  }, [game, forceUpdate]);

  const handleRestart = useCallback(() => {
    game.resetGame();
    forceUpdate(); // Re-render after reset
  }, [game, forceUpdate]);

  // Derive status from the game instance's state
  let status;
  const currentGameState = game.gameState; // Access state from the instance
  const nextPlayer = game.nextPlayer;

  switch (currentGameState) {
    case GameState.Draw:
      status = 'Game is a Draw';
      break;
    case GameState.XWins:
      status = 'Winner: X';
      break;
    case GameState.OWins:
      status = 'Winner: O';
      break;
    default: // GameState.Ongoing
      status = 'Next player: ' + (nextPlayer === Player.X ? 'X' : 'O');
  }

  // Return the game instance's state and handlers
  return {
    gameInstance: game, // Expose the instance if needed elsewhere
    boardState: game.board, // Get board directly from instance
    gameState: currentGameState,
    status,
    xIsNext: nextPlayer === Player.X, // Derive xIsNext from game instance
    handleSquareClick,
    handleRestart,
  };
}

// --- UI Components ---

// Read-only LLM Chat
function LlmChat({ messages }: { messages: string[] }) {
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.chatContainer}>
      <h2>LLM Thoughts</h2>
      <div className={`${styles.chatBox} ${styles.readOnlyChatBox}`}> {/* Add readOnly class */}
        {messages.map((msg, index) => (
          <p key={index} className={styles.chatMessage}>{msg}</p>
        ))}
        <div ref={chatEndRef} />
      </div>
      {/* No input form for LLM chat */}
    </div>
  );
}

// Player Input Game Chat
function PlayerChat({ gameState, xIsNext, onMoveSubmit, onRestart }: {
  gameState: GameState;
  xIsNext: boolean;
  onMoveSubmit: (index: number) => void;
  onRestart: () => void; // Keep restart separate for now
}) {
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = React.useRef<HTMLDivElement>(null); // Ref to scroll chat

  // Effect to initialize/reset chat on restart
  // We need a way to trigger this externally when the main restart happens
  useEffect(() => {
     setChatMessages(['System: Game started! Player X, enter a number (1-9) to make your move.']);
     setInputValue('');
  }, [onRestart]); // Relying on parent's restart logic

  // Effect to scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleInternalChatSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const moveInput = inputValue.trim();
    const move = parseInt(moveInput, 10);
    const currentPlayerSymbol = xIsNext ? 'X' : 'O';

    if (!moveInput) return;

    let newMessages = [...chatMessages, `Player ${currentPlayerSymbol}: ${moveInput}`];

    if (gameState !== GameState.Ongoing) {
      newMessages.push(`System: Game is already over. Please restart.`);
    } else if (isNaN(move) || move < 1 || move > 9) {
      newMessages.push(`System: Invalid input. Please enter a number between 1 and 9.`);
    } else {
      const index = move - 1;
      try {
          onMoveSubmit(index); // Call parent handler
          // Success message could be added, but board update is primary feedback
      } catch (error: any) {
          newMessages.push(`System: Error - ${error.message}`); // Show validation errors from game logic
      }
    }

    setChatMessages(newMessages);
    setInputValue('');
  };

  return (
     <div className={styles.chatContainer}>
        <h2>Player Chat</h2>
        <div className={styles.chatBox}>
          {chatMessages.map((msg, index) => (
            <p key={index} className={styles.chatMessage}>{msg}</p>
          ))}
          <div ref={chatEndRef} /> {/* Element to scroll to */}
        </div>
        <form onSubmit={handleInternalChatSubmit} className={styles.chatForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter move (1-9)"
            className={styles.chatInput}
            disabled={gameState !== GameState.Ongoing} // Disable input when game is over
          />
          <button type="submit" className={styles.chatButton} disabled={gameState !== GameState.Ongoing}>Send</button>
        </form>
        {/* Restart button moved to center column */}
      </div>
  );
}


// Helper function to display player symbol
function getPlayerSymbol(player: Player | null): string {
  if (player === Player.X) return 'X';
  if (player === Player.O) return 'O';
  return '';
}

// Square component
function Square({ value, onSquareClick }: { value: SquareValue, onSquareClick: () => void }) {
  return (
    <button className={styles.square} onClick={onSquareClick}>
      {getPlayerSymbol(value)}
    </button>
  );
}

// Board component
function Board({ squares, onSquareClick }: { squares: BoardState, onSquareClick: (index: number) => void }) {
  const boardRows = [];
  for (let row = 0; row < 3; row++) {
    const squaresInRow = [];
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      squaresInRow.push(
        <Square
          key={index}
          value={squares[index]}
          onSquareClick={() => onSquareClick(index)} // Pass index to handler
        />
      );
    }
    boardRows.push(
      <div key={row} className={styles.boardRow}>
        {squaresInRow}
      </div>
    );
  }

  return (
    <div className={styles.board}>
      {boardRows}
    </div>
  );
}


// --- Main Game Component ---
export default function Game() {
  // State for OpenRouter integration
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [models, setModels] = useState<Map<string, ModelInfo>>(new Map());
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [llmChatMessages, setLlmChatMessages] = useState<string[]>(['LLM: Waiting for game to start...']); // State for LLM chat

  // Fetch models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        await ensureModelsFetched();
        setModels(getCachedModels());
      } catch (error: any) {
        console.error("Failed to fetch models:", error);
        setModelsError(error.message || 'Failed to load models');
      } finally {
        setModelsLoading(false);
      }
    };
    fetchModels();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Game logic hook
  const {
    boardState,
    gameState,
    status,
    xIsNext,
    handleSquareClick,
    handleRestart
  } = useTicTacToeGame();

  // Handler for player chat submitting a move
  const handlePlayerChatMoveSubmit = (index: number): void => {
    // Add validation here? Or rely on hook? Rely on hook for now.
    handleSquareClick(index);
  };

  // Handler for the main restart button
  const handleMainRestart = () => {
    handleRestart(); // Call the hook's restart
    // Reset LLM chat as well
    setLlmChatMessages(['LLM: Game restarted. Waiting...']);
    // Player chat will reset via its useEffect dependency on handleRestart
  };

  // Create model options for the dropdown
  const modelOptions = useMemo(() => {
    const options = [];
    options.push(<option key="default" value="" disabled>Select a Model</option>);
    Array.from(models.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(model => {
        options.push(<option key={model.id} value={model.id}>{model.name}</option>);
      });
    return options;
  }, [models]);


  return (
    <div className={styles.page}>
      <h1>Tic Tac Toe vs LLM</h1>

      <div className={styles.gameLayout}>

        {/* Left Column: Config and LLM Chat */}
        <div className={styles.leftColumn}>
          <div className={styles.configSection}>
            <h2>Configuration</h2>
            <div className={styles.configItem}>
              <label htmlFor="apiKey">OpenRouter API Key:</label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenRouter API Key"
                className={styles.configInput}
              />
            </div>
            <div className={styles.configItem}>
              <label htmlFor="modelSelect">Select LLM Model:</label>
              <select
                id="modelSelect"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={modelsLoading || !!modelsError || !apiKey}
                className={styles.configSelect}
              >
                {modelsLoading && <option value="" disabled>Loading models...</option>}
                {modelsError && <option value="" disabled>Error: {modelsError}</option>}
                {!modelsLoading && !modelsError && modelOptions}
              </select>
              {!apiKey && <span className={styles.configHint}>(Enter API Key to enable)</span>}
            </div>
          </div>
          <LlmChat messages={llmChatMessages} />
        </div>

        {/* Center Column: Board, Status, Restart */}
        <div className={styles.centerColumn}>
          <div className={styles.status}>{status}</div>
          <Board squares={boardState} onSquareClick={handleSquareClick} />
          <button onClick={handleMainRestart} className={styles.restartButton}>
            Restart Game
          </button>
        </div>

        {/* Right Column: Player Chat */}
        <div className={styles.rightColumn}>
          <PlayerChat
            gameState={gameState}
            xIsNext={xIsNext}
            onMoveSubmit={handlePlayerChatMoveSubmit}
            onRestart={handleMainRestart} // Pass main restart to trigger chat reset
          />
        </div>

      </div>
    </div>
  );
}
