import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ensureModelsFetched, getCachedModels, ModelInfo, resetModelsCacheForTesting} from '../src/lib/OpenRouterModels'; // Import the reset function

// Mock the global fetch function
const mockFetch = vi.fn();

// Sample valid API response data
const mockValidModelData = {
    data: [{
        "id": "openai/o1-mini",
        "name": "OpenAI: o1-mini",
        "created": 1726099200,
        "description": "The latest and strongest model family from OpenAI, o1 is designed to spend more time thinking before responding.\n\nThe o1 models are optimized for math, science, programming, and other STEM-related tasks. They consistently exhibit PhD-level accuracy on benchmarks in physics, chemistry, and biology. Learn more in the [launch announcement](https://openai.com/o1).\n\nNote: This model is currently experimental and not suitable for production use-cases, and may be heavily rate-limited.",
        "context_length": 128000,
        "architecture": {
            "modality": "text-\u003Etext",
            "input_modalities": ["text"],
            "output_modalities": ["text"],
            "tokenizer": "GPT",
            "instruct_type": null
        },
        "pricing": {
            "prompt": "0.0000011",
            "completion": "0.0000044",
            "request": "0",
            "image": "0",
            "web_search": "0",
            "internal_reasoning": "0",
            "input_cache_read": "0",
            "input_cache_write": "0"
        },
        "top_provider": {
            "context_length": 128000, "max_completion_tokens": 65536, "is_moderated": true
        },
        "per_request_limits": null
    }, {
        "id": "google/gemini-2.0-pro-exp-02-05:free",
        "name": "Google: Gemini Pro 2.0 Experimental (free)",
        "created": 1738768044,
        "description": "Gemini 2.0 Pro Experimental is a bleeding-edge version of the Gemini 2.0 Pro model. Because it's currently experimental, it will be **heavily rate-limited** by Google.\n\nUsage of Gemini is subject to Google's [Gemini Terms of Use](https://ai.google.dev/terms).\n\n#multimodal",
        "context_length": 2000000,
        "architecture": {
            "modality": "text+image-\u003Etext",
            "input_modalities": ["text", "image"],
            "output_modalities": ["text"],
            "tokenizer": "Gemini",
            "instruct_type": null
        },
        "pricing": {
            "prompt": "0",
            "completion": "0",
            "request": "0",
            "image": "0",
            "web_search": "0",
            "internal_reasoning": "0",
            "input_cache_read": "0",
            "input_cache_write": "0"
        },
        "top_provider": {
            "context_length": 2000000, "max_completion_tokens": 8192, "is_moderated": false
        },
        "per_request_limits": null
    }],
};

const expectedModelInfo: Map<string, ModelInfo> = new Map([['openai/o1-mini', {
    id: 'openai/o1-mini',
    name: 'OpenAI: o1-mini',
    maxContextLength: 128000,
    promptMTokenCost: 1.1,
    completionMTokenCost: 4.4,
},], ['google/gemini-2.0-pro-exp-02-05:free', {
    id: 'google/gemini-2.0-pro-exp-02-05:free',
    name: 'Google: Gemini Pro 2.0 Experimental (free)',
    maxContextLength: 2000000,
    promptMTokenCost: 0,
    completionMTokenCost: 0,
},],]);

describe('OpenRouter Models Cache', () =>
{
    beforeEach(() =>
    {
        vi.stubGlobal('fetch', mockFetch);
        resetModelsCacheForTesting(); // Use the dedicated reset function
        mockFetch.mockClear();
    });

    afterEach(() =>
    {
        vi.unstubAllGlobals();
    });

    it('should fetch models and populate the cache on first call', async () =>
    {
        mockFetch.mockResolvedValueOnce({
            ok: true, json: async () => mockValidModelData,
        });

        await ensureModelsFetched();

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith('https://openrouter.ai/api/v1/models');

        const cachedModels = getCachedModels();
        expect(cachedModels.size).toBe(2); // Only valid models should be cached
        expect(cachedModels).toEqual(expectedModelInfo);
    });

    it('should return cached models without fetching on subsequent calls', async () =>
    {
        mockFetch.mockResolvedValueOnce({
            ok: true, json: async () => mockValidModelData,
        });
        await ensureModelsFetched();
        expect(mockFetch).toHaveBeenCalledTimes(1);

        mockFetch.mockClear(); // Clear call count for the second check
        await ensureModelsFetched();
        expect(mockFetch).not.toHaveBeenCalled(); // Should not fetch again

        const cachedModels = getCachedModels();
        expect(cachedModels.size).toBe(2);
        expect(cachedModels).toEqual(expectedModelInfo);
    });

    it('should handle fetch errors', async () =>
    {
        const fetchError = new Error('Network Error');
        mockFetch.mockRejectedValueOnce(fetchError);

        await expect(ensureModelsFetched()).rejects.toThrow('Network Error');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const cachedModels = getCachedModels();
        expect(cachedModels.size).toBe(0); // Cache should remain empty
    });

    it('should handle non-ok HTTP responses gracefully', async () =>
    {
        mockFetch.mockResolvedValueOnce({
            ok: false, statusText: 'Not Found',
        });

        await expect(ensureModelsFetched()).rejects.toThrow('Failed to fetch models: Not Found');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const cachedModels = getCachedModels();
        expect(cachedModels.size).toBe(0);
    });

    it('should prevent concurrent fetch requests', async () =>
    {
        mockFetch.mockImplementationOnce(async () =>
        {
            await new Promise(resolve => setTimeout(resolve, 50));
            return {
                ok: true, json: async () => mockValidModelData,
            };
        });

        // Start multiple concurrent requests
        const promise1 = ensureModelsFetched();
        const promise2 = ensureModelsFetched();

        await Promise.all([promise1, promise2]);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed API response data', async () =>
    {
        mockFetch.mockResolvedValueOnce({
            ok: true, json: async () => ({data: [{id: 'test', name: 'Test Model'}]}), // Missing required fields
        });

        await ensureModelsFetched();
        const cachedModels = getCachedModels();

        expect(cachedModels.size).toBe(0); // No valid models should be cached
    });
});
