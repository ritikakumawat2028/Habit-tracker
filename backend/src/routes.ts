import { Router, Request, Response, NextFunction } from 'express';
import { User, Task, Note, Habit, Partner } from './models';

const router = Router();

// Middleware to extract userId from headers
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const userId = authHeader.split(' ')[1];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
  (req as any).userId = userId;
  next();
};

const generateCode = (name: string) => (name ? name.substring(0, 4).toUpperCase() : 'USER') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

/* ══════════════════════════════════════════
   AUTH / PROFILE ENDPOINTS
   ══════════════════════════════════════════ */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user = await User.findOne({ email });
    if (user) {
      return res.json(user);
    }

    // Create new user
    user = new User({
      name: name || 'New User',
      email,
      joinDate: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      inviteCode: generateCode(name),
    });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate((req as any).userId, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════
   TASKS ENDPOINTS
   ══════════════════════════════════════════ */
router.get('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const tasks = await Task.find({ userId: (req as any).userId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, note, category, priority, dueDate, dueTime, estimatedDuration, reminder, tags, recurring } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const newTask = new Task({
      userId: (req as any).userId,
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
      recurring
    });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: (req as any).userId },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════
   NOTES ENDPOINTS
   ══════════════════════════════════════════ */
router.get('/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const notes = await Note.find({ userId: (req as any).userId });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/notes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, body, color, pinned } = req.body;
    if (!title && !body) return res.status(400).json({ error: 'Title or body is required' });

    const newNote = new Note({
      userId: (req as any).userId,
      title: title || '',
      body: body || '',
      color: color || 'violet',
      pinned: pinned || false,
      createdAt: new Date().toISOString().split('T')[0],
    });
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: (req as any).userId },
      req.body,
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/notes/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════
   HABITS ENDPOINTS
   ══════════════════════════════════════════ */
router.get('/habits', requireAuth, async (req: Request, res: Response) => {
  try {
    const habits = await Habit.find({ userId: (req as any).userId });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/habits', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, category, icon, priority, freq, target } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const newHabit = new Habit({
      userId: (req as any).userId,
      name,
      category: category || 'Fitness',
      icon: icon || '🏃',
      priority: priority || 'medium',
      freq: freq || 'Daily',
      streak: 0,
      target: target || '1 time',
      completedToday: false,
    });
    await newHabit.save();
    res.status(201).json(newHabit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/habits/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: (req as any).userId },
      req.body,
      { new: true }
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/habits/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ══════════════════════════════════════════
   PARTNERS ENDPOINTS
   ══════════════════════════════════════════ */
router.get('/partners', requireAuth, async (req: Request, res: Response) => {
  try {
    const partners = await Partner.find({ userId: (req as any).userId });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/partners/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Invite code is required' });

    const userId = (req as any).userId;
    const user = await User.findById(userId);
    if (user?.inviteCode.toUpperCase() === code.toUpperCase()) {
      return res.status(400).json({ error: "You cannot add yourself as a partner!" });
    }

    const existing = await Partner.findOne({ userId, inviteCode: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: 'Already growth partners!' });
    }

    const targetUser = await User.findOne({ inviteCode: code.toUpperCase() });
    const name = targetUser ? targetUser.name : (code.split('-')[0] || 'Partner');

    const newPartner = new Partner({
      userId,
      name,
      avatar: targetUser?.avatar || null,
      level: targetUser?.level || 5,
      streak: targetUser?.streak || 3,
      xp: targetUser?.xp || 100,
      status: 'online',
      inviteCode: code.toUpperCase(),
      habits: [],
      tasks: [],
      weekProgress: Array.from({ length: 7 }, () => Math.floor(Math.random() * 40) + 60)
    });
    
    await newPartner.save();
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/partners/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const partner = await Partner.findOneAndDelete({ _id: req.params.id, userId: (req as any).userId });
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
