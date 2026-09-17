import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';

export const ConflictWarningToast: React.FC = () => {
  const { warningToast, dismissWarningToast } = useSchedule();

  if (!warningToast) return null;

  return (
    <div
      id="conflict-warning-toast"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-amber-50/95 border border-amber-300/80 rounded-2xl p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-amber-900 mb-1">일정 안내 알림</h4>
          <p className="text-xs font-medium text-amber-800 leading-snug">
            {warningToast.message}
          </p>

          {warningToast.details && (
            <p className="text-[11px] text-amber-700/90 mt-1">
              상세 사유: {warningToast.details}
            </p>
          )}

          {warningToast.conflictingActivities && warningToast.conflictingActivities.length > 0 && (
            <div className="mt-2 bg-white/70 border border-amber-200/70 rounded-lg p-2 text-[11px] text-amber-900">
              <span className="font-semibold block mb-0.5">겹친 기존 일정:</span>
              <ul className="space-y-0.5">
                {warningToast.conflictingActivities.map((act) => (
                  <li key={act.id} className="flex justify-between items-center text-amber-800">
                    <span className="truncate">{act.title}</span>
                    <span className="font-mono text-[10px] text-amber-600 ml-2 shrink-0">
                      {act.startTime} ~ {act.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-amber-600">
              * 일정이 정상 추가·배치되었습니다.
            </span>
            <button
              id="btn-warning-dismiss"
              type="button"
              onClick={dismissWarningToast}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>확인</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissWarningToast}
          className="text-amber-500 hover:text-amber-700 p-0.5"
          aria-label="닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
