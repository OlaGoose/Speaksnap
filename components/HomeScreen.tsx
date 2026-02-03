'use client';

import { useState, useRef } from 'react';
import { AnimatePresence, type PanInfo } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { HomeTab } from '@/lib/types/home';
import { DAILY_SCHEDULE, getWeekLabel } from '@/lib/constants/home';
import { THEME_PAGE } from '@/lib/constants/theme';
import { UserSidebar } from '@/components/layout/user-sidebar';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [animationOrigin, setAnimationOrigin] = useState({ x: 0, y: 0 });
  const scheme = useTheme();
  const isDarkMode = scheme === 'dark';
  const pageTheme = THEME_PAGE[scheme];

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

  const videoId = 'GecQwh2iwJY';
  const embedParams = 'autoplay=1&mute=1&loop=1&playlist=' + videoId + '&controls=0&showinfo=0&rel=0&playsinline=1';

  return (
    <div
      className={`relative w-full min-h-[100dvh] overflow-hidden font-sans selection:bg-blue-500/30 ${pageTheme.pageBg}`}
    >
      {/* Full-screen YouTube background (black before video loads) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'max(100vw, 177.78vh)',
            height: 'max(56.25vw, 100vh)',
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?${embedParams}`}
            title="Background video"
            className="absolute inset-0 w-full h-full pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {/* 蒙层 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col max-w-md mx-auto min-h-[100dvh]">
        <header className="px-6 pt-12 pb-2 safe-top">
          <div className="flex justify-end mb-4">
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={handleOpenSettings}
              className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors touch-manipulation z-20 ${pageTheme.settingsBtn}`}
              aria-label="Settings"
            >
              <SlidersHorizontal size={20} className={pageTheme.settingsIcon} />
            </button>
          </div>
          <div>
            <h1 className={`text-4xl font-extrabold tracking-tight mb-1 ${pageTheme.headerTitle}`}>
              Plan
            </h1>
            <p className={`text-xs font-bold tracking-wider uppercase ${pageTheme.headerSubtitle}`}>
              Your weekly English plan · {getWeekLabel()}
            </p>
          </div>
        </header>

        <WeekCalendar
          selectedIndex={currentDayIndex}
          onSelectDay={setCurrentDayIndex}
          isDarkMode={isDarkMode}
        />

        <div className="relative flex-1 w-full mt-4 min-h-0">
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
      </div>

      <UserSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <AnimatePresence>
        {isSettingsOpen && (
          <PlanSettings
            onClose={() => setIsSettingsOpen(false)}
            origin={animationOrigin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
