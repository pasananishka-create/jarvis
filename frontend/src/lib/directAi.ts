import { httpPost, httpPostStream, httpGet } from "./httpClient";

export interface DirectConfig {
  nvidiaKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  activeProvider: "nvidia" | "openai" | "anthropic" | "ollama";
  activeModel: string;
}

export interface ModelOption {
  id: string;
  name: string;
}

const DEFAULTS: Record<string, string> = {
  openai: "gpt-4o",
  nvidia: "meta/llama-3.1-8b-instruct",
  anthropic: "claude-sonnet-4-20250514",
  ollama: "llama3.1",
};

const CURATED_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4.1", name: "GPT-4.1" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    { id: "o1", name: "o1" },
    { id: "o3-mini", name: "o3 Mini" },
    { id: "o4-mini", name: "o4 Mini" },
  ],
  nvidia: [
    { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
    { id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
    { id: "meta/llama-3.1-405b-instruct", name: "Llama 3.1 405B" },
    { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "mistralai/mistral-nemo-12b-instruct", name: "Mistral Nemo 12B" },
    { id: "mistralai/mistral-7b-instruct-v0.3", name: "Mistral 7B" },
    { id: "google/gemma-2-27b-it", name: "Gemma 2 27B" },
    { id: "google/gemma-2-9b-it", name: "Gemma 2 9B" },
    { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B" },
    { id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B" },
    { id: "qwen/qwen2.5-72b-instruct", name: "Qwen 2.5 72B" },
    { id: "qwen/qwen2.5-coder-32b-instruct", name: "Qwen 2.5 Coder 32B" },
    { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1" },
    { id: "deepseek-ai/deepseek-v3", name: "DeepSeek V3" },
    { id: "microsoft/phi-3-mini-128k-instruct", name: "Phi-3 Mini 128K" },
    { id: "microsoft/phi-3-medium-128k-instruct", name: "Phi-3 Medium 128K" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-sonnet-4-20250514-thinking", name: "Claude Sonnet 4 Thinking" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
    { id: "claude-opus-4-20250514-thinking", name: "Claude Opus 4 Thinking" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  ],
  ollama: [
    { id: "llama3.1", name: "Llama 3.1" },
    { id: "llama3.2", name: "Llama 3.2" },
    { id: "llama3.3", name: "Llama 3.3" },
    { id: "mistral", name: "Mistral" },
    { id: "mistral-nemo", name: "Mistral Nemo" },
    { id: "codellama", name: "Code Llama" },
    { id: "deepseek-coder", name: "DeepSeek Coder" },
    { id: "deepseek-r1", name: "DeepSeek R1" },
    { id: "mixtral", name: "Mixtral" },
    { id: "qwen2.5", name: "Qwen 2.5" },
    { id: "phi3", name: "Phi-3" },
    { id: "phi4", name: "Phi-4" },
    { id: "gemma2", name: "Gemma 2" },
    { id: "gemma3", name: "Gemma 3" },
    { id: "command-r", name: "Command R" },
    { id: "command-r-plus", name: "Command R+" },
  ],
};

export const JARVIS_SYSTEM = `You are J.A.R.V.I.S. — an advanced AI personal assistant integrated into the user's system.

Capabilities:
- Answer questions with accurate, well-reasoned responses
- Write, review, and explain code in any programming language
- Execute commands on the user's system when they request it (they will run them)
- Search the web for real-time information when needed
- Analyze files and data the user provides
- Help with system administration, development, and general tasks

Guidelines:
- Be concise but thorough. Use code blocks for code examples.
- When the user asks you to do something that requires a command,
  provide the exact command they should run.
- If you're unsure about something, say so rather than guessing.
- Think step by step for complex problems.
- Use a natural, conversational tone — you're an assistant, not a search engine.
- Format responses with markdown when it improves readability.
- When explaining code, focus on the key concepts the user needs to understand.

Operating context: The user is interacting through a web/APK interface.
Direct mode: AI APIs are called directly from the browser.`;

export function getConfig(): DirectConfig {
  try {
    const raw = localStorage.getItem("jarvis_direct_config");
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return {
    activeProvider: "openai",
    activeModel: DEFAULTS.openai,
  };
}

export function saveConfig(c: Partial<DirectConfig>): boolean {
  try {
    const current = getConfig();
    const next = { ...current, ...c };
    localStorage.setItem("jarvis_direct_config", JSON.stringify(next));
    return true;
  } catch (e) {
    console.error("saveConfig failed:", e);
    return false;
  }
}

export function hasAnyKey(): boolean {
  return hasKeyForProvider(getConfig().activeProvider);
}

export function hasKeyForProvider(provider: string): boolean {
  const c = getConfig();
  if (provider === "ollama") return !!c.ollamaUrl;
  if (provider === "openai") return !!c.openaiKey;
  if (provider === "anthropic") return !!c.anthropicKey;
  if (provider === "nvidia") return !!c.nvidiaKey;
  return false;
}

export function getCuratedModels(provider: string): ModelOption[] {
  return CURATED_MODELS[provider] || [];
}

export async function fetchLiveModels(provider: string): Promise<ModelOption[]> {
  const cfg = getConfig();
  switch (provider) {
    case "openai": {
      if (!cfg.openaiKey) return getCuratedModels("openai");
      try {
        const resp = await httpGet("https://api.openai.com/v1/models", {
          Authorization: `Bearer ${cfg.openaiKey}`,
        });
        const models: ModelOption[] = (resp.data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
        return models.length > 0 ? models : getCuratedModels("openai");
      } catch {
        return getCuratedModels("openai");
      }
    }
    case "ollama": {
      const base = (cfg.ollamaUrl || "http://localhost:11434").replace(/\/+$/, "");
      try {
        const resp = await httpGet(`${base}/api/tags`, {});
        const models: ModelOption[] = (resp.data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
        return models.length > 0 ? models : getCuratedModels("ollama");
      } catch {
        return getCuratedModels("ollama");
      }
    }
    case "nvidia": {
      if (!cfg.nvidiaKey) return getCuratedModels("nvidia");
      try {
        const resp = await httpGet("https://integrate.api.nvidia.com/v1/models", {
          Authorization: `Bearer ${cfg.nvidiaKey}`,
        });
        const models: ModelOption[] = (resp.data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
        return models.length > 0 ? models : getCuratedModels("nvidia");
      } catch {
        return getCuratedModels("nvidia");
      }
    }
    case "anthropic": {
      if (!cfg.anthropicKey) return getCuratedModels("anthropic");
      try {
        const resp = await httpGet("https://api.anthropic.com/v1/models", {
          "x-api-key": cfg.anthropicKey,
          "anthropic-version": "2023-06-01",
        });
        const models: ModelOption[] = (resp.data.data || []).map((m: any) => ({ id: m.id, name: m.display_name || m.id }));
        return models.length > 0 ? models : getCuratedModels("anthropic");
      } catch {
        return getCuratedModels("anthropic");
      }
    }
    default:
      return [];
  }
}

export async function* directChat(
  messages: { role: string; content: string }[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const config = getConfig();
  const provider = config.activeProvider;
  const model = config.activeModel || DEFAULTS[provider] || "";
  console.log("[directChat] provider=", provider, "model=", model, "hasKey=", !!config[provider === "openai" ? "openaiKey" : provider === "anthropic" ? "anthropicKey" : provider === "nvidia" ? "nvidiaKey" : "ollamaUrl"]);

  const hasSystem = messages.some((m) => m.role === "system");
  const msgs = hasSystem ? messages : [{ role: "system", content: JARVIS_SYSTEM }, ...messages];

  if (provider === "openai") {
    if (!config.openaiKey) throw new Error("OpenAI API key not configured. Open Settings to add one.");
    yield* httpPostStream(
      "https://api.openai.com/v1/chat/completions",
      { model, messages: msgs, max_tokens: 4096 },
      { Authorization: `Bearer ${config.openaiKey}` },
      signal,
      "openai",
    );
  } else if (provider === "anthropic") {
    if (!config.anthropicKey) throw new Error("Anthropic API key not configured. Open Settings to add one.");
    const system = msgs.find((m) => m.role === "system")?.content || "";
    const chatMsgs = msgs.filter((m) => m.role !== "system");
    yield* httpPostStream(
      "https://api.anthropic.com/v1/messages",
      { model, messages: chatMsgs, max_tokens: 4096, system },
      { "x-api-key": config.anthropicKey, "anthropic-version": "2023-06-01" },
      signal,
      "anthropic",
    );
  } else if (provider === "ollama") {
    const base = (config.ollamaUrl || "http://localhost:11434").replace(/\/+$/, "") + "/v1";
    yield* httpPostStream(
      `${base}/chat/completions`,
      { model, messages: msgs, options: { num_predict: 4096 } },
      {},
      signal,
      "openai",
    );
  } else {
    // nvidia
    if (!config.nvidiaKey) throw new Error("NVIDIA API key not configured. Open Settings to add one.");
    yield* httpPostStream(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      { model, messages: msgs, max_tokens: 4096 },
      { Authorization: `Bearer ${config.nvidiaKey}` },
      signal,
      "openai",
    );
  }
}
