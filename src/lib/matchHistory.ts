
// 1: model1 wins, 2: model2 wins, 0: Draw
type WinnerCode = 1 | 2 | 0;

interface MatchData
{
    timestamp: string; // ISO 8601 format
    model1: string; // Assumed to be the first player
    model2: string;
    game: string;
    winner: WinnerCode;
}

// Input structure for adding a match
// Todo: later store all moves of each mode in the match -> Want to be able to replay the match
export interface AddMatchInput
{
    model1: string;
    model2: string;
    game: string;
    winner: string; // Name of the winning model or "Draw"
}

type HistoryStore = Record<string, MatchData[]>;

const MAX_HISTORY_PER_PAIR = 5;
const API_ENDPOINT = "/api/history";

export class MatchHistory
{
    private history: HistoryStore = {};
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;

    constructor()
    {
        this.initializationPromise = this.loadHistory();
    }

    private async ensureInitialized(): Promise<void>
    {
        if (!this.isInitialized && this.initializationPromise)
        {
            await this.initializationPromise;
        }
    }

    private getPairKey(model1: string, model2: string): string
    {
        return [model1, model2].sort().join("_vs_");
    }

    // Loads history from the API endpoint
    private async loadHistory(): Promise<void>
    {
        try
        {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok)
            {
                const errorData = await response.json().catch(() => ({})); // Try to get error details
                throw new Error(`Failed to load history: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown API error'}`);
            }

            const data: MatchData[] = await response.json();

            // Validate data structure slightly (more robust validation could be added)
            if (!Array.isArray(data))
            {
                throw new Error("Invalid history data format received from API.");
            }

            // Assuming API returns data compatible with MatchData[]
            this.history = this.organizeDataIntoStore(data);
            console.log("Match history loaded successfully via API.");
        }
        catch (error)
        {
            console.error("Error loading match history via API:", error);
            this.history = {}; // Start fresh on error
        }
        finally
        {
            this.isInitialized = true;
            this.initializationPromise = null; // Clear the promise once loading is done (success or fail)
        }
    }

    private organizeDataIntoStore(data: MatchData[]): HistoryStore
    {
        const store: HistoryStore = {};
        for (const match of data)
        {
            const key = this.getPairKey(match.model1, match.model2);
            if (!store[key])
            {
                store[key] = [];
            }

            store[key].push(match);
            store[key].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            if (store[key].length > MAX_HISTORY_PER_PAIR)
            {
                store[key] = store[key].slice(0, MAX_HISTORY_PER_PAIR);
            }
        }
        return store;
    }

    // saveHistory method removed as saving is handled by the API POST request

    // Adds a match by sending it to the API and then updates local state
    public async addMatch(matchInput: AddMatchInput): Promise<void>
    {
        await this.ensureInitialized();

        const apiPayload = { ...matchInput };

        try
        {
            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(apiPayload),
            });

            if (!response.ok)
            {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(`Failed to add match: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown API error'}`);
            }

            console.log("Match added successfully via API.");

            // Update local state AFTER successful API call
            let winnerCode: WinnerCode;
            if (matchInput.winner === matchInput.model1) winnerCode = 1;
            else if (matchInput.winner === matchInput.model2) winnerCode = 2;
            else winnerCode = 0;

            // Use local timestamp for immediate UI update consistency
            const fullMatchData: MatchData = {
                model1: matchInput.model1,
                model2: matchInput.model2,
                game: matchInput.game,
                winner: winnerCode,
                timestamp: new Date().toISOString(),
            };

            const key = this.getPairKey(fullMatchData.model1, fullMatchData.model2);

            if (!this.history[key])
            {
                this.history[key] = [];
            }

            this.history[key].unshift(fullMatchData);
            if (this.history[key].length > MAX_HISTORY_PER_PAIR)
            {
                this.history[key] = this.history[key].slice(0, MAX_HISTORY_PER_PAIR);
            }
            // Removed call to saveHistory()
        }
        catch (error)
        {
            console.error("Error adding match via API:", error);
            throw error; // Re-throw so the caller knows it failed
        }
    }

    public async getHistory(): Promise<HistoryStore>
    {
        await this.ensureInitialized();
        return this.history;
    }

    public async getHistoryForPair(model1: string, model2: string): Promise<MatchData[]>
    {
        await this.ensureInitialized();
        const key = this.getPairKey(model1, model2);
        return this.history[key] || [];
    }
}
