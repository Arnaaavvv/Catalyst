import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life OS",
  description: "A personal operating system for health, habits, goals, tasks, and academics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Runs before React hydrates, so the correct theme is on <html> for
            the very first paint — no light-mode flash while dark mode loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem("lifeos:dark");
                var isDark = stored === null ? true : stored === "1";
                document.documentElement.classList.toggle("dark", isDark);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}