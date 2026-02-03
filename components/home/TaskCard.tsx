/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-03 09:08:55
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-03 15:21:14
 * @FilePath: /v3/components/home/TaskCard.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import { motion, type PanInfo } from 'framer-motion';
import type { DaySchedule } from '@/lib/types/home';
import { THEME_CARD } from '@/lib/constants/theme';
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
  const t = THEME_CARD[cardTheme];

  return (
    <motion.div
      className="absolute top-0 left-0 w-full p-4 flex flex-col min-h-0"
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

        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <TaskList tasks={day.tasks} cardTheme={cardTheme} />
        </div>
      </div>
    </motion.div>
  );
}
