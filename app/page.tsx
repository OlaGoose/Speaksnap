'use client';

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components for better initial load performance
const HomeScreen = lazy(() => import('@/components/HomeScreen'));

export default function Home() {

  const LoadingFallback = () => (
    <div className="h-[100dvh] w-full bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl opacity-50 animate-pulse" />
        <Loader2 size={48} className="text-white animate-spin relative z-10" />
      </div>
      <h2 className="text-xl font-bold mb-2">Loading...</h2>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden min-h-[100dvh]">
      <Suspense fallback={<LoadingFallback />}>
        <HomeScreen />
      </Suspense>
    </div>
  );
}
