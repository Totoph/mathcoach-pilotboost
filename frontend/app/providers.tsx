"use client";

import { I18nProvider } from "@/lib/i18n";
import FloatingMenuBar from "@/components/FloatingMenuBar";
import FeedbackWidget from "@/components/FeedbackWidget";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <FloatingMenuBar />
      <main className="pt-[72px] sm:pt-24 pb-2 px-3 sm:px-6 max-w-6xl mx-auto">{children}</main>
      <FeedbackWidget />
    </I18nProvider>
  );
}
