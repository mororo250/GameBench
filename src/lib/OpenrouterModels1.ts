export interface ModelInfo
{
    id: string;
    name: string;
    maxContextLength: number;
    promptMTokenCost: number;
    completionMTokenCost: number;
}

interface OpenRouterApiResponse
{
    data: OpenRouterRawModelData[];
}

interface OpenRouterRawModelData
{
    id: string;
    name: string;
    context_length: number | null;
    pricing?: {
        prompt?: string; completion?: string;
    };
}

const openRouterModelsCache: Map<string, ModelInfo> = new Map();
let modelsFetchPromise: Promise<void> | null = null;

/**
 * Fetches model data from OpenRouter and populates the cache if it's empty.
 * Prevents concurrent fetches. Ensures models are fetched only once.
 */
export async function ensureModelsFetched(): Promise<void>
{
    if (openRouterModelsCache.size > 0)
    {
        return;
    }

    if (modelsFetchPromise)
    {
        return modelsFetchPromise;
    }

    modelsFetchPromise = (async () =>
    {
        try
        {
            console.log("Fetching OpenRouter models list...");
            const response = await fetch("https://openrouter.ai/api/v1/models");
            if (!response.ok)
            {
                throw new Error(`Failed to fetch models: ${response.statusText}`);
            }
            const data: OpenRouterApiResponse = await response.json();

            data.data.forEach((modelData: OpenRouterRawModelData) =>
            {
                const promptCostRaw = modelData.pricing?.prompt;
                const completionCostRaw = modelData.pricing?.completion;
                let promptCostPerMillion: number | null = null;
                let completionCostPerMillion: number | null = null;

                const promptCostNum = typeof promptCostRaw === 'string' ? parseFloat(promptCostRaw) : null;
                const completionCostNum = typeof completionCostRaw === 'string' ? parseFloat(completionCostRaw) : null;

                if (promptCostNum !== null && !isNaN(promptCostNum))
                {
                    promptCostPerMillion = promptCostNum * 1000000;
                }
                if (completionCostNum !== null && !isNaN(completionCostNum))
                {
                    completionCostPerMillion = completionCostNum * 1000000;
                }

                // Check if calculation was successful before caching
                // Ensure context_length is also treated as potentially missing/null
                if (modelData.id && modelData.name && modelData.context_length != null && promptCostPerMillion !== null && completionCostPerMillion !== null)
                {
                    openRouterModelsCache.set(modelData.id, {
                        id: modelData.id,
                        name: modelData.name,
                        maxContextLength: modelData.context_length,
                        promptMTokenCost: promptCostPerMillion,
                        completionMTokenCost: completionCostPerMillion,
                    });
                }
            });
            console.log(`Fetched and cached ${openRouterModelsCache.size} models from OpenRouter.`);

        } catch (error)
        {
            console.error("Error fetching or caching OpenRouter models:", error);
            openRouterModelsCache.clear();
            throw error;
        } finally
        {
            modelsFetchPromise = null;
        }
    })();

    return modelsFetchPromise;
}

/**
 * Returns the cached map of OpenRouter models.
 * Will attempt to fetch models if the cache is empty and no fetch is in progress.
 * @returns A Map where keys are model IDs and values are ModelInfo objects.
 */
export function getCachedModels(): Map<string, ModelInfo>
{
    if (openRouterModelsCache.size === 0 && !modelsFetchPromise)
    {
        ensureModelsFetched().catch((err) =>
        {
            console.error("Initial fetch attempt for getCachedModels failed:", err);
        });
    }
    return openRouterModelsCache;
}

/**
 * Resets the cache and fetch promise state.
 * INTENDED FOR TESTING PURPOSES ONLY.
 */
export function resetModelsCacheForTesting(): void
{
    openRouterModelsCache.clear();
    modelsFetchPromise = null;
}
