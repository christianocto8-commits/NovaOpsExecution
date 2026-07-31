const isProduction = process.env.CAPACITOR_ENV === "production";
const isOffline = process.env.CAPACITOR_OFFLINE === "1";
const productionUrl = process.env.CAPACITOR_PRODUCTION_URL ?? "https://nova-ops.cloud";
const productionHost = new URL(productionUrl).hostname;

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.novaops.execution",
  appName: "NovaOps Outlet",
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
    ? isOffline
      ? {
          // Offline outlet-only build: ship the static bundle locally. The app
          // calls the production API by absolute URL (NEXT_PUBLIC_API_URL set
          // at build time). Requires the API CORS to allow the Capacitor
          // webview origin (http://localhost / capacitor://localhost).
        }
      : {
          // Wrapper mode: load the live production site directly so the native
          // app shares the same origin as the API (no CORS issues) and stays in
          // sync with web deployments. Outlet-only gating is enforced by the web
          // app (AuthProvider) once the web build is redeployed.
          server: {
            androidScheme: "https",
            url: productionUrl,
            cleartext: false,
            allowNavigation: [productionHost],
          },
        }
    : {
        server: {
          androidScheme: "https",
          cleartext: true,
          url: process.env.CAPACITOR_DEV_URL ?? "http://10.0.2.2:3000",
        },
      }),
};

export default config;
