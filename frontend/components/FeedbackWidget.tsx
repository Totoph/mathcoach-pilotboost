"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type FeedbackType = "general" | "feature" | "bug";
type Emoji = "😞" | "😕" | "😐" | "😊" | "😍";

const EMOJIS: Emoji[] = ["😞", "😕", "😐", "😊", "😍"];

export default function FeedbackWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [expandedTab, setExpandedTab] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("general");
  const [rating, setRating] = useState<Emoji | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedTab(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleTabClick(type: FeedbackType) {
    setFeedbackType(type);
    setExpandedTab(true);
    setOpen(true);
    setSent(false);
    setRating(null);
    setComment("");
  }

  async function handleSend() {
    if (!comment.trim() && !rating) return;
    setSending(true);
    try {
      // Store feedback in supabase
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("feedback").insert({
        user_id: user?.id || null,
        type: feedbackType,
        rating: rating || null,
        comment: comment.trim() || null,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Silent fail — we still show thanks
      console.error("Feedback send error:", e);
    }
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setOpen(false);
      setExpandedTab(false);
      setRating(null);
      setComment("");
    }, 2000);
  }

  function handleClose() {
    setOpen(false);
    setExpandedTab(false);
    setSent(false);
    setRating(null);
    setComment("");
  }

  const tabLabels: Record<FeedbackType, string> = {
    general: t("feedback_tab_general"),
    feature: t("feedback_tab_feature"),
    bug: t("feedback_tab_bug"),
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50" ref={panelRef}>
      {/* ─── Collapsed tabs (always visible when panel is closed) ─── */}
      {!expandedTab && (
        <>
          {/* Mobile: single icon button */}
          <button
            onClick={() => handleTabClick("general")}
            className="sm:hidden bg-white/90 backdrop-blur-xl border border-slate-200 rounded-l-xl p-2.5 text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 shadow-md"
            aria-label="Feedback"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Desktop: 3 text tabs */}
          <div className="hidden sm:flex flex-col gap-1.5">
            {(["general", "feature", "bug"] as FeedbackType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleTabClick(type)}
                className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-l-xl px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 shadow-md text-right whitespace-nowrap"
                style={{ writingMode: "horizontal-tb" }}
              >
                {tabLabels[type]}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ─── Expanded panel ─── */}
      {expandedTab && (
        <div className="mr-0 animate-fade-in-up">
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-l-2xl shadow-xl w-72 sm:w-80 overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-3">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{t("feedback_title")}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t("feedback_subtitle")}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Type selector pills */}
              <div className="flex gap-1.5 mt-3">
                {(["general", "feature", "bug"] as FeedbackType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setFeedbackType(type); setSent(false); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                      feedbackType === type
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {tabLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-sm font-medium text-slate-700">{t("feedback_thanks")}</p>
              </div>
            ) : (
              <div className="px-5 pb-5">
                {/* Emoji rating */}
                <div className="flex justify-center gap-3 mb-4">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setRating(emoji)}
                      className={`text-2xl transition-all duration-200 hover:scale-125 ${
                        rating === emoji
                          ? "scale-125 drop-shadow-md"
                          : rating
                          ? "opacity-40 hover:opacity-80"
                          : "hover:scale-110"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Comment label */}
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  {tabLabels[feedbackType]}
                </label>

                {/* Textarea */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("feedback_placeholder")}
                  className="w-full h-24 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    {t("feedback_cancel")}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || (!comment.trim() && !rating)}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-blue-600 transition-all disabled:opacity-40"
                  >
                    {sending ? "..." : t("feedback_send")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
