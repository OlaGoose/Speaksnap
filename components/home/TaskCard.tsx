/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-03 09:08:55
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-03 13:10:05
 * @FilePath: /v3/components/home/TaskCard.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import Link from 'next/link';
import { motion, type PanInfo } from 'framer-motion';
import { MoreHorizontal, Flame } from 'lucide-react';
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

        <p className={`text-sm leading-relaxed mb-6 ${t.textSecondary}`}>
          {day.description}
        </p>

        <Link
          href="/library"
          className={`${PRIMARY_BUTTON_BASE} ${PRIMARY_BUTTON_FULL} group`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-inner">
              <Flame size={18} className="text-orange-600 fill-orange-500" />
            </div>
          </div>
          <span className="text-[1.2rem]">Talk Now</span>
        </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <TaskList tasks={day.tasks} cardTheme={cardTheme} />
        </div>
      </div>
    </motion.div>
  );
}
