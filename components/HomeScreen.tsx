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
  const [settingsOrigin, setSettingsOrigin] = useState({ x: 0, y: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const scheme = useTheme();
  const isDarkMode = scheme === 'dark';
  const pageTheme = THEME_PAGE[scheme];

  const handleOpenSettings = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setSettingsOrigin({
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

  return (
    <div
      className={`relative w-full min-h-[100dvh] overflow-hidden font-sans selection:bg-blue-500/30 ${pageTheme.pageBg}`}
    >
      <div
        className={`absolute inset-0 z-0 bg-gradient-to-b ${pageTheme.gradient} h-[58vh] pointer-events-none`}
        style={{
          borderBottomLeftRadius: '50% 12%',
          borderBottomRightRadius: '50% 12%',
        }}
      />

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
            origin={settingsOrigin}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
