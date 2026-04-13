import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "HEC Campus Delivery",
  description:
    "Order Auchan groceries or book laundry service straight to your HEC Paris dorm. Pay with Revolut.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#002B5C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-hec-cream">
        <CartProvider>
          <Header />
          <main className="mx-auto max-w-xl px-4 pb-24 pt-4">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
