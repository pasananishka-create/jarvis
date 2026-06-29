import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <label className="text-[10px] font-mono tracking-[0.15em] text-white/25 block mb-2">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => {
          update({ [field]: e.target.value } as any);
          setFetchError(null);
        }}
        type="password"
        placeholder="sk-..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-[14px] font-mono text-white/70 placeholder-white/15 focus:outline-none focus:border-white/30 transition-colors min-h-[48px]"
      />
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-black border-t border-white/[0.06] max-h-[85vh] overflow-y-auto"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.04]">
              <span className="text-[10px] font-mono tracking-[0.25em] text-white/40">SETTINGS</span>
              <button onClick={onClose} className="text-white/30 hover:text-white/60 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-6">
              <p className="text-[11px] font-mono text-white/20 mb-5 leading-relaxed">
                Add API keys to use AI providers directly. Keys stay on this device only.
              </p>

              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => changeProvider(p.id)}
                    className={`shrink-0 px-4 py-2.5 text-[10px] font-mono tracking-[0.1em] border transition-all min-h-[40px] ${
                      cfg.activeProvider === p.id
                        ? "bg-white/10 border-white/30 text-white"
                        : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
                    }`}
                  >
                    {p.label}
                    {p.note && <span className="ml-1.5 text-[8px] text-white/15">({p.note})</span>}
                  </button>
                ))}
              </div>

              {cfg.activeProvider === "nvidia" && keyField("NVIDIA API Key", cfg.nvidiaKey, "nvidiaKey")}
              {cfg.activeProvider === "openai" && keyField("OpenAI API Key", cfg.openaiKey, "openaiKey")}
              {cfg.activeProvider === "anthropic" && keyField("Anthropic API Key", cfg.anthropicKey, "anthropicKey")}

              {cfg.activeProvider === "ollama" && (
                <div className="mb-5">
                  <label className="text-[10px] font-mono tracking-[0.15em] text-white/25 block mb-2">Ollama URL</label>
                  <input
                    value={cfg.ollamaUrl || ""}
                    onChange={(e) => { update({ ollamaUrl: e.target.value }); setFetchError(null); }}
                    placeholder="http://192.168.1.100:11434"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-[14px] font-mono text-white/70 placeholder-white/15 focus:outline-none focus:border-white/30 transition-colors min-h-[48px]"
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/25">MODELS</span>
                  <button
                    onClick={handleRefreshModels}
                    disabled={!canRefresh || fetching}
                    className={`text-[9px] font-mono tracking-[0.12em] px-3 py-2 border transition-all min-h-[36px] ${
                      canRefresh && !fetching
                        ? "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                        : "border-white/[0.04] text-white/10"
                    }`}
                  >
                    {fetching ? "REFRESHING..." : "REFRESH"}
                  </button>
                </div>

                {fetchError && (
                  <p className="text-[9px] font-mono text-white/30 mb-3">{fetchError}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {fetchedModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectModel(m.id)}
                      className={`px-3 py-2 text-[9px] font-mono tracking-[0.05em] border transition-all min-h-[36px] ${
                        cfg.activeModel === m.id
                          ? "bg-white/15 border-white/40 text-white"
                          : "bg-white/5 border-white/10 text-white/30 hover:text-white/50 hover:border-white/20"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                  {fetchedModels.length === 0 && (
                    <span className="text-[9px] font-mono text-white/15">No models available</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
