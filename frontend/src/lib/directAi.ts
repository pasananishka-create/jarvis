export interface DirectConfig {
  nvidiaKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  activeProvider: "nvidia" | "openai" | "anthropic" | "ollama";
  activeModel: string;
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
  return !!(c.nvidiaKey || c.openaiKey || c.anthropicKey);
}

async function* streamOpenAI(
  baseUrl: string,
  body: Record<string, unknown>,
  apiKey: string,
): AsyncGenerator<string> {
  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API error ${resp.status}: ${text.slice(0, 200)}`);
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");
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
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Anthropic error ${resp.status}: ${text.slice(0, 200)}`);
  }
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");
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
    if (!config.openaiKey) throw new Error("OpenAI API key not configured");
    yield* streamOpenAI(
      "https://api.openai.com/v1",
      { model, messages: msgs, max_tokens: 2048 },
      config.openaiKey,
    );
  } else if (provider === "anthropic") {
    if (!config.anthropicKey) throw new Error("Anthropic API key not configured");
    const system = msgs.find((m) => m.role === "system")?.content || "";
    const chatMsgs = msgs.filter((m) => m.role !== "system");
    yield* streamAnthropic(
      { model, messages: chatMsgs, max_tokens: 2048, system: system || undefined },
      config.anthropicKey,
    );
  } else if (provider === "ollama") {
    const base = config.ollamaUrl || "http://localhost:11434";
    yield* streamOpenAI(
      base,
      { model, messages: msgs, options: { num_predict: 2048 } },
      "",
    );
  } else {
    if (!config.nvidiaKey) throw new Error("NVIDIA API key not configured");
    yield* streamOpenAI(
      "https://integrate.api.nvidia.com/v1",
      { model, messages: msgs, max_tokens: 2048 },
      config.nvidiaKey,
    );
  }
}
