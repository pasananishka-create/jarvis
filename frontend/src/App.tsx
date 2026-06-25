import ParticleBackground from "./components/ParticleBackground";
import Chat from "./components/Chat";

export default function App() {
  return (
    <div className="h-full flex flex-col relative">
      <ParticleBackground />
      <div className="scanlines" />
      <Chat />
    </div>
  );
}
