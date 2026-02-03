'use client';

import Link from 'next/link';
import { motion, type PanInfo } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import type { DaySchedule } from '@/lib/types/home';
import { getSubtitle } from '@/lib/constants/home';
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
  const isDark = cardTheme === 'dark';

  const cardBg = isDark ? 'bg-[#0F141E]' : 'bg-white';
  const cardBorder = isDark ? 'border-white/5' : 'border-gray-200/80';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const btnPrimary = isDark
    ? 'bg-[#0099ff] hover:bg-[#0088ee] shadow-blue-500/20'
    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/20';

  return (
    <motion.div
      className="absolute top-0 left-0 w-full h-full p-4 pb-32 flex flex-col min-h-0"
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
        className={`mt-2 flex-1 flex flex-col min-h-0 rounded-t-[2rem] p-6 shadow-2xl border-t relative overflow-hidden ${cardBg} ${cardBorder} ${isDark ? 'shadow-black/50' : 'shadow-gray-200/50'}`}
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
              <h2 className={`text-xl font-bold leading-tight ${textPrimary}`}>
                {day.title}
              </h2>
              <p className={`text-sm font-medium mt-1 ${textSecondary}`}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`transition-colors touch-manipulation ${isDark ? 'text-sky-500 hover:text-sky-400' : 'text-sky-600 hover:text-sky-500'}`}
            aria-label="More options"
          >
            <MoreHorizontal size={24} className="opacity-80" />
          </button>
        </div>

        <p className={`text-sm leading-relaxed mb-8 ${textSecondary}`}>
          {day.description}
        </p>

        <Link
          href="/library"
          className={`w-full ${btnPrimary} active:scale-[0.98] transition-all font-bold py-4 rounded-full flex items-center justify-center gap-2 shadow-lg group touch-manipulation`}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-white group-hover:translate-x-0.5 transition-transform"
            aria-hidden
          >
            <path d="M8 5v14l9-7-9-7z" />
          </svg>
          <span>View All Activities</span>
        </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar mt-4">
          <TaskList tasks={day.tasks} cardTheme={cardTheme} />
        </div>
      </div>
    </motion.div>
  );
}
