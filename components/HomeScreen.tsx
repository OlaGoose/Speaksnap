'use client';

import { useState, useRef } from 'react';
import { AnimatePresence, type PanInfo } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { HomeTab } from '@/lib/types/home';
import { DAILY_SCHEDULE, getWeekLabel } from '@/lib/constants/home';
import WeekCalendar from './home/WeekCalendar';
import TaskCard from './home/TaskCard';
import BottomNav from './home/BottomNav';
import PlanSettings from './home/PlanSettings';

function getTodayDayIndex(): number {
  const now = new Date();
  const today = now.getDay();
  return today === 0 ? 6 : today - 1;
}

export default function HomeScreen() {
  const [currentDayIndex, setCurrentDayIndex] = useState(getTodayDayIndex());
  const [activeTab, setActiveTab] = useState<HomeTab>(HomeTab.PLAN);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [animationOrigin, setAnimationOrigin] = useState({ x: 0, y: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const theme = useTheme();
  const isDarkMode = theme === 'dark';

  const handleOpenSettings = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setAnimationOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    setIsSettingsOpen(true);
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      if (currentDayIndex < DAILY_SCHEDULE.length - 1) {
        setCurrentDayIndex(currentDayIndex + 1);
      }
    } else if (info.offset.x > threshold) {
      if (currentDayIndex > 0) {
        setCurrentDayIndex(currentDayIndex - 1);
      }
    }
  };

  const cardTheme = isDarkMode ? 'dark' : 'light';

  const pageBg = isDarkMode
    ? 'bg-gray-950 text-white'
    : 'bg-[#f0f0f4] text-gray-900';
  const gradient = 'from-[#00c6fb] via-[#005bea] to-[#0f172a]';
  const headerTitle = 'text-white';
  const headerSubtitle = 'text-blue-100/90';
  const settingsBtn = 'bg-white/20 hover:bg-white/30';
  const settingsIcon = 'text-white';

  return (
    <div
      className={`relative w-full min-h-[100dvh] overflow-hidden font-sans selection:bg-blue-500/30 ${pageBg}`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-b ${gradient} h-[38vh] pointer-events-none`}
        style={{
          borderBottomLeftRadius: '50% 3%',
          borderBottomRightRadius: '50% 3%',
        }}
      />

      <div className="relative z-10 h-full flex flex-col max-w-md mx-auto min-h-[100dvh]">
        <header className="px-6 pt-12 pb-2 safe-top">
          <div className="flex justify-end mb-3">
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={handleOpenSettings}
              className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors touch-manipulation z-20 ${settingsBtn}`}
              aria-label="Settings"
            >
              <SlidersHorizontal size={24} className={settingsIcon} />
            </button>
          </div>
          <div>
            <h1 className={`text-[2.7rem] font-extrabold tracking-tight mb-1.5 ${headerTitle}`}>
              Plan
            </h1>
            <p className={`text-[0.9rem] font-bold tracking-wider uppercase ${headerSubtitle}`}>
              Your weekly English plan · {getWeekLabel()}
            </p>
          </div>
        </header>

        <WeekCalendar
          selectedIndex={currentDayIndex}
          onSelectDay={setCurrentDayIndex}
          isDarkMode={isDarkMode}
        />

        <div className="relative flex-1 w-full min-h-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <TaskCard
              key={currentDayIndex}
              day={DAILY_SCHEDULE[currentDayIndex]}
              dayIndex={currentDayIndex}
              onDragEnd={handleDragEnd}
              cardTheme={cardTheme}
            />
          </AnimatePresence>
        </div>

        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDarkMode={isDarkMode}
        />

        <AnimatePresence>
          {isSettingsOpen && (
            <PlanSettings
              onClose={() => setIsSettingsOpen(false)}
              origin={animationOrigin}
              isDarkMode={isDarkMode}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
