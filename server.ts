import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistence directory
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

interface DBStructure {
  users: StoredUser[];
  settings: Record<string, any>; // userId -> UserSettings
  activities: Record<string, any[]>; // userId -> Activity[]
  studySlots: Record<string, any[]>; // userId -> StudySlot[]
  dailyNotes: Record<string, Record<string, any>>; // userId -> date -> DailyNote
}

function loadDB(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading db file:', err);
  }
  return {
    users: [],
    settings: {},
    activities: {},
    studySlots: {},
    dailyNotes: {},
  };
}

function saveDB(db: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

// Password hashing
function hashPassword(password: string, salt?: string) {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, hash: string, salt: string) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return verifyHash === hash;
}

// API Routes

// 1. Auth Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, nickname, avatarUrl } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const cleanUsername = String(username).trim();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다.' });
  }

  if (String(password).length < 4) {
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
  }

  const db = loadDB();
  const existing = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: '이미 존재하는 아이디입니다.' });
  }

  const { hash, salt } = hashPassword(password);
  const userId = 'user_' + crypto.randomBytes(8).toString('hex');

  const newUser: StoredUser = {
    id: userId,
    username: cleanUsername,
    passwordHash: hash,
    salt,
    nickname: nickname ? String(nickname).trim() : cleanUsername,
    avatarUrl: avatarUrl || '',
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  // Default settings for new user (Clean initial state, NO draft/sample schedule activities!)
  db.settings[userId] = {
    userId,
    themeColor: 'lavender',
    dayStartHour: 7,
    dayEndHour: 24,
    timeSlotInterval: 30,
    breakTimes: [
      { id: 'b1', name: '점심 휴식', startTime: '12:00', endTime: '13:00' },
      { id: 'b2', name: '저녁 휴식', startTime: '18:00', endTime: '19:00' }
    ]
  };
  // Explicit requirement: 새 계정의 시간표는 비어 있어야 해. (Activities & studySlots start empty)
  db.activities[userId] = [];
  db.studySlots[userId] = [];
  db.dailyNotes[userId] = {};

  saveDB(db);

  return res.json({
    user: {
      id: newUser.id,
      username: newUser.username,
      nickname: newUser.nickname,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt,
    }
  });
});

// 2. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const db = loadDB();
  const cleanUsername = String(username).trim();
  const user = db.users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());

  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });
  }

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    }
  });
});

// 3. Update Profile
app.post('/api/auth/profile', (req, res) => {
  const { userId, newUsername, newNickname, newAvatarUrl, currentPassword, newPassword } = req.body;
  if (!userId) {
    return res.status(400).json({ error: '사용자 ID가 누락되었습니다.' });
  }

  const db = loadDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  const user = db.users[userIndex];

  // If changing username or password, verify current password
  if (newPassword || (newUsername && newUsername.toLowerCase() !== user.username.toLowerCase())) {
    if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash, user.salt)) {
      return res.status(401).json({ error: '정보 변경을 위해 현재 비밀번호를 정확히 입력해주세요.' });
    }
  }

  // Update username if requested and not duplicate
  if (newUsername && newUsername.trim()) {
    const cleanNew = newUsername.trim();
    if (cleanNew.toLowerCase() !== user.username.toLowerCase()) {
      const duplicate = db.users.find(u => u.username.toLowerCase() === cleanNew.toLowerCase() && u.id !== userId);
      if (duplicate) {
        return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
      }
      user.username = cleanNew;
    }
  }

  if (newNickname !== undefined) {
    user.nickname = String(newNickname).trim() || user.username;
  }

  if (newAvatarUrl !== undefined) {
    user.avatarUrl = String(newAvatarUrl);
  }

  if (newPassword) {
    if (String(newPassword).length < 4) {
      return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });
    }
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
  }

  db.users[userIndex] = user;
  saveDB(db);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    }
  });
});

// 4. Get User Data
app.get('/api/user/data', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const db = loadDB();
  const settings = db.settings[userId] || {
    userId,
    themeColor: 'lavender',
    dayStartHour: 7,
    dayEndHour: 24,
    timeSlotInterval: 30,
    breakTimes: [
      { id: 'b1', name: '점심 휴식', startTime: '12:00', endTime: '13:00' },
      { id: 'b2', name: '저녁 휴식', startTime: '18:00', endTime: '19:00' }
    ]
  };

  const activities = db.activities[userId] || [];
  const studySlots = db.studySlots[userId] || [];
  const dailyNotes = db.dailyNotes[userId] || {};

  return res.json({
    settings,
    activities,
    studySlots,
    dailyNotes,
  });
});

// 5. Update User Settings
app.post('/api/user/settings', (req, res) => {
  const { userId, settings } = req.body;
  if (!userId || !settings) {
    return res.status(400).json({ error: 'userId and settings are required' });
  }

  const db = loadDB();
  db.settings[userId] = {
    ...db.settings[userId],
    ...settings,
    userId,
  };

  saveDB(db);
  return res.json({ settings: db.settings[userId] });
});

// 6. Update Activities (full list or single operations)
app.post('/api/user/activities', (req, res) => {
  const { userId, activities } = req.body;
  if (!userId || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'userId and activities array required' });
  }

  const db = loadDB();
  db.activities[userId] = activities;
  saveDB(db);
  return res.json({ activities: db.activities[userId] });
});

// 7. Update Study Slots
app.post('/api/user/study-slots', (req, res) => {
  const { userId, studySlots } = req.body;
  if (!userId || !Array.isArray(studySlots)) {
    return res.status(400).json({ error: 'userId and studySlots array required' });
  }

  const db = loadDB();
  db.studySlots[userId] = studySlots;
  saveDB(db);
  return res.json({ studySlots: db.studySlots[userId] });
});

// 8. Update Daily Note (오늘의 한마디)
app.post('/api/user/daily-note', (req, res) => {
  const { userId, date, content } = req.body;
  if (!userId || !date) {
    return res.status(400).json({ error: 'userId and date are required' });
  }

  const db = loadDB();
  if (!db.dailyNotes[userId]) {
    db.dailyNotes[userId] = {};
  }

  db.dailyNotes[userId][date] = {
    userId,
    date,
    content: String(content || ''),
    updatedAt: new Date().toISOString(),
  };

  saveDB(db);
  return res.json({ note: db.dailyNotes[userId][date] });
});

// 9. Firebase Status Guide
app.get('/api/firebase/status', (req, res) => {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const isConfigured = fs.existsSync(configPath);
  return res.json({
    configured: isConfigured,
    message: isConfigured
      ? 'Firebase Authentication 및 Cloud Firestore 설정 파일이 감지되었습니다.'
      : 'Firebase 설정이 아직 연동되지 않은 상태입니다. 현재 웹 애플리케이션의 Express 서버 데이터베이스가 안정적으로 실시간 데이터 영속성을 제공하고 있습니다. Firebase를 통한 외부 동기화를 원하시면 Firebase 프로젝트를 생성하고 연동을 진행해주세요.',
  });
});

// Helper for time calculation
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 10. AI Recommendation Endpoint
app.post('/api/ai/recommend-slot', async (req, res) => {
  try {
    const {
      title,
      subject,
      durationMinutes = 60,
      priority = 'medium',
      preferredTimeOfDay = 'afternoon',
      targetDate,
      userId,
      alternativeOffset = 0
    } = req.body;

    if (!userId || !targetDate) {
      return res.status(400).json({ error: 'userId and targetDate are required' });
    }

    const db = loadDB();
    const userSettings = db.settings[userId] || {
      dayStartHour: 7,
      dayEndHour: 24,
      breakTimes: [
        { id: 'b1', name: '점심 휴식', startTime: '12:00', endTime: '13:00' },
        { id: 'b2', name: '저녁 휴식', startTime: '18:00', endTime: '19:00' }
      ]
    };

    const targetDateObj = new Date(targetDate);
    const dayOfWeek = DAY_NAMES[targetDateObj.getDay()];

    const userActivities = (db.activities[userId] || []).filter((a: any) => {
      if (a.date === targetDate) return true;
      if (a.isRepeating && a.repeatDays && a.repeatDays.includes(dayOfWeek)) return true;
      return false;
    });

    const userStudySlots = (db.studySlots[userId] || []).filter((s: any) => s.dayOfWeek === dayOfWeek);
    
    // Resolve break times for this day of week or specific date exception
    const allBreaks = userSettings.breakTimes || [];
    const dateExceptions = allBreaks.filter((b: any) => b.date === targetDate);
    const breakTimes = dateExceptions.length > 0
      ? dateExceptions
      : allBreaks.filter((b: any) => {
          if (b.date) return false;
          if (b.dayOfWeek) return b.dayOfWeek === dayOfWeek;
          if (b.days && b.days.length > 0) return b.days.includes(dayOfWeek);
          return true; // if no day specified, applies to all days
        });

    let rawDuration = Number(durationMinutes);
    let isEstimatedDuration = false;
    if (!rawDuration || rawDuration <= 0) {
      // Provide an intelligent default estimate based on subject
      if (subject?.includes('수학') || title?.includes('모의고사') || title?.includes('기출')) {
        rawDuration = 60;
      } else if (subject?.includes('국어') || subject?.includes('독서')) {
        rawDuration = 50;
      } else if (title?.includes('단어') || title?.includes('암기')) {
        rawDuration = 30;
      } else {
        rawDuration = 45;
      }
      isEstimatedDuration = true;
    }

    const duration = Math.max(15, rawDuration);
    const dayStartMin = (userSettings.dayStartHour ?? 7) * 60;
    const dayEndMin = (userSettings.dayEndHour ?? 24) * 60;

    // Preferred time window ranges
    let prefStart = dayStartMin;
    let prefEnd = dayEndMin;
    if (preferredTimeOfDay === 'morning') {
      prefStart = Math.max(dayStartMin, 7 * 60);
      prefEnd = Math.min(dayEndMin, 12 * 60);
    } else if (preferredTimeOfDay === 'afternoon') {
      prefStart = Math.max(dayStartMin, 13 * 60);
      prefEnd = Math.min(dayEndMin, 18 * 60);
    } else if (preferredTimeOfDay === 'evening') {
      prefStart = Math.max(dayStartMin, 19 * 60);
      prefEnd = Math.min(dayEndMin, 22 * 60);
    } else if (preferredTimeOfDay === 'night') {
      prefStart = Math.max(dayStartMin, 21 * 60);
      prefEnd = dayEndMin;
    }

    // Function to check collisions with break times
    const checkBreakConflict = (s: number, e: number) => {
      for (const b of breakTimes) {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        if (Math.max(s, bStart) < Math.min(e, bEnd)) {
          return { encroaches: true, name: b.name };
        }
      }
      return { encroaches: false, name: '' };
    };

    // Function to check collisions with existing activities
    const checkActivityConflict = (s: number, e: number) => {
      const conflicts: any[] = [];
      for (const act of userActivities) {
        const aStart = timeToMinutes(act.startTime);
        const aEnd = timeToMinutes(act.endTime);
        if (Math.max(s, aStart) < Math.min(e, aEnd)) {
          conflicts.push({
            id: act.id,
            title: act.title,
            startTime: act.startTime,
            endTime: act.endTime,
          });
        }
      }
      return conflicts;
    };

    // Function to check if inside a study slot
    const checkInsideStudySlot = (s: number, e: number) => {
      if (userStudySlots.length === 0) return false;
      return userStudySlots.some((slot: any) => {
        const slotStart = timeToMinutes(slot.startTime);
        const slotEnd = timeToMinutes(slot.endTime);
        return s >= slotStart && e <= slotEnd;
      });
    };

    // Candidate generator
    interface Candidate {
      startTime: string;
      endTime: string;
      score: number;
      isInsideStudySlot: boolean;
      encroachesBreak: boolean;
      breakName: string;
      conflicts: any[];
      reason: string;
    }

    const candidates: Candidate[] = [];
    const step = 15; // 15-min increments

    for (let startM = dayStartMin; startM + duration <= dayEndMin; startM += step) {
      const endM = startM + duration;
      const breakCheck = checkBreakConflict(startM, endM);
      const conflicts = checkActivityConflict(startM, endM);
      const isInsideStudySlot = checkInsideStudySlot(startM, endM);

      // Relaxed condition: Never schedule on break times!
      if (breakCheck.encroaches) {
        continue;
      }

      let score = 100;

      // Penalize conflicts heavily
      if (conflicts.length > 0) {
        score -= 500 * conflicts.length;
      }

      // Bonus for being inside user's declared study slot
      if (isInsideStudySlot) {
        score += 80;
      } else if (userStudySlots.length > 0) {
        // If user has study slots, prefer inside study slots
        score -= 20;
      }

      // Preference alignment bonus
      if (startM >= prefStart && endM <= prefEnd) {
        score += 40;
      } else if (startM < prefEnd && endM > prefStart) {
        score += 20;
      }

      // High priority schedule bias: earlier in the preference slot
      if (priority === 'high') {
        score += Math.max(0, 20 - Math.floor((startM - prefStart) / 30));
      }

      // Generate contextual Korean advice based on subject, task type, and timing
      const reasonParts: string[] = [];
      const titleLower = (title || '').toLowerCase();
      const subjectStr = subject || '';

      if (subjectStr.includes('국어') || titleLower.includes('독서') || titleLower.includes('비문학')) {
        reasonParts.push('국어 독해는 높은 집중력이 요구되어 최적 몰입 구간에 배치하는 것을 추천합니다.');
      } else if (subjectStr.includes('수학') || titleLower.includes('수학') || titleLower.includes('문제풀이')) {
        reasonParts.push('수학 고난도 풀이는 끊김 없는 충분한 자습 시간대에서 가장 효과적입니다.');
      } else if (subjectStr.includes('영어') || titleLower.includes('단어') || titleLower.includes('암기')) {
        reasonParts.push('단어 암기 및 복습은 부담 없이 밀도 있게 집중할 수 있는 시간대로 추천합니다.');
      } else if (subjectStr.includes('탐구') || subjectStr.includes('한국사')) {
        reasonParts.push('개념 정립과 기출 분석을 체계적으로 연결하기 좋은 자습 슬롯입니다.');
      } else if (isInsideStudySlot) {
        reasonParts.push('등록하신 자습 가능 시간대 내에 최적으로 안착됩니다.');
      }

      if (startM >= prefStart && endM <= prefEnd && preferredTimeOfDay !== 'any') {
        const timeName = preferredTimeOfDay === 'morning' ? '오전' : preferredTimeOfDay === 'afternoon' ? '오후' : preferredTimeOfDay === 'evening' ? '저녁' : '야간';
        reasonParts.push(`선호하시는 ${timeName} 시간대와 잘 일치합니다.`);
      }

      if (isEstimatedDuration) {
        reasonParts.push(`(예상 소요시간이 미입력되어 표준 ${duration}분으로 자동 추천되었습니다)`);
      }

      candidates.push({
        startTime: minutesToTime(startM),
        endTime: minutesToTime(endM),
        score,
        isInsideStudySlot,
        encroachesBreak: false,
        breakName: '',
        conflicts,
        reason: reasonParts.join(' ') || `${subject ? `[${subject}] ` : ''}자습 시간대와 휴식 시간을 균형 있게 고려한 추천 시간입니다.`,
      });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return res.json({
        success: false,
        noSlotReason: `설정된 하루 시간 범위 및 쉬는 시간을 제외하고 ${duration}분의 연속 자습 공간을 찾을 수 없습니다. 활동 시간을 나누거나 자습 시간대를 확인해주세요.`,
      });
    }

    // Handle alternative recommendations via offset
    const pickedIndex = Math.min(candidates.length - 1, Number(alternativeOffset) % candidates.length);
    const chosen = candidates[pickedIndex];

    // Check if Gemini can provide an extra contextual reasoning
    let aiEnhancedReason = chosen.reason;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `수험생 플래너의 학습 일정 추천 이유를 한국어로 1~2문장으로 작성해줘.
과제명: ${title || '학습'} (${subject || '과목 미지정'})
소요시간: ${duration}분
추천시간: ${chosen.startTime} ~ ${chosen.endTime}
자습시간 포함여부: ${chosen.isInsideStudySlot ? '자습시간 내' : '일반 여유시간'}
우선순위: ${priority}
선호시간: ${preferredTimeOfDay}
작성 지침: 친절하고 전문적인 입시/수험 멘토 톤으로, 왜 이 시간대에 공부하면 학습 효율이 좋은지 과목 특성을 살려 한두 줄로 답해줘.`,
        });
        if (response && response.text) {
          aiEnhancedReason = response.text.trim();
        }
      } catch (geminiErr) {
        console.log('Gemini API optional enhancement skipped:', (geminiErr as Error).message);
      }
    }

    return res.json({
      success: true,
      recommendedDate: targetDate,
      recommendedStartTime: chosen.startTime,
      recommendedEndTime: chosen.endTime,
      reason: aiEnhancedReason,
      isOutsideStudySlot: !chosen.isInsideStudySlot,
      encroachesBreakTime: false,
      breakTimeName: undefined,
      hasConflict: chosen.conflicts.length > 0,
      conflictingActivities: chosen.conflicts,
      requiresMovingExisting: chosen.conflicts.length > 0,
      isEstimatedDuration,
      proposedChanges: chosen.conflicts.length > 0 ? [
        {
          action: 'adjust_existing',
          description: `기존 일정 [${chosen.conflicts.map((c: any) => c.title).join(', ')}]과 시간이 겹치므로 확인이 필요합니다.`
        }
      ] : [
        {
          action: 'add_new',
          description: `${chosen.startTime} ~ ${chosen.endTime} 신규 배치`
        }
      ]
    });
  } catch (error) {
    console.error('AI Recommendation error:', error);
    return res.status(500).json({
      success: false,
      noSlotReason: '추천 알고리즘 처리 중 문제가 발생했습니다. 직접 시간을 설정해주세요.'
    });
  }
});

// Endpoint: Batch task recommendation (Requirement 2: 부분 추천 및 과제별 맞춤 멘트)
app.post('/api/ai/recommend-tasks', async (req, res) => {
  try {
    const { userId, targetDate, tasks, preferredTimeOfDay = 'any' } = req.body;
    if (!userId || !targetDate || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'userId, targetDate, and tasks array are required' });
    }

    const db = loadDB();
    const userSettings = db.settings[userId] || {
      dayStartHour: 7,
      dayEndHour: 24,
      breakTimes: []
    };

    const targetDateObj = new Date(targetDate);
    const dayOfWeek = DAY_NAMES[targetDateObj.getDay()];

    const userActivities = (db.activities[userId] || []).filter((a: any) => {
      if (a.date === targetDate) return true;
      if (a.isRepeating && a.repeatDays && a.repeatDays.includes(dayOfWeek)) return true;
      return false;
    });

    const userStudySlots = (db.studySlots[userId] || []).filter((s: any) => s.dayOfWeek === dayOfWeek);

    // Resolve break times for this day or specific date exception
    const allBreaks = userSettings.breakTimes || [];
    const dateExceptions = allBreaks.filter((b: any) => b.date === targetDate);
    const breakTimes = dateExceptions.length > 0
      ? dateExceptions
      : allBreaks.filter((b: any) => {
          if (b.date) return false;
          if (b.dayOfWeek) return b.dayOfWeek === dayOfWeek;
          if (b.days && b.days.length > 0) return b.days.includes(dayOfWeek);
          return true;
        });

    const dayStartMin = (userSettings.dayStartHour ?? 7) * 60;
    const dayEndMin = (userSettings.dayEndHour ?? 24) * 60;

    // Track occupied intervals on this day
    interface Interval {
      start: number;
      end: number;
    }
    const occupiedIntervals: Interval[] = [];

    // 1. Add break times to occupied intervals
    for (const b of breakTimes) {
      occupiedIntervals.push({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      });
    }

    // 2. Add existing activities to occupied intervals
    for (const act of userActivities) {
      occupiedIntervals.push({
        start: timeToMinutes(act.startTime),
        end: timeToMinutes(act.endTime),
      });
    }

    // Sort occupied intervals
    occupiedIntervals.sort((a, b) => a.start - b.start);

    // Compute free intervals within study slots (or within day bounds if no study slots are declared)
    let baseWindows: Interval[] = [];
    if (userStudySlots.length > 0) {
      baseWindows = userStudySlots.map((s: any) => ({
        start: timeToMinutes(s.startTime),
        end: timeToMinutes(s.endTime),
      }));
    } else {
      baseWindows = [{ start: dayStartMin, end: dayEndMin }];
    }

    // Carve out occupied blocks from baseWindows to get availableFreeSlots
    let availableSlots: Interval[] = [];
    for (const win of baseWindows) {
      let currentSlots = [win];
      for (const occ of occupiedIntervals) {
        const nextSlots: Interval[] = [];
        for (const slot of currentSlots) {
          if (occ.end <= slot.start || occ.start >= slot.end) {
            // No overlap
            nextSlots.push(slot);
          } else {
            // Overlaps -> split
            if (occ.start > slot.start) {
              nextSlots.push({ start: slot.start, end: occ.start });
            }
            if (occ.end < slot.end) {
              nextSlots.push({ start: occ.end, end: slot.end });
            }
          }
        }
        currentSlots = nextSlots;
      }
      availableSlots.push(...currentSlots.filter(s => s.end - s.start >= 15));
    }

    availableSlots.sort((a, b) => a.start - b.start);

    // Sort tasks by priority ('high' > 'medium' > 'low') and deadline
    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const sortedTasks = [...tasks].sort((a, b) => {
      const pDiff = (priorityWeight[b.priority || 'medium'] || 2) - (priorityWeight[a.priority || 'medium'] || 2);
      if (pDiff !== 0) return pDiff;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

    const recommendedTasks: any[] = [];
    let placedCount = 0;

    for (const task of sortedTasks) {
      let duration = Number(task.durationMinutes);
      let isEstimated = false;
      if (!duration || duration <= 0) {
        if (task.subject?.includes('수학')) duration = 60;
        else if (task.subject?.includes('국어')) duration = 50;
        else if (task.subject?.includes('영어')) duration = 40;
        else duration = 45;
        isEstimated = true;
      }

      // Look for a free slot that can fit this task
      let slotIdx = -1;
      for (let i = 0; i < availableSlots.length; i++) {
        const free = availableSlots[i];
        if (free.end - free.start >= duration) {
          slotIdx = i;
          break;
        }
      }

      if (slotIdx !== -1) {
        const slot = availableSlots[slotIdx];
        const taskStart = slot.start;
        const taskEnd = taskStart + duration;

        // Shrink the available slot
        if (taskEnd < slot.end) {
          availableSlots[slotIdx] = { start: taskEnd, end: slot.end };
        } else {
          availableSlots.splice(slotIdx, 1);
        }

        // Generate tailored commentary
        let reason = '';
        const titleLower = (task.title || '').toLowerCase();
        const subj = task.subject || '';

        if (subj.includes('국어') || titleLower.includes('독서')) {
          reason = '국어 독서 지문 풀이는 고도의 인지 집중이 필요해 오전/이른 자습 시간에 배치하는 것을 추천해요.';
        } else if (subj.includes('수학') || titleLower.includes('수학') || titleLower.includes('기출')) {
          reason = '수학 고난도 문제 풀이는 몰입 흐름이 끊기지 않는 쾌적한 자습 시간에 배치했어요.';
        } else if (subj.includes('영어') || titleLower.includes('단어') || titleLower.includes('암기')) {
          reason = '영어 어휘 및 구문 정리는 자투리 및 저녁 시간에 밀도 있게 복습하기에 이상적이에요.';
        } else if (subj.includes('탐구') || subj.includes('한국사')) {
          reason = '개념 체계화와 약점 유형 공략에 적합한 안정적인 자습 시간대입니다.';
        } else {
          reason = `${minutesToTime(taskStart)} ~ ${minutesToTime(taskEnd)}는 다른 일정 및 쉬는 시간과 충돌 없이 집중하기 좋은 시간대입니다.`;
        }

        if (isEstimated) {
          reason += ` (소요시간은 표준 ${duration}분으로 자동 산정되었습니다)`;
        }

        recommendedTasks.push({
          ...task,
          durationMinutes: duration,
          canFit: true,
          recommendedStartTime: minutesToTime(taskStart),
          recommendedEndTime: minutesToTime(taskEnd),
          reason,
          isEstimatedDuration: isEstimated,
        });
        placedCount++;
      } else {
        // Cannot fit without encroaching breaks or existing schedules
        // Requirement 2: 자습 시간에 들어가지 않는 과제는 자동으로 제외하거나 무리하게 배치하지 마.
        recommendedTasks.push({
          ...task,
          durationMinutes: duration,
          canFit: false,
          reason: '해당 날짜의 잔여 자습 시간 및 쉬는 시간 제약으로 인해 오늘은 배치가 어렵습니다. 다음 날 배치나 일정 조정을 추천해요.',
          isEstimatedDuration: isEstimated,
        });
      }
    }

    return res.json({
      success: true,
      targetDate,
      tasks: recommendedTasks,
      placedCount,
      unplacedCount: sortedTasks.length - placedCount,
    });
  } catch (err) {
    console.error('Batch recommendation error:', err);
    return res.status(500).json({ error: 'AI 과제 추천 중 오류가 발생했습니다.' });
  }
});

// Vite & Static Asset Setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
