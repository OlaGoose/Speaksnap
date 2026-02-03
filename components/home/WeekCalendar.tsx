'use client';

import { motion } from 'framer-motion';
import { WEEK_DAYS } from '@/lib/constants/home';

interface WeekCalendarProps {
  selectedIndex: number;
  onSelectDay: (index: number) => void;
  isDarkMode: boolean;
}

export default function WeekCalendar({
  selectedIndex,
  onSelectDay,
  isDarkMode,
}: WeekCalendarProps) {
  return (
    <div className="flex justify-between items-center px-4 py-4 w-full max-w-md mx-auto relative z-10">
      {WEEK_DAYS.map((day, index) => {
        const isActive = index === selectedIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelectDay(index)}
            className="group flex flex-col items-center gap-2 relative focus:outline-none touch-manipulation min-w-[40px]"
            style={{ width: '40px' }}
            aria-label={`${day}, day ${index + 1}`}
            aria-pressed={isActive}
          >
            <div className="relative flex items-center justify-center w-10 h-10">
              {isActive && (
                <motion.div
                  layoutId="activeDayBackground"
                  className="absolute inset-0 rounded-2xl bg-white shadow-sm"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span
                className={`relative text-[1.05rem] font-semibold z-10 transition-colors duration-200 ${
                  isActive ? 'text-blue-600' : 'text-white/90'
                }`}
              >
                {day}
              </span>
            </div>
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                isActive ? 'bg-blue-600' : 'bg-white/40'
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
