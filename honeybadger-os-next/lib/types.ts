export type Agent = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isDefault: boolean;
  role: string;
  model: string;
  fallbacks: string[];
  skills: string[];
  allowAgents: string[];
  maxConcurrent?: number;
  maxSpawnDepth?: number;
};

export type Channel = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  policy: null | {
    dm: string;
    group: string;
    mention: string;
  };
};

export type NavItem = {
  id: Screen;
  icon: string;
  label: string;
};

export type Screen =
  | "overview"
  | "agents"
  | "agent-detail"
  | "chat"
  | "sessions"
  | "subagents"
  | "skills"
  | "channels"
  | "config";

export type SessionEntry = {
  key: string;
  agentId?: string;
  label?: string;
  status?: string;
  lastMessage?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  isError?: boolean;
};

export type SubagentRun = {
  runId: string;
  agentId: string;
  task: string;
  status: "started" | "delegated" | "active" | "aborting" | "aborted" | "error" | "completed";
  ts: number;
  output?: string;
};

export type SkillMeta = Record<string, { color: string; desc: string }>;

export type GatewayStatus = "connected" | "connecting" | "disconnected" | "error";

export type CostUsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  missingCostEntries: number;
};

export type CostUsageDailyEntry = CostUsageTotals & {
  date: string;
};

export type CostUsageSummary = {
  updatedAt: number;
  days: number;
  daily: CostUsageDailyEntry[];
  totals: CostUsageTotals;
};

export type UsageWindow = {
  label: string;
  usedPercent: number;
  resetAt?: number;
};

export type ProviderUsageSnapshot = {
  provider: string;
  displayName: string;
  windows: UsageWindow[];
  plan?: string;
  error?: string;
};

export type UsageSummary = {
  updatedAt: number;
  providers: ProviderUsageSnapshot[];
};

export type SkillStatusEntry = {
  name: string;
  description: string;
  source: string;
  filePath: string;
  baseDir: string;
  skillKey: string;
  bundled?: boolean;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: {
    bins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  missing: {
    bins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
};

export type SkillStatusReport = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: SkillStatusEntry[];
};

export type AgentFileEntry = {
  name: string;
  path: string;
  missing: boolean;
  size?: number;
  updatedAtMs?: number;
  content?: string;
};

export type AgentsFilesListResult = {
  agentId: string;
  workspace: string;
  files: AgentFileEntry[];
};

export type AgentsFilesGetResult = {
  agentId: string;
  workspace: string;
  file: AgentFileEntry;
};
