import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
