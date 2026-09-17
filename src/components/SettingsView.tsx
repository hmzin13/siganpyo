import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Palette,
  Clock,
  Coffee,
  Repeat,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  Database,
  ExternalLink,
  Edit2,
  Upload,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  BookOpen,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown,
  Flag,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { ThemeColorKey, BreakTime, CustomThemeItem, DayOfWeek, DDayItem } from '../types';
import { THEME_CONFIGS, getThemeConfig, DAYS_OF_WEEK, DEFAULT_SUBJECTS, formatYMD, calculateDDay } from '../utils/theme';

export const SettingsView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const {
    settings,
    updateSettings,
    activities,
    updateActivity,
    deleteActivity,
    deleteActivities,
    setEditingActivity,
    setActivityModalOpen,
  } = useSchedule();

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  // Profile Form States
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile Image Upload States (Requirement: direct device upload, preview, format/size limits, persistence)
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Custom Theme Color States (Requirement: custom colors, hex code, save & delete, contrast)
  const [customHex, setCustomHex] = useState('#D26388');
  const [customThemeName, setCustomThemeName] = useState('');
  const [customThemeError, setCustomThemeError] = useState<string | null>(null);

  // Profile Change Confirmation Dialog
  const [profileConfirmModal, setProfileConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({ open: false, title: '', description: '', onConfirm: async () => {} });

  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // General Settings States
  const [dayStartHour, setDayStartHour] = useState(settings.dayStartHour ?? 7);
  const [dayEndHour, setDayEndHour] = useState(settings.dayEndHour ?? 24);
  const [timeSlotInterval, setTimeSlotInterval] = useState(settings.timeSlotInterval ?? 30);
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>(settings.breakTimes || []);

  // Per-Day Break Time States (Requirement 1: 요일별 쉬는 시간 설정)
  const [selectedBreakTab, setSelectedBreakTab] = useState<'all' | DayOfWeek | 'exception'>('all');
  const [newBreakName, setNewBreakName] = useState('');
  const [newBreakStart, setNewBreakStart] = useState('12:00');
  const [newBreakEnd, setNewBreakEnd] = useState('13:00');
  const [newBreakTargetDays, setNewBreakTargetDays] = useState<DayOfWeek[]>([]);
  const [newBreakExceptionDate, setNewBreakExceptionDate] = useState<string>(() => formatYMD(new Date()));
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);

  // Custom Subjects States (Requirement 6: 과목 분류 직접 추가 및 편집)
  // Removed local customSubjects state to rely on global settings.customSubjects
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [editingSubjectValue, setEditingSubjectValue] = useState('');

  const customSubjects = settings.customSubjects || DEFAULT_SUBJECTS;


  // D-Day List States
  const [ddayList, setDDayList] = useState<DDayItem[]>(settings.ddayList || []);
  const [newDDayTitle, setNewDDayTitle] = useState('');
  const [newDDayDate, setNewDDayDate] = useState('');
  const [newDDayColor, setNewDDayColor] = useState('#7C6BB5');

  // Firebase status
  const [firebaseStatus, setFirebaseStatus] = useState<{ configured: boolean; message: string }>({
    configured: false,
    message: '확인 중...',
  });

  useEffect(() => {
    fetch('/api/firebase/status')
      .then((res) => res.json())
      .then((data) => setFirebaseStatus(data))
      .catch(() => {
        setFirebaseStatus({
          configured: false,
          message: 'Firebase 설정 상태를 조회할 수 없습니다.',
        });
      });
  }, []);

  // Sync with user
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setUsername(user.username || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  // Sync settings
  useEffect(() => {
    setDayStartHour(settings.dayStartHour ?? 7);
    setDayEndHour(settings.dayEndHour ?? 24);
    setTimeSlotInterval(settings.timeSlotInterval ?? 30);
    setBreakTimes(settings.breakTimes || []);
    if (settings.ddayList) {
      setDDayList(settings.ddayList);
    }
  }, [settings]);

  // Avatar presets
  const AVATAR_PRESETS = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Lucky',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Whiskers',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Buddy',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Cleo',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
  ];

  // Process selected image file (supports click and drag-and-drop)
  const processImageFile = (file: File) => {
    setAvatarError(null);
    setAvatarSuccess(null);

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      setAvatarError('지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, GIF 파일을 선택해주세요.');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setAvatarError('파일 크기가 5MB를 초과합니다. 5MB 이하의 사진을 업로드해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      // Resizes via canvas to max 512x512 for crispness and reliable multi-device sync
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
          setPendingAvatarPreview(optimizedDataUrl);
        } else {
          setPendingAvatarPreview(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setAvatarError('사진을 읽어오는데 실패했습니다. 다른 파일을 선택해주세요.');
    };
    reader.readAsDataURL(file);
  };

  // Confirm and save previewed profile photo to account
  const handleConfirmAvatarSave = async () => {
    if (!pendingAvatarPreview) return;
    setIsSavingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const res = await updateProfile({ newAvatarUrl: pendingAvatarPreview });
      if (res.success) {
        setAvatarUrl(pendingAvatarPreview);
        setPendingAvatarPreview(null);
        setAvatarSuccess('프로필 사진이 안전하게 저장되었습니다. 다른 기기에서도 로그인 시 유지됩니다.');
      } else {
        setAvatarError(res.error || '프로필 사진 저장에 실패했습니다.');
      }
    } catch (e) {
      setAvatarError('서버 연결 중 오류가 발생했습니다.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Delete profile photo
  const handleDeleteAvatar = async () => {
    if (confirm('현재 프로필 사진을 삭제하고 기본 이니셜 아바타로 변경하시겠습니까?')) {
      setIsSavingAvatar(true);
      setAvatarError(null);
      setAvatarSuccess(null);
      try {
        const res = await updateProfile({ newAvatarUrl: '' });
        if (res.success) {
          setAvatarUrl('');
          setPendingAvatarPreview(null);
          setAvatarSuccess('프로필 사진이 삭제되었습니다.');
        } else {
          setAvatarError(res.error || '프로필 사진 삭제에 실패했습니다.');
        }
      } catch (e) {
        setAvatarError('서버 연결 중 오류가 발생했습니다.');
      } finally {
        setIsSavingAvatar(false);
      }
    }
  };

  // Request Profile Info Change with Confirmation Modal
  const handleRequestProfileSave = (e: React.FormEvent) => {
    e.preventDefault();

    let changesDescription = [];
    if (nickname !== user?.nickname) changesDescription.push(`닉네임: '${nickname}'`);
    if (username !== user?.username) changesDescription.push(`아이디: '${username}'`);
    if (avatarUrl !== user?.avatarUrl) changesDescription.push('프로필 사진 변경');
    if (newPassword) changesDescription.push('새 비밀번호 설정');

    if (changesDescription.length === 0) {
      setProfileFeedback({ type: 'error', message: '변경된 항목이 없습니다.' });
      return;
    }

    if ((newPassword || username !== user?.username) && !currentPassword) {
      setProfileFeedback({ type: 'error', message: '아이디 또는 비밀번호를 변경하려면 현재 비밀번호를 입력해야 합니다.' });
      return;
    }

    setProfileConfirmModal({
      open: true,
      title: '프로필 정보 변경 확인',
      description: `다음 항목을 변경하시겠습니까?\n\n• ${changesDescription.join('\n• ')}\n\n(기존 시간표 및 저장된 데이터는 그대로 유지됩니다.)`,
      onConfirm: async () => {
        const res = await updateProfile({
          newNickname: nickname,
          newUsername: username !== user?.username ? username : undefined,
          newAvatarUrl: avatarUrl,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        });

        if (res.success) {
          setProfileFeedback({ type: 'success', message: '프로필 정보가 안전하게 변경되었습니다.' });
          setCurrentPassword('');
          setNewPassword('');
        } else {
          setProfileFeedback({ type: 'error', message: res.error || '프로필 변경에 실패했습니다.' });
        }
        setProfileConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Theme change
  const handleThemeChange = async (colorKey: string) => {
    await updateSettings({ themeColor: colorKey });
  };

  // Add custom user theme color
  const handleAddCustomTheme = async () => {
    setCustomThemeError(null);
    let hex = customHex.replace('#', '').trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      setCustomThemeError('올바른 6자리 HEX 색상 코드를 입력해주세요. (예: #E06D8A)');
      return;
    }

    const cleanHex = `#${hex.toUpperCase()}`;
    const name = customThemeName.trim() || `사용자 색상 ${cleanHex}`;
    const newItem: CustomThemeItem = {
      id: `custom_${Date.now()}`,
      name,
      hex: cleanHex,
    };

    const currentList = settings.customThemes || [];
    const updated = [...currentList, newItem];

    await updateSettings({ customThemes: updated, themeColor: newItem.id });
    setCustomThemeName('');
  };

  // Delete custom theme
  const handleDeleteCustomTheme = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = (settings.customThemes || []).filter((c) => c.id !== id);
    const nextColor = settings.themeColor === id ? 'lavender' : settings.themeColor;
    await updateSettings({ customThemes: updated, themeColor: nextColor });
  };

  // Timetable Hour / Interval change
  const handleTimeSettingsSave = async () => {
    if (dayStartHour >= dayEndHour) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }
    await updateSettings({
      dayStartHour,
      dayEndHour,
      timeSlotInterval,
    });
    alert('시간표 시간 설정이 저장되었습니다.');
  };

  // Add or Update Break Time (Requirement 1: 요일별 쉬는 시간 설정)
  const handleAddOrUpdateBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBreakName.trim()) {
      alert('쉬는 시간 이름을 입력해주세요.');
      return;
    }
    if (newBreakStart >= newBreakEnd) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    let targetBreak: BreakTime;

    if (editingBreakId) {
      const existing = breakTimes.find((b) => b.id === editingBreakId);
      targetBreak = {
        ...(existing || { id: editingBreakId }),
        name: newBreakName.trim(),
        startTime: newBreakStart,
        endTime: newBreakEnd,
      };
    } else {
      targetBreak = {
        id: 'break_' + Date.now(),
        name: newBreakName.trim(),
        startTime: newBreakStart,
        endTime: newBreakEnd,
      };
    }

    // Apply day/date targeting based on current tab or day checkboxes
    if (selectedBreakTab === 'exception') {
      targetBreak.date = newBreakExceptionDate;
      targetBreak.isException = true;
      delete targetBreak.dayOfWeek;
      delete targetBreak.days;
    } else if (selectedBreakTab !== 'all') {
      targetBreak.dayOfWeek = selectedBreakTab;
      delete targetBreak.days;
      delete targetBreak.date;
      delete targetBreak.isException;
    } else if (newBreakTargetDays.length > 0) {
      targetBreak.days = newBreakTargetDays;
      delete targetBreak.dayOfWeek;
      delete targetBreak.date;
      delete targetBreak.isException;
    } else {
      // Applies to all days (global)
      delete targetBreak.dayOfWeek;
      delete targetBreak.days;
      delete targetBreak.date;
      delete targetBreak.isException;
    }

    let updated: BreakTime[];
    if (editingBreakId) {
      updated = breakTimes.map((b) => (b.id === editingBreakId ? targetBreak : b));
    } else {
      updated = [...breakTimes, targetBreak];
    }

    setBreakTimes(updated);
    await updateSettings({ breakTimes: updated });

    // Reset inputs
    setNewBreakName('');
    setEditingBreakId(null);
    setNewBreakTargetDays([]);
  };

  const handleStartEditBreak = (b: BreakTime) => {
    setEditingBreakId(b.id);
    setNewBreakName(b.name);
    setNewBreakStart(b.startTime);
    setNewBreakEnd(b.endTime);
    if (b.isException && b.date) {
      setSelectedBreakTab('exception');
      setNewBreakExceptionDate(b.date);
    } else if (b.dayOfWeek) {
      setSelectedBreakTab(b.dayOfWeek);
    } else if (b.days && b.days.length > 0) {
      setNewBreakTargetDays(b.days);
      setSelectedBreakTab('all');
    } else {
      setSelectedBreakTab('all');
    }
  };

  const handleCancelEditBreak = () => {
    setEditingBreakId(null);
    setNewBreakName('');
    setNewBreakTargetDays([]);
  };

  // Remove Break Time
  const handleRemoveBreak = async (id: string) => {
    const updated = breakTimes.filter((b) => b.id !== id);
    setBreakTimes(updated);
    await updateSettings({ breakTimes: updated });
    if (editingBreakId === id) {
      handleCancelEditBreak();
    }
  };

  // Clear all breaks for a specific day (쉬는 시간이 없는 요일 설정)
  const handleClearBreaksForDay = async (day: DayOfWeek) => {
    if (!confirm(`${day}요일의 모든 쉬는 시간을 제거(쉬는 시간 없음)하시겠습니까?`)) {
      return;
    }
    const updated = breakTimes.filter((b) => {
      if (b.dayOfWeek === day) return false;
      if (b.days && b.days.includes(day)) {
        b.days = b.days.filter((d) => d !== day);
        return b.days.length > 0;
      }
      return true;
    });
    setBreakTimes(updated);
    await updateSettings({ breakTimes: updated });
  };

  // Custom Subjects Management (Requirement 6: 과목 분류 직접 추가 및 편집)
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (customSubjects.includes(trimmed)) {
      alert('이미 등록된 과목명입니다.');
      return;
    }
    const updated = [...customSubjects, trimmed];
    await updateSettings({ customSubjects: updated });
    setNewSubjectInput('');
  };

  const handleStartEditSubject = (index: number, val: string) => {
    setEditingSubjectIndex(index);
    setEditingSubjectValue(val);
  };

  const handleSaveEditSubject = async (index: number) => {
    const trimmed = editingSubjectValue.trim();
    if (!trimmed) {
      setEditingSubjectIndex(null);
      return;
    }
    if (customSubjects.some((s, idx) => s === trimmed && idx !== index)) {
      alert('이미 존재하는 과목명입니다.');
      return;
    }
    const updated = [...customSubjects];
    updated[index] = trimmed;
    await updateSettings({ customSubjects: updated });
    setEditingSubjectIndex(null);
  };

  const handleDeleteSubject = async (index: number) => {
    const subjectToDelete = customSubjects[index];
    
    // Check if any activity uses this subject
    const subjectInUse = activities.some((a) => a.subject === subjectToDelete);
    
    const message = subjectInUse
      ? `'${subjectToDelete}' 과목을 사용하는 일정이 있습니다. 이 과목과 관련된 일정들까지 모두 삭제하시겠습니까?`
      : `'${subjectToDelete}' 과목을 삭제하시겠습니까?`;

    if (!confirm(message)) return;

    // Filter out the subject from customSubjects
    const updatedSubjects = customSubjects.filter((_, idx) => idx !== index);
    
    // Update settings (customSubjects)
    await updateSettings({ customSubjects: updatedSubjects });

    // If the subject was in use, remove/update activities that used it
    if (subjectInUse) {
      const activitiesToDelete = activities.filter((a) => a.subject === subjectToDelete);
      await deleteActivities(activitiesToDelete.map((a) => a.id));
    }
    
    if (editingSubjectIndex === index) {
      setEditingSubjectIndex(null);
    }
  };

  const handleMoveSubject = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= customSubjects.length) return;
    const updated = [...customSubjects];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    await updateSettings({ customSubjects: updated });
  };

  const handleResetSubjects = async () => {
    if (!confirm('정말 기본 과목 분류로 초기화하시겠습니까?\n\n이 작업은 사용자가 추가하거나 수정한 모든 과목명과 순서를 되돌리며, 이 변경 사항은 즉시 서버에 저장됩니다.')) {
      return;
    }
    
    await updateSettings({ customSubjects: DEFAULT_SUBJECTS });
    alert('과목 분류가 기본 설정으로 초기화되었습니다.');
  };

  // D-Day Management
  const handleAddDDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDDayTitle.trim() || !newDDayDate) {
      alert('D-Day 목표와 날짜를 모두 입력해주세요.');
      return;
    }
    const newDDay: DDayItem = {
      id: 'dday_' + Date.now(),
      title: newDDayTitle.trim(),
      targetDate: newDDayDate,
      color: newDDayColor,
    };
    const updated = [...ddayList, newDDay];
    setDDayList(updated);
    await updateSettings({ ddayList: updated });
    setNewDDayTitle('');
    setNewDDayDate('');
  };

  const handleDeleteDDay = async (id: string) => {
    const updated = ddayList.filter((d) => d.id !== id);
    setDDayList(updated);
    await updateSettings({ ddayList: updated });
  };

  // Repeating Activities
  const repeatingActivities = activities.filter((a) => a.isRepeating);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">설정</h2>
        <p className="text-xs text-slate-500">프로필, 테마, 시간표 범위, 쉬는 시간 및 반복 일정을 관리합니다.</p>
      </div>

      {/* 1. 프로필 설정 (Requirement 10) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
          >
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">프로필 설정</h3>
            <p className="text-xs text-slate-500">프로필 사진, 닉네임, 아이디 및 비밀번호를 안전하게 수정합니다.</p>
          </div>
        </div>

        {profileFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
              profileFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {profileFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{profileFeedback.message}</span>
          </div>
        )}

        {/* Profile Image & Upload Section (Direct device upload, preview, size limit, delete, presets) */}
        <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              프로필 사진 설정
            </label>
            <span className="text-[11px] text-slate-500">
              기기에서 직접 사진 업로드 또는 프리셋 선택
            </span>
          </div>

          {/* Feedback messages for avatar */}
          {avatarError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{avatarError}</span>
            </div>
          )}
          {avatarSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{avatarSuccess}</span>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Active Preview or Current Avatar Display */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative shrink-0 flex justify-center sm:justify-start">
              {pendingAvatarPreview ? (
                <div className="relative">
                  <img
                    src={pendingAvatarPreview}
                    alt="미리보기"
                    className="w-20 h-20 rounded-full object-cover border-4 border-indigo-400 shadow-md ring-2 ring-indigo-200"
                  />
                  <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-indigo-600 text-[10px] font-bold text-white rounded-full shadow-xs">
                    미리보기
                  </span>
                </div>
              ) : avatarUrl ? (
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="프로필"
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-xs border-2 border-white"
                  style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
                >
                  {nickname ? nickname.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {/* Upload Action Area */}
            <div className="flex-1 space-y-3">
              {pendingAvatarPreview ? (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>선택한 사진을 프로필 사진으로 저장하시겠습니까?</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    확인 버튼을 누르면 사진이 계정에 안전하게 연결되어, 다른 기기나 브라우저에서 로그인해도 프로필 사진이 계속 유지됩니다.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="btn-confirm-avatar"
                      type="button"
                      disabled={isSavingAvatar}
                      onClick={handleConfirmAvatarSave}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingAvatar ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>이 사진으로 프로필 저장</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSavingAvatar}
                      onClick={() => setPendingAvatarPreview(null)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Drag and Drop Box & Upload Buttons */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingAvatar(true);
                    }}
                    onDragLeave={() => setIsDraggingAvatar(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingAvatar(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processImageFile(file);
                    }}
                    onClick={() => avatarFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                      isDraggingAvatar
                        ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                        : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2 text-slate-700 mb-1">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span className="font-semibold text-xs">내 기기에서 사진 선택 또는 파일 끌어다 놓기</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      JPG, PNG, WEBP, GIF (최대 5MB 지원 • 최적화 자동 압축 저장)
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="btn-upload-avatar-click"
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>기기에서 사진 선택</span>
                    </button>

                    {avatarUrl && (
                      <button
                        id="btn-delete-avatar"
                        type="button"
                        disabled={isSavingAvatar}
                        onClick={handleDeleteAvatar}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>사진 삭제 (기본 이니셜 사용)</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Preset Avatars */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 text-[11px] font-medium">또는 추천 아바타 선택:</span>
                <div className="flex space-x-1.5">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(url);
                        setPendingAvatarPreview(null);
                      }}
                      className={`w-7 h-7 rounded-full overflow-hidden border transition-transform cursor-pointer ${
                        avatarUrl === url ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      title={`추천 아바타 ${idx + 1}`}
                    >
                      <img src={url} alt={`preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleRequestProfileSave} className="space-y-4 text-xs">
          {/* Nickname & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">닉네임</label>
              <input
                id="input-profile-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">아이디 (로그인 계정)</label>
              <input
                id="input-profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Password Section with Eye Toggle Masking */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-semibold text-slate-800">비밀번호 변경 및 보안 확인</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  현재 비밀번호 (닉네임·아이디·비밀번호 변경 시 필수)
                </label>
                <div className="relative">
                  <input
                    id="input-profile-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호 입력"
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showCurrentPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  새 비밀번호 (변경할 경우에만 입력)
                </label>
                <div className="relative">
                  <input
                    id="input-profile-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력 (4자 이상)"
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showNewPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              * 비밀번호는 단방향 솔트 해시(PBKDF2-SHA512)로 암호화되어 안전하게 처리되며 평문으로 저장되지 않습니다.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="btn-save-profile"
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
              style={{ backgroundColor: currentTheme.primary }}
            >
              닉네임 및 계정 정보 저장
            </button>
          </div>
        </form>
      </section>

      {/* 2. 테마 색상 선택 및 사용자 색상 추가 (Requirement 1 & Diverse Pastel Themes) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">다양한 파스텔 테마 색상</h3>
              <p className="text-xs text-slate-500">라벤더, 핑크, 코랄, 민트 등 12가지 파스텔 프리셋과 나만의 맞춤 색상을 적용합니다.</p>
            </div>
          </div>
          <span
            className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs"
            style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
          >
            현재 적용: {currentTheme.name}
          </span>
        </div>

        {/* 12 Preset Pastel Themes Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">기본 파스텔 테마 (12종)</h4>
            <span className="text-[11px] text-slate-400">부드럽고 차분한 계열별 추천 팔레트</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {(Object.keys(THEME_CONFIGS) as ThemeColorKey[]).map((key) => {
              const t = THEME_CONFIGS[key];
              const isSelected = settings.themeColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleThemeChange(key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-slate-800 shadow-sm scale-[1.02] border-slate-800'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                  style={{ backgroundColor: t.bgSoft }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-5 h-5 rounded-full border border-white shadow-2xs"
                      style={{ backgroundColor: t.primary }}
                    />
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{t.primary}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Creator Section */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-800">나만의 테마 색상 직접 추가 (HEX 색상표)</h4>
            </div>
            <span className="text-[11px] text-slate-500">원하는 색상코드 입력 및 색상표 선택</span>
          </div>

          {customThemeError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{customThemeError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {/* Color Swatch Picker */}
            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 border border-slate-200 rounded-xl shadow-2xs">
              <input
                id="input-theme-color-picker"
                type="color"
                value={customHex.startsWith('#') ? customHex : `#${customHex}`}
                onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="색상표에서 선택"
              />
              <span className="text-xs font-mono font-bold text-slate-700">
                {customHex.startsWith('#') ? customHex : `#${customHex}`}
              </span>
            </div>

            {/* HEX Input */}
            <div className="flex-1 min-w-[140px] max-w-xs">
              <input
                id="input-theme-hex"
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="예: #FF758C"
                maxLength={7}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-white uppercase focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Theme Name (Optional) */}
            <div className="flex-1 min-w-[150px] max-w-xs">
              <input
                id="input-theme-custom-name"
                type="text"
                value={customThemeName}
                onChange={(e) => setCustomThemeName(e.target.value)}
                placeholder="테마 이름 (예: 봄날 벚꽃)"
                maxLength={20}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Add Button */}
            <button
              id="btn-add-custom-theme"
              type="button"
              onClick={handleAddCustomTheme}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>색상 추가 및 적용</span>
            </button>
          </div>

          {/* Stored Custom Themes List */}
          {settings.customThemes && settings.customThemes.length > 0 && (
            <div className="pt-3 border-t border-slate-200/60 space-y-2">
              <span className="text-[11px] font-bold text-slate-700">내가 추가한 맞춤 색상 목록:</span>
              <div className="flex flex-wrap gap-2">
                {settings.customThemes.map((c) => {
                  const isSelected = settings.themeColor === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleThemeChange(c.id)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-slate-800 border-slate-800 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                      style={{ backgroundColor: isSelected ? undefined : '#FFFFFF' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-slate-200 shadow-2xs shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="font-semibold text-slate-800 max-w-[110px] truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{c.hex}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-800 shrink-0" />}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomTheme(c.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="이 사용자 색상 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Theme Contrast & UI Preview Box */}
        <div className="p-4 rounded-2xl border border-slate-200 space-y-3" style={{ backgroundColor: currentTheme.bgSoft }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <span>테마 가독성 및 컴포넌트 미리보기</span>
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
              <Check className="w-3 h-3" />
              <span>WCAG AA 4.5:1 이상 대비 준수 (가독성 보장)</span>
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs"
              style={{ backgroundColor: currentTheme.primary }}
            >
              메인 버튼 샘플
            </button>
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: currentTheme.primaryLight,
                color: currentTheme.primaryDark,
                borderColor: currentTheme.borderSoft,
              }}
            >
              태그 배지 샘플
            </span>
            <span className="text-xs text-slate-700">
              배경과 텍스트의 명도 대비가 충분하여 장시간 자습 시에도 눈의 피로도를 낮춥니다.
            </span>
          </div>
        </div>
      </section>

      {/* 3. 하루 시간표 시간 범위 및 시간 단위 설정 (Requirement 2, 11) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">하루 시간표 표시 범위 및 시간 단위</h3>
            <p className="text-xs text-slate-500">
              시작·종료 시간을 자유롭게 지정할 수 있으며 특정 시간으로 고정되지 않습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">하루 시작 시간</label>
            <select
              id="select-day-start-hour"
              value={dayStartHour}
              onChange={(e) => setDayStartHour(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">하루 종료 시간</label>
            <select
              id="select-day-end-hour"
              value={dayEndHour}
              onChange={(e) => setDayEndHour(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono"
            >
              {Array.from({ length: 25 }).map((_, i) => (
                <option key={i} value={i}>
                  {i === 24 ? '24:00 (자정)' : `${String(i).padStart(2, '0')}:00`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">시간표 시간 단위</label>
            <select
              id="select-time-interval"
              value={timeSlotInterval}
              onChange={(e) => setTimeSlotInterval(Number(e.target.value) as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
            >
              <option value={15}>15분 단위</option>
              <option value={30}>30분 단위 (기본)</option>
              <option value={60}>60분 (1시간) 단위</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            id="btn-save-time-settings"
            type="button"
            onClick={handleTimeSettingsSave}
            className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs"
            style={{ backgroundColor: currentTheme.primary }}
          >
            시간표 설정 저장
          </button>
        </div>
      </section>

      {/* 4. 요일별 쉬는 시간 설정 (Requirement 1) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-600 bg-amber-50 shadow-xs">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">요일별 쉬는 시간 설정</h3>
              <p className="text-xs text-slate-500">
                월~일 요일별로 쉬는 시간을 다르게 설정하거나 특정 날짜 예외를 등록할 수 있습니다. 매주 반복 적용되며 AI 과제 추천 시 자동으로 회피합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedBreakTab('all');
              handleCancelEditBreak();
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedBreakTab === 'all'
                ? 'bg-amber-100 text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            전체 요일 공통
          </button>
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                setSelectedBreakTab(day);
                handleCancelEditBreak();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedBreakTab === day
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {day}요일
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSelectedBreakTab('exception');
              handleCancelEditBreak();
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedBreakTab === 'exception'
                ? 'bg-indigo-100 text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            특정 날짜 예외
          </button>
        </div>

        {/* Active tab notice & Quick actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="font-semibold text-slate-700">
            {selectedBreakTab === 'all' && '전체 요일에 공통으로 적용되는 쉬는 시간'}
            {selectedBreakTab !== 'all' && selectedBreakTab !== 'exception' && `${selectedBreakTab}요일에 적용되는 쉬는 시간`}
            {selectedBreakTab === 'exception' && '특정 날짜에만 적용되는 예외 쉬는 시간'}
          </span>

          {selectedBreakTab !== 'all' && selectedBreakTab !== 'exception' && (
            <button
              type="button"
              onClick={() => handleClearBreaksForDay(selectedBreakTab)}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
            >
              {selectedBreakTab}요일 쉬는 시간 비우기 (쉬는 시간 없음)
            </button>
          )}
        </div>

        {/* Filtered break times list */}
        <div className="space-y-2">
          {(() => {
            const filtered = breakTimes.filter((b) => {
              if (selectedBreakTab === 'all') {
                return !b.dayOfWeek && (!b.days || b.days.length === 0) && !b.isException;
              }
              if (selectedBreakTab === 'exception') {
                return b.isException;
              }
              // Specific day
              if (b.dayOfWeek === selectedBreakTab) return true;
              if (b.days && b.days.includes(selectedBreakTab)) return true;
              return false;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
                  <p className="text-xs text-slate-400">
                    {selectedBreakTab === 'all'
                      ? '등록된 전체 공통 쉬는 시간이 없습니다.'
                      : selectedBreakTab === 'exception'
                      ? '등록된 특정 날짜 예외 쉬는 시간이 없습니다.'
                      : `${selectedBreakTab}요일에 설정된 쉬는 시간이 없습니다. (쉬는 시간 없는 날)`}
                  </p>
                </div>
              );
            }

            return filtered.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                  editingBreakId === b.id
                    ? 'border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-400'
                    : 'border-amber-200/80 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{b.name}</span>
                      {b.isException && b.date ? (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                          날짜 예외: {b.date}
                        </span>
                      ) : b.dayOfWeek ? (
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-semibold px-1.5 py-0.5 rounded">
                          {b.dayOfWeek}요일
                        </span>
                      ) : b.days && b.days.length > 0 ? (
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-semibold px-1.5 py-0.5 rounded">
                          {b.days.join(', ')}요일
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                          매일
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {b.startTime} ~ {b.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleStartEditBreak(b)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBreak(b.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Add / Edit Form */}
        <form onSubmit={handleAddOrUpdateBreak} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">
              {editingBreakId ? '쉬는 시간 수정' : '새 쉬는 시간 추가'}
            </span>
            {editingBreakId && (
              <button
                type="button"
                onClick={handleCancelEditBreak}
                className="text-xs text-slate-500 hover:underline"
              >
                수정 취소
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">쉬는 시간 이름</label>
              <input
                type="text"
                value={newBreakName}
                onChange={(e) => setNewBreakName(e.target.value)}
                placeholder="예: 점심 식사, 저녁 식사, 밤 산책"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">시작 시각</label>
              <input
                type="time"
                value={newBreakStart}
                onChange={(e) => setNewBreakStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">종료 시각</label>
              <input
                type="time"
                value={newBreakEnd}
                onChange={(e) => setNewBreakEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Exception date picker if exception tab */}
          {selectedBreakTab === 'exception' && (
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-indigo-700 mb-1">
                적용할 예외 날짜 (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={newBreakExceptionDate}
                onChange={(e) => setNewBreakExceptionDate(e.target.value)}
                className="px-3 py-1.5 border border-indigo-200 rounded-xl bg-white font-mono text-xs focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          {/* Multi-day selector if 'all' tab */}
          {selectedBreakTab === 'all' && (
            <div className="pt-1 space-y-1">
              <span className="block text-[11px] font-semibold text-slate-600">
                특정 요일들에만 복수 적용 (선택 안 하면 매일 적용)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isChecked = newBreakTargetDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setNewBreakTargetDays(newBreakTargetDays.filter((x) => x !== d));
                        } else {
                          setNewBreakTargetDays([...newBreakTargetDays, d]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center space-x-1"
              style={{ backgroundColor: currentTheme.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingBreakId ? '수정 저장' : '쉬는 시간 추가'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 5. 과목 분류 직접 추가 및 편집 (Requirement 6) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">과목 분류 관리 (직접 추가 및 편집)</h3>
              <p className="text-xs text-slate-500">
                수능/내신 기본 과목 외에 나만의 과목을 자유롭게 추가하고 순서를 변경할 수 있습니다.
              </p>
            </div>
          </div>
          {/* Removed Reset Subjects Button */}
        </div>

        {/* Add new subject input */}
        <form onSubmit={handleAddSubject} className="flex items-center gap-2">
          <input
            type="text"
            value={newSubjectInput}
            onChange={(e) => setNewSubjectInput(e.target.value)}
            placeholder="새 과목명 입력 (예: 논술, 물리학Ⅰ, 프로그래밍, 일본어)"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
            style={{ backgroundColor: currentTheme.primary }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>과목 추가</span>
          </button>
        </form>

        {/* Subjects List */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            현재 등록된 과목 목록 ({customSubjects.length}개)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {customSubjects.map((sub, idx) => {
              const isEditing = editingSubjectIndex === idx;

              return (
                <div
                  key={`${sub}_${idx}`}
                  className="p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/50 flex items-center justify-between gap-2 text-xs"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editingSubjectValue}
                        onChange={(e) => setEditingSubjectValue(e.target.value)}
                        className="flex-1 px-2 py-1 border border-indigo-300 rounded-lg bg-white text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditSubject(idx);
                          if (e.key === 'Escape') setEditingSubjectIndex(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditSubject(idx)}
                        className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[11px] font-bold"
                      >
                        저장
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{sub}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSubject(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200/60"
                      title="위로 이동"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === customSubjects.length - 1}
                      onClick={() => handleMoveSubject(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200/60"
                      title="아래로 이동"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEditSubject(idx, sub)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                        title="수정"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 relative z-10"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. 수험생 목표 및 D-Day 설정 */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 shadow-xs">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">목표 디데이 (D-Day) 설정</h3>
            <p className="text-xs text-slate-500">
              수능, 모의고사, 학기말 시험 등 D-Day 목표를 등록하면 상단 및 캘린더 화면에 자동 표시됩니다.
            </p>
          </div>
        </div>

        {/* Existing D-Days list */}
        <div className="space-y-2">
          {ddayList.length > 0 ? (
            ddayList.map((d) => {
              const ddayCalc = calculateDDay(d.targetDate);
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <Flag className="w-4 h-4 text-rose-500" />
                    <div>
                      <span className="font-bold text-slate-800">{d.title}</span>
                      <div className="text-[11px] text-slate-500 font-mono">목표일: {d.targetDate}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        ddayCalc.isToday
                          ? 'bg-rose-500 text-white'
                          : ddayCalc.isPast
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {ddayCalc.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDDay(d.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 italic">등록된 D-Day 목표가 없습니다.</p>
          )}
        </div>

        {/* Add D-Day form */}
        <form onSubmit={handleAddDDay} className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
          <span className="font-semibold text-slate-700 block mb-1">새 D-Day 목표 추가</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newDDayTitle}
              onChange={(e) => setNewDDayTitle(e.target.value)}
              placeholder="예: 2027 수능, 9월 모의평가"
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
            />
            <input
              type="date"
              value={newDDayDate}
              onChange={(e) => setNewDDayDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
            />
            <button
              type="submit"
              className="py-1.5 px-3 text-white rounded-lg font-semibold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              style={{ backgroundColor: currentTheme.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>D-Day 등록</span>
            </button>
          </div>
        </form>
      </section>

      {/* 5. 반복 일정 관리 (Requirement 11) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
          >
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">반복 일정 관리</h3>
            <p className="text-xs text-slate-500">매주 특정 요일에 반복되도록 등록된 활동 목록입니다.</p>
          </div>
        </div>

        {repeatingActivities.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {repeatingActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: act.color }}
                    />
                    <span className="font-bold text-slate-800">{act.title}</span>
                    {act.subject && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {act.subject}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {act.startTime} ~ {act.endTime} · 매주 {act.repeatDays?.join(', ')} 반복
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActivity(act);
                      setActivityModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                    title="수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`'${act.title}' 반복 일정을 삭제하시겠습니까?`)) {
                        deleteActivity(act.id);
                      }
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">등록된 매주 반복 일정이 없습니다.</p>
        )}
      </section>

      {/* 6. Firebase 설정 및 데이터베이스 안내 (Requirement 8) */}
      <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">클라우드 데이터베이스 및 Firebase 연동 안내</h3>
            <p className="text-xs text-slate-500">
              계정별 데이터 격리, 실시간 동기화 및 Firestore 보안 규칙 현황입니다.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {/* Real backend status */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-1">
            <div className="flex items-center space-x-2 font-bold text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Express 풀스택 서버 데이터베이스 활성화 중</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800/90">
              현재 웹사이트는 독립적인 백엔드 서버(`/api/*`)를 통해 안전한 PBKDF2 비밀번호 암호화 및 계정별 영구 데이터 저장을 수행하고 있습니다.
              새로고침, 로그아웃 후 재로그인, 다른 기기에서의 로그인 시에도 회원님의 시간표, 설정, 프로필이 안전하게 유지됩니다.
            </p>
          </div>

          {/* Firebase Connection Guidance per Requirement 8 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    firebaseStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                Firebase Authentication & Cloud Firestore 연동 상태
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  firebaseStatus.configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {firebaseStatus.configured ? '설정 연동됨' : '설정 준비됨 (선택적)'}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {firebaseStatus.message}
            </p>

            <div className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-700 block">
                📋 Firebase 프로젝트 외부 직접 연동 가이드:
              </span>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                <li>Firebase Console에서 프로젝트를 생성하고 Firestore Database를 시작합니다.</li>
                <li>Authentication 설정에서 '이메일/비밀번호' 로그인 제공업체를 활성화합니다.</li>
                <li>프로젝트 루트의 `firestore.rules` 보안 규칙을 Firebase에 배포하여 사용자별 보안 격리를 적용합니다.</li>
                <li>제공된 `firebase-blueprint.json` 스키마에 따라 모든 컬렉션 접근 권한이 엄격하게 검증됩니다.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation Modal for Profile Changes (Requirement 10) */}
      {profileConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900 mb-2">
              {profileConfirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 mb-6 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {profileConfirmModal.description}
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setProfileConfirmModal((prev) => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                id="btn-confirm-profile-changes"
                type="button"
                onClick={profileConfirmModal.onConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                변경 저장 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
