import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Activity, StudySlot, UserSettings, DayOfWeek } from '../types';
import { getThemeConfig, timeToMinutes, minutesToTime } from '../utils/theme';

interface DailyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  dayOfWeek: DayOfWeek;
  activities: Activity[];
  studySlots: StudySlot[];
  settings: UserSettings;
  userNickname?: string;
  noteContent?: string;
}

export const DailyExportModal: React.FC<DailyExportModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  dayOfWeek,
  activities,
  studySlots,
  settings,
  userNickname,
  noteContent,
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  const dayActs = activities
    .filter((a) => {
      if (a.date === dateStr) return true;
      if (a.isRepeating && a.repeatDays && a.repeatDays.includes(dayOfWeek)) return true;
      return false;
    })
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const daySlots = studySlots.filter((s) => s.dayOfWeek === dayOfWeek);

  const generatePreview = async () => {
    if (!exportRef.current) return;
    setIsGenerating(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        cacheBust: true,
      });
      setPreviewDataUrl(dataUrl);
    } catch (err) {
      console.error('Failed to generate daily export preview:', err);
      setError('이미지 미리보기 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPreviewDataUrl(null);
      const timer = setTimeout(() => {
        generatePreview();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!previewDataUrl) return;
    const filename = `하루시간표_${dateStr}.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = previewDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
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
              <h2 className="text-sm font-bold text-slate-900">하루 시간표 고해상도 이미지 저장</h2>
              <p className="text-[11px] text-slate-500">
                시간표와 활동 정보만 깔끔하게 포함된 미리보기입니다. 글자가 잘리지 않는지 확인하고 저장하세요.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex flex-col items-center justify-start">
          {isGenerating && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-600">
                고해상도 시간표 이미지를 렌더링하고 있습니다...
              </p>
            </div>
          )}

          {error && (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-bold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={generatePreview}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* Actual generated image preview */}
          {!isGenerating && previewDataUrl && (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-200 max-w-2xl w-full">
                <img
                  src={previewDataUrl}
                  alt="하루 시간표 이미지 미리보기"
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>글자가 겹치거나 잘리지 않고 고해상도(PNG)로 준비되었습니다.</span>
              </p>
            </div>
          )}
        </div>

        {/* HIDDEN OFSCREEN RENDER DOM FOR HIGH RESOLUTION CAPTURE */}
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <div
            ref={exportRef}
            className="w-[850px] bg-white p-8 space-y-6 text-slate-900 font-sans"
            style={{ minHeight: '900px' }}
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    하루 공부 시간표
                  </h1>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
                  >
                    {currentTheme.name}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {dateStr} ({dayOfWeek}요일)
                </p>
              </div>

              {userNickname && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">학습자</span>
                  <span className="text-sm font-bold text-slate-800">{userNickname}</span>
                </div>
              )}
            </div>

            {/* Study Slots and Breaks banner */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-bold text-slate-700 block">오늘의 자습 가능 시간대</span>
                {daySlots.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {daySlots.map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded-md font-mono text-[11px] font-medium border"
                        style={{
                          backgroundColor: currentTheme.primaryLight,
                          borderColor: currentTheme.borderSoft,
                          color: currentTheme.primaryDark,
                        }}
                      >
                        {s.label || '자습'}: {s.startTime} ~ {s.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">설정된 자습 시간대 없음</span>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                <span className="font-bold text-amber-900 block">쉬는 시간대</span>
                {settings.breakTimes && settings.breakTimes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {settings.breakTimes.map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-0.5 rounded-md font-mono text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-200"
                      >
                        {b.name}: {b.startTime} ~ {b.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-amber-600/70">설정된 쉬는 시간 없음</span>
                )}
              </div>
            </div>

            {/* Activities Table - Multiline, Clear, High-Contrast */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 grid grid-cols-12 text-xs font-bold text-slate-700">
                <div className="col-span-3">시간</div>
                <div className="col-span-5">활동명 & 메모</div>
                <div className="col-span-2">과목 / 분류</div>
                <div className="col-span-2 text-center">완료 여부</div>
              </div>

              <div className="divide-y divide-slate-100">
                {dayActs.length > 0 ? (
                  dayActs.map((act) => (
                    <div
                      key={act.id}
                      className="px-4 py-3.5 grid grid-cols-12 text-xs items-center"
                      style={{
                        backgroundColor: act.color ? `${act.color}33` : '#FFFFFF',
                      }}
                    >
                      <div className="col-span-3 font-mono font-bold text-slate-800 text-sm">
                        {act.startTime} ~ {act.endTime}
                      </div>

                      <div className="col-span-5 pr-2">
                        <div className="font-bold text-slate-900 text-sm break-words whitespace-normal leading-snug">
                          {act.title}
                        </div>
                        {act.memo && (
                          <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed bg-white/70 p-1.5 rounded-md border border-slate-200/60">
                            📝 {act.memo}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2">
                        {act.subject ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-700">
                            {act.subject}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        {act.hasCompletionCheck ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              act.isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {act.isCompleted ? '✓ 완료' : '미완료'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">일정</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 text-sm italic">
                    등록된 활동이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* Note content if present */}
            {noteContent && noteContent.trim() && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                <span className="font-bold text-slate-700 block mb-1">오늘의 한마디 & 메모</span>
                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {noteContent}
                </p>
              </div>
            )}

            {/* Footer watermark */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>공부 시간표 웹사이트</span>
              <span>인쇄 및 학습용 고해상도 생성 문서</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            취소
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={generatePreview}
              disabled={isGenerating}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>미리보기 새로고침</span>
            </button>

            <button
              id="btn-confirm-download-daily-image"
              type="button"
              onClick={handleDownload}
              disabled={!previewDataUrl || isGenerating}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: currentTheme.primary }}
            >
              <Download className="w-4 h-4" />
              <span>이미지 다운로드 (.PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
