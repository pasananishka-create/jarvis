import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { getConfig, saveConfig, fetchLiveModels, getCuratedModels, type DirectConfig, type ModelOption } from "../lib/directAi";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: DirectConfig["activeProvider"]; label: string; note?: string }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "nvidia", label: "NVIDIA", note: "APK" },
  { id: "ollama", label: "Ollama" },
];

const containerStyle: Record<string, string> = {
  position: "fixed",
  inset: "0px",
  zIndex: "10000",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "#000000",
  pointerEvents: "auto",
};

export default function SettingsDialog({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<DirectConfig>(getConfig);
  const [fetchedModels, setFetchedModels] = useState<ModelOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const c = getConfig();
      setCfg(c);
      setFetchedModels(getCuratedModels(c.activeProvider));
      setFetchError(null);
    }
  }, [open]);

  const update = (patch: Partial<DirectConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    if (!saveConfig(next)) {
      console.warn("Settings: failed to save config to localStorage");
    }
  };

  const changeProvider = (id: DirectConfig["activeProvider"]) => {
    const cur = getConfig();
    const defaults: Record<string, string> = {
      nvidia: "meta/llama-3.1-8b-instruct",
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
      ollama: "llama3.1",
    };
    const next = { ...cur, activeProvider: id, activeModel: defaults[id] };
    setCfg(next);
    saveConfig(next);
    setFetchedModels(getCuratedModels(id));
    setFetchError(null);
  };

  const hasKeyForProvider = (p: DirectConfig["activeProvider"]) => {
    if (p === "ollama") return !!cfg.ollamaUrl;
    if (p === "nvidia") return !!cfg.nvidiaKey;
    if (p === "openai") return !!cfg.openaiKey;
    if (p === "anthropic") return !!cfg.anthropicKey;
    return false;
  };

  const handleRefreshModels = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const models = await fetchLiveModels(cfg.activeProvider);
      setFetchedModels(models);
      if (models.length > 0 && !models.find((m) => m.id === cfg.activeModel)) {
        update({ activeModel: models[0].id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(msg);
      setFetchedModels(getCuratedModels(cfg.activeProvider));
    } finally {
      setFetching(false);
    }
  }, [cfg.activeProvider]);

  const selectModel = (id: string) => {
    update({ activeModel: id });
  };

  const canRefresh = hasKeyForProvider(cfg.activeProvider);

  const keyField = (label: string, value: string | undefined, field: keyof DirectConfig) => (
    <div className="mb-5">
      <label className="text-[12px] font-mono tracking-[0.15em] text-white/60 block mb-2">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => {
          update({ [field]: e.target.value } as any);
          setFetchError(null);
        }}
        type="password"
        placeholder="sk-..."
        className="w-full bg-[#222] border border-white/20 rounded-lg px-4 py-3 text-[15px] font-mono text-white/90 placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors min-h-[48px]"
      />
    </div>
  );

  const content = useMemo(() => {
    if (!open) return null;
    return (
      <div style={containerStyle}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10">
          <span className="text-[12px] font-mono tracking-[0.25em] text-white/60">SETTINGS</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white/50 hover:text-white/80 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-8">
          <p className="text-[13px] font-sans text-white/50 mb-5 leading-relaxed">
            Add API keys to use AI providers directly. Keys stay on this device only.
          </p>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); changeProvider(p.id); }}
                className={`shrink-0 px-4 py-2.5 text-[12px] font-mono tracking-[0.1em] border transition-all min-h-[40px] ${
                  cfg.activeProvider === p.id
                    ? "bg-white/20 border-white/40 text-white"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {p.label}
                {p.note && <span className="ml-1.5 text-[10px] text-white/30">({p.note})</span>}
              </button>
            ))}
          </div>

          {cfg.activeProvider === "nvidia" && keyField("NVIDIA API Key", cfg.nvidiaKey, "nvidiaKey")}
          {cfg.activeProvider === "openai" && keyField("OpenAI API Key", cfg.openaiKey, "openaiKey")}
          {cfg.activeProvider === "anthropic" && keyField("Anthropic API Key", cfg.anthropicKey, "anthropicKey")}

          {cfg.activeProvider === "ollama" && (
            <div className="mb-5">
              <label className="text-[12px] font-mono tracking-[0.15em] text-white/60 block mb-2">Ollama URL</label>
              <input
                value={cfg.ollamaUrl || ""}
                onChange={(e) => { update({ ollamaUrl: e.target.value }); setFetchError(null); }}
                placeholder="http://192.168.1.100:11434"
                className="w-full bg-[#222] border border-white/20 rounded-lg px-4 py-3 text-[15px] font-mono text-white/90 placeholder-white/30 focus:outline-none focus:border-white/50 transition-colors min-h-[48px]"
              />
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-mono tracking-[0.15em] text-white/60">MODELS</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRefreshModels(); }}
                disabled={!canRefresh || fetching}
                className={`text-[11px] font-mono tracking-[0.12em] px-3 py-2 border transition-all min-h-[36px] ${
                  canRefresh && !fetching
                    ? "border-white/15 text-white/60 hover:text-white/80 hover:border-white/30"
                    : "border-white/[0.06] text-white/20"
                }`}
              >
                {fetching ? "REFRESHING..." : "REFRESH"}
              </button>
            </div>

            {fetchError && (
              <p className="text-[11px] font-sans text-white/50 mb-3">{fetchError}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {fetchedModels.map((m) => (
                <button
                  key={m.id}
                  onClick={(e) => { e.stopPropagation(); selectModel(m.id); }}
                  className={`px-3 py-2 text-[11px] font-mono tracking-[0.05em] border transition-all min-h-[36px] ${
                    cfg.activeModel === m.id
                      ? "bg-white/25 border-white/50 text-white"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:border-white/20"
                  }`}
                >
                  {m.name}
                </button>
              ))}
              {fetchedModels.length === 0 && (
                <span className="text-[11px] font-mono text-white/30">No models available</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [open, cfg, fetchedModels, fetching, fetchError, canRefresh, handleRefreshModels, onClose]);

  if (!open) return null;

  return createPortal(content, document.body);
}
