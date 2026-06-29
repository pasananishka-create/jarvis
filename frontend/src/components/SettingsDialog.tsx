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
  { id: "nvidia", label: "NVIDIA", note: "APK only" },
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
    <div className="mb-4">
      <label className="text-[7px] font-mono tracking-[0.2em] text-white/20 block mb-1.5">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => {
          update({ [field]: e.target.value } as any);
          setFetchError(null);
        }}
        type="password"
        placeholder="sk-..."
        className="w-full bg-black border border-white/[0.08] rounded-none px-3 py-2.5 text-[12px] font-mono text-white/60 placeholder-white/8 focus:outline-none focus:border-white/20 transition-colors min-h-[40px]"
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
            <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-white/[0.04]">
              <span className="text-[8px] font-mono tracking-[0.25em] text-white/30">SETTINGS</span>
              <button onClick={onClose} className="text-white/20 p-1.5 min-h-[40px] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 pt-4">
              <p className="text-[9px] font-mono text-white/15 mb-4 leading-relaxed">
                Enter API keys to use AI providers directly from this device. Keys are stored locally.
              </p>

              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => changeProvider(p.id)}
                    className={`shrink-0 px-3 py-2 text-[8px] font-mono tracking-[0.12em] border transition-all min-h-[36px] ${
                      cfg.activeProvider === p.id
                        ? "bg-white/10 border-white/30 text-white"
                        : "bg-black border-white/[0.06] text-white/20 hover:text-white/35"
                    }`}
                  >
                    {p.label}
                    {p.note && <span className="ml-1 text-[6px] text-white/10">({p.note})</span>}
                  </button>
                ))}
              </div>

              {cfg.activeProvider === "nvidia" && keyField("NVIDIA API Key", cfg.nvidiaKey, "nvidiaKey")}
              {cfg.activeProvider === "openai" && keyField("OpenAI API Key", cfg.openaiKey, "openaiKey")}
              {cfg.activeProvider === "anthropic" && keyField("Anthropic API Key", cfg.anthropicKey, "anthropicKey")}

              {cfg.activeProvider === "ollama" && (
                <div className="mb-4">
                  <label className="text-[7px] font-mono tracking-[0.2em] text-white/20 block mb-1.5">Ollama URL</label>
                  <input
                    value={cfg.ollamaUrl || ""}
                    onChange={(e) => { update({ ollamaUrl: e.target.value }); setFetchError(null); }}
                    placeholder="http://192.168.1.100:11434"
                    className="w-full bg-black border border-white/[0.08] rounded-none px-3 py-2.5 text-[12px] font-mono text-white/60 placeholder-white/8 focus:outline-none focus:border-white/20 transition-colors min-h-[40px]"
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[7px] font-mono tracking-[0.2em] text-white/20">MODELS</span>
                  <button
                    onClick={handleRefreshModels}
                    disabled={!canRefresh || fetching}
                    className={`text-[7px] font-mono tracking-[0.12em] px-2.5 py-1.5 border transition-all min-h-[32px] ${
                      canRefresh && !fetching
                        ? "border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                        : "border-white/[0.04] text-white/10"
                    }`}
                  >
                    {fetching ? "..." : "REFRESH"}
                  </button>
                </div>

                {fetchError && (
                  <p className="text-[8px] font-mono text-white/30 mb-2">{fetchError}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {fetchedModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectModel(m.id)}
                      className={`px-2.5 py-1.5 text-[8px] font-mono tracking-[0.05em] border transition-all min-h-[28px] ${
                        cfg.activeModel === m.id
                          ? "bg-white/15 border-white/40 text-white"
                          : "bg-black border-white/[0.06] text-white/25 hover:text-white/40 hover:border-white/15"
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                  {fetchedModels.length === 0 && (
                    <span className="text-[8px] font-mono text-white/10">No models available</span>
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
