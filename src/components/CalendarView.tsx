import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Copy,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  Flag,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import {
  formatYMD,
  parseYMD,
  getDayOfWeekFromDate,
  timeToMinutes,
  getThemeConfig,
  calculateDDay,
  DAYS_OF_WEEK,
} from '../utils/theme';
import { Activity } from '../types';

export const CalendarView: React.FC = () => {
  const {
    activities,
    currentDate,
    setCurrentDate,
    setActiveView,
    settings,
    dailyNotes,
    anniversaries,
    toggleActivityCompletion,
    deleteActivity,
    copyActivity,
    setActivityModalOpen,
    setEditingActivity,
    setPrefilledTime,
    saveAnniversary,
  } = useSchedule();

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  // Calendar year and month state
  const [viewDate, setViewDate] = useState<Date>(() => {
    return parseYMD(currentDate);
  });

  // Selected date on the calendar for the detail drawer
  const [selectedDateStr, setSelectedDateStr] = useState<string>(currentDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    const todayStr = formatYMD(today);
    setSelectedDateStr(todayStr);
    setCurrentDate(todayStr);
  };

  // Calendar matrix calculation (Mon to Sun)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevMonthDays = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      prevMonthDays.push({
        date: d,
        dateStr: formatYMD(d),
        isCurrentMonth: false,
        dayNum: prevMonthLastDay - i,
      });
    }

    // Current month days
    const currMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      currMonthDays.push({
        date: d,
        dateStr: formatYMD(d),
        isCurrentMonth: true,
        dayNum: i,
      });
    }

    // Next month filler days to complete 35 or 42 cells
    const totalFilled = prevMonthDays.length + currMonthDays.length;
    const nextMonthFillerCount = (7 - (totalFilled % 7)) % 7;
    const nextMonthDays = [];
    for (let i = 1; i <= nextMonthFillerCount; i++) {
      const d = new Date(year, month + 1, i);
      nextMonthDays.push({
        date: d,
        dateStr: formatYMD(d),
        isCurrentMonth: false,
        dayNum: i,
      });
    }

    return [...prevMonthDays, ...currMonthDays, ...nextMonthDays];
  }, [year, month]);

  // Aggregate stats per date for fast rendering
  const dateStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        totalMinutes: number;
        completedCount: number;
        totalCount: number;
        activities: Activity[];
      }
    > = {};

    calendarDays.forEach(({ dateStr, date }) => {
      const dayOfWeek = getDayOfWeekFromDate(date);
      const dayActivities = activities.filter((act) => {
        if (act.date === dateStr) return true;
        if (act.isRepeating && act.repeatDays && act.repeatDays.includes(dayOfWeek)) return true;
        return false;
      });

      let totalMinutes = 0;
      let completedCount = 0;

      dayActivities.forEach((act) => {
        const s = timeToMinutes(act.startTime);
        const e = timeToMinutes(act.endTime);
        if (e > s) totalMinutes += e - s;
        if (act.isCompleted) completedCount++;
      });

      map[dateStr] = {
        totalMinutes,
        completedCount,
        totalCount: dayActivities.length,
        activities: dayActivities.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
      };
    });

    return map;
  }, [calendarDays, activities]);

  // Selected date's detailed activities & notes
  const selectedStats = dateStatsMap[selectedDateStr] || {
    totalMinutes: 0,
    completedCount: 0,
    totalCount: 0,
    activities: [],
  };

  const selectedDateObj = parseYMD(selectedDateStr);
  const selectedDayOfWeek = getDayOfWeekFromDate(selectedDateObj);

  // D-Day item for this date or upcoming D-Days
  const ddayList = settings.ddayList || [];
  const targetDDay = ddayList.find((d) => d.targetDate === selectedDateStr);

  const todayStr = formatYMD(new Date());

  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setCurrentDate(dateStr);
  };

  const handleGoToDailyTimetable = () => {
    setCurrentDate(selectedDateStr);
    setActiveView('daily');
  };

  const handleAddActivityForDate = () => {
    setEditingActivity(null);
    setPrefilledTime({
      date: selectedDateStr,
      startTime: '09:00',
      endTime: '10:00',
    });
    setActivityModalOpen(true);
  };

  const handleEditActivity = (act: Activity) => {
    setEditingActivity(act);
    setPrefilledTime(null);
    setActivityModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Calendar Header & Month Switcher */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primary }}
            >
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {year}년 {month + 1}월 캘린더
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                월간 학업 흐름을 한눈에 파악하고 하루 시간표와 바로 연결합니다
              </p>
            </div>
          </div>
        </div>

        {/* Month controls & Today button */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            오늘 ({todayStr.slice(5)})
          </button>
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800">
              {year}.{String(month + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* D-Day Top Banner (if D-Days configured) */}
      {ddayList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ddayList.map((dday) => {
            const ddayCalc = calculateDDay(dday.targetDate);
            return (
              <div
                key={dday.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Flag className="w-3 h-3 text-rose-500" />
                    {dday.title}
                  </span>
                  <div className="text-xs text-slate-400">{dday.targetDate}</div>
                </div>
                <span
                  className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                    ddayCalc.isToday
                      ? 'bg-rose-500 text-white animate-pulse'
                      : ddayCalc.isPast
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {ddayCalc.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Grid & Detail Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Grid (Left 8 cols on large screens) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-slate-200/80">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {DAYS_OF_WEEK.map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-center text-xs font-bold rounded-lg ${
                  idx === 5
                    ? 'text-blue-600 bg-blue-50/50'
                    : idx === 6
                    ? 'text-rose-600 bg-rose-50/50'
                    : 'text-slate-600 bg-slate-50/60'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(({ dateStr, isCurrentMonth, dayNum, date }) => {
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayStr;
              const stats = dateStatsMap[dateStr] || {
                totalMinutes: 0,
                completedCount: 0,
                totalCount: 0,
                activities: [],
              };
              const ddayItem = ddayList.find((d) => d.targetDate === dateStr);
              const dayHours = (stats.totalMinutes / 60).toFixed(1);
              const weekday = (date.getDay() + 6) % 7;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`min-h-[85px] sm:min-h-[110px] p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 shadow-md border-indigo-300 bg-indigo-50/30'
                      : isToday
                      ? 'border-indigo-200 bg-indigo-50/10'
                      : isCurrentMonth
                      ? 'border-slate-200/80 bg-white hover:bg-slate-50/70 hover:border-slate-300'
                      : 'border-slate-100 bg-slate-50/40 opacity-40 hover:opacity-75'
                  }`}
                >
                  {/* Top Bar: Date Number & D-Day Indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : weekday === 5
                          ? 'text-blue-600'
                          : weekday === 6
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {ddayItem && (
                      <span className="text-[10px] font-extrabold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md hidden sm:inline-block truncate max-w-[55px]">
                        {calculateDDay(dateStr).text}
                      </span>
                    )}
                  </div>

                  {/* Middle: Activity Pills (up to 2 visible on desktop) */}
                  <div className="space-y-1 my-1">
                    {stats.activities.slice(0, 2).map((act) => (
                      <div
                        key={act.id}
                        className="text-[10px] sm:text-[11px] truncate px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1"
                        style={{
                          backgroundColor: act.color ? `${act.color}25` : '#EEF2F6',
                          color: act.color || '#334155',
                          borderLeft: `2.5px solid ${act.color || '#94A3B8'}`,
                        }}
                      >
                        <span className="font-semibold text-[9px] opacity-75">{act.startTime}</span>
                        <span className="truncate">{act.title}</span>
                      </div>
                    ))}
                    {stats.activities.length > 2 && (
                      <div className="text-[9px] text-slate-500 font-semibold px-1">
                        +{stats.activities.length - 2}개 더보기
                      </div>
                    )}
                    {/* Display daily note/anniversary if exists */}
                    {anniversaries[dateStr] && (
                      <div className="text-[10px] text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded truncate font-medium border border-amber-100">
                        {anniversaries[dateStr]}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Study Hours & Completion Indicator */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 mt-auto">
                    {stats.totalMinutes > 0 ? (
                      <span className="font-semibold text-indigo-600">{dayHours}h</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}

                    {stats.totalCount > 0 && (
                      <span
                        className={`text-[9px] font-bold px-1 rounded ${
                          stats.completedCount === stats.totalCount
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {stats.completedCount}/{stats.totalCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Panel (Right 4 cols on large screens) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80">
            {/* Header with selected date info */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                  선택된 날짜 상세
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {selectedDateStr} ({selectedDayOfWeek}요일)
                </h2>
                {targetDDay && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600 font-bold">
                    <Flag className="w-3.5 h-3.5" />
                    <span>
                      {targetDDay.title} ({calculateDDay(targetDDay.targetDate).text})
                    </span>
                  </div>
                )}
              </div>

              {/* Action: Go to Daily Timetable */}
              <button
                type="button"
                onClick={handleGoToDailyTimetable}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: currentTheme.primary }}
                title="이 날짜의 하루 시간표로 이동"
              >
                <span>하루 시간표</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Metrics - REMOVED */}

            {/* Daily Memo / Note/Anniversary Editor */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <span className="font-bold flex items-center gap-1.5 text-slate-800 mb-2 text-sm">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                날짜별 메모 / 기념일
              </span>
              <textarea
                value={anniversaries[selectedDateStr] || ''}
                onChange={(e) => saveAnniversary(selectedDateStr, e.target.value)}
                placeholder="이 날짜에 대한 메모나 기념일을 입력하세요..."
                className="w-full h-24 p-3 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
              />
            </div>

            {/* Activity List for Date - REMOVED, functionality replaced by note/anniversary input */}

          </div>
        </div>
      </div>
    </div>
  );
};
