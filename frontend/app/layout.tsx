import type { Metadata } from "next";
import "./globals.css";
import FloatingMenuBar from "@/components/FloatingMenuBar";

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
      <body className="antialiased min-h-screen bg-[#F8FAFC]">
        <FloatingMenuBar />
        <main className="pt-24 pb-2 px-6 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
