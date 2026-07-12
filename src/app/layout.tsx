import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Shift Rescuer",
    template: "%s | Shift Rescuer",
  },
  description: "Urgent volunteer shift cover for charities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">Shift Rescuer</Link>
          <Link href="/coordinator" className="header-link">Coordinator area</Link>
        </header>
        {children}
        <footer className="site-footer">
          Open-source software for urgent volunteer cover.
        </footer>
      </body>
    </html>
  );
}
