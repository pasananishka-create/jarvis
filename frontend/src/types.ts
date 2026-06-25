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

export interface BackendInfo {
  active: string;
  available: string[];
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
