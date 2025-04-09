"use client";

import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { MatchHistory } from "../lib/matchHistory";

interface HistoryContextType
{
    historyManager: MatchHistory;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

interface HistoryProviderProps
{
    children: ReactNode;
}

export function HistoryProvider({ children }: HistoryProviderProps): React.ReactElement
{
    const historyManager = useMemo(() => new MatchHistory(), []);
    const value = { historyManager };

    return (
        <HistoryContext.Provider value={value}>
            {children}
        </HistoryContext.Provider>
    );
}

export function useHistory(): HistoryContextType
{
    const context = useContext(HistoryContext);
    if (context === undefined)
    {
        throw new Error("useHistory must be used within a HistoryProvider");
    }
    return context;
}
