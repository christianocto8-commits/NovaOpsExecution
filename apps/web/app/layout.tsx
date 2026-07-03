import type { Metadata } from "next";
import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "NovaOPS",
  description: "NovaOPS Enterprise Operations Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}