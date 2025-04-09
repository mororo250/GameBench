"use client";

import React, { ReactElement } from "react";
import Layout from "../../components/layout/Layout";
import HistoryTable from "../../components/history/HistoryTable";
import { useHistory } from "../../context/HistoryContext";

export default function HistoryPage(): ReactElement
{
    const { historyManager } = useHistory();

    return (
        <Layout>
            <h1>Match History</h1>
            <p>Review the outcomes of previous Tic Tac Toe games.</p>
            <HistoryTable historyManager={historyManager} />
        </Layout>
    );
}
