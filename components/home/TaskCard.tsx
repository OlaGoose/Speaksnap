'use client';

import Link from 'next/link';
import { motion, type PanInfo } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import type { DaySchedule } from '@/lib/types/home';
import { getSubtitle } from '@/lib/constants/home';
import { PRIMARY_BUTTON_BASE, PRIMARY_BUTTON_FULL, THEME_CARD } from '@/lib/constants/theme';
import TaskList from './TaskList';

interface TaskCardProps {
  day: DaySchedule;
  dayIndex: number;
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => void;
  cardTheme: 'dark' | 'light';
}

export default function TaskCard({
  day,
  dayIndex,
  onDragEnd,
  cardTheme,
}: TaskCardProps) {
  const subtitle = getSubtitle(dayIndex);
  const Icon = day.icon;
  const t = THEME_CARD[cardTheme];

  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full p-4 flex flex-col min-h-0"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div
        className={`flex-1 flex flex-col min-h-0 rounded-[2rem] p-6 shadow-2xl border relative overflow-hidden ${t.cardBg} ${t.cardBorder} ${t.shadow}`}
      >
        <div className="flex-shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4">
            <div
              className={`w-14 h-14 rounded-2xl ${day.iconColor} flex items-center justify-center shadow-lg`}
            >
              <Icon className="text-white w-8 h-8" strokeWidth={2} />
            </div>
            <div>
              <h2 className={`text-xl font-bold leading-tight ${t.textPrimary}`}>
                {day.title}
              </h2>
              <p className={`text-sm font-medium mt-1 ${t.textSecondary}`}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`transition-colors touch-manipulation ${t.moreBtn}`}
            aria-label="More options"
          >
            <MoreHorizontal size={24} className="opacity-80" />
          </button>
        </div>

        <p className={`text-sm leading-relaxed mb-8 ${t.textSecondary}`}>
          {day.description}
        </p>

        <Link
          href="/library"
          className={`${PRIMARY_BUTTON_BASE} ${PRIMARY_BUTTON_FULL} group`}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-white group-hover:translate-x-0.5 transition-transform flex-shrink-0"
            aria-hidden
          >
            <path d="M8 5v14l9-7-9-7z" />
          </svg>
          <span className="text-[1.2rem]">View All Activities</span>
        </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <TaskList tasks={day.tasks} cardTheme={cardTheme} />
        </div>
      </div>
    </motion.div>
  );
}
