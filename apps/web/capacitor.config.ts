const isProduction = process.env.CAPACITOR_ENV === "production";

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.novaops.execution",
  appName: "NovaOps",
  webDir: "out",
  android: {
    backgroundColor: "#274733",
  },
  ios: {
    backgroundColor: "#274733",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#274733",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
  ...(isProduction
    ? {}
    : {
        server: {
          androidScheme: "https",
          cleartext: true,
          url: process.env.CAPACITOR_DEV_URL ?? "http://10.0.2.2:3000",
        },
      }),
};

export default config;
