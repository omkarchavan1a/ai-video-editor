import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShortForge — AI shorts creator",
  description: "Turn long videos into publish-ready shorts. Vercel-native MVP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-neutral-800">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-extrabold">⚡ ShortForge</a>
            <nav className="flex gap-2 text-sm">
              <a className="btn2" href="/">Dashboard</a>
              <a className="btn2" href="https://build.nvidia.com" target="_blank" rel="noreferrer">Nvidia Build</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-neutral-500">
          Vercel-native MVP: video stays in your browser. Only transcript text is sent to the LLM. Never commit .env.local.
        </footer>
      </body>
    </html>
  );
}
