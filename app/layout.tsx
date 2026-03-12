import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ChichaLoL | Perfil",
  description: "Analiza tu cuenta de League of Legends y descubre tu rol y campeones ideales."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
