import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { createClient } from "@/utils/supabase/server";
import { getActiveClub } from "@/utils/club";
import { getClubTheme, getClubThemeCssVariables } from "@/utils/theme";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Deportivo - App Oficial",
  description: "Plataforma de gestión de eventos, asistencias, lista de espera y estadísticas.",
  applicationName: "Club Deportivo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Club Deportivo",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Retrieve active club and permissions
  const activeContext = await getActiveClub(supabase);
  const isApproved = user ? activeContext.isApproved : false;
  const activeClub = activeContext.club;

  // Resolve 10-palette theme for the active club
  const palette = getClubTheme(activeClub);
  const themeVars = getClubThemeCssVariables(palette);

  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-neutral-950 text-neutral-900 flex justify-center selection:bg-club-primary selection:text-white`}
      >
        <div
          className="w-full max-w-md min-h-screen bg-neutral-50 flex flex-col shadow-2xl relative"
          style={themeVars as React.CSSProperties}
        >
          <NavigationProgressBar />
          {children}
          {(!user || isApproved) && (
            <BottomNav isAuthenticated={Boolean(user)} />
          )}
        </div>
      </body>
    </html>
  );
}
