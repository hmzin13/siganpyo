import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScheduleProvider, useSchedule } from './context/ScheduleContext';
import { AuthPage } from './components/AuthPage';
import { Navbar } from './components/Navbar';
import { DailyTimetable } from './components/DailyTimetable';
import { WeeklyTimetable } from './components/WeeklyTimetable';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { ActivityModal } from './components/ActivityModal';
import { StudySlotModal } from './components/StudySlotModal';
import { ConflictWarningToast } from './components/ConflictWarningToast';
import { getThemeConfig } from './utils/theme';
import { BookOpen } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const { activeView, settings } = useSchedule();

  const currentTheme = getThemeConfig(settings.themeColor, settings.customThemes);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center animate-bounce shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-600">공부 시간표를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login/Register Screen (Requirement 1 & 8)
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: currentTheme.bgSoft }}
    >
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeView === 'daily' && <DailyTimetable />}
        {activeView === 'weekly' && <WeeklyTimetable />}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'settings' && <SettingsView />}
      </main>

      {/* Global Modals & Toast */}
      <ActivityModal />
      <StudySlotModal />
      <ConflictWarningToast />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ScheduleProvider>
        <MainLayout />
      </ScheduleProvider>
    </AuthProvider>
  );
}
