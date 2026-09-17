import React, { useState } from 'react';
import { BookOpen, LogIn, UserPlus, Eye, EyeOff, ShieldCheck, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { login, register, authError, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    clearError();

    if (!username.trim() || !password.trim()) {
      setClientError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (mode === 'register') {
      if (!nickname.trim()) {
        setClientError('닉네임을 입력해주세요.');
        return;
      }
      if (password.length < 4) {
        setClientError('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
      }
      if (password !== passwordConfirm) {
        setClientError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }

      setLoading(true);
      const success = await register(username.trim(), password, nickname.trim());
      setLoading(false);
      if (!success) {
        // authError is updated in context
      }
    } else {
      setLoading(true);
      const success = await login(username.trim(), password);
      setLoading(false);
      if (!success) {
        // authError is updated in context
      }
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    clearError();
    setClientError(null);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#f8f9fc] via-[#f3f4fa] to-[#edeef6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Title */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <BookOpen className="w-8 h-8" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          공부 시간표
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          나만의 맞춤형 자습 시간표 및 하루·주간 스케줄러
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-indigo-100/40 rounded-3xl border border-slate-200/80 space-y-6">
          {/* Mode Tabs */}
          <div className="flex bg-slate-100/80 p-1 rounded-2xl">
            <button
              id="tab-auth-login"
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              로그인
            </button>
            <button
              id="tab-auth-register"
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* Notice for new account (Requirement 8) */}
          {mode === 'register' && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100/80 rounded-2xl text-[11px] text-indigo-900 leading-relaxed space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-indigo-700">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>빈 시간표로 깨끗하게 시작됩니다</span>
              </div>
              <p className="text-slate-600 pl-5">
                새 계정 가입 시 예시 데이터 없이 완전히 비어 있는 시간표가 생성되며, 회원님의 데이터는 다른 계정과 엄격하게 분리 보관됩니다.
              </p>
            </div>
          )}

          {/* Errors */}
          {(clientError || authError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 leading-snug">
              {clientError || authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Username */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                아이디 <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="영문, 숫자 조합 권장"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono text-sm"
              />
            </div>

            {/* Nickname (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  닉네임 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-register-nickname"
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 열공러, 수험생"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                비밀번호 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Confirm (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  비밀번호 확인 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-register-password-confirm"
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <span>처리 중...</span>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>로그인</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>회원가입 완료 및 시작</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bottom Security Info */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>PBKDF2 보안 암호화 및 사용자별 개별 데이터 분리 저장</span>
          </div>
        </div>
      </div>
    </div>
  );
};
