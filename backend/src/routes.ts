import { Router, Request, Response, NextFunction } from 'express';
import { User, Task, Note, Habit, GrowthPlan, FriendConnection, FriendRequest, ActivityFeed, Notification, FocusSession, HealthLog, JournalEntry, Conversation, Message } from './models';
import mongoose from 'mongoose';
import { io } from './server';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const router = Router();

const USERS_FILE = path.join(__dirname, '../data/users.json');

function loadLocalUsers(): any[] {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading local users:', err);
    return [];
  }
}

function saveLocalUsers(users: any[]) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error saving local users:', err);
  }
}

const REQUESTS_FILE = path.join(__dirname, '../data/requests.json');
const CONNECTIONS_FILE = path.join(__dirname, '../data/connections.json');
const NOTIFICATIONS_FILE = path.join(__dirname, '../data/notifications.json');

function loadLocalRequests(): any[] {
  try {
    if (!fs.existsSync(REQUESTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalRequests(reqs: any[]) {
  try {
    const dir = path.dirname(REQUESTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(reqs, null, 2));
  } catch {}
}

function loadLocalConnections(): any[] {
  try {
    if (!fs.existsSync(CONNECTIONS_FILE)) return [];
    return JSON.parse(fs.readFileSync(CONNECTIONS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalConnections(conns: any[]) {
  try {
    const dir = path.dirname(CONNECTIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONNECTIONS_FILE, JSON.stringify(conns, null, 2));
  } catch {}
}

function loadLocalNotifications(): any[] {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
    return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalNotifications(notifs: any[]) {
  try {
    const dir = path.dirname(NOTIFICATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifs, null, 2));
  } catch {}
}

const TASKS_FILE = path.join(__dirname, '../data/tasks.json');
const HABITS_FILE = path.join(__dirname, '../data/habits.json');
const CONVERSATIONS_FILE = path.join(__dirname, '../data/conversations.json');
const MESSAGES_FILE = path.join(__dirname, '../data/messages.json');

function loadLocalTasks(): any[] {
  try {
    if (!fs.existsSync(TASKS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalTasks(items: any[]) {
  try {
    const dir = path.dirname(TASKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TASKS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

function loadLocalHabits(): any[] {
  try {
    if (!fs.existsSync(HABITS_FILE)) return [];
    return JSON.parse(fs.readFileSync(HABITS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalHabits(items: any[]) {
  try {
    const dir = path.dirname(HABITS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HABITS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

function loadLocalConversations(): any[] {
  try {
    if (!fs.existsSync(CONVERSATIONS_FILE)) return [];
    return JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalConversations(items: any[]) {
  try {
    const dir = path.dirname(CONVERSATIONS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONVERSATIONS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

function loadLocalMessages(): any[] {
  try {
    if (!fs.existsSync(MESSAGES_FILE)) return [];
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalMessages(items: any[]) {
  try {
    const dir = path.dirname(MESSAGES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

const PLANS_FILE = path.join(__dirname, '../data/plans.json');
const FOCUS_FILE = path.join(__dirname, '../data/focus_sessions.json');
const HEALTH_FILE = path.join(__dirname, '../data/health_logs.json');
const JOURNALS_FILE = path.join(__dirname, '../data/journals.json');

function loadLocalPlans(): any[] {
  try {
    if (!fs.existsSync(PLANS_FILE)) return [];
    return JSON.parse(fs.readFileSync(PLANS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalPlans(items: any[]) {
  try {
    const dir = path.dirname(PLANS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PLANS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

function loadLocalFocus(): any[] {
  try {
    if (!fs.existsSync(FOCUS_FILE)) return [];
    return JSON.parse(fs.readFileSync(FOCUS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalFocus(items: any[]) {
  try {
    const dir = path.dirname(FOCUS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FOCUS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

// loadLocalHealth & saveLocalHealth
function loadLocalHealth(): any[] {
  try {
    if (!fs.existsSync(HEALTH_FILE)) return [];
    return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalHealth(items: any[]) {
  try {
    const dir = path.dirname(HEALTH_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

// loadLocalJournals & saveLocalJournals
function loadLocalJournals(): any[] {
  try {
    if (!fs.existsSync(JOURNALS_FILE)) return [];
    return JSON.parse(fs.readFileSync(JOURNALS_FILE, 'utf8'));
  } catch { return []; }
}
function saveLocalJournals(items: any[]) {
  try {
    const dir = path.dirname(JOURNALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(JOURNALS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

function calculateWeekProgress(userId: string, tasks: any[], habits: any[], focusSessions: any[]): number[] {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const result: number[] = [];
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sun, 1 is Mon, etc.
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + distanceToMonday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = d.toISOString().split("T")[0];
    
    const tasksDone = tasks.filter(t => String(t.userId) === String(userId) && t.done && t.dueDate === dateKey).length;
    const habitsDone = habits.filter(h => String(h.userId) === String(userId) && h.history && h.history.includes(dateKey)).length;
    const focusSessionsToday = focusSessions.filter(s => String(s.userId) === String(userId) && s.date === dateKey);
    const focusMins = focusSessionsToday.reduce((sum, s) => sum + (s.duration || 0), 0);
    const xp = (tasksDone * 15) + (habitsDone * 20) + (focusMins * 1);
    result.push(xp || 5);
  }
  return result;
}

function calculateActiveDates(userId: string, tasks: any[], habits: any[], focusSessions: any[], healthLogs: any[]): string[] {
  const activeSet = new Set<string>();
  tasks.forEach(t => {
    if (String(t.userId) === String(userId) && t.done && t.dueDate) {
      activeSet.add(t.dueDate);
    }
  });
  habits.forEach(h => {
    if (String(h.userId) === String(userId) && Array.isArray(h.history)) {
      h.history.forEach((d: string) => activeSet.add(d));
    }
  });
  focusSessions.forEach(s => {
    if (String(s.userId) === String(userId) && s.date) {
      activeSet.add(s.date);
    }
  });
  healthLogs.forEach(l => {
    if (String(l.userId) === String(userId) && l.date) {
      activeSet.add(l.date);
    }
  });
  return Array.from(activeSet);
}

function buildLocalPartnerPayload(friendUser: any, connectionId: string) {
  const fid = friendUser.id || friendUser._id;
  const localHabits = loadLocalHabits().filter(h => String(h.userId) === String(fid));
  const localTasks = loadLocalTasks().filter(t => String(t.userId) === String(fid));
  const localHealth = loadLocalHealth().filter(h => String(h.userId) === String(fid));
  const localFocus = loadLocalFocus().filter(s => String(s.userId) === String(fid));
  
  const totalHabits = localHabits.length;
  const doneHabits = localHabits.filter(h => h.completedToday).length;
  const habitCompletion = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;
  
  const totalTasks = localTasks.length;
  const doneTasks = localTasks.filter(t => t.done).length;
  const taskCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  
  const weekProgress = calculateWeekProgress(fid, localTasks, localHabits, localFocus);
  const activeDates = calculateActiveDates(fid, localTasks, localHabits, localFocus, localHealth);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = localHealth.find(h => h.date === todayStr) || localHealth[0];
  
  const waterIntake = todayLog ? Math.round((todayLog.waterMl || 0) / 250) : 0;
  const sleepHours = todayLog ? (todayLog.sleepHours || 0) : 7.5;
  const exercise = todayLog ? (todayLog.workoutMins || 0) : 0;
  const mood = todayLog ? (todayLog.mood || 'okay') : 'okay';

  const healthScore = todayLog 
    ? Math.min(100, Math.round(((todayLog.waterMl || 1500) / 2500 * 50) + ((todayLog.sleepHours || 7) / 8 * 50))) 
    : 85;

  const focusHours = Math.round(localFocus.reduce((acc, s) => acc + (s.duration || 0), 0) / 60 * 10) / 10;
  
  const codingFocusMins = localFocus.filter(s => (s.category || '').toLowerCase() === 'coding' || (s.category || '').toLowerCase() === 'code').reduce((acc, s) => acc + (s.duration || 0), 0);
  const completedCodingTasks = localTasks.filter(t => t.done && (t.category === 'Career' || t.category === 'Learning' || t.title.toLowerCase().includes('code') || t.title.toLowerCase().includes('dev')));
  const codingHours = Math.round((completedCodingTasks.length * 1.5 + codingFocusMins / 60) * 10) / 10;
  const studyHours = focusHours;

  const careerScore = Math.min(100, Math.round((doneTasks * 10 + codingHours * 5)));
  const productivityScore = Math.min(100, Math.round((habitCompletion + taskCompletion) / 2));

  return {
    id: connectionId,
    friendUserId: String(fid),
    name: friendUser.name,
    avatar: friendUser.avatar || null,
    level: friendUser.level || 1,
    xp: friendUser.xp || 0,
    streak: friendUser.streak || 0,
    longestStreak: friendUser.longestStreak || friendUser.streak || 0,
    status: 'online' as const,
    inviteCode: friendUser.inviteCode,
    growSyncId: friendUser.growSyncId,
    habits: localHabits.map(h => ({ name: h.name, icon: h.icon, done: h.completedToday, streak: h.streak, consistencyScore: h.consistencyScore || 100 })),
    tasks: localTasks.slice(0, 10).map(t => ({ title: t.title, done: t.done, priority: t.priority, difficulty: t.difficulty || 'Medium' })),
    weekProgress,
    activeDates,
    healthScore,
    careerScore,
    productivityScore,
    focusHours,
    studyHours,
    codingHours,
    waterIntake,
    sleepHours,
    exercise,
    currentChallenge: friendUser.currentChallenge || 'None',
    currentRank: friendUser.currentRank || 'Bronze I',
    mood,
    habitCompletion,
    taskCompletion,
    completedTasks: doneTasks,
    pendingTasks: totalTasks - doneTasks,
    weeklyGoalsDone: Math.min(doneTasks, 5),
    weeklyGoalsTotal: 5,
    monthlyGoalsDone: Math.min(doneTasks, 10),
    monthlyGoalsTotal: 10
  };
}

function generateUniqueInviteCode(existingUsers: any[]): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = 'GROW-' + randomPart;
    isUnique = !existingUsers.some(u => u.inviteCode === code);
  }
  return code;
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const userId = authHeader.split(' ')[1];
  if (!userId) return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  (req as any).userId = userId;
  next();
};

async function buildPartnerPayload(friendUser: any, connectionId: string) {
  const fid = friendUser._id || friendUser.id;
  const habits = await Habit.find({ userId: fid });
  const tasks = await Task.find({ userId: fid });
  const healthLogs = await HealthLog.find({ userId: fid }).sort({ date: -1 });
  const focusSessions = await FocusSession.find({ userId: fid });

  const totalHabits = habits.length;
  const doneHabits = habits.filter(h => h.completedToday).length;
  const habitCompletion = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;
  
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const taskCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  
  const weekProgress = calculateWeekProgress(fid, tasks, habits, focusSessions);
  const activeDates = calculateActiveDates(fid, tasks, habits, focusSessions, healthLogs);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = healthLogs.find(h => h.date === todayStr) || healthLogs[0];
  
  const waterIntake = todayLog ? Math.round((todayLog.waterMl || 0) / 250) : 0;
  const sleepHours = todayLog ? (todayLog.sleepHours || 0) : 7.5;
  const exercise = todayLog ? (todayLog.workoutMins || 0) : 0;
  const mood = todayLog ? (todayLog.mood || 'okay') : 'okay';

  const healthScore = todayLog 
    ? Math.min(100, Math.round(((todayLog.waterMl || 1500) / 2500 * 50) + ((todayLog.sleepHours || 7) / 8 * 50))) 
    : 85;

  const focusHours = Math.round(focusSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60 * 10) / 10;
  
  const codingFocusMins = focusSessions.filter(s => (s.category || '').toLowerCase() === 'coding' || (s.category || '').toLowerCase() === 'code').reduce((acc, s) => acc + (s.duration || 0), 0);
  const completedCodingTasks = tasks.filter(t => t.done && (t.category === 'Career' || t.category === 'Learning' || t.title.toLowerCase().includes('code') || t.title.toLowerCase().includes('dev')));
  const codingHours = Math.round((completedCodingTasks.length * 1.5 + codingFocusMins / 60) * 10) / 10;
  const studyHours = focusHours;

  const careerScore = Math.min(100, Math.round((doneTasks * 10 + codingHours * 5)));
  const productivityScore = Math.min(100, Math.round((habitCompletion + taskCompletion) / 2));

  return {
    id: connectionId,
    friendUserId: String(fid),
    name: friendUser.name,
    avatar: friendUser.avatar || null,
    level: friendUser.level || 1,
    xp: friendUser.xp || 0,
    streak: friendUser.streak || 0,
    longestStreak: friendUser.longestStreak || friendUser.streak || 0,
    status: 'online' as const,
    inviteCode: friendUser.inviteCode,
    growSyncId: friendUser.growSyncId,
    habits: habits.map(h => ({ name: h.name, icon: h.icon, done: h.completedToday, streak: h.streak, consistencyScore: h.consistencyScore || 100 })),
    tasks: tasks.slice(0, 10).map(t => ({ title: t.title, done: t.done, priority: t.priority, difficulty: t.difficulty || 'Medium' })),
    weekProgress,
    activeDates,
    healthScore,
    careerScore,
    productivityScore,
    focusHours,
    studyHours,
    codingHours,
    waterIntake,
    sleepHours,
    exercise,
    currentChallenge: friendUser.currentChallenge || 'None',
    currentRank: friendUser.currentRank || 'Bronze I',
    mood,
    habitCompletion,
    taskCompletion,
    completedTasks: doneTasks,
    pendingTasks: totalTasks - doneTasks,
    weeklyGoalsDone: Math.min(doneTasks, 5),
    weeklyGoalsTotal: 5,
    monthlyGoalsDone: Math.min(doneTasks, 10),
    monthlyGoalsTotal: 10,
  };
}

async function notifyPartners(userId: string) {
  try {
    const uid = String(userId);
    let friendIds: string[] = [];
    if (mongoose.connection.readyState !== 1) {
      const conns = loadLocalConnections();
      conns.forEach(c => {
        if (String(c.userId) === uid) friendIds.push(String(c.friendUserId));
        else if (String(c.friendUserId) === uid) friendIds.push(String(c.userId));
      });
    } else {
      const conns = await FriendConnection.find({ $or: [{ userId: uid }, { friendUserId: uid }] });
      conns.forEach(c => {
        if (String(c.userId) === uid) friendIds.push(String(c.friendUserId));
        else if (String(c.friendUserId) === uid) friendIds.push(String(c.userId));
      });
    }
    friendIds = Array.from(new Set(friendIds));
    friendIds.forEach(fid => {
      io.to(fid).emit('partner_updated', { userId: uid });
    });
  } catch (err) {
    console.error('Error notifying partners:', err);
  }
}

/* ══════════════════════════════════════════
   AUTH ENDPOINTS
   ══════════════════════════════════════════ */
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const existing = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
      }
      const mockUser = {
        id: "mock_user_" + Math.random().toString(36).substring(2, 9),
        _id: new mongoose.Types.ObjectId().toString(),
        name: name || 'New User',
        email,
        bio: 'Developing self-improvement habits.',
        level: 1,
        xp: 15,
        coins: 10,
        streak: 1,
        longestStreak: 1,
        growSyncId: `GS-${Math.floor(100000 + Math.random() * 900000)}`,
        streakHistory: [new Date().toISOString().split('T')[0]],
        joinDate: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        goals: ['fitness', 'coding', 'productivity'],
        inviteCode: generateUniqueInviteCode(localUsers)
      };
      localUsers.push(mockUser);
      saveLocalUsers(localUsers);
      return res.status(201).json(mockUser);
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({
      name: name || 'New User',
      email,
      password: passwordHash,
      joinDate: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
    });
    await user.save();
    res.status(201).json(user);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error during registration' }); }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, growSyncId, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (mongoose.connection.readyState !== 1) {
      // Offline fallback — use local JSON store
      const localUsers = loadLocalUsers();
      const cleanInput = (email || '').trim();
      if (!cleanInput) {
        return res.status(400).json({ error: 'Email or GrowSync ID is required' });
      }
      const user = localUsers.find(u => 
        u.email.toLowerCase() === cleanInput.toLowerCase() || 
        u.growSyncId === cleanInput
      );
      if (!user) {
        return res.status(401).json({ error: 'No account found with this email/GrowSync ID. Please sign up first.' });
      }
      if (password.length < 6) {
        return res.status(401).json({ error: 'Password must be at least 6 characters.' });
      }
      return res.json(user);
    }

    // Find user by email OR growSyncId
    let user: any = null;
    if (email) {
      const cleanInput = email.trim();
      if (cleanInput.includes('@')) {
        user = await User.findOne({ email: { $regex: new RegExp(`^${cleanInput}$`, 'i') } }).select('+password');
      } else {
        user = await User.findOne({ growSyncId: cleanInput.toUpperCase() }).select('+password');
      }
    } else if (growSyncId) {
      user = await User.findOne({ growSyncId: growSyncId.trim().toUpperCase() }).select('+password');
    } else {
      return res.status(400).json({ error: 'Email or GrowSync ID is required' });
    }

    if (!user) {
      return res.status(401).json({ error: 'No account found with those credentials.' });
    }

    // Password verification — mandatory
    if (!user.password) {
      return res.status(401).json({ error: 'This account does not have a password configured. Please register again.' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Return user without password hash
    const userObj = user.toJSON();
    res.json(userObj);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error during login' }); }
});

router.get('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const userId = (req as any).userId;
      const user = localUsers.find(u => u.id === userId || u._id === userId);
      if (user) return res.json(user);
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await User.findById((req as any).userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    // Never allow password update through this generic endpoint
    const { password, ...safeBody } = req.body;
    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const userId = (req as any).userId;
      const index = localUsers.findIndex(u => u.id === userId || u._id === userId);
      if (index !== -1) {
        localUsers[index] = { ...localUsers[index], ...safeBody };
        saveLocalUsers(localUsers);
        return res.json(localUsers[index]);
      }
      return res.json(safeBody);
    }
    const user = await User.findByIdAndUpdate((req as any).userId, safeBody, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* GROWTH PLANS */
router.get('/plans', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localPlans = loadLocalPlans();
      const mine = localPlans.filter(p => String(p.userId) === String(userId));
      return res.json(mine);
    }
    res.json(await GrowthPlan.find({ userId }));
  }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/plans', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, category, description, targetDate, progress, active } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    if (mongoose.connection.readyState !== 1) {
      const localPlans = loadLocalPlans();
      if (active) {
        localPlans.forEach(p => { if (String(p.userId) === String(userId)) p.active = false; });
      }
      const newPlan = {
        id: `gp_${Date.now()}`,
        _id: `gp_${Date.now()}`,
        userId,
        title,
        category: category || 'Career',
        description: description || '',
        targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        progress: progress || 0,
        active: active !== undefined ? active : true,
        createdAt: new Date().toISOString().split('T')[0]
      };
      localPlans.push(newPlan);
      saveLocalPlans(localPlans);
      return res.status(201).json(newPlan);
    }

    if (active) await GrowthPlan.updateMany({ userId }, { active: false });
    const newPlan = new GrowthPlan({ userId, title, category: category || 'Career', description: description || '', targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], progress: progress || 0, active: active !== undefined ? active : true, createdAt: new Date().toISOString().split('T')[0] });
    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localPlans = loadLocalPlans();
      if (req.body.active) {
        localPlans.forEach(p => { if (String(p.userId) === String(userId)) p.active = false; });
      }
      const idx = localPlans.findIndex(p => (p.id === req.params.id || p._id === req.params.id) && String(p.userId) === String(userId));
      if (idx === -1) return res.status(404).json({ error: 'Growth plan not found' });
      localPlans[idx] = { ...localPlans[idx], ...req.body };
      saveLocalPlans(localPlans);
      return res.json(localPlans[idx]);
    }

    if (req.body.active) await GrowthPlan.updateMany({ userId }, { active: false });
    const plan = await GrowthPlan.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!plan) return res.status(404).json({ error: 'Growth plan not found' });
    res.json(plan);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localPlans = loadLocalPlans();
      const filtered = localPlans.filter(p => !(p.id === req.params.id || p._id === req.params.id) || String(p.userId) !== String(userId));
      saveLocalPlans(filtered);
      return res.json({ success: true });
    }
    const plan = await GrowthPlan.findOneAndDelete({ _id: req.params.id, userId });
    if (!plan) return res.status(404).json({ error: 'Growth plan not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* USER SEARCH */
router.get('/users/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'code query param is required' });

    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const userId = (req as any).userId;
      const me = localUsers.find(u => u.id === userId || u._id === userId);
      if (me && me.inviteCode?.toUpperCase() === code) {
        return res.status(400).json({ error: "That's your own invite code!" });
      }
      const targetUser = localUsers.find(u => u.inviteCode?.toUpperCase() === code);
      if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code' });
      return res.json({ id: targetUser.id || targetUser._id, name: targetUser.name, avatar: targetUser.avatar, level: targetUser.level || 1, streak: targetUser.streak || 0, inviteCode: targetUser.inviteCode, growSyncId: targetUser.growSyncId });
    }

    const me = await User.findById((req as any).userId);
    if (me?.inviteCode === code) return res.status(400).json({ error: "That's your own invite code!" });
    const targetUser = await User.findOne({ inviteCode: code });
    if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code' });
    res.json({ id: targetUser._id, name: targetUser.name, avatar: targetUser.avatar, level: targetUser.level, streak: targetUser.streak, inviteCode: targetUser.inviteCode, growSyncId: targetUser.growSyncId });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* TASKS */
router.get('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localTasks = loadLocalTasks();
      const mine = localTasks.filter(t => String(t.userId) === String(userId));
      return res.json(mine);
    }
    res.json(await Task.find({ userId }));
  }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, note, category, priority, dueDate, dueTime, estimatedDuration, reminder, tags, recurring, difficulty, subtasks, dependencies, planId } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    if (mongoose.connection.readyState !== 1) {
      const localTasks = loadLocalTasks();
      const newTask = {
        id: `task_${Date.now()}`,
        _id: `task_${Date.now()}`,
        userId,
        title,
        note: note || '',
        category: category || 'Personal',
        priority: priority || 'medium',
        done: false,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        dueTime,
        estimatedDuration,
        reminder,
        tags,
        recurring,
        difficulty: difficulty || 'Medium',
        subtasks: subtasks || [],
        dependencies: dependencies || [],
        planId
      };
      localTasks.push(newTask);
      saveLocalTasks(localTasks);
      notifyPartners(userId);
      return res.status(201).json(newTask);
    }

    const newTask = new Task({ userId, title, note: note || '', category: category || 'Personal', priority: priority || 'medium', done: false, dueDate: dueDate || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString().split('T')[0], dueTime, estimatedDuration, reminder, tags, recurring, difficulty: difficulty || 'Medium', subtasks: subtasks || [], dependencies: dependencies || [], planId });
    await newTask.save();
    notifyPartners(userId);
    res.status(201).json(newTask);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localTasks = loadLocalTasks();
      const idx = localTasks.findIndex(t => (t.id === req.params.id || t._id === req.params.id) && String(t.userId) === String(userId));
      if (idx === -1) return res.status(404).json({ error: 'Task not found' });
      localTasks[idx] = { ...localTasks[idx], ...req.body };
      saveLocalTasks(localTasks);
      notifyPartners(userId);

      if (req.body.done === true) {
        const localUsers = loadLocalUsers();
        const me = localUsers.find(u => u.id === userId || u._id === userId);
        const populatedAct = {
          userId: me ? { id: me.id || me._id, name: me.name, avatar: me.avatar } : null,
          type: 'task_completed',
          description: `completed task: ${localTasks[idx].title}`,
          xpEarned: 10,
          createdAt: new Date().toISOString()
        };
        const localConns = loadLocalConnections();
        const conns = localConns.filter(c => String(c.friendUserId) === String(userId));
        conns.forEach(c => io.to(String(c.userId)).emit('friend_activity', populatedAct));
      }
      return res.json(localTasks[idx]);
    }

    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    notifyPartners(userId);
    if (req.body.done === true) {
      const act = await ActivityFeed.create({ userId, type: 'task_completed', description: `completed task: ${task.title}`, xpEarned: 10, createdAt: new Date().toISOString() });
      const populatedAct = await act.populate('userId', 'name avatar');
      const conns = await FriendConnection.find({ friendUserId: userId });
      conns.forEach(c => io.to(String(c.userId)).emit('friend_activity', populatedAct));
    }
    res.json(task);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localTasks = loadLocalTasks();
      const filtered = localTasks.filter(t => !(t.id === req.params.id || t._id === req.params.id) || String(t.userId) !== String(userId));
      saveLocalTasks(filtered);
      notifyPartners(userId);
      return res.json({ success: true });
    }
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    notifyPartners(userId);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* NOTES */
router.get('/notes', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await Note.find({ userId: (req as any).userId })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, body, color, pinned, folder, planId } = req.body;
    if (!title && !body) return res.status(400).json({ error: 'Title or body is required' });
    const newNote = new Note({ userId: (req as any).userId, title: title || '', body: body || '', color: color || 'violet', pinned: pinned || false, createdAt: new Date().toISOString().split('T')[0], folder: folder || 'General', planId });
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/notes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const note = await Note.findOneAndUpdate({ _id: req.params.id, userId: (req as any).userId }, req.body, { new: true });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/notes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* HABITS */
router.get('/habits', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localHabits = loadLocalHabits();
      const mine = localHabits.filter(h => String(h.userId) === String(userId));
      return res.json(mine);
    }
    res.json(await Habit.find({ userId }));
  }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/habits', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, category, icon, priority, freq, target, history, paused, archived, notes, planId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    if (mongoose.connection.readyState !== 1) {
      const localHabits = loadLocalHabits();
      const newHabit = {
        id: Date.now(),
        _id: `habit_${Date.now()}`,
        userId,
        name,
        category: category || 'Fitness',
        icon: icon || '🏃',
        priority: priority || 'medium',
        freq: freq || 'Daily',
        streak: 0,
        longestStreak: 0,
        target: target || '1 time',
        completedToday: false,
        consistencyScore: 100,
        history: history || [],
        paused: paused || false,
        archived: archived || false,
        notes: notes || '',
        planId
      };
      localHabits.push(newHabit);
      saveLocalHabits(localHabits);
      notifyPartners(userId);
      return res.status(201).json(newHabit);
    }

    const newHabit = new Habit({ userId, name, category: category || 'Fitness', icon: icon || '🏃', priority: priority || 'medium', freq: freq || 'Daily', streak: 0, longestStreak: 0, target: target || '1 time', completedToday: false, consistencyScore: 0, history: history || [], paused: paused || false, archived: archived || false, notes: notes || '', planId });
    await newHabit.save();
    notifyPartners(userId);
    res.status(201).json(newHabit);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/habits/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localHabits = loadLocalHabits();
      const idx = localHabits.findIndex(h => (String(h.id) === String(req.params.id) || h._id === req.params.id) && String(h.userId) === String(userId));
      if (idx === -1) return res.status(404).json({ error: 'Habit not found' });
      localHabits[idx] = { ...localHabits[idx], ...req.body };
      saveLocalHabits(localHabits);
      notifyPartners(userId);

      if (req.body.completedToday === true) {
        const localUsers = loadLocalUsers();
        const me = localUsers.find(u => u.id === userId || u._id === userId);
        const populatedAct = {
          userId: me ? { id: me.id || me._id, name: me.name, avatar: me.avatar } : null,
          type: 'habit_completed',
          description: `completed habit: ${localHabits[idx].name}`,
          xpEarned: 15,
          createdAt: new Date().toISOString()
        };
        const localConns = loadLocalConnections();
        const conns = localConns.filter(c => String(c.friendUserId) === String(userId));
        conns.forEach(c => io.to(String(c.userId)).emit('friend_activity', populatedAct));
      }
      return res.json(localHabits[idx]);
    }

    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    notifyPartners(userId);
    if (req.body.completedToday === true) {
      const act = await ActivityFeed.create({ userId, type: 'habit_completed', description: `completed habit: ${habit.name}`, xpEarned: 15, createdAt: new Date().toISOString() });
      const populatedAct = await act.populate('userId', 'name avatar');
      const conns = await FriendConnection.find({ friendUserId: userId });
      conns.forEach(c => io.to(String(c.userId)).emit('friend_activity', populatedAct));
    }
    res.json(habit);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/habits/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localHabits = loadLocalHabits();
      const filtered = localHabits.filter(h => !(String(h.id) === String(req.params.id) || h._id === req.params.id) || String(h.userId) !== String(userId));
      saveLocalHabits(filtered);
      notifyPartners(userId);
      return res.json({ success: true });
    }
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    notifyPartners(userId);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* FOCUS SESSIONS */
router.get('/focus-sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localFocus = loadLocalFocus();
      const mine = localFocus.filter(s => String(s.userId) === String(userId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json(mine);
    }
    res.json(await FocusSession.find({ userId }).sort({ date: -1 }));
  }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/focus-sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { duration, category, date, notes } = req.body;
    if (!duration || duration < 1) return res.status(400).json({ error: 'Duration (minutes) is required and must be >= 1' });

    if (mongoose.connection.readyState !== 1) {
      const localFocus = loadLocalFocus();
      const newSession = {
        id: `focus_${Date.now()}`,
        _id: `focus_${Date.now()}`,
        userId,
        duration: Number(duration),
        category: category || 'General',
        date: date || new Date().toISOString().split('T')[0],
        notes: notes || ''
      };
      localFocus.push(newSession);
      saveLocalFocus(localFocus);

      // Update user focusHours
      const localUsers = loadLocalUsers();
      const idx = localUsers.findIndex(u => u.id === userId || u._id === userId);
      if (idx !== -1) {
        const mine = localFocus.filter(s => String(s.userId) === String(userId));
        const totalMins = mine.reduce((sum, s) => sum + (s.duration || 0), 0);
        localUsers[idx].focusHours = Math.round(totalMins / 60 * 10) / 10;
        saveLocalUsers(localUsers);
      }
      notifyPartners(userId);
      return res.status(201).json(newSession);
    }

    const session = new FocusSession({ userId, duration: Number(duration), category: category || 'General', date: date || new Date().toISOString().split('T')[0], notes: notes || '' });
    await session.save();
    const allSessions = await FocusSession.find({ userId });
    const totalMins = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    await User.findByIdAndUpdate(userId, { focusHours: Math.round(totalMins / 60 * 10) / 10 });
    notifyPartners(userId);
    res.status(201).json(session);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/focus-sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localFocus = loadLocalFocus();
      const filtered = localFocus.filter(s => !(s.id === req.params.id || s._id === req.params.id) || String(s.userId) !== String(userId));
      saveLocalFocus(filtered);
      notifyPartners(userId);
      return res.json({ success: true });
    }
    const session = await FocusSession.findOneAndDelete({ _id: req.params.id, userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    notifyPartners(userId);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* HEALTH LOGS */
router.get('/health-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localHealth = loadLocalHealth();
      const mine = localHealth.filter(h => String(h.userId) === String(userId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json(mine);
    }
    res.json(await HealthLog.find({ userId }).sort({ date: -1 }));
  }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/health-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { waterMl, sleepHours, workoutMins, mood, notes, date } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];

    if (mongoose.connection.readyState !== 1) {
      const localHealth = loadLocalHealth();
      let log = localHealth.find(h => String(h.userId) === String(userId) && h.date === logDate);
      if (log) {
        if (waterMl !== undefined) log.waterMl = waterMl;
        if (sleepHours !== undefined) log.sleepHours = sleepHours;
        if (workoutMins !== undefined) log.workoutMins = workoutMins;
        if (mood !== undefined) log.mood = mood;
        if (notes !== undefined) log.notes = notes;
      } else {
        log = {
          id: `health_${Date.now()}`,
          _id: `health_${Date.now()}`,
          userId,
          date: logDate,
          waterMl: waterMl || 0,
          sleepHours: sleepHours || 7,
          workoutMins: workoutMins || 0,
          mood: mood || 'okay',
          notes: notes || ''
        };
        localHealth.push(log);
      }
      saveLocalHealth(localHealth);

      // Sync to user profiles
      const localUsers = loadLocalUsers();
      const idx = localUsers.findIndex(u => u.id === userId || u._id === userId);
      if (idx !== -1) {
        if (mood !== undefined) localUsers[idx].mood = mood;
        if (sleepHours !== undefined) localUsers[idx].sleepHours = sleepHours;
        if (waterMl !== undefined) localUsers[idx].waterIntake = Math.round(waterMl / 250);
        saveLocalUsers(localUsers);
      }
      notifyPartners(userId);
      return res.json(log);
    }

    const log = await HealthLog.findOneAndUpdate(
      { userId, date: logDate },
      { $set: { ...(waterMl !== undefined && { waterMl }), ...(sleepHours !== undefined && { sleepHours }), ...(workoutMins !== undefined && { workoutMins }), ...(mood !== undefined && { mood }), ...(notes !== undefined && { notes }) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const updateFields: any = {};
    if (mood !== undefined) updateFields.mood = mood;
    if (sleepHours !== undefined) updateFields.sleepHours = sleepHours;
    if (waterMl !== undefined) updateFields.waterIntake = Math.round(waterMl / 250);
    if (Object.keys(updateFields).length > 0) await User.findByIdAndUpdate(userId, updateFields);
    notifyPartners(userId);
    res.json(log);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* JOURNALS */
router.get('/journals', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localJournals = loadLocalJournals();
      const mine = localJournals.filter(j => String(j.userId) === String(userId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return res.json(mine);
    }
    res.json(await JournalEntry.find({ userId }).sort({ date: -1 }));
  }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/journals', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { date, mood, wins, challenges, gratitude, lessons, folder, pinned, tags, planId } = req.body;

    if (mongoose.connection.readyState !== 1) {
      const localJournals = loadLocalJournals();
      const newEntry = {
        id: `journal_${Date.now()}`,
        _id: `journal_${Date.now()}`,
        userId,
        date: date || new Date().toISOString().split('T')[0],
        mood: mood || 'okay',
        wins: wins || '',
        challenges: challenges || '',
        gratitude: gratitude || '',
        lessons: lessons || '',
        folder: folder || 'General',
        pinned: pinned || false,
        tags: tags || [],
        planId
      };
      localJournals.push(newEntry);
      saveLocalJournals(localJournals);
      return res.status(201).json(newEntry);
    }

    const entry = new JournalEntry({ userId, date: date || new Date().toISOString().split('T')[0], mood: mood || 'okay', wins: wins || '', challenges: challenges || '', gratitude: gratitude || '', lessons: lessons || '', folder: folder || 'General', pinned: pinned || false, tags: tags || [], planId });
    await entry.save();
    res.status(201).json(entry);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/journals/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localJournals = loadLocalJournals();
      const idx = localJournals.findIndex(j => (j.id === req.params.id || j._id === req.params.id) && String(j.userId) === String(userId));
      if (idx === -1) return res.status(404).json({ error: 'Journal entry not found' });
      localJournals[idx] = { ...localJournals[idx], ...req.body };
      saveLocalJournals(localJournals);
      return res.json(localJournals[idx]);
    }
    const entry = await JournalEntry.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(entry);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/journals/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localJournals = loadLocalJournals();
      const filtered = localJournals.filter(j => !(j.id === req.params.id || j._id === req.params.id) || String(j.userId) !== String(userId));
      saveLocalJournals(filtered);
      return res.json({ success: true });
    }
    const entry = await JournalEntry.findOneAndDelete({ _id: req.params.id, userId });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* NOTIFICATIONS */
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localNotifs = loadLocalNotifications();
      const localUsers = loadLocalUsers();
      const mine = localNotifs.filter(n => n.recipientId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50);
      const populated = mine.map(n => {
        const sender = localUsers.find(u => u.id === n.senderId || u._id === n.senderId) || null;
        return { ...n, senderId: sender ? { id: sender.id || sender._id, name: sender.name, avatar: sender.avatar } : null };
      });
      return res.json(populated);
    }
    const notifications = await Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(50).populate('senderId', 'name avatar');
    res.json(notifications);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localNotifs = loadLocalNotifications();
      localNotifs.forEach(n => { if (n.recipientId === userId) n.read = true; });
      saveLocalNotifications(localNotifs);
      return res.json({ success: true });
    }
    await Notification.updateMany({ recipientId: userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localNotifs = loadLocalNotifications();
      const note = localNotifs.find(n => n.id === req.params.id && n.recipientId === userId);
      if (!note) return res.status(404).json({ error: 'Notification not found' });
      note.read = true;
      saveLocalNotifications(localNotifs);
      return res.json(note);
    }
    const note = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: userId }, { read: true }, { new: true });
    if (!note) return res.status(404).json({ error: 'Notification not found' });
    res.json(note);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* ══════════════════════════════════════════
   FRIENDS / PARTNERS
   ══════════════════════════════════════════ */
const mockConnections: any[] = [];

router.get('/partners', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localConns = loadLocalConnections();
      const localUsers = loadLocalUsers();
      const userConns = localConns.filter(c => c.userId === userId);
      const partners = userConns.map(conn => {
        const friendUser = localUsers.find(u => u.id === conn.friendUserId || u._id === conn.friendUserId);
        if (!friendUser) return null;
        return buildLocalPartnerPayload(friendUser, conn.id);
      }).filter(Boolean);
      return res.json(partners);
    }
    const connections = await FriendConnection.find({ userId });
    const partners = await Promise.all(connections.map(async (conn) => {
      const friendUser = await User.findById(conn.friendUserId);
      if (!friendUser) return null;
      return buildPartnerPayload(friendUser, String(conn._id));
    }));
    res.json(partners.filter(Boolean));
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error' }); }
});

/* ── CRITICAL FIX: /partners/invite now creates a REQUEST, not a direct connection ── */
router.post('/partners/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Invite code is required' });
    const userId = (req as any).userId;
    const cleanCode = code.trim().toUpperCase();

    // Offline fallback — still sends a pending result to avoid confusion
    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const friendUser = localUsers.find(u => u.inviteCode === cleanCode);
      if (!friendUser) {
        return res.status(404).json({ error: 'No user found with that invite code. Please check and try again.' });
      }
      const me = localUsers.find(u => u.id === userId || u._id === userId);
      if (me && me.inviteCode === cleanCode) {
        return res.status(400).json({ error: 'You cannot add yourself as a growth partner!' });
      }

      // Check if already friends
      const localConns = loadLocalConnections();
      const alreadyFriends = localConns.some(c => 
        (c.userId === userId && c.friendUserId === (friendUser.id || String(friendUser._id))) ||
        (c.userId === (friendUser.id || String(friendUser._id)) && c.friendUserId === userId)
      );
      if (alreadyFriends) {
        return res.status(400).json({ error: `You are already growth partners with ${friendUser.name}!` });
      }

      // Check if pending request exists
      const localReqs = loadLocalRequests();
      const targetId = friendUser.id || String(friendUser._id);
      const existingReq = localReqs.some(r => 
        r.status === 'pending' && (
          (r.fromUserId === userId && r.toUserId === targetId) ||
          (r.fromUserId === targetId && r.toUserId === userId)
        )
      );
      if (existingReq) {
        return res.status(400).json({ error: 'A friend request already exists between you two.' });
      }

      // Create request
      const reqId = `mock_req_${Date.now()}`;
      const newReq = {
        id: reqId,
        fromUserId: userId,
        toUserId: targetId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      localReqs.push(newReq);
      saveLocalRequests(localReqs);

      // Create notification
      const localNotifs = loadLocalNotifications();
      const notifId = `mock_notif_${Date.now()}`;
      const newNotif = {
        id: notifId,
        recipientId: targetId,
        senderId: userId,
        type: 'friend_request',
        message: `${me?.name || 'A user'} sent you a friend request! Open Friends to accept.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      localNotifs.push(newNotif);
      saveLocalNotifications(localNotifs);

      // Emit notification via Socket.io
      const populatedNotif = {
        ...newNotif,
        senderId: me ? { id: me.id || me._id, name: me.name, avatar: me.avatar } : null
      };
      io.to(targetId).emit('notification', populatedNotif);

      return res.status(201).json({ pending: true, message: `Friend request sent to ${friendUser.name}! Waiting for them to accept.` });
    }

    const me = await User.findById(userId);
    if (!me) return res.status(404).json({ error: 'Your account was not found.' });
    if (me.inviteCode?.toUpperCase() === cleanCode) {
      return res.status(400).json({ error: 'You cannot add yourself as a growth partner!' });
    }

    const targetUser = await User.findOne({ inviteCode: cleanCode });
    if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code. Please check and try again.' });

    // Block if already friends
    const alreadyConnected = await FriendConnection.findOne({
      $or: [
        { userId, friendUserId: targetUser._id },
        { userId: targetUser._id, friendUserId: userId }
      ]
    });
    if (alreadyConnected) return res.status(400).json({ error: `You are already growth partners with ${targetUser.name}!` });

    // Block if a pending request already exists (either direction)
    const existingReq = await FriendRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: targetUser._id, status: 'pending' },
        { fromUserId: targetUser._id, toUserId: userId, status: 'pending' }
      ]
    });
    if (existingReq) return res.status(400).json({ error: 'A friend request already exists between you two.' });

    // Create the friend request
    const friendReq = new FriendRequest({
      fromUserId: userId,
      toUserId: targetUser._id,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    await friendReq.save();

    // Create notification for the target user
    const notif = await Notification.create({
      recipientId: targetUser._id,
      senderId: userId,
      type: 'friend_request',
      message: `${me.name} sent you a friend request! Open Friends to accept.`,
      createdAt: new Date().toISOString()
    });
    const populatedNotif = await Notification.findById(notif._id).populate('senderId', 'name avatar');

    // Real-time: push notification to target user's socket room
    io.to(String(targetUser._id)).emit('notification', populatedNotif);

    res.status(201).json({
      pending: true,
      message: `Friend request sent to ${targetUser.name}! Waiting for them to accept.`
    });
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ error: 'Friend request already sent.' });
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/partners/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const idx = mockConnections.findIndex(c => c.id === req.params.id);
      if (idx !== -1) mockConnections.splice(idx, 1);
      return res.json({ success: true });
    }
    const conn = await FriendConnection.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/partners/request', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Invite code is required' });
    const userId = (req as any).userId;
    const cleanCode = code.trim().toUpperCase();

    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const friendUser = localUsers.find(u => u.inviteCode === cleanCode);
      if (!friendUser) {
        return res.status(404).json({ error: 'No user found with that invite code. Please check and try again.' });
      }
      const me = localUsers.find(u => u.id === userId || u._id === userId);
      if (me && me.inviteCode === cleanCode) {
        return res.status(400).json({ error: 'You cannot add yourself as a growth partner!' });
      }

      // Check if already friends
      const localConns = loadLocalConnections();
      const alreadyFriends = localConns.some(c => 
        (c.userId === userId && c.friendUserId === (friendUser.id || String(friendUser._id))) ||
        (c.userId === (friendUser.id || String(friendUser._id)) && c.friendUserId === userId)
      );
      if (alreadyFriends) {
        return res.status(400).json({ error: `You are already growth partners with ${friendUser.name}!` });
      }

      // Check if pending request exists
      const localReqs = loadLocalRequests();
      const targetId = friendUser.id || String(friendUser._id);
      const existingReq = localReqs.some(r => 
        r.status === 'pending' && (
          (r.fromUserId === userId && r.toUserId === targetId) ||
          (r.fromUserId === targetId && r.toUserId === userId)
        )
      );
      if (existingReq) {
        return res.status(400).json({ error: 'A friend request already exists between you two.' });
      }

      // Create request
      const reqId = `mock_req_${Date.now()}`;
      const newReq = {
        id: reqId,
        fromUserId: userId,
        toUserId: targetId,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      localReqs.push(newReq);
      saveLocalRequests(localReqs);

      // Create notification
      const localNotifs = loadLocalNotifications();
      const notifId = `mock_notif_${Date.now()}`;
      const newNotif = {
        id: notifId,
        recipientId: targetId,
        senderId: userId,
        type: 'friend_request',
        message: `${me?.name || 'A user'} sent you a partner request!`,
        read: false,
        createdAt: new Date().toISOString()
      };
      localNotifs.push(newNotif);
      saveLocalNotifications(localNotifs);

      // Emit notification via Socket.io
      const populatedNotif = {
        ...newNotif,
        senderId: me ? { id: me.id || me._id, name: me.name, avatar: me.avatar } : null
      };
      io.to(targetId).emit('notification', populatedNotif);

      return res.status(201).json({ pending: true, message: 'Request sent successfully!' });
    }

    const me = await User.findById(userId);
    if (me?.inviteCode?.toUpperCase() === code.toUpperCase()) return res.status(400).json({ error: "You cannot add yourself!" });
    const targetUser = await User.findOne({ inviteCode: code.toUpperCase() });
    if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code.' });
    const alreadyConnected = await FriendConnection.findOne({ $or: [{ userId, friendUserId: targetUser._id }, { userId: targetUser._id, friendUserId: userId }] });
    if (alreadyConnected) return res.status(400).json({ error: `You are already partners with ${targetUser.name}!` });
    const existingReq = await FriendRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: targetUser._id, status: 'pending' },
        { fromUserId: targetUser._id, toUserId: userId, status: 'pending' }
      ]
    });
    if (existingReq) return res.status(400).json({ error: 'Friend request already sent.' });
    const friendReq = new FriendRequest({ fromUserId: userId, toUserId: targetUser._id, status: 'pending', createdAt: new Date().toISOString() });
    await friendReq.save();
    const notif = await Notification.create({ recipientId: targetUser._id, senderId: userId, type: 'friend_request', message: `${me?.name} sent you a partner request!`, createdAt: new Date().toISOString() });
    const populatedNotif = await Notification.findById(notif._id).populate('senderId', 'name avatar');
    io.to(String(targetUser._id)).emit('notification', populatedNotif);
    res.status(201).json({ pending: true, message: 'Request sent successfully!' });
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ error: 'Request already sent.' });
    console.error(error); res.status(500).json({ error: 'Server error' });
  }
});

router.get('/partners/requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localReqs = loadLocalRequests();
      const localUsers = loadLocalUsers();
      const mine = localReqs.filter(r => r.toUserId === userId && r.status === 'pending');
      const populated = mine.map(r => {
        const sender = localUsers.find(u => u.id === r.fromUserId || u._id === r.fromUserId);
        return {
          ...r,
          fromUserId: sender ? { id: sender.id || sender._id, name: sender.name, avatar: sender.avatar, inviteCode: sender.inviteCode, level: sender.level || 1, xp: sender.xp || 0, streak: sender.streak || 0, growSyncId: sender.growSyncId } : null
        };
      });
      return res.json(populated);
    }
    const requests = await FriendRequest.find({ toUserId: userId, status: 'pending' }).populate('fromUserId', 'name avatar inviteCode level xp streak growSyncId');
    res.json(requests);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/partners/sent-requests', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localReqs = loadLocalRequests();
      const localUsers = loadLocalUsers();
      const mine = localReqs.filter(r => r.fromUserId === userId && r.status === 'pending');
      const populated = mine.map(r => {
        const receiver = localUsers.find(u => u.id === r.toUserId || u._id === r.toUserId);
        return {
          ...r,
          toUserId: receiver ? { id: receiver.id || receiver._id, name: receiver.name, avatar: receiver.avatar, inviteCode: receiver.inviteCode, level: receiver.level || 1, xp: receiver.xp || 0, streak: receiver.streak || 0, growSyncId: receiver.growSyncId } : null
        };
      });
      return res.json(populated);
    }
    const requests = await FriendRequest.find({ fromUserId: userId, status: 'pending' }).populate('toUserId', 'name avatar inviteCode level xp streak growSyncId');
    res.json(requests);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/partners/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.body;
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localReqs = loadLocalRequests();
      const localConns = loadLocalConnections();
      const localUsers = loadLocalUsers();

      const friendReq = localReqs.find(r => r.id === requestId && r.toUserId === userId && r.status === 'pending');
      if (!friendReq) return res.status(404).json({ error: 'Request not found or already processed.' });

      friendReq.status = 'accepted';
      saveLocalRequests(localReqs);

      // Create both sides of local connections
      const connId1 = `mock_conn_${Date.now()}_1`;
      const connId2 = `mock_conn_${Date.now()}_2`;
      localConns.push({
        id: connId1,
        userId: friendReq.fromUserId,
        friendUserId: friendReq.toUserId,
        friendInviteCode: 'ACCEPTED',
        connectedAt: new Date().toISOString()
      });
      localConns.push({
        id: connId2,
        userId: friendReq.toUserId,
        friendUserId: friendReq.fromUserId,
        friendInviteCode: 'ACCEPTED',
        connectedAt: new Date().toISOString()
      });
      saveLocalConnections(localConns);

      const friendUser = localUsers.find(u => u.id === friendReq.fromUserId || u._id === friendReq.fromUserId);
      if (!friendUser) return res.status(404).json({ error: 'Friend user not found.' });

      const payload = buildLocalPartnerPayload(friendUser, connId2);

      // Realtime notification/event to requester
      const myUser = localUsers.find(u => u.id === userId || u._id === userId);
      if (myUser) {
        const acceptorPayload = buildLocalPartnerPayload(myUser, connId1);
        io.to(friendReq.fromUserId).emit('friend_accepted', acceptorPayload);
      }

      // Add notification for the requester
      const localNotifs = loadLocalNotifications();
      const notifId = `mock_notif_${Date.now()}`;
      localNotifs.push({
        id: notifId,
        recipientId: friendReq.fromUserId,
        senderId: userId,
        type: 'friend_accepted',
        message: `${myUser?.name || 'A user'} accepted your friend request! You're now growth partners.`,
        read: false,
        createdAt: new Date().toISOString()
      });
      saveLocalNotifications(localNotifs);

      return res.json(payload);
    }

    const friendReq = await FriendRequest.findOne({ _id: requestId, toUserId: userId, status: 'pending' });
    if (!friendReq) return res.status(404).json({ error: 'Request not found or already processed.' });
    friendReq.status = 'accepted';
    await friendReq.save();

    // Create both sides of the friendship
    await FriendConnection.create({ userId: friendReq.fromUserId, friendUserId: friendReq.toUserId, friendInviteCode: 'ACCEPTED', connectedAt: new Date().toISOString() });
    const myConn = await FriendConnection.create({ userId: friendReq.toUserId, friendUserId: friendReq.fromUserId, friendInviteCode: 'ACCEPTED', connectedAt: new Date().toISOString() });

    // Build the partner payload for the acceptor
    const friendUser = await User.findById(friendReq.fromUserId);
    if (!friendUser) return res.status(404).json({ error: 'Friend user not found.' });
    const payload = await buildPartnerPayload(friendUser, String(myConn._id));

    // Notify the requester (User A) in real-time that their request was accepted
    const myUser = await User.findById(userId);
    const requesterConn = await FriendConnection.findOne({ userId: friendReq.fromUserId, friendUserId: userId });
    if (requesterConn) {
      const acceptorPayload = await buildPartnerPayload(myUser!, String(requesterConn._id));
      io.to(String(friendReq.fromUserId)).emit('friend_accepted', acceptorPayload);
    }

    // Notify the requester via Notification too
    await Notification.create({
      recipientId: friendReq.fromUserId,
      senderId: userId,
      type: 'friend_accepted',
      message: `${myUser?.name} accepted your friend request! You're now growth partners.`,
      createdAt: new Date().toISOString()
    });

    res.json(payload);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error' }); }
});

router.post('/partners/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.body;
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localReqs = loadLocalRequests();
      const friendReq = localReqs.find(r => r.id === requestId && r.toUserId === userId && r.status === 'pending');
      if (friendReq) {
        friendReq.status = 'rejected';
        saveLocalRequests(localReqs);
      }
      return res.json({ success: true });
    }

    await FriendRequest.findOneAndUpdate({ _id: requestId, toUserId: userId }, { status: 'rejected' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/partners/activity', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const userId = (req as any).userId;
    const connections = await FriendConnection.find({ userId });
    const friendIds = connections.map(c => c.friendUserId);
    const activities = await ActivityFeed.find({ userId: { $in: friendIds } }).sort({ createdAt: -1 }).limit(20).populate('userId', 'name avatar');
    res.json(activities);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* ══════════════════════════════════════════
   CHAT ENDPOINTS
   ══════════════════════════════════════════ */

/** GET /chat/conversations — list current user's conversations */
/** GET /chat/conversations — list current user's conversations */
router.get('/chat/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localConvs = loadLocalConversations();
      const localUsers = loadLocalUsers();
      const mine = localConvs.filter(c => c.participants.includes(userId));
      const populated = mine.map(c => {
        const participants = c.participants.map((pid: string) => {
          const u = localUsers.find(x => x.id === pid || x._id === pid);
          return u ? { id: u.id || u._id, name: u.name, avatar: u.avatar, level: u.level || 1, inviteCode: u.inviteCode, growSyncId: u.growSyncId } : null;
        }).filter(Boolean);
        return { ...c, participants };
      });
      return res.json(populated);
    }
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name avatar level inviteCode growSyncId');
    res.json(conversations);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/** POST /chat/conversations — start or get existing conversation with a friend */
router.post('/chat/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const { friendUserId } = req.body;
    if (!friendUserId) return res.status(400).json({ error: 'friendUserId is required' });
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localConvs = loadLocalConversations();
      const localUsers = loadLocalUsers();
      
      let conv = localConvs.find(c => c.participants.includes(userId) && c.participants.includes(friendUserId));
      if (!conv) {
        conv = {
          id: `conv_${Date.now()}`,
          _id: `conv_${Date.now()}`,
          participants: [userId, friendUserId],
          lastMessageAt: new Date().toISOString(),
          unreadCounts: {}
        };
        localConvs.push(conv);
        saveLocalConversations(localConvs);
      }
      
      const participants = conv.participants.map((pid: string) => {
        const u = localUsers.find(x => x.id === pid || x._id === pid);
        return u ? { id: u.id || u._id, name: u.name, avatar: u.avatar, level: u.level || 1, inviteCode: u.inviteCode, growSyncId: u.growSyncId } : null;
      }).filter(Boolean);
      return res.json({ ...conv, participants });
    }

    const isFriend = await FriendConnection.findOne({ userId, friendUserId });
    if (!isFriend) return res.status(403).json({ error: 'You can only chat with accepted friends.' });

    let conv = await Conversation.findOne({
      participants: { $all: [userId, friendUserId], $size: 2 }
    }).populate('participants', 'name avatar level inviteCode growSyncId');

    if (!conv) {
      conv = await Conversation.create({ participants: [userId, friendUserId], unreadCounts: {} });
      conv = await conv.populate('participants', 'name avatar level inviteCode growSyncId');
    }

    res.json(conv);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/** GET /chat/conversations/:id/messages — paginated messages */
router.get('/chat/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (mongoose.connection.readyState !== 1) {
      const localConvs = loadLocalConversations();
      const conv = localConvs.find(c => (c.id === req.params.id || c._id === req.params.id) && c.participants.includes(userId));
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      
      const localMessages = loadLocalMessages();
      const localUsers = loadLocalUsers();
      const limit = parseInt(req.query.limit as string) || 50;
      
      const mine = localMessages.filter(m => String(m.conversationId) === String(conv.id) && !m.deletedAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
      
      const populated = mine.map(m => {
        const sender = localUsers.find(u => u.id === m.senderId || u._id === m.senderId);
        return { ...m, senderId: sender ? { id: sender.id || sender._id, name: sender.name, avatar: sender.avatar } : null };
      });
      return res.json(populated.reverse());
    }

    const conv = await Conversation.findOne({ _id: req.params.id, participants: userId });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const query: any = {
      conversationId: conv._id,
      deletedAt: { $exists: false }
    };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name avatar');

    res.json(messages.reverse());
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/** POST /chat/conversations/:id/messages — send a message */
router.post('/chat/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { text, replyTo } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required' });

    if (mongoose.connection.readyState !== 1) {
      const localConvs = loadLocalConversations();
      const conv = localConvs.find(c => (c.id === req.params.id || c._id === req.params.id) && c.participants.includes(userId));
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      const localMessages = loadLocalMessages();
      const localUsers = loadLocalUsers();
      
      const msgId = `msg_${Date.now()}`;
      const newMsg = {
        id: msgId,
        _id: msgId,
        conversationId: conv.id,
        senderId: userId,
        text: text.trim(),
        seenBy: [userId],
        createdAt: new Date().toISOString(),
        replyTo
      };
      localMessages.push(newMsg);
      saveLocalMessages(localMessages);

      conv.lastMessageAt = new Date().toISOString();
      saveLocalConversations(localConvs);

      const me = localUsers.find(u => u.id === userId || u._id === userId);
      const populatedMsg = {
        ...newMsg,
        senderId: me ? { id: me.id || me._id, name: me.name, avatar: me.avatar } : null
      };

      io.to(`conv_${conv.id}`).emit('new_message', populatedMsg);
      return res.status(201).json(populatedMsg);
    }

    const conv = await Conversation.findOne({ _id: req.params.id, participants: userId });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const msg = await Message.create({
      conversationId: conv._id,
      senderId: userId,
      text: text.trim(),
      seenBy: [userId],
      ...(replyTo && { replyTo }),
    });

    await conv.populate('participants', 'name avatar level');
    const populatedMsg = await msg.populate('senderId', 'name avatar');

    const otherParticipant = conv.participants.find(p => String(p) !== String(userId));
    if (otherParticipant) {
      const otherId = String(otherParticipant);
      const currentUnread = conv.unreadCounts.get(otherId) || 0;
      conv.unreadCounts.set(otherId, currentUnread + 1);
    }
    conv.lastMessageAt = new Date();
    await conv.save();

    io.to(`conv_${conv._id}`).emit('new_message', populatedMsg);

    res.status(201).json(populatedMsg);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/** PUT /chat/messages/:id — edit own message */
router.put('/chat/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Message text is required' });

    if (mongoose.connection.readyState !== 1) {
      const localMessages = loadLocalMessages();
      const localUsers = loadLocalUsers();
      const msg = localMessages.find(m => (m.id === req.params.id || m._id === req.params.id) && String(m.senderId) === String(userId));
      if (!msg) return res.status(404).json({ error: 'Message not found or not yours' });
      msg.text = text.trim();
      msg.editedAt = new Date().toISOString();
      saveLocalMessages(localMessages);

      const me = localUsers.find(u => u.id === userId || u._id === userId);
      const populatedMsg = {
        ...msg,
        senderId: me ? { id: me.id || me._id, name: me.name, avatar: me.avatar } : null
      };
      io.to(`conv_${msg.conversationId}`).emit('message_edited', populatedMsg);
      return res.json(populatedMsg);
    }

    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, senderId: userId, deletedAt: { $exists: false } },
      { text: text.trim(), editedAt: new Date() },
      { new: true }
    ).populate('senderId', 'name avatar');
    if (!msg) return res.status(404).json({ error: 'Message not found or not yours' });
    io.to(`conv_${msg.conversationId}`).emit('message_edited', msg);
    res.json(msg);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/** DELETE /chat/messages/:id — soft-delete own message */
router.delete('/chat/messages/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localMessages = loadLocalMessages();
      const msg = localMessages.find(m => (m.id === req.params.id || m._id === req.params.id) && String(m.senderId) === String(userId));
      if (!msg) return res.status(404).json({ error: 'Message not found or not yours' });
      msg.deletedAt = new Date().toISOString();
      saveLocalMessages(localMessages);
      io.to(`conv_${msg.conversationId}`).emit('message_deleted', { id: msg.id || msg._id, conversationId: msg.conversationId });
      return res.json({ success: true });
    }

    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, senderId: userId },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: 'Message not found or not yours' });
    io.to(`conv_${msg.conversationId}`).emit('message_deleted', { id: msg._id, conversationId: msg.conversationId });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/** PUT /chat/conversations/:id/seen — mark all messages as seen */
router.put('/chat/conversations/:id/seen', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (mongoose.connection.readyState !== 1) {
      const localConvs = loadLocalConversations();
      const conv = localConvs.find(c => (c.id === req.params.id || c._id === req.params.id) && c.participants.includes(userId));
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      
      const localMessages = loadLocalMessages();
      localMessages.forEach(m => {
        if (String(m.conversationId) === String(conv.id) && !m.seenBy.includes(userId)) {
          m.seenBy.push(userId);
        }
      });
      saveLocalMessages(localMessages);

      if (conv.unreadCounts) {
        conv.unreadCounts[userId] = 0;
        saveLocalConversations(localConvs);
      }
      io.to(`conv_${conv.id}`).emit('messages_seen', { conversationId: conv.id, userId });
      return res.json({ success: true });
    }

    const conv = await Conversation.findOne({ _id: req.params.id, participants: userId });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    await Message.updateMany(
      { conversationId: conv._id, seenBy: { $ne: userId } },
      { $addToSet: { seenBy: userId } }
    );
    conv.unreadCounts.set(String(userId), 0);
    await conv.save();
    io.to(`conv_${conv._id}`).emit('messages_seen', { conversationId: conv._id, userId });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
