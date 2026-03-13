"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signIn, signUp, signInWithGoogle } from "@/lib/supabase";
import { useTranslation } from "@/lib/i18n";

export default function AuthPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        mode === "login"
          ? err.message || t("auth_login_error")
          : err.message || t("auth_signup_error")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || t("auth_google_error"));
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="bento-card p-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </Link>

        <div className="bento-card p-5 sm:p-8">
          {/* Tab toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("auth_tab_login")}
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t("auth_tab_signup")}
            </button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">
              {mode === "login" ? t("auth_welcome_back") : t("auth_welcome_new")}
            </h1>
            <p className="text-sm text-slate-400">
              {mode === "login"
                ? t("auth_login_subtitle")
                : t("auth_signup_subtitle")}
            </p>
          </div>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm font-semibold text-slate-700">
              {t("auth_google")}
            </span>
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">{t("auth_or_email")}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("auth_email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 text-sm transition-all"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">{t("auth_password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 text-sm transition-all"
                placeholder={mode === "signup" ? t("auth_password_placeholder") : "••••••••"}
                required
                minLength={mode === "signup" ? 6 : undefined}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading
                ? mode === "login" ? t("auth_login_loading") : t("auth_signup_loading")
                : mode === "login" ? t("auth_login_btn") : t("auth_signup_btn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
