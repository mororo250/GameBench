import React, { ReactElement } from "react";
import { Player, GameState, getPlayerSymbol } from "../../lib/TicTacToe";
import { PlayerConfig, PlayerType } from "../../controller/TicTacToeController";
import { ChatMessage } from "../../controller/LlmController";
import { ModelSelector } from "../shared/ModelSelector";
import { LlmChat } from "./LlmChat";
import { PlayerChat } from "./PlayerChat";
import { OpponentSelection } from "./OpponentSelection"; // Import the new component
import playerStyles from "./Player.module.css";
import layoutStyles from "../shared/Layout.module.css";

interface PlayerPanelProps
{
    playerRole: Player;
    playerConfig: PlayerConfig;
    isApiKeySet: boolean;
    isThinking: boolean;
    error: string | null;
    chatHistory: Readonly<ChatMessage[]>;
    gameState: GameState;
    isPlayerTurn: boolean;
    opponentType: PlayerType;
    onSetType: (type: PlayerType) => void;
    onSetModel: (modelId: string) => void;
    onMoveSubmit: (index: number) => void;
    onRestart: () => void;
}

export function PlayerPanel({
    playerRole,
    playerConfig,
    isApiKeySet,
    isThinking,
    error,
    chatHistory,
    gameState,
    isPlayerTurn,
    opponentType,
    onSetType,
    onSetModel,
    onMoveSubmit,
    onRestart,
}: PlayerPanelProps): ReactElement
{
    const playerSymbol = getPlayerSymbol(playerRole);
    const isLLM = playerConfig.type === PlayerType.LLM;
    const isHuman = playerConfig.type === PlayerType.Human;


    return (
        <div className={playerRole === Player.X ? layoutStyles.leftColumn : layoutStyles.rightColumn}>
            <h2>Player {playerSymbol}</h2>
            <OpponentSelection
                playerType={playerConfig.type}
                opponentType={opponentType}
                onSetType={onSetType}
            />

            {isLLM && (
                <>
                    <div className={playerStyles.configSection}>
                        <h3>LLM Config</h3>
                        <ModelSelector
                            isApiKeySet={isApiKeySet} // Pass the boolean prop
                            selectedModelId={playerConfig.modelId || ""}
                            setSelectedModelId={onSetModel}
                        />
                        {error && <div className={`${playerStyles.configItem} ${playerStyles.errorText}`}>LLM {playerSymbol} Error: {error}</div>}
                    </div>
                    <LlmChat messages={chatHistory} />
                    {isThinking && <div className={playerStyles.thinkingIndicator}>LLM {playerSymbol} is thinking...</div>}
                </>
            )}
            {isHuman && (
                <PlayerChat
                    gameState={gameState}
                    humanPlayer={playerRole}
                    onMoveSubmit={onMoveSubmit}
                    onRestart={onRestart}
                    isPlayerTurn={isPlayerTurn}
                />
            )}
        </div>
    );
}
