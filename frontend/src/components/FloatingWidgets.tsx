import { useState, useEffect, useRef } from "react";

interface WidgetProps {
  style?: React.CSSProperties;
  children: React.ReactNode;
  title: string;
  icon: string;
}

function GlassWidget({ style, children, title, icon }: WidgetProps) {
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: 16,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: "rgba(17,24,39,0.5)",
        border: "1px solid rgba(0,229,255,0.1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        minWidth: 120,
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(0,229,255,0.6)",
            letterSpacing: 1,
            textTransform: "uppercase" as const,
            fontWeight: 500,
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: string; condition: string; icon: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch("https://wttr.in/?format=%t|%C|%c&lang=en", { signal: AbortSignal.timeout(5000) });
        const text = await res.text();
        const parts = text.split("|");
        if (parts.length === 3) {
          setWeather({ temp: parts[0].trim(), condition: parts[1].trim(), icon: parts[2].trim() });
        }
      } catch {
        setWeather({ temp: "--°C", condition: "Unavailable", icon: "☁️" });
      }
    };
    fetchWeather();
  }, []);

  if (!weather) return null;

  return (
    <GlassWidget title="WEATHER" icon="🌤️">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 28 }}>{weather.icon}</span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
            {weather.temp.replace("+", "")}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
            {weather.condition}
          </div>
        </div>
      </div>
    </GlassWidget>
  );
}

function BatteryWidget() {
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    const getBattery = async () => {
      try {
        const b = await (navigator as any).getBattery?.();
        if (b) {
          const update = () => setBattery({ level: b.level, charging: b.charging });
          update();
          b.addEventListener("levelchange", update);
          b.addEventListener("chargingchange", update);
          return () => {
            b.removeEventListener("levelchange", update);
            b.removeEventListener("chargingchange", update);
          };
        }
      } catch {}
    };
    getBattery();
  }, []);

  if (!battery) return null;

  const pct = Math.round(battery.level * 100);
  const barColor = pct > 20 ? (battery.charging ? "#00FFC8" : "#00E5FF") : "#FF4444";

  return (
    <GlassWidget title="BATTERY" icon="🔋">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 36,
            height: 18,
            borderRadius: 3,
            border: `1.5px solid ${barColor}`,
            position: "relative",
            display: "flex",
            alignItems: "center",
            padding: 1,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              borderRadius: 1.5,
              background: barColor,
              transition: "width 0.5s, background 0.5s",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 2,
              height: 6,
              borderRadius: "0 1px 1px 0",
              background: barColor,
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{pct}%</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>
            {battery.charging ? "CHARGING" : ""}
          </div>
        </div>
      </div>
    </GlassWidget>
  );
}

function SystemWidget() {
  return (
    <GlassWidget title="SYSTEM" icon="⚡">
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>AI</span>
          <span style={{ fontSize: 10, color: "#00E5FF" }}>ONLINE</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>NET</span>
          <span style={{ fontSize: 10, color: "rgba(0,229,255,0.6)" }}>ACTIVE</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>MEM</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>OPTIMAL</span>
        </div>
      </div>
    </GlassWidget>
  );
}

function MemoryWidget() {
  const highlights = [
    { icon: "💬", text: "Last session: Code review" },
    { icon: "📄", text: "3 files modified today" },
    { icon: "🎯", text: "Focused session active" },
  ];

  return (
    <GlassWidget title="MEMORY HIGHLIGHTS" icon="🧠" style={{ minWidth: 180 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {highlights.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10 }}>{h.icon}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{h.text}</span>
          </div>
        ))}
      </div>
    </GlassWidget>
  );
}

interface FloatingWidgetsProps {
  compact?: boolean;
}

export default function FloatingWidgets({ compact }: FloatingWidgetsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          padding: "0 16px",
        }}
      >
        <WeatherWidget />
        <BatteryWidget />
        <SystemWidget />
      </div>
    );
  }

  return (
    <>
      <div
        className="floating-widget"
        style={{
          position: "absolute",
          top: "15%",
          right: "5%",
          zIndex: 2,
          animation: "floatIn 0.6s ease-out",
        }}
      >
        <WeatherWidget />
      </div>
      <div
        className="floating-widget"
        style={{
          position: "absolute",
          top: "35%",
          right: "3%",
          zIndex: 2,
          animation: "floatIn 0.8s ease-out",
        }}
      >
        <SystemWidget />
      </div>
      <div
        className="floating-widget"
        style={{
          position: "absolute",
          top: "30%",
          left: "3%",
          zIndex: 2,
          animation: "floatIn 0.7s ease-out",
        }}
      >
        <BatteryWidget />
      </div>
      <div
        className="floating-widget"
        style={{
          position: "absolute",
          bottom: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          animation: "floatIn 0.9s ease-out",
        }}
      >
        <MemoryWidget />
      </div>
    </>
  );
}
