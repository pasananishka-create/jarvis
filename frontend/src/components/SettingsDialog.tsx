import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getConfig, saveConfig, fetchModels, type DirectConfig, type ModelOption } from "../lib/directAi";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: DirectConfig["activeProvider"]; label: string; modelKey: string }[] = [
  { id: "nvidia", label: "NVIDIA NIM", modelKey: "meta/llama-3.1-8b-instruct" },
  { id: "openai", label: "OpenAI", modelKey: "gpt-4o" },
  { id: "anthropic", label: "Anthropic", modelKey: "claude-sonnet-4-20250514" },
  { id: "ollama", label: "Ollama (Local)", modelKey: "llama3.1" },
];

export default function SettingsDialog({ open, onClose }: Props) {
  const [cfg, setCfg] = useState<DirectConfig>(getConfig);
  const [fetchedModels, setFetchedModels] = useState<ModelOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => { if (open) { const c = getConfig(); setCfg(c); setFetchedModels([]); setFetchError(null); } }, [open]);

  const update = (patch: Partial<DirectConfig>) => {
    const next = { ...cfg, ...patch };
    setCfg(next);
    saveConfig(next);
  };

  const hasKeyForProvider = (p: DirectConfig["activeProvider"]) => {
    if (p === "ollama") return !!cfg.ollamaUrl;
    if (p === "nvidia") return !!cfg.nvidiaKey;
    if (p === "openai") return !!cfg.openaiKey;
    if (p === "anthropic") return !!cfg.anthropicKey;
    return false;
  };

  const handleFetchModels = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    setFetchedModels([]);
    try {
      const models = await fetchModels(cfg.activeProvider, cfg);
      setFetchedModels(models);
      if (!models.find((m) => m.id === cfg.activeModel) && models.length > 0) {
        update({ activeModel: models[0].id });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchError(msg);
    } finally {
      setFetching(false);
    }
  }, [cfg.activeProvider, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectModel = (id: string) => {
    update({ activeModel: id });
  };

  const keyField = (label: string, value: string | undefined, field: keyof DirectConfig) => (
    <div className="mb-3">
      <label className="text-[8px] font-mono tracking-[0.15em] text-white/20 block mb-1.5">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => {
          update({ [field]: e.target.value } as any);
          setFetchedModels([]);
          setFetchError(null);
        }}
        type="password"
        placeholder="sk-..."
        className="w-full bg-black border border-white/[0.06] rounded-lg px-3 py-2.5 text-[12px] font-mono text-[#E8F4F8]/60 placeholder-white/8 focus:outline-none focus:border-[#00D4FF]/20 transition-colors min-h-[40px]"
      />
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-[#080C10] rounded-t-xl shadow-xl max-h-[85vh] overflow-y-auto"
            initial={{ y: 300, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 300, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-white/[0.04]">
              <span className="text-[9px] font-mono tracking-[0.15em] text-white/30">AI SETTINGS</span>
              <button onClick={onClose} className="text-white/30 p-1.5 min-h-[40px] flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-4 pt-4">
              <p className="text-[10px] font-mono text-white/15 mb-4 leading-relaxed">
                Enter API keys to use AI providers directly from this device. No backend server required.
                Keys are stored locally on this device only.
              </p>

              {/* Provider selector */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      update({ activeProvider: p.id, activeModel: p.modelKey });
                      setFetchedModels([]);
                      setFetchError(null);
                      if (hasKeyForProvider(p.id)) {
                        // auto-fetch on provider switch if key already present
                        setTimeout(() => handleFetchModels(), 100);
                      }
                    }}
                    className={`shrink-0 px-3 py-2 rounded-lg text-[9px] font-mono tracking-[0.08em] border transition-all min-h-[36px] ${
                      cfg.activeProvider === p.id
                        ? "bg-[#00D4FF]/8 border-[#00D4FF]/20 text-[#00D4FF]/60"
                        : "bg-black/50 border-white/[0.04] text-white/20 hover:text-white/35"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* API key fields */}
              {cfg.activeProvider === "nvidia" && keyField("NVIDIA API Key", cfg.nvidiaKey, "nvidiaKey")}
              {cfg.activeProvider === "openai" && keyField("OpenAI API Key", cfg.openaiKey, "openaiKey")}
              {cfg.activeProvider === "anthropic" && keyField("Anthropic API Key", cfg.anthropicKey, "anthropicKey")}

              {cfg.activeProvider === "ollama" && (
                <div className="mb-3">
                  <label className="text-[8px] font-mono tracking-[0.15em] text-white/20 block mb-1.5">Ollama URL</label>
                  <input
                    value={cfg.ollamaUrl || ""}
                    onChange={(e) => { update({ ollamaUrl: e.target.value }); setFetchedModels([]); setFetchError(null); }}
                    placeholder="http://192.168.1.100:11434"
                    className="w-full bg-black border border-white/[0.06] rounded-lg px-3 py-2.5 text-[12px] font-mono text-[#E8F4F8]/60 placeholder-white/8 focus:outline-none focus:border-[#00D4FF]/20 transition-colors min-h-[40px]"
                  />
                </div>
              )}

              {/* Find Models button */}
              {hasKeyForProvider(cfg.activeProvider) && (
                <button
                  onClick={handleFetchModels}
                  disabled={fetching}
                  className="w-full bg-[#00D4FF]/6 border border-[#00D4FF]/12 text-[#00D4FF]/50 hover:text-[#00D4FF]/70 hover:bg-[#00D4FF]/10 rounded-lg py-2.5 text-[9px] font-mono tracking-[0.1em] transition-colors min-h-[40px] disabled:opacity-20 mb-3"
                >
                  {fetching ? "Fetching models..." : "FIND MODELS"}
                </button>
              )}

              {/* Fetch error */}
              {fetchError && (
                <p className="text-[9px] font-mono text-red-400/50 mb-3 leading-relaxed">{fetchError}</p>
              )}

              {/* Fetched model list */}
              {fetchedModels.length > 0 && (
                <div className="mb-4 max-h-[180px] overflow-y-auto border border-white/[0.04] rounded-lg">
                  {fetchedModels.map((m) => {
                    const selected = m.id === cfg.activeModel;
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectModel(m.id)}
                        className={`w-full text-left px-3 py-2.5 text-[10px] font-mono tracking-wider border-b border-white/[0.02] last:border-0 transition-colors flex items-center gap-2 min-h-[40px] ${
                          selected
                            ? "text-[#00D4FF]/80 bg-[#00D4FF]/6"
                            : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
                        }`}
                      >
                        {selected && <div className="w-1 h-2 rounded-full bg-[#00D4FF]/60 shrink-0" />}
                        {!selected && <div className="w-1 shrink-0" />}
                        <span className="truncate">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Manual model ID input (fallback) */}
              <div className="mb-4">
                <label className="text-[8px] font-mono tracking-[0.15em] text-white/20 block mb-1.5">
                  Model ID {fetchedModels.length > 0 ? "(override)" : "(manual)"}
                </label>
                <input
                  value={cfg.activeModel}
                  onChange={(e) => update({ activeModel: e.target.value })}
                  placeholder={PROVIDERS.find((p) => p.id === cfg.activeProvider)?.modelKey || ""}
                  className="w-full bg-black border border-white/[0.06] rounded-lg px-3 py-2.5 text-[12px] font-mono text-[#E8F4F8]/60 placeholder-white/8 focus:outline-none focus:border-[#00D4FF]/20 transition-colors min-h-[40px]"
                />
              </div>

              <button
                onClick={onClose}
                className="w-full bg-[#00D4FF]/8 border border-[#00D4FF]/15 text-[#00D4FF]/60 rounded-lg py-3 text-[10px] font-mono tracking-[0.1em] transition-colors min-h-[44px] hover:bg-[#00D4FF]/12 mb-4"
              >
                DONE
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
