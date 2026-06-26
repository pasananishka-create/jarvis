import { motion } from "framer-motion";

interface AvatarDisplayProps {
  active: boolean;
  listening: boolean;
}

export default function AvatarDisplay({ active, listening }: AvatarDisplayProps) {
  return (
    <div className={`avatar-container ${listening ? "avatar-listening" : ""}`}>
      <div className="avatar-ring" />
      <div className="avatar-ring" />
      <div className="avatar-ring" />
      <motion.div
        className="avatar-face"
        animate={
          listening
            ? { scale: [1, 1.02, 1] }
            : active
            ? { scale: [1, 1.01, 1] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="avatar-eye left">
          <motion.div
            className="absolute -inset-1 rounded-full border border-jarvis/20"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
        </div>
        <div className="avatar-eye right">
          <motion.div
            className="absolute -inset-1 rounded-full border border-jarvis/20"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          />
        </div>
        {listening && (
          <motion.div
            className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-jarvis/40"
            animate={{ width: [16, 24, 16], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
      <motion.div
        className="absolute -inset-4 rounded-full border border-jarvis/10"
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
}
