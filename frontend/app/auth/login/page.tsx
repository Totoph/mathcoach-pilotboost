"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signIn } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
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
          Retour
        </Link>

        <div className="bento-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Connexion</h1>
            <p className="text-sm text-slate-400">Accédez à votre espace MathCoach</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 text-sm transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 text-sm transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <p className="text-center text-sm text-slate-400 pt-2">
              Pas de compte ?{" "}
              <Link href="/auth/signup" className="text-primary font-medium hover:underline">
                S'inscrire
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
