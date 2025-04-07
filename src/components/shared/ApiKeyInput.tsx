import React, { ChangeEvent, Dispatch, ReactElement, SetStateAction, useState, useCallback } from "react";
import playerStyles from "../player/Player.module.css";
import { validateOpenRouterKey } from "../../lib/OpenRouter";

interface ApiKeyInputProps
{
    apiKey: string;
    setApiKey: Dispatch<SetStateAction<string>>;
}

export function ApiKeyInput({ apiKey, setApiKey }: ApiKeyInputProps): ReactElement
{
    const [isValidating, setIsValidating] = useState<boolean>(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const validateKey = useCallback(async (keyToValidate: string): Promise<void> =>
    {
        if (!keyToValidate)
        {
            setIsValid(null);
            setErrorMessage("");
            return;
        }

        setIsValidating(true);
        setIsValid(null);
        setErrorMessage("");

        try
        {
            const validationResult = await validateOpenRouterKey(keyToValidate);

            if (validationResult.isValid)
            {
                setIsValid(true);
                setErrorMessage("");
            }
            else
            {
                setIsValid(false);
                setErrorMessage(validationResult.error || "Invalid API Key.");
            }
        } catch (error) // Catch errors from validateOpenRouterKey itself, though it should handle internal errors
        {
            console.error("Validation error:", error);
            setIsValid(false);
            setErrorMessage(error instanceof Error ? error.message : "An unknown validation error occurred.");
        } finally
        {
            setIsValidating(false);
        }
    }, []);

    const handleApiKeyChange = (e: ChangeEvent<HTMLInputElement>): void =>
    {
        const newKey = e.target.value;
        setApiKey(newKey);
        setIsValid(null);
        setErrorMessage("");
    };

    const handleBlur = (): void =>
    {
        if (apiKey)
        {
            void validateKey(apiKey);
        } else
        {
            setIsValid(null);
            setErrorMessage("");
        }
    };

    return (
        <div className={playerStyles.configItem}>
            <label htmlFor="apiKey">OpenRouter API Key:</label>
            <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={handleApiKeyChange}
                onBlur={handleBlur}
                placeholder="Enter your OpenRouter API Key"
                className={`${playerStyles.configInput} ${isValid === false ? playerStyles.inputError : ""}`}
                aria-invalid={isValid === false}
                aria-describedby={isValid === false ? "apiKeyError" : undefined}
            />
            {isValidating && <span className={playerStyles.validatingMessage}> Validating...</span>}
            {isValid === false && errorMessage && (
                <p id="apiKeyError" className={playerStyles.errorMessage} style={{ color: "red" }}>
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
