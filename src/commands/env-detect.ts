import { spawn } from "node:child_process";
import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("env-detect");

/**
 * Checks if Ollama is accessible and pulls the required costOptStack 
 * models (qwen2.5:14b and qwen2.5:7b) if they are missing.
 */
export async function detectAndPullLocalModels(): Promise<void> {
    const config = loadConfig();
    if (!config.costOptStack) {
        return; // Fast escape if not using the costOptStack
    }

    log.info("Cost-Optimization Stack enabled: Verifying local Ollama environment...");

    try {
        // 1. Check if Ollama is running by listing models
        const listResult = await execCommand("ollama", ["list"]);
        const output = listResult.stdout.toLowerCase();

        const requiredModels = [
            { id: "qwen2.5:14b", purpose: "Auto-Routing & Defaults" },
            { id: "qwen2.5:7b", purpose: "Sub-Agent Operations" }
        ];

        for (const model of requiredModels) {
            if (output.includes(model.id)) {
                log.info(`[OK] Found required local model: ${model.id} (${model.purpose})`);
            } else {
                log.warn(`[MISSING] Local model ${model.id} not found. Initiating auto-pull...`);
                try {
                    // This will block until the pull is complete
                    await execCommand("ollama", ["pull", model.id], true);
                    log.info(`[SUCCESS] Successfully pulled ${model.id}`);
                } catch (pullError) {
                    log.error(`Failed to automatically pull ${model.id}. You may need to run 'ollama pull ${model.id}' manually.`);
                }
            }
        }
    } catch (error) {
        log.error("Failed to detect Ollama environment. Is the Ollama app running? Expected for costOptStack.");
    }
}

/**
 * Helper to wrap child_process.spawn in a promise.
 */
function execCommand(cmd: string, args: string[], streamToLog = false): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args);
        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdout += chunk;
            if (streamToLog) {
                process.stdout.write(chunk); // Stream progress directly if requested
            }
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            if (code !== 0 && !streamToLog) {
                reject(new Error(`Command ${cmd} ${args.join(" ")} exited with code ${code}`));
            } else {
                resolve({ stdout, stderr, code });
            }
        });
    });
}
