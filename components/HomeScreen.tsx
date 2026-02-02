'use client';

import React, { useState, useEffect } from 'react';
import { Screen } from '@/lib/types';
import { Check, Camera, PenTool, Mic as MicIcon, BookOpen, ChevronRight } from 'lucide-react';
import { storage } from '@/lib/utils/storage';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  onNavigateToLibrary: (tab: string) => void;
}

interface WeeklyTasks {
  scenarios: boolean;
  diary: boolean;
  shadow: boolean;
  textbook: boolean;
}

function getWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${year}_W${weekNum}`;
}

function getWeekDays(): Array<{ dayName: string; date: number; isToday: boolean }> {
  const now = new Date();
  const today = now.getDate();
  const currentDay = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Offset to get Monday of current week
  const weekDays = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + mondayOffset + i);
    weekDays.push({
      dayName: dayNames[i],
      date: day.getDate(),
      isToday: day.getDate() === today && day.getMonth() === now.getMonth(),
    });
  }
  return weekDays;
}

export default function HomeScreen({ onNavigate, onNavigateToLibrary }: HomeScreenProps) {
  const [tasks, setTasks] = useState<WeeklyTasks>({
    scenarios: false,
    diary: false,
    shadow: false,
    textbook: false,
  });
  const weekKey = getWeekKey();
  const weekDays = getWeekDays();

  useEffect(() => {
    (async () => {
      const key = `weekly_tasks_${weekKey}`;
      const saved = await storage.getItem<WeeklyTasks>(key);
      if (saved) setTasks(saved);
    })();
  }, [weekKey]);

  const toggleTask = async (taskName: keyof WeeklyTasks) => {
    const updated = { ...tasks, [taskName]: !tasks[taskName] };
    setTasks(updated);
    await storage.setItem(`weekly_tasks_${weekKey}`, updated);
  };

  const taskList: Array<{
    key: keyof WeeklyTasks;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    navigate: Screen | null;
    libraryTab?: string;
  }> = [
    {
      key: 'scenarios',
      title: 'Speaking Practice',
      subtitle: 'Create a scenario and practice dialogue',
      icon: <Camera size={18} className="text-blue-600" />,
      navigate: Screen.CAMERA,
    },
    {
      key: 'diary',
      title: 'Diary',
      subtitle: 'Write and improve your English diary',
      icon: <PenTool size={18} className="text-purple-600" />,
      navigate: null,
      libraryTab: 'diary',
    },
    {
      key: 'shadow',
      title: 'Shadow Reading',
      subtitle: 'Practice pronunciation with shadow technique',
      icon: <MicIcon size={18} className="text-emerald-600" />,
      navigate: null,
      libraryTab: 'shadow',
    },
    {
      key: 'textbook',
      title: 'Textbook Study',
      subtitle: 'Learn with New Concept English courses',
      icon: <BookOpen size={18} className="text-amber-600" />,
      navigate: null,
      libraryTab: 'textbook',
    },
  ];

  return (
    <div className="h-full bg-primary-50 flex flex-col overflow-y-auto">
      <div className="flex-1 px-4 py-8 pb-24 safe-bottom">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Notion-style page title */}
          <header className="pt-4">
            <h1 className="text-3xl font-semibold text-primary-900 tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-gray-500">
              Your weekly English learning plan.
            </p>
          </header>

          {/* Weekly calendar – Notion-style horizontal strip */}
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              This Week
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center rounded-xl px-2 py-3 transition-all ${
                    day.isToday
                      ? 'bg-primary-900 text-white shadow-md'
                      : 'bg-white border border-black/8 text-gray-600'
                  }`}
                >
                  <span className={`text-xs font-medium ${day.isToday ? 'text-white/80' : 'text-gray-500'}`}>
                    {day.dayName}
                  </span>
                  <span className={`text-lg font-semibold mt-1 ${day.isToday ? 'text-white' : 'text-primary-900'}`}>
                    {day.date}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Weekly tasks – Notion-style task list */}
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Weekly Goals
            </h2>
            <div className="space-y-2">
              {taskList.map((task) => (
                <div
                  key={task.key}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-black/8 px-4 py-3.5 hover:border-primary-200 hover:bg-primary-50/30 transition-all"
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task.key);
                    }}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all touch-manipulation ${
                      tasks[task.key]
                        ? 'bg-primary-900 border-primary-900'
                        : 'border-gray-300 hover:border-primary-400'
                    }`}
                    aria-label={`Toggle ${task.title}`}
                  >
                    {tasks[task.key] && <Check size={14} className="text-white" strokeWidth={3} />}
                  </button>

                  {/* Task icon */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center">
                    {task.icon}
                  </div>

                  {/* Task info – clickable to navigate */}
                  <button
                    type="button"
                    onClick={() => {
                      if (task.libraryTab) {
                        onNavigateToLibrary(task.libraryTab);
                      } else if (task.navigate) {
                        onNavigate(task.navigate);
                      }
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <span className="block text-sm font-medium text-primary-900">
                      {task.title}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {task.subtitle}
                    </span>
                  </button>

                  {/* Arrow on hover */}
                  <ChevronRight
                    size={18}
                    className="flex-shrink-0 text-gray-300 group-hover:text-primary-400 transition-colors"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Quick actions – optional section for direct navigation */}
          <section className="pt-4">
            <button
              type="button"
              onClick={() => onNavigate(Screen.LIBRARY)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:border-primary-200 hover:bg-primary-50/30 transition-all touch-manipulation"
            >
              View All Activities →
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
