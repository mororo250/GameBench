import { useCallback, useEffect, useRef, useState } from "react";
import { Player, TicTacToeGame, GameState, getPlayerSymbol } from "../lib/TicTacToe";
import { ChatMessage, OpenRouterClient, CompletionResult } from "../lib/OpenRouter";

interface UseLlmTicTacToeProps
{
    gameInstance: TicTacToeGame;
    playerRole: Player;
    apiKey: string;
    modelId: string | null;
    onLlmMove: () => void;
    isEnabled: boolean;
}

interface UseLlmTicTacToeReturn
{
    isThinking: boolean;
    chatMessages: ChatMessage[];
    error: string | null;
    triggerLlmMove: () => Promise<void>;
    resetLlm: (newPlayerRole: Player) => Promise<void>;
}

async function initializeLlmClient(
    apiKey: string,
    modelId: string,
    gameInstance: TicTacToeGame,
    playerRole: Player,
    addChatMessage: (message: ChatMessage) => void
): Promise<OpenRouterClient>
{
    const client = new OpenRouterClient(apiKey);
    const modelInitialized = await client.initializeModel(modelId);
    if (!modelInitialized)
    {
        throw new Error(`Failed to initialize model ${modelId}.`);
    }

    const llmSymbol = getPlayerSymbol(playerRole);
    const systemPrompt1 = gameInstance.explainGame();
    const systemPrompt2 = gameInstance.explainNextMoveFormat();
    const systemPrompt3 = `You are playing Tic-Tac-Toe as Player ${llmSymbol}.`;

    client.clearContext();
    client.addMessage("system", systemPrompt1);
    client.addMessage("system", systemPrompt2);
    client.addMessage("system", systemPrompt3);
    addChatMessage({ role: "system", content: systemPrompt1 });
    addChatMessage({ role: "system", content: systemPrompt2 });
    addChatMessage({ role: "system", content: systemPrompt3 });

    console.log(`LLM Client initialized for model: ${modelId} as Player ${llmSymbol}`);
    return client;
}

async function handleLlmMoveInternal(
    openRouterClientRef: React.RefObject<OpenRouterClient | null>,
    gameInstance: TicTacToeGame,
    llmPlayerRole: Player,
    addLlmChatMessage: (message: ChatMessage) => void,
    setIsLlmThinking: React.Dispatch<React.SetStateAction<boolean>>,
    onLlmMoveSuccessful: () => void
): Promise<void>
{
    const client: OpenRouterClient | null = openRouterClientRef.current;
    const modelName: string | null = client?.getModelName() ?? null;

    if (!client || !modelName || gameInstance.getGameState() !== GameState.Ongoing || gameInstance.getNextPlayer() !== llmPlayerRole)
    {
        console.warn(`LLM (${getPlayerSymbol(llmPlayerRole)}) move skipped: Conditions not met.`, {
            clientReady: !!client, modelName: modelName, gameState: gameInstance.getGameState(),
            nextPlayer: gameInstance.getNextPlayer(), llmPlayerRole: llmPlayerRole
        });
        setIsLlmThinking(false);
        return;
    }

    setIsLlmThinking(true);
    console.log(`LLM (${getPlayerSymbol(llmPlayerRole)}) starting move...`);

    let attempts = 0;
    const maxAttempts = 3;
    let moveSuccessful = false;
    let currentPrompt = gameInstance.displayGameStatus() + `\nYou are Player ${getPlayerSymbol(llmPlayerRole)}. Please select your next move (1-9).`;

    while (attempts < maxAttempts && !moveSuccessful)
    {
        attempts++;
        console.log(`LLM (${getPlayerSymbol(llmPlayerRole)}) Move Attempt ${attempts}/${maxAttempts}`);

        try
        {
            if (attempts === 1) {
                 addLlmChatMessage({ role: "user", content: currentPrompt });
            }
            client.addMessage("user", currentPrompt);

            const result: CompletionResult = await client.getCompletion();

            if (!result.success)
            {
                const errorMessage = result.error?.message ?? "LLM completion failed with an unknown error.";
                console.error(`LLM (${getPlayerSymbol(llmPlayerRole)}) completion failed on attempt ${attempts}:`, errorMessage, result.error);
                addLlmChatMessage({ role: "error", content: `LLM API Error: ${errorMessage}` });
                break;
            }

            const responseContent: string = result.content!;
            addLlmChatMessage({ role: "assistant", content: responseContent, modelName: modelName });

            const potentialMove: RegExpMatchArray | null = responseContent.trim().match(/\b([1-9])\b/);
            if (!potentialMove)
            {
                const formatErrorMsg = `Your response did not contain a valid move number (1-9). Response: "${responseContent}". ${gameInstance.explainNextMoveFormat()}`;
                console.error(`LLM (${getPlayerSymbol(llmPlayerRole)}) Format Error on attempt ${attempts}:`, formatErrorMsg);
                addLlmChatMessage({ role: "error", content: `LLM Format Error: Invalid move format.` });
                currentPrompt = formatErrorMsg;
                client.addMessage("system", "Invalid format in previous response. Please provide only the move number (1-9).");
                continue;
            }

            const moveIndex: number = parseInt(potentialMove[1], 10) - 1;

            try
            {
                console.log(`LLM (${getPlayerSymbol(llmPlayerRole)}) attempting move at index: ${moveIndex} (parsed from ${potentialMove[1]})`);
                gameInstance.makeMove(moveIndex);
                moveSuccessful = true;
                console.log(`LLM (${getPlayerSymbol(llmPlayerRole)}) move successful at square ${moveIndex + 1}.`);
                onLlmMoveSuccessful();
            } catch (moveError)
            {
                const errorMessage = moveError instanceof Error ? moveError.message : String(moveError);
                console.error(`LLM (${getPlayerSymbol(llmPlayerRole)}) Invalid Move Choice on attempt ${attempts}:`, errorMessage);
                const invalidMoveFeedback = gameInstance.invalidMoveWarning(errorMessage);
                addLlmChatMessage({ role: "error", content: `LLM Invalid Move: ${errorMessage}` });
                currentPrompt = invalidMoveFeedback;
                client.addMessage("system", `Invalid move choice in previous response: ${errorMessage}. Please choose an empty square.`);
                continue;
            }
        } catch (error)
        {
            console.error(`Unexpected error during LLM (${getPlayerSymbol(llmPlayerRole)}) move attempt ${attempts}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            addLlmChatMessage({ role: "error", content: `Unexpected LLM Processing Error: ${errorMessage}` });
            break;
        }
    }

    if (!moveSuccessful && attempts >= maxAttempts)
    {
        console.error(`LLM (${getPlayerSymbol(llmPlayerRole)}) failed to make a valid move after ${maxAttempts} attempts.`);
        addLlmChatMessage({ role: "error", content: `LLM failed to provide a valid move after ${maxAttempts} attempts.` });
    }

    setIsLlmThinking(false);
    console.log(`LLM (${getPlayerSymbol(llmPlayerRole)}) move handling finished.`);
}


export function useLlmTicTacToe({
    gameInstance,
    playerRole: initialPlayerRole,
    apiKey,
    modelId,
    onLlmMove,
    isEnabled
}: UseLlmTicTacToeProps): UseLlmTicTacToeReturn
{
    const openRouterClientRef = useRef<OpenRouterClient | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: "system", content: "Initializing LLM..." }]);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPlayerRole, setCurrentPlayerRole] = useState<Player>(initialPlayerRole);

    const addChatMessage = useCallback((message: ChatMessage): void =>
    {
        setChatMessages((prevMessages) =>
        {
            if (prevMessages.length === 1 && prevMessages[0].content === "Initializing LLM...")
            {
                return [message];
            }
            if (message.role === "system" && prevMessages.some(m => m.role === "system" && m.content === message.content)) {
                return prevMessages;
            }
            return [...prevMessages, message];
        });
    }, []);

    const triggerLlmMove = useCallback(async (): Promise<void> =>
    {
        if (!isEnabled || !openRouterClientRef.current) return;
        await handleLlmMoveInternal(
            openRouterClientRef,
            gameInstance,
            currentPlayerRole,
            addChatMessage,
            setIsThinking,
            onLlmMove
        );
    }, [gameInstance, currentPlayerRole, addChatMessage, onLlmMove, isEnabled]);

    const initializeAndPotentiallyMove = useCallback(async (role: Player): Promise<void> =>
    {
        if (!isEnabled || !apiKey || !modelId)
        {
            openRouterClientRef.current = null;
            setError(null);
            setChatMessages([{ role: "system", content: isEnabled ? "Select LLM Model." : "LLM Disabled." }]);
            setIsThinking(false);
            return;
        }

        if (!openRouterClientRef.current || openRouterClientRef.current.getModelName() !== modelId || currentPlayerRole !== role)
        {
            console.log(`Initializing LLM Client for Player ${getPlayerSymbol(role)} with model ${modelId}...`);
            setIsThinking(true);
            setError(null);
            setChatMessages([]);
            setCurrentPlayerRole(role);

            try
            {
                openRouterClientRef.current = await initializeLlmClient(
                    apiKey, modelId, gameInstance, role, addChatMessage
                );
                setError(null);
                if (gameInstance.getGameState() === GameState.Ongoing && gameInstance.getNextPlayer() === role)
                {
                    console.log(`LLM Player ${getPlayerSymbol(role)} to move immediately after init.`);
                    setTimeout(() => triggerLlmMove(), 50);
                }
            } catch (initError)
            {
                console.error(`Failed to initialize LLM Client for Player ${getPlayerSymbol(role)}:`, initError);
                const errorMessage = initError instanceof Error ? initError.message : String(initError);
                setError(`Failed to init LLM: ${errorMessage}`);
                openRouterClientRef.current = null;
                addChatMessage({ role: "error", content: `Failed to initialize LLM - ${errorMessage}` });
            } finally
            {
                setIsThinking(false);
            }
        }
    }, [isEnabled, apiKey, modelId, gameInstance, addChatMessage, triggerLlmMove, currentPlayerRole]);

    useEffect(() =>
    {
        if (isEnabled)
        {
            initializeAndPotentiallyMove(currentPlayerRole);
        } else
        {
            openRouterClientRef.current = null;
            setError(null);
            setChatMessages([{ role: "system", content: "LLM Disabled." }]);
            setIsThinking(false);
        }
    }, [isEnabled, apiKey, modelId, currentPlayerRole, initializeAndPotentiallyMove]);

    useEffect(() =>
    {
        const isMyTurnNow: boolean =
            isEnabled &&
            gameInstance.getGameState() === GameState.Ongoing &&
            gameInstance.getNextPlayer() === currentPlayerRole;

        if (isMyTurnNow && openRouterClientRef.current && !isThinking)
        {
            console.log(`Detected LLM Player ${getPlayerSymbol(currentPlayerRole)}'s turn, triggering move...`);
            const timer = setTimeout(() =>
            {
                triggerLlmMove();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [
        gameInstance.getGameState(),
        gameInstance.getNextPlayer(),
        isEnabled,
        currentPlayerRole,
        isThinking,
        triggerLlmMove
    ]);

    const resetLlm = useCallback(async (newPlayerRole: Player): Promise<void> =>
    {
        console.log(`Resetting LLM Player ${getPlayerSymbol(currentPlayerRole)} to role ${getPlayerSymbol(newPlayerRole)}.`);
        setIsThinking(false);
        setError(null);
        await initializeAndPotentiallyMove(newPlayerRole);

    }, [initializeAndPotentiallyMove, currentPlayerRole]);


    return {
        isThinking,
        chatMessages,
        error,
        triggerLlmMove,
        resetLlm,
    };
}
