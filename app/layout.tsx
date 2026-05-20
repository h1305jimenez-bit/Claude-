import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Applykit — Know what you're walking into. Apply in 3 minutes.",
  description:
    "Applykit fetches jobs matched to your CV, scores them, and generates a full application kit — cover letter, tailored CV, and screening answers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-inter min-h-screen bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
