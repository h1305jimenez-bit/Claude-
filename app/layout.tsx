import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";

export const metadata: Metadata = {
  title: "HEC Campus Delivery",
  description:
    "Order Auchan groceries or book laundry service straight to your HEC Paris dorm. Pay with Revolut.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0C2340",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-hec-ivory text-hec-ink">
        <CartProvider>
          <Header email={session?.email ?? null} />
          <main className="mx-auto max-w-xl px-4 pb-24 pt-4">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
