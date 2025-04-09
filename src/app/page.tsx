"use client";

import React, { ReactElement } from "react";
import Layout from "../components/layout/Layout";
import layoutStyles from "../components/shared/Layout.module.css"; 
import Link from "next/link";

export default function HomePage(): ReactElement
{
    return (
        <Layout>
            <div className={layoutStyles.pageContent}>
                <h1>GameBench</h1>
                <h2>Evaluating LLMs Through Gameplay</h2>

                <p>
                    Welcome to GameBench, a platform designed to evaluate the reasoning and strategic capabilities
                    of Large Language Models (LLMs) through classic games. Currently, we feature Tic Tac Toe,
                    a seemingly simple game that requires foresight and tactical thinking.
                </p>

                <h3>Why Games?</h3>
                <p>
                    While LLMs excel at processing vast amounts of text data and generating human-like responses,
                    their ability to reason strategically in dynamic environments is an active area of research.
                    Games provide a controlled environment to test these capabilities. Tic Tac Toe, despite its simplicity,
                    involves:
                </p>
                <ul>
                    <li><strong>Strategic Planning:</strong> Anticipating opponent moves and planning counter-moves.</li>
                    <li><strong>Rule Adherence:</strong> Understanding and following the game's constraints.</li>
                    <li><strong>Goal Orientation:</strong> Working towards the objective of winning or forcing a draw.</li>
                </ul>

                <h3>How it Works</h3>
                <p>
                    You can play against various LLMs or have them play against each other. The platform interacts
                    with LLM APIs (currently via OpenRouter), sending the current game state and requesting the next move.
                    The history of moves and outcomes is recorded, allowing for analysis of model performance.
                </p>
                <p>
                    Navigate to the <Link href="/game">TicTacToe Game</Link> tab to start playing, or view past results in the <Link href="/history">History</Link> tab.
                </p>

                {/* Todo: Add leaderboard here */}

            </div>
        </Layout>
    );
}
