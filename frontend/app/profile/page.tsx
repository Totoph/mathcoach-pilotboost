"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User2, LogOut, RotateCcw, Trash2, Bell, Volume2, CreditCard, Crown, XCircle, CheckCircle2, Tag } from "lucide-react";
import { getUser, signOut, supabase } from "@/lib/supabase";
import { api, SubscriptionStatus } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import PaywallPopup from "@/components/PaywallPopup";

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function init() {
      const currentUser = await getUser();
      if (!currentUser) {
        router.push("/auth");
        return;
      }
      setUser(currentUser);

      // If returning from Stripe checkout, verify the session
      const paymentParam = searchParams.get("payment");
      const sessionId = searchParams.get("session_id");
      if (paymentParam === "success" && sessionId) {
        try {
          await api.verifyCheckoutSession(sessionId);
          setPaymentSuccess(true);
          // Clean URL
          window.history.replaceState({}, "", "/profile");
          // Auto-hide after 5s
          setTimeout(() => setPaymentSuccess(false), 5000);
        } catch (e) {
          console.error("Verify session error:", e);
        }
      }

      // Load subscription status
      try {
        const sub = await api.getSubscriptionStatus();
        setSubscription(sub);
      } catch {}
      setLoading(false);
    }
    init();
  }, [router, searchParams]);

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  async function handleResetProgress() {
    try {
      // Reset by deleting skill snapshots & performances
      const userId = user?.id;
      if (userId) {
        await supabase.from("skill_snapshots").delete().eq("user_id", userId);
        await supabase.from("exercise_performances").delete().eq("user_id", userId);
      }
      setShowResetConfirm(false);
      router.push("/dashboard");
    } catch {
      setShowResetConfirm(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      await signOut();
      router.push("/");
    } catch {
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bento-card px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 font-medium">{t("loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  const providerIcon = user?.app_metadata?.provider === "google" ? "🔗 Google" : "✉️ Email";

  const planLabels: Record<string, string> = {
    free: t("profile_plan_free"),
    monthly: t("profile_plan_monthly"),
    yearly: t("profile_plan_yearly"),
    lifetime: t("profile_plan_lifetime"),
  };

  const planDesc: Record<string, string> = {
    free: t("profile_plan_desc_free"),
    monthly: t("profile_plan_desc_monthly"),
    yearly: t("profile_plan_desc_yearly"),
    lifetime: t("profile_plan_desc_lifetime"),
  };

  async function handleRedeemCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const result = await api.redeemCoupon(couponCode.trim());
      setCouponMessage({ type: "success", text: t("coupon_success").replace("{n}", String(result.extra_exercises)) });
      setCouponCode("");
      const sub = await api.getSubscriptionStatus();
      setSubscription(sub);
    } catch (e: any) {
      setCouponMessage({ type: "error", text: e.message || t("coupon_error") });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleCancelSubscription() {
    try {
      await api.cancelSubscription();
      const sub = await api.getSubscriptionStatus();
      setSubscription(sub);
      setShowCancelConfirm(false);
    } catch (e) {
      console.error("Cancel error:", e);
      setShowCancelConfirm(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Payment success banner */}
      {paymentSuccess && (
        <div className="bento-card p-4 bg-green-50 border-green-200 flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-green-800">{t("profile_payment_success") || "Paiement confirmé !"}</p>
            <p className="text-xs text-green-600">{t("profile_payment_success_desc") || "Votre abonnement est maintenant actif. Profitez de l'accès illimité !"}</p>
          </div>
        </div>
      )}

      {/* Paywall Popup */}
      <PaywallPopup
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSelectPlan={async (plan) => {
          try {
            const { checkout_url } = await api.createCheckout(plan);
            if (checkout_url) window.location.href = checkout_url;
          } catch (e) {
            console.error("Checkout error:", e);
          }
        }}
      />

      {/* Header */}
      <div className="bento-card p-6 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("profile_title")}</h1>
          <p className="text-sm text-slate-400">{t("profile_subtitle")}</p>
        </div>
      </div>

      {/* User Info */}
      <div className="bento-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <User2 className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="font-bold text-slate-900">{t("profile_info")}</h2>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="text-xs text-slate-400 font-medium">{t("profile_email")}</label>
            <div className="text-sm font-medium text-slate-900 mt-0.5">{user?.email}</div>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="text-xs text-slate-400 font-medium">{t("profile_connection")}</label>
            <div className="text-sm text-slate-700 mt-0.5">{providerIcon}</div>
          </div>
          <div className="p-3 bg-slate-50/80 rounded-xl">
            <label className="text-xs text-slate-400 font-medium">{t("profile_created")}</label>
            <div className="text-sm text-slate-700 mt-0.5">
              {new Date(user?.created_at).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="bento-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="font-bold text-slate-900">{t("profile_subscription")}</h2>
        </div>

        <div className="space-y-4">
            {/* Current plan */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {planLabels[subscription?.plan || "free"] || "Gratuit"}
                    </span>
                    {subscription?.active && subscription.plan !== "free" && (
                      <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 font-bold rounded-full">
                        {t("profile_plan_active")}
                      </span>
                    )}
                    {subscription?.cancel_at_period_end && (
                      <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 font-bold rounded-full">
                        ⏳
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {planDesc[subscription?.plan || "free"] || ""}
                  </p>
                  {subscription?.current_period_end && subscription.plan !== "free" && (
                    <p className="text-xs text-slate-400 mt-1">
                      {subscription.cancel_at_period_end ? t("profile_expires") : t("profile_renews")}{" "}
                      {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-slate-900">
                    {subscription?.total_exercises ?? 0}
                  </span>
                  <span className="text-xs text-slate-400">
                    /{(subscription?.plan || "free") === "free" ? (subscription?.exercises_limit ?? 300) : "∞"}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {/* Cancel subscription (only for monthly/yearly active subs) */}
              {subscription?.active && !subscription.cancel_at_period_end && 
               (subscription.plan === "monthly" || subscription.plan === "yearly") && (
                <>
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-red-50/80 hover:bg-red-100/80 text-red-600 transition-all text-left"
                    >
                      <XCircle className="w-4 h-4" />
                      <div>
                        <div className="text-sm font-semibold">{t("profile_cancel_sub")}</div>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700 font-medium mb-3">
                        {t("profile_cancel_confirm")}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleCancelSubscription}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-all">
                          {t("confirm")}
                        </button>
                        <button onClick={() => setShowCancelConfirm(false)}
                          className="px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50 transition-all">
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Coupon code */}
              {(!subscription || subscription.plan === "free" || subscription.cancel_at_period_end) && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponMessage(null); }}
                        onKeyDown={(e) => e.key === "Enter" && handleRedeemCoupon()}
                        placeholder={t("coupon_placeholder")}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <button
                      onClick={handleRedeemCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {couponLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t("coupon_apply")}
                    </button>
                  </div>
                  {couponMessage && (
                    <p className={`text-xs px-1 ${couponMessage.type === "success" ? "text-green-600" : "text-red-500"}`}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>
              )}

              {/* Upgrade / Passer Premium button */}
              {(!subscription || subscription.plan === "free" || subscription.cancel_at_period_end) && (
                <button
                  onClick={() => setShowPaywall(true)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all text-left shadow-md hover:shadow-lg"
                >
                  <Crown className="w-5 h-5 text-yellow-200" />
                  <div>
                    <div className="text-sm font-bold">{t("profile_upgrade")}</div>
                    <div className="text-xs text-amber-100">{t("profile_upgrade_desc")}</div>
                  </div>
                </button>
              )}
            </div>
          </div>
      </div>

      {/* Options */}
      <div className="bento-card p-6">
        <h2 className="font-bold text-slate-900 mb-4">{t("profile_options")}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">{t("profile_sound")}</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                soundEnabled ? "bg-primary" : "bg-slate-200"
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                soundEnabled ? "left-[22px]" : "left-0.5"
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">{t("profile_reminders")}</span>
            </div>
            <button
              onClick={() => setNotifEnabled(!notifEnabled)}
              className={`w-11 h-6 rounded-full transition-all duration-200 relative ${
                notifEnabled ? "bg-primary" : "bg-slate-200"
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                notifEnabled ? "left-[22px]" : "left-0.5"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bento-card p-6">
        <h2 className="font-bold text-slate-900 mb-4">{t("profile_management")}</h2>
        <div className="space-y-3">
          {/* Reset progress */}
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-orange-50/80 hover:bg-orange-100/80 text-orange-600 transition-all text-left"
            >
              <RotateCcw className="w-4 h-4" />
              <div>
                <div className="text-sm font-semibold">{t("profile_reset")}</div>
                <div className="text-xs text-orange-400 mt-0.5">{t("profile_reset_desc")}</div>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
              <p className="text-sm text-orange-700 font-medium mb-3">{t("profile_reset_confirm")}</p>
              <div className="flex gap-2">
                <button onClick={handleResetProgress} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-all">{t("confirm")}</button>
                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50 transition-all">{t("cancel")}</button>
              </div>
            </div>
          )}

          {/* Delete account */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-red-50/80 hover:bg-red-100/80 text-red-600 transition-all text-left"
            >
              <Trash2 className="w-4 h-4" />
              <div>
                <div className="text-sm font-semibold">{t("profile_delete")}</div>
                <div className="text-xs text-red-400 mt-0.5">{t("profile_delete_desc")}</div>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 font-medium mb-3">{t("profile_delete_confirm")}</p>
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-all">{t("delete")}</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50 transition-all">{t("cancel")}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="bento-card p-4 w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50/50 hover:border-red-200 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="font-semibold text-sm">{t("profile_logout")}</span>
      </button>
    </div>
  );
}
