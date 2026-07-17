import type { Metadata, Viewport } from "next";

import { AppProvider } from "@/providers/AppProvider";
import { ConfirmationProvider } from "@/shared/confirmation";
import { ToastProvider } from "@/shared/toast";

import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "NovaOPS",
  description: "NovaOPS Enterprise Operations Platform",
  applicationName: "NovaOps",
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
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <ToastProvider>
            <ConfirmationProvider>{children}</ConfirmationProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}

