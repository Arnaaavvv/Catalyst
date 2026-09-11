import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life OS",
  description: "A personal operating system for health, habits, goals, tasks, and academics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
