import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/components/layout/app-chrome";

export const metadata: Metadata = {
  title: "DataForge AI — Intelligent Data Pipeline",
  description:
    "Transform natural language into structured, source-backed datasets with AI-powered extraction, validation, and deduplication.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-void text-text-primary antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}