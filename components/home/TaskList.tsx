/*
 * @Author: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @Date: 2026-02-03 09:08:26
 * @LastEditors: meta-kk 11097094+teacher-kk@user.noreply.gitee.com
 * @LastEditTime: 2026-02-03 13:10:27
 * @FilePath: /v3/components/home/TaskList.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client';

import { useRouter } from 'next/navigation';
import type { HomeTask } from '@/lib/types/home';

interface TaskListProps {
  tasks: HomeTask[];
  cardTheme: 'dark' | 'light';
}

export default function TaskList({ tasks, cardTheme }: TaskListProps) {
  const router = useRouter();
  const isDark = cardTheme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-500';
  const bgIcon = isDark ? 'bg-gray-800' : 'bg-gray-100';

  return (
    <div className="mt-6 pb-24">
      <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>Today&apos;s Tasks</h3>
      <div className="space-y-3">
        {tasks.map((task) => {
          const Icon = task.icon;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => router.push(task.href)}
              className={`group w-full flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all text-left touch-manipulation ${
                isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'
              }`}
            >
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg ${bgIcon} flex items-center justify-center ${task.iconColor}`}
              >
                <Icon size={18} strokeWidth={2} />
              </div>
              <span className="flex-1 min-w-0">
                <span className={`block text-base font-medium ${textPrimary}`}>
                  {task.title}
                </span>
                <span className={`block text-sm mt-0.5 ${textSecondary}`}>
                  {task.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
