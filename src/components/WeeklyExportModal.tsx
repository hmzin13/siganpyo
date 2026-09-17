import React, { useState, useEffect, useRef } from 'react';
import { X, Download, RefreshCw, CheckCircle2, Eye, Calendar, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Activity, StudySlot, UserSettings, DayOfWeek } from '../types';
import { getThemeConfig, timeToMinutes, formatYMD } from '../utils/theme';

interface WeeklyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekDays: { date: Date; ymd: string; dayOfWeek: DayOfWeek }[];
  activities: Activity[];
  studySlots: StudySlot[];
  settings: UserSettings;
  userNickname?: string;
}

export const WeeklyExportModal: React.FC<WeeklyExportModalProps> = ({
  isOpen,
  onClose,
  weekDays,
  activities,
  studySlots,
  settings,
  userNickname,
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  const generatePreview = async () => {
    if (!exportRef.current) return;
    setIsGenerating(true);
    setError(null);

    try {
      // Small pause to allow DOM to settle
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2.5, // High resolution crisp output
        cacheBust: true,
      });

      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate export image preview:', err);
      setError('이미지 미리보기를 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPreviewDataUrl(null);
      // Wait for modal mount, then generate
      const timer = setTimeout(() => {
        generatePreview();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!previewDataUrl) return;
    const filename = `주간시간표_${weekDays[0].ymd}_${weekDays[6].ymd}.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = previewDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: currentTheme.primary }}
            >
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">주간 시간표 고해상도 이미지 저장</h2>
              <p className="text-[11px] text-slate-500">
                활동명이 잘리지 않는 전용 레이아웃으로 캡처되었습니다. 미리보기를 확인하고 저장하세요.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex flex-col items-center justify-center min-h-[350px]">
          {isGenerating ? (
            <div className="flex flex-col items-center space-y-3 py-16">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                글자가 잘리지 않는 고해상도 시간표 이미지를 생성하는 중...
              </p>
            </div>
          ) : error ? (
            <div className="text-center p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-md">
              <p className="text-xs font-semibold text-rose-700 mb-3">{error}</p>
              <button
                type="button"
                onClick={generatePreview}
                className="px-4 py-2 bg-white text-xs font-bold text-slate-800 border rounded-xl hover:bg-slate-50"
              >
                다시 시도
              </button>
            </div>
          ) : previewDataUrl ? (
            <div className="w-full flex flex-col items-center space-y-3">
              <div className="w-full flex items-center justify-between text-xs text-slate-500 px-1">
                <div className="flex items-center space-x-1 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>고해상도 이미지 생성 완료 (확대 및 스크롤하여 확인 가능)</span>
                </div>
                <button
                  type="button"
                  onClick={generatePreview}
                  className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 underline text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>새로고침</span>
                </button>
              </div>

              {/* Scrollable image container */}
              <div className="w-full max-h-[58vh] overflow-auto border border-slate-200 rounded-2xl bg-white shadow-inner p-2">
                <img
                  src={previewDataUrl}
                  alt="주간 시간표 미리보기"
                  className="w-full h-auto min-w-[800px] object-contain rounded-xl"
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500 hidden sm:block">
            파일명: <span className="font-mono text-slate-700">주간시간표_{weekDays[0].ymd}_{weekDays[6].ymd}.png</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
            <button
              id="btn-confirm-download-weekly-image"
              type="button"
              onClick={handleDownload}
              disabled={!previewDataUrl || isGenerating}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: currentTheme.primary }}
            >
              <Download className="w-4 h-4" />
              <span>이미지 다운로드 (.PNG)</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED HIGH-RES CAPTURE CANVAS (Rendered off-screen or in DOM with full unconstrained styling) */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1280px',
          zIndex: -1,
        }}
      >
        <div
          ref={exportRef}
          className="bg-white p-8 space-y-6 text-slate-800"
          style={{ width: '1280px', minHeight: '800px', fontFamily: 'Pretendard, sans-serif' }}
        >
          {/* Header */}
          <div
            className="p-6 rounded-2xl border flex items-center justify-between"
            style={{
              backgroundColor: currentTheme.bgSoft,
              borderColor: currentTheme.borderSoft,
            }}
          >
            <div>
              <div className="flex items-center space-x-2.5 mb-1">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block"
                  style={{ backgroundColor: currentTheme.primary }}
                />
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  주간 공부 시간표
                </h1>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: currentTheme.primaryLight,
                    color: currentTheme.primaryDark,
                  }}
                >
                  {currentTheme.name}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-600">
                {weekDays[0].ymd} ({weekDays[0].dayOfWeek}) ~ {weekDays[6].ymd} ({weekDays[6].dayOfWeek})
                {userNickname && <span className="ml-2 font-normal text-slate-500">| {userNickname}님의 스케줄</span>}
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-3 text-xs text-slate-600 bg-white/90 px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: currentTheme.primaryLight }} />
                <span>자습 시간대</span>
              </div>
              <div className="flex items-center space-x-1.5 ml-2">
                <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-200" />
                <span>쉬는 시간</span>
              </div>
            </div>
          </div>

          {/* 7 Days Grid */}
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((dayItem) => {
              const dayStudySlots = studySlots.filter((s) => s.dayOfWeek === dayItem.dayOfWeek);

              const dayActs = activities
                .filter((act) => {
                  if (act.date === dayItem.ymd) return true;
                  if (act.isRepeating && act.repeatDays && act.repeatDays.includes(dayItem.dayOfWeek)) {
                    return true;
                  }
                  return false;
                })
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

              return (
                <div
                  key={dayItem.ymd}
                  className="flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                >
                  {/* Day Header */}
                  <div
                    className="p-3 text-center border-b border-slate-200"
                    style={{ backgroundColor: currentTheme.primaryLight }}
                  >
                    <span className="font-extrabold text-sm text-slate-900 block">
                      {dayItem.dayOfWeek}요일
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {dayItem.date.getMonth() + 1}월 {dayItem.date.getDate()}일
                    </span>
                  </div>

                  {/* Study Slots Summary */}
                  {dayStudySlots.length > 0 && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">자습 시간대</span>
                      {dayStudySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="text-[10px] px-2 py-0.5 rounded-md border font-medium truncate"
                          style={{
                            backgroundColor: currentTheme.primaryLight,
                            borderColor: currentTheme.borderSoft,
                            color: currentTheme.primaryDark,
                          }}
                        >
                          {slot.label || '자습'} {slot.startTime}~{slot.endTime}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Activities List: Height grows naturally, full activity names word-wrapped without ellipsis */}
                  <div className="p-2.5 flex-1 space-y-2.5 min-h-[420px] bg-slate-50/20">
                    {dayActs.length > 0 ? (
                      dayActs.map((act) => (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-xl border shadow-2xs space-y-1.5"
                          style={{
                            backgroundColor: act.color || '#F3F4F6',
                            borderColor: 'rgba(0,0,0,0.08)',
                          }}
                        >
                          {/* Subject Tag if any */}
                          {act.subject && (
                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/90 text-slate-700 shadow-2xs">
                              {act.subject}
                            </span>
                          )}

                          {/* Full activity title: complete word wrapping, no truncation */}
                          <div className="text-xs font-bold text-slate-900 leading-snug break-words whitespace-normal break-all">
                            {act.title}
                          </div>

                          {/* Time & status row: small, subtle, separate line */}
                          <div className="pt-0.5 border-t border-black/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>
                              {act.startTime} ~ {act.endTime}
                            </span>
                            {act.isCompleted && (
                              <span className="font-sans text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-xs">
                                완료
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-[11px] text-slate-300 italic py-8">
                        일정 없음
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>공부 시간표 • Study Timetable</span>
            <span>생성 일시: {formatYMD(new Date())}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
