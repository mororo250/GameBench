import { HistoryProvider } from "../context/HistoryContext";
import React from "react"; 

export const metadata = {
    title: 'GameBench',
    description: 'Evaluating LLMs Through Gameplay',
}

export default function RootLayout({ children, }: { children: React.ReactNode })
{
    return (
        <html lang="en">
            <body>
                <HistoryProvider> 
                    {children}
                </HistoryProvider>
            </body>
        </html>
    )
}
