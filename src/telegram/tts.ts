import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve the path to the bin/tts script from the installed location
// src/telegram/tts.ts → ../../.. → project root → bin/tts
const TTS_BIN = path.resolve(__dirname, "../../../bin/tts");

export const DEFAULT_TTS_VOICE = "en-US-AndrewNeural";
export const DEFAULT_TTS_TIMEOUT_MS = 30_000;

export type TTSSpeechResult = {
    buffer: Buffer;
    contentType: "audio/ogg" | "audio/mpeg";
    fileName: string;
};

/**
 * Synthesize speech from text using edge-tts via the bin/tts CLI wrapper.
 * Returns null if TTS is unavailable or fails (caller should fall back gracefully).
 */
export async function synthesizeSpeech(params: {
    text: string;
    voice?: string;
    timeoutMs?: number;
}): Promise<TTSSpeechResult | null> {
    const { text, voice = DEFAULT_TTS_VOICE, timeoutMs = DEFAULT_TTS_TIMEOUT_MS } = params;
    if (!text.trim()) {
        return null;
    }

    const tmpDir = os.tmpdir();
    const outputPath = path.join(tmpDir, `openclaw-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.ogg`);

    return new Promise((resolve) => {
        const args = ["--text", text, "--voice", voice, "--output", outputPath];
        execFile(
            TTS_BIN,
            args,
            { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 },
            (err, stdout, stderr) => {
                if (err) {
                    // Clean up on failure
                    try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
                    resolve(null);
                    return;
                }
                // The CLI prints the actual output path to stdout (may differ from requested .ogg if ffmpeg unavailable)
                const actualPath = stdout.trim() || outputPath;
                try {
                    const buffer = fs.readFileSync(actualPath);
                    const isOgg = actualPath.endsWith(".ogg") || actualPath.endsWith(".opus");
                    resolve({
                        buffer,
                        contentType: isOgg ? "audio/ogg" : "audio/mpeg",
                        fileName: isOgg ? "voice.ogg" : "voice.mp3",
                    });
                } catch {
                    resolve(null);
                } finally {
                    try { fs.unlinkSync(actualPath); } catch { /* ignore */ }
                }
            },
        );
    });
}

/**
 * Strip markdown formatting from text to produce clean TTS input.
 * Removes code blocks, inline code, bold/italic, images, links, headers, and list markers.
 */
export function stripMarkdownForTts(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, "") // Remove fenced code blocks
        .replace(/`[^`\n]+`/g, (m) => m.slice(1, -1)) // Inline code → plain text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // Images → remove
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // Links → keep label
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
        .replace(/\*([^*]+)\*/g, "$1") // Italic (*)
        .replace(/__([^_]+)__/g, "$1") // Bold underscores
        .replace(/_([^_]+)_/g, "$1") // Italic underscores
        .replace(/~~([^~]+)~~/g, "$1") // Strikethrough
        .replace(/^#{1,6}\s+/gm, "") // Headers
        .replace(/^\s*[-*+]\s+/gm, "") // Bullet lists
        .replace(/^\s*\d+\.\s+/gm, "") // Numbered lists
        .replace(/\|[^\n]+\|/g, "") // Table rows
        .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
        .trim();
}
