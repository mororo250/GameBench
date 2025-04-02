import { useCallback, useEffect, useState } from "react";
import { Player, TicTacToeGame, GameState, getPlayerSymbol } from "../lib/TicTacToe";

interface UsePlayerTicTacToeProps
{
    gameInstance: TicTacToeGame;
    initialPlayerRole: Player;
    onPlayerMove: () => void;
    addErrorMessage: (message: string) => void;
}

interface UsePlayerTicTacToeReturn
{
    playerRole: Player;
    isPlayerTurn: boolean;
    handlePlayerClick: (index: number) => void;
    setPlayerRole: (role: Player) => void;
}

export function usePlayerTicTacToe({
    gameInstance,
    initialPlayerRole,
    onPlayerMove,
    addErrorMessage
}: UsePlayerTicTacToeProps): UsePlayerTicTacToeReturn
{
    const [playerRole, setPlayerRole] = useState<Player>(initialPlayerRole);

    const currentGameState: GameState = gameInstance.getGameState();
    const currentNextPlayer: Player = gameInstance.getNextPlayer();
    const isPlayerTurn: boolean = currentGameState === GameState.Ongoing && currentNextPlayer === playerRole;

    const handlePlayerClick = useCallback((index: number): void =>
    {
        if (gameInstance.getGameState() === GameState.Ongoing && gameInstance.getNextPlayer() === playerRole)
        {
            try
            {
                console.log(`Player ${getPlayerSymbol(playerRole)} making move at index: ${index}`);
                gameInstance.makeMove(index);
                onPlayerMove();
            } catch (error)
            {
                console.error(`Invalid move by ${getPlayerSymbol(playerRole)}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                addErrorMessage(`Invalid move - ${errorMessage}`);
            }
        } else
        {
            console.warn(`Attempted move by Player ${getPlayerSymbol(playerRole)} (index ${index}) when not their turn or game over.`);
            addErrorMessage(`It's not Player ${getPlayerSymbol(playerRole)}'s turn.`);
        }
    }, [gameInstance, playerRole, onPlayerMove, addErrorMessage]);

    useEffect(() =>
    {
        setPlayerRole(initialPlayerRole);
    }, [initialPlayerRole]);


    return {
        playerRole,
        isPlayerTurn,
        handlePlayerClick,
        setPlayerRole,
    };
}
