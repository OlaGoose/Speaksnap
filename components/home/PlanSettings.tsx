'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Check, ChevronRight, Flame, MapPin, MapPinOff } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { storage } from '@/lib/utils/storage';
import type { UserLevel, PracticeMode, AiModelPreference } from '@/lib/types';

const STORAGE_LEVEL = 'speakSnapLevel';
const STORAGE_PRACTICE_MODE = 'speakSnapPracticeMode';
const STORAGE_MODEL = 'speakSnapModel';
const STORAGE_LOCATION_ENABLED = 'speakSnapLocationEnabled';

const DIFFICULTY_OPTIONS: UserLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const PRACTICE_OPTIONS: PracticeMode[] = ['Daily', 'IELTS'];
const MODEL_OPTIONS: { value: AiModelPreference; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'doubao', label: 'Doubao' },
];

interface PlanSettingsProps {
  onClose: () => void;
  origin: { x: number; y: number };
}

export default function PlanSettings({ onClose, origin }: PlanSettingsProps) {
  const scheme = useTheme();
  const isDark = scheme === 'dark';
  const [difficulty, setDifficulty] = useState<UserLevel>('Beginner');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('Daily');
  const [model, setModel] = useState<AiModelPreference>('auto');
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedLevel, savedMode, savedModel, savedLoc] = await Promise.all([
        storage.getItem<UserLevel>(STORAGE_LEVEL),
        storage.getItem<PracticeMode>(STORAGE_PRACTICE_MODE),
        storage.getItem<AiModelPreference>(STORAGE_MODEL),
        storage.getItem<boolean>(STORAGE_LOCATION_ENABLED),
      ]);
      if (savedLevel) setDifficulty(savedLevel);
      if (savedMode) setPracticeMode(savedMode);
      if (savedModel) setModel(savedModel);
      if (savedLoc != null) setLocationEnabled(savedLoc);
    })();
  }, []);

  useEffect(() => {
    storage.setItem(STORAGE_LEVEL, difficulty);
  }, [difficulty]);

  useEffect(() => {
    storage.setItem(STORAGE_PRACTICE_MODE, practiceMode);
  }, [practiceMode]);

  useEffect(() => {
    storage.setItem(STORAGE_MODEL, model);
  }, [model]);

  useEffect(() => {
    storage.setItem(STORAGE_LOCATION_ENABLED, locationEnabled);
  }, [locationEnabled]);

  const startX =
    origin.x ||
    (typeof window !== 'undefined' ? window.innerWidth - 40 : 300);
  const startY = origin.y || 60;

  const bg = isDark ? 'bg-gray-950' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const headerBg = isDark ? 'bg-gray-950/90' : 'bg-white/90';
  const sectionTitle = isDark ? 'text-white' : 'text-slate-900';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-100';
  const cardText = isDark ? 'text-gray-300' : 'text-gray-400';
  const accentBtn = 'bg-apple-blue hover:bg-apple-blue-hover text-white shadow-lg';
  const panelBg = isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-50 border-slate-100';
  const panelBorder = isDark ? 'border-gray-700' : 'border-slate-200/60';
  const toggleTrack = isDark ? 'bg-slate-600' : 'bg-slate-300';
  const rowBorder = isDark ? 'border-gray-700' : 'border-slate-200/60';

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
      className={`fixed inset-0 z-50 ${bg} ${text} overflow-y-auto no-scrollbar`}
    >
      <div
        className={`sticky top-0 ${headerBg} backdrop-blur-md z-10 px-6 pt-12 pb-4 flex justify-between items-center border-b ${rowBorder}`}
      >
        <button
          type="button"
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors touch-manipulation ${cardBg} ${isDark ? 'active:bg-gray-700' : 'active:bg-gray-200'}`}
          aria-label="More options"
        >
          <MoreHorizontal size={20} className={text} />
        </button>
        <h1 className={`text-lg font-bold ${sectionTitle}`}>Plan Settings</h1>
        <button
          type="button"
          onClick={onClose}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${accentBtn} active:scale-95 transition-transform touch-manipulation`}
          aria-label="Done"
        >
          <Check size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="px-6 pb-10 space-y-8 pt-2">
        <section>
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Goal</h2>
          <div
            className="rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-blue-500/20 text-white cursor-pointer active:scale-[0.99] transition-transform bg-gradient-to-r from-apple-blue to-apple-blue-hover"
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
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Difficulty</h2>
          <div className={`p-1 rounded-full flex relative ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {DIFFICULTY_OPTIONS.map((level) => {
              const isActive = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 relative z-10 ${
                    isActive ? 'text-white shadow-md' : `${cardText} ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-600'}`
                  }`}
                >
                  {level}
                  {isActive && (
                    <motion.div
                      layoutId="difficultyBg"
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
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Practice Type</h2>
          <div className={`p-1 rounded-full flex relative ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {PRACTICE_OPTIONS.map((mode) => {
              const isActive = practiceMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPracticeMode(mode)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 relative z-10 ${
                    isActive ? 'text-white shadow-md' : `${cardText} ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-600'}`
                  }`}
                >
                  {mode}
                  {isActive && (
                    <motion.div
                      layoutId="practiceTypeBg"
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
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Model</h2>
          <div className={`p-1 rounded-full flex gap-1 relative ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {MODEL_OPTIONS.map((opt) => {
              const isActive = model === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setModel(opt.value)}
                  className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 relative z-10 ${
                    isActive ? 'text-white shadow-md' : `${cardText} ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-600'}`
                  }`}
                >
                  {opt.label}
                  {isActive && (
                    <motion.div
                      layoutId="modelBg"
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
          <h2 className={`text-xl font-bold mb-4 ${sectionTitle}`}>Permission</h2>
          <div className={`rounded-2xl overflow-hidden border ${panelBg} ${panelBorder}`}>
            <div className="flex items-center justify-between p-4">
              <span className={`font-medium ${sectionTitle} flex items-center gap-2`}>
                {locationEnabled ? <MapPin size={20} /> : <MapPinOff size={20} />}
                Location
              </span>
              <button
                type="button"
                onClick={() => setLocationEnabled(!locationEnabled)}
                className={`toggle-switch w-12 h-7 rounded-full p-1 transition-colors duration-300 ${locationEnabled ? 'bg-apple-blue' : toggleTrack}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${locationEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
