export type DayOfWeek = '월' | '화' | '수' | '목' | '금' | '토' | '일';

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

export interface BreakTime {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  dayOfWeek?: DayOfWeek; // 특정 요일 ('월' ~ '일')
  days?: DayOfWeek[]; // 복수 요일 지정 (선택)
  date?: string; // "YYYY-MM-DD" 특정 날짜 예외 설정
  isException?: boolean; // 특정 날짜 예외 여부
}

export interface DDayItem {
  id: string;
  title: string;
  targetDate: string; // "YYYY-MM-DD"
  color?: string;
}

export type ThemeColorKey =
  | 'lavender'
  | 'lilac'
  | 'pink'
  | 'coral'
  | 'peach'
  | 'yellow'
  | 'mint'
  | 'sage'
  | 'sky'
  | 'blue'
  | 'beige'
  | 'slate'
  | string;

export interface CustomThemeItem {
  id: string;
  name: string;
  hex: string; // e.g. "#D26388"
}

export interface ThemeConfig {
  key: string;
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  bgSoft: string;
  borderSoft: string;
  accent: string;
  tagBg: string;
  tagText: string;
}

export interface UserSettings {
  themeColor: string;
  dayStartHour: number; // e.g. 6 (06:00)
  dayEndHour: number;   // e.g. 24 (24:00)
  timeSlotInterval: 15 | 30 | 60; // minutes
  breakTimes: BreakTime[];
  customThemes?: CustomThemeItem[];
  customSubjects?: string[];
  ddayList?: DDayItem[];
}

export interface StudySlot {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label?: string;
}

export interface Activity {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  title: string;
  subject?: string;
  memo?: string; // 활동 세부 메모
  color: string; // hex or pastel class
  isCompleted: boolean;
  hasCompletionCheck: boolean; // 식사/이동은 false, 문제풀이는 true
  isRepeating?: boolean;
  repeatDays?: DayOfWeek[];
  repeatIntervalWeeks?: number; // 1 = 매주, 2 = 2주마다
  priority?: 'high' | 'medium' | 'low';
}

export interface DailyNote {
  userId: string;
  date: string; // "YYYY-MM-DD"
  content: string;
  updatedAt: string;
}

export interface AIRecommendationRequest {
  title: string;
  subject?: string;
  memo?: string;
  durationMinutes: number; // 예상 시간 (분)
  priority?: 'high' | 'medium' | 'low';
  preferredTimeOfDay?: 'any' | 'morning' | 'afternoon' | 'evening' | 'night';
  targetDate: string; // "YYYY-MM-DD"
  userId: string;
}

export interface AIRecommendationResult {
  success: boolean;
  recommendedDate: string;
  recommendedStartTime: string;
  recommendedEndTime: string;
  reason: string;
  isOutsideStudySlot: boolean;
  encroachesBreakTime: boolean;
  breakTimeName?: string;
  hasConflict: boolean;
  conflictingActivities?: { id: string; title: string; startTime: string; endTime: string }[];
  requiresMovingExisting?: boolean;
  proposedChanges?: {
    action: 'add_new' | 'adjust_existing';
    description: string;
  }[];
  noSlotReason?: string;
  isEstimatedDuration?: boolean; // 예상 시간이 불확실하여 적절한 추정치로 계산된 경우
}

export interface RecommendedTaskItem {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  canFit: boolean;
  recommendedStartTime?: string;
  recommendedEndTime?: string;
  reason: string; // 과제별 추천 멘트
  isEstimatedDuration?: boolean;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  isOutsideStudySlot: boolean;
  encroachesBreak: boolean;
  encroachedBreakNames: string[];
  conflictingActivities: Activity[];
}
