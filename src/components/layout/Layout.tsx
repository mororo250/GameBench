import React, { ReactNode } from "react";
import Link from "next/link";
import layoutStyles from "../shared/Layout.module.css"; // Reuse existing styles if applicable, or create new ones

interface LayoutProps
{
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps): React.ReactElement
{
    return (
        <div className={layoutStyles.page}> {/* Assuming layoutStyles.page provides basic page structure */}
            <nav className={layoutStyles.topNav}> {/* Add styling for the nav bar */}
                <ul>
                    <li><Link href="/">Home</Link></li>
                    <li><Link href="/game">TicTacToe Game</Link></li>
                    <li><Link href="/history">History</Link></li>
                </ul>
            </nav>
            <main>
                {children}
            </main>
            {/* You can add a footer here if needed */}
        </div>
    );
}
