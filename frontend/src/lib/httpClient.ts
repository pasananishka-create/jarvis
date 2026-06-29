function isNative(): boolean {
  try {
    const w = window as any;
    return typeof w.Capacitor !== "undefined" && w.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export interface HttpClientResponse {
  status: number;
  data: any;
}

function httpError(status: number, detail: string, modelLabel?: string): string {
  console.error(`API ${status}: ${detail.slice(0, 300)}`);
  if (status === 404) {
    const modelHint = modelLabel ? `Model "${modelLabel}" ` : "The model ";
    return `${modelHint}was not found (404). It may be wrong or unavailable. Open Settings and try a different model from the list.`;
  }
  if (status === 401 || status === 403) {
    return `Authentication failed (${status}). Check your API key in Settings.`;
  }
  if (status === 429) {
    return `Rate limit exceeded (429). Wait a moment and try again.`;
  }
  return `API error ${status}: ${detail.slice(0, 300)}`;
}

export async function httpPost(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<HttpClientResponse> {
  if (isNative()) {
    const { CapacitorHttp } = await import("@capacitor/core");
    const resp = await CapacitorHttp.request({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json", ...headers },
      data: body,
    });
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(httpError(resp.status, JSON.stringify(resp.data)));
    }
    return { status: resp.status, data: resp.data };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(httpError(resp.status, text));
  }
  return { status: resp.status, data: await resp.json() };
}

async function* parseSSE(text: string): AsyncGenerator<string> {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) continue;
    const data = trimmed.slice(6);
    if (data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) yield content;
    } catch { /* skip */ }
  }
}

async function* parseAnthropicSSE(text: string): AsyncGenerator<string> {
  const lines = text.split("\n");
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

export async function* httpPostStream(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  signal?: AbortSignal,
  format: "openai" | "anthropic" = "openai",
): AsyncGenerator<string> {
  const modelLabel = body.model || "unknown";

  if (isNative()) {
    const { CapacitorHttp } = await import("@capacitor/core");
    const resp = await CapacitorHttp.request({
      method: "POST",
      url,
      headers: { "Content-Type": "application/json", ...headers },
      data: { ...body, stream: true },
    });
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(httpError(resp.status, JSON.stringify(resp.data), String(modelLabel)));
    }
    const text = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
    if (format === "anthropic") {
      yield* parseAnthropicSSE(text);
    } else {
      yield* parseSSE(text);
    }
    return;
  }

  console.log("[httpPostStream] fetch", url, JSON.stringify(body).slice(0, 120));
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof TypeError) {
      throw new Error(
        "Network error — this provider does not support browser CORS. " +
        "Try using OpenAI or Anthropic in your browser, or use the APK build."
      );
    }
    throw err;
  }

  console.log("[httpPostStream] response status", resp.status, resp.ok ? "OK" : "FAIL");
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[httpPostStream] error body:", text.slice(0, 300));
    throw new Error(httpError(resp.status, text, String(modelLabel)));
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
        if (format === "anthropic") {
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } else {
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        }
      } catch { /* skip */ }
    }
  }
}

export async function httpGet(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<HttpClientResponse> {
  if (isNative()) {
    const { CapacitorHttp } = await import("@capacitor/core");
    const resp = await CapacitorHttp.request({
      method: "GET",
      url,
      headers,
    });
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(httpError(resp.status, JSON.stringify(resp.data)));
    }
    return { status: resp.status, data: resp.data };
  }

  const resp = await fetch(url, { headers, signal });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(httpError(resp.status, text));
  }
  return { status: resp.status, data: await resp.json() };
}
