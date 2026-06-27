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
  nvidia: "meta/llama-3.1-8b-instruct",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  ollama: "llama3.1",
};

export function getConfig(): DirectConfig {
  try {
    const raw = localStorage.getItem("jarvis_direct_config");
    if (raw) return JSON.parse(raw);
  } catch { /* */ }
  return {
    activeProvider: "nvidia",
    activeModel: DEFAULTS.nvidia,
  };
}

export function saveConfig(c: Partial<DirectConfig>) {
  const current = getConfig();
  const next = { ...current, ...c };
  localStorage.setItem("jarvis_direct_config", JSON.stringify(next));
}

export function hasAnyKey(): boolean {
  const c = getConfig();
  if (c.activeProvider === "ollama") return !!c.ollamaUrl;
  return !!(c.nvidiaKey || c.openaiKey || c.anthropicKey);
}

function buildModelUrl(provider: DirectConfig["activeProvider"], config: DirectConfig): string {
  switch (provider) {
    case "openai": return "https://api.openai.com/v1";
    case "nvidia": return "https://integrate.api.nvidia.com/v1";
    case "anthropic": return "https://api.anthropic.com";
    case "ollama": {
      const base = (config.ollamaUrl || "http://localhost:11434").replace(/\/+$/, "");
      return `${base}/v1`;
    }
  }
}

export async function fetchModels(provider: DirectConfig["activeProvider"], config: DirectConfig): Promise<ModelOption[]> {
  switch (provider) {
    case "openai": {
      if (!config.openaiKey) throw new Error("Enter an OpenAI API key first");
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${config.openaiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`OpenAI ${resp.status}: ${text.slice(0, 120)}`);
      }
      const data = await resp.json();
      return (data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
    }
    case "nvidia": {
      if (!config.nvidiaKey) throw new Error("Enter a NVIDIA API key first");
      const resp = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: `Bearer ${config.nvidiaKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`NVIDIA ${resp.status}: ${text.slice(0, 120)}`);
      }
      const data = await resp.json();
      return (data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
    }
    case "anthropic": {
      return [
        { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
        { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
      ];
    }
    case "ollama": {
      const base = (config.ollamaUrl || "http://localhost:11434").replace(/\/+$/, "");
      const resp = await fetch(`${base}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Ollama ${resp.status}: ${text.slice(0, 120)}`);
      }
      const data = await resp.json();
      return (data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
    }
  }
}

async function* streamOpenAI(
  baseUrl: string,
  body: Record<string, unknown>,
  apiKey: string,
): AsyncGenerator<string> {
  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
  } catch (err: unknown) {
    const msg = err instanceof TypeError
      ? "Network error — check your connection. If using a browser/APK, the provider may not support CORS."
      : err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API error ${resp.status}: ${text.slice(0, 300)}`);
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Streaming not supported in this browser");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch { /* skip malformed */ }
    }
  }
}

async function* streamAnthropic(
  body: Record<string, unknown>,
  apiKey: string,
): AsyncGenerator<string> {
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...body, stream: true }),
    });
  } catch (err: unknown) {
    const msg = err instanceof TypeError
      ? "Network error — check your connection or CORS policy."
      : err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Anthropic error ${resp.status}: ${text.slice(0, 300)}`);
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Streaming not supported in this browser");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch { /* skip */ }
    }
  }
}

export async function* directChat(
  messages: { role: string; content: string }[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const config = getConfig();
  const provider = config.activeProvider;
  const model = config.activeModel || DEFAULTS[provider] || "";

  const msgs = messages.map((m) => ({ role: m.role, content: m.content }));

  if (provider === "openai") {
    if (!config.openaiKey) throw new Error("OpenAI API key not configured. Open Settings to add one.");
    yield* streamOpenAI(
      "https://api.openai.com/v1",
      { model, messages: msgs, max_tokens: 4096 },
      config.openaiKey,
    );
  } else if (provider === "anthropic") {
    if (!config.anthropicKey) throw new Error("Anthropic API key not configured. Open Settings to add one.");
    const system = msgs.find((m) => m.role === "system")?.content || "";
    const chatMsgs = msgs.filter((m) => m.role !== "system");
    yield* streamAnthropic(
      { model, messages: chatMsgs, max_tokens: 4096, system: system || undefined },
      config.anthropicKey,
    );
  } else if (provider === "ollama") {
    const base = buildModelUrl("ollama", config);
    yield* streamOpenAI(
      base,
      { model, messages: msgs, options: { num_predict: 4096 } },
      "",
    );
  } else {
    if (!config.nvidiaKey) throw new Error("NVIDIA API key not configured. Open Settings to add one.");
    yield* streamOpenAI(
      "https://integrate.api.nvidia.com/v1",
      { model, messages: msgs, max_tokens: 4096 },
      config.nvidiaKey,
    );
  }
}
