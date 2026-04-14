import type { Metadata, Viewport } from "next";
import { AuthProvider } from "../contexts/AuthContext";
import { ServiceWorkerRegistrar } from "../components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatty",
  description: "AI Roleplay Chat",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chatty",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-512.png" />
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

