import type { ConnectionStatus, BackendInfo } from "../types";

interface HeaderProps {
  status: ConnectionStatus;
  backendInfo: BackendInfo | null;
  onClear: () => void;
  onSwitchBackend: (name: string) => void;
}

export default function Header({ status, backendInfo, onClear, onSwitchBackend }: HeaderProps) {
  const statusColor =
    status === "connected" ? "bg-green-400" : status === "connecting" ? "bg-yellow-400" : "bg-red-400";

  return (
    <header className="relative z-10 border-b border-white/5 backdrop-blur-sm bg-bg-dark/90">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between min-h-[48px] sm:min-h-[56px]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className={`w-2 h-2 rounded-full ${statusColor} shadow-lg`} style={{
              boxShadow: `0 0 8px ${status === "connected" ? "#4ade80" : status === "connecting" ? "#facc15" : "#f87171"}`
            }} />
            <div className={`absolute inset-0 w-2 h-2 rounded-full ${statusColor} animate-ping opacity-40`} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[11px] sm:text-sm font-bold tracking-[0.15em] sm:tracking-[0.2em] text-jarvis text-glow uppercase truncate">
              J.A.R.V.I.S.
            </h1>
            <p className="text-[9px] sm:text-[10px] text-white/30 tracking-wider truncate">
              {backendInfo?.active ?? "connecting..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {backendInfo && backendInfo.available.length > 1 && (
            <select
              value={backendInfo.active.split(" ")[0]}
              onChange={(e) => onSwitchBackend(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-white/60 focus:outline-none focus:border-jarvis/40 appearance-none cursor-pointer hover:bg-white/10 transition-colors max-w-[90px] sm:max-w-none"
            >
              {backendInfo.available.map((b) => (
                <option key={b} value={b} className="bg-bg-dark text-white/80">
                  {b}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={onClear}
            className="text-white/30 hover:text-white/60 text-xs sm:text-sm px-1.5 sm:px-2 py-1 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            title="Clear conversation"
          >
            ✕
          </button>
        </div>
      </div>
    </header>
  );
}
