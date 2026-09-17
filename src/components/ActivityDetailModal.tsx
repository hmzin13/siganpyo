import React from 'react';
import {
  X,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Tag,
  Repeat,
  AlertCircle,
  Edit2,
  Copy,
  Trash2,
} from 'lucide-react';
import { Activity } from '../types';
import { useSchedule } from '../context/ScheduleContext';
import { getThemeConfig, timeToMinutes, parseYMD, getDayOfWeekFromDate } from '../utils/theme';

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  const {
    settings,
    toggleActivityCompletion,
    deleteActivity,
    copyActivity,
    setEditingActivity,
    setActivityModalOpen,
  } = useSchedule();

  if (!isOpen || !activity) return null;

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  const startMins = timeToMinutes(activity.startTime);
  const endMins = timeToMinutes(activity.endTime);
  const diffMins = Math.max(0, endMins - startMins);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const durationText =
    hours > 0 ? (mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`) : `${mins}분`;

  const dateObj = parseYMD(activity.date);
  const dayOfWeek = getDayOfWeekFromDate(dateObj);

  const handleEdit = () => {
    onClose();
    setEditingActivity(activity);
    setActivityModalOpen(true);
  };

  const handleCopy = async () => {
    await copyActivity(activity);
    onClose();
  };

  const handleDelete = async () => {
    if (confirm(`'${activity.title}' 일정을 삭제하시겠습니까?`)) {
      await deleteActivity(activity.id);
      onClose();
    }
  };

  const handleToggle = async () => {
    await toggleActivityCompletion(activity.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header with Activity Color Accent */}
        <div
          className="p-5 border-b flex items-start justify-between relative"
          style={{ backgroundColor: activity.color || currentTheme.primaryLight }}
        >
          <div className="space-y-1 pr-6">
            <div className="flex items-center space-x-2">
              {activity.subject && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/90 text-slate-800 shadow-2xs">
                  {activity.subject}
                </span>
              )}
              {activity.priority && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    activity.priority === 'high'
                      ? 'bg-rose-100 text-rose-700'
                      : activity.priority === 'low'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {activity.priority === 'high' ? '중요' : activity.priority === 'low' ? '보통' : '일반'}
                </span>
              )}
            </div>

            {/* Full Activity Title without truncation */}
            <h3 className="text-lg font-bold text-slate-900 leading-snug break-words whitespace-normal pt-1">
              {activity.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs sm:text-sm">
          {/* Time & Duration */}
          <div className="flex items-start space-x-3 text-slate-700">
            <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 font-mono text-sm">
                {activity.startTime} ~ {activity.endTime}
                <span className="ml-2 font-sans text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-md">
                  {durationText}
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                {activity.date} ({dayOfWeek}요일)
              </p>
            </div>
          </div>

          {/* Repetition if any */}
          {activity.isRepeating && (
            <div className="flex items-center space-x-3 text-slate-700">
              <Repeat className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-semibold text-slate-900">반복 일정</span>
                <p className="text-slate-500 text-xs">
                  {activity.repeatDays && activity.repeatDays.length > 0
                    ? `매주 ${activity.repeatDays.join(', ')}요일마다 반복`
                    : '반복 설정됨'}
                </p>
              </div>
            </div>
          )}

          {/* Memo if any */}
          {activity.memo && (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs">
              <span className="font-semibold text-amber-900 block mb-1">📝 메모</span>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {activity.memo}
              </p>
            </div>
          )}

          {/* Completion Status */}
          {activity.hasCompletionCheck && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {activity.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400" />
                )}
                <span className={`font-semibold text-xs ${activity.isCompleted ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {activity.isCompleted ? '공부 완료됨' : '아직 진행 전'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="px-2.5 py-1 text-xs rounded-lg border font-medium bg-white hover:bg-slate-100 transition-colors"
              >
                {activity.isCompleted ? '완료 취소' : '완료 체크'}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>수정</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>복사</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>삭제</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-xs"
            style={{ backgroundColor: currentTheme.primary }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
