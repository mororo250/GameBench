import OpenAI from 'openai';
import {ChatCompletion, ChatCompletionMessageParam} from 'openai/resources/chat/completions';
import {ensureModelsFetched, getCachedModels, ModelInfo} from './OpenRouterModels1'; // Import from the new file

// This allow other models to use the same cache without needing to import from OpenRouterModels1.ts
export {getCachedModels};

interface ChatMessage
{
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ContextEntry extends ChatMessage
{
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
}

export class OpenRouterClient
{
    private client: OpenAI;
    private readonly apiKey: string;
    private modelInfo: ModelInfo | null = null;
    private context: ContextEntry[];
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

        this.client = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1", apiKey: this.apiKey, dangerouslyAllowBrowser: true,
        });
    }

    /**
     * Fetches model details from OpenRouter and sets the active model for the client.
     * @param modelId - The identifier of the model to use (e.g., "openai/gpt-4o").
     * Sets the active model for the client instance using globally cached data.
     * Fetches model data globally if not already cached.
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
        this.context.push({role, content});
    }

    /**
     * Clean all user rolle messages and assistant past messages.
     */
    clearContext(): void
    {
        this.context = this.context.filter((msg: ContextEntry) => msg.role === 'system');
    }

    /**
     * Sends the current context to the LLM and gets a completion.
     * Adds the assistant's response (with token info and cost) to the context.
     * Requires initializeModel to have been called successfully first.
     *
     * @returns The content of the assistant's response, or null if an error occurs or model not initialized.
     */
    async getCompletion(): Promise<string | null>
    {
        if (!this.modelInfo)
        {
            console.error("Model not initialized. Call initializeModel(modelId) first.");
            return null;
        }

        const messagesForApi: ChatCompletionMessageParam[] = this.context.map(({role, content}) => ({
            role, content,
        }));

        if (messagesForApi.length === 0)
        {
            console.error("Cannot get completion with empty context.");
            return null;
        }

        try
        {
            const completion: ChatCompletion = await this.client.chat.completions.create({
                model: this.modelInfo.id, messages: messagesForApi,
            });

            const assistantResponseContent = completion.choices[0]?.message?.content;
            const usage = completion.usage;

            if (assistantResponseContent && usage)
            {
                const inputTokens = usage.prompt_tokens ?? 0;
                const outputTokens = usage.completion_tokens ?? 0;

                const promptCost = (inputTokens / 1000000) * this.modelInfo.promptMTokenCost;
                const completionCost = (outputTokens / 1000000) * this.modelInfo.completionMTokenCost;
                const currentCost = promptCost + completionCost;

                this.context.push({
                    role: 'assistant',
                    content: assistantResponseContent,
                    inputTokens: inputTokens,
                    outputTokens: outputTokens,
                    cost: currentCost,
                });

                this.totalInputTokens += inputTokens;
                this.totalOutputTokens += outputTokens;
                this.totalCost += currentCost;

                return assistantResponseContent;
            }
            else
            {
                console.error("No response content or usage data received from OpenRouter.");
                return null;
            }
        } catch (error)
        {
            console.error(`Error fetching completion from OpenRouter (${this.modelInfo.id}):`, error);
            return null;
        }
    }

    clearState(): void
    {
        this.context = [];
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.totalCost = 0;
    }
}
