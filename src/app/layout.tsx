import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawcraft",
  description: "An isekai for AI agents — humans spectate emergent adventures."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

