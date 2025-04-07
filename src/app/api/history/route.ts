import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import Papa from "papaparse";

// Re-define types needed for consistency (or import from a shared types file)
type WinnerCode = 1 | 2 | 0;
interface MatchData
{
    timestamp: string;
    model1: string;
    model2: string;
    game: string;
    winner: WinnerCode;
}
interface AddMatchInput
{
    model1: string;
    model2: string;
    game: string;
    winner: string; // Name or "Draw"
}

const MAX_HISTORY_PER_PAIR = 5;
const CSV_FILE_PATH = path.resolve(process.cwd(), "data/matchHistory.csv");
const CSV_HEADERS = ["timestamp", "model1", "model2", "game", "winner"];

// Helper function to read and parse CSV
async function readCsv(): Promise<MatchData[]>
{
    try
    {
        await fs.access(CSV_FILE_PATH);
        const csvData = await fs.readFile(CSV_FILE_PATH, "utf-8");

        if (!csvData.trim() || csvData.trim() === CSV_HEADERS.join(","))
        {
            return [];
        }

        const parseResult = Papa.parse<any>(csvData, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
        });

        if (parseResult.errors.length > 0)
        {
            console.error("API: Errors parsing match history CSV:", parseResult.errors);
            return []; // Return empty on error to avoid propagating bad data
        }

        // Convert and validate
        return parseResult.data.map((row: any) => ({
            timestamp: row.timestamp,
            model1: row.model1,
            model2: row.model2,
            game: row.game,
            winner: parseInt(row.winner, 10) as WinnerCode,
        })).filter(match =>
            match.timestamp && match.model1 && match.model2 && match.game && !isNaN(match.winner)
        );
    }
    catch (error: any)
    {
        if (error.code === "ENOENT")
        {
            console.log("API: Match history CSV not found. Returning empty.");
            return []; // File not existing is not an error, just no history
        }
        else
        {
            console.error("API: Error reading match history CSV:", error);
            throw new Error("Failed to read history data"); // Throw for other errors
        }
    }
}

// Helper function to write CSV
async function writeCsv(data: MatchData[]): Promise<void>
{
    try
    {
        // Sort all matches by timestamp descending before saving
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const csvString = Papa.unparse(data, {
            header: true,
            columns: CSV_HEADERS,
        });

        const dirPath = path.dirname(CSV_FILE_PATH);
        try
        {
            await fs.access(dirPath);
        }
        catch
        {
            await fs.mkdir(dirPath, { recursive: true });
        }

        await fs.writeFile(CSV_FILE_PATH, csvString, "utf-8");
        console.log("API: Match history saved successfully.");
    }
    catch (error)
    {
        console.error("API: Error writing match history CSV:", error);
        throw new Error("Failed to save history data");
    }
}

// GET Handler: Returns all history data
export async function GET(): Promise<NextResponse>
{
    try
    {
        const historyData = await readCsv();
        return NextResponse.json(historyData);
    }
    catch (error: any)
    {
        return NextResponse.json({ message: error.message || "Failed to fetch history" }, { status: 500 });
    }
}

// POST Handler: Adds a new match record
export async function POST(request: Request): Promise<NextResponse>
{
    try
    {
        const matchInput: AddMatchInput = await request.json();

        // Basic validation on input
        if (!matchInput || !matchInput.model1 || !matchInput.model2 || !matchInput.game || !matchInput.winner)
        {
            return NextResponse.json({ message: "Invalid match data provided" }, { status: 400 });
        }

        let winnerCode: WinnerCode;
        if (matchInput.winner === matchInput.model1) winnerCode = 1;
        else if (matchInput.winner === matchInput.model2) winnerCode = 2;
        else winnerCode = 0; // Draw

        const newMatchData: MatchData = {
            ...matchInput,
            winner: winnerCode,
            timestamp: new Date().toISOString(),
        };

        // Read existing data
        let historyData = await readCsv();

        // Add new match
        historyData.push(newMatchData);

        // Group by pair to enforce MAX_HISTORY_PER_PAIR limit
        const historyStore: Record<string, MatchData[]> = {};
        const getPairKey = (m1: string, m2: string) => [m1, m2].sort().join("_vs_");

        for (const match of historyData)
        {
            const key = getPairKey(match.model1, match.model2);
            if (!historyStore[key]) historyStore[key] = [];
            historyStore[key].push(match);
        }

        // Apply limit and flatten back
        const limitedHistory: MatchData[] = [];
        for (const key in historyStore)
        {
            const pairHistory = historyStore[key];
            pairHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            limitedHistory.push(...pairHistory.slice(0, MAX_HISTORY_PER_PAIR));
        }

        // Write updated data back to CSV
        await writeCsv(limitedHistory);

        return NextResponse.json({ message: "Match added successfully" }, { status: 201 });
    }
    catch (error: any)
    {
        console.error("API POST Error:", error);
        // Distinguish between client errors (like bad JSON) and server errors
        if (error instanceof SyntaxError) { // Bad JSON from client
             return NextResponse.json({ message: "Invalid JSON format" }, { status: 400 });
        }
        return NextResponse.json({ message: error.message || "Failed to add match" }, { status: 500 });
    }
}

// Final newline
