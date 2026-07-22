const config = {
  appId: "com.novaops.execution",
  appName: "NovaOps",
  webDir: "out",
  server: {
    androidScheme: "https",
    cleartext: true,
    // Dev WebView loads live Next.js (uncomment for emulator/device testing)
    url: "http://10.0.2.2:3000",
  },
};

export default config;
