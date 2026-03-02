import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
