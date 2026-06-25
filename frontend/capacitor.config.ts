import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jarvis.assistant",
  appName: "J.A.R.V.I.S.",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true,
    hostname: "localhost",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
