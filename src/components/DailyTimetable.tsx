import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Table as TableIcon,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Copy,
  Trash2,
  Edit2,
  Quote,
  Save,
  Coffee,
  Sparkles
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { Activity, StudySlot, DayOfWeek } from '../types';
import {
  formatYMD,
  parseYMD,
  getDayOfWeekFromDate,
  timeToMinutes,
  minutesToTime,
  getThemeConfig,
} from '../utils/theme';
import { DailyExportModal } from './DailyExportModal';
import { useAuth } from '../context/AuthContext';

export const DailyTimetable: React.FC = () => {
  const {
    currentDate,
    setCurrentDate,
    dailyViewMode,
    setDailyViewMode,
    settings,
    activities,
    studySlots,
    dailyNotes,
    saveDailyNote,
    setActivityModalOpen,
    setEditingActivity,
    setPrefilledTime,
    setStudySlotModalOpen,
    setTargetDayForStudySlot,
    deleteActivity,
    copyActivity,
    toggleActivityCompletion,
    deleteStudySlot,
    exportTimetableImage,
  } = useSchedule();

  const { user } = useAuth();
  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  // Date helpers
  const targetDateObj = parseYMD(currentDate);
  const currentDayOfWeek: DayOfWeek = getDayOfWeekFromDate(targetDateObj);

  // Today's note state
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    const existingNote = dailyNotes[currentDate]?.content || '';
    setNoteText(existingNote);
  }, [currentDate, dailyNotes]);

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    await saveDailyNote(currentDate, noteText);
    setIsSavingNote(false);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  // Date navigation
  const handlePrevDay = () => {
    const d = parseYMD(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(formatYMD(d));
  };

  const handleNextDay = () => {
    const d = parseYMD(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(formatYMD(d));
  };

  const handleToday = () => {
    setCurrentDate(formatYMD(new Date()));
  };

  // Filter activities for this date or weekly repeating on this day of week
  const dayActivities = activities.filter((act) => {
    if (act.date === currentDate) return true;
    if (act.isRepeating && act.repeatDays && act.repeatDays.includes(currentDayOfWeek)) {
      return true;
    }
    return false;
  }).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // Study slots for this day of week
  const dayStudySlots = studySlots.filter((s) => s.dayOfWeek === currentDayOfWeek);

  // Time slots for timeline
  const startHour = settings.dayStartHour ?? 7;
  const endHour = settings.dayEndHour ?? 24;
  const interval = settings.timeSlotInterval ?? 30;

  const totalMinutes = (endHour - startHour) * 60;
  const slotCount = Math.floor(totalMinutes / interval);

  const timeSlots: { timeStr: string; minute: number }[] = [];
  for (let i = 0; i <= slotCount; i++) {
    const minute = startHour * 60 + i * interval;
    if (minute <= endHour * 60) {
      timeSlots.push({
        timeStr: minutesToTime(minute),
        minute,
      });
    }
  }

  // Study slot click -> adds activity in that slot
  const handleStudySlotClick = (slot: StudySlot) => {
    setPrefilledTime({
      startTime: slot.startTime,
      endTime: slot.endTime,
      date: currentDate,
    });
    setEditingActivity(null);
    setActivityModalOpen(true);
  };

  // Time grid cell click -> adds activity at clicked time
  const handleGridCellClick = (timeStr: string) => {
    const startM = timeToMinutes(timeStr);
    const endM = Math.min(endHour * 60, startM + interval * 2);
    setPrefilledTime({
      startTime: timeStr,
      endTime: minutesToTime(endM),
      date: currentDate,
    });
    setEditingActivity(null);
    setActivityModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Date Navigator */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-prev-day"
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="이전 날짜"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {targetDateObj.getFullYear()}년 {targetDateObj.getMonth() + 1}월 {targetDateObj.getDate()}일 ({currentDayOfWeek})
            </span>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <button
            id="btn-next-day"
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="다음 날짜"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            id="btn-today"
            type="button"
            onClick={handleToday}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            오늘
          </button>
        </div>

        {/* View Mode Toggle & Image Export & Activity Add */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Timeline vs Table view switch */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              id="btn-view-timeline"
              type="button"
              onClick={() => setDailyViewMode('timeline')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dailyViewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>타임라인</span>
            </button>
            <button
              id="btn-view-table"
              type="button"
              onClick={() => setDailyViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dailyViewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>표 보기</span>
            </button>
          </div>

          {/* Export Timetable Image (Requirement 10) */}
          <button
            id="btn-export-daily-image"
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs cursor-pointer"
            title="현재 시간표를 이미지로 저장합니다"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">시간표 이미지 저장</span>
            <span className="sm:hidden">저장</span>
          </button>

          {/* Add Activity Button (Can add anywhere) */}
          <button
            id="btn-add-activity"
            type="button"
            onClick={() => {
              setEditingActivity(null);
              setPrefilledTime({ date: currentDate, startTime: '14:00', endTime: '15:00' });
              setActivityModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-white rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
            style={{ backgroundColor: currentTheme.primary }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>활동 추가</span>
          </button>
        </div>
      </div>

      {/* Requirement 6: 오늘의 한마디 (Today's Note) */}
      <div
        className="p-4 sm:p-5 rounded-2xl border transition-all"
        style={{ backgroundColor: currentTheme.bgSoft, borderColor: currentTheme.borderSoft }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Quote className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800">
              오늘의 한마디 <span className="text-[11px] font-normal text-slate-500">({currentDate})</span>
            </h3>
          </div>
          {noteSavedFeedback && (
            <span className="text-[11px] text-emerald-600 font-semibold animate-in fade-in">
              ✓ 저장되었습니다
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            id="input-daily-note"
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleSaveNote}
            placeholder="오늘 하루를 시작하는 나만의 다짐이나 한마디를 적어보세요 (예: 끝까지 집중하자!)"
            className="flex-1 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400"
          />
          <button
            id="btn-save-daily-note"
            type="button"
            onClick={handleSaveNote}
            disabled={isSavingNote}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-1 shrink-0 transition-opacity disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: currentTheme.primary }}
          >
            <Save className="w-3.5 h-3.5" />
            <span>저장</span>
          </button>
        </div>
      </div>

      {/* Requirement 3: 자습 시간대 영역 (Self-study Slots) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
              {currentDayOfWeek}요일 자습 가능 시간대
            </h4>
            <p className="text-[11px] text-slate-500">
              등록된 자습 시간대를 누르면 해당 시간에 즉시 새 활동을 추가할 수 있습니다.
            </p>
          </div>

          {/* ＋ 시간대 추가 버튼 */}
          <button
            id="btn-add-study-slot-daily"
            type="button"
            onClick={() => {
              setTargetDayForStudySlot(currentDayOfWeek);
              setStudySlotModalOpen(true);
            }}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-dashed transition-colors"
            style={{
              borderColor: currentTheme.accent,
              color: currentTheme.primaryDark,
              backgroundColor: currentTheme.primaryLight,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>＋ 시간대 추가</span>
          </button>
        </div>

        {/* Study slots list */}
        {dayStudySlots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dayStudySlots.map((slot) => (
              <div
                key={slot.id}
                className="group flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all hover:shadow-xs"
                style={{
                  backgroundColor: currentTheme.bgSoft,
                  borderColor: currentTheme.borderSoft,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleStudySlotClick(slot)}
                  className="text-xs font-medium text-slate-800 text-left hover:underline"
                  title="이 시간에 활동 추가하기"
                >
                  <span className="font-semibold text-indigo-700 mr-1">
                    {slot.label || '자습'}:
                  </span>
                  <span className="font-mono text-[11px] text-slate-600">
                    {slot.startTime} ~ {slot.endTime}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteStudySlot(slot.id)}
                  className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                  title="시간대 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-2 flex items-center justify-between">
            <span>{currentDayOfWeek}요일에 설정된 자습 시간대가 없습니다. 필요 시 위 버튼을 눌러 추가하세요.</span>
          </div>
        )}
      </div>

      {/* TIMETABLE EXPORT AREA (Only timetable & activity info included in image, per Requirement 7) */}
      <div
        id="timetable-export-area"
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden"
      >
        {/* Header inside export area so exported image has title & date */}
        <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              하루 시간표
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {targetDateObj.getFullYear()}년 {targetDateObj.getMonth() + 1}월 {targetDateObj.getDate()}일 ({currentDayOfWeek})
              {dailyNotes[currentDate]?.content && ` · "${dailyNotes[currentDate].content}"`}
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {startHour}:00 ~ {endHour}:00 ({interval}분 단위)
          </span>
        </div>

        {/* View Mode 1: Timeline View */}
        {dailyViewMode === 'timeline' && (
          <div className="relative overflow-x-auto">
            {dayActivities.length === 0 && dayStudySlots.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">등록된 일정이 없습니다.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  시간표의 빈 시간대를 클릭하거나 상단의 [활동 추가] 버튼을 눌러 일정을 채워보세요.
                </p>
              </div>
            )}

            <div className="min-w-[600px] border border-slate-200 rounded-xl overflow-hidden bg-white">
              {timeSlots.map((slot, idx) => {
                const slotM = slot.minute;
                const nextM = slotM + interval;
                if (slotM >= endHour * 60) return null;

                // Check if this time interval falls inside a break time
                const activeBreak = settings.breakTimes?.find((b) => {
                  const bs = timeToMinutes(b.startTime);
                  const be = timeToMinutes(b.endTime);
                  return Math.max(slotM, bs) < Math.min(nextM, be);
                });

                // Check if this interval is inside a study slot
                const isInsideStudy = dayStudySlots.some((s) => {
                  const ss = timeToMinutes(s.startTime);
                  const se = timeToMinutes(s.endTime);
                  return slotM >= ss && nextM <= se;
                });

                // Find activities that start at or overlap this exact time slot
                const matchingActivities = dayActivities.filter((act) => {
                  const as = timeToMinutes(act.startTime);
                  const ae = timeToMinutes(act.endTime);
                  return slotM >= as && slotM < ae;
                });

                return (
                  <div
                    key={slot.timeStr}
                    className={`flex border-b border-slate-100 last:border-b-0 min-h-[44px] transition-colors group ${
                      activeBreak ? 'bg-amber-50/40' : isInsideStudy ? 'bg-indigo-50/20' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Time Column */}
                    <div className="w-20 sm:w-24 shrink-0 px-3 py-2 border-r border-slate-100 flex items-center justify-between text-slate-500 font-mono text-xs select-none">
                      <span className="font-medium">{slot.timeStr}</span>
                      {activeBreak && (
                        <Coffee className="w-3.5 h-3.5 text-amber-500 shrink-0" title={`쉬는시간: ${activeBreak.name}`} />
                      )}
                    </div>

                    {/* Content Column */}
                    <div
                      className="flex-1 p-1.5 flex items-center flex-wrap gap-2 relative cursor-pointer"
                      onClick={(e) => {
                        // If clicked outside an activity box, add activity here
                        if ((e.target as HTMLElement).closest('.activity-block')) return;
                        handleGridCellClick(slot.timeStr);
                      }}
                    >
                      {activeBreak && matchingActivities.length === 0 && (
                        <span className="text-[11px] text-amber-700/70 font-medium italic pl-2 select-none">
                          ☕ {activeBreak.name} ({activeBreak.startTime} ~ {activeBreak.endTime})
                        </span>
                      )}

                      {matchingActivities.map((act) => {
                        // Only render primary card if this is the start interval to avoid duplicates
                        const as = timeToMinutes(act.startTime);
                        const isFirstSlot = slotM <= as && as < nextM;

                        if (!isFirstSlot) {
                          return null; // Spanned across slots
                        }

                        return (
                          <div
                            key={act.id}
                            className="activity-block flex items-center justify-between px-3 py-2 rounded-xl border shadow-2xs transition-transform hover:scale-[1.01] max-w-md w-full"
                            style={{
                              backgroundColor: act.color,
                              borderColor: 'rgba(0,0,0,0.06)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              {/* Completion Checkbox (Requirement 2) */}
                              {act.hasCompletionCheck && (
                                <button
                                  type="button"
                                  onClick={() => toggleActivityCompletion(act.id)}
                                  className="text-slate-600 hover:text-slate-900 shrink-0 transition-colors"
                                  title={act.isCompleted ? '완료 취소' : '완료 표시'}
                                >
                                  {act.isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {act.subject && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/70 text-slate-700">
                                      {act.subject}
                                    </span>
                                  )}
                                  <span
                                    className={`text-xs font-bold truncate text-slate-900 ${
                                      act.isCompleted ? 'line-through text-slate-400' : ''
                                    }`}
                                  >
                                    {act.title}
                                  </span>
                                  {act.isRepeating && (
                                    <span className="text-[9px] px-1 py-0.2 rounded-sm bg-slate-200/80 text-slate-600">
                                      반복
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-600 block">
                                  {act.startTime} ~ {act.endTime}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons: Edit, Copy, Delete (Requirement 2) */}
                            <div className="flex items-center space-x-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingActivity(act);
                                  setActivityModalOpen(true);
                                }}
                                className="p-1 rounded-md text-slate-600 hover:bg-black/5"
                                title="수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => copyActivity(act)}
                                className="p-1 rounded-md text-slate-600 hover:bg-black/5"
                                title="복사"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`'${act.title}' 활동을 삭제하시겠습니까?`)) {
                                    deleteActivity(act.id);
                                  }
                                }}
                                className="p-1 rounded-md text-slate-600 hover:text-rose-600 hover:bg-black/5"
                                title="삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode 2: Table View */}
        {dailyViewMode === 'table' && (
          <div className="overflow-x-auto">
            {dayActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <TableIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">등록된 활동 목록이 없습니다.</p>
                <p className="text-[11px] text-slate-400 mt-1">상단의 [활동 추가] 버튼을 눌러 새 일정을 만들어보세요.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-2.5 px-3 w-12 text-center">완료</th>
                    <th className="py-2.5 px-3 w-32">시간</th>
                    <th className="py-2.5 px-3 w-24">과목</th>
                    <th className="py-2.5 px-3">활동명</th>
                    <th className="py-2.5 px-3 w-20">반복</th>
                    <th className="py-2.5 px-3 w-28 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dayActivities.map((act) => (
                    <tr
                      key={act.id}
                      className="hover:bg-slate-50/80 transition-colors"
                      style={{
                        backgroundColor: act.isCompleted ? '#fafafa' : undefined,
                      }}
                    >
                      <td className="py-3 px-3 text-center">
                        {act.hasCompletionCheck ? (
                          <button
                            type="button"
                            onClick={() => toggleActivityCompletion(act.id)}
                            className="text-slate-500 hover:text-slate-900"
                          >
                            {act.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 inline" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-700">
                        {act.startTime} ~ {act.endTime}
                      </td>

                      <td className="py-3 px-3">
                        {act.subject ? (
                          <span
                            className="px-2 py-0.5 rounded-md font-medium text-[11px]"
                            style={{ backgroundColor: act.color }}
                          >
                            {act.subject}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`font-semibold ${
                            act.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {act.title}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-500">
                        {act.isRepeating ? (
                          <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-md">
                            매주 {act.repeatDays?.join(',')}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">단일</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingActivity(act);
                              setActivityModalOpen(true);
                            }}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-200"
                            title="수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyActivity(act)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-200"
                            title="복사"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`'${act.title}' 활동을 삭제하시겠습니까?`)) {
                                deleteActivity(act.id);
                              }
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-slate-200"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Daily Timetable Image Export Modal with Preview */}
      <DailyExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dateStr={currentDate}
        dayOfWeek={currentDayOfWeek}
        activities={activities}
        studySlots={studySlots}
        settings={settings}
        userNickname={user?.nickname || user?.username}
        noteContent={noteText}
      />
    </div>
  );
};
