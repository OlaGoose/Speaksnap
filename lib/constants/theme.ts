/** Plan Settings 中 Location 开关的 storage key，与 Camera 场景练习共用 */
export const PLAN_SETTINGS_LOCATION_KEY = 'plan_settings_location_enabled';

/** 等级（与 Camera 一致） */
export const SPEAK_SNAP_LEVEL_KEY = 'speakSnapLevel';

/** 练习模式 Daily | IELTS */
export const SPEAK_SNAP_PRACTICE_MODE_KEY = 'speakSnapPracticeMode';

/** AI 模型选择：auto | openai | gemini | doubao */
export const SPEAK_SNAP_AI_PROVIDER_KEY = 'speakSnapAiProvider';

export type AiProviderChoice = 'auto' | 'openai' | 'gemini' | 'doubao';

/**
 * 主题色（记录）：Apple 科技蓝，用于白天模式主按钮等。
 * - 主色: #007AFF (apple-blue)
 * - 悬停: #0066DD (apple-blue-hover)
 */
export const PRIMARY_BUTTON_BASE =
  'bg-apple-blue hover:bg-apple-blue-hover text-white shadow-lg active:scale-[0.98] transition-all font-semibold touch-manipulation';

/** 首页/卡片内全宽主按钮（如 View All Activities） */
export const PRIMARY_BUTTON_FULL =
  'w-full py-4 rounded-full flex items-center justify-center gap-2';

/** 子页面底部居中主按钮（FAB 样式） */
export const PRIMARY_BUTTON_FAB =
  'px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform min-h-[44px]';

/** 白天/夜间模式 */
export type ColorScheme = 'light' | 'dark';

/** 首页页面级：背景、渐变、头部、设置按钮 */
export const THEME_PAGE: Record<
  ColorScheme,
  {
    pageBg: string;
    gradient: string;
    headerTitle: string;
    headerSubtitle: string;
    settingsBtn: string;
    settingsIcon: string;
  }
> = {
  light: {
    pageBg: 'bg-[#f0f0f4] text-gray-900',
    gradient: 'from-[#00c6fb] via-[#005bea] to-[#0f172a]',
    headerTitle: 'text-white',
    headerSubtitle: 'text-blue-100/90',
    settingsBtn: 'bg-white/20 hover:bg-white/30',
    settingsIcon: 'text-white',
  },
  dark: {
    pageBg: 'bg-gray-950 text-white',
    gradient: 'from-[#00c6fb] via-[#005bea] to-[#0f172a]',
    headerTitle: 'text-white',
    headerSubtitle: 'text-blue-100/90',
    settingsBtn: 'bg-white/20 hover:bg-white/30',
    settingsIcon: 'text-white',
  },
};

/** 卡片/任务列表：背景、边框、文字、更多按钮、阴影 */
export const THEME_CARD: Record<
  ColorScheme,
  {
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    moreBtn: string;
    shadow: string;
    bgIcon: string;
    hoverRow: string;
  }
> = {
  light: {
    cardBg: 'bg-white',
    cardBorder: 'border-gray-200/80',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-500',
    moreBtn: 'text-sky-600 hover:text-sky-500',
    shadow: 'shadow-gray-200/50',
    bgIcon: 'bg-gray-100',
    hoverRow: 'hover:bg-black/5',
  },
  dark: {
    cardBg: 'bg-[#0F141E]',
    cardBorder: 'border-white/5',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-400',
    moreBtn: 'text-sky-500 hover:text-sky-400',
    shadow: 'shadow-black/50',
    bgIcon: 'bg-gray-800',
    hoverRow: 'hover:bg-white/5',
  },
};

/** 底部导航：背景、选中块、图标与文案、角标边框 */
export const THEME_NAV: Record<
  ColorScheme,
  {
    barBg: string;
    activePill: string;
    inactiveIcon: string;
    activeIcon: string;
    activeLabel: string;
    badgeBorder: string;
  }
> = {
  light: {
    barBg: 'bg-white/95 backdrop-blur-md border-gray-200/80',
    activePill: 'bg-gray-100',
    inactiveIcon: 'text-gray-500',
    activeIcon: 'text-blue-600',
    activeLabel: 'text-blue-600',
    badgeBorder: 'border-white',
  },
  dark: {
    barBg: 'bg-gray-900/95 backdrop-blur-md border-white/10',
    activePill: 'bg-white/15',
    inactiveIcon: 'text-slate-400',
    activeIcon: 'text-blue-400',
    activeLabel: 'text-blue-400',
    badgeBorder: 'border-gray-900',
  },
};
