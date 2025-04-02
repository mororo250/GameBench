export enum Player
{
    X = 1, O = 2,
}

export enum GameState
{
    Ongoing, Draw, XWins, OWins,
}

export type SquareValue = Player | null;
export type BoardState = SquareValue[];

export class TicTacToeGame
{
    private board: BoardState;
    private nextPlayer: Player;
    private gameState: GameState;

    constructor()
    {
        this.board = Array(9).fill(null);
        this.nextPlayer = Player.X;
        this.gameState = GameState.Ongoing;
    }

    // --- Public Getters for Read-Only Access ---
    public getBoardState(): Readonly<BoardState>
    {
        // Return a shallow copy to prevent direct modification of the internal array
        // Although Readonly<T[]> prevents reassignment, it doesn't prevent mutation of elements if they were objects.
        // For primitive types like SquareValue (Player | null), a shallow copy is sufficient.
        return [...this.board];
    }

    public getNextPlayer(): Player
    {
        return this.nextPlayer;
    }

    public getGameState(): GameState
    {
        return this.gameState;
    }

    // --- End Getters ---

    /**
     * Attempts to make a move on the board using a 0-based index.
     * Validates the move and updates the game state directly if successful.
     * Throws an error if the move is invalid.
     * @param squareIndex The 0-based index of the square to play (0-8).
     * @throws Error if the move is invalid.
     */
    public makeMove(squareIndex: number): void
    {
        this.validateMove(squareIndex);
        this.board[squareIndex] = this.nextPlayer;
        this.gameState = this.calculateGameState();
        if (this.gameState === GameState.Ongoing)
        {
            this.nextPlayer = this.nextPlayer === Player.X ? Player.O : Player.X;
        }
    }

    /**
     * Explains the basic rules of Tic-Tac-Toe.
     * @returns A string explaining the game rules.
     */
    public explainGame(): string
    {
        return "Tic-Tac-Toe is a two-player game. Player X and Player O take turns marking spaces in a 3x3 grid. The player who succeeds in placing three of their marks in a horizontal, vertical, or diagonal row wins the game. If all 9 squares are filled and no player has won, the game is a draw.";
    }

    /**
     * Explains the expected format for specifying the next move.
     * @returns A string explaining the move format.
     */
    public explainNextMoveFormat(): string
    {
        return "To make a move, specify the number of the square you want to play (1-9). The squares are numbered from left-to-right, top-to-bottom:\n 1 | 2 | 3 \n-----------\n 4 | 5 | 6 \n-----------\n 7 | 8 | 9 \nOnly provide the single digit corresponding to the empty square.";
    }

    /**
     * Generates a warning message for an invalid move attempt.
     * @param errorMessage The specific error message from the validation.
     * @returns A formatted warning string.
     */
    public invalidMoveWarning(errorMessage: string): string
    {
        return `Invalid move: ${errorMessage} Please choose an empty square (1-9).`;
    }

    /**
     * Displays the current status of the game board and whose turn it is, or the final result.
     * Includes an explanation of the board symbols.
     * @returns A string representing the current game status.
     */
    public displayGameStatus(): string
    {
        let status: string = "Current Board State:\n";
        status += "('X' = Player 1, 'O' = Player 2, 'e' = empty)\n";
        for (let i: number = 0; i < 9; i += 3)
        {
            const row: string[] = this.board.slice(i, i + 3).map((val: SquareValue) => val === null ? 'e' : (val === Player.X ? 'X' : 'O'));
            status += ` ${row[0]} | ${row[1]} | ${row[2]} \n`;
            if (i < 6)
            {
                status += "-----------\n";
            }
        }
        status += "\n";

        switch (this.gameState)
        {
            case GameState.Ongoing:
                status += `Game is ongoing. It's Player ${this.nextPlayer === Player.X ? 'X' : 'O'}'s turn.`;
                break;
            case GameState.Draw:
                status += "Game over: It's a draw!";
                break;
            case GameState.XWins:
                status += "Game over: Player X wins!";
                break;
            case GameState.OWins:
                status += "Game over: Player O wins!";
                break;
        }
        return status;
    }

    public resetGame(): void
    {
        this.board = Array(9).fill(null);
        this.nextPlayer = Player.X;
        this.gameState = GameState.Ongoing;
    }

    private calculateGameState(): GameState
    {
        const lines: number[][] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6],            // Diagonals
        ];

        for (let i: number = 0; i < lines.length; i++)
        {
            const [a, b, c]: number[] = lines[i];
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c])
            {
                return this.board[a] === Player.X ? GameState.XWins : GameState.OWins;
            }
        }

        if (this.board.every(square => square !== null))
        {
            return GameState.Draw;
        }

        return GameState.Ongoing;
    }

    private validateMove(squareIndex: number): void
    {
        if (this.gameState !== GameState.Ongoing)
        {
            throw new Error("Game is already over.");
        }
        // Validate 0-based index
        if (squareIndex < 0 || squareIndex > 8 || !Number.isInteger(squareIndex))
        {
            // User sees 1-9, so adjust error message
            throw new Error(`Invalid square number: ${squareIndex + 1}. Must correspond to an integer between 1 and 9.`);
        }
        // Check board using 0-based index
        if (this.board[squareIndex] !== null)
        {
            const playerSymbol: 'X' | 'O' = this.board[squareIndex] === Player.X ? 'X' : 'O';
            // User sees 1-9, so adjust error message
            throw new Error(`Square ${squareIndex + 1} is already taken by ${playerSymbol}.`);
        }
    }
}

// --- Helper Function ---
export function getPlayerSymbol(player: Player | null): string
{
    if (player === Player.X) return 'X';
    if (player === Player.O) return 'O';
    return '';
}
