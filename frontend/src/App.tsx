import { useState } from "react";
import { useVisualViewport } from "./hooks/useVisualViewport";
import MountSequence from "./components/MountSequence";
import Chat from "./components/Chat";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { keyboardHeight } = useVisualViewport();

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#080C10]">
      {showSplash && (
        <MountSequence onComplete={() => setShowSplash(false)} />
      )}

      {!showSplash && (
        <div className="flex flex-1 overflow-hidden">
          <Chat keyboardHeight={keyboardHeight} />
        </div>
      )}
    </div>
  );
}
