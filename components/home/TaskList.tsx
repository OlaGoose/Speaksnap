/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-03 09:08:26
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-03 15:23:06
 * @FilePath: /v3/components/home/TaskList.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import Link from 'next/link';
import type { HomeTask } from '@/lib/types/home';

interface TaskListProps {
  tasks: HomeTask[];
  cardTheme: 'dark' | 'light';
}

export default function TaskList({ tasks, cardTheme }: TaskListProps) {
  const isDark = cardTheme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const logoBg = isDark ? 'bg-white/10' : 'bg-gray-100';

  return (
    <div className="mt-4">
      <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Today&apos;s Tasks</h3>
      <div className="space-y-1">
        {tasks.map((task) => {
          const Icon = task.icon;
          return (
            <Link
              key={task.id}
              href={task.href}
              className={`group w-full flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors text-left touch-manipulation ${
                isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
              }`}
            >
              <div
                className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${logoBg} ${task.iconColor}`}
              >
                <Icon size={20} strokeWidth={2} />
              </div>
              <span className="flex-1 min-w-0">
                <span className={`block text-base font-medium ${textPrimary}`}>
                  {task.title}
                </span>
                {task.subtitle ? (
                  <span className={`block text-sm mt-0.5 ${textSecondary}`}>
                    {task.subtitle}
                  </span>
                ) : null}
              </span>
              <span aria-hidden className="flex-shrink-0 text-lg font-medium text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all">
                →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
