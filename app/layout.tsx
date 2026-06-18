import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telovendo — Crea tu página y tienda en segundos",
  description:
    "Crea la página y tienda en línea de tu negocio en segundos con ayuda de IA, o sube tu producto a nuestro marketplace y nosotros lo vendemos por ti.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
