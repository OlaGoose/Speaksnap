import {
  Camera,
  PenTool,
  Mic as MicIcon,
  BookOpen,
  MessageCircle,
  Coffee,
  Activity,
  Footprints,
  Dumbbell,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { DaySchedule, HomeTask } from '@/lib/types/home';

export const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const BASE_TASKS: Array<Omit<HomeTask, 'id'> & { key: string }> = [
  {
    key: 'scenarios',
    title: 'Speaking Practice',
    subtitle: 'Create a scenario and practice dialogue',
    href: '/camera',
    icon: Camera,
    iconColor: 'text-blue-600',
  },
  {
    key: 'diary',
    title: 'Diary',
    subtitle: 'Write and improve your English diary',
    href: '/library/diary',
    icon: PenTool,
    iconColor: 'text-purple-600',
  },
  {
    key: 'shadow',
    title: 'Shadow Reading',
    subtitle: 'Practice pronunciation with shadow technique',
    href: '/library/shadow',
    icon: MicIcon,
    iconColor: 'text-emerald-600',
  },
  {
    key: 'textbook',
    title: 'Textbook Study',
    subtitle: 'Learn with New Concept English courses',
    href: '/library/textbook',
    icon: BookOpen,
    iconColor: 'text-amber-600',
  },
];

function getTasksForDay(): HomeTask[] {
  return BASE_TASKS.map((t) => ({
    id: t.key,
    title: t.title,
    subtitle: t.subtitle,
    href: t.href,
    icon: t.icon,
    iconColor: t.iconColor,
  }));
}

const DAY_CONFIG: Array<{
  dayAbbr: string;
  fullDayName: string;
  icon: LucideIcon;
  iconBg: string;
  description: string;
}> = [
  {
    dayAbbr: 'M',
    fullDayName: 'Monday',
    icon: MessageCircle,
    iconBg: 'bg-sky-500',
    description:
      'Start the week with speaking practice and build confidence for real conversations.',
  },
  {
    dayAbbr: 'T',
    fullDayName: 'Tuesday',
    icon: PenTool,
    iconBg: 'bg-purple-500',
    description:
      'Reflect on your day in English. Diary writing helps vocabulary and expression.',
  },
  {
    dayAbbr: 'W',
    fullDayName: 'Wednesday',
    icon: MicIcon,
    iconBg: 'bg-emerald-500',
    description:
      'Shadow reading improves pronunciation and rhythm. Practice with daily challenges.',
  },
  {
    dayAbbr: 'T',
    fullDayName: 'Thursday',
    icon: BookOpen,
    iconBg: 'bg-amber-500',
    description:
      'Structured textbook study with NCE lessons. Build grammar and reading skills.',
  },
  {
    dayAbbr: 'F',
    fullDayName: 'Friday',
    icon: Activity,
    iconBg: 'bg-indigo-500',
    description:
      'Mix all four activities to reinforce what you learned this week.',
  },
  {
    dayAbbr: 'S',
    fullDayName: 'Saturday',
    icon: Footprints,
    iconBg: 'bg-rose-500',
    description:
      'Focus on speaking and shadow reading for fluency and pronunciation.',
  },
  {
    dayAbbr: 'S',
    fullDayName: 'Sunday',
    icon: Sparkles,
    iconBg: 'bg-teal-500',
    description:
      'Light review and diary. Prepare for the week ahead with a gentle routine.',
  },
];

/** Get subtitle for a day (Today / Yesterday / Tomorrow / DayName). Call at render time. */
export function getSubtitle(dayIndex: number): string {
  const now = new Date();
  const today = now.getDay();
  const mondayBased = today === 0 ? 6 : today - 1;
  const diff = dayIndex - mondayBased;
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return DAY_CONFIG[dayIndex].fullDayName;
}

export function getWeekLabel(): string {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7
  );
  return `Week ${weekNum}`;
}

export const DAILY_SCHEDULE: DaySchedule[] = DAY_CONFIG.map((config) => ({
  dayAbbr: config.dayAbbr,
  fullDayName: config.fullDayName,
  title: config.fullDayName,
  subtitle: '', // computed at render via getSubtitle(dayIndex)
  description: config.description,
  icon: config.icon,
  iconColor: config.iconBg,
  tasks: getTasksForDay(),
}));
