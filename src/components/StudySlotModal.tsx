import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { DayOfWeek } from '../types';
import { DAYS_OF_WEEK, THEME_CONFIGS } from '../utils/theme';

export const StudySlotModal: React.FC = () => {
  const {
    studySlotModalOpen,
    setStudySlotModalOpen,
    targetDayForStudySlot,
    setTargetDayForStudySlot,
    addStudySlot,
    settings,
  } = useSchedule();

  const currentTheme = THEME_CONFIGS[settings.themeColor] || THEME_CONFIGS.lavender;

  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('월');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('22:00');
  const [label, setLabel] = useState('저녁 자습');

  useEffect(() => {
    if (studySlotModalOpen && targetDayForStudySlot) {
      setDayOfWeek(targetDayForStudySlot);
    }
  }, [studySlotModalOpen, targetDayForStudySlot]);

  if (!studySlotModalOpen) return null;

  const handleClose = () => {
    setStudySlotModalOpen(false);
    setTargetDayForStudySlot(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    await addStudySlot({
      dayOfWeek,
      startTime,
      endTime,
      label: label.trim() || '자습 시간대',
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div
          className="px-5 py-4 flex items-center justify-between border-b"
          style={{ backgroundColor: currentTheme.bgSoft, borderColor: currentTheme.borderSoft }}
        >
          <div className="flex items-center space-x-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shadow-xs"
              style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
            >
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">자습 가능 시간대 추가</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Day of Week */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">적용 요일</label>
            <div className="flex space-x-1 justify-between">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayOfWeek(d)}
                  className={`w-9 h-9 rounded-lg font-bold text-xs transition-colors ${
                    dayOfWeek === d
                      ? 'shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={
                    dayOfWeek === d
                      ? { backgroundColor: currentTheme.primary, color: '#ffffff' }
                      : {}
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">시작 시간</label>
              <input
                id="input-study-slot-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">종료 시간</label>
              <input
                id="input-study-slot-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">시간대 이름 (선택)</label>
            <input
              id="input-study-slot-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="예: 방과 후 자습, 주말 오전 집중"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[11px] text-slate-500 leading-relaxed">
            💡 시간대를 등록해두면 시간표에서 클릭 한 번으로 해당 시간에 바로 활동을 채워넣을 수 있습니다.
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              id="btn-study-slot-submit"
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ backgroundColor: currentTheme.primary }}
            >
              자습 시간대 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
