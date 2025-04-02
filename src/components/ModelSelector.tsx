import React, { ChangeEvent, Dispatch, ReactElement, SetStateAction, useEffect, useMemo, useState } from "react";
import { ensureModelsFetched, getCachedModels, ModelInfo } from "../lib/OpenRouterModels";
import styles from "./TicTacToe.module.css";

interface ModelSelectorProps
{
    apiKey: string; // Needed to enable/disable the selector
    selectedModelId: string;
    setSelectedModelId: Dispatch<SetStateAction<string>>;
}

export function ModelSelector({ apiKey, selectedModelId, setSelectedModelId }: ModelSelectorProps): ReactElement
{
    const [models, setModels] = useState<Map<string, ModelInfo>>(new Map());
    const [modelsLoading, setModelsLoading] = useState<boolean>(true);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // Fetch models on component mount
    useEffect(() =>
    {
        const fetchModels = async (): Promise<void> =>
        {
            setModelsLoading(true);
            setModelsError(null);
            try
            {
                await ensureModelsFetched();
                setModels(getCachedModels());
            } catch (error)
            {
                console.error("Failed to fetch models:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                setModelsError(errorMessage || "Failed to load models");
            } finally
            {
                setModelsLoading(false);
            }
        };
        fetchModels();
    }, []);

    // Create model options for the dropdown
    const modelOptions = useMemo<ReactElement[]>(() =>
    {
        const options: ReactElement[] = [];
        options.push(<option key="default" value="" disabled>Select a Model</option>);
        Array.from(models.values())
            .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name))
            .forEach((model: ModelInfo) =>
            {
                options.push(<option key={model.id} value={model.id}>{model.name}</option>);
            });
        return options;
    }, [models]);

    const handleModelChange = (e: ChangeEvent<HTMLSelectElement>): void =>
    {
        setSelectedModelId(e.target.value);
    };

    return (
        <div className={styles.configItem}>
            <label htmlFor="modelSelect">Select LLM Model:</label>
            <select
                id="modelSelect"
                value={selectedModelId}
                onChange={handleModelChange}
                disabled={modelsLoading || !!modelsError || !apiKey}
                className={styles.configSelect}
            >
                {modelsLoading && <option value="" disabled>Loading models...</option>}
                {modelsError && <option value="" disabled>Error: {modelsError}</option>}
                {!modelsLoading && !modelsError && modelOptions}
            </select>
            {!apiKey && <span className={styles.configHint}>(Enter API Key to enable)</span>}
        </div>
    );
}
