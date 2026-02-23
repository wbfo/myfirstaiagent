#!/bin/bash

# OpenClaw 97% Cost-Cut Stack Verification Script

echo "Checking OpenClaw Cost-Cut Stack Implementation..."

# 1. Check if costOptStack is enabled in config
CONFIG_FILE="/Users/wbfoclaw/.openclaw/openclaw.json"
if grep -q "\"costOptStack\": true" "$CONFIG_FILE"; then
    echo "✅ costOptStack is enabled in $CONFIG_FILE"
else
    echo "❌ costOptStack is NOT enabled in $CONFIG_FILE"
fi

# 2. Check Exa MCP configuration
if grep -q "mcp-server" "$CONFIG_FILE" && grep -q "exa" "$CONFIG_FILE"; then
    echo "✅ Exa MCP server is configured"
else
    echo "❌ Exa MCP server is missing in $CONFIG_FILE"
fi

# 3. Verify Heartbeat Fallback
HEARTBEAT_RUNNER="src/infra/heartbeat-runner.ts"
if grep -q "ollama/gemma3:4b" "openclaw_app/$HEARTBEAT_RUNNER"; then
    echo "✅ Heartbeat fallback to gemma3:4b found in $HEARTBEAT_RUNNER"
else
    echo "❌ Heartbeat fallback missing in $HEARTBEAT_RUNNER"
fi

# 4. Verify History Truncation
HISTORY_TS="src/agents/pi-embedded-runner/history.ts"
if grep -q "export function limitHistoryBySize" "openclaw_app/$HISTORY_TS"; then
    echo "✅ limitHistoryBySize utility found in $HISTORY_TS"
else
    echo "❌ limitHistoryBySize utility missing in $HISTORY_TS"
fi

# 5. Verify QMD Search Optimization
QMD_MANAGER="src/memory/qmd-manager.ts"
if grep -q "budget = 6000" "openclaw_app/$QMD_MANAGER"; then
    echo "✅ QMD search character budget optimization found in $QMD_MANAGER"
else
    echo "❌ QMD search optimization missing in $QMD_MANAGER"
fi

# 6. Verify Auto-Routing
MODEL_SELECTION="src/agents/model-selection.ts"
if grep -q "qwen2.5:14b" "openclaw_app/$MODEL_SELECTION"; then
    echo "✅ Auto-routing to local 14b model found in $MODEL_SELECTION"
else
    echo "❌ Auto-routing logic missing in $MODEL_SELECTION"
fi

echo "Verification complete."
