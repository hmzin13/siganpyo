import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, Clock, Calendar, RefreshCw, Layers } from 'lucide-react';
import { useSchedule } from '../context/ScheduleContext';
import { Activity, DayOfWeek, AIRecommendationResult } from '../types';
import { PASTEL_ACTIVITY_COLORS, DAYS_OF_WEEK, getThemeConfig, parseYMD, getDayOfWeekFromDate, timeToMinutes, DEFAULT_SUBJECTS } from '../utils/theme';

export const ActivityModal: React.FC = () => {
  const {
    activityModalOpen,
    setActivityModalOpen,
    editingActivity,
    setEditingActivity,
    prefilledTime,
    setPrefilledTime,
    currentDate,
    addActivity,
    updateActivity,
    deleteActivity,
    copyActivity,
    settings,
    user: currentUser,
  } = useSchedule() as any;

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(currentDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [color, setColor] = useState(PASTEL_ACTIVITY_COLORS[0].bg);
  const [hasCompletionCheck, setHasCompletionCheck] = useState(true);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatDays, setRepeatDays] = useState<DayOfWeek[]>([]);
  const [repeatIntervalWeeks, setRepeatIntervalWeeks] = useState(1);
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // AI Recommendation states & duration inputs
  const [placementMode, setPlacementMode] = useState<'manual' | 'ai'>('manual');
  const [durationHours, setDurationHours] = useState<number>(1);
  const [durationMins, setDurationMins] = useState<number>(0);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<'any' | 'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIRecommendationResult | null>(null);
  const [alternativeOffset, setAlternativeOffset] = useState<number>(0);

  const totalDurationMinutes = Math.max(10, durationHours * 60 + durationMins);

  // Quick preset helper
  const handleApplyDurationPreset = (h: number, m: number) => {
    setDurationHours(h);
    setDurationMins(m);
  };

  // Initialize or reset when modal opens
  useEffect(() => {
    if (activityModalOpen) {
      if (editingActivity) {
        setTitle(editingActivity.title);
        setSubject(editingActivity.subject || '');
        setMemo(editingActivity.memo || '');
        setDate(editingActivity.date);
        setStartTime(editingActivity.startTime);
        setEndTime(editingActivity.endTime);
        setColor(editingActivity.color);
        setHasCompletionCheck(editingActivity.hasCompletionCheck);
        setIsRepeating(!!editingActivity.isRepeating);
        setRepeatDays(editingActivity.repeatDays || []);
        setRepeatIntervalWeeks(editingActivity.repeatIntervalWeeks || 1);
        setPriority(editingActivity.priority || 'medium');
        setPlacementMode('manual');

        const diffM = Math.max(15, timeToMinutes(editingActivity.endTime) - timeToMinutes(editingActivity.startTime));
        setDurationHours(Math.floor(diffM / 60));
        setDurationMins(diffM % 60);
      } else {
        // New Activity
        setTitle('');
        setSubject('');
        setMemo('');
        setDate(prefilledTime?.date || currentDate);
        setStartTime(prefilledTime?.startTime || '14:00');
        setEndTime(prefilledTime?.endTime || '15:00');
        setColor(PASTEL_ACTIVITY_COLORS[Math.floor(Math.random() * PASTEL_ACTIVITY_COLORS.length)].bg);
        setHasCompletionCheck(true);
        setIsRepeating(false);
        const day = getDayOfWeekFromDate(parseYMD(prefilledTime?.date || currentDate));
        setRepeatDays([day]);
        setRepeatIntervalWeeks(1);
        setPriority('medium');
        setPlacementMode('manual');

        const initialDiffM = Math.max(15, timeToMinutes(prefilledTime?.endTime || '15:00') - timeToMinutes(prefilledTime?.startTime || '14:00'));
        setDurationHours(Math.floor(initialDiffM / 60));
        setDurationMins(initialDiffM % 60);
      }
      setAiResult(null);
      setAlternativeOffset(0);
    }
  }, [activityModalOpen, editingActivity, prefilledTime, currentDate]);

  if (!activityModalOpen) return null;

  const handleClose = () => {
    setActivityModalOpen(false);
    setEditingActivity(null);
    setPrefilledTime(null);
    setAiResult(null);
  };

  const handleToggleDay = (day: DayOfWeek) => {
    if (repeatDays.includes(day)) {
      setRepeatDays(repeatDays.filter((d) => d !== day));
    } else {
      setRepeatDays([...repeatDays, day]);
    }
  };

  // AI Recommendation preview fetcher
  const handleFetchAIRecommendation = async (offset = 0) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/recommend-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || '공부 활동',
          subject: subject || '학습',
          memo: memo || undefined,
          durationMinutes: totalDurationMinutes,
          priority,
          preferredTimeOfDay,
          targetDate: date,
          userId: currentUser?.id,
          alternativeOffset: offset,
        }),
      });

      const data = await res.json();
      setAiResult(data);
      setAlternativeOffset(offset);
    } catch (err) {
      console.error('AI Recommend error:', err);
      setAiResult({
        success: false,
        recommendedDate: date,
        recommendedStartTime: startTime,
        recommendedEndTime: endTime,
        reason: '추천 요청 중 통신 오류가 발생했습니다.',
        isOutsideStudySlot: false,
        encroachesBreakTime: false,
        hasConflict: false,
        noSlotReason: '추천 서버 응답이 지연되고 있습니다. 직접 시간을 설정해주세요.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI Recommendation
  const handleApplyAIRecommendation = () => {
    if (!aiResult || !aiResult.success) return;
    setDate(aiResult.recommendedDate);
    setStartTime(aiResult.recommendedStartTime);
    setEndTime(aiResult.recommendedEndTime);
    setPlacementMode('manual'); // switch back to manual with values filled
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('활동 이름을 입력해주세요.');
      return;
    }

    if (startTime >= endTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    if (editingActivity) {
      await updateActivity({
        ...editingActivity,
        title: title.trim(),
        subject: subject.trim(),
        memo: memo.trim() || undefined,
        date,
        startTime,
        endTime,
        color,
        hasCompletionCheck,
        isRepeating,
        repeatDays: isRepeating ? repeatDays : undefined,
        repeatIntervalWeeks: isRepeating ? repeatIntervalWeeks : undefined,
        priority,
      });
    } else {
      await addActivity({
        title: title.trim(),
        subject: subject.trim(),
        memo: memo.trim() || undefined,
        date,
        startTime,
        endTime,
        color,
        isCompleted: false,
        hasCompletionCheck,
        isRepeating,
        repeatDays: isRepeating ? repeatDays : undefined,
        repeatIntervalWeeks: isRepeating ? repeatIntervalWeeks : undefined,
        priority,
      });
    }

    handleClose();
  };

  const handleDelete = async () => {
    if (!editingActivity) return;
    if (confirm('이 활동을 삭제하시겠습니까?')) {
      await deleteActivity(editingActivity.id);
      handleClose();
    }
  };

  const handleCopy = async () => {
    if (!editingActivity) return;
    await copyActivity(editingActivity);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 my-8 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ backgroundColor: currentTheme.bgSoft, borderColor: currentTheme.borderSoft }}
        >
          <div className="flex items-center space-x-2">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs"
              style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
            >
              {editingActivity ? '✏️' : '➕'}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingActivity ? '활동 수정' : '새 활동 추가'}
              </h3>
              <p className="text-xs text-slate-500">시간표에 들어갈 공부 및 일정을 등록합니다</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Mode Selector: Manual vs AI */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPlacementMode('manual')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                placementMode === 'manual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>직접 시간 지정</span>
            </button>
            <button
              type="button"
              onClick={() => setPlacementMode('ai')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                placementMode === 'ai'
                  ? 'shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              style={
                placementMode === 'ai'
                  ? { backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }
                  : {}
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 추천으로 배치</span>
            </button>
          </div>

          {/* Activity Title & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                활동 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-activity-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 수학 기출 2회독, 영단어 암기"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  과목 / 분류
                </label>
              </div>
              <div className="relative">
                <input
                  id="input-activity-subject"
                  type="text"
                  list="registered-subjects-list"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="선택 또는 직접 입력"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <datalist id="registered-subjects-list">
                  {(settings.customSubjects || DEFAULT_SUBJECTS).map((s: string) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              {/* Quick Subject Select Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5 no-scrollbar">
                {(settings.customSubjects || DEFAULT_SUBJECTS).slice(0, 6).map((s: string) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                      subject === s
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date & Memo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">날짜</label>
              <div className="relative">
                <input
                  id="input-activity-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                메모 (선택)
              </label>
              <input
                id="input-activity-memo"
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 3단원 오답정리 및 복습"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* AI Recommendation Panel */}
          {placementMode === 'ai' && (
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ backgroundColor: currentTheme.bgSoft, borderColor: currentTheme.borderSoft }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  AI 최적 시간 배치 설정
                </span>
                <span className="text-[11px] text-slate-500">
                  자습시간·쉬는시간·기존일정 자동 계산
                </span>
              </div>

              {/* Flexible Duration: Hour & Minute Input + Quick Chips */}
              <div className="p-3 bg-white/80 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    예상 소요 시간 (시간·분 직접 입력)
                  </label>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    총 {totalDurationMinutes}분 ({Math.floor(totalDurationMinutes / 60)}시간 {totalDurationMinutes % 60}분)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex-1 flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={durationHours}
                      onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <span className="text-xs font-medium text-slate-600 shrink-0">시간</span>
                  </div>

                  <div className="flex-1 flex items-center space-x-1.5">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={durationMins}
                      onChange={(e) => setDurationMins(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <span className="text-xs font-medium text-slate-600 shrink-0">분</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '30분', h: 0, m: 30 },
                    { label: '45분', h: 0, m: 45 },
                    { label: '1시간', h: 1, m: 0 },
                    { label: '1시간 20분', h: 1, m: 20 },
                    { label: '2시간', h: 2, m: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyDurationPreset(preset.h, preset.m)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        durationHours === preset.h && durationMins === preset.m
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">선호 시간대</label>
                  <select
                    value={preferredTimeOfDay}
                    onChange={(e) => setPreferredTimeOfDay(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="any">전체 (상관없음)</option>
                    <option value="morning">오전 (07:00~12:00)</option>
                    <option value="afternoon">오후 (13:00~18:00)</option>
                    <option value="evening">저녁 (19:00~22:00)</option>
                    <option value="night">야간 (21:00 이후)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">우선순위</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="high">높음 (집중 시간대)</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </div>
              </div>

              {/* Requirement 4: 바로 아래에 '추천 배치 미리보기' 버튼 제공 */}
              <div>
                <button
                  id="btn-ai-preview"
                  type="button"
                  onClick={() => handleFetchAIRecommendation(0)}
                  disabled={aiLoading}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-white flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>AI 최적 시간 분석 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>추천 배치 미리보기</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Recommendation Preview Section */}
              {aiResult && (
                <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs shadow-xs animate-in fade-in">
                  {aiResult.success ? (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold uppercase text-indigo-600 block mb-0.5">
                            AI 추천 시간대
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {aiResult.recommendedDate} {aiResult.recommendedStartTime} ~ {aiResult.recommendedEndTime}
                          </span>
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {totalDurationMinutes}분 소요
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                        💡 <strong>추천 이유:</strong> {aiResult.reason}
                      </p>

                      {/* Overlap & Break info */}
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          {aiResult.hasConflict ? (
                            <span className="text-rose-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              기존 일정 겹침 발생: {aiResult.conflictingActivities?.map((c) => c.title).join(', ')}
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              기존 일정과 겹치지 않음
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {aiResult.encroachesBreakTime ? (
                            <span className="text-amber-600 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              쉬는 시간({aiResult.breakTimeName}) 침범
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              쉬는 시간과 겹치지 않음
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {aiResult.isOutsideStudySlot ? (
                            <span className="text-slate-500">
                              ℹ️ 설정된 자습 가능 시간대 외의 시간입니다
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              지정된 자습 가능 시간 내 배치
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Conflict alert notice */}
                      {aiResult.requiresMovingExisting && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2 rounded-lg text-[11px]">
                          ⚠️ 이 추천을 적용하면 기존 일정과 시간이 겹치게 됩니다. 배치를 확인해주세요.
                        </div>
                      )}

                      {/* Preview Buttons */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleFetchAIRecommendation(alternativeOffset + 1)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>다른 시간 추천</span>
                        </button>

                        <button
                          id="btn-ai-apply"
                          type="button"
                          onClick={handleApplyAIRecommendation}
                          className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>이 배치 적용</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-600 space-y-2">
                      <p className="text-rose-600 font-medium">⚠️ 추천 가능한 시간이 없습니다.</p>
                      <p className="text-[11px] text-slate-500">{aiResult.noSlotReason}</p>
                      <button
                        type="button"
                        onClick={() => setPlacementMode('manual')}
                        className="text-xs text-indigo-600 underline font-medium"
                      >
                        직접 시간 지정으로 돌아가기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Time Selection (Manual or pre-filled from AI) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">시작 시간</label>
              <input
                id="input-activity-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">종료 시간</label>
              <input
                id="input-activity-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Pastel Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">활동 색상 (파스텔톤)</label>
            <div className="flex flex-wrap gap-2">
              {PASTEL_ACTIVITY_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.bg)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center border ${
                    color === c.bg ? 'scale-110 ring-2 ring-slate-400 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.bg, borderColor: c.border }}
                  title={c.name}
                >
                  {color === c.bg && <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Completion Check Option (Requirement 2) */}
          <div className="pt-1 border-t border-slate-100">
            <label className="flex items-start space-x-3 cursor-pointer py-1">
              <input
                id="checkbox-completion"
                type="checkbox"
                checked={hasCompletionCheck}
                onChange={(e) => setHasCompletionCheck(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  일정 완료 체크 표시 기능 사용
                </span>
                <span className="text-[11px] text-slate-500">
                  문제 풀이 등 완료 체크가 필요한 활동에 켜고, 식사나 이동처럼 체크가 불필요한 활동은 끌 수 있습니다.
                </span>
              </div>
            </label>
          </div>

          {/* Weekly Repeating Option (Requirement 2) */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                id="checkbox-repeating"
                type="checkbox"
                checked={isRepeating}
                onChange={(e) => setIsRepeating(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-800">
                매주 반복되는 일정으로 설정
              </span>
            </label>

            {isRepeating && (
              <div className="pl-7 space-y-2.5 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">반복 요일</label>
                  <div className="flex space-x-1">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleToggleDay(d)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          repeatDays.includes(d)
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <span>반복 주기:</span>
                  <select
                    value={repeatIntervalWeeks}
                    onChange={(e) => setRepeatIntervalWeeks(Number(e.target.value))}
                    className="px-2 py-1 border border-slate-200 rounded-md text-xs bg-white"
                  >
                    <option value={1}>매주 (1주마다)</option>
                    <option value={2}>2주마다</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              {editingActivity && (
                <div className="flex space-x-2">
                  <button
                    id="btn-activity-delete"
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    삭제
                  </button>
                  <button
                    id="btn-activity-copy"
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>복사</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                id="btn-activity-submit"
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                style={{ backgroundColor: currentTheme.primary }}
              >
                {editingActivity ? '수정 완료' : '활동 등록'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
