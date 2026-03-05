"use client";

import { useState } from "react";
import { X, Crown, Check, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface PaywallPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectPlan: (plan: "monthly" | "yearly" | "lifetime") => void;
}

export default function PaywallPopup({ open, onClose, onSelectPlan }: PaywallPopupProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  async function handleSelect(plan: "monthly" | "yearly" | "lifetime") {
    setLoading(plan);
    await onSelectPlan(plan);
    setLoading(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <Crown className="w-10 h-10 text-yellow-300 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-white">{t("paywall_title")}</h2>
          <p className="text-blue-100 text-sm mt-1">{t("paywall_subtitle")}</p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3">
          {/* Monthly */}
          <button
            onClick={() => handleSelect("monthly")}
            disabled={loading !== null}
            className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-primary/50 hover:bg-blue-50/30 transition-all text-left group relative"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t("paywall_monthly")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t("paywall_monthly_desc")}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-slate-900">{t("paywall_monthly_price")}</span>
                <span className="text-xs text-slate-400">{t("paywall_monthly_period")}</span>
              </div>
            </div>
            {loading === "monthly" && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Yearly — Popular */}
          <button
            onClick={() => handleSelect("yearly")}
            disabled={loading !== null}
            className="w-full p-4 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left group relative"
          >
            <div className="absolute -top-2.5 left-4">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                <Sparkles className="w-3 h-3" />
                {t("paywall_yearly_badge")}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t("paywall_yearly")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t("paywall_yearly_desc")}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-primary">{t("paywall_yearly_price")}</span>
                <span className="text-xs text-slate-400">{t("paywall_yearly_period")}</span>
              </div>
            </div>
            {loading === "yearly" && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Lifetime */}
          <button
            onClick={() => handleSelect("lifetime")}
            disabled={loading !== null}
            className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-400/50 hover:bg-amber-50/30 transition-all text-left group relative"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t("paywall_lifetime")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{t("paywall_lifetime_desc")}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-slate-900">{t("paywall_lifetime_price")}</span>
                <span className="text-xs text-slate-400 ml-1">{t("paywall_lifetime_period")}</span>
              </div>
            </div>
            {loading === "lifetime" && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 text-center">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 transition-all">
            {t("paywall_restore")}
          </button>
        </div>
      </div>
    </div>
  );
}
