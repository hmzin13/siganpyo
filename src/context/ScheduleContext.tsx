import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import {
  Activity,
  StudySlot,
  UserSettings,
  DailyNote,
  DayOfWeek,
  ConflictCheckResult,
} from '../types';
import { useAuth } from './AuthContext';
import {
  formatYMD,
  getDayOfWeekFromDate,
  parseYMD,
  timeToMinutes,
  getBreakTimesForDate,
  DEFAULT_SUBJECTS,
} from '../utils/theme';

interface WarningToastData {
  message: string;
  details?: string;
  conflictingActivities?: { id: string; title: string; startTime: string; endTime: string }[];
}

interface ScheduleContextType {
  settings: UserSettings;
  activities: Activity[];
  studySlots: StudySlot[];
  dailyNotes: Record<string, DailyNote>;
  anniversaries: Record<string, string>; // Add anniversaries
  currentDate: string;
  setCurrentDate: (date: string) => void;
  activeView: 'daily' | 'weekly' | 'calendar' | 'settings';
  setActiveView: (view: 'daily' | 'weekly' | 'calendar' | 'settings') => void;
  dailyViewMode: 'timeline' | 'table';
  setDailyViewMode: (mode: 'timeline' | 'table') => void;
  warningToast: WarningToastData | null;
  dismissWarningToast: () => void;
  isLoadingData: boolean;

  // Actions
  addActivity: (activity: Omit<Activity, 'id' | 'userId'>) => Promise<boolean>;
  updateActivity: (activity: Activity) => Promise<boolean>;
  deleteActivity: (id: string) => Promise<boolean>;
  deleteActivities: (ids: string[]) => Promise<boolean>;
  copyActivity: (activity: Activity, targetDate?: string, targetStartTime?: string, targetEndTime?: string) => Promise<boolean>;
  toggleActivityCompletion: (id: string) => Promise<boolean>;

  addStudySlot: (slot: Omit<StudySlot, 'id' | 'userId'>) => Promise<boolean>;
  updateStudySlot: (slot: StudySlot) => Promise<boolean>;
  deleteStudySlot: (id: string) => Promise<boolean>;

  updateSettings: (newSettings: Partial<UserSettings>) => Promise<boolean>;
  saveDailyNote: (date: string, content: string) => Promise<boolean>;
  saveAnniversary: (date: string, content: string) => Promise<boolean>; // Add saveAnniversary

  // Check helpers
  checkConflicts: (dateStr: string, startTime: string, endTime: string, ignoreActivityId?: string) => ConflictCheckResult;
  exportTimetableImage: (elementId: string, filenamePrefix?: string) => Promise<boolean>;

  // Modal helpers
  activityModalOpen: boolean;
  setActivityModalOpen: (open: boolean) => void;
  editingActivity: Activity | null;
  setEditingActivity: (activity: Activity | null) => void;
  prefilledTime: { startTime?: string; endTime?: string; date?: string } | null;
  setPrefilledTime: (data: { startTime?: string; endTime?: string; date?: string } | null) => void;

  studySlotModalOpen: boolean;
  setStudySlotModalOpen: (open: boolean) => void;
  targetDayForStudySlot: DayOfWeek | null;
  setTargetDayForStudySlot: (day: DayOfWeek | null) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  themeColor: 'lavender',
  dayStartHour: 7,
  dayEndHour: 24,
  timeSlotInterval: 30,
  breakTimes: [
    { id: 'b1', name: '점심 휴식', startTime: '12:00', endTime: '13:00' },
    { id: 'b2', name: '저녁 휴식', startTime: '18:00', endTime: '19:00' },
  ],
  customSubjects: DEFAULT_SUBJECTS,
  ddayList: [
    { id: 'dday-1', title: '2027 대학수학능력시험', targetDate: '2026-11-19', color: '#7C6BB5' },
    { id: 'dday-2', title: '9월 모의평가', targetDate: '2026-09-24', color: '#D36250' },
  ],
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [studySlots, setStudySlots] = useState<StudySlot[]>([]);
  const [dailyNotes, setDailyNotes] = useState<Record<string, DailyNote>>({});
  const [anniversaries, setAnniversaries] = useState<Record<string, string>>({}); // New storage for Date-based Notes/Anniversaries
  const [currentDate, setCurrentDate] = useState<string>(() => formatYMD(new Date()));
  const [activeView, setActiveView] = useState<'daily' | 'weekly' | 'calendar' | 'settings'>('daily');
  const [dailyViewMode, setDailyViewMode] = useState<'timeline' | 'table'>('timeline');
  const [warningToast, setWarningToast] = useState<WarningToastData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Modals state
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [prefilledTime, setPrefilledTime] = useState<{ startTime?: string; endTime?: string; date?: string } | null>(null);

  const [studySlotModalOpen, setStudySlotModalOpen] = useState(false);
  const [targetDayForStudySlot, setTargetDayForStudySlot] = useState<DayOfWeek | null>(null);

  // Load user data from server
  const loadUserData = useCallback(async (userId: string) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/user/data?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings,
          });
        }
        setActivities(data.activities || []);
        setStudySlots(data.studySlots || []);
        setDailyNotes(data.dailyNotes || {});
        setAnniversaries(data.anniversaries || {}); // Load anniversaries
      }
    } catch (err) {
      console.error('Failed to load user schedule data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.id) {
      loadUserData(user.id);
    } else {
      // Clear in-memory active data when logged out (server copy remains intact)
      setActivities([]);
      setStudySlots([]);
      setDailyNotes({});
      setAnniversaries({}); // Clear anniversaries
      setSettings(DEFAULT_SETTINGS);
    }
  }, [user, loadUserData]);

  const dismissWarningToast = () => {
    setWarningToast(null);
  };

  // Conflict and constraint checking engine
  const checkConflicts = useCallback(
    (dateStr: string, startTime: string, endTime: string, ignoreActivityId?: string): ConflictCheckResult => {
      const sMin = timeToMinutes(startTime);
      const eMin = timeToMinutes(endTime);
      const targetDate = parseYMD(dateStr);
      const dayOfWeek = getDayOfWeekFromDate(targetDate);

      // 1. Check existing activities on this date or repeating on this day
      const conflictingActivities = activities.filter((act) => {
        if (ignoreActivityId && act.id === ignoreActivityId) return false;
        const matchesDate = act.date === dateStr;
        const matchesRepeat = act.isRepeating && act.repeatDays && act.repeatDays.includes(dayOfWeek);

        if (!matchesDate && !matchesRepeat) return false;

        const actStart = timeToMinutes(act.startTime);
        const actEnd = timeToMinutes(act.endTime);

        // Overlap condition: start < actEnd && end > actStart
        return Math.max(sMin, actStart) < Math.min(eMin, actEnd);
      });

      // 2. Check breaks for this specific date / day of week
      const encroachedBreakNames: string[] = [];
      const applicableBreaks = getBreakTimesForDate(dateStr, settings.breakTimes || []);
      for (const b of applicableBreaks) {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        if (Math.max(sMin, bStart) < Math.min(eMin, bEnd)) {
          encroachedBreakNames.push(b.name);
        }
      }

      // 3. Check study slots for this day of week
      const daySlots = studySlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
      let isOutsideStudySlot = false;
      if (daySlots.length > 0) {
        // Must fit inside at least one study slot to be "inside"
        const fitsInsideAnySlot = daySlots.some((slot) => {
          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);
          return sMin >= slotStart && eMin <= slotEnd;
        });
        isOutsideStudySlot = !fitsInsideAnySlot;
      }

      return {
        hasConflict: conflictingActivities.length > 0,
        isOutsideStudySlot,
        encroachesBreak: encroachedBreakNames.length > 0,
        encroachedBreakNames,
        conflictingActivities,
      };
    },
    [activities, settings.breakTimes, studySlots]
  );

  // Trigger non-blocking bottom-right warning if constraints are breached
  const triggerWarningIfApplicable = (check: ConflictCheckResult) => {
    if (check.isOutsideStudySlot || check.encroachesBreak || check.hasConflict) {
      const detailsArr: string[] = [];
      if (check.encroachesBreak) {
        detailsArr.push(`쉬는 시간(${check.encroachedBreakNames.join(', ')})`);
      }
      if (check.isOutsideStudySlot) {
        detailsArr.push('자습 시간대 밖');
      }
      if (check.hasConflict) {
        const names = check.conflictingActivities.map((c) => `[${c.title}]`).join(', ');
        detailsArr.push(`기존 일정(${names})과 겹침`);
      }

      setWarningToast({
        message: '설정한 자습 가능 시간 밖이거나 쉬는 시간을 침범합니다.',
        details: detailsArr.join(' / '),
        conflictingActivities: check.conflictingActivities.map((a) => ({
          id: a.id,
          title: a.title,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }
  };

  // Add Activity
  const addActivity = async (newActData: Omit<Activity, 'id' | 'userId'>): Promise<boolean> => {
    if (!user) return false;

    const newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newActivity: Activity = {
      ...newActData,
      id: newId,
      userId: user.id,
    };

    const updated = [...activities, newActivity];
    setActivities(updated);

    // Save to server
    try {
      await fetch('/api/user/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, activities: updated }),
      });
    } catch (e) {
      console.error('Failed to sync activity to server:', e);
    }

    // Check warning (non-blocking)
    const check = checkConflicts(newActivity.date, newActivity.startTime, newActivity.endTime);
    triggerWarningIfApplicable(check);

    return true;
  };

  // Update Activity
  const updateActivity = async (updatedAct: Activity): Promise<boolean> => {
    if (!user) return false;

    const updated = activities.map((a) => (a.id === updatedAct.id ? updatedAct : a));
    setActivities(updated);

    try {
      await fetch('/api/user/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, activities: updated }),
      });
    } catch (e) {
      console.error('Failed to sync updated activity:', e);
    }

    const check = checkConflicts(updatedAct.date, updatedAct.startTime, updatedAct.endTime, updatedAct.id);
    triggerWarningIfApplicable(check);

    return true;
  };

  // Delete Activity
  const deleteActivities = async (ids: string[]): Promise<boolean> => {
    if (!user) return false;

    const updated = activities.filter((a) => !ids.includes(a.id));
    setActivities(updated);

    try {
      await fetch('/api/user/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, activities: updated }),
      });
    } catch (e) {
      console.error('Failed to sync delete activities:', e);
    }
    return true;
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    return await deleteActivities([id]);
  };

  // Copy Activity (Requirement 4: 원래 제목 그대로 유지, 독립된 일정으로 생성)
  const copyActivity = async (
    sourceAct: Activity,
    targetDate?: string,
    targetStartTime?: string,
    targetEndTime?: string
  ): Promise<boolean> => {
    if (!user) return false;

    const copiedDate = targetDate || sourceAct.date;
    const newId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const copied: Activity = {
      ...sourceAct,
      id: newId,
      userId: user.id,
      date: copiedDate,
      startTime: targetStartTime || sourceAct.startTime,
      endTime: targetEndTime || sourceAct.endTime,
      title: sourceAct.title, // Keep title identical without '(복사본)'
      isCompleted: false,
    };

    const updated = [...activities, copied];
    setActivities(updated);

    try {
      await fetch('/api/user/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, activities: updated }),
      });
    } catch (e) {
      console.error('Failed to sync copied activity:', e);
    }

    const check = checkConflicts(copied.date, copied.startTime, copied.endTime);
    triggerWarningIfApplicable(check);

    return true;
  };

  // Toggle Completion
  const toggleActivityCompletion = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const updated = activities.map((a) => {
      if (a.id === id) {
        return { ...a, isCompleted: !a.isCompleted };
      }
      return a;
    });
    setActivities(updated);

    try {
      await fetch('/api/user/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, activities: updated }),
      });
    } catch (e) {
      console.error('Failed to sync completion state:', e);
    }
    return true;
  };

  // StudySlot CRUD
  const addStudySlot = async (slotData: Omit<StudySlot, 'id' | 'userId'>): Promise<boolean> => {
    if (!user) return false;

    const newId = 'slot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newSlot: StudySlot = {
      ...slotData,
      id: newId,
      userId: user.id,
    };

    const updated = [...studySlots, newSlot];
    setStudySlots(updated);

    try {
      await fetch('/api/user/study-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, studySlots: updated }),
      });
    } catch (e) {
      console.error('Failed to sync study slot:', e);
    }
    return true;
  };

  const updateStudySlot = async (slot: StudySlot): Promise<boolean> => {
    if (!user) return false;
    const updated = studySlots.map((s) => (s.id === slot.id ? slot : s));
    setStudySlots(updated);

    try {
      await fetch('/api/user/study-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, studySlots: updated }),
      });
    } catch (e) {
      console.error('Failed to update study slot:', e);
    }
    return true;
  };

  const deleteStudySlot = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const updated = studySlots.filter((s) => s.id !== id);
    setStudySlots(updated);

    try {
      await fetch('/api/user/study-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, studySlots: updated }),
      });
    } catch (e) {
      console.error('Failed to delete study slot:', e);
    }
    return true;
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    if (!user) return false;
    const merged = { ...settings, ...newSettings };
    setSettings(merged);

    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, settings: merged }),
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
    return true;
  };

  // Daily Note (오늘의 한마디)
  const saveDailyNote = async (date: string, content: string): Promise<boolean> => {
    if (!user) return false;

    const newNote: DailyNote = {
      userId: user.id,
      date,
      content,
      updatedAt: new Date().toISOString(),
    };

    setDailyNotes((prev) => ({
      ...prev,
      [date]: newNote,
    }));

    try {
      await fetch('/api/user/daily-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, date, content }),
      });
    } catch (e) {
      console.error('Failed to save daily note:', e);
    }
    return true;
  };

  // Date-based Anniversary/Note
  const saveAnniversary = async (date: string, content: string): Promise<boolean> => {
    if (!user) return false;

    setAnniversaries((prev) => ({
      ...prev,
      [date]: content,
    }));

    try {
      await fetch('/api/user/anniversaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, date, content }),
      });
    } catch (e) {
      console.error('Failed to save anniversary:', e);
    }
    return true;
  };

  // Image Export (Requirement 7: captures only the timetable area, excluding menus, settings, modals, warnings)
  const exportTimetableImage = async (elementId: string, filenamePrefix = '시간표'): Promise<boolean> => {
    const node = document.getElementById(elementId);
    if (!node) {
      alert('저장할 시간표 요소를 찾을 수 없습니다.');
      return false;
    }

    try {
      // Use html-to-image with solid white/soft background to prevent transparent cutoffs
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${filenamePrefix}_${currentDate}.png`;
      link.href = dataUrl;
      link.click();
      return true;
    } catch (err) {
      console.error('Image export failed:', err);
      alert('시간표 이미지 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }
  };

  return (
    <ScheduleContext.Provider
      value={{
        settings,
        activities,
        studySlots,
        dailyNotes,
        anniversaries,
        currentDate,
        setCurrentDate,
        activeView,
        setActiveView,
        dailyViewMode,
        setDailyViewMode,
        warningToast,
        dismissWarningToast,
        isLoadingData,
        addActivity,
        updateActivity,
        deleteActivity,
        deleteActivities,
        copyActivity,
        toggleActivityCompletion,
        addStudySlot,
        updateStudySlot,
        deleteStudySlot,
        updateSettings,
        saveDailyNote,
        saveAnniversary,
        checkConflicts,
        exportTimetableImage,
        activityModalOpen,
        setActivityModalOpen,
        editingActivity,
        setEditingActivity,
        prefilledTime,
        setPrefilledTime,
        studySlotModalOpen,
        setStudySlotModalOpen,
        targetDayForStudySlot,
        setTargetDayForStudySlot,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
