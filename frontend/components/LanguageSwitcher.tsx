"use client";

import { useTranslation, Locale } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm hover:bg-white/90 transition-all"
      title={locale === "fr" ? "Switch to English" : "Passer en français"}
    >
      <span className="text-base leading-none">{locale === "fr" ? "\u{1F1EB}\u{1F1F7}" : "\u{1F1EC}\u{1F1E7}"}</span>
      <span className="text-slate-600">{locale === "fr" ? "FR" : "EN"}</span>
    </button>
  );
}
