"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENTS, CHANNELS, NAV_ITEMS, SKILL_META } from "@/lib/dashboard-data";
import type {
  Agent,
  ChatMessage,
  CostUsageSummary,
  GatewayStatus,
  Screen,
  SessionEntry,
  SubagentRun,
} from "@/lib/types";

type RpcPending = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

type WsMessage = {
  id?: string;
  type?: string;
  event?: string;
  result?: unknown;
  error?: { message?: string };
  data?: unknown;
  server?: { version?: string; connId?: string };
};

function randomKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cardClass(extra = ""): string {
  return `rounded-xl border border-hb-border bg-hb-panel ${extra}`.trim();
}

function StatusDot({ status }: { status: GatewayStatus | "active" | "idle" }) {
  const color =
    status === "connected" || status === "active"
      ? "bg-hb-green"
      : status === "connecting"
        ? "bg-hb-amber"
        : status === "error"
          ? "bg-hb-red"
          : "bg-hb-muted";

  return <span className={`inline-block size-2 rounded-full ${color}`} />;
}

function AgentAvatar({ agent, size = 42 }: { agent: Agent; size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-xl border"
      style={{
        width: size,
        height: size,
        borderColor: `${agent.color}55`,
        background: `${agent.color}1a`,
      }}
    >
      <span style={{ fontSize: Math.round(size * 0.48) }}>{agent.emoji}</span>
    </div>
  );
}

function ModelTag({ model }: { model: string }) {
  return (
    <code className="rounded bg-hb-bg px-2 py-1 text-xs text-hb-cyan">
      {model.replace("google/", "")}
    </code>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactInt(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (["active", "running", "streaming", "started", "delegated", "in_progress"].includes(normalized)) {
    return "border-hb-green/35 bg-hb-green/10 text-hb-green";
  }
  if (["aborting", "queued", "pending"].includes(normalized)) {
    return "border-hb-amber/35 bg-hb-amber/10 text-hb-amber";
  }
  if (["error", "aborted", "failed"].includes(normalized)) {
    return "border-hb-red/35 bg-hb-red/10 text-hb-red";
  }
  return "border-hb-border bg-hb-bg text-hb-muted";
}

export function Dashboard() {
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, RpcPending>>(new Map());
  const chatBufferRef = useRef("");
  const rpcCounterRef = useRef(1);

  const [screen, setScreen] = useState<Screen>("overview");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [chatAgent, setChatAgent] = useState("honeybadger");

  const [host, setHost] = useState("127.0.0.1:18789");
  const [token, setToken] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>("disconnected");
  const [gatewayInfo, setGatewayInfo] = useState<{ version?: string; connId?: string } | null>(
    null,
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatRunState, setChatRunState] = useState<
    "streaming" | "done" | "error" | "aborted" | null
  >(null);
  const [chatRunId, setChatRunId] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsFilter, setSessionsFilter] = useState("");

  const [channelsHealth, setChannelsHealth] = useState<Record<string, unknown> | null>(null);
  const [usageCost, setUsageCost] = useState<CostUsageSummary | null>(null);
  const [usageCostLoading, setUsageCostLoading] = useState(false);
  const [usageCostError, setUsageCostError] = useState<string | null>(null);
  const [metricsUpdatedAt, setMetricsUpdatedAt] = useState<number | null>(null);

  const [subagentTargetId, setSubagentTargetId] = useState("ops-coordinator");
  const [subagentTask, setSubagentTask] = useState("");
  const [subagentRuns, setSubagentRuns] = useState<SubagentRun[]>([]);
  const [subagentBusy, setSubagentBusy] = useState(false);

  const [configData, setConfigData] = useState<unknown>(null);
  const [configBaseHash, setConfigBaseHash] = useState<string | null>(null);
  const [configEditMode, setConfigEditMode] = useState(false);
  const [configEditText, setConfigEditText] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [configToast, setConfigToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentChatAgent = useMemo(
    () => AGENTS.find((a) => a.id === chatAgent) ?? AGENTS[0],
    [chatAgent],
  );

  const rpc = useCallback((method: string, params: Record<string, unknown> = {}) => {
    return new Promise<unknown>((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Gateway is not connected"));
        return;
      }

      const id = String(rpcCounterRef.current++);
      const timer = setTimeout(() => {
        const pending = pendingRef.current.get(id);
        if (!pending) { return; }
        pendingRef.current.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, 15000);

      pendingRef.current.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ type: "req", id, method, params }));
    });
  }, []);

  const applySessionsFallback = useCallback(() => {
    setSessions(
      AGENTS.map((a) => ({
        key: `agent:${a.id}:main`,
        agentId: a.id,
        label: a.name,
        status: "idle",
      })),
    );
  }, []);

  const loadSessions = useCallback(async () => {
    if (gatewayStatus !== "connected") {
      applySessionsFallback();
      return;
    }

    setSessionsLoading(true);
    setSessionsError(null);

    try {
      const result = (await rpc("sessions.list", {})) as
        | { sessions?: SessionEntry[] }
        | SessionEntry[];
      const list = Array.isArray(result) ? result : (result.sessions ?? []);
      setSessions(list);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : String(err));
      applySessionsFallback();
    } finally {
      setSessionsLoading(false);
    }
  }, [applySessionsFallback, gatewayStatus, rpc]);

  const loadChannels = useCallback(async () => {
    if (gatewayStatus !== "connected") { return; }
    try {
      const result = (await rpc("channels.status", {})) as Record<string, unknown>;
      setChannelsHealth(result);
    } catch {
      // ignore
    }
  }, [gatewayStatus, rpc]);

  const loadUsageCost = useCallback(async () => {
    if (gatewayStatus !== "connected") {
      setUsageCost(null);
      setUsageCostError(null);
      return;
    }

    setUsageCostLoading(true);
    try {
      const result = (await rpc("usage.cost", { days: 30 })) as CostUsageSummary;
      setUsageCost(result);
      setUsageCostError(null);
      setMetricsUpdatedAt(Date.now());
    } catch (err) {
      setUsageCostError(err instanceof Error ? err.message : String(err));
    } finally {
      setUsageCostLoading(false);
    }
  }, [gatewayStatus, rpc]);

  const loadConfig = useCallback(async () => {
    if (gatewayStatus !== "connected") { return; }
    setConfigLoading(true);
    try {
      const result = (await rpc("config.get", {})) as {
        config?: unknown;
        baseHash?: string;
        hash?: string;
      };
      const config = result?.config ?? result;
      setConfigData(config);
      setConfigBaseHash(result.baseHash ?? result.hash ?? null);
      setConfigEditText(JSON.stringify(config, null, 2));
    } catch (err) {
      setConfigToast({ type: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setConfigLoading(false);
    }
  }, [gatewayStatus, rpc]);

  const connectGateway = useCallback(() => {
    const prev = wsRef.current;
    if (prev) {
      prev.close();
      wsRef.current = null;
    }

    setGatewayStatus("connecting");

    const url = host.startsWith("ws://") || host.startsWith("wss://") ? host : `ws://${host}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "req",
          method: "connect",
          id: "handshake",
          params: {
            minProtocol: 1,
            maxProtocol: 10,
            client: {
              id: "openclaw-control-ui",
              displayName: "HoneyBadger OS",
              version: "1.0.0",
              platform: "web",
              mode: "webchat",
            },
            ...(token ? { auth: { token } } : {}),
          },
        }),
      );
    };

    ws.onmessage = (event) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data) as WsMessage;
      } catch {
        return;
      }

      // Handle hello-ok (handshake success)
      if (msg.type === "hello-ok") {
        const helloOk = msg as unknown as { server?: { version?: string; connId?: string } };
        setGatewayInfo(helloOk.server ?? null);
        setGatewayStatus("connected");
        return;
      }

      // Handle response frames (type: "res")
      if (msg.type === "res" && msg.id && pendingRef.current.has(msg.id)) {
        const pending = pendingRef.current.get(msg.id);
        if (!pending) { return; }
        clearTimeout(pending.timer);
        pendingRef.current.delete(msg.id);
        const resMsg = msg as unknown as {
          ok?: boolean;
          payload?: unknown;
          error?: { message?: string };
        };
        if (resMsg.ok === false || resMsg.error) {
          pending.reject(new Error(resMsg.error?.message ?? "RPC error"));
        } else {
          pending.resolve(resMsg.payload);
        }
        return;
      }

      // Handle event frames (type: "event")
      if (msg.type !== "event") { return; }
      const evt = msg.event;
      if (evt !== "chat") { return; }

      const data = (msg.data ?? msg) as {
        runId?: string;
        state?: string;
        text?: string;
        sessionKey?: string;
      };

      if (data.sessionKey && data.sessionKey !== `agent:${chatAgent}:main`) { return; }

      if (data.state === "delta" || data.state === "delta-text") {
        chatBufferRef.current += data.text ?? "";
        setChatRunState("streaming");
        setChatRunId(data.runId ?? null);
        return;
      }

      if (data.state === "final") {
        const finalText = data.text ?? chatBufferRef.current;
        setChatMessages((prevMsgs) => [
          ...prevMsgs,
          { id: randomKey("assistant"), role: "assistant", content: finalText, ts: Date.now() },
        ]);
        chatBufferRef.current = "";
        setChatRunId(null);
        setChatRunState("done");
        setTimeout(() => setChatRunState(null), 1200);
        return;
      }

      if (data.state === "error" || data.state === "aborted") {
        const output = chatBufferRef.current || "No output returned";
        setChatMessages((prevMsgs) => [
          ...prevMsgs,
          {
            id: randomKey("assistant"),
            role: "assistant",
            content: `${output}\n\n[${(data.state ?? "error").toUpperCase()}]`,
            ts: Date.now(),
            isError: true,
          },
        ]);
        chatBufferRef.current = "";
        setChatRunId(null);
        setChatRunState(data.state === "aborted" ? "aborted" : "error");
        setTimeout(() => setChatRunState(null), 2200);
      }
    };

    ws.onerror = () => setGatewayStatus("error");

    ws.onclose = () => {
      setGatewayStatus("disconnected");
      wsRef.current = null;
    };
  }, [chatAgent, host, token]);

  useEffect(() => {
    connectGateway();
    return () => {
      wsRef.current?.close();
      pendingRef.current.forEach((item) => clearTimeout(item.timer));
      pendingRef.current.clear();
    };
  }, [connectGateway]);

  useEffect(() => {
    if (screen === "overview") {
      void loadSessions();
      void loadUsageCost();
    }
    if (screen === "sessions") { void loadSessions(); }
    if (screen === "channels") { void loadChannels(); }
    if (screen === "config") { void loadConfig(); }
  }, [screen, loadChannels, loadConfig, loadSessions, loadUsageCost]);

  useEffect(() => {
    if (gatewayStatus !== "connected") { return; }
    const timer = setInterval(() => {
      void loadSessions();
      if (screen === "overview") {
        void loadUsageCost();
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [gatewayStatus, loadSessions, loadUsageCost, screen]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatRunState === "streaming") { return; }

    setChatMessages((prevMsgs) => [
      ...prevMsgs,
      { id: randomKey("user"), role: "user", content: text, ts: Date.now() },
    ]);
    setChatInput("");
    setChatRunState("streaming");

    try {
      await rpc("chat.send", {
        sessionKey: `agent:${chatAgent}:main`,
        message: text,
        idempotencyKey: randomKey("ui"),
      });
    } catch (err) {
      setChatMessages((prevMsgs) => [
        ...prevMsgs,
        {
          id: randomKey("system"),
          role: "system",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          ts: Date.now(),
          isError: true,
        },
      ]);
      setChatRunState("error");
      setTimeout(() => setChatRunState(null), 1500);
    }
  }, [chatAgent, chatInput, chatRunState, rpc]);

  const abortChat = useCallback(async () => {
    if (!chatRunId) { return; }
    try {
      await rpc("chat.abort", { runId: chatRunId, sessionKey: `agent:${chatAgent}:main` });
    } catch {
      // ignore
    }
  }, [chatAgent, chatRunId, rpc]);

  const spawnSubagent = useCallback(async () => {
    const task = subagentTask.trim();
    if (!task || gatewayStatus !== "connected" || subagentBusy) { return; }

    setSubagentBusy(true);
    setSubagentTask("");
    const runId = randomKey("run");
    setSubagentRuns((prev) => [
      { runId, agentId: subagentTargetId, task, status: "started", ts: Date.now() },
      ...prev,
    ]);

    try {
      await rpc("chat.send", {
        sessionKey: "agent:honeybadger:main",
        message: `[DELEGATE -> ${subagentTargetId}] ${task}`,
        idempotencyKey: randomKey("spawn"),
      });
      setSubagentRuns((prev) =>
        prev.map((r) => (r.runId === runId ? { ...r, status: "delegated" } : r)),
      );
    } catch (err) {
      setSubagentRuns((prev) =>
        prev.map((r) =>
          r.runId === runId
            ? { ...r, status: "error", output: err instanceof Error ? err.message : String(err) }
            : r,
        ),
      );
    } finally {
      setSubagentBusy(false);
    }
  }, [gatewayStatus, rpc, subagentBusy, subagentTargetId, subagentTask]);

  const saveConfig = useCallback(async () => {
    try {
      const patch = JSON.parse(configEditText) as unknown;
      await rpc("config.patch", { patch, baseHash: configBaseHash });
      setConfigToast({ type: "success", text: "Config saved successfully" });
      setConfigEditMode(false);
      await loadConfig();
    } catch (err) {
      setConfigToast({ type: "error", text: err instanceof Error ? err.message : String(err) });
    }
  }, [configBaseHash, configEditText, loadConfig, rpc]);

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => {
        if (!sessionsFilter) { return true; }
        return `${s.key ?? ""}${s.agentId ?? ""}${s.label ?? ""}`
          .toLowerCase()
          .includes(sessionsFilter.toLowerCase());
      }),
    [sessions, sessionsFilter],
  );

  const activeSessionEntries = useMemo(() => {
    return sessions.filter((s) => {
      const status = (s.status ?? "").toLowerCase();
      return [
        "active",
        "running",
        "streaming",
        "started",
        "delegated",
        "in_progress",
        "in-progress",
      ].includes(status);
    });
  }, [sessions]);

  const activeSessionCount = activeSessionEntries.length;

  const inProgressSubagentRuns = useMemo(() => {
    return subagentRuns.filter((run) =>
      ["started", "delegated", "active", "aborting"].includes(run.status),
    ).length;
  }, [subagentRuns]);

  const totalTasksInProgress = activeSessionCount + inProgressSubagentRuns;
  const usageTotals = usageCost?.totals;
  const costChart = (usageCost?.daily ?? []).slice(-14);
  const maxDailyCost = costChart.reduce((max, entry) => Math.max(max, entry.totalCost), 0);
  const liveTaskRows = useMemo(() => {
    const sessionRows = activeSessionEntries.map((entry, idx) => ({
      id: `session-${entry.key}-${idx}`,
      source: "session" as const,
      title: entry.key,
      subtitle: entry.lastMessage ?? entry.label ?? "Session active",
      status: entry.status ?? "active",
      ts: Date.now(),
    }));
    const subagentRows = subagentRuns
      .filter((run) => ["started", "delegated", "active", "aborting"].includes(run.status))
      .map((run) => ({
        id: run.runId,
        source: "subagent" as const,
        title: `${AGENTS.find((a) => a.id === run.agentId)?.name ?? run.agentId}`,
        subtitle: run.task,
        status: run.status,
        ts: run.ts,
      }));
    return [...subagentRows, ...sessionRows]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 10);
  }, [activeSessionEntries, subagentRuns]);

  const navigate = (next: Screen, opts?: { agentId?: string; chatAgent?: string }) => {
    setScreen(next);
    if (opts?.agentId) { setSelectedAgent(opts.agentId); }
    if (opts?.chatAgent) {
      setChatAgent(opts.chatAgent);
      setChatMessages([]);
      chatBufferRef.current = "";
      setChatRunState(null);
      setChatRunId(null);
    }
  };

  const renderOverview = () => {
    return (
      <div className="space-y-4 p-4 pt-12 sm:space-y-6 sm:p-7 md:pt-7">
        <header>
          <h1 className="text-2xl font-black text-hb-amber sm:text-3xl">HoneyBadger OS</h1>
          <p className="mt-1 text-xs text-hb-muted sm:text-sm">
            {AGENTS.length} agents configured, maxConcurrent 4, maxSpawnDepth 3
          </p>
        </header>

        <section className={cardClass("p-4")}>
          <div className="flex items-center gap-3">
            <StatusDot status={gatewayStatus} />
            <div>
              <p className="font-semibold">Gateway {gatewayStatus}</p>
              <p className="text-xs text-hb-muted">
                {gatewayInfo
                  ? `v${gatewayInfo.version ?? "?"} · connId ${gatewayInfo.connId ?? "?"}`
                  : "No handshake metadata yet"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Total Agents", value: AGENTS.length, color: "text-hb-amber" },
            {
              label: "Tasks In Progress",
              value: totalTasksInProgress,
              color: "text-hb-green",
            },
            {
              label: "Active Sessions",
              value: activeSessionCount,
              color: "text-hb-blue",
            },
            {
              label: "Cost (30d)",
              value: usageTotals ? formatUsd(usageTotals.totalCost) : "—",
              color: "text-hb-amber",
            },
            {
              label: "Tokens (30d)",
              value: usageTotals ? formatCompactInt(usageTotals.totalTokens) : "—",
              color: "text-hb-purple",
            },
            {
              label: "Unique Skills",
              value: Object.keys(SKILL_META).length,
              color: "text-hb-green",
            },
          ].map((item) => (
            <div key={item.label} className={cardClass("p-3 sm:p-4")}>
              <p className={`text-2xl font-black sm:text-3xl ${item.color}`}>{item.value}</p>
              <p className="text-[11px] text-hb-muted sm:text-xs">{item.label}</p>
            </div>
          ))}
        </section>

        <section className={cardClass("p-4 sm:p-6")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold sm:text-lg">System Stats & Live Usage</h2>
            <button
              className="rounded-lg border border-hb-border bg-hb-panel2 px-3 py-1 text-xs"
              onClick={() => {
                void loadSessions();
                void loadUsageCost();
              }}
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs text-hb-muted">Active Sessions</p>
              <p className="text-xl font-bold text-hb-green">{activeSessionCount}</p>
            </div>
            <div>
              <p className="text-xs text-hb-muted">Subagents In Progress</p>
              <p className="text-xl font-bold text-hb-blue">{inProgressSubagentRuns}</p>
            </div>
            <div>
              <p className="text-xs text-hb-muted">Input / Output Cost</p>
              <p className="text-xl font-bold text-hb-red">
                {usageTotals
                  ? `${formatUsd(usageTotals.inputCost)} / ${formatUsd(usageTotals.outputCost)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-hb-muted">Missing Cost Entries</p>
              <p className="text-xl font-bold text-hb-amber">
                {usageTotals ? usageTotals.missingCostEntries : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-hb-muted">
            {metricsUpdatedAt
              ? `Last metrics refresh: ${new Date(metricsUpdatedAt).toLocaleTimeString()}`
              : "No metrics refresh yet"}
          </p>

          {gatewayStatus !== "connected" && (
            <div className="mt-4 rounded-lg border border-hb-border bg-hb-bg p-3 text-xs text-hb-muted">
              Connect gateway to load live tasks and cost data.
            </div>
          )}

          {usageCostLoading && (
            <div className="mt-4 rounded-lg border border-hb-border bg-hb-bg p-3 text-xs text-hb-muted">
              Loading usage cost data...
            </div>
          )}

          {usageCostError && (
            <div className="mt-4 rounded-lg border border-hb-red/30 bg-hb-red/10 p-3 text-xs text-hb-red">
              Cost metrics unavailable: {usageCostError}
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-hb-muted">Daily Cost (Last 14)</p>
            {costChart.length === 0 ? (
              <div className="rounded-lg border border-hb-border bg-hb-bg p-3 text-xs text-hb-muted">
                No usage cost history returned yet.
              </div>
            ) : (
              <div className="flex h-24 items-end gap-1 sm:h-32">
                {costChart.map((entry) => {
                  const pct = maxDailyCost > 0 ? Math.max((entry.totalCost / maxDailyCost) * 100, 4) : 4;
                  return (
                    <div key={entry.date} className="group relative w-full">
                      <div
                        className="w-full rounded-t-sm bg-hb-amber/25 transition-all hover:bg-hb-amber/45"
                        style={{ height: `${pct}%` }}
                        title={`${entry.date}: ${formatUsd(entry.totalCost)}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          <div className={cardClass("p-4 sm:p-6")}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold sm:text-base">Live Task Feed</h3>
              <span className="rounded-full border border-hb-green/35 bg-hb-green/10 px-2 py-0.5 text-[11px] text-hb-green">
                {liveTaskRows.length} active
              </span>
            </div>
            {liveTaskRows.length === 0 ? (
              <div className="rounded-lg border border-hb-border bg-hb-bg p-3 text-xs text-hb-muted">
                No in-progress sessions or subagent runs detected.
              </div>
            ) : (
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {liveTaskRows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-hb-border bg-hb-bg p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold sm:text-sm">{row.title}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusBadgeClass(
                          row.status,
                        )}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-hb-muted sm:text-xs">{row.subtitle}</p>
                    <p className="mt-1 text-[10px] text-hb-muted">
                      {row.source === "subagent" ? "subagent" : "session"} ·{" "}
                      {new Date(row.ts).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={cardClass("p-4 sm:p-6")}>
            <h3 className="mb-3 text-sm font-bold sm:text-base">Cost Breakdown (30d)</h3>
            {!usageTotals ? (
              <div className="rounded-lg border border-hb-border bg-hb-bg p-3 text-xs text-hb-muted">
                Cost breakdown unavailable until usage data is loaded.
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Input", value: usageTotals.inputCost, color: "bg-hb-blue/45" },
                  { label: "Output", value: usageTotals.outputCost, color: "bg-hb-green/45" },
                  { label: "Cache Read", value: usageTotals.cacheReadCost, color: "bg-hb-purple/45" },
                  { label: "Cache Write", value: usageTotals.cacheWriteCost, color: "bg-hb-amber/45" },
                ].map((row) => {
                  const ratio = usageTotals.totalCost > 0 ? (row.value / usageTotals.totalCost) * 100 : 0;
                  return (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-hb-muted">{row.label}</span>
                        <span className="font-semibold text-hb-text">{formatUsd(row.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-hb-bg">
                        <div className={`h-full ${row.color}`} style={{ width: `${Math.max(ratio, 0)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-hb-border bg-hb-bg p-3 text-xs">
                  <div>
                    <p className="text-hb-muted">Total Cost</p>
                    <p className="font-semibold text-hb-text">{formatUsd(usageTotals.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-hb-muted">Billable Tokens</p>
                    <p className="font-semibold text-hb-text">{formatCompactInt(usageTotals.totalTokens)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className={cardClass("p-3 transition hover:-translate-y-0.5 sm:p-4")}
            >
              <div className="mb-2 flex items-start gap-2 sm:mb-3 sm:gap-3">
                <AgentAvatar agent={agent} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold sm:text-base">
                    {agent.name}{" "}
                    {agent.isDefault && (
                      <span className="ml-1 rounded-full bg-hb-amber/20 px-1.5 py-0.5 text-[9px] text-hb-amber sm:ml-2 sm:px-2 sm:text-[10px]">
                        DEFAULT
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-hb-muted sm:text-sm">{agent.role}</p>
                </div>
                <button
                  onClick={() => navigate("chat", { chatAgent: agent.id })}
                  className="rounded-lg border border-hb-border bg-hb-panel2 px-2 py-1 text-[11px] text-hb-text sm:px-3 sm:text-xs"
                >
                  Chat
                </button>
              </div>
              <div className="mb-2">
                <ModelTag model={agent.model} />
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {agent.skills.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-[11px]"
                    style={{
                      borderColor: `${SKILL_META[s]?.color ?? "#64748b"}66`,
                      color: SKILL_META[s]?.color ?? "#64748b",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    );
  };

  const renderAgents = () => {
    const list = AGENTS;
    return (
      <div className="space-y-4 p-4 pt-12 sm:p-7 md:pt-7">
        <h2 className="text-2xl font-bold">Agent Directory</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((agent) => (
            <button
              key={agent.id}
              onClick={() => navigate("agent-detail", { agentId: agent.id })}
              className={`${cardClass("p-4 text-left transition hover:border-hb-amber/70")} border-l-4`}
              style={{ borderLeftColor: agent.color }}
            >
              <div className="mb-3 flex items-start gap-3">
                <AgentAvatar agent={agent} size={48} />
                <div>
                  <p className="font-bold">{agent.name}</p>
                  <p className="text-xs text-hb-muted">{agent.id}</p>
                  <p className="mt-1 text-sm text-hb-muted">{agent.role}</p>
                </div>
              </div>
              <div className="mb-2 flex gap-2">
                <ModelTag model={agent.model} />
                {agent.fallbacks.length > 0 && (
                  <span className="text-xs text-hb-muted">+{agent.fallbacks.length} fallback</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {agent.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-hb-border px-2 py-0.5 text-[11px] text-hb-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderAgentDetail = () => {
    const agent = AGENTS.find((a) => a.id === selectedAgent);
    if (!agent) { return <div className="p-7">Agent not found.</div>; }

    return (
      <div className="space-y-4 p-4 pt-12 sm:p-7 md:pt-7">
        <button className="text-sm text-hb-muted" onClick={() => navigate("agents")}>
          Back to directory
        </button>
        <div className={`${cardClass("p-6")} border-l-4`} style={{ borderLeftColor: agent.color }}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AgentAvatar agent={agent} size={70} />
              <div>
                <h2 className="text-2xl font-bold">{agent.name}</h2>
                <p className="text-sm text-hb-muted">{agent.id}</p>
                <p className="text-sm text-hb-muted">{agent.role}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("chat", { chatAgent: agent.id })}
              className="rounded-lg px-4 py-2 font-bold text-black"
              style={{ background: agent.color }}
            >
              Open Chat
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={cardClass("p-4")}>
              <p className="mb-2 text-xs uppercase tracking-wide text-hb-muted">Model</p>
              <ModelTag model={agent.model} />
              {!!agent.fallbacks.length && (
                <div className="mt-2 space-y-1 text-sm text-hb-muted">
                  {agent.fallbacks.map((f) => (
                    <p key={f}>{f}</p>
                  ))}
                </div>
              )}
            </div>
            <div className={cardClass("p-4")}>
              <p className="mb-2 text-xs uppercase tracking-wide text-hb-muted">Session</p>
              <code className="rounded bg-hb-bg px-2 py-1 text-xs text-hb-blue">
                agent:{agent.id}:main
              </code>
              {agent.maxConcurrent && (
                <p className="mt-2 text-sm text-hb-muted">maxConcurrent {agent.maxConcurrent}</p>
              )}
              {agent.maxSpawnDepth != null && (
                <p className="text-sm text-hb-muted">maxSpawnDepth {agent.maxSpawnDepth}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderChat = () => {
    const stream = chatBufferRef.current;

    return (
      <div className="flex h-full flex-col pt-12 md:pt-0">
        <div className="flex items-center gap-3 border-b border-[#1e1e2d] p-4">
          <h2 className="flex-1 text-lg font-bold">Chat Console</h2>
          <select
            className="rounded-lg border border-hb-border bg-hb-panel px-3 py-2 text-sm"
            value={chatAgent}
            onChange={(e) => {
              setChatAgent(e.target.value);
              setChatMessages([]);
              chatBufferRef.current = "";
              setChatRunState(null);
              setChatRunId(null);
            }}
          >
            {AGENTS.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.emoji} {agent.name}
              </option>
            ))}
          </select>
          <code className="rounded bg-hb-panel px-2 py-1 text-xs text-hb-muted">
            agent:{chatAgent}:main
          </code>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {chatMessages.length === 0 && !stream && (
            <div className="grid h-full place-items-center">
              <div className="text-center">
                <p className="text-4xl">{currentChatAgent.emoji}</p>
                <p className="text-lg font-bold">{currentChatAgent.name}</p>
                <p className="text-sm text-hb-muted">{currentChatAgent.role}</p>
              </div>
            </div>
          )}

          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[75%] rounded-xl border px-4 py-3 text-sm leading-6"
                style={{
                  background:
                    msg.role === "user"
                      ? "rgba(245,158,11,0.12)"
                      : msg.isError
                        ? "rgba(239,68,68,0.12)"
                        : "#1c1c28",
                  borderColor:
                    msg.role === "user"
                      ? "rgba(245,158,11,0.35)"
                      : msg.isError
                        ? "rgba(239,68,68,0.35)"
                        : "#2a2a3d",
                }}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className="mt-1 text-xs text-hb-muted">
                  {new Date(msg.ts).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {!!stream && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-xl border border-hb-border bg-hb-panel px-4 py-3 text-sm leading-6">
                <p className="whitespace-pre-wrap">{stream}</p>
                <p className="mt-1 text-xs text-hb-amber">streaming...</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#1e1e2d] p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-hb-muted">
              {chatRunState ? `Run: ${chatRunState}` : "Idle"} {chatRunId ? `(${chatRunId})` : ""}
            </span>
            {chatRunState === "streaming" && (
              <button
                className="rounded border border-hb-red/40 px-2 py-1 text-hb-red"
                onClick={abortChat}
              >
                Abort
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              rows={3}
              className="w-full rounded-xl border border-hb-border bg-hb-panel px-3 py-2 text-sm"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendChat();
                }
              }}
              placeholder={`Message ${currentChatAgent.name}...`}
            />
            <button
              onClick={() => void sendChat()}
              disabled={!chatInput.trim() || chatRunState === "streaming"}
              className="h-fit rounded-xl bg-hb-amber px-4 py-2 font-bold text-black disabled:cursor-not-allowed disabled:bg-hb-border disabled:text-hb-muted"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSessions = () => {
    return (
      <div className="space-y-4 p-4 pt-12 sm:p-7 md:pt-7">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-2xl font-bold">Session Explorer</h2>
          <input
            className="rounded-lg border border-hb-border bg-hb-panel px-3 py-2 text-sm"
            placeholder="Filter"
            value={sessionsFilter}
            onChange={(e) => setSessionsFilter(e.target.value)}
          />
          <button
            className="rounded-lg border border-hb-border bg-hb-panel px-3 py-2 text-sm"
            onClick={() => void loadSessions()}
          >
            Reload
          </button>
        </div>

        {sessionsError && (
          <div className="rounded-lg border border-hb-red/30 bg-hb-red/10 p-3 text-sm text-hb-red">
            {sessionsError}
          </div>
        )}

        {sessionsLoading ? (
          <div className="rounded-xl border border-hb-border bg-hb-panel p-6 text-sm text-hb-muted">
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-hb-border bg-hb-panel p-6 text-sm text-hb-muted">
            No sessions found.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((session) => {
              const agent = AGENTS.find(
                (a) => a.id === (session.agentId ?? session.key.split(":")[1]),
              );
              return (
                <div key={session.key} className={cardClass("p-4")}>
                  <div className="flex items-center gap-3">
                    {agent && <AgentAvatar agent={agent} size={36} />}
                    <div className="min-w-0 flex-1">
                      <code className="text-xs text-hb-amber">{session.key}</code>
                      <p className="truncate text-xs text-hb-muted">
                        {session.lastMessage ?? session.label ?? "No recent messages"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-hb-muted">
                      <StatusDot
                        status={
                          (session.status === "active" ? "active" : "idle") as "active" | "idle"
                        }
                      />
                      {session.status ?? "idle"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSubagents = () => {
    const honeybadger = AGENTS.find((a) => a.id === "honeybadger");
    const allowed = honeybadger?.allowAgents ?? [];

    return (
      <div className="space-y-4 p-4 pt-12 sm:p-7 md:pt-7">
        <h2 className="text-2xl font-bold">Subagent Monitor</h2>
        <div className={cardClass("p-4")}>
          <p className="mb-2 text-xs uppercase tracking-wide text-hb-muted">Spawn New Task</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {allowed.map((agentId) => {
              const agent = AGENTS.find((a) => a.id === agentId);
              const active = agentId === subagentTargetId;
              return (
                <button
                  key={agentId}
                  onClick={() => setSubagentTargetId(agentId)}
                  className="rounded-lg border px-3 py-1 text-xs"
                  style={{
                    borderColor: active ? (agent?.color ?? "#64748b") : "#2a2a3d",
                    color: active ? (agent?.color ?? "#64748b") : "#94a3b8",
                    background: active ? `${agent?.color ?? "#64748b"}20` : "#13131c",
                  }}
                >
                  {agent?.emoji} {agent?.name ?? agentId}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border border-hb-border bg-hb-panel2 px-3 py-2 text-sm"
              value={subagentTask}
              onChange={(e) => setSubagentTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void spawnSubagent();
                }
              }}
              placeholder={`Task for ${subagentTargetId}`}
            />
            <button
              disabled={subagentBusy || !subagentTask.trim()}
              onClick={() => void spawnSubagent()}
              className="rounded-lg bg-hb-amber px-4 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:bg-hb-border disabled:text-hb-muted"
            >
              Spawn
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {subagentRuns.length === 0 ? (
            <div className={cardClass("p-4 text-sm text-hb-muted")}>No subagent runs yet.</div>
          ) : (
            subagentRuns.map((run) => {
              const agent = AGENTS.find((a) => a.id === run.agentId);
              return (
                <div key={run.runId} className={cardClass("p-4")}>
                  <div className="flex items-start gap-3">
                    {agent && <AgentAvatar agent={agent} size={36} />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{agent?.name ?? run.agentId}</p>
                      <p className="truncate text-sm text-hb-muted">{run.task}</p>
                      <p className="text-xs text-hb-muted">{run.status}</p>
                      {!!run.output && <p className="mt-1 text-xs text-hb-red">{run.output}</p>}
                    </div>
                    <code className="text-[11px] text-hb-muted">
                      {new Date(run.ts).toLocaleTimeString()}
                    </code>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    return (
      <div className="space-y-4 p-4 pt-12 sm:p-7 md:pt-7">
        <h2 className="text-2xl font-bold">Skills Status</h2>
        <div className={cardClass("overflow-x-auto p-4")}>
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-hb-border text-xs uppercase tracking-wide text-hb-muted">
                <th className="py-2 pr-4">Agent</th>
                {Object.keys(SKILL_META).map((skill) => (
                  <th
                    key={skill}
                    className="px-2 py-2 text-center"
                    style={{ color: SKILL_META[skill].color }}
                  >
                    {skill}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map((agent) => (
                <tr key={agent.id} className="border-b border-hb-border/40">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <AgentAvatar agent={agent} size={28} />
                      <span>{agent.name}</span>
                    </div>
                  </td>
                  {Object.keys(SKILL_META).map((skill) => (
                    <td key={skill} className="px-2 py-3 text-center">
                      {agent.skills.includes(skill) ? (
                        <span style={{ color: SKILL_META[skill].color }}>✓</span>
                      ) : (
                        <span className="text-hb-muted">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChannels = () => {
    return (
      <div className="space-y-4 p-4 pt-12 sm:p-7 md:pt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Channels Health</h2>
          <button
            className="rounded-lg border border-hb-border bg-hb-panel px-3 py-2 text-sm"
            onClick={() => void loadChannels()}
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {CHANNELS.map((channel) => {
            const live = Boolean(
              channelsHealth?.[channel.id] ??
              (channelsHealth as { channels?: Record<string, unknown> } | null)?.channels?.[
              channel.id
              ],
            );
            return (
              <div
                key={channel.id}
                className={`${cardClass("p-4")} border-l-4`}
                style={{ borderLeftColor: live ? channel.color : "#2a2a3d" }}
              >
                <div className="mb-2 flex items-center gap-3">
                  <div
                    className="grid size-10 place-items-center rounded-lg"
                    style={{ background: `${channel.color}22` }}
                  >
                    {channel.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{channel.name}</p>
                    <p className="text-xs text-hb-muted">{channel.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <StatusDot status={live ? "connected" : "disconnected"} />
                    <span className={live ? "text-hb-green" : "text-hb-muted"}>
                      {live ? "active" : "no data"}
                    </span>
                  </div>
                </div>

                {channel.policy && (
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-hb-bg p-2 text-xs">
                    <p className="text-hb-muted">
                      DM: <span className="text-hb-amber">{channel.policy.dm}</span>
                    </p>
                    <p className="text-hb-muted">
                      Group: <span className="text-hb-amber">{channel.policy.group}</span>
                    </p>
                    <p className="text-hb-muted">
                      Mention: <span className="text-hb-green">{channel.policy.mention}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {channelsHealth && (
          <pre className="max-h-64 overflow-auto rounded-xl border border-hb-border bg-hb-bg p-4 text-xs text-hb-cyan">
            {JSON.stringify(channelsHealth, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  const renderConfig = () => {
    return (
      <div className="flex h-full flex-col pt-12 md:pt-0">
        <div className="flex items-center gap-2 border-b border-[#1e1e2d] p-4">
          <h2 className="flex-1 text-lg font-bold">Config Editor</h2>
          {configBaseHash && (
            <code className="text-xs text-hb-muted">{configBaseHash.slice(0, 12)}...</code>
          )}
          <button
            className="rounded-lg border border-hb-border bg-hb-panel px-3 py-1 text-sm"
            onClick={() => void loadConfig()}
          >
            Reload
          </button>
          {!configEditMode ? (
            <button
              className="rounded-lg border border-hb-blue/30 bg-hb-blue/10 px-3 py-1 text-sm text-hb-blue"
              onClick={() => setConfigEditMode(true)}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                className="rounded-lg border border-hb-border bg-hb-panel px-3 py-1 text-sm"
                onClick={() => {
                  setConfigEditMode(false);
                  setConfigEditText(JSON.stringify(configData, null, 2));
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-hb-green px-3 py-1 text-sm font-semibold text-black"
                onClick={() => void saveConfig()}
              >
                Save
              </button>
            </>
          )}
        </div>

        {configToast && (
          <div
            className={`m-4 rounded-lg border p-3 text-sm ${configToast.type === "error" ? "border-hb-red/40 bg-hb-red/10 text-hb-red" : "border-hb-green/40 bg-hb-green/10 text-hb-green"}`}
          >
            {configToast.text}
          </div>
        )}

        <div className="min-h-0 flex-1 p-4">
          {configLoading ? (
            <div className={cardClass("p-4 text-sm text-hb-muted")}>Loading config...</div>
          ) : configEditMode ? (
            <textarea
              className="h-full w-full resize-none rounded-xl border border-hb-amber/40 bg-hb-bg p-4 font-mono text-xs"
              value={configEditText}
              onChange={(e) => setConfigEditText(e.target.value)}
            />
          ) : (
            <pre className="h-full overflow-auto rounded-xl border border-hb-border bg-hb-bg p-4 text-xs">
              {JSON.stringify(configData, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  const main = (() => {
    switch (screen) {
      case "overview":
        return renderOverview();
      case "agents":
        return renderAgents();
      case "agent-detail":
        return renderAgentDetail();
      case "chat":
        return renderChat();
      case "sessions":
        return renderSessions();
      case "subagents":
        return renderSubagents();
      case "skills":
        return renderSkills();
      case "channels":
        return renderChannels();
      case "config":
        return renderConfig();
      default:
        return renderOverview();
    }
  })();

  return (
    <div className="flex h-screen overflow-hidden bg-hb-bg text-hb-text">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-3 top-3 z-50 rounded-lg border border-hb-border bg-hb-panel2 p-2 text-hb-amber shadow-lg md:hidden"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect y="3" width="20" height="2" rx="1" />
          <rect y="9" width="20" height="2" rx="1" />
          <rect y="15" width="20" height="2" rx="1" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`relative z-50 flex shrink-0 flex-col border-r border-[#1e1e2d] bg-hb-panel2 transition-all ${sidebarCollapsed ? "w-16" : "w-52"
          } ${mobileMenuOpen ? "fixed inset-y-0 left-0" : "hidden md:flex"}`}
      >
        <div className="border-b border-[#1e1e2d] px-4 py-5">
          <div className="mb-2 flex items-center justify-between">
            {!sidebarCollapsed ? (
              <p className="text-lg font-black text-hb-amber">HoneyBadger</p>
            ) : (
              <p className="text-lg">🦡</p>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md border border-hb-border bg-hb-panel px-2 py-1 text-xs text-hb-muted md:hidden"
                aria-label="Close menu"
              >
                ✕
              </button>
              <button
                onClick={() => {
                  setSidebarCollapsed((v) => !v);
                  setShowSettings(false);
                }}
                className="hidden rounded-md border border-hb-border bg-hb-panel px-2 py-1 text-xs text-hb-muted md:block"
                aria-label={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
                title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
              >
                {sidebarCollapsed ? "»" : "«"}
              </button>
            </div>
          </div>
          {!sidebarCollapsed && (
            <p className="text-[11px] tracking-[0.2em] text-hb-muted">OS DASHBOARD</p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const active =
              screen === item.id || (item.id === "agents" && screen === "agent-detail");
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${active
                    ? "bg-hb-amber/15 font-semibold text-hb-amber"
                    : "text-hb-muted hover:bg-white/5"
                  }`}
                title={item.label}
              >
                <span className={sidebarCollapsed ? "mx-auto" : ""}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#1e1e2d] p-3">
          <div
            className={`mb-2 flex items-center text-xs text-hb-muted ${sidebarCollapsed ? "justify-center" : "gap-2"}`}
          >
            <StatusDot status={gatewayStatus} />
            {!sidebarCollapsed && <span>{gatewayStatus}</span>}
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`w-full rounded-lg border border-hb-border bg-hb-panel px-3 py-1 text-xs text-hb-muted ${sidebarCollapsed ? "text-center" : "text-left"
              }`}
            title="Gateway Settings"
          >
            {sidebarCollapsed ? "⚙" : "Gateway Settings"}
          </button>
        </div>

        {showSettings && (
          <div
            className={`absolute bottom-16 z-10 rounded-xl border border-hb-border bg-hb-panel p-3 shadow-xl ${sidebarCollapsed ? "left-14 w-72" : "inset-x-2"}`}
          >
            <p className="mb-2 text-xs uppercase tracking-wide text-hb-muted">Gateway Settings</p>
            <label className="mb-1 block text-[11px] text-hb-muted">Host</label>
            <input
              className="mb-2 w-full rounded-md border border-hb-border bg-hb-panel2 px-2 py-1 text-xs"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="localhost:18789"
            />
            <label className="mb-1 block text-[11px] text-hb-muted">Token</label>
            <input
              className="mb-3 w-full rounded-md border border-hb-border bg-hb-panel2 px-2 py-1 text-xs"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="OPENCLAW_GATEWAY_TOKEN"
            />
            <button
              className="w-full rounded-md bg-hb-amber px-3 py-1 text-xs font-semibold text-black"
              onClick={() => {
                setShowSettings(false);
                connectGateway();
              }}
            >
              Connect
            </button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{main}</main>
    </div>
  );
}
