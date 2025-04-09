import { OpenRouterClient, ChatMessage as OpenRouterChatMessage, CompletionResult } from "../lib/OpenRouter";

export interface ChatMessage
{
    role: "user" | "assistant" | "system" | "error";
    content: string;
}

export interface LlmControllerState
{
    isThinking: boolean;
    error: string | null;
    chatHistory: Readonly<ChatMessage[]>;
}

export type LlmStateChangeListener = (newState: LlmControllerState) => void;

export class LlmController
{
    private openRouterClient: OpenRouterClient | null = null;
    private apiKey: string = "";
    private modelId: string = "";

    private state: LlmControllerState = {
        isThinking: false,
        error: null,
        chatHistory: [],
    };

    private listeners: LlmStateChangeListener[] = [];

    constructor() { }

    public async configure(apiKey: string, modelId: string): Promise<boolean>
    {
        console.log(`LLM Controller: Configuring with Model ID ${modelId} and API Key`);
        const apiKeyChanged = this.apiKey !== apiKey;
        const modelChanged = this.modelId !== modelId;

        this.apiKey = apiKey;
        this.modelId = modelId;

        if (apiKeyChanged || modelChanged)
        {
            this.updateState({
                isThinking: false,
                error: null,
                chatHistory: [],
            });

            if (this.apiKey)
            {
                try
                {
                    this.openRouterClient = new OpenRouterClient(this.apiKey);
                    const initialized = await this.openRouterClient.initializeModel(this.modelId);
                    if (!initialized)
                    {
                        this.openRouterClient = null;
                        this.updateState({ error: `Failed to initialize model ${this.modelId}` });
                        return false;
                    }
                    return true;
                } catch (error: any)
                {
                    this.openRouterClient = null;
                    this.updateState({ error: `Error configuring OpenRouterClient: ${error.message}` });
                    return false;
                }
            } else
            {
                this.openRouterClient = null;
            }
        }
        return this.openRouterClient !== null;
    }

    public getState(): Readonly<LlmControllerState>
    {
        return { ...this.state, chatHistory: [...this.state.chatHistory] };
    }

    public subscribe(listener: LlmStateChangeListener): () => void
    {
        this.listeners.push(listener);
        return () =>
        {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void
    {
        const stateSnapshot = this.getState();
        this.listeners.forEach(listener => listener(stateSnapshot));
    }

    private updateState(updates: Partial<LlmControllerState>): void
    {
        const newChatHistory = updates.chatHistory ?? this.state.chatHistory;

        this.state = {
            isThinking: updates.isThinking ?? this.state.isThinking,
            error: updates.error !== undefined ? updates.error : this.state.error,
            chatHistory: newChatHistory,
        };
        this.notifyListeners();
    }

    public async generateResponse(prompt: string): Promise<string>
    {
        if (!this.openRouterClient)
        {
            this.updateState({ error: "LLM Controller not configured. Call configure() first.", isThinking: false });
            throw new Error("LLM Controller not configured.");
        }
        if (this.state.isThinking)
        {
            throw new Error("LLM Controller is already processing a request.");
        }

        console.log(`LLM Controller: Generating response for model ${this.modelId}`);
        this.updateState({ isThinking: true, error: null });

        try
        {
            this.openRouterClient.addMessage("user", prompt);
            const result: CompletionResult = await this.openRouterClient.getCompletion();

            if (!result.success || result.content === null)
            {
                const errorMessage = result.error?.message || "LLM generation failed without specific error.";
                throw new Error(errorMessage);
            }

            const newUserMessage: ChatMessage = { role: "user", content: prompt };
            const newAssistantMessage: ChatMessage = { role: "assistant", content: result.content };

            this.updateState({
                isThinking: false,
                chatHistory: [...this.state.chatHistory, newUserMessage, newAssistantMessage],
            });

            return result.content;

        } catch (error: any)
        {
            console.error(`LLM Controller: Error during generation:`, error);
            this.updateState({ error: error.message || "Failed to get response from LLM", isThinking: false });
            throw error;
        }
    }

    public resetChat(): void
    {
        this.updateState({
            isThinking: false,
            error: null,
            chatHistory: [],
        });

        this.openRouterClient?.clearState();
    }

    public resetConfig(): void
    {
        this.apiKey = "";
        this.modelId = "";
        this.openRouterClient = null;
    }
}
