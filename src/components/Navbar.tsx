import React, { useState } from 'react';
import { Calendar, CalendarDays, Clock, Settings, LogOut, User as UserIcon, Menu, X, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchedule } from '../context/ScheduleContext';
import { getThemeConfig } from '../utils/theme';

export const Navbar: React.FC = () => {
  const { user, logout, isLogoutModalOpen, setIsLogoutModalOpen } = useAuth();
  const { activeView, setActiveView, settings } = useSchedule();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <button
              type="button"
              onClick={() => setActiveView('daily')}
              className="flex items-center space-x-2.5 transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border"
                style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark, borderColor: '#aaa9a9' }}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                PlanIt
              </span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                id="nav-btn-daily"
                type="button"
                onClick={() => setActiveView('daily')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === 'daily'
                    ? 'shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
                style={
                  activeView === 'daily'
                    ? { backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }
                    : {}
                }
              >
                <Clock className="w-4 h-4" />
                <span>하루 시간표</span>
              </button>

              <button
                id="nav-btn-weekly"
                type="button"
                onClick={() => setActiveView('weekly')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === 'weekly'
                    ? 'shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
                style={
                  activeView === 'weekly'
                    ? { backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }
                    : {}
                }
              >
                <Calendar className="w-4 h-4" />
                <span>주간 시간표</span>
              </button>

              <button
                id="nav-btn-calendar"
                type="button"
                onClick={() => setActiveView('calendar')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === 'calendar'
                    ? 'shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
                style={
                  activeView === 'calendar'
                    ? { backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }
                    : {}
                }
              >
                <CalendarDays className="w-4 h-4" />
                <span>캘린더</span>
              </button>

              <button
                id="nav-btn-settings"
                type="button"
                onClick={() => setActiveView('settings')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === 'settings'
                    ? 'shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
                style={
                  activeView === 'settings'
                    ? { backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }
                    : {}
                }
              >
                <Settings className="w-4 h-4" />
                <span>설정</span>
              </button>
            </nav>

            {/* User Profile & Logout (Top Right) */}
            <div className="flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.nickname}
                      className="w-6 h-6 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                      style={{ backgroundColor: currentTheme.primaryLight, color: currentTheme.primaryDark }}
                    >
                      {user.nickname ? user.nickname.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-700 max-w-[100px] truncate">
                    {user.nickname || user.username}
                  </span>
                </div>
              )}

              {/* Logout Button on top-right */}
              <button
                id="btn-logout"
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="로그아웃"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="메뉴 열기"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveView('daily');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === 'daily'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>하루 시간표</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('weekly');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === 'weekly'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>주간 시간표</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('calendar');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === 'calendar'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>캘린더</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === 'settings'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>설정</span>
            </button>
          </div>
        )}
      </header>

      {/* Logout Confirmation Dialog (Requirement 9) */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-slate-900 mb-2">로그아웃</h3>
            <p className="text-sm text-center text-slate-500 mb-6 leading-relaxed">
              정말 로그아웃하시겠습니까?
              <br />
              <span className="text-xs text-slate-400">
                (저장된 시간표, 프로필, 설정 데이터는 삭제되지 않고 안전하게 보관됩니다.)
              </span>
            </p>
            <div className="flex space-x-2">
              <button
                id="btn-logout-cancel"
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                id="btn-logout-confirm"
                type="button"
                onClick={logout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold shadow-xs transition-colors"
              >
                로그아웃 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
