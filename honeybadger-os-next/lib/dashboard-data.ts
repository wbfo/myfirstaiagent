import type { Agent, Channel, NavItem, SkillMeta } from "./types";

export const AGENTS: Agent[] = [
  {
    id: "honeybadger",
    name: "HoneyBadger Orchestrator",
    emoji: "🦡",
    color: "#f59e0b",
    isDefault: true,
    role: "Route and coordinate specialist work",
    model: "google/gemini-3-flash-preview",
    fallbacks: [],
    skills: [
      "cloudrun-ops",
      "telegram-diagnostics",
      "config-secrets-audit",
      "observability",
      "skill-factory",
      "skill-creator"
    ],
    allowAgents: ["ops-coordinator", "quality-gate", "architect", "researcher", "deal-closer", "market-advisory"],
    maxConcurrent: 4,
    maxSpawnDepth: 1
  },
  {
    id: "ops-coordinator",
    name: "Ops Coordinator",
    emoji: "⚙️",
    color: "#3b82f6",
    isDefault: false,
    role: "Deploy/runtime operations",
    model: "google/gemini-3-flash-preview",
    fallbacks: ["google/gemini-2.5-flash"],
    skills: ["observability", "cloudrun-ops"],
    allowAgents: []
  },
  {
    id: "quality-gate",
    name: "Quality Gate",
    emoji: "🔍",
    color: "#10b981",
    isDefault: false,
    role: "Config and secrets quality checks",
    model: "google/gemini-3-flash-preview",
    fallbacks: ["google/gemini-2.5-flash"],
    skills: ["config-secrets-audit", "observability"],
    allowAgents: []
  },
  {
    id: "architect",
    name: "Architect",
    emoji: "🏗️",
    color: "#8b5cf6",
    isDefault: false,
    role: "System-level design + reliability",
    model: "google/gemini-3-pro-preview",
    fallbacks: ["google/gemini-3-flash-preview"],
    skills: ["cloudrun-ops", "config-secrets-audit", "observability"],
    allowAgents: []
  },
  {
    id: "researcher",
    name: "Researcher",
    emoji: "🔬",
    color: "#06b6d4",
    isDefault: false,
    role: "Discovery + workflow packaging",
    model: "google/gemini-3-pro-preview",
    fallbacks: ["google/gemini-3-flash-preview"],
    skills: ["observability", "skill-factory"],
    allowAgents: []
  },
  {
    id: "deal-closer",
    name: "Deal Closer",
    emoji: "🤝",
    color: "#ef4444",
    isDefault: false,
    role: "Outcome-oriented advisory output",
    model: "google/gemini-3-flash-preview",
    fallbacks: ["google/gemini-2.5-flash"],
    skills: ["observability", "skill-factory"],
    allowAgents: []
  },
  {
    id: "market-advisory",
    name: "Market Advisory",
    emoji: "📈",
    color: "#f97316",
    isDefault: false,
    role: "Market analysis/advisory output",
    model: "google/gemini-3-flash-preview",
    fallbacks: ["google/gemini-2.5-flash"],
    skills: ["observability", "skill-factory"],
    allowAgents: []
  }
];

export const SKILL_META: SkillMeta = {
  "cloudrun-ops": { color: "#3b82f6", desc: "Google Cloud Run deploy & runtime ops" },
  "telegram-diagnostics": { color: "#06b6d4", desc: "Telegram channel health & bot diagnostics" },
  "config-secrets-audit": { color: "#10b981", desc: "Config validation & secrets scanning" },
  observability: { color: "#8b5cf6", desc: "Logging, metrics & system monitoring" },
  "skill-factory": { color: "#f97316", desc: "Create and manage OpenClaw skills" },
  "skill-creator": { color: "#f59e0b", desc: "Advanced skill authoring & optimization" }
};

export const CHANNELS: Channel[] = [
  {
    id: "telegram",
    name: "Telegram",
    emoji: "✈️",
    color: "#06b6d4",
    desc: "Telegram bot channel",
    policy: { dm: "allowlist", group: "allowlist", mention: "required" }
  },
  { id: "discord", name: "Discord", emoji: "🎮", color: "#5865f2", desc: "Discord bot channel", policy: null },
  { id: "slack", name: "Slack", emoji: "💬", color: "#e01e5a", desc: "Slack workspace channel", policy: null },
  { id: "webchat", name: "WebChat", emoji: "🌐", color: "#10b981", desc: "Browser web chat UI", policy: null },
  { id: "whatsapp", name: "WhatsApp", emoji: "📱", color: "#25d366", desc: "WhatsApp messaging", policy: null },
  { id: "signal", name: "Signal", emoji: "🔐", color: "#3a76f0", desc: "Signal private messaging", policy: null }
];

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", icon: "⬡", label: "Overview" },
  { id: "agents", icon: "🦡", label: "Agents" },
  { id: "chat", icon: "💬", label: "Chat" },
  { id: "sessions", icon: "📋", label: "Sessions" },
  { id: "subagents", icon: "⚡", label: "Subagents" },
  { id: "skills", icon: "🔧", label: "Skills" },
  { id: "channels", icon: "📡", label: "Channels" },
  { id: "config", icon: "⚙️", label: "Config" }
];
