export enum Player {
  X = 1,
  O = 2,
}

export enum GameState {
  Ongoing,
  Draw,
  XWins,
  OWins,
}

export type SquareValue = Player | null;
export type BoardState = SquareValue[];

export class TicTacToeGame {
  public board: BoardState;
  public nextPlayer: Player;
  public gameState: GameState;

  constructor() {
    this.board = Array(9).fill(null);
    this.nextPlayer = Player.X;
    this.gameState = GameState.Ongoing;
  }

  private calculateGameState(): GameState {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],             // Diagonals
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        return this.board[a] === Player.X ? GameState.XWins : GameState.OWins;
      }
    }

    if (this.board.every(square => square !== null)) {
      return GameState.Draw;
    }

    return GameState.Ongoing;
  }


  private validateMove(squareIndex: number): void {
    if (this.gameState !== GameState.Ongoing) {
      throw new Error("Game is already over.");
    }
    if (squareIndex < 0 || squareIndex > 8 || !Number.isInteger(squareIndex)) {
      throw new Error(`Invalid square index: ${squareIndex}. Must be an integer between 0 and 8.`);
    }
    if (this.board[squareIndex] !== null) {
      const playerSymbol = this.board[squareIndex] === Player.X ? 'X' : 'O';
      throw new Error(`Square ${squareIndex} is already taken by ${playerSymbol}.`);
    }
  }

  /**
   * Attempts to make a move on the board.
   * Validates the move and updates the game state directly if successful.
   * Throws an error if the move is invalid.
   * @param squareIndex The index of the square to play (0-8).
   * @throws Error if the move is invalid.
   */
  public makeMove(squareIndex: number): void {
    this.validateMove(squareIndex);
    this.board[squareIndex] = this.nextPlayer;
    this.gameState = this.calculateGameState();
    if (this.gameState === GameState.Ongoing) {
      this.nextPlayer = this.nextPlayer === Player.X ? Player.O : Player.X;
    }
  }

  public resetGame(): void {
    this.board = Array(9).fill(null);
    this.nextPlayer = Player.X;
    this.gameState = GameState.Ongoing;
  }
}
