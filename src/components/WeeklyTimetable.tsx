import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  CheckCircle2,
  Circle,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  Move,
  GripVertical,
  AlertTriangle,
  Check,
  RotateCcw,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { DayOfWeek, Activity, StudySlot } from '../types';
import {
  formatYMD,
  parseYMD,
  getWeekDays,
  timeToMinutes,
  minutesToTime,
  getThemeConfig,
} from '../utils/theme';
import { ActivityDetailModal } from './ActivityDetailModal';
import { WeeklyExportModal } from './WeeklyExportModal';

export const WeeklyTimetable: React.FC = () => {
  const { user } = useAuth();
  const {
    currentDate,
    setCurrentDate,
    settings,
    activities,
    studySlots,
    setActivityModalOpen,
    setEditingActivity,
    setPrefilledTime,
    setStudySlotModalOpen,
    setTargetDayForStudySlot,
    updateActivity,
    deleteActivity,
    copyActivity,
    toggleActivityCompletion,
    deleteStudySlot,
  } = useSchedule();

  const [selectedActivityForDetail, setSelectedActivityForDetail] = useState<Activity | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Requirement 5: Drag & Drop states
  const [isDragEditMode, setIsDragEditMode] = useState(false);
  const [draggedActivity, setDraggedActivity] = useState<Activity | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{
    dayYmd: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    hasConflict: boolean;
    conflictReason?: string;
  } | null>(null);
  const [dragNotice, setDragNotice] = useState<string | null>(null);

  // Keyboard shortcut: ESC to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draggedActivity) {
        setDraggedActivity(null);
        setDragOverInfo(null);
        setDragNotice('드래그 이동이 취소되었습니다 (기존 위치 유지).');
        setTimeout(() => setDragNotice(null), 3500);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draggedActivity]);

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  const currentTargetDate = parseYMD(currentDate);
  const weekDays = getWeekDays(currentTargetDate);

  // Time grid parameters
  const startHour = settings.dayStartHour ?? 7;
  const endHour = settings.dayEndHour ?? 24;
  const totalHours = Math.max(1, endHour - startHour);
  const hourRowHeight = 56; // pixels per hour
  const totalHeight = totalHours * hourRowHeight;
  const pixelsPerMinute = hourRowHeight / 60;
  const dayStartMinutes = startHour * 60;

  // Generate array of hours for vertical axis
  const hourMarks: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hourMarks.push(h);
  }

  // Week navigation
  const handlePrevWeek = () => {
    const d = parseYMD(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(formatYMD(d));
  };

  const handleNextWeek = () => {
    const d = parseYMD(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(formatYMD(d));
  };

  const handleThisWeek = () => {
    setCurrentDate(formatYMD(new Date()));
  };

  // Study slot click -> prefill activity modal
  const handleStudySlotClick = (slot: StudySlot, dateStr: string) => {
    setPrefilledTime({
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: dateStr,
    });
    setEditingActivity(null);
    setActivityModalOpen(true);
  };

  // Empty grid space click -> add activity at clicked hour
  const handleEmptyGridClick = (dateStr: string, hour: number) => {
    if (isDragEditMode) return;
    const startStr = `${String(hour).padStart(2, '0')}:00`;
    const nextHour = Math.min(endHour, hour + 1);
    const endStr = `${String(nextHour).padStart(2, '0')}:00`;

    setPrefilledTime({
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
    });
    setEditingActivity(null);
    setActivityModalOpen(true);
  };

  // Requirement 5: Drag & Drop handlers
  const handleActivityDragStart = (e: React.DragEvent, act: Activity) => {
    if (!isDragEditMode) {
      e.preventDefault();
      return;
    }
    setDraggedActivity(act);
    e.dataTransfer.setData('text/plain', act.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleActivityDragEnd = () => {
    setDraggedActivity(null);
    setDragOverInfo(null);
  };

  const handleDayDragOver = (e: React.DragEvent, dayYmd: string, dayOfWeek: DayOfWeek) => {
    if (!isDragEditMode || !draggedActivity) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = Math.max(0, Math.min(totalHeight - 1, e.clientY - rect.top));
    const minutesFromStart = Math.floor(offsetY / pixelsPerMinute);
    // snap to 15-minute intervals for precision
    const snappedMins = Math.floor(minutesFromStart / 15) * 15;
    const targetStartMinutes = dayStartMinutes + snappedMins;

    const actDuration = Math.max(15, timeToMinutes(draggedActivity.endTime) - timeToMinutes(draggedActivity.startTime));
    const clampedStartM = Math.max(dayStartMinutes, Math.min(endHour * 60 - actDuration, targetStartMinutes));
    const clampedEndM = clampedStartM + actDuration;
    const newStartStr = minutesToTime(clampedStartM);
    const newEndStr = minutesToTime(clampedEndM);

    // Overlap checks
    // 1. Conflict with existing activities on target date
    const conflictingAct = activities.find((a) => {
      if (a.id === draggedActivity.id) return false;
      const aDateMatch = a.date === dayYmd || (a.isRepeating && a.repeatDays?.includes(dayOfWeek));
      if (!aDateMatch) return false;
      const aS = timeToMinutes(a.startTime);
      const aE = timeToMinutes(a.endTime);
      return Math.max(aS, clampedStartM) < Math.min(aE, clampedEndM);
    });

    // 2. Conflict with break times
    const conflictingBreak = (settings.breakTimes || []).find((b) => {
      if (b.isException) {
        if (b.date !== dayYmd) return false;
      } else {
        const applies = (!b.days || b.days.length === 0) || (b.days && b.days.includes(dayOfWeek)) || b.dayOfWeek === dayOfWeek;
        if (!applies) return false;
      }
      const bS = timeToMinutes(b.startTime);
      const bE = timeToMinutes(b.endTime);
      return Math.max(bS, clampedStartM) < Math.min(bE, clampedEndM);
    });

    let hasConflict = false;
    let conflictReason: string | undefined = undefined;
    if (conflictingAct) {
      hasConflict = true;
      conflictReason = `'${conflictingAct.title}' (${conflictingAct.startTime}~${conflictingAct.endTime}) 일정과 중복`;
    } else if (conflictingBreak) {
      hasConflict = true;
      conflictReason = `'${conflictingBreak.name}' (${conflictingBreak.startTime}~${conflictingBreak.endTime}) 쉬는 시간과 중복`;
    }

    setDragOverInfo({
      dayYmd,
      dayOfWeek,
      startTime: newStartStr,
      endTime: newEndStr,
      hasConflict,
      conflictReason,
    });
  };

  const handleDayDrop = async (e: React.DragEvent, dayYmd: string, dayOfWeek: DayOfWeek) => {
    if (!isDragEditMode || !draggedActivity || !dragOverInfo) return;
    e.preventDefault();

    if (dragOverInfo.hasConflict) {
      const confirmMove = confirm(
        `⚠️ ${dragOverInfo.conflictReason}됩니다.\n그래도 '${draggedActivity.title}' 일정을 이 시간대로 이동하시겠습니까?`
      );
      if (!confirmMove) {
        setDraggedActivity(null);
        setDragOverInfo(null);
        setDragNotice('일정 이동이 취소되었습니다.');
        setTimeout(() => setDragNotice(null), 3000);
        return;
      }
    }

    try {
      await updateActivity({
        ...draggedActivity,
        date: dayYmd,
        startTime: dragOverInfo.startTime,
        endTime: dragOverInfo.endTime,
      });
      setDragNotice(`'${draggedActivity.title}' 일정이 ${dayOfWeek}요일 ${dragOverInfo.startTime}~${dragOverInfo.endTime}로 안전하게 이동 저장되었습니다.`);
      setTimeout(() => setDragNotice(null), 4000);
    } catch (err) {
      console.error('Drag update error:', err);
      alert('일정 이동 저장 중 오류가 발생했습니다.');
    } finally {
      setDraggedActivity(null);
      setDragOverInfo(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Week Navigator */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-prev-week"
            type="button"
            onClick={handlePrevWeek}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="이전 주"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {weekDays[0].ymd} ~ {weekDays[6].ymd}
          </span>

          <button
            id="btn-next-week"
            type="button"
            onClick={handleNextWeek}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="다음 주"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            id="btn-this-week"
            type="button"
            onClick={handleThisWeek}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
          >
            이번 주
          </button>
        </div>

        {/* Action Buttons: Export Image, Drag Edit Mode Toggle, Add Activity */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-toggle-drag-edit"
            type="button"
            onClick={() => setIsDragEditMode(!isDragEditMode)}
            className={`flex items-center space-x-1.5 px-3.5 py-2 border rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
              isDragEditMode
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title="일정 블록을 드래그하여 이동할 수 있는 편집 모드"
          >
            <Move className="w-3.5 h-3.5" />
            <span>{isDragEditMode ? '편집 모드 종료' : '일정 이동 모드'}</span>
          </button>

          <button
            id="btn-export-weekly-image"
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
            title="활동명이 잘리지 않는 고해상도 이미지로 저장합니다"
          >
            <Download className="w-3.5 h-3.5" />
            <span>시간표 이미지 저장</span>
          </button>

          <button
            id="btn-add-activity-weekly"
            type="button"
            onClick={() => {
              setEditingActivity(null);
              setPrefilledTime({ date: currentDate, startTime: '14:00', endTime: '15:00' });
              setActivityModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: currentTheme.primary }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>활동 추가</span>
          </button>
        </div>
      </div>

      {/* WEEKLY TIMETABLE CONTAINER: COLLEGE TIMETABLE BLOCK LAYOUT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 overflow-hidden">
        {/* Header Legend & Info */}
        <div className="border-b border-slate-100 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">주간 시간표 (블록형)</h2>
            <p className="text-xs text-slate-500 font-medium">
              대학생 시간표 형태 (가로: 요일 / 세로: 시간). 빈 칸을 클릭하면 해당 시간에 활동이 추가됩니다.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: currentTheme.primaryLight }} />
              <span>자습 시간대</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 border border-amber-300" />
              <span>쉬는 시간</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-200 border border-indigo-400" />
              <span>등록된 활동</span>
            </span>
          </div>
        </div>

        {/* Outer Horizontal Scroll Container for Mobile/Tablet Responsiveness */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-[880px] border border-slate-200 rounded-2xl overflow-hidden bg-white">
            {/* Table Header Row: Time Column + 7 Day Columns */}
            <div className="grid grid-cols-[64px_repeat(7,1fr)] bg-slate-50 border-b border-slate-200 divide-x divide-slate-200 text-center">
              {/* Top-left Corner: Time label */}
              <div className="p-2.5 flex items-center justify-center text-xs font-bold text-slate-500">
                시간
              </div>

              {/* 7 Days Headers */}
              {weekDays.map((dayItem) => {
                const isToday = dayItem.ymd === formatYMD(new Date());
                const dayStudySlots = studySlots.filter((s) => s.dayOfWeek === dayItem.dayOfWeek);

                return (
                  <div
                    key={dayItem.ymd}
                    className={`p-2.5 flex flex-col items-center justify-between transition-colors ${
                      isToday ? 'bg-indigo-50/70 font-bold' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <span className={`text-xs font-bold ${isToday ? 'text-indigo-900' : 'text-slate-800'}`}>
                        {dayItem.dayOfWeek}요일
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({dayItem.date.getMonth() + 1}/{dayItem.date.getDate()})
                      </span>
                      {isToday && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-semibold">
                          오늘
                        </span>
                      )}
                    </div>

                    {/* Requirement 4: 요일 아래에 ＋ 시간대 추가 버튼 배치 */}
                    <div className="mt-1.5 w-full flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetDayForStudySlot(dayItem.dayOfWeek);
                          setStudySlotModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer shadow-2xs hover:opacity-90"
                        style={{
                          backgroundColor: currentTheme.primaryLight,
                          borderColor: currentTheme.borderSoft,
                          color: currentTheme.primaryDark,
                        }}
                        title={`${dayItem.dayOfWeek}요일 자습 가능 시간대 추가`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>시간대 추가</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timetable Body Grid: Left Time Axis + 7 Relative Day Columns */}
            <div className="grid grid-cols-[64px_repeat(7,1fr)] divide-x divide-slate-200">
              {/* Left Column: Vertical Hour Marks */}
              <div
                className="relative bg-slate-50/50 text-[11px] font-mono text-slate-400 select-none"
                style={{ height: `${totalHeight}px` }}
              >
                {hourMarks.map((h, i) => (
                  <div
                    key={h}
                    className="absolute w-full text-center border-t border-slate-200/70 pt-0.5"
                    style={{ top: `${i * hourRowHeight}px`, height: `${hourRowHeight}px` }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* 7 Day Columns */}
              {weekDays.map((dayItem) => {
                const isToday = dayItem.ymd === formatYMD(new Date());

                // Filter study slots for this day of week
                const dayStudySlots = studySlots.filter((s) => s.dayOfWeek === dayItem.dayOfWeek);

                // Filter break times for this day of week (if days specified, check inclusion; else applies every day)
                const dayBreakTimes = (settings.breakTimes || []).filter((b) => {
                  if (!b.days || b.days.length === 0) return true;
                  return b.days.includes(dayItem.dayOfWeek);
                });

                // Filter activities for this day
                const dayActs = activities.filter((act) => {
                  if (act.date === dayItem.ymd) return true;
                  if (act.isRepeating && act.repeatDays && act.repeatDays.includes(dayItem.dayOfWeek)) {
                    return true;
                  }
                  return false;
                });

                return (
                  <div
                    key={dayItem.ymd}
                    className={`relative select-none ${isToday ? 'bg-indigo-50/15' : 'bg-white'} ${
                      isDragEditMode ? 'ring-2 ring-indigo-200/50 ring-inset' : ''
                    }`}
                    style={{ height: `${totalHeight}px` }}
                    onDragOver={(e) => handleDayDragOver(e, dayItem.ymd, dayItem.dayOfWeek)}
                    onDrop={(e) => handleDayDrop(e, dayItem.ymd, dayItem.dayOfWeek)}
                  >
                    {/* Visual Drop Guide */}
                    {isDragEditMode && dragOverInfo && dragOverInfo.dayYmd === dayItem.ymd && (
                      <div
                        className={`absolute inset-x-1 border-2 border-dashed ${
                          dragOverInfo.hasConflict ? 'border-rose-400 bg-rose-100/50' : 'border-indigo-400 bg-indigo-100/50'
                        } rounded-xl z-30 pointer-events-none flex flex-col items-center justify-center text-[10px]`}
                        style={{
                          top: `${Math.max(0, (timeToMinutes(dragOverInfo.startTime) - dayStartMinutes) * pixelsPerMinute)}px`,
                          height: `${Math.max(20, (timeToMinutes(dragOverInfo.endTime) - timeToMinutes(dragOverInfo.startTime)) * pixelsPerMinute)}px`,
                        }}
                      >
                        <span className="font-bold">{draggedActivity?.title}</span>
                        <span>
                          {dragOverInfo.startTime} ~ {dragOverInfo.endTime}
                        </span>
                        {dragOverInfo.hasConflict && (
                          <span className="text-rose-700 font-medium">⚠️ 중복됨</span>
                        )}
                      </div>
                    )}

                    {/* Hour horizontal grid lines (clickable to add activity) */}
                    {hourMarks.map((h, i) => (
                      <div
                        key={h}
                        onClick={() => handleEmptyGridClick(dayItem.ymd, h)}
                        className="absolute inset-x-0 border-t border-slate-100 hover:bg-slate-100/40 transition-colors cursor-pointer group"
                        style={{ top: `${i * hourRowHeight}px`, height: `${hourRowHeight}px` }}
                        title={`${dayItem.dayOfWeek}요일 ${h}:00에 활동 추가`}
                      >
                        <span className="opacity-0 group-hover:opacity-40 text-[9px] text-slate-400 pl-1">
                          + 추가
                        </span>
                      </div>
                    ))}

                    {/* Shaded Area: Break Times */}
                    {dayBreakTimes.map((brk) => {
                      const bStartM = timeToMinutes(brk.startTime);
                      const bEndM = timeToMinutes(brk.endTime);
                      const top = Math.max(0, (bStartM - dayStartMinutes) * pixelsPerMinute);
                      const height = Math.max(16, (bEndM - bStartM) * pixelsPerMinute);

                      if (top >= totalHeight || top + height <= 0) return null;

                      return (
                        <div
                          key={brk.id}
                          className="absolute inset-x-0.5 bg-amber-100/60 border border-dashed border-amber-300 rounded-lg p-1 text-[10px] text-amber-900 pointer-events-none z-5 overflow-hidden flex items-center justify-between"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <span className="font-semibold truncate">☕ {brk.name}</span>
                          <span className="font-mono text-[9px] opacity-75 shrink-0 ml-1">
                            {brk.startTime}~{brk.endTime}
                          </span>
                        </div>
                      );
                    })}

                    {/* Shaded Area: Study Slots */}
                    {dayStudySlots.map((slot) => {
                      const sStartM = timeToMinutes(slot.startTime);
                      const sEndM = timeToMinutes(slot.endTime);
                      const top = Math.max(0, (sStartM - dayStartMinutes) * pixelsPerMinute);
                      const height = Math.max(20, (sEndM - sStartM) * pixelsPerMinute);

                      if (top >= totalHeight || top + height <= 0) return null;

                      return (
                        <div
                          key={slot.id}
                          onClick={() => handleStudySlotClick(slot, dayItem.ymd)}
                          className="absolute inset-x-1 border border-dashed rounded-xl p-1.5 text-[10px] cursor-pointer z-10 transition-all hover:ring-2 hover:ring-indigo-300"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: `${currentTheme.primaryLight}50`,
                            borderColor: currentTheme.borderSoft,
                            color: currentTheme.primaryDark,
                          }}
                          title="설정된 자습 시간대 (클릭하면 이 시간에 활동 추가)"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold truncate">
                              📖 {slot.label || '자습'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`'${slot.label || '자습'}' 시간대를 삭제하시겠습니까?`)) {
                                  deleteStudySlot(slot.id);
                                }
                              }}
                              className="opacity-40 hover:opacity-100 text-rose-500 p-0.5"
                              title="자습 시간대 삭제"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="font-mono text-[9px] opacity-80 mt-0.5">
                            {slot.startTime} ~ {slot.endTime}
                          </div>
                        </div>
                      );
                    })}

                    {/* Activity Rectangle Blocks */}
                    {dayActs.map((act) => {
                      const aStartM = timeToMinutes(act.startTime);
                      const aEndM = timeToMinutes(act.endTime);
                      const top = Math.max(0, (aStartM - dayStartMinutes) * pixelsPerMinute);
                      const height = Math.max(34, (aEndM - aStartM) * pixelsPerMinute - 2);

                      if (top >= totalHeight || top + height <= 0) return null;

                      return (
                        <div
                          key={act.id}
                          onClick={() => setSelectedActivityForDetail(act)}
                          draggable={isDragEditMode}
                          onDragStart={(e) => handleActivityDragStart(e, act)}
                          onDragEnd={handleActivityDragEnd}
                          className={`absolute inset-x-1 rounded-xl p-2 border text-xs shadow-2xs z-20 overflow-hidden group transition-all ${
                            isDragEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-400' : 'cursor-pointer hover:scale-[1.01] hover:shadow-md hover:z-30'
                          } flex flex-col justify-between`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: act.color || '#E0E7FF',
                            borderColor: 'rgba(0,0,0,0.12)',
                          }}
                          title={isDragEditMode ? '길게 눌러 드래그' : '클릭하여 전체 정보 및 메모 보기'}
                        >
                          {/* Top Row: Checkbox, Title (multi-line wrap), and Hover Icons */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-start space-x-1 min-w-0 flex-1">
                              {act.hasCompletionCheck && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleActivityCompletion(act.id);
                                  }}
                                  className="text-slate-600 shrink-0 mt-0.5"
                                >
                                  {act.isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                                  )}
                                </button>
                              )}

                              {/* Requirement 3: 활동명이 ...으로 잘리지 않도록 줄바꿈 */}
                              <span
                                className={`font-bold text-[11px] text-slate-900 leading-snug break-words whitespace-normal break-all ${
                                  act.isCompleted ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {act.title}
                              </span>
                            </div>

                            {/* Quick Action Icons on hover */}
                            {!isDragEditMode && (
                              <div
                                className="hidden group-hover:flex items-center space-x-0.5 shrink-0 bg-white/90 rounded-md px-1 py-0.5 shadow-2xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingActivity(act);
                                    setActivityModalOpen(true);
                                  }}
                                  className="p-0.5 text-slate-500 hover:text-slate-800"
                                  title="수정"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyActivity(act)}
                                  className="p-0.5 text-slate-500 hover:text-slate-800"
                                  title="복사"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`'${act.title}' 활동을 삭제하시겠습니까?`)) {
                                      deleteActivity(act.id);
                                    }
                                  }}
                                  className="p-0.5 text-slate-500 hover:text-rose-600"
                                  title="삭제"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                            {isDragEditMode && <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                          </div>

                          {/* Bottom Row: Time and Subject (Requirement 3: 시간 표시는 더 작게, 겹치지 않게) */}
                          <div className="mt-auto pt-1 flex items-center justify-between text-[9px] font-mono text-slate-600/90 leading-tight">
                            <span>
                              {act.startTime}~{act.endTime}
                            </span>
                            {act.subject && (
                              <span className="font-sans px-1 rounded-sm bg-white/70 text-slate-700 font-medium truncate max-w-[55px]">
                                {act.subject}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivityForDetail}
        isOpen={!!selectedActivityForDetail}
        onClose={() => setSelectedActivityForDetail(null)}
      />

      {/* Dedicated High-Res Image Export Preview Modal */}
      <WeeklyExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        weekDays={weekDays}
        activities={activities}
        studySlots={studySlots}
        settings={settings}
        userNickname={user?.nickname || user?.username}
      />
    </div>
  );
};
