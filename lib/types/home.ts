import type { LucideIcon } from 'lucide-react';

export interface HomeTask {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  iconColor: string;
}

export interface DaySchedule {
  dayAbbr: string;
  fullDayName: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  tasks: HomeTask[];
}

export enum HomeTab {
  PLAN = 'Plan',
  LIBRARY = 'Library',
  PROGRESS = 'Progress',
  PROFILE = 'Profile',
}
