import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HoneyBadger OS Dashboard",
  description: "Live agent dashboard for OpenClaw HoneyBadger stack",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
