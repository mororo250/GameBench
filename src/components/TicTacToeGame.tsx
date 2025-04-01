'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, ReactElement, ChangeEvent } from 'react';
import { Player, GameState, TicTacToeGame, getPlayerSymbol, BoardState } from '../lib/tic-tac-toe';
import { ensureModelsFetched, getCachedModels, ModelInfo } from '../lib/openrouterModels';
import { OpenRouterClient } from '../lib/openrouter';
import { useTicTacToeGame } from '../hooks/useTicTacToeGame'; 
import { Board } from './Board'; 
import { LlmChat } from './LlmChat'; 
import { PlayerChat } from './PlayerChat'; 
import styles from './TicTacToe.module.css';

// --- Main Game Component ---
export default function Game(): ReactElement {
  // State for OpenRouter integration
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [models, setModels] = useState<Map<string, ModelInfo>>(new Map());
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [llmChatMessages, setLlmChatMessages] = useState<string[]>(['System: Select API Key and Model to start.']); // State for LLM chat
  const [isLlmThinking, setIsLlmThinking] = useState<boolean>(false);

  // State to track player roles (X or O)
  const [humanPlayerRole, setHumanPlayerRole] = useState<Player>(Player.X); // Human starts as X
  const llmPlayerRole: Player = humanPlayerRole === Player.X ? Player.O : Player.X;

  const openRouterClientRef = useRef<OpenRouterClient | null>(null);

  // --- Game Logic Hook ---
  const {
    gameInstance,
    handleSquareClick,
    handleRestart,
  } = useTicTacToeGame();

  // --- Derive State from Instance ---
  const currentBoardState: Readonly<BoardState> = gameInstance.getBoardState();
  const currentGameState: GameState = gameInstance.getGameState();
  const currentNextPlayer: Player = gameInstance.getNextPlayer();

  // --- Effects ---

  // Initialize/Re-initialize OpenRouterClient and set initial system prompts
  useEffect(() => {
    const initClientAndModel = async (): Promise<void> => {
      if (apiKey && selectedModelId && gameInstance) {
        try {
          const client: OpenRouterClient = new OpenRouterClient(apiKey);
          const modelInitialized: boolean = await client.initializeModel(selectedModelId);

          if (!modelInitialized) {
             throw new Error(`Failed to initialize model ${selectedModelId}.`);
          }

          openRouterClientRef.current = client;
          // --- Add System Prompts ---
          const llmSymbol: string = getPlayerSymbol(llmPlayerRole);
          const systemPrompt1: string = gameInstance.explainGame();
          const systemPrompt2: string = gameInstance.explainNextMoveFormat();
          const systemPrompt3: string = `You are playing Tic-Tac-Toe as Player ${llmSymbol}. The board squares are numbered 0-8. Respond with only the single digit (0-8) corresponding to the empty square you want to play.`;

          // initializeModel should clear context, but let's ensure it here too
          client.clearContext();
          client.addMessage('system', systemPrompt1);
          client.addMessage('system', systemPrompt2);
          client.addMessage('system', systemPrompt3);
          // --- End System Prompts ---

        console.log(`OpenRouterClient initialized/updated for model: ${selectedModelId} as Player ${llmSymbol}`);
        setLlmChatMessages((prev: string[]) => [...prev, `System: LLM Client ready (${selectedModelId} as ${llmSymbol}).`]);
        setModelsError(null); // Clear previous errors on successful init
        console.log(`OpenRouterClient initialized/updated for model: ${selectedModelId} as Player ${llmSymbol}`);
        setLlmChatMessages((prev: string[]) => [`System: LLM Client ready (${selectedModelId} as ${llmSymbol}).`]); // Reset chat on init

        } catch (error) {
          console.error("Failed to initialize OpenRouterClient:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          setModelsError(`Failed to init client: ${errorMessage}`);
          openRouterClientRef.current = null; // Ensure client is null on error
          setLlmChatMessages((prev: string[]) => [...prev, `System Error: Failed to initialize LLM - ${errorMessage}`]);
        }
      } else {
          openRouterClientRef.current = null; // Clear client if key/model removed
          if (apiKey && selectedModelId) {
              // Only show missing game instance error if key/model are present
              console.warn("Cannot initialize client: gameInstance is not available.");
          }
      }
    };

    initClientAndModel();
  }, [apiKey, selectedModelId, llmPlayerRole, gameInstance]);


  // Fetch models on component mount
  useEffect(() => {
    const fetchModels = async (): Promise<void> => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        await ensureModelsFetched();
        setModels(getCachedModels());
      } catch (error) {
        console.error("Failed to fetch models:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setModelsError(errorMessage || 'Failed to load models');
      } finally {
        setModelsLoading(false);
      }
    };
    fetchModels();
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- State & Refs (Derived) ---
  const isHumanTurn: boolean = currentGameState === GameState.Ongoing && currentNextPlayer === humanPlayerRole;
  const isLlmTurn: boolean = currentGameState === GameState.Ongoing && currentNextPlayer === llmPlayerRole;

  const handlePlayerChatMoveSubmit = (index: number): void => {
    if (!isHumanTurn) return; // Double check turn
    try {
      handleSquareClick(index);
    } catch (error) {
      console.log("Move error caught in main component:", error);
    }
  };

  const handleMainRestart = (): void => {
    handleRestart();
    // Swap roles for the next game BEFORE resetting chat/state
    const nextHumanRole: Player = humanPlayerRole === Player.X ? Player.O : Player.X;
    setHumanPlayerRole(nextHumanRole);

    setIsLlmThinking(false); // Ensure LLM thinking state is reset
    setLlmChatMessages(() => ['System: Game restarted. Roles swapped.']);

    // Re-initialize model and system prompts for the new role if client exists
    const reinitializeClientForNewRole = async (): Promise<void> => {
      // Use gameInstance directly here too
      if (openRouterClientRef.current && gameInstance && selectedModelId) {
          const client: OpenRouterClient = openRouterClientRef.current;
          const nextLlmRole: Player = nextHumanRole === Player.X ? Player.O : Player.X;
          const llmSymbol: string = getPlayerSymbol(nextLlmRole);

          try {
              // Re-initialize the model
              const modelInitialized: boolean = await client.initializeModel(selectedModelId);
              if (!modelInitialized) {
                  throw new Error(`Failed to re-initialize model ${selectedModelId} for new role.`);
              }

              // Add System Prompts for the new role (using gameInstance)
              const systemPrompt1: string = gameInstance.explainGame();
              const systemPrompt2: string = gameInstance.explainNextMoveFormat();
              const systemPrompt3: string = `You are playing Tic-Tac-Toe as Player ${llmSymbol}. The board squares are numbered 0-8. Respond with only the single digit (0-8) corresponding to the empty square you want to play.`;

              client.clearContext();
              client.addMessage('system', systemPrompt1);
              client.addMessage('system', systemPrompt2);
              client.addMessage('system', systemPrompt3);
              console.log(`System prompts updated for LLM role: ${llmSymbol}`);
              setLlmChatMessages((prev: string[]) => [...prev, `System: LLM role updated to ${llmSymbol}.`]);
          } catch (error) {
              console.error("Failed to re-initialize client for new role:", error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              setModelsError(`Failed to update LLM role: ${errorMessage}`);
              setLlmChatMessages((prev: string[]) => [...prev, `System Error: Failed to update LLM role - ${errorMessage}`]);
          }
      }
    };
    reinitializeClientForNewRole();
  };

  // Determine overall game status message including roles
  let gameStatusDisplay: string;
   switch (currentGameState) {
    case GameState.Draw:
      gameStatusDisplay = 'Game over: Draw';
      break;
    case GameState.XWins:
      gameStatusDisplay = `Game over: ${getPlayerSymbol(Player.X)} wins! (${Player.X === humanPlayerRole ? 'You' : 'LLM'})`;
      break;
    case GameState.OWins:
      gameStatusDisplay = `Game over: ${getPlayerSymbol(Player.O)} wins! (${Player.O === humanPlayerRole ? 'You' : 'LLM'})`;
      break;
    default:
      const currentPlayerSymbol: string = getPlayerSymbol(currentNextPlayer);
      const turnIndicator: string = currentNextPlayer === humanPlayerRole ? 'Your' : 'LLM\'s';
      gameStatusDisplay = `Game ongoing. ${turnIndicator} turn (${currentPlayerSymbol}).`;
  }
  if (isLlmThinking) {
    gameStatusDisplay = "LLM is thinking...";
  }


  // --- LLM Turn Logic ---
  const handleLlmMove = useCallback(async (): Promise<void> => {
    const client: OpenRouterClient | null = openRouterClientRef.current;
    // Use gameInstance directly in the callback closure
    if (!client || !gameInstance || !llmPlayerRole) {
      setLlmChatMessages((prev: string[]) => [...prev, "System: LLM Client not ready or game not initialized."]);
      return;
    }

    setIsLlmThinking(true);
    setLlmChatMessages((prev: string[]) => [...prev, "LLM: Thinking..."]);

    const llmSymbol: string = getPlayerSymbol(llmPlayerRole);
    const userPrompt: string = gameInstance.displayGameStatus();

    try {
      client.addMessage('user', userPrompt);
      setLlmChatMessages((prev: string[]) => [...prev, `System: Sending prompt to LLM (${llmSymbol})...`]);
      // Optional: Add current context to chat for debugging/visibility

      const response: string | null = await client.getCompletion();
      setLlmChatMessages((prev: string[]) => [...prev, `LLM Raw Response: ${response}`]);

      // --- Parse and Validate LLM Move ---
      const potentialMove: RegExpMatchArray | null = response ? response.trim().match(/\b([0-8])\b/) : null;
      if (!potentialMove) {
        throw new Error(`LLM response did not contain a valid move number (0-8). Response: "${response}"`);
      }

      const moveIndex: number = parseInt(potentialMove[1], 10);

      setLlmChatMessages((prev: string[]) => [...prev, `LLM (${llmSymbol}) chose square: ${moveIndex}`]);
      handleSquareClick(moveIndex);

    } catch (error) { 
      console.error("LLM move error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLlmChatMessages((prev: string[]) => [...prev, `System Error: ${errorMessage}`]);
    } finally {
      setIsLlmThinking(false);
    }
  }, [llmPlayerRole, handleSquareClick, gameInstance]);

  // Effect to trigger LLM move
  useEffect(() => {
    const latestGameState: GameState = gameInstance.getGameState();
    const latestNextPlayer: Player = gameInstance.getNextPlayer();
    const isLlmTurnNow: boolean = latestGameState === GameState.Ongoing && latestNextPlayer === llmPlayerRole;

    if (isLlmTurnNow && openRouterClientRef.current && !isLlmThinking) {
      // Add a small delay to make the game flow feel more natural
      const timer: NodeJS.Timeout | number = setTimeout(() => {
        handleLlmMove(); // handleLlmMove is stable due to useCallback
      }, 500); // 500ms delay

      return (): void => clearTimeout(timer); 
    }
    // Dependencies now reflect stable values needed by the effect logic.
    // The effect runs on every render triggered by forceUpdate in the hook,
    // and re-checks the conditions (isLlmTurnNow) inside.
  }, [gameInstance, llmPlayerRole, isLlmThinking, handleLlmMove]);


  // Create model options for the dropdown
  const modelOptions = useMemo<ReactElement[]>(() => {
    const options: ReactElement[] = [];
    options.push(<option key="default" value="" disabled>Select a Model</option>);
    Array.from(models.values())
      .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name))
      .forEach((model: ModelInfo) => {
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                placeholder="Enter your OpenRouter API Key"
                className={styles.configInput}
              />
            </div>
            <div className={styles.configItem}>
              <label htmlFor="modelSelect">Select LLM Model:</label>
              <select
                id="modelSelect"
                value={selectedModelId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedModelId(e.target.value)}
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
          <LlmChat messages={llmChatMessages} llmPlayer={llmPlayerRole} />
        </div>

        {/* Center Column: Board, Status, Restart */}
        <div className={styles.centerColumn}>
          <div className={styles.status}>{gameStatusDisplay}</div>
          {/* Disable board clicks if it's not human's turn or game is over */}
          <Board
             squares={currentBoardState} // Use derived state
             onSquareClick={handleSquareClick}
             disabled={!isHumanTurn || currentGameState !== GameState.Ongoing} // Use derived state
          />
          <button onClick={handleMainRestart} className={styles.restartButton}>
            Restart Game
          </button>
        </div>

        {/* Right Column: Player Chat */}
        <div className={styles.rightColumn}>
          <PlayerChat
            gameState={currentGameState}
            humanPlayer={humanPlayerRole}
            nextPlayer={currentNextPlayer}
            onMoveSubmit={handlePlayerChatMoveSubmit}
            onRestart={handleMainRestart}
          />
        </div>

      </div>
    </div>
  );
}
