import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ApplyPilot — Know what you're walking into. Apply in 3 minutes.",
  description:
    "ApplyPilot fetches jobs matched to your CV, scores them, and generates a full application kit — cover letter, tailored CV, and screening answers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="font-dm-sans min-h-screen bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
