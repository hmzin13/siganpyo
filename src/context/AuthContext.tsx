import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  authError: string | null;
  clearError: () => void;
  setAuthError: (error: string | null) => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, nickname?: string, avatarUrl?: string) => Promise<boolean>;
  updateProfile: (data: {
    newUsername?: string;
    newNickname?: string;
    newAvatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLogoutModalOpen: boolean;
  setIsLogoutModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'study_timetable_active_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);

  const clearError = () => {
    setAuthError(null);
  };

  useEffect(() => {
    // Restore session on mount
    try {
      const savedUserStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.id) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved user', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setAuthError(null);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || '로그인에 실패했습니다.');
        return false;
      }
      setUser(data.user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
      setAuthError(null);
      return true;
    } catch (err) {
      console.error('Login error', err);
      setAuthError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }
  };

  const register = async (
    username: string,
    password: string,
    nickname?: string,
    avatarUrl?: string
  ): Promise<boolean> => {
    try {
      setAuthError(null);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || '회원가입에 실패했습니다.');
        return false;
      }
      setUser(data.user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
      setAuthError(null);
      return true;
    } catch (err) {
      console.error('Register error', err);
      setAuthError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return false;
    }
  };

  const updateProfile = async (data: {
    newUsername?: string;
    newNickname?: string;
    newAvatarUrl?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    if (!user) return { success: false, error: '로그인이 필요합니다.' };
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...data,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || '프로필 수정에 실패했습니다.' };
      }
      setUser(resData.user);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(resData.user));
      return { success: true };
    } catch (err) {
      console.error('Update profile error', err);
      return { success: false, error: '프로필 업데이트 실패: 서버 오류' };
    }
  };

  const logout = () => {
    // Only terminates the current login session; does NOT delete any stored database data
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setIsLogoutModalOpen(false);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loading: isLoading,
        authError,
        clearError,
        setAuthError,
        login,
        register,
        updateProfile,
        logout,
        isLogoutModalOpen,
        setIsLogoutModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
