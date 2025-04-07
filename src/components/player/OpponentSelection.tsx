import React, { ReactElement } from "react";
import { PlayerType } from "../../controller/TicTacToeController";
import playerStyles from "./Player.module.css";

interface OpponentSelectionProps
{
    playerType: PlayerType;
    opponentType: PlayerType;
    onSetType: (type: PlayerType) => void;
}

export function OpponentSelection({
    playerType,
    opponentType,
    onSetType,
}: OpponentSelectionProps): ReactElement
{
    const isLLM = playerType === PlayerType.LLM;
    const isHuman = playerType === PlayerType.Human;

    const disableHumanButton = isHuman || (opponentType === PlayerType.Human);
    const disableLlmButtonBase = isLLM;
    
    return (
        <div className={playerStyles.opponentSelection}>
            <label>Type:</label>
            <button
                onClick={() => onSetType(PlayerType.Human)}
                className={isHuman ? playerStyles.activeButton : ""}
                disabled={disableHumanButton}
            >
                Human
            </button>
            <button
                onClick={() => onSetType(PlayerType.LLM)}
                className={isLLM ? playerStyles.activeButton : ""}
                disabled={disableLlmButtonBase}
            >
                LLM
            </button>
        </div>
    );
}
