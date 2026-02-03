'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Folder, BookOpen, BarChart2, User } from 'lucide-react';
import { HomeTab } from '@/lib/types/home';
import { THEME_NAV } from '@/lib/constants/theme';

interface BottomNavProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  isDarkMode: boolean;
}

const TABS: Array<{
  id: HomeTab;
  icon: typeof Folder;
  label: string;
  path: string;
  badge?: number;
}> = [
  { id: HomeTab.PLAN, icon: Folder, label: 'Plan', path: '/' },
  { id: HomeTab.LIBRARY, icon: BookOpen, label: 'Library', path: '/library' },
  { id: HomeTab.PROGRESS, icon: BarChart2, label: 'Progress', path: '/' },
  { id: HomeTab.PROFILE, icon: User, label: 'Profile', path: '/' },
];

export default function BottomNav({
  activeTab,
  onTabChange,
  isDarkMode,
}: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabClick = (tab: (typeof TABS)[0]) => {
    onTabChange(tab.id);
    if (tab.path && tab.path !== pathname) {
      router.push(tab.path);
    }
  };

  const nav = THEME_NAV[isDarkMode ? 'dark' : 'light'];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 safe-bottom">
      <div
        className={`${nav.barBg} border rounded-[2.5rem] px-2 py-2 flex justify-between items-center shadow-2xl mx-auto max-w-md`}
      >
        {TABS.map((tab) => {
          const isActive =
            activeTab === tab.id ||
            (tab.path !== '/' && pathname.startsWith(tab.path));
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 touch-manipulation ${
                isActive ? nav.activePill : 'bg-transparent'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors duration-300 ${
                    isActive ? nav.activeIcon : nav.inactiveIcon
                  }`}
                />
                {tab.badge != null && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 ${nav.badgeBorder}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              {isActive && (
                <span
                  className={`text-xs font-bold whitespace-nowrap ${nav.activeLabel}`}
                >
                  {tab.label}
                </span>
              )}
              {!isActive && (
                <span className="sr-only text-[10px] font-medium">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
