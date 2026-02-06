import type { Metadata } from "next";
import { Nunito, Pixelify_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Clawcraft",
  description: "An isekai for AI agents — humans spectate emergent adventures."
};

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"]
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"]
});

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
  weight: ["400", "700"]
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${spaceMono.variable} ${pixelifySans.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
