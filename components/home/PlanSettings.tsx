'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Check, ChevronRight, Target } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { WEEK_DAYS } from '@/lib/constants/home';

interface PlanSettingsProps {
  onClose: () => void;
  origin: { x: number; y: number };
}

export default function PlanSettings({ onClose, origin }: PlanSettingsProps) {
  const scheme = useTheme();
  const isDark = scheme === 'dark';
  const [difficulty, setDifficulty] = useState('Beginner');
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const fallbackX =
    typeof window !== 'undefined' ? window.innerWidth - 40 : 300;
  const fallbackY = 60;
  const startX = origin.x || fallbackX;
  const startY = origin.y || fallbackY;

  const overlay = isDark
    ? 'bg-gray-950 text-white'
    : 'bg-white text-slate-900';
  const headerBar = isDark
    ? 'bg-gray-950/90 backdrop-blur-md'
    : 'bg-white/90 backdrop-blur-md';
  const headerIconBtn = isDark
    ? 'bg-white/10 active:bg-white/20'
    : 'bg-gray-100 active:bg-gray-200';
  const sectionTitle = isDark ? 'text-white' : 'text-slate-900';
  const segmentBg = isDark ? 'bg-white/5' : 'bg-gray-100';
  const segmentBorder = isDark ? 'border-white/10' : 'border-slate-200/60';
  const segmentText = isDark ? 'text-white' : 'text-slate-900';
  const toggleTrack = remindersEnabled ? 'bg-apple-blue' : isDark ? 'bg-slate-600' : 'bg-slate-300';

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
        className={`sticky top-0 z-10 px-6 pt-12 pb-4 flex justify-between items-center safe-top ${headerBar}`}
      >
        <button
          type="button"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors touch-manipulation ${headerIconBtn}`}
          aria-label="More"
        >
          <MoreHorizontal size={20} className={isDark ? 'text-white' : 'text-slate-900'} />
        </button>
        <h1 className={`text-lg font-bold ${sectionTitle}`}>Plan Settings</h1>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 bg-apple-blue hover:bg-apple-blue-hover rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform touch-manipulation"
          aria-label="Done"
        >
          <Check size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="px-6 pb-10 space-y-8">
        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Goal</h2>
          <div
            className={`rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform bg-apple-blue text-white shadow-lg`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Target size={20} className="text-white" />
              </div>
              <span className="font-bold text-lg">Daily Practice</span>
            </div>
            <ChevronRight size={24} className="text-white/80" />
          </div>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Difficulty</h2>
          <div className={`p-1 rounded-full flex relative ${segmentBg}`}>
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => {
              const isActive = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 relative z-10 touch-manipulation ${
                    isActive
                      ? 'text-white shadow-md'
                      : isDark
                        ? 'text-slate-400 hover:text-slate-300'
                        : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {level}
                  {isActive && (
                    <motion.div
                      layoutId="planSettingsDifficultyBg"
                      className="absolute inset-0 bg-apple-blue rounded-full -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Schedule</h2>
          <div className="flex justify-between items-center gap-1">
            {WEEK_DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                className="w-10 h-10 rounded-full bg-apple-blue text-white font-bold text-sm flex items-center justify-center shadow-lg active:scale-90 transition-transform touch-manipulation"
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Practice Time</h2>
          <div className={`rounded-2xl overflow-hidden border ${segmentBg} ${segmentBorder}`}>
            <div
              className={`flex items-center justify-between p-4 border-b ${segmentBorder}`}
            >
              <span className={`font-medium ${segmentText}`}>Reminders</span>
              <button
                type="button"
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 touch-manipulation ${toggleTrack}`}
                aria-label={remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    remindersEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className={`flex items-center justify-between p-4`}>
              <span className={`font-medium ${segmentText}`}>Time</span>
              <div className={`${isDark ? 'bg-white/10' : 'bg-slate-200/70'} px-3 py-1.5 rounded-lg`}>
                <span className={`font-semibold text-sm ${segmentText}`}>7:00 PM</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
