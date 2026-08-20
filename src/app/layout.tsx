import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Cobro Claro · Gestión municipal",
    template: "%s · Cobro Claro",
  },
  description: "Gestión depurada de expedientes de cobro del municipio de Chía.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
