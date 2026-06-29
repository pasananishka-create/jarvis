import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { DirectConfig, ModelOption } from "../lib/directAi";
import { fetchLiveModels, getCuratedModels } from "../lib/directAi";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Cfg {
  activeProvider: DirectConfig["activeProvider"];
  activeModel: string;
  openaiKey: string;
  anthropicKey: string;
  nvidiaKey: string;
  ollamaUrl: string;
}

const PROVIDERS: { id: Cfg["activeProvider"]; label: string; note?: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "nvidia", label: "NVIDIA", note: "APK only" },
  { id: "ollama", label: "Ollama" },
];

function loadCfg(): Cfg {
  try {
    const raw = localStorage.getItem("jarvis_direct_config");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    activeProvider: "openai",
    activeModel: "gpt-4o",
    openaiKey: "",
    anthropicKey: "",
    nvidiaKey: "",
    ollamaUrl: "",
  };
}

function saveCfg(c: Cfg) {
  try {
    localStorage.setItem("jarvis_direct_config", JSON.stringify(c));
  } catch (e) {
    console.warn("Failed to save config", e);
  }
}

export default function SettingsDialog({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<Cfg>(loadCfg);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCfg(loadCfg());
      setModels(getCuratedModels(loadCfg().activeProvider));
      setFetchError(null);
    }
  }, [open]);

  const update = (patch: Partial<Cfg>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveCfg(next);
  };

  const changeProvider = (id: Cfg["activeProvider"]) => {
    const defaults: Record<string, string> = {
      nvidia: "meta/llama-3.1-8b-instruct",
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
      ollama: "llama3.1",
    };
    const next = { ...cfg, activeProvider: id, activeModel: defaults[id] };
    setCfg(next);
    saveCfg(next);
    setModels(getCuratedModels(id));
    setFetchError(null);
  };

  const hasKey = () => {
    if (cfg.activeProvider === "ollama") return !!cfg.ollamaUrl;
    if (cfg.activeProvider === "nvidia") return !!cfg.nvidiaKey;
    if (cfg.activeProvider === "openai") return !!cfg.openaiKey;
    if (cfg.activeProvider === "anthropic") return !!cfg.anthropicKey;
    return false;
  };

  const refresh = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const live = await fetchLiveModels(cfg.activeProvider);
      setModels(live);
      if (live.length > 0 && !live.find((m: ModelOption) => m.id === cfg.activeModel)) {
        update({ activeModel: live[0].id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(msg);
      setModels(getCuratedModels(cfg.activeProvider));
    } finally {
      setFetching(false);
    }
  }, [cfg.activeProvider]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.25em", color: "rgba(255,255,255,0.6)" }}>
          SETTINGS
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            padding: 8,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
          Add API keys to use AI providers directly. Keys stay on this device only.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={(e) => { e.stopPropagation(); changeProvider(p.id); }}
              style={{
                flexShrink: 0,
                padding: "10px 16px",
                fontSize: 12,
                fontFamily: "monospace",
                letterSpacing: "0.1em",
                border: cfg.activeProvider === p.id ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
                background: cfg.activeProvider === p.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
                color: cfg.activeProvider === p.id ? "#fff" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                minHeight: 40,
              }}
            >
              {p.label}
              {p.note && <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>({p.note})</span>}
            </button>
          ))}
        </div>

        {cfg.activeProvider === "nvidia" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>NVIDIA API Key</label>
            <input
              value={cfg.nvidiaKey || ""}
              onChange={(e) => { update({ nvidiaKey: e.target.value }); setFetchError(null); }}
              type="password"
              placeholder="nvapi-..."
              style={{
                width: "100%",
                background: "#222",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 15,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.9)",
                outline: "none",
                minHeight: 48,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
        {cfg.activeProvider === "openai" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>OpenAI API Key</label>
            <input
              value={cfg.openaiKey || ""}
              onChange={(e) => { update({ openaiKey: e.target.value }); setFetchError(null); }}
              type="password"
              placeholder="sk-..."
              style={{
                width: "100%",
                background: "#222",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 15,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.9)",
                outline: "none",
                minHeight: 48,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
        {cfg.activeProvider === "anthropic" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>Anthropic API Key</label>
            <input
              value={cfg.anthropicKey || ""}
              onChange={(e) => { update({ anthropicKey: e.target.value }); setFetchError(null); }}
              type="password"
              placeholder="sk-ant-..."
              style={{
                width: "100%",
                background: "#222",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 15,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.9)",
                outline: "none",
                minHeight: 48,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
        {cfg.activeProvider === "ollama" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)", display: "block", marginBottom: 8 }}>Ollama URL</label>
            <input
              value={cfg.ollamaUrl || ""}
              onChange={(e) => { update({ ollamaUrl: e.target.value }); setFetchError(null); }}
              placeholder="http://192.168.1.100:11434"
              style={{
                width: "100%",
                background: "#222",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "12px 16px",
                fontSize: 15,
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.9)",
                outline: "none",
                minHeight: 48,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.6)" }}>MODELS</span>
            <button
              onClick={(e) => { e.stopPropagation(); refresh(); }}
              disabled={!hasKey() || fetching}
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                letterSpacing: "0.12em",
                padding: "8px 12px",
                border: hasKey() && !fetching ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                background: "none",
                color: hasKey() && !fetching ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                cursor: hasKey() && !fetching ? "pointer" : "default",
                minHeight: 36,
              }}
            >
              {fetching ? "REFRESHING..." : "REFRESH"}
            </button>
          </div>

          {fetchError && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>{fetchError}</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {models.map((m) => (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); update({ activeModel: m.id }); }}
                style={{
                  padding: "8px 12px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                  border: cfg.activeModel === m.id ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  background: cfg.activeModel === m.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.05)",
                  color: cfg.activeModel === m.id ? "#fff" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  minHeight: 36,
                }}
              >
                {m.name}
              </button>
            ))}
            {models.length === 0 && (
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>No models available</span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
