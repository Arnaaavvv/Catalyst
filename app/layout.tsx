import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catalyst",
  description: "A personal operating system for health, habits, goals, tasks, and academics.",
};

// Android Chrome: shrink the layout (not just the visual viewport) when the
// keyboard opens, so bottom sheets sit above it. iOS ignores this; see useKeyboardFit.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before React hydrates, so the correct theme is on <html> for
            the very first paint — no light-mode flash while dark mode loads.
            suppressHydrationWarning is required here specifically because
            this script intentionally makes the live DOM differ from the
            server-rendered markup for this one attribute; without it React
            logs a hydration-mismatch error every load even though nothing
            is actually broken. This only suppresses the warning for this
            element's direct attributes, not for any mismatch deeper in
            the tree. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem("catalyst:dark");
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