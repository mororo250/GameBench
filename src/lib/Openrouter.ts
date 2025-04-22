import {ensureModelsFetched, getCachedModels, ModelInfo} from './OpenRouterModels';

// This allow other models to use the same cache without needing to import from OpenRouterModels.ts
export { getCachedModels };

export interface ChatMessage
{
    role: 'system' | 'user' | 'assistant' | 'error';
    content: string;
    modelName?: string; // Only for assistant messages
}

export interface CompletionResult {
    success: boolean;
    content: string | null;
    error: Error | null;
}

interface OpenRouterCompletionResponse
{
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
    }[];
}

interface OpenRouterCompletionRequest
{
    model: string;
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
}

interface OpenRouterGenerationData
{
    id: string;
    total_cost?: number;
    tokens_prompt?: number;
    tokens_completion?: number;
}

interface OpenRouterGenerationResponse
{
    data: OpenRouterGenerationData;
}


export class OpenRouterClient
{
    private readonly apiKey: string;
    private modelInfo: ModelInfo | null = null;
    private context: ChatMessage[]; // Use ChatMessage directly for context
    private totalInputTokens: number;
    private totalOutputTokens: number;
    private totalCost: number;

    /**
     * Initializes the OpenRouter client instance.
     * The model must be set separately using initializeModel.
     * @param apiKey - The user's OpenRouter API key.
     */
    constructor(apiKey: string)
    {
        if (!apiKey)
        {
            throw new Error("OpenRouter API key is required.");
        }
        this.apiKey = apiKey;
        this.context = [];
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.totalCost = 0;
    }

    /**
     * @param modelId - The identifier of the model to use (e.g., "openai/gpt-4o").
     * @returns True if the model was set successfully, false otherwise.
     */
    async initializeModel(modelId: string): Promise<boolean>
    {
        try
        {
            await ensureModelsFetched();

            const modelsCache: Map<string, ModelInfo> = getCachedModels();
            const modelData: ModelInfo | undefined = modelsCache.get(modelId);

            if (!modelData)
            {
                console.error(`Model with ID "${modelId}" not found in cached OpenRouter models or has invalid data.`);
                this.modelInfo = null;
                return false;
            }

            this.modelInfo = modelData;

            console.log(`Initialized model: ${this.modelInfo.name} (${this.modelInfo.id})`);
            console.log(` - Context Length: ${this.modelInfo.maxContextLength}`);
            console.log(` - Prompt Cost/MToken: $${this.modelInfo.promptMTokenCost.toFixed(6)}`);
            console.log(` - Completion Cost/MToken: $${this.modelInfo.completionMTokenCost.toFixed(6)}`);

            this.clearState();
            return true;

        } catch (error)
        {
            console.error(`Error initializing model ${modelId}:`, error);
            this.modelInfo = null;
            return false;
        }
    }

    /**
     * Adds a message to the conversation context.
     * @param role - The role of the message sender ('user' or 'system').
     * @param content - The content of the message.
     */
    addMessage(role: 'user' | 'system', content: string): void
    {
        // Add message without modelName for user/system
        this.context.push({ role, content });
    }

    /**
     * Clean Context completely
     */
    clearContext(): void
    {
        this.context = [];
    }

    /**
     * Sends the current context to the LLM and gets a completion.
     * Adds the assistant's response (with token info and cost) to the context if successful.
     * Requires initializeModel to have been called successfully first.
     *
     * @returns A CompletionResult object containing success status, content (on success),
     *          and error details (on failure).
     */
    async getCompletion(): Promise<CompletionResult> 
    {
        if (!this.modelInfo)
        {
            const error = new Error("Model not initialized. Call initializeModel(modelId) first.");
            console.error(error.message);
            return { success: false, content: null, error: error };
        }

        const messagesForApi: { role: 'system' | 'user' | 'assistant'; content: string }[] = this.context
            .filter((msg): msg is ChatMessage & { role: 'system' | 'user' | 'assistant' } => msg.role !== 'error')
            .map(({ role, content }) => ({
                role, content,
            }));

        if (messagesForApi.length === 0)
        {
            const error = new Error("Cannot get completion with empty context.");
            console.error(error.message);
            return { success: false, content: null, error: error };
        }

        const requestBody: OpenRouterCompletionRequest = {
            model: this.modelInfo.id,
            messages: messagesForApi,
        };

        let completionResponse: OpenRouterCompletionResponse | null = null;
        let assistantResponseContent: string | null = null;

        try
        {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok)
            {
                let errorBody = "Unknown error";
                try { errorBody = await response.text(); } catch (e) { /* Ignore */ }
                throw new Error(`OpenRouter API Error (${response.status}) on /chat/completions: ${response.statusText}. Body: ${errorBody}`);
            }

            completionResponse = await response.json() as OpenRouterCompletionResponse;
            assistantResponseContent = completionResponse?.choices[0]?.message?.content ?? null;

            if (!assistantResponseContent || !completionResponse?.id)
            {
                throw new Error("Invalid response structure or missing content/ID from /chat/completions.");
            }

            this.context.push({
                role: 'assistant',
                content: assistantResponseContent,
                modelName: this.modelInfo.name
            });

        } catch (error: unknown)
        {
            const typedError = error instanceof Error ? error : new Error(String(error));
            const errorMessage = `Error during fetch to /chat/completions (${this.modelInfo.id}): ${typedError.message}`;
            console.error(errorMessage, typedError);
            return { success: false, content: null, error: typedError };
        }

        try
        {
            const generationId = completionResponse.id;
            const generationUrl = `https://openrouter.ai/api/v1/generation?id=${generationId}`;

            const generationResponse = await fetch(generationUrl, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                },
            });

            if (!generationResponse.ok)
            {
                let errorBody = "Unknown error";
                try { errorBody = await generationResponse.text(); } catch (e) { /* Ignore */ }
                console.error(`OpenRouter API Error (${generationResponse.status}) on /generation: ${generationResponse.statusText}. Body: ${errorBody}`);
                return { success: true, content: assistantResponseContent, error: null };
            }

            const generationDetails: OpenRouterGenerationResponse = await generationResponse.json();

            const costData = generationDetails?.data;
            const currentCost = costData?.total_cost ?? 0;
            const inputTokens = costData?.tokens_prompt ?? 0;
            const outputTokens = costData?.tokens_completion ?? 0;

            this.totalInputTokens += inputTokens;
            this.totalOutputTokens += outputTokens;
            this.totalCost += currentCost;

            return { success: true, content: assistantResponseContent, error: null };

        } catch (error: unknown)
        {
            const typedError = error instanceof Error ? error : new Error(String(error));
            console.error(`Error during fetch to /generation (${this.modelInfo.id}): ${typedError.message}`, typedError);
            return { success: true, content: assistantResponseContent, error: null };
        }
    }

    /**
     * Resets the conversation context and token/cost totals.
     * Typically called when switching models or starting a new conversation.
     */
    clearState(): void
    {
        this.context = [];
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.totalCost = 0;
    }
}

export async function validateOpenRouterKey(apiKey: string): Promise<{ isValid: boolean; error?: string }>
{
    if (!apiKey || typeof apiKey !== "string")
    {
        return { isValid: false, error: "API key must be a non-empty string." };
    }

    try
    {
        const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            },
        });

        if (response.ok)
        {
            return { isValid: true };
        }
        else if (response.status === 401)
        {
            return { isValid: false, error: "Invalid API Key." };
        }
        else
        {
            return { isValid: false, error: `Validation failed (Status: ${response.status})` };
        }
    } catch (error)
    {
        console.error("Network error during API key validation:", error);
        return { isValid: false, error: "Network error during validation." };
    }
}
