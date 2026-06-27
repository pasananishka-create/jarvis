export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Ability {
  name: string;
  description: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export interface BackendInfo {
  active: string;
  available: string[];
  models?: Record<string, ModelInfo[]>;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "direct";
