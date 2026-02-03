'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Check, ChevronRight, Flame } from 'lucide-react';
import { WEEK_DAYS } from '@/lib/constants/home';

interface PlanSettingsProps {
  onClose: () => void;
  origin: { x: number; y: number };
  isDarkMode: boolean;
}

const FALLBACK_ORIGIN = { x: 0, y: 60 };

export default function PlanSettings({
  onClose,
  origin,
  isDarkMode,
}: PlanSettingsProps) {
  const [difficulty, setDifficulty] = useState('Beginner');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const startX =
    origin.x ||
    (typeof window !== 'undefined' ? window.innerWidth - 40 : 300);
  const startY = origin.y || FALLBACK_ORIGIN.y;

  const overlay = isDarkMode
    ? 'bg-gray-950 text-white'
    : 'bg-white text-slate-900';
  const headerBg = isDarkMode
    ? 'bg-gray-950/90 backdrop-blur-md'
    : 'bg-white/90 backdrop-blur-md';
  const leftBtn = isDarkMode
    ? 'bg-gray-800 text-white active:bg-gray-700'
    : 'bg-gray-100 text-slate-900 active:bg-gray-200';
  const sectionTitle = isDarkMode ? 'text-white' : 'text-slate-900';
  const goalCard =
    'from-apple-blue to-[#0066ff] shadow-xl shadow-blue-500/20';
  const difficultyTrack = isDarkMode ? 'bg-gray-800 p-1' : 'bg-gray-100 p-1';
  const difficultyInactive = isDarkMode
    ? 'text-gray-400 hover:text-gray-300'
    : 'text-gray-400 hover:text-gray-600';
  const dayPill =
    'bg-apple-blue text-white shadow-lg shadow-blue-500/20';
  const timeBox = isDarkMode
    ? 'bg-gray-800/80 border-gray-700'
    : 'bg-slate-50 border-slate-100';
  const timeRowBorder = isDarkMode
    ? 'border-gray-700'
    : 'border-slate-200/60';
  const timeLabel = isDarkMode ? 'text-gray-100' : 'text-slate-900';
  const timeValueBg = isDarkMode
    ? 'bg-gray-700 text-gray-100'
    : 'bg-slate-200/70 text-slate-900';
  const toggleTrack = remindersEnabled
    ? 'bg-apple-blue'
    : isDarkMode
      ? 'bg-gray-600'
      : 'bg-slate-300';

  return (
    <motion.div
      initial={{
        clipPath: `circle(0px at ${startX}px ${startY}px)`,
        opacity: 0,
      }}
      animate={{
        clipPath: `circle(150% at ${startX}px ${startY}px)`,
        opacity: 1,
      }}
      exit={{
        clipPath: `circle(0px at ${startX}px ${startY}px)`,
        opacity: 0,
      }}
      transition={{
        duration: 0.5,
        ease: [0.32, 0.72, 0, 1],
      }}
      className={`fixed inset-0 z-50 overflow-y-auto no-scrollbar ${overlay}`}
    >
      <div
        className={`sticky top-0 z-10 px-6 pt-12 pb-4 flex justify-between items-center ${headerBg}`}
      >
        <button
          type="button"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors touch-manipulation ${leftBtn}`}
          aria-label="More options"
        >
          <MoreHorizontal size={20} />
        </button>
        <h1 className={`text-lg font-bold ${sectionTitle}`}>Plan Settings</h1>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 bg-apple-blue hover:bg-apple-blue-hover rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all touch-manipulation"
          aria-label="Close"
        >
          <Check size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="px-6 pb-10 space-y-8">
        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Goal</h2>
          <div
            className={`bg-gradient-to-r ${goalCard} rounded-2xl p-4 flex items-center justify-between shadow-xl text-white cursor-pointer active:scale-[0.99] transition-transform touch-manipulation`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-inner">
                  <Flame size={18} className="text-orange-600 fill-orange-500" />
                </div>
              </div>
              <span className="font-bold text-lg">Lose Weight</span>
            </div>
            <ChevronRight size={24} className="text-white/80" />
          </div>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>
            Difficulty
          </h2>
          <div className={`${difficultyTrack} rounded-full flex relative`}>
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => {
              const isActive = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 relative z-10 ${
                    isActive ? 'text-white shadow-md' : difficultyInactive
                  }`}
                >
                  {level}
                  {isActive && (
                    <motion.div
                      layoutId="difficultyBg"
                      className="absolute inset-0 bg-apple-blue rounded-full -z-10"
                      transition={{
                        type: 'spring',
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Schedule</h2>
          <div className="flex justify-between items-center">
            {WEEK_DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                className={`w-10 h-10 rounded-full ${dayPill} font-bold text-sm flex items-center justify-center active:scale-90 transition-transform touch-manipulation`}
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>
            Workout Time
          </h2>
          <div
            className={`rounded-2xl overflow-hidden border ${timeBox}`}
          >
            <div
              className={`flex items-center justify-between p-4 border-b ${timeRowBorder}`}
            >
              <span className={`font-medium ${timeLabel}`}>Reminders</span>
              <button
                type="button"
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${toggleTrack}`}
                aria-label={remindersEnabled ? 'Disable' : 'Enable'}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    remindersEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className={`font-medium ${timeLabel}`}>Time</span>
              <div className={`px-3 py-1.5 rounded-lg ${timeValueBg}`}>
                <span className="font-semibold text-sm">7:00 PM</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
