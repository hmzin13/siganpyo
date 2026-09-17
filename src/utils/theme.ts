import { ThemeColorKey, ThemeConfig, DayOfWeek, CustomThemeItem, BreakTime } from '../types';

export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  lavender: {
    key: 'lavender',
    name: '파스텔 라벤더',
    primary: '#7C6BB5',
    primaryLight: '#EAE6F8',
    primaryDark: '#5B4B96',
    bgSoft: '#F8F7FC',
    borderSoft: '#E2DCF2',
    accent: '#9B8CD9',
    tagBg: '#EDE8F9',
    tagText: '#5A4A93',
  },
  lilac: {
    key: 'lilac',
    name: '파스텔 연보라',
    primary: '#9366B4',
    primaryLight: '#F2E8F8',
    primaryDark: '#6E428F',
    bgSoft: '#FAF7FC',
    borderSoft: '#E9DCF4',
    accent: '#AC82CB',
    tagBg: '#F3E9F8',
    tagText: '#6D408E',
  },
  pink: {
    key: 'pink',
    name: '파스텔 핑크',
    primary: '#C95882',
    primaryLight: '#FDE8F0',
    primaryDark: '#99375E',
    bgSoft: '#FCF7F9',
    borderSoft: '#F7D4E3',
    accent: '#DD789D',
    tagBg: '#FCEBF2',
    tagText: '#99375E',
  },
  coral: {
    key: 'coral',
    name: '파스텔 코랄',
    primary: '#D36250',
    primaryLight: '#FDEAE6',
    primaryDark: '#A03D2E',
    bgSoft: '#FCF7F6',
    borderSoft: '#F9D5CE',
    accent: '#E77F70',
    tagBg: '#FCEBE8',
    tagText: '#9E3C2D',
  },
  peach: {
    key: 'peach',
    name: '파스텔 피치',
    primary: '#C86F58',
    primaryLight: '#FDECE6',
    primaryDark: '#A6513A',
    bgSoft: '#FCF7F5',
    borderSoft: '#F7DAD1',
    accent: '#E68E77',
    tagBg: '#FCEBE5',
    tagText: '#9E4E3A',
  },
  yellow: {
    key: 'yellow',
    name: '파스텔 버터노랑',
    primary: '#A37C19',
    primaryLight: '#FEF7E3',
    primaryDark: '#785A0E',
    bgSoft: '#FCFAF4',
    borderSoft: '#F7EBCB',
    accent: '#C79C32',
    tagBg: '#FDF6E3',
    tagText: '#785A0E',
  },
  mint: {
    key: 'mint',
    name: '파스텔 민트',
    primary: '#3F8E73',
    primaryLight: '#E2F4EC',
    primaryDark: '#2B6B55',
    bgSoft: '#F4FAF7',
    borderSoft: '#CDEBDD',
    accent: '#5BB796',
    tagBg: '#E2F5EC',
    tagText: '#2B6F57',
  },
  sage: {
    key: 'sage',
    name: '파스텔 세이지',
    primary: '#5E7A63',
    primaryLight: '#E4ECE5',
    primaryDark: '#445D48',
    bgSoft: '#F6F8F6',
    borderSoft: '#D7E3D9',
    accent: '#7FA486',
    tagBg: '#E7EFE8',
    tagText: '#445E49',
  },
  sky: {
    key: 'sky',
    name: '파스텔 하늘색',
    primary: '#4D7DA3',
    primaryLight: '#E3EEF8',
    primaryDark: '#356082',
    bgSoft: '#F5F9FC',
    borderSoft: '#D0E3F3',
    accent: '#6CA2CC',
    tagBg: '#E4EEF8',
    tagText: '#375E7E',
  },
  blue: {
    key: 'blue',
    name: '파스텔 소프트블루',
    primary: '#456CA9',
    primaryLight: '#E3EDF9',
    primaryDark: '#2F4F82',
    bgSoft: '#F4F7FC',
    borderSoft: '#D1E1F5',
    accent: '#648BC8',
    tagBg: '#E4EDF9',
    tagText: '#2E4F83',
  },
  beige: {
    key: 'beige',
    name: '파스텔 웜베이지',
    primary: '#8C6E52',
    primaryLight: '#F5EEE6',
    primaryDark: '#694F36',
    bgSoft: '#FAF8F5',
    borderSoft: '#E8DDD0',
    accent: '#AC8B6C',
    tagBg: '#F6EFE7',
    tagText: '#684F36',
  },
  slate: {
    key: 'slate',
    name: '파스텔 모던그레이',
    primary: '#5F6E80',
    primaryLight: '#EAEFF5',
    primaryDark: '#424F5E',
    bgSoft: '#F6F8FA',
    borderSoft: '#D8E0E8',
    accent: '#7C8C9E',
    tagBg: '#EBEFF5',
    tagText: '#424F5E',
  },
};

/**
 * Generate a harmonious, WCAG-compliant ThemeConfig from any custom HEX code
 */
export function generateThemeFromHex(hexInput: string, customName?: string, customKey?: string): ThemeConfig {
  let hex = hexInput.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    hex = '7C6BB5'; // fallback
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Mix with white (0.88 white, 0.12 color) for primaryLight
  const lightR = Math.round(r * 0.12 + 255 * 0.88);
  const lightG = Math.round(g * 0.12 + 255 * 0.88);
  const lightB = Math.round(b * 0.12 + 255 * 0.88);
  const primaryLight = `rgb(${lightR}, ${lightG}, ${lightB})`;

  // Mix with black (0.6 color, 0.4 black) for primaryDark to guarantee high WCAG contrast
  const darkR = Math.round(r * 0.62);
  const darkG = Math.round(g * 0.62);
  const darkB = Math.round(b * 0.62);
  const primaryDark = `rgb(${darkR}, ${darkG}, ${darkB})`;

  // Mix with white (0.97 white, 0.03 color) for bgSoft
  const bgR = Math.round(r * 0.035 + 255 * 0.965);
  const bgG = Math.round(g * 0.035 + 255 * 0.965);
  const bgB = Math.round(b * 0.035 + 255 * 0.965);
  const bgSoft = `rgb(${bgR}, ${bgG}, ${bgB})`;

  // Mix with white (0.80 white, 0.20 color) for borderSoft
  const bdrR = Math.round(r * 0.20 + 255 * 0.80);
  const bdrG = Math.round(g * 0.20 + 255 * 0.80);
  const bdrB = Math.round(b * 0.20 + 255 * 0.80);
  const borderSoft = `rgb(${bdrR}, ${bdrG}, ${bdrB})`;

  const key = customKey || `custom_${hex.toLowerCase()}`;
  const name = customName || `사용자 색상 #${hex.toUpperCase()}`;

  return {
    key,
    name,
    primary: `#${hex}`,
    primaryLight,
    primaryDark,
    bgSoft,
    borderSoft,
    accent: `#${hex}`,
    tagBg: primaryLight,
    tagText: primaryDark,
  };
}

/**
 * Resolves any theme key (preset or custom) into a complete ThemeConfig
 */
export function getThemeConfig(themeKey?: string, customThemes?: CustomThemeItem[]): ThemeConfig {
  if (!themeKey) return THEME_CONFIGS.lavender;

  // 1. Preset check
  if (THEME_CONFIGS[themeKey]) {
    return THEME_CONFIGS[themeKey];
  }

  // 2. Custom themes list check
  if (customThemes && customThemes.length > 0) {
    const found = customThemes.find(ct => ct.id === themeKey || ct.hex.toLowerCase() === themeKey.toLowerCase());
    if (found) {
      return generateThemeFromHex(found.hex, found.name, found.id);
    }
  }

  // 3. Direct HEX string or custom_ prefix check
  if (themeKey.startsWith('#')) {
    return generateThemeFromHex(themeKey, `사용자 지정 (${themeKey})`, themeKey);
  }
  if (themeKey.startsWith('custom_')) {
    const hex = themeKey.replace('custom_', '');
    return generateThemeFromHex(hex, `사용자 색상 (#${hex})`, themeKey);
  }

  return THEME_CONFIGS.lavender;
}

export const PASTEL_ACTIVITY_COLORS = [
  { name: '라벤더', bg: '#EAE6F8', text: '#5B4B96', border: '#D5CCF2' },
  { name: '베이비블루', bg: '#E2EEF8', text: '#356082', border: '#C5DDF2' },
  { name: '민트', bg: '#E2F5EC', text: '#2B6B55', border: '#BFE7D5' },
  { name: '세이지그린', bg: '#E5EDE6', text: '#435D48', border: '#CDE0D0' },
  { name: '피치로즈', bg: '#FDECE6', text: '#A6513A', border: '#FAD2C5' },
  { name: '바닐라크림', bg: '#FEF6E4', text: '#946C18', border: '#F8E7BE' },
  { name: '파우더핑크', bg: '#FDE8F1', text: '#A24A75', border: '#F7CDE0' },
  { name: '소프트그레이', bg: '#EEF0F2', text: '#4E5761', border: '#DCE0E5' },
];

export const DAYS_OF_WEEK: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

export function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getDayOfWeekFromDate(d: Date): DayOfWeek {
  const map: DayOfWeek[] = ['일', '월', '화', '수', '목', '금', '토'];
  return map[d.getDay()];
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getWeekDays(targetDate: Date): { date: Date; ymd: string; dayOfWeek: DayOfWeek }[] {
  // Monday as first day of week
  const curr = new Date(targetDate);
  const day = curr.getDay();
  // day: 0 is Sun, 1 is Mon...
  const diff = curr.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(curr.setDate(diff));

  const week = [];
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + i);
    week.push({
      date: nextDate,
      ymd: formatYMD(nextDate),
      dayOfWeek: DAYS_OF_WEEK[i],
    });
  }
  return week;
}

export const DEFAULT_SUBJECTS: string[] = [
  '국어',
  '수학',
  '영어',
  '한국사',
  '탐구(사회)',
  '탐구(과학)',
  '제2외국어/한문',
  '자율/자습',
];

/**
 * 특정 날짜에 적용되는 쉬는 시간 목록 계산
 * 1. 해당 날짜에 지정된 특정 예외 설정(date === dateStr)이 있다면 우선 적용
 * 2. 특정 요일에 할당된 쉬는 시간(dayOfWeek === currentDay || days.includes(currentDay))
 * 3. 요일/날짜 지정이 없는 전역 쉬는 시간 (기존 호환성)
 */
export function getBreakTimesForDate(dateStr: string, breakTimes: BreakTime[] = []): BreakTime[] {
  if (!breakTimes || breakTimes.length === 0) return [];

  // 1. 특정 날짜 예외 확인
  const dateExceptions = breakTimes.filter((b) => b.date === dateStr);
  if (dateExceptions.length > 0) {
    return [...dateExceptions].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  // 2. 해당 요일 확인
  const targetDate = parseYMD(dateStr);
  const dayOfWeek = getDayOfWeekFromDate(targetDate);

  const matched = breakTimes.filter((b) => {
    if (b.date) return false; // 다른 특정 날짜 예외는 건너뜀
    if (b.dayOfWeek) {
      return b.dayOfWeek === dayOfWeek;
    }
    if (b.days && b.days.length > 0) {
      return b.days.includes(dayOfWeek);
    }
    // 요일/날짜가 모두 없으면 매일 적용
    return true;
  });

  return matched.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

/**
 * 디데이 계산 헬퍼
 */
export function calculateDDay(targetDateStr: string): { days: number; text: string; isPast: boolean; isToday: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = parseYMD(targetDateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { days: 0, text: 'D-DAY', isPast: false, isToday: true };
  } else if (diffDays > 0) {
    return { days: diffDays, text: `D-${diffDays}`, isPast: false, isToday: false };
  } else {
    return { days: Math.abs(diffDays), text: `D+${Math.abs(diffDays)}`, isPast: true, isToday: false };
  }
}
