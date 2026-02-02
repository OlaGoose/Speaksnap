'use client';

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const DialogueScreen = lazy(() => import('@/components/DialogueScreen'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="h-full w-full bg-primary-50 text-primary-900 flex flex-col items-center justify-center p-8 text-center">
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
      <Loader2 size={48} className="text-primary-900 animate-spin relative z-10" />
    </div>
    <h2 className="text-xl font-bold mb-2">Loading...</h2>
  </div>
);

export default function DialoguePage() {
  return (
    <div className="h-[100dvh] w-full bg-primary-50 overflow-hidden">
      <Suspense fallback={<LoadingFallback />}>
        <DialogueScreen />
      </Suspense>
    </div>
  );
}
