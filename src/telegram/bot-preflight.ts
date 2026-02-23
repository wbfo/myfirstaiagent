import { type Context, type Middleware } from "grammy";
import { type OpenClawConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";
import { getTelegramSequentialKey } from "./bot.js";
import { resolveTelegramAccount } from "./accounts.js";
import { resolveAckReaction } from "../agents/identity.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { firstDefined } from "./bot-access.js";
import { buildTelegramGroupPeerId, buildTelegramParentPeer, resolveTelegramForumThreadId } from "./bot/helpers.js";

// Global set to track active conversation keys for busy-state detection.
const activeConversationKeys = new Set<string>();

/**
 * Marks a conversation key as active.
 */
export function markConversationActive(key: string) {
    activeConversationKeys.add(key);
}

/**
 * Marks a conversation key as idle.
 */
export function markConversationIdle(key: string) {
    activeConversationKeys.delete(key);
}

export type TelegramPreflightOptions = {
    token: string;
    accountId?: string;
    config?: OpenClawConfig;
    runtime?: import("../runtime.js").RuntimeEnv;
};

/**
 * Telegram Preflight Middleware.
 * Provides immediate feedback (reactions) and detects if the bot is already busy with a specific chat.
 */
export const createTelegramPreflightMiddleware = (opts: TelegramPreflightOptions): Middleware<Context> => {
    const cfg = opts.config ?? loadConfig();
    const account = resolveTelegramAccount({
        cfg,
        accountId: opts.accountId,
    });
    const telegramCfg = account.config;
    const runtime = opts.runtime;

    return async (ctx, next) => {
        // Only process messages for potential immediate ack.
        if (!ctx.message && !ctx.channelPost) {
            return await next();
        }

        const msg = ctx.message ?? ctx.channelPost;
        if (!msg) {
            return await next();
        }

        const chatId = msg.chat.id;
        const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
        const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
        const isForum = (msg.chat as { is_forum?: boolean }).is_forum === true;
        const resolvedThreadId = isForum
            ? resolveTelegramForumThreadId({ isForum, messageThreadId })
            : undefined;

        const sequentialKey = getTelegramSequentialKey(ctx as any);
        const isBusy = activeConversationKeys.has(sequentialKey);

        // Basic access check to avoid acking unauthorized/disabled sources.
        // This is a "light" version of the check in buildTelegramMessageContext.
        try {
            const peerId = isGroup ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : String(chatId);
            const parentPeer = buildTelegramParentPeer({ isGroup, resolvedThreadId, chatId });
            const route = resolveAgentRoute({
                cfg,
                channel: "telegram",
                accountId: account.accountId,
                peer: { kind: isGroup ? "group" : "direct", id: peerId },
                parentPeer,
            });

            const ackReaction = resolveAckReaction(cfg, route.agentId, {
                channel: "telegram",
                accountId: account.accountId,
            });

            if (ackReaction) {
                // Immediate busy feedback if we're already processing this chat.
                if (isBusy) {
                    logVerbose(`telegram preflight: chat ${chatId} (key ${sequentialKey}) is busy; signaling...`);
                    // We could use a specific "busy" emoji here, or just let the user know we're still on it.
                    // For now, we'll just not double-ack or we could set a ⏳.
                    const busyEmoji = "⏳";
                    await withTelegramApiErrorLogging({
                        operation: "setMessageReaction",
                        runtime,
                        fn: () => ctx.api.setMessageReaction(chatId, msg.message_id, [{ type: "emoji", emoji: busyEmoji as any }]),
                    }).catch(() => { });
                } else {
                    // Immediate "eyes" to show we've seen the message, even before it hits the debouncer.
                    await withTelegramApiErrorLogging({
                        operation: "setMessageReaction",
                        runtime,
                        fn: () => ctx.api.setMessageReaction(chatId, msg.message_id, [{ type: "emoji", emoji: ackReaction as any }]),
                    }).catch(() => { });
                }
            }
        } catch (err) {
            // Best-effort preflight
            logVerbose(`telegram preflight error for chat ${chatId}: ${String(err)}`);
        }

        await next();
    };
};
