import { Suspense } from "react";
import TrainClient from "./TrainClient";

export default function TrainPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="bento-card px-8 py-6 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 font-medium">Chargement...</span>
          </div>
        </div>
      }
    >
      <TrainClient />
    </Suspense>
  );
}
