import type { Metadata } from "next";

import { AppProvider } from "@/providers/AppProvider";
import { ConfirmationProvider } from "@/shared/confirmation";
import { ToastProvider } from "@/shared/toast";

import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "NovaOPS",
  description: "NovaOPS Enterprise Operations Platform",
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

