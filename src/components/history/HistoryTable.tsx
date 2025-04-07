"use client";

import React, { useState, useEffect } from "react";
import { MatchHistory } from "../../lib/matchHistory";
import styles from "./History.module.css"; 

type WinnerCode = 1 | 2 | 0;

interface MatchData
{
    timestamp: string;
    model1: string;
    model2: string;
    game: string;
    winner: WinnerCode;
}

type HistoryStore = Record<string, MatchData[]>;

interface HistoryTableProps
{
    historyManager: MatchHistory;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ historyManager }) =>
{
    const [historyData, setHistoryData] = useState<HistoryStore>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() =>
    {
        const fetchHistory = async () =>
        {
            setIsLoading(true);
            setError(null);
            try
            {
                // Ensure manager is initialized and get data
                const data = await historyManager.getHistory();
                setHistoryData(data);
            }
            catch (err: any)
            {
                console.error("Failed to fetch match history:", err);
                setError("Failed to load match history.");
            }
            finally
            {
                setIsLoading(false);
            }
        };

        fetchHistory();
        // Dependency array includes historyManager instance.
        // If the instance itself can change, this ensures data re-fetches.
    }, [historyManager]);

    const formatTimestamp = (isoString: string): string =>
    {
        try
        {
            return new Date(isoString).toLocaleString(); // Adjust format as needed
        }
        catch
        {
            return isoString; // Fallback
        }
    };

    const getWinnerString = (match: MatchData): string =>
    {
        switch (match.winner)
        {
            case 1: return match.model1;
            case 2: return match.model2;
            case 0: return "Draw";
            default: return "Unknown";
        }
    };

    // Flatten the history store into a single array for rendering
    const allMatches: MatchData[] = Object.values(historyData).flat();
    // Sort all matches by timestamp descending to show newest first
    allMatches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (isLoading)
    {
        return <div className={styles.loading}>Loading match history...</div>;
    }

    if (error)
    {
        return <div className={styles.error}>Error: {error}</div>;
    }

    if (allMatches.length === 0)
    {
        return <div className={styles.noData}>No match history recorded yet.</div>;
    }

    return (
        <div className={styles.historyTableContainer}>
            <h2>Match History</h2>
            <table className={styles.historyTable}>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Model 1 (Player 1)</th>
                        <th>Model 2 (Player 2)</th>
                        <th>Game</th>
                        <th>Winner</th>
                    </tr>
                </thead>
                <tbody>
                    {allMatches.map((match, index) => (
                        // Using timestamp + index as key, assuming timestamps might not be unique enough if matches happen fast
                        <tr key={`${match.timestamp}-${index}`}>
                            <td>{formatTimestamp(match.timestamp)}</td>
                            <td>{match.model1}</td>
                            <td>{match.model2}</td>
                            <td>{match.game}</td>
                            <td>{getWinnerString(match)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default HistoryTable;
