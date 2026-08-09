import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import { AppProvider } from "@/providers/AppProvider";
import { ConfirmationProvider } from "@/shared/confirmation";
import { ToastProvider } from "@/shared/toast";

import "./globals.css";
import "./print.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NovaOPS",
  description: "NovaOPS Enterprise Operations Platform",
  applicationName: "NovaOps",
  icons: {
    icon: [
      { url: "/novaops-icon.svg", type: "image/svg+xml" },
      { url: "/novaops-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/novaops-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/novaops-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "NovaOps",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#254E32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="font-sans antialiased">
        <AppProvider>
          <ToastProvider>
            <ConfirmationProvider>{children}</ConfirmationProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
