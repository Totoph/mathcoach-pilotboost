import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./providers";

export const metadata: Metadata = {
  title: "MathCoach by PilotBoost",
  description: "Entraînement au calcul mental avec coach IA adaptatif",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#F8FAFC]">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
