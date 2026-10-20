import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Deportivo - App Oficial",
  description: "Plataforma de gestión de eventos, asistencias, lista de espera y estadísticas.",
  applicationName: "Club Deportivo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Club Deportivo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-neutral-900 text-neutral-900 flex justify-center`}
      >
        <div className="w-full max-w-md min-h-screen bg-neutral-50 flex flex-col shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
