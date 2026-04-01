import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pretext Dog — Hungry Hungry Doggo",
  description: "Eat as many words as you can in 30 seconds. Climb the leaderboard!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
