import { Router, Request, Response, NextFunction } from 'express';
import { User, Task, Note, Habit, GrowthPlan, FriendConnection, FriendRequest, ActivityFeed, Notification, FocusSession, HealthLog, JournalEntry } from './models';
import mongoose from 'mongoose';
import { io } from './server';
import fs from 'fs';
import path from 'path';

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

function generateUniqueInviteCode(existingUsers: any[]): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;
  
  while (!isUnique) {
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = 'USER' + randomPart;
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
  const totalHabits = habits.length;
  const doneHabits = habits.filter(h => h.completedToday).length;
  const habitCompletion = totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const taskCompletion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const weekProgress = Array.from({ length: 7 }, (_, i) =>
    Math.max(0, Math.min(100, (friendUser.streak || 0) * 3 + (i % 3 === 0 ? 10 : -5)))
  );
  return {
    id: connectionId, friendUserId: String(fid), name: friendUser.name, avatar: friendUser.avatar || null,
    level: friendUser.level || 1, xp: friendUser.xp || 0, streak: friendUser.streak || 0,
    longestStreak: friendUser.longestStreak || friendUser.streak || 0, status: 'online' as const,
    inviteCode: friendUser.inviteCode,
    habits: habits.map(h => ({ name: h.name, icon: h.icon, done: h.completedToday, streak: h.streak, consistencyScore: h.consistencyScore || 100 })),
    tasks: tasks.slice(0, 10).map(t => ({ title: t.title, done: t.done, priority: t.priority, difficulty: t.difficulty || 'Medium' })),
    weekProgress, healthScore: friendUser.healthScore || 50, careerScore: friendUser.careerScore || 50,
    productivityScore: friendUser.productivityScore || 50, focusHours: friendUser.focusHours || 0,
    studyHours: friendUser.studyHours || 0, codingHours: friendUser.codingHours || 0,
    waterIntake: friendUser.waterIntake || 0, sleepHours: friendUser.sleepHours || 7,
    exercise: friendUser.exercise || 0, currentChallenge: friendUser.currentChallenge || 'None',
    currentRank: friendUser.currentRank || 'Bronze I', mood: friendUser.mood || 'okay',
    habitCompletion, taskCompletion, completedTasks: doneTasks, pendingTasks: totalTasks - doneTasks,
    weeklyGoalsDone: Math.min(doneTasks, 5), weeklyGoalsTotal: 5,
    monthlyGoalsDone: Math.min(doneTasks, 10), monthlyGoalsTotal: 10,
  };
}

/* AUTH ENDPOINTS */
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

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
    const user = new User({ name: name || 'New User', email, joinDate: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }) });
    await user.save();
    res.status(201).json(user);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error during registration' }); }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const user = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'No account found with this email. Please sign up first.' });
      }
      return res.json(user);
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'No account found with this email. Please sign up first.' });
    res.json(user);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error during login' }); }
});

router.get('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const userId = (req as any).userId;
      const user = localUsers.find(u => u.id === userId || u._id === userId);
      if (user) {
        return res.json(user);
      }
      return res.status(404).json({ error: 'User not found' });
    }
    const user = await User.findById((req as any).userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const localUsers = loadLocalUsers();
      const userId = (req as any).userId;
      const index = localUsers.findIndex(u => u.id === userId || u._id === userId);
      if (index !== -1) {
        localUsers[index] = { ...localUsers[index], ...req.body };
        saveLocalUsers(localUsers);
        return res.json(localUsers[index]);
      }
      return res.json(req.body);
    }
    const user = await User.findByIdAndUpdate((req as any).userId, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* GROWTH PLANS */
router.get('/plans', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await GrowthPlan.find({ userId: (req as any).userId })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/plans', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, category, description, targetDate, progress, active } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (active) await GrowthPlan.updateMany({ userId: (req as any).userId }, { active: false });
    const newPlan = new GrowthPlan({ userId: (req as any).userId, title, category: category || 'Career', description: description || '', targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0], progress: progress || 0, active: active !== undefined ? active : true, createdAt: new Date().toISOString().split('T')[0] });
    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.body.active) await GrowthPlan.updateMany({ userId: (req as any).userId }, { active: false });
    const plan = await GrowthPlan.findOneAndUpdate({ _id: req.params.id, userId: (req as any).userId }, req.body, { new: true });
    if (!plan) return res.status(404).json({ error: 'Growth plan not found' });
    res.json(plan);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/plans/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const plan = await GrowthPlan.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!plan) return res.status(404).json({ error: 'Growth plan not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* USER SEARCH */
router.get('/users/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'code query param is required' });
    const me = await User.findById((req as any).userId);
    if (me?.inviteCode === code) return res.status(400).json({ error: "That's your own invite code!" });
    const targetUser = await User.findOne({ inviteCode: code });
    if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code' });
    res.json({ id: targetUser._id, name: targetUser.name, avatar: targetUser.avatar, level: targetUser.level, streak: targetUser.streak, inviteCode: targetUser.inviteCode });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* TASKS */
router.get('/tasks', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await Task.find({ userId: (req as any).userId })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, note, category, priority, dueDate, dueTime, estimatedDuration, reminder, tags, recurring, difficulty, subtasks, dependencies, planId } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const newTask = new Task({ userId: (req as any).userId, title, note: note || '', category: category || 'Personal', priority: priority || 'medium', done: false, dueDate: dueDate || new Date().toISOString().split('T')[0], createdAt: new Date().toISOString().split('T')[0], dueTime, estimatedDuration, reminder, tags, recurring, difficulty: difficulty || 'Medium', subtasks: subtasks || [], dependencies: dependencies || [], planId });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const task = await Task.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
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
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
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
  try { res.json(await Habit.find({ userId: (req as any).userId })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/habits', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, category, icon, priority, freq, target, history, paused, archived, notes, planId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newHabit = new Habit({ userId: (req as any).userId, name, category: category || 'Fitness', icon: icon || '🏃', priority: priority || 'medium', freq: freq || 'Daily', streak: 0, longestStreak: 0, target: target || '1 time', completedToday: false, consistencyScore: 0, history: history || [], paused: paused || false, archived: archived || false, notes: notes || '', planId });
    await newHabit.save();
    res.status(201).json(newHabit);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/habits/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const habit = await Habit.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
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
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* FOCUS SESSIONS */
router.get('/focus-sessions', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await FocusSession.find({ userId: (req as any).userId }).sort({ date: -1 })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/focus-sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { duration, category, date, notes } = req.body;
    if (!duration || duration < 1) return res.status(400).json({ error: 'Duration (minutes) is required and must be >= 1' });
    const session = new FocusSession({ userId: (req as any).userId, duration: Number(duration), category: category || 'General', date: date || new Date().toISOString().split('T')[0], notes: notes || '' });
    await session.save();
    const allSessions = await FocusSession.find({ userId: (req as any).userId });
    const totalMins = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    await User.findByIdAndUpdate((req as any).userId, { focusHours: Math.round(totalMins / 60 * 10) / 10 });
    res.status(201).json(session);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/focus-sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = await FocusSession.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* HEALTH LOGS */
router.get('/health-logs', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await HealthLog.find({ userId: (req as any).userId }).sort({ date: -1 })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/health-logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { waterMl, sleepHours, workoutMins, mood, notes, date } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];
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
    res.json(log);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* JOURNALS */
router.get('/journals', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await JournalEntry.find({ userId: (req as any).userId }).sort({ date: -1 })); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/journals', requireAuth, async (req: Request, res: Response) => {
  try {
    const { date, mood, wins, challenges, gratitude, lessons, folder, pinned, tags, planId } = req.body;
    const entry = new JournalEntry({ userId: (req as any).userId, date: date || new Date().toISOString().split('T')[0], mood: mood || 'okay', wins: wins || '', challenges: challenges || '', gratitude: gratitude || '', lessons: lessons || '', folder: folder || 'General', pinned: pinned || false, tags: tags || [], planId });
    await entry.save();
    res.status(201).json(entry);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/journals/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const entry = await JournalEntry.findOneAndUpdate({ _id: req.params.id, userId: (req as any).userId }, req.body, { new: true });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json(entry);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.delete('/journals/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const entry = await JournalEntry.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* NOTIFICATIONS */
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ recipientId: (req as any).userId }).sort({ createdAt: -1 }).limit(50).populate('senderId', 'name avatar');
    res.json(notifications);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  try { await Notification.updateMany({ recipientId: (req as any).userId, read: false }, { read: true }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ error: 'Server error' }); }
});
router.put('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const note = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: (req as any).userId }, { read: true }, { new: true });
    if (!note) return res.status(404).json({ error: 'Notification not found' });
    res.json(note);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

/* FRIENDS / PARTNERS (with in-memory fallback if MongoDB is offline) */
const mockConnections: any[] = [];

router.get('/partners', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const userId = (req as any).userId;
      const userConns = mockConnections.filter(c => c.userId === userId);
      return res.json(userConns);
    }
    const userId = (req as any).userId;
    const connections = await FriendConnection.find({ userId });
    const partners = await Promise.all(connections.map(async (conn) => {
      const friendUser = await User.findById(conn.friendUserId);
      if (!friendUser) return null;
      return buildPartnerPayload(friendUser, String(conn._id));
    }));
    res.json(partners.filter(Boolean));
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error' }); }
});

router.post('/partners/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Invite code is required' });
    const userId = (req as any).userId;

    // Handle offline fallback connection
    if (mongoose.connection.readyState !== 1) {
      const cleanCode = code.trim().toUpperCase();
      
      const localUsers = loadLocalUsers();
      const friendUser = localUsers.find(u => u.inviteCode === cleanCode);
      if (!friendUser) {
        return res.status(404).json({ error: 'No user found with that invite code. Please check and try again.' });
      }

      const me = localUsers.find(u => u.id === userId || u._id === userId);
      if (me && me.inviteCode === cleanCode) {
        return res.status(400).json({ error: 'You cannot add yourself as a growth partner!' });
      }

      if (mockConnections.some(c => c.inviteCode === cleanCode && c.userId === userId)) {
        return res.status(400).json({ error: 'Already connected with this user!' });
      }

      const connectionId = `mock_conn_${Date.now()}`;
      
      const payload = {
        id: connectionId,
        userId: userId,
        friendUserId: friendUser.id || String(friendUser._id),
        name: friendUser.name,
        avatar: friendUser.avatar || null,
        level: friendUser.level || 1,
        xp: friendUser.xp || 0,
        streak: friendUser.streak || 0,
        longestStreak: friendUser.longestStreak || friendUser.streak || 0,
        status: 'online' as const,
        inviteCode: friendUser.inviteCode,
        habits: [
          { name: "Code & Build Projects 1h", icon: "💻", done: true, streak: 5, consistencyScore: 90 },
          { name: "Daily Gym / Exercise", icon: "🏋️", done: false, streak: 3, consistencyScore: 80 }
        ],
        tasks: [
          { title: "Review System Design notes", done: true, priority: "high", difficulty: "Hard" },
          { title: "Practice Leetcode Trees", done: false, priority: "medium", difficulty: "Medium" }
        ],
        weekProgress: [65, 70, 80, 55, 90, 85, 95],
        healthScore: friendUser.healthScore || 50,
        careerScore: friendUser.careerScore || 50,
        productivityScore: friendUser.productivityScore || 50,
        focusHours: friendUser.focusHours || 0,
        sleepHours: friendUser.sleepHours || 7,
        mood: "great",
        habitCompletion: 50,
        taskCompletion: 50,
        completedTasks: 1,
        pendingTasks: 1
      };
      mockConnections.push(payload);
      return res.status(201).json(payload);
    }

    const me = await User.findById(userId);
    if (me?.inviteCode?.toUpperCase() === code.toUpperCase()) return res.status(400).json({ error: "You cannot add yourself as a growth partner!" });
    const targetUser = await User.findOne({ inviteCode: code.toUpperCase() });
    if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code. Please check and try again.' });
    const alreadyConnected = await FriendConnection.findOne({ userId, friendUserId: targetUser._id });
    if (alreadyConnected) return res.status(400).json({ error: `You are already growth partners with ${targetUser.name}!` });
    const conn = new FriendConnection({ userId, friendUserId: targetUser._id, friendInviteCode: code.toUpperCase(), connectedAt: new Date().toISOString() });
    await conn.save();
    const payload = await buildPartnerPayload(targetUser, String(conn._id));
    res.status(201).json(payload);
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ error: 'Already connected with this user!' });
    console.error(error); res.status(500).json({ error: 'Server error' });
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
    if (mongoose.connection.readyState !== 1) {
      return res.status(201).json({ success: true, message: 'Request sent successfully!' });
    }
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Invite code is required' });
    const userId = (req as any).userId;
    const me = await User.findById(userId);
    if (me?.inviteCode?.toUpperCase() === code.toUpperCase()) return res.status(400).json({ error: "You cannot add yourself!" });
    const targetUser = await User.findOne({ inviteCode: code.toUpperCase() });
    if (!targetUser) return res.status(404).json({ error: 'No user found with that invite code.' });
    const alreadyConnected = await FriendConnection.findOne({ $or: [{ userId, friendUserId: targetUser._id }, { userId: targetUser._id, friendUserId: userId }] });
    if (alreadyConnected) return res.status(400).json({ error: `You are already partners with ${targetUser.name}!` });
    const existingReq = await FriendRequest.findOne({ fromUserId: userId, toUserId: targetUser._id });
    if (existingReq) return res.status(400).json({ error: 'Friend request already sent.' });
    const friendReq = new FriendRequest({ fromUserId: userId, toUserId: targetUser._id, status: 'pending', createdAt: new Date().toISOString() });
    await friendReq.save();
    await Notification.create({ recipientId: targetUser._id, senderId: userId, type: 'friend_request', message: `${me?.name} sent you a partner request!`, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, message: 'Request sent successfully!' });
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ error: 'Request already sent.' });
    console.error(error); res.status(500).json({ error: 'Server error' });
  }
});

router.get('/partners/requests', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const userId = (req as any).userId;
    const requests = await FriendRequest.find({ toUserId: userId, status: 'pending' }).populate('fromUserId', 'name avatar inviteCode');
    res.json(requests);
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/partners/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({});
    const { requestId } = req.body;
    const userId = (req as any).userId;
    const friendReq = await FriendRequest.findOne({ _id: requestId, toUserId: userId, status: 'pending' });
    if (!friendReq) return res.status(404).json({ error: 'Request not found or already processed.' });
    friendReq.status = 'accepted';
    await friendReq.save();
    await FriendConnection.create({ userId: friendReq.fromUserId, friendUserId: friendReq.toUserId, friendInviteCode: 'ACCEPTED', connectedAt: new Date().toISOString() });
    const myConn = await FriendConnection.create({ userId: friendReq.toUserId, friendUserId: friendReq.fromUserId, friendInviteCode: 'ACCEPTED', connectedAt: new Date().toISOString() });
    const friendUser = await User.findById(friendReq.fromUserId);
    const payload = await buildPartnerPayload(friendUser, String(myConn._id));
    res.json(payload);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Server error' }); }
});

router.post('/partners/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ success: true });
    const { requestId } = req.body;
    const userId = (req as any).userId;
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

export default router;
