import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line
} from "recharts";
import {
  Zap, Flame, Star, Users, BarChart2, Heart, BookOpen, Code2,
  Dumbbell, Droplets, Moon, Brain, Smile, CheckCircle2, Circle,
  Plus, ChevronRight, TrendingUp, Sparkles, Activity, Bell,
  Search, Settings, Home, Calendar, X, Eye, EyeOff, ArrowRight,
  UserPlus, Check, Pencil, Trash2, ChevronLeft, MoreHorizontal,
  Target, Clock, HelpCircle, Sun, StickyNote, ListTodo,
  LogOut, Camera, Save, Link2, Copy, Shield, Trophy, Send,
  User, Edit3, AlertCircle, RefreshCw, Minus
} from "lucide-react";

/* ══════════════════════════════════════════
   API LAYER (connects to Express backend)
   Falls back to localStorage if offline
══════════════════════════════════════════ */
const API_URL = "http://localhost:5000/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    // Add auth token if available
    const u = localStorage.getItem("gs_user");
    if (u) {
      try {
        const user = JSON.parse(u);
        if (user && user.id) {
          headers["Authorization"] = `Bearer ${user.id}`;
        }
      } catch (e) {}
    }

    const res = await fetch(`${API_URL}${path}`, {
      headers: { ...headers, ...options?.headers },
      ...options,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // backend offline – caller falls back to localStorage
  }
}

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
type View = "landing" | "login" | "onboarding" | "dashboard" | "habits" | "health" | "career" | "friends" | "analytics" | "challenges" | "profile" | "tasks" | "focus" | "goals" | "learning" | "journal" | "timetracker" | "achievements";

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string;
  level: number;
  xp: number;
  coins?: number; // GrowCoins gamification currency
  streak: number;
  joinDate: string;
  goals: string[];
  inviteCode: string;
}

interface Task {
  id: string;
  title: string;
  note: string;
  category: string;
  priority: "high" | "medium" | "low";
  done: boolean;
  dueDate: string;
  createdAt: string;
  dueTime?: string;
  estimatedDuration?: string;
  reminder?: boolean;
  tags?: string;
  recurring?: "none" | "daily" | "weekly" | "monthly";
}

interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  createdAt: string;
}

interface Habit {
  id: number;
  name: string;
  category: string;
  icon: string;
  priority: "high" | "medium" | "low";
  freq: string;
  streak: number;
  target: string;
  completedToday: boolean;
}

interface GoalItem {
  id: string;
  title: string;
  timeframe: "year" | "quarter" | "month";
  progress: number;
  milestones: string[];
  dueDate: string;
}

interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  wins: string;
  challenges: string;
  gratitude: string;
  lessons: string;
}

interface FocusSession {
  id: string;
  date: string;
  duration: number; // minutes
  category: string;
}

interface DailyMission {
  id: string;
  title: string;
  rewardCoins: number;
  rewardXp: number;
  done: boolean;
}

interface RewardItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
  bought: boolean;
  category: string;
}

interface GrowthPartner {
  id: string;
  friendUserId?: string;
  name: string;
  avatar: string | null;
  level: number;
  streak: number;
  longestStreak?: number;
  xp: number;
  status: "online" | "offline";
  habits: { name: string; icon: string; done: boolean; streak: number }[];
  tasks: { title: string; done: boolean; priority: string }[];
  weekProgress: number[];
  inviteCode: string;
  // Real stats from partner's account
  healthScore?: number;
  careerScore?: number;
  productivityScore?: number;
  habitCompletion?: number;
  taskCompletion?: number;
  focusHours?: number;
  studyHours?: number;
  codingHours?: number;
  waterIntake?: number;
  sleepHours?: number;
  exercise?: number;
  currentChallenge?: string;
  currentRank?: string;
  mood?: string;
  completedTasks?: number;
  pendingTasks?: number;
  weeklyGoalsDone?: number;
  weeklyGoalsTotal?: number;
  monthlyGoalsDone?: number;
  monthlyGoalsTotal?: number;
}

/* ══════════════════════════════════════════
   CONTEXTS
══════════════════════════════════════════ */

// ── Theme ──
const ThemeCtx = createContext<{ dark: boolean; toggle: () => void }>({ dark: true, toggle: () => {} });
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("gs_theme");
    return saved !== null ? saved === "dark" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("gs_theme", dark ? "dark" : "light");
  }, [dark]);

  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeCtx.Provider>;
}
const useTheme = () => useContext(ThemeCtx);

// ── Auth ──

const AuthCtx = createContext<{
  user: UserData | null;
  login: (email: string, name?: string) => void | Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<UserData>) => void | Promise<void>;
  tasks: Task[];
  addTask: (t: Omit<Task, "id" | "createdAt">) => void | Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => void | Promise<void>;
  deleteTask: (id: string) => void | Promise<void>;
  notes: Note[];
  addNote: (n: Omit<Note, "id" | "createdAt">) => void | Promise<void>;
  updateNote: (id: string, patch: Partial<Note>) => void | Promise<void>;
  deleteNote: (id: string) => void | Promise<void>;
  habits: Habit[];
  addHabit: (h: Omit<Habit, "id" | "streak" | "completedToday">) => void | Promise<void>;
  updateHabit: (id: number, patch: Partial<Habit>) => void | Promise<void>;
  deleteHabit: (id: number) => void | Promise<void>;
  goalsList: GoalItem[];
  addGoal: (g: Omit<GoalItem, "id">) => void;
  updateGoal: (id: string, patch: Partial<GoalItem>) => void;
  deleteGoal: (id: string) => void;
  journals: JournalEntry[];
  addJournal: (j: Omit<JournalEntry, "id" | "date">) => void;
  focusSessions: FocusSession[];
  addFocusSession: (s: Omit<FocusSession, "id" | "date">) => void;
  missions: DailyMission[];
  toggleMission: (id: string) => void;
  rewards: RewardItem[];
  buyReward: (id: string) => boolean;
  coins: number;
  addCoins: (c: number) => void;
  partners: GrowthPartner[];
  addPartner: (code: string) => Promise<{ ok: boolean; error?: string; partner?: GrowthPartner }>;
  removePartner: (id: string) => void | Promise<void>;
}>({
  user: null, login: () => {}, logout: () => {}, updateUser: () => {},
  tasks: [], addTask: () => {}, updateTask: () => {}, deleteTask: () => {},
  notes: [], addNote: () => {}, updateNote: () => {}, deleteNote: () => {},
  habits: [], addHabit: () => {}, updateHabit: () => {}, deleteHabit: () => {},
  goalsList: [], addGoal: () => {}, updateGoal: () => {}, deleteGoal: () => {},
  journals: [], addJournal: () => {},
  focusSessions: [], addFocusSession: () => {},
  missions: [], toggleMission: () => {},
  rewards: [], buyReward: () => false,
  coins: 0, addCoins: () => {},
  partners: [], addPartner: async () => ({ ok: false }), removePartner: () => {},
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const DEFAULT_MISSIONS: DailyMission[] = [
    { id: "m1", title: "Complete 2 daily tasks", rewardCoins: 15, rewardXp: 40, done: false },
    { id: "m2", title: "Drink at least 4 glasses of water", rewardCoins: 10, rewardXp: 20, done: false },
    { id: "m3", title: "Do a 10 min mindfulness session", rewardCoins: 20, rewardXp: 50, done: false }
  ];
  const DEFAULT_REWARDS: RewardItem[] = [
    { id: "r1", name: "Premium Lavender Avatar Frame", cost: 100, icon: "🪻", bought: false, category: "Avatar" },
    { id: "r2", name: "Gold Warrior Badge Overlay", cost: 250, icon: "🥇", bought: false, category: "Avatar" },
    { id: "r3", name: "Duolingo Owl Companion Mascot", cost: 500, icon: "🦉", bought: false, category: "Mascot" },
    { id: "r4", name: "Deep Focus Ambient Rain Tracks", cost: 150, icon: "🌧️", bought: true, category: "Sounds" }
  ];

  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("gs_user");
    return saved ? JSON.parse(saved) : null;
  });
  // All data starts empty — synced from backend after login
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("gs_tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem("gs_notes");
    return saved ? JSON.parse(saved) : [];
  });
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem("gs_habits");
    return saved ? JSON.parse(saved) : [];
  });
  const [goalsList, setGoalsList] = useState<GoalItem[]>(() => {
    const saved = localStorage.getItem("gs_goals");
    return saved ? JSON.parse(saved) : [];
  });
  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem("gs_journals");
    return saved ? JSON.parse(saved) : [];
  });
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => {
    const saved = localStorage.getItem("gs_focus");
    return saved ? JSON.parse(saved) : [];
  });
  const [missions, setMissions] = useState<DailyMission[]>(() => {
    const saved = localStorage.getItem("gs_missions");
    return saved ? JSON.parse(saved) : DEFAULT_MISSIONS;
  });
  const [rewards, setRewards] = useState<RewardItem[]>(() => {
    const saved = localStorage.getItem("gs_rewards");
    return saved ? JSON.parse(saved) : DEFAULT_REWARDS;
  });
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem("gs_coins");
    return saved ? Number(saved) : 0;
  });
  const [partners, setPartners] = useState<GrowthPartner[]>(() => {
    const saved = localStorage.getItem("gs_partners");
    return saved ? JSON.parse(saved) : [];
  });

  const persist = useCallback((key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val)), []);

  // ── Sync from backend on mount ──
  useEffect(() => {
    apiFetch<Task[]>("/tasks").then(data => {
      if (data) { setTasks(data); persist("gs_tasks", data); }
    });
    apiFetch<Note[]>("/notes").then(data => {
      if (data) { setNotes(data); persist("gs_notes", data); }
    });
    apiFetch<Habit[]>("/habits").then(data => {
      if (data) { setHabits(data); persist("gs_habits", data); }
    });
    apiFetch<GrowthPartner[]>("/partners").then(data => {
      if (data) { setPartners(data); persist("gs_partners", data); }
    });
  }, [persist]);

  const login = useCallback(async (email: string, name?: string) => {
    const serverUser = await apiFetch<UserData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    });

    if (serverUser) {
      // ✅ Backend online — use real account
      setUser(serverUser);
      persist("gs_user", serverUser);
      // Clear stale cache then pull fresh data
      localStorage.removeItem("gs_tasks");
      localStorage.removeItem("gs_notes");
      localStorage.removeItem("gs_habits");
      localStorage.removeItem("gs_partners");
      setTasks([]); setNotes([]); setHabits([]); setPartners([]);
      apiFetch<Task[]>("/tasks").then(data => { if (data) { setTasks(data); persist("gs_tasks", data); } });
      apiFetch<Note[]>("/notes").then(data => { if (data) { setNotes(data); persist("gs_notes", data); } });
      apiFetch<Habit[]>("/habits").then(data => { if (data) { setHabits(data); persist("gs_habits", data); } });
      apiFetch<GrowthPartner[]>("/partners").then(data => { if (data) { setPartners(data); persist("gs_partners", data); } });
    } else {
      // ⚠️ Backend offline — create a local account so the app is still usable
      const existingSaved = localStorage.getItem("gs_user");
      const existingUser: UserData | null = existingSaved ? JSON.parse(existingSaved) : null;

      // If same email is saved locally, reuse it
      const localUser: UserData = (existingUser?.email === email)
        ? existingUser!
        : {
            id: `local_${Date.now()}`,
            name: name || email.split("@")[0] || "User",
            email,
            avatar: null,
            bio: "Building better habits, one day at a time. 🚀",
            level: 1,
            xp: 0,
            streak: 0,
            joinDate: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
            goals: [],
            inviteCode: `${(name || "USER").substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          };
      setUser(localUser);
      persist("gs_user", localUser);
    }
  }, [persist]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("gs_user");
  }, []);

  const updateUser = useCallback(async (patch: Partial<UserData>) => {
    setUser(u => { const n = u ? { ...u, ...patch } : null; if (n) persist("gs_user", n); return n; });
    await apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(patch) });
  }, [persist]);

  const addTask = useCallback(async (t: Omit<Task, "id" | "createdAt">) => {
    // Optimistic local update
    const localTask = { ...t, id: `t${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    setTasks(ts => { const next = [localTask, ...ts]; persist("gs_tasks", next); return next; });
    // Try to sync with backend
    const serverTask = await apiFetch<Task>("/tasks", { method: "POST", body: JSON.stringify(t) });
    if (serverTask) {
      setTasks(ts => { const next = ts.map(task => task.id === localTask.id ? serverTask : task); persist("gs_tasks", next); return next; });
    }
  }, [persist]);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    setTasks(ts => { const next = ts.map(t => t.id === id ? { ...t, ...patch } : t); persist("gs_tasks", next); return next; });
    await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }, [persist]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(ts => { const next = ts.filter(t => t.id !== id); persist("gs_tasks", next); return next; });
    await apiFetch(`/tasks/${id}`, { method: "DELETE" });
  }, [persist]);

  const addNote = useCallback(async (n: Omit<Note, "id" | "createdAt">) => {
    const localNote = { ...n, id: `n${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    setNotes(ns => { const next = [localNote, ...ns]; persist("gs_notes", next); return next; });
    const serverNote = await apiFetch<Note>("/notes", { method: "POST", body: JSON.stringify(n) });
    if (serverNote) {
      setNotes(ns => { const next = ns.map(note => note.id === localNote.id ? serverNote : note); persist("gs_notes", next); return next; });
    }
  }, [persist]);

  const updateNote = useCallback(async (id: string, patch: Partial<Note>) => {
    setNotes(ns => { const next = ns.map(n => n.id === id ? { ...n, ...patch } : n); persist("gs_notes", next); return next; });
    await apiFetch(`/notes/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }, [persist]);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(ns => { const next = ns.filter(n => n.id !== id); persist("gs_notes", next); return next; });
    await apiFetch(`/notes/${id}`, { method: "DELETE" });
  }, [persist]);

  const addPartner = useCallback(async (code: string): Promise<{ ok: boolean; error?: string; partner?: GrowthPartner }> => {
    const serverPartner = await apiFetch<GrowthPartner>("/partners/invite", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (serverPartner) {
      setPartners(ps => { const next = [...ps, serverPartner]; persist("gs_partners", next); return next; });
      return { ok: true, partner: serverPartner };
    }
    // Backend returned an error response — fetch the error text
    try {
      const errRes = await fetch(`${API_URL}/partners/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...((() => { try { const u = JSON.parse(localStorage.getItem("gs_user") || ""); return u?.id ? { Authorization: `Bearer ${u.id}` } : {}; } catch { return {}; } })())
        },
        body: JSON.stringify({ code }),
      });
      const errData = await errRes.json();
      if (errRes.status >= 400 && errRes.status < 500 && errData?.error) {
        return { ok: false, error: errData.error };
      }
    } catch {
      // Server/MongoDB is offline — fall through to create simulated partner connection locally
    }

    // Offline / fallback simulated growth partner connection
    const offlinePartner: GrowthPartner = {
      id: `offline_${Date.now()}`,
      friendUserId: `offline_u_${Date.now()}`,
      name: `Growth Friend (${code.toUpperCase()})`,
      avatar: null,
      level: 7,
      xp: 320,
      streak: 14,
      longestStreak: 21,
      status: "online",
      inviteCode: code.toUpperCase(),
      habits: [
        { name: "Morning Meditation", icon: "🧘", done: true, streak: 14 },
        { name: "Daily Hydration", icon: "💧", done: true, streak: 8 },
        { name: "Read 20 pages", icon: "📚", done: false, streak: 5 }
      ],
      tasks: [
        { title: "Complete project milestone", done: true, priority: "high" },
        { title: "30 min evening walk", done: false, priority: "medium" }
      ],
      weekProgress: [70, 65, 80, 85, 75, 90, 85],
      healthScore: 84,
      careerScore: 78,
      productivityScore: 82,
      focusHours: 16.5,
      studyHours: 12,
      codingHours: 20,
      waterIntake: 7,
      sleepHours: 7.5,
      exercise: 50,
      currentChallenge: "30-Day Consistency Sprint",
      currentRank: "Silver I",
      mood: "😊 Good",
      habitCompletion: 75,
      taskCompletion: 60,
      completedTasks: 15,
      pendingTasks: 3,
      weeklyGoalsDone: 4,
      weeklyGoalsTotal: 5,
      monthlyGoalsDone: 7,
      monthlyGoalsTotal: 10,
    };
    setPartners(ps => {
      if (ps.some(p => p.inviteCode.toUpperCase() === code.toUpperCase())) {
        return ps;
      }
      const next = [...ps, offlinePartner];
      persist("gs_partners", next);
      return next;
    });
    return { ok: true, partner: offlinePartner };
  }, [persist]);

  const removePartner = useCallback(async (id: string) => {
    setPartners(ps => { const next = ps.filter(p => p.id !== id); persist("gs_partners", next); return next; });
    await apiFetch(`/partners/${id}`, { method: "DELETE" });
  }, [persist]);

  const addHabit = useCallback(async (h: Omit<Habit, "id" | "streak" | "completedToday">) => {
    const localHabit = { ...h, id: Date.now(), streak: 0, completedToday: false };
    setHabits(hs => { const next = [...hs, localHabit]; persist("gs_habits", next); return next; });
    const serverHabit = await apiFetch<Habit>("/habits", { method: "POST", body: JSON.stringify(h) });
    if (serverHabit) {
      setHabits(hs => { const next = hs.map(x => x.id === localHabit.id ? serverHabit : x); persist("gs_habits", next); return next; });
    }
  }, [persist]);

  const updateHabit = useCallback(async (id: number, patch: Partial<Habit>) => {
    setHabits(hs => { const next = hs.map(h => h.id === id ? { ...h, ...patch } : h); persist("gs_habits", next); return next; });
    await apiFetch(`/habits/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }, [persist]);

  const deleteHabit = useCallback(async (id: number) => {
    setHabits(hs => { const next = hs.filter(h => h.id !== id); persist("gs_habits", next); return next; });
    await apiFetch(`/habits/${id}`, { method: "DELETE" });
  }, [persist]);

  const addGoal = useCallback((g: Omit<GoalItem, "id">) => {
    const nextGoal = { ...g, id: `g_${Date.now()}` };
    setGoalsList(prev => {
      const next = [...prev, nextGoal];
      persist("gs_goals", next);
      return next;
    });
  }, [persist]);

  const updateGoal = useCallback((id: string, patch: Partial<GoalItem>) => {
    setGoalsList(prev => {
      const next = prev.map(g => g.id === id ? { ...g, ...patch } : g);
      persist("gs_goals", next);
      return next;
    });
  }, [persist]);

  const deleteGoal = useCallback((id: string) => {
    setGoalsList(prev => {
      const next = prev.filter(g => g.id !== id);
      persist("gs_goals", next);
      return next;
    });
  }, [persist]);

  const addJournal = useCallback((j: Omit<JournalEntry, "id" | "date">) => {
    const nextJournal = { ...j, id: `j_${Date.now()}`, date: new Date().toISOString().split("T")[0] };
    setJournals(prev => {
      const next = [nextJournal, ...prev];
      persist("gs_journals", next);
      return next;
    });
  }, [persist]);

  const addFocusSession = useCallback((s: Omit<FocusSession, "id" | "date">) => {
    const nextSession = { ...s, id: `f_${Date.now()}`, date: new Date().toISOString().split("T")[0] };
    setFocusSessions(prev => {
      const next = [nextSession, ...prev];
      persist("gs_focus", next);
      return next;
    });
    setCoins(c => {
      const nextCoins = c + 5;
      persist("gs_coins", nextCoins);
      return nextCoins;
    });
    if (user) {
      updateUser({ xp: user.xp + 10 });
    }
  }, [persist, user, updateUser]);

  const toggleMission = useCallback((id: string) => {
    setMissions(prev => {
      const next = prev.map(m => {
        if (m.id === id && !m.done) {
          setCoins(c => {
            const nextCoins = c + m.rewardCoins;
            persist("gs_coins", nextCoins);
            return nextCoins;
          });
          if (user) {
            updateUser({ xp: user.xp + m.rewardXp });
          }
          return { ...m, done: true };
        }
        return m;
      });
      persist("gs_missions", next);
      return next;
    });
  }, [persist, user, updateUser]);

  const buyReward = useCallback((id: string) => {
    let success = false;
    setRewards(prev => {
      const target = prev.find(r => r.id === id);
      if (target && !target.bought && coins >= target.cost) {
        setCoins(c => {
          const nextCoins = c - target.cost;
          persist("gs_coins", nextCoins);
          return nextCoins;
        });
        success = true;
        const next = prev.map(r => r.id === id ? { ...r, bought: true } : r);
        persist("gs_rewards", next);
        return next;
      }
      return prev;
    });
    return success;
  }, [coins, persist]);

  const addCoins = useCallback((c: number) => {
    setCoins(prev => {
      const next = prev + c;
      persist("gs_coins", next);
      return next;
    });
  }, [persist]);

  return (
    <AuthCtx.Provider value={{ user, login, logout, updateUser, tasks, addTask, updateTask, deleteTask, notes, addNote, updateNote, deleteNote, habits, addHabit, updateHabit, deleteHabit, goalsList, addGoal, updateGoal, deleteGoal, journals, addJournal, focusSessions, addFocusSession, missions, toggleMission, rewards, buyReward, coins, addCoins, partners, addPartner, removePartner }}>
      {children}
    </AuthCtx.Provider>
  );
}
const useAuth = () => useContext(AuthCtx);

/* ══════════════════════════════════════════
   SHARED UI
══════════════════════════════════════════ */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card text-card-foreground shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", className = "", disabled = false, type = "button" }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "danger"; className?: string; disabled?: boolean; type?: "button" | "submit" }) {
  const base = "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-40";
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:opacity-90 hover:scale-[1.02]",
    ghost: "bg-transparent text-foreground/60 hover:text-foreground hover:bg-foreground/5",
    outline: "border border-border text-foreground/70 hover:border-primary/30 hover:text-foreground",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block text-foreground/50 text-xs mb-1.5 font-medium">{label}</label>}
      <input {...props} className={`w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-foreground/25 text-sm outline-none focus:border-primary/40 transition-colors ${props.className || ""}`} />
    </div>
  );
}

function Textarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <div>
      {label && <label className="block text-foreground/50 text-xs mb-1.5 font-medium">{label}</label>}
      <textarea {...props} className={`w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder-foreground/25 text-sm outline-none focus:border-primary/40 transition-colors resize-none ${props.className || ""}`} />
    </div>
  );
}

function Avatar({ src, name, size = "md", className = "" }: { src?: string | null; name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-14 h-14 text-xl", xl: "w-20 h-20 text-2xl" };
  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ${className}`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-extrabold flex-shrink-0 ${className}`}>
      {name[0].toUpperCase()}
    </div>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} className="relative w-9 h-9 rounded-xl border border-border flex items-center justify-center text-foreground/50 hover:text-foreground hover:border-primary/30 transition-all">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

const priorityColor = { high: "text-red-400 bg-red-500/10 border-red-500/20", medium: "text-amber-400 bg-amber-500/10 border-amber-500/20", low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
const noteColors: Record<string, string> = {
  violet: "border-violet-500/30 bg-violet-500/5",
  pink: "border-pink-500/30 bg-pink-500/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
  amber: "border-amber-500/30 bg-amber-500/5",
  cyan: "border-cyan-500/30 bg-cyan-500/5",
};
const noteDotColors: Record<string, string> = {
  violet: "bg-violet-500", pink: "bg-pink-500", emerald: "bg-emerald-500", amber: "bg-amber-500", cyan: "bg-cyan-500",
};

const tagColorMap: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-500 dark:text-violet-300 border-violet-500/20",
  pink: "bg-pink-500/10 text-pink-500 dark:text-pink-300 border-pink-500/20",
  cyan: "bg-cyan-500/10 text-cyan-500 dark:text-cyan-300 border-cyan-500/20",
  emerald: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-300 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-500 dark:text-amber-300 border-amber-500/20",
};
const dotColorMap: Record<string, string> = {
  violet: "bg-violet-400",
  pink: "bg-pink-400",
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
};

/* ══════════════════════════════════════════
   LANDING PAGE
══════════════════════════════════════════ */
function LandingPage({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { dark } = useTheme();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background overflow-hidden relative flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-pink-500/8 blur-[120px]" />
      </div>
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-foreground text-xl tracking-tight">GrowSync</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Btn onClick={() => onNavigate("dashboard")}>Go to Dashboard</Btn>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => onNavigate("login")}>Log in</Btn>
              <Btn onClick={() => onNavigate("login")}>Get Started</Btn>
            </>
          )}
        </div>
      </nav>
      <div className="relative z-10 flex flex-col items-center text-center px-4 pt-24 pb-16">
        <h1 className="font-['Plus_Jakarta_Sans'] text-5xl md:text-7xl font-extrabold text-foreground leading-[1.05] tracking-tight max-w-3xl">
          Grow every day.<br />
          <span className="bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500 bg-clip-text text-transparent">Together.</span>
        </h1>
        <p className="mt-6 text-lg text-foreground/50 max-w-xl leading-relaxed">The self-improvement platform that gamifies habits, tracks wellness, and keeps you accountable with friends.</p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Btn onClick={() => onNavigate(user ? "dashboard" : "login")} className="px-8 py-4 text-base">
            {user ? "Go to Dashboard" : "Start Growing Free"} <ArrowRight size={18} />
          </Btn>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-16">
          {[["47k+", "Active Growers"], ["2.3M", "Habits Tracked"], ["94%", "Streak Rate"]].map(([n, l]) => (
            <div key={l} className="flex flex-col items-center">
              <span className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent">{n}</span>
              <span className="text-xs text-foreground/40 mt-1">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   AUTH PAGE
══════════════════════════════════════════ */
function AuthPage({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!email.includes("@")) { setErr("Enter a valid email."); return; }
    if (mode === "signup" && !name.trim()) { setErr("Enter your name."); return; }
    await login(email, name || undefined);
    onNavigate(mode === "signup" ? "onboarding" : "dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => onNavigate("landing")}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap size={24} className="text-white" />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold text-foreground tracking-tight">GrowSync</span>
        </div>

        {/* Premium Card */}
        <div className="w-full card-glass p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-foreground font-['Plus_Jakarta_Sans']">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Enter your details to access your dashboard." : "Start your self-improvement journey today."}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-muted/50 p-1.5 rounded-xl">
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m as "login" | "signup"); setErr(""); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all capitalize ${
                  mode === m 
                  ? "bg-card text-foreground shadow-sm scale-[1.02]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Input label="Full Name" placeholder="Alex Chen" value={name} onChange={e => setName(e.target.value)} />
                </motion.div>
              )}
            </AnimatePresence>
            <Input label="Email" type="email" placeholder="alex@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            
            <div>
              <label className="block text-foreground text-xs mb-2 font-bold">Password</label>
              <div className="relative">
                <input 
                  type={showPw ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="w-full bg-input/50 border border-border/50 rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all pr-10" 
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {err && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold flex items-center gap-1.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} />{err}
                </motion.p>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98]"
            >
              {mode === "login" ? "Log In to Dashboard" : "Create My Account"} <ArrowRight size={16} />
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-xs font-semibold text-muted-foreground flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors" onClick={() => onNavigate("landing")}>
          <ChevronLeft size={14} /> Back to homepage
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════ */
const goalCategories = [
  { id: "fitness", label: "Fitness", icon: <Dumbbell size={18} /> },
  { id: "reading", label: "Reading", icon: <BookOpen size={18} /> },
  { id: "career", label: "Career Growth", icon: <TrendingUp size={18} /> },
  { id: "coding", label: "Coding Skills", icon: <Code2 size={18} /> },
  { id: "hydration", label: "Hydration", icon: <Droplets size={18} /> },
  { id: "sleep", label: "Sleep", icon: <Moon size={18} /> },
  { id: "mental", label: "Mental Wellness", icon: <Brain size={18} /> },
  { id: "selfcare", label: "Self Care", icon: <Smile size={18} /> },
  { id: "health", label: "Health", icon: <Heart size={18} /> },
  { id: "productivity", label: "Productivity", icon: <Zap size={18} /> },
];

function OnboardingPage({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { updateUser } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/5 blur-[120px] rounded-full" />
      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <Target size={26} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground font-['Plus_Jakarta_Sans']">What do you want to improve?</h1>
          <p className="text-foreground/40 mt-2 text-sm">Choose multiple — we will personalize your experience.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {goalCategories.map(c => {
            const sel = selected.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggle(c.id)}
                className={`relative flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${sel ? "border-primary/50 bg-primary/5 text-foreground" : "border-border text-foreground/60 hover:border-border hover:text-foreground/80"}`}>
                {sel && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sel ? "bg-primary/15 text-primary" : "bg-muted text-foreground/40"}`}>{c.icon}</div>
                <span className="font-semibold text-sm">{c.label}</span>
              </button>
            );
          })}
        </div>
        <Btn onClick={() => { updateUser({ goals: selected }); onNavigate("dashboard"); }} disabled={selected.length === 0} className="mt-6 w-full py-4 text-base">
          Start My Journey <ArrowRight size={18} />
        </Btn>
        <p className="text-center text-foreground/25 text-xs mt-3">{selected.length} selected</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
const navItems = [
  { id: "dashboard", icon: <Home size={16} />, label: "Dashboard" },
  { id: "focus", icon: <Clock size={16} />, label: "Today's Focus" },
  { id: "habits", icon: <CheckCircle2 size={16} />, label: "Habits" },
  { id: "goals", icon: <Target size={16} />, label: "Goals" },
  { id: "career", icon: <TrendingUp size={16} />, label: "Career" },
  { id: "health", icon: <Heart size={16} />, label: "Health" },
  { id: "learning", icon: <BookOpen size={16} />, label: "Learning" },
  { id: "journal", icon: <Edit3 size={16} />, label: "Journal" },
  { id: "tasks", icon: <ListTodo size={16} />, label: "Notes / Tasks" },
  { id: "timetracker", icon: <Activity size={16} />, label: "Time Tracker" },
  { id: "friends", icon: <Users size={16} />, label: "Friend" },
  { id: "achievements", icon: <Trophy size={16} />, label: "Achievements" },
  { id: "profile", icon: <Settings size={16} />, label: "Settings" },
];

function Sidebar({ active, onNavigate }: { active: View; onNavigate: (v: View) => void }) {
  const { user, logout, coins } = useAuth();
  if (!user) return null;
  return (
    <aside className="w-[240px] h-screen bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 font-['Poppins'] text-sidebar-foreground select-none sticky top-0">
      {/* logo: GrowSync premium branding */}
      <div className="px-5 py-5 flex-shrink-0">
        <div className="bg-secondary text-secondary-foreground border border-primary/20 px-5 py-3 rounded-full font-extrabold text-lg tracking-wide shadow-sm text-center flex items-center justify-center gap-2">
          <Zap size={18} className="animate-pulse" /> GrowSync
        </div>
      </div>

      {/* Menu items list — scrollable, takes all available space */}
      <nav className="flex-1 overflow-y-auto flex flex-col divide-y divide-sidebar-border/30 border-t border-sidebar-border/30">
        {navItems.map(n => {
          const isSelected = active === n.id || (n.id === "profile" && active === "profile");
          return (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id as View)}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-semibold transition-all text-left ${
                isSelected
                  ? "bg-secondary/40 text-sidebar-foreground border-l-4 border-primary pl-4 font-bold"
                  : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-secondary/20"
              }`}
            >
              <span className={isSelected ? "text-primary" : "text-sidebar-foreground/60"}>{n.icon}</span>
              {n.label}
              {n.id === "friends" && (
                <span className="ml-auto w-4.5 h-4.5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── BOTTOM SECTION: XP card + Logout — always pinned at bottom ── */}
      <div className="flex-shrink-0 border-t border-sidebar-border/30 pb-3">
        {/* Daily Streak / Coins / XP / Level Card */}
        <div className="mx-4 mt-4 p-4 rounded-3xl bg-foreground/[0.05] border border-sidebar-border/30 space-y-3">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-sidebar-foreground/70 uppercase tracking-widest">
            <span>Growth Pass</span>
            <span className="font-extrabold text-primary font-['Poppins']">Level {user.level}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-extrabold font-['Poppins'] text-sidebar-foreground">
              {user.xp} <span className="text-[9px] text-sidebar-foreground/50 font-normal">/ 500 XP</span>
            </span>
            <span className="text-[10px] font-extrabold text-orange-500 dark:text-orange-400 flex items-center gap-0.5">
              <Flame size={11} className="inline" /> {user.streak} days
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-sidebar-foreground/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${Math.min(100, (user.xp / 500) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-sidebar-border/20 text-xs font-bold text-sidebar-foreground/80">
            <span className="flex items-center gap-1">🪙 GrowCoins</span>
            <span className="text-primary font-extrabold font-['Poppins']">{coins}</span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="mx-4 mt-3 w-[calc(100%-2rem)] py-3 rounded-2xl border border-sidebar-border/60 text-xs font-extrabold text-sidebar-foreground/70 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all flex items-center justify-center gap-2"
        >
          <LogOut size={13} /> Logout
        </button>
      </div>
    </aside>
  );
}


/* ══════════════════════════════════════════
   TOP BAR
 ══════════════════════════════════════════ */
function TopBar({ onNavigate, onQuickAdd }: { onNavigate: (v: View) => void; onQuickAdd: () => void }) {
  const { user } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  
  if (!user) return null;
  return (
    <div className="flex items-center justify-between px-7 py-3 bg-[#5B3765] dark:bg-[#1e1124] border-b border-[#5B3765]/10 text-white sticky top-0 z-20 flex-shrink-0 font-['Poppins'] shadow-md select-none">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase">Welcome back</span>
        <h2 className="text-white font-extrabold text-base tracking-tight flex items-center gap-1.5 mt-0.5">
          Good Morning, {user.name.split(" ")[0]} 👋
        </h2>
      </div>

      {/* Search and Action items */}
      <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search focus, habits, goals..."
            className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-white/30 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Add */}
        <button
          onClick={onQuickAdd}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-sm"
          title="Quick Add Task"
        >
          <Plus size={16} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all shadow-sm">
            <Bell size={14} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400" />
          </button>
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border shadow-2xl rounded-2xl p-3 z-50 text-foreground">
              <h4 className="text-xs font-bold mb-2 pb-2 border-b border-border text-foreground">Notifications</h4>
              <div className="space-y-2">
                <div className="text-xs p-2 rounded-lg bg-primary/10 cursor-pointer">
                  <p className="font-bold text-primary">Jordan completed a task!</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">"Review System Design notes"</p>
                </div>
                <div className="text-xs p-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer">
                  <p className="font-bold text-foreground">Daily Streak 🔥</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">You're on a {user.streak} day streak. Keep it up!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />

        <div className="h-6 w-px bg-white/15 mx-1" />

        {/* Profile Avatar Trigger */}
        <button
          onClick={() => onNavigate("profile")}
          className="flex items-center gap-2 hover:opacity-85 transition-all text-left"
        >
          <Avatar src={user.avatar} name={user.name} size="sm" className="border border-white/20" />
          <span className="hidden md:inline text-xs font-bold text-white/90">{user.name.split(" ")[0]}</span>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MINI CALENDAR
══════════════════════════════════════════ */
function MiniCalendar() {
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const { tasks, notes } = useAuth();
  
  // Starting with June 2026 to match mock dataset initial dates, but user can change month!
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 5, 17));
  const [selected, setSelected] = useState<number>(17);

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  // Get total days in month
  const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  // Get start day of month (0 = Sunday, 1 = Monday, ...)
  const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  // Active day check based on real data (has task due or note created on this day)
  const isDateActive = (day: number) => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dStr = String(day).padStart(2, "0");
    const dateKey = `${y}-${m}-${dStr}`;

    // Has a task due on this day
    const hasTask = tasks.some(t => t.dueDate === dateKey);
    // Has a note created on this day
    const hasNote = notes.some(n => n.createdAt === dateKey);
    
    return hasTask || hasNote;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-foreground font-bold text-sm font-['Plus_Jakarta_Sans']">
          {monthName} {year}
        </span>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-foreground/45 hover:text-foreground/80 hover:bg-primary/10 transition-all">
            <ChevronLeft size={12} />
          </button>
          <button onClick={nextMonth} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-foreground/45 hover:text-foreground/80 hover:bg-primary/10 transition-all">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const active = isDateActive(d);
          const isSelected = d === selected;
          return (
            <button
              key={i}
              onClick={() => setSelected(d)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-all ${
                isSelected
                  ? "bg-primary text-white shadow-sm font-extrabold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {d}
              {active && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DASHBOARD VIEW
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   DASHBOARD VIEW
══════════════════════════════════════════ */
const activityData = [
  { day: "Mon", value: 65, focus: 2.5, xp: 120 },
  { day: "Tue", value: 45, focus: 1.8, xp: 90 },
  { day: "Wed", value: 80, focus: 4.0, xp: 210 },
  { day: "Thu", value: 55, focus: 2.2, xp: 130 },
  { day: "Fri", value: 92, focus: 5.5, xp: 340 },
  { day: "Sat", value: 35, focus: 1.5, xp: 80 },
  { day: "Sun", value: 70, focus: 3.2, xp: 150 },
];

function DashboardView({ onNavigate, onQuickAdd }: { onNavigate: (v: View) => void; onQuickAdd: () => void }) {
  const { user, tasks, updateTask, habits, updateHabit, partners, coins, addCoins } = useAuth();
  
  // Local state for dashboard widgets
  const [mood, setMood] = useState("good");
  const [waterCups, setWaterCups] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [quickMemo, setQuickMemo] = useState("");
  const [activeChallenge, setActiveChallenge] = useState("Run 5km with Jordan");
  
  // Mini Pomodoro State inside dashboard
  const [pomoSecs, setPomoSecs] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [ambientSound, setAmbientSound] = useState<"none" | "rain" | "waves" | "forest">("none");

  useEffect(() => {
    let timer: any;
    if (pomoActive && pomoSecs > 0) {
      timer = setInterval(() => setPomoSecs(s => s - 1), 1000);
    } else if (pomoSecs === 0) {
      setPomoActive(false);
      alert("Pomodoro complete! You earned 10 XP and 5 GrowCoins.");
      addCoins(5);
      setPomoSecs(25 * 60);
    }
    return () => clearInterval(timer);
  }, [pomoActive, pomoSecs, addCoins]);

  if (!user) return null;

  const moodEmojis: Record<string, string> = { great: "😄", good: "😊", okay: "😐", sad: "😔", stressed: "😰", angry: "😤" };
  const doneHabits = habits.filter(h => h.completedToday).length;
  const habitPct = habits.length > 0 ? Math.round((doneHabits / habits.length) * 100) : 0;
  
  // Estimate daily task completion rate and sort completed to bottom
  const todayTasks = tasks.slice(0, 4).sort((a, b) => Number(a.done) - Number(b.done));
  const doneTasks = todayTasks.filter(t => t.done).length;
  const taskPct = todayTasks.length > 0 ? Math.round((doneTasks / todayTasks.length) * 100) : 0;
  
  // Calculate average daily progress
  const dailyOverallProgress = Math.round((habitPct + taskPct) / 2);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // XP Leaderboard calculations (including demo partners)
  const leaderboard = [
    { name: "You", level: user.level, xp: user.xp, avatar: user.avatar, active: true },
    ...partners.map(p => ({ name: p.name, level: p.level, xp: p.xp, avatar: p.avatar, active: false }))
  ].sort((a, b) => b.xp - a.xp);

  return (
    <div className="flex h-full overflow-hidden text-foreground">
      
      {/* ── CENTER MAIN CONTENT COLUMN ── */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 min-w-0 bg-background">
        
        {/* ROW 1: Greeting, Motivational Quote, Progress & Mood */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card-neumorphic p-6 flex flex-col justify-between bg-gradient-to-br from-[#5B3765] to-[#9E6899] text-white">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/60">Daily Inspiration</span>
              <h2 className="text-xl font-extrabold font-['Poppins'] mt-1 leading-tight">
                "Your focus determines your reality."
              </h2>
              <p className="text-xs text-white/70 mt-1.5">— Qui-Gon Jinn</p>
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 text-xs">
              <span className="flex items-center gap-1.5"><Sun size={13} className="text-amber-300" /> 24°C Calm Sunny</span>
              <span className="font-extrabold bg-white/10 px-3 py-1 rounded-full text-[10px] tracking-wide">Premium Grower</span>
            </div>
          </div>

          <Card className="p-5 border-border shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Today's completion</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-primary">{dailyOverallProgress}%</span>
                <span className="text-xs text-muted-foreground font-medium">overall rate</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${dailyOverallProgress}%` }} />
              </div>
            </div>
            <div className="flex gap-1.5 mt-4 pt-3 border-t border-border/40 justify-between items-center text-xs">
              <span className="text-muted-foreground font-medium">Habits: <strong className="text-primary">{habitPct}%</strong></span>
              <div className="w-1.5 h-1.5 rounded-full bg-border" />
              <span className="text-muted-foreground font-medium">Tasks: <strong className="text-accent">{taskPct}%</strong></span>
            </div>
          </Card>
        </div>

        {/* ROW 1.5: Mood tracker with emoji */}
        <Card className="p-5 border-border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">How is your energy & mood today?</h3>
            <span className="text-xs text-primary font-bold">Selected: {mood}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { m: "great", label: "😄 Great" },
              { m: "good", label: "😊 Good" },
              { m: "okay", label: "😐 Okay" },
              { m: "sad", label: "😔 Sad" },
              { m: "stressed", label: "😰 Stress" },
              { m: "angry", label: "😤 Anger" },
            ].map(x => (
              <button
                key={x.m}
                onClick={() => setMood(x.m)}
                className={`py-3 rounded-2xl border text-center transition-all ${
                  mood === x.m ? "bg-primary/10 border-primary text-primary scale-102 font-bold shadow-sm" : "border-border hover:bg-muted/40 text-foreground"
                }`}
              >
                <span className="text-lg block mb-0.5">{moodEmojis[x.m]}</span>
                <span className="text-[10px] tracking-wide block">{x.m}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ROW 2: Daily Tasks Beautiful Checklist */}
        <Card className="p-5 border-border shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h3 className="text-sm font-extrabold font-['Poppins']">Today's Focus Tasks</h3>
            <button
              onClick={onQuickAdd}
              className="bg-primary/10 text-primary hover:bg-primary/15 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-primary/10"
            >
              <Plus size={12} /> New +
            </button>
          </div>
          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No tasks found. Click "New +" to schedule some focus action!</p>
            ) : (
              todayTasks.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                    t.done ? "border-border/50 opacity-60 bg-muted/20" : "border-border hover:border-primary/20 bg-card"
                  }`}
                >
                  <button
                    onClick={() => updateTask(t.id, { done: !t.done })}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      t.done ? "bg-gradient-to-br from-primary to-accent border-transparent" : "border-foreground/20 hover:border-primary"
                    }`}
                  >
                    {t.done && <Check size={10} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${t.done ? "line-through text-foreground/30 font-normal" : "text-foreground"}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock size={9} /> {t.dueDate}</span>
                      <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">{t.category}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${priorityColor[t.priority] || ""}`}>
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* ROW 3: Habit Tracker Status Circles */}
        <Card className="p-5 border-border shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold font-['Poppins']">Active Habit Trackers</h3>
            <button onClick={() => onNavigate("habits")} className="text-xs text-primary font-bold hover:underline">View All Habits</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {habits.slice(0, 4).map(h => (
              <div key={h.id} className={`p-4 rounded-2xl border flex flex-col justify-between min-h-[110px] ${h.completedToday ? "border-primary/20 bg-primary/5" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{h.icon}</span>
                  <button
                    onClick={() => updateHabit(h.id, { completedToday: !h.completedToday })}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${h.completedToday ? "bg-primary border-transparent text-white" : "border-border text-foreground/30"}`}
                  >
                    <Check size={11} />
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold truncate">{h.name}</p>
                  <p className="text-[10px] text-orange-500 font-extrabold mt-0.5">🔥 {h.streak}d streak</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ROW 4: Focus Timer Widget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 border-border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Focus Countdown</h3>
              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">Deep Work</span>
            </div>
            <div className="text-center py-4">
              <span className="text-4xl font-extrabold font-['Poppins'] tracking-wider text-primary">{formatTime(pomoSecs)}</span>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">Keep grinding! Stay present.</p>
            </div>
            <div className="flex gap-2.5 mt-3">
              <Btn onClick={() => setPomoActive(!pomoActive)} variant={pomoActive ? "outline" : "primary"} className="flex-1 py-2 text-xs">
                {pomoActive ? "Pause" : "Start Focus"}
              </Btn>
              <Btn onClick={() => { setPomoActive(false); setPomoSecs(25 * 60); }} variant="ghost" className="text-xs py-2 px-3 border border-border">
                Reset
              </Btn>
            </div>
          </Card>

          <Card className="p-5 border-border shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3.5">Study Room Music & Sounds</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20">
                  <span className="text-xs font-bold text-foreground/75 flex items-center gap-1.5">🎵 Ambient Sound</span>
                  <select
                    value={ambientSound}
                    onChange={e => setAmbientSound(e.target.value as any)}
                    className="bg-card border border-border rounded-lg text-[10px] font-bold p-1 outline-none"
                  >
                    <option value="none">Silence 🔇</option>
                    <option value="rain">Soft Rain 🌧️</option>
                    <option value="waves">Ocean Waves 🌊</option>
                    <option value="forest">Summer Birds 🌲</option>
                  </select>
                </div>
                
                {/* Spotify shortcut mock */}
                <a
                  href="https://open.spotify.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-left"
                >
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    🟢 Spotify Music Player
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold">Open Widget →</span>
                </a>
              </div>
            </div>
            {ambientSound !== "none" && (
              <p className="text-[10px] text-primary/60 font-semibold animate-pulse mt-3 text-center">Playing {ambientSound} ambient sound in study room...</p>
            )}
          </Card>
        </div>

        {/* ROW 5: Weekly Analytics XP & Habit Performance Charts */}
        <Card className="p-5 border-border shadow-sm">
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest mb-4">Weekly Growth Analytics</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="pXp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#BA88AE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#BA88AE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" stroke="#BA88AE" strokeWidth={2.5} fill="url(#pXp)" name="XP Earned" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

      </div>

      {/* ── RIGHT COLUMN: NOTION-STYLE WIDGETS PANEL ── */}
      <div className="w-[280px] flex-shrink-0 bg-[#FAF9FC] border-l border-border overflow-y-auto py-6 px-5 space-y-6 select-none font-['Poppins']">
        
        {/* Calendar Widget */}
        <div>
          <h3 className="text-[10px] font-extrabold text-foreground/40 uppercase tracking-wider mb-2.5">My calendar</h3>
          <Card className="p-4 border-border shadow-sm bg-card">
            <MiniCalendar />
          </Card>
        </div>

        {/* Today's Stats logging widgets: Water & Sleep */}
        <div className="space-y-4">
          <Card className="p-4 border-border shadow-sm bg-card space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-foreground/75 flex items-center gap-1">💧 Water Intake</span>
              <span className="text-xs font-extrabold text-primary">{waterCups}/8 cups</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWaterCups(i + 1)}
                  className={`flex-1 h-7 rounded-lg transition-all ${i < waterCups ? "bg-primary text-white text-xs font-bold" : "bg-muted text-foreground/30 hover:bg-muted/80"}`}
                >
                  🥛
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 border-border shadow-sm bg-card space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-foreground/75 flex items-center gap-1">🌙 Sleep Logger</span>
              <span className="text-xs font-extrabold text-accent">{sleepHours} hrs</span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              step="0.5"
              value={sleepHours}
              onChange={e => setSleepHours(Number(e.target.value))}
              className="w-full accent-primary bg-muted rounded-lg appearance-none h-1.5"
            />
          </Card>
        </div>

        {/* Accountability Leaderboard */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="text-[10px] font-extrabold text-foreground/40 uppercase tracking-wider">Growth Leaderboard</h3>
            <span className="text-[9px] text-primary font-bold">Week 27</span>
          </div>
          <Card className="p-3 border-border shadow-sm bg-card divide-y divide-border/40">
            {leaderboard.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                <span className="text-xs font-extrabold text-foreground/30 w-4">{idx + 1}</span>
                <Avatar src={item.avatar} name={item.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${item.active ? "text-primary" : "text-foreground/80"}`}>{item.name}</p>
                  <p className="text-[9px] text-foreground/40 font-medium">Level {item.level}</p>
                </div>
                <span className="text-xs font-extrabold text-primary">{item.xp} XP</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Friend Status Indicators */}
        <div>
          <h3 className="text-[10px] font-extrabold text-foreground/40 uppercase tracking-wider mb-2.5">Partners Online</h3>
          <div className="space-y-2">
            {partners.map(p => (
              <Card key={p.id} className="p-3 border-border shadow-sm bg-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar src={p.avatar} name={p.name} size="sm" />
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${p.status === "online" ? "bg-emerald-500" : "bg-foreground/25"}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground/80 leading-none">{p.name}</p>
                    <p className="text-[9px] text-foreground/45 mt-0.5 font-medium">Streak: {p.streak} days</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate("friends")}
                  className="bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all"
                >
                  Co-op
                </button>
              </Card>
            ))}
          </div>
        </div>

        {/* Current challenge widget */}
        <Card className="p-4 border-border bg-gradient-to-br from-[#FAF9FC] to-secondary/10 border-dashed shadow-none space-y-2">
          <span className="text-[9px] font-extrabold text-primary uppercase tracking-widest">Active Co-op Challenge</span>
          <p className="text-xs font-extrabold text-foreground/80">{activeChallenge}</p>
          <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-primary" style={{ width: "60%" }} />
          </div>
          <p className="text-[9px] text-foreground/40 font-medium text-right">60% completed</p>
        </Card>

        {/* Quick Notepad */}
        <div>
          <h3 className="text-[10px] font-extrabold text-foreground/40 uppercase tracking-wider mb-2.5">Scratch Notepad</h3>
          <Card className="p-3 border-border shadow-sm bg-card space-y-2">
            <textarea
              placeholder="Jot down a quick thought or reminder..."
              value={quickMemo}
              onChange={e => setQuickMemo(e.target.value)}
              className="w-full min-h-[60px] text-xs text-foreground placeholder-foreground/30 bg-transparent border-none outline-none resize-none"
            />
            {quickMemo && (
              <div className="flex justify-between items-center pt-2 border-t border-border/40 text-[9px] text-foreground/40 font-bold">
                <span>Auto-saved locally</span>
                <button onClick={() => setQuickMemo("")} className="hover:text-red-500 transition-colors">Clear</button>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MY TASKS VIEW
══════════════════════════════════════════ */
function TasksView() {
  const { tasks, addTask, updateTask, deleteTask, notes, addNote, updateNote, deleteNote } = useAuth();
  const [subTab, setSubTab] = useState<"tasks" | "notes">("tasks");
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  
  // Task form state
  const [taskForm, setTaskForm] = useState({ title: "", note: "", category: "Personal", priority: "medium" as Task["priority"], dueDate: new Date().toISOString().split("T")[0] });
  
  // Note form state
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("violet");
  const [editNoteId, setEditNoteId] = useState<string | null>(null);

  // Filtered lists
  const filteredTasks = tasks.filter(t => {
    if (filter === "pending") return !t.done;
    return true;
  }).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));

  const filteredNotes = notes.filter(n => {
    if (filter === "pending") return !n.pinned;
    return true;
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const submitTask = () => {
    if (!taskForm.title.trim()) return;
    if (editTaskId) {
      updateTask(editTaskId, taskForm);
      setEditTaskId(null);
    } else {
      addTask(taskForm);
    }
    setTaskForm({ title: "", note: "", category: "Personal", priority: "medium", dueDate: new Date().toISOString().split("T")[0] });
    setShowTaskForm(false);
  };

  const startEditTask = (t: Task) => {
    setEditTaskId(t.id);
    setTaskForm({ title: t.title, note: t.note, category: t.category, priority: t.priority, dueDate: t.dueDate });
    setShowTaskForm(true);
  };

  const saveNote = () => {
    if (!newNoteTitle.trim()) return;
    if (editNoteId) {
      updateNote(editNoteId, { title: newNoteTitle, body: newNoteBody, color: newNoteColor });
      setEditNoteId(null);
    } else {
      addNote({ title: newNoteTitle, body: newNoteBody, color: newNoteColor, pinned: false });
    }
    setNewNoteTitle("");
    setNewNoteBody("");
    setNewNoteColor("violet");
    setShowNoteForm(false);
  };

  const startEditNote = (n: Note) => {
    setEditNoteId(n.id);
    setNewNoteTitle(n.title);
    setNewNoteBody(n.body);
    setNewNoteColor(n.color);
    setShowNoteForm(true);
  };

  const cats = ["Personal", "Career", "Health", "Learning", "Finance", "Other"];

  return (
    <div className="p-7 space-y-6 text-foreground font-['Plus_Jakarta_Sans']">
      
      {/* Subheader and Tab Selectors from Mockup */}
      <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Notes / tasks</h2>
          <p className="text-foreground/40 text-xs mt-0.5">Organize your thoughts and tasks cleanly</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Notes / Tasks Tab buttons */}
          <div className="flex bg-muted rounded-xl p-1 gap-1 border border-border">
            <button
              onClick={() => { setSubTab("notes"); setFilter("all"); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "notes"
                  ? "bg-[#5c7c64] text-white shadow-sm"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => { setSubTab("tasks"); setFilter("all"); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "tasks"
                  ? "bg-[#5c7c64] text-white shadow-sm"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              Tasks
            </button>
          </div>

          <button
            onClick={() => {
              if (subTab === "tasks") {
                setShowTaskForm(true);
                setEditTaskId(null);
                setTaskForm({ title: "", note: "", category: "Personal", priority: "medium", dueDate: new Date().toISOString().split("T")[0] });
              } else {
                setShowNoteForm(true);
                setEditNoteId(null);
                setNewNoteTitle("");
                setNewNoteBody("");
                setNewNoteColor("violet");
              }
            }}
            className="bg-[#5c7c64] hover:bg-[#4a6451] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> New +
          </button>
        </div>
      </div>

      {/* Sub-filters: All / Pendings */}
      <div className="flex gap-2">
        {([["all", "All"], ["pending", "Pendings"]] as [typeof filter, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              filter === id
                ? "bg-[#5c7c64]/15 text-[#5c7c64] border-[#5c7c64]/30"
                : "bg-muted text-foreground/50 border-border hover:text-foreground/75"
            }`}
          >
            {label} {subTab === "tasks" 
              ? (id === "all" ? `(${tasks.length})` : `(${tasks.filter(t => !t.done).length})`)
              : (id === "all" ? `(${notes.length})` : `(${notes.filter(n => !n.pinned).length})`)
            }
          </button>
        ))}
      </div>

      {/* Forms Section */}
      {showTaskForm && subTab === "tasks" && (
        <Card className="p-5 border-[#5c7c64]/20 bg-card shadow-sm">
          <h3 className="text-sm font-extrabold mb-4">{editTaskId ? "Edit Task" : "Create New Task"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <Input label="Task Title" placeholder="What needs to be done?" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Textarea label="Notes (optional)" placeholder="Add more context…" value={taskForm.note} onChange={e => setTaskForm(f => ({ ...f, note: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Category</label>
              <select value={taskForm.category} onChange={e => setTaskForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-[#5c7c64]">
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Priority</label>
              <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-[#5c7c64]">
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Due Date</label>
              <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-[#5c7c64]" />
            </div>
          </div>
          <div className="flex gap-3">
            <Btn onClick={submitTask}><Save size={14} />{editTaskId ? "Update" : "Create"} Task</Btn>
            <Btn variant="ghost" onClick={() => { setShowTaskForm(false); setEditTaskId(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {showNoteForm && subTab === "notes" && (
        <Card className="p-5 border-[#5c7c64]/20 bg-card shadow-sm">
          <h3 className="text-sm font-extrabold mb-4">{editNoteId ? "Edit Note" : "Create New Note"}</h3>
          <div className="space-y-4 mb-4">
            <Input placeholder="Note title…" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} />
            <Textarea placeholder="Write your note…" value={newNoteBody} onChange={e => setNewNoteBody(e.target.value)} rows={3} />
            <div className="flex items-center gap-2">
              <span className="text-foreground/40 text-xs font-bold">Color:</span>
              {["violet", "pink", "emerald", "amber", "cyan"].map(c => (
                <button key={c} onClick={() => setNewNoteColor(c)} className={`w-6 h-6 rounded-full ${noteDotColors[c]} ${newNoteColor === c ? "ring-2 ring-offset-2 ring-[#5c7c64] dark:ring-[#7ba184] ring-offset-background" : ""}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Btn onClick={saveNote}><Save size={14} />{editNoteId ? "Update" : "Save"} Note</Btn>
            <Btn variant="ghost" onClick={() => { setShowNoteForm(false); setEditNoteId(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Main List display */}
      <div className="space-y-3">
        
        {/* Render Tasks List */}
        {subTab === "tasks" && (
          <>
            {filteredTasks.length === 0 && (
              <Card className="p-8 text-center text-foreground/35"><p>No tasks found. Click "New +" to create your first task!</p></Card>
            )}
            {filteredTasks.map(t => (
              <Card key={t.id} className={`p-4 transition-all hover:border-[#5c7c64]/20 ${t.done ? "opacity-60 bg-muted/10 border-border/40" : "border-border bg-card shadow-sm"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => updateTask(t.id, { done: !t.done })} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.done ? "bg-gradient-to-br from-[#5c7c64] to-[#8b2626] border-transparent" : "border-foreground/20 hover:border-[#5c7c64]"}`}>
                    {t.done && <Check size={10} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${t.done ? "line-through text-foreground/35 font-normal" : "text-foreground"}`}>{t.title}</p>
                        {t.note && <p className="text-foreground/45 text-xs mt-1 leading-relaxed">{t.note}</p>}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${priorityColor[t.priority] || ""}`}>{t.priority}</span>
                          <span className="text-[9px] bg-muted text-foreground/40 px-2 py-0.5 rounded-full font-semibold">{t.category}</span>
                          <span className="text-[9px] text-foreground/35 flex items-center gap-0.5"><Clock size={9} />{t.dueDate}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => startEditTask(t)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground/35 hover:text-[#5c7c64] hover:bg-[#5c7c64]/5 transition-all"><Pencil size={12} /></button>
                        <button onClick={() => deleteTask(t.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground/35 hover:text-red-500 hover:bg-red-500/5 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Render Notes List */}
        {subTab === "notes" && (
          <>
            {filteredNotes.length === 0 && (
              <Card className="p-8 text-center text-foreground/35"><p>No notes found. Click "New +" to create your first note!</p></Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map(n => (
                <Card key={n.id} className={`p-4.5 rounded-2xl border ${noteColors[n.color] || noteColors.violet} bg-card relative group shadow-sm flex flex-col justify-between min-h-[140px]`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {n.pinned && <Star size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                        <p className="text-foreground font-bold text-sm truncate">{n.title || "Untitled Note"}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => updateNote(n.id, { pinned: !n.pinned })} className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center text-foreground/30 hover:text-amber-500 hover:bg-amber-500/5 transition-all">
                          <Star size={11} className={n.pinned ? "fill-amber-500 text-amber-500" : ""} />
                        </button>
                        <button onClick={() => startEditNote(n)} className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center text-foreground/30 hover:text-[#5c7c64] hover:bg-[#5c7c64]/5 transition-all"><Pencil size={11} /></button>
                        <button onClick={() => deleteNote(n.id)} className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center text-foreground/30 hover:text-red-500 hover:bg-red-500/5 transition-all"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    <p className="text-foreground/60 text-xs leading-relaxed line-clamp-3">{n.body}</p>
                  </div>
                  <p className="text-foreground/25 text-[9px] mt-4 pt-2 border-t border-border/20 font-medium">{n.createdAt}</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   FRIENDS — GROW TOGETHER VIEW
══════════════════════════════════════════ */
function FriendsView() {
  const { user, partners, addPartner, removePartner } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<GrowthPartner | null>(partners[0] || null);
  const [copied, setCopied] = useState(false);
  
  // Active sub-tab inside the comparison analytics column
  const [centerTab, setCenterTab] = useState<"charts" | "insights" | "goals" | "feed">("charts");
  
  // Emoji reaction input
  const [reactionMsg, setReactionMsg] = useState("");
  
  // Real-time timeline feed simulation
  const [activities, setActivities] = useState<string[]>([
    "Jordan completed Coding session (10 XP)",
    "Jordan unlocked Early Bird Badge! 🌅",
    "Jordan finished Morning Run (20 XP) 🏃",
    "Jordan reached Level 15! ⚡"
  ]);

  const currentPartner = selectedPartner || partners[0] || null;

  useEffect(() => {
    if (!currentPartner) return;
    const interval = setInterval(() => {
      const name = currentPartner.name.split(" ")[0];
      const alerts = [
        `${name} completed Coding session (10 XP) 💻`,
        `${name} finished workout exercise (15 XP) 🏋️`,
        `${name} unlocked Habit Master badge! 🏆`,
        `${name} completed Shared Hydration Challenge milestone 💧`,
        `${name} finished Reading 30 min session 📚`,
        `${name} missed Habit (Cold Shower) 🚿`,
        `${name} completed Pomodoro study session 🧘`
      ];
      const randomMsg = alerts[Math.floor(Math.random() * alerts.length)];
      setActivities(prev => [randomMsg, ...prev.slice(0, 10)]);
    }, 18000);
    return () => clearInterval(interval);
  }, [currentPartner]);

  if (!user) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(user.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tryInvite = async () => {
    if (!inviteCode.trim()) return;
    setInviteMsg({ ok: false, msg: "Connecting..." });
    const result = await addPartner(inviteCode.trim());
    if ((result as any)?.ok || result === true) {
      setInviteMsg({ ok: true, msg: "Growth partner connected successfully! 🎉" });
      setInviteCode("");
      const added = (result as any)?.partner || partners[partners.length - 1] || null;
      if (added) setSelectedPartner(added);
    } else {
      const errMsg = (result as any)?.error || "Invalid code. Please check and try again.";
      setInviteMsg({ ok: false, msg: errMsg });
    }
    setTimeout(() => setInviteMsg(null), 5000);
  };

  // Structured profiles data representing LEFT and RIGHT users
  const userProfile = {
    avatar: user.avatar,
    name: user.name,
    level: user.level,
    xp: user.xp,
    currentStreak: user.streak,
    longestStreak: 42,
    healthScore: 85,
    careerScore: 76,
    productivityScore: 82,
    focusHours: 14.5,
    habitCompletion: 88,
    taskCompletion: 75,
    studyHours: 48.5,
    codingHours: 32,
    waterIntake: 6,
    sleepHours: 7.5,
    exercise: 45,
    mood: "😄 Great",
    achievements: 8,
    weeklyGoalsDone: 4,
    weeklyGoalsTotal: 5,
    monthlyGoalsDone: 8,
    monthlyGoalsTotal: 10,
    completedTasks: 24,
    pendingTasks: 4,
    missedTasks: 1,
    currentChallenge: "30-Day Hydration",
    currentRank: "Gold III"
  };

  // Build partner profile from REAL data returned by the server
  const partnerProfile = {
    avatar: currentPartner?.avatar || null,
    name: currentPartner?.name || "Growth Friend",
    level: currentPartner?.level || 1,
    xp: currentPartner?.xp || 0,
    currentStreak: currentPartner?.streak || 0,
    longestStreak: currentPartner?.longestStreak || currentPartner?.streak || 0,
    healthScore: currentPartner?.healthScore ?? 50,
    careerScore: currentPartner?.careerScore ?? 50,
    productivityScore: currentPartner?.productivityScore ?? 50,
    focusHours: currentPartner?.focusHours ?? 0,
    habitCompletion: currentPartner?.habitCompletion ?? 0,
    taskCompletion: currentPartner?.taskCompletion ?? 0,
    studyHours: currentPartner?.studyHours ?? 0,
    codingHours: currentPartner?.codingHours ?? 0,
    waterIntake: currentPartner?.waterIntake ?? 0,
    sleepHours: currentPartner?.sleepHours ?? 7,
    exercise: currentPartner?.exercise ?? 0,
    mood: currentPartner?.mood ?? "😐 Okay",
    achievements: currentPartner?.habits?.filter(h => h.done).length || 0,
    weeklyGoalsDone: currentPartner?.weeklyGoalsDone ?? 0,
    weeklyGoalsTotal: currentPartner?.weeklyGoalsTotal ?? 5,
    monthlyGoalsDone: currentPartner?.monthlyGoalsDone ?? 0,
    monthlyGoalsTotal: currentPartner?.monthlyGoalsTotal ?? 10,
    completedTasks: currentPartner?.completedTasks ?? 0,
    pendingTasks: currentPartner?.pendingTasks ?? 0,
    missedTasks: 0,
    currentChallenge: currentPartner?.currentChallenge ?? "None",
    currentRank: currentPartner?.currentRank ?? "Bronze I",
  };

  // Comparative charts data
  const chartsData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
    day,
    you: [65, 45, 80, 55, 92, 35, 70][i],
    friend: currentPartner ? currentPartner.weekProgress[i] : 0,
  }));

  const hoursData = [
    { name: "Coding Hours", you: userProfile.codingHours, friend: partnerProfile.codingHours },
    { name: "Study Hours", you: userProfile.studyHours, friend: partnerProfile.studyHours },
    { name: "Focus Hours", you: userProfile.focusHours, friend: partnerProfile.focusHours },
  ];

  const radarData = [
    { subject: "Habits %", you: userProfile.habitCompletion, friend: partnerProfile.habitCompletion, fullMark: 100 },
    { subject: "Health", you: userProfile.healthScore, friend: partnerProfile.healthScore, fullMark: 100 },
    { subject: "Career", you: userProfile.careerScore, friend: partnerProfile.careerScore, fullMark: 100 },
    { subject: "Productivity", you: userProfile.productivityScore, friend: partnerProfile.productivityScore, fullMark: 100 },
    { subject: "Streak Rate", you: Math.min(100, (userProfile.currentStreak / 50) * 100), friend: Math.min(100, (partnerProfile.currentStreak / 50) * 100), fullMark: 100 },
  ];

  // Mock Calendar Heatmap days (4x7 grid comparison)
  const heatmapDays = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    you: i % 4 !== 0,
    friend: i % 3 !== 0
  }));

  // Trigger social cheers activity
  const sendSocialReaction = (type: string) => {
    const friendShort = partnerProfile.name.split(" ")[0];
    let msg = "";
    if (type === "cheer") msg = `You sent Cheers & high-five to ${friendShort}! 💖`;
    else if (type === "motivation") msg = `You sent motivational support to ${friendShort}! 🔥`;
    else if (type === "emoji") {
      if (!reactionMsg.trim()) return;
      msg = `You reacted with "${reactionMsg}" on ${friendShort}'s progress!`;
      setReactionMsg("");
    }
    setActivities(prev => [msg, ...prev]);
    alert(msg);
  };

  return (
    <div className="p-7 space-y-6 text-foreground font-['Poppins']">
      
      {/* HEADER SECTION: Switch connected accountability partners */}
      <div className="flex justify-between items-center border-b border-border/40 pb-3.5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Co-op Growth Dashboard</h2>
          <p className="text-foreground/45 text-xs">Grow side-by-side with your accountability partners.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {partners.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground/50 font-bold">Current Partner:</span>
              <select
                value={currentPartner?.id || ""}
                onChange={e => setSelectedPartner(partners.find(p => p.id === e.target.value) || null)}
                className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground outline-none focus:border-primary"
              >
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {currentPartner && (
            <button
              onClick={() => { removePartner(currentPartner.id); setSelectedPartner(null); }}
              className="text-xs font-bold text-red-500 bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-xl hover:bg-red-500/10 transition-all"
            >
              Disconnect {currentPartner.name.split(" ")[0]}
            </button>
          )}
        </div>
      </div>

      {/* CORE THREE COLUMN PROFILE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Current User Profile Card */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="p-5 border-border bg-card shadow-sm space-y-4">
            <div className="text-center pb-3 border-b border-border/40 space-y-2">
              <div className="inline-block relative">
                <Avatar src={userProfile.avatar} name={userProfile.name} size="md" className="mx-auto ring-4 ring-primary/20" />
                <span className="absolute -bottom-1 -right-1 bg-primary text-white border border-card rounded-full text-[9px] px-1.5 font-extrabold uppercase">You</span>
              </div>
              <h3 className="text-sm font-extrabold text-foreground">{userProfile.name}</h3>
              <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-extrabold">{userProfile.currentRank}</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-foreground/50">
                  <span>Level {userProfile.level}</span>
                  <span>{userProfile.xp}/500 XP</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(userProfile.xp / 500) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                <div className="p-2 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-foreground/45 font-bold">Streak</p>
                  <p className="text-sm font-extrabold text-orange-500 flex justify-center items-center gap-0.5"><Flame size={12} /> {userProfile.currentStreak}</p>
                </div>
                <div className="p-2 bg-muted/40 rounded-xl border border-border/20">
                  <p className="text-foreground/45 font-bold">Longest</p>
                  <p className="text-sm font-extrabold text-foreground">{userProfile.longestStreak}</p>
                </div>
              </div>

              {/* Development metrics list */}
              <div className="divide-y divide-border/20 space-y-2.5 pt-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Health Score</span><span className="text-primary">{userProfile.healthScore}/100</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Career Score</span><span className="text-accent">{userProfile.careerScore}/100</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Productivity Score</span><span className="text-primary">{userProfile.productivityScore}/100</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Weekly Goals</span><span>{userProfile.weeklyGoalsDone}/{userProfile.weeklyGoalsTotal} done</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Monthly Goals</span><span>{userProfile.monthlyGoalsDone}/{userProfile.monthlyGoalsTotal} done</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Habit Completion</span><span className="text-primary">{userProfile.habitCompletion}%</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Focus Hours</span><span>{userProfile.focusHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Study Hours</span><span>{userProfile.studyHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Coding Hours</span><span>{userProfile.codingHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Water / Sleep</span><span>{userProfile.waterIntake}c / {userProfile.sleepHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Current Challenge</span><span className="truncate max-w-[120px]">{userProfile.currentChallenge}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                  <span>Completed / Pending</span><span>{userProfile.completedTasks} / {userProfile.pendingTasks}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* CENTER COLUMN: Comparison Analytics, insights, shared goals, timelines */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Sub-tab selection */}
          <div className="flex gap-2 p-1.5 bg-muted rounded-2xl border border-border/20 text-xs font-bold shadow-inner">
            {[
              { id: "charts", label: "Comparison Analytics" },
              { id: "insights", label: "Friend Insights" },
              { id: "goals", label: "Shared Goals" },
              { id: "feed", label: "Activity Feed" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCenterTab(tab.id as any)}
                className={`flex-1 py-2 text-center rounded-xl transition-all ${centerTab === tab.id ? "bg-card text-primary shadow-sm" : "text-foreground/45 hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Comparison Analytics Charts */}
          {centerTab === "charts" && (
            <div className="space-y-6">
              
              {/* Daily Progress Splits area chart */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3.5">
                <div>
                  <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">XP Progress Analysis</h3>
                  <p className="text-[10px] text-foreground/45 mt-0.5">Side-by-side weekly XP gains comparison</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartsData}>
                    <defs>
                      <linearGradient id="colYou" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5B3765" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#5B3765" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colFrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#BA88AE" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#BA88AE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="you" stroke="#5B3765" strokeWidth={2.5} fill="url(#colYou)" name="You" />
                    {currentPartner && <Area type="monotone" dataKey="friend" stroke="#BA88AE" strokeWidth={2.5} fill="url(#colFrd)" name={partnerProfile.name} />}
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Study & Coding Hours side-by-side comparison bar chart */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3.5">
                <div>
                  <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Focus & Coding Comparison</h3>
                  <p className="text-[10px] text-foreground/45 mt-0.5">Development workload metrics comparison</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="you" fill="#5B3765" name="You" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="friend" fill="#BA88AE" name={partnerProfile.name} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Radar comparison chart */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3.5">
                <div>
                  <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Co-op Balance Grid</h3>
                  <p className="text-[10px] text-foreground/45 mt-0.5">Strengths and skills mapping matrix</p>
                </div>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} />
                      <Radar name="You" dataKey="you" stroke="#5B3765" fill="#5B3765" fillOpacity={0.25} />
                      <Radar name={partnerProfile.name} dataKey="friend" stroke="#BA88AE" fill="#BA88AE" fillOpacity={0.25} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Comparative metric table with mini progress bars */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-4">
                <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Consistency & Habit Details</h3>
                <div className="space-y-3.5">
                  {[
                    { label: "Meditation Time", you: 70, friend: 60, valYou: "70m", valFrd: "60m" },
                    { label: "Exercise Level", you: 80, friend: 90, valYou: "45m", valFrd: "60m" },
                    { label: "Sleep Quality Score", you: 85, friend: 75, valYou: "Good", valFrd: "Fair" },
                    { label: "Hydration Streak", you: 75, friend: 95, valYou: "6/8c", valFrd: "8/8c" }
                  ].map(m => (
                    <div key={m.label} className="text-xs space-y-1">
                      <div className="flex justify-between font-bold text-foreground/80">
                        <span>{m.label}</span>
                        <span>You: {m.valYou} | Partner: {m.valFrd}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                        <div className="bg-primary h-full rounded-l-full" style={{ width: `${m.you / 2}%` }} />
                        <div className="bg-accent h-full rounded-r-full" style={{ width: `${m.friend / 2}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Calendar Heatmap side-by-side consistency comparison */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3">
                <div>
                  <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Consistency Map (28 Days)</h3>
                  <p className="text-[10px] text-foreground/45 mt-0.5">Comparing active days grid side-by-side</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-primary block mb-1.5">You</span>
                    <div className="grid grid-cols-7 gap-1">
                      {heatmapDays.map(d => (
                        <div key={d.id} className={`w-3.5 h-3.5 rounded-sm ${d.you ? "bg-primary" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-accent block mb-1.5">{partnerProfile.name.split(" ")[0]}</span>
                    <div className="grid grid-cols-7 gap-1">
                      {heatmapDays.map(d => (
                        <div key={d.id} className={`w-3.5 h-3.5 rounded-sm ${d.friend ? "bg-accent" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          )}

          {/* TAB 2: Friend Insights (AI-Style Insight cards) */}
          {centerTab === "insights" && (
            <div className="space-y-4">
              {[
                { title: "Study Hours Insight", desc: `You studied 5 more hours than ${partnerProfile.name} this week. Keep up the high focus study levels!`, color: "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                { title: "Streak Master", desc: `${partnerProfile.name} maintained a longer current streak of ${partnerProfile.currentStreak} Days. Complete study cycles to catch up!`, color: "bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400" },
                { title: "Coding Consistency", desc: "You both improved coding consistency! Over 10+ commits logged successfully this season.", color: "bg-primary/5 border-primary/10 text-primary dark:text-accent" },
                { title: "Wellness Advice", desc: "You should increase hydration. Your average daily cup intake is lagging behind your friend's rate.", color: "bg-red-500/5 border-red-500/10 text-red-500 dark:text-red-400" },
                { title: "Career Growth", desc: "You are leading in career growth milestones! Google interview stage remains active and complete.", color: "bg-purple-500/5 border-purple-500/10 text-purple-600 dark:text-purple-400" }
              ].map((ins, i) => (
                <Card key={i} className={`p-4 border ${ins.color} space-y-1 animate-scale-up`}>
                  <h4 className="text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles size={13} /> {ins.title}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">{ins.desc}</p>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 3: Shared Goals list */}
          {centerTab === "goals" && (
            <div className="space-y-4">
              {[
                { name: "Shared Reading Challenge", category: "Reading", progress: 65, reward: 200, leader: partnerProfile.name.split(" ")[0], streak: 12, deadline: "July 31, 2026" },
                { name: "Shared Coding Challenge", category: "Coding", progress: 80, reward: 300, leader: "You", streak: 23, deadline: "July 28, 2026" },
                { name: "Shared Workout Challenge", category: "Fitness", progress: 40, reward: 150, leader: partnerProfile.name.split(" ")[0], streak: 5, deadline: "Aug 10, 2026" },
                { name: "Shared Hydration Challenge", category: "Hydration", progress: 90, reward: 100, leader: "Equal", streak: 8, deadline: "July 24, 2026" },
                { name: "Shared Pomodoro", category: "Focus Study", progress: 55, reward: 250, leader: "You", streak: 15, deadline: "July 30, 2026" },
                { name: "Shared Study Session", category: "Learning", progress: 30, reward: 180, leader: "You", streak: 6, deadline: "Aug 15, 2026" }
              ].map(c => (
                <Card key={c.name} className="p-5 border-border bg-card shadow-sm space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{c.name}</h4>
                      <p className="text-[10px] text-foreground/45 uppercase tracking-wider mt-0.5">{c.category} · Deadline: {c.deadline}</p>
                    </div>
                    <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">🪙 {c.reward} Coins</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-foreground/50">
                      <span>Co-op Progress</span>
                      <span>{c.progress}% Completed</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${c.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-foreground/45 font-bold pt-1">
                    <span>Current Leader: <strong className="text-primary">{c.leader}</strong></span>
                    <span>Shared Streak: <strong className="text-orange-500">{c.streak} Days</strong></span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 4: Real-time timelines & Social features */}
          {centerTab === "feed" && (
            <div className="space-y-5 animate-scale-up">
              
              {/* Social interaction dashboard */}
              <Card className="p-4 border-border bg-card shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest"> Accountability Actions</h4>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={() => sendSocialReaction("cheer")} className="p-2.5 border border-border hover:border-primary/20 bg-muted/40 rounded-xl transition-all font-bold text-center">
                    Send Cheers 👍
                  </button>
                  <button onClick={() => sendSocialReaction("motivation")} className="p-2.5 border border-border hover:border-primary/20 bg-muted/40 rounded-xl transition-all font-bold text-center">
                    Send Motivation 🔥
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40">
                  <p className="text-[10px] font-bold text-foreground/50 uppercase">React with Custom emoji message</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Awesome coding streak! 💻🔥"
                      value={reactionMsg}
                      onChange={e => setReactionMsg(e.target.value)}
                      className="text-xs"
                    />
                    <button onClick={() => sendSocialReaction("emoji")} className="bg-primary text-white text-xs font-bold px-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center">
                      <Send size={12} />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 text-center">
                  <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-wider block mb-1">Voice Study Room</span>
                  <button onClick={() => alert("Voice Study Room is currently mock/placeholder for local testing.")} className="w-full py-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all">
                    🎙️ Join Voice Study Room (Placeholder)
                  </button>
                </div>
              </Card>

              {/* Feed updates list */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Co-op activity Timeline</h4>
                <div className="relative border-l border-border/40 pl-4 ml-1.5 space-y-4">
                  {activities.map((act, i) => (
                    <div key={i} className="relative text-xs">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                      <p className="font-semibold text-foreground/80 leading-relaxed">{act}</p>
                      <p className="text-[9px] text-foreground/45 mt-0.5">Just now · Socket.io sync</p>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Connected Friend Profile Card */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="p-5 border-border bg-card shadow-sm space-y-4">
            {currentPartner ? (
              <>
                <div className="text-center pb-3 border-b border-border/40 space-y-2">
                  <div className="inline-block relative">
                    <Avatar src={partnerProfile.avatar} name={partnerProfile.name} size="md" className="mx-auto ring-4 ring-accent/20" />
                    <span className="absolute -bottom-1 -right-1 bg-accent text-white border border-card rounded-full text-[9px] px-1.5 font-extrabold uppercase">Partner</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-foreground">{partnerProfile.name}</h3>
                  <p className="text-[10px] text-foreground/45 uppercase tracking-widest font-extrabold">{partnerProfile.currentRank}</p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-[10px] text-foreground/50">
                      <span>Level {partnerProfile.level}</span>
                      <span>{partnerProfile.xp}/500 XP</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${(partnerProfile.xp / 500) * 100}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                    <div className="p-2 bg-accent/5 rounded-xl border border-accent/10">
                      <p className="text-foreground/45 font-bold">Streak</p>
                      <p className="text-sm font-extrabold text-orange-500 flex justify-center items-center gap-0.5"><Flame size={12} /> {partnerProfile.currentStreak}</p>
                    </div>
                    <div className="p-2 bg-muted/40 rounded-xl border border-border/20">
                      <p className="text-foreground/45 font-bold">Longest</p>
                      <p className="text-sm font-extrabold text-foreground">{partnerProfile.longestStreak}</p>
                    </div>
                  </div>

                  {/* Development metrics list */}
                  <div className="divide-y divide-border/20 space-y-2.5 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Health Score</span><span className="text-primary">{partnerProfile.healthScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Career Score</span><span className="text-accent">{partnerProfile.careerScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Productivity Score</span><span className="text-primary">{partnerProfile.productivityScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Weekly Goals</span><span>{partnerProfile.weeklyGoalsDone}/{partnerProfile.weeklyGoalsTotal} done</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Monthly Goals</span><span>{partnerProfile.monthlyGoalsDone}/{partnerProfile.monthlyGoalsTotal} done</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Habit Completion</span><span className="text-primary">{partnerProfile.habitCompletion}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Focus Hours</span><span>{partnerProfile.focusHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Study Hours</span><span>{partnerProfile.studyHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Coding Hours</span><span>{partnerProfile.codingHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Water / Sleep</span><span>{partnerProfile.waterIntake}c / {partnerProfile.sleepHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Current Challenge</span><span className="truncate max-w-[120px]">{partnerProfile.currentChallenge}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-foreground/60 pt-2.5">
                      <span>Completed / Pending</span><span>{partnerProfile.completedTasks} / {partnerProfile.pendingTasks}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-foreground/35 space-y-3">
                <Users size={36} className="text-foreground/20" />
                <p className="text-xs">No partner connected.</p>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* FOOTER SECTION: Connect code trigger */}
      <Card className="p-5 border-border shadow-sm bg-card">
        <h3 className="text-sm font-extrabold font-['Plus_Jakarta_Sans'] mb-2">Invite and Grow Together</h3>
        <p className="text-foreground/45 text-xs mb-4">Connect with friend's invite codes to compare progress splits, streaks, study sessions and build habits together.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
          <div className="space-y-3">
            <p className="text-xs font-bold text-foreground/65">Your Invite Code</p>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5 border border-border">
              <span className="text-foreground font-extrabold text-sm font-['JetBrains_Mono'] flex-1 tracking-widest">{user.inviteCode}</span>
              <button
                onClick={copyCode}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border ${
                  copied
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border-transparent"
                }`}
              >
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-foreground/65">Connect Friend</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your friend's invite code"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                className="font-['JetBrains_Mono'] tracking-widest text-xs"
              />
              <button
                onClick={tryInvite}
                disabled={inviteCode.length < 6}
                className="bg-primary text-white px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
              >
                Connect
              </button>
            </div>
            {inviteMsg && (
              <p className={`text-xs ${inviteMsg.ok ? "text-emerald-500" : "text-[#ca5353]"} font-semibold mt-1`}>
                {inviteMsg.msg}
              </p>
            )}
            <p className="text-[10px] text-foreground/40 font-medium">
              Share your code above with a friend, then enter their code here to connect.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PROFILE VIEW
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   PROFILE VIEW
══════════════════════════════════════════ */
function ProfileView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { user, updateUser, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", bio: user?.bio || "" });
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { updateUser({ avatar: ev.target?.result as string }); };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    updateUser(form);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const goalLabels: Record<string, string> = { fitness: "Fitness 🏃", reading: "Reading 📚", career: "Career", coding: "Coding 💻", hydration: "Hydration 💧", sleep: "Sleep 🌙", mental: "Mental Wellness", selfcare: "Self Care", health: "Health ❤️", productivity: "Productivity" };

  return (
    <div className="p-7 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-extrabold text-xl font-['Plus_Jakarta_Sans']">My Profile</h2>
        {saved && <span className="text-emerald-400 text-sm flex items-center gap-1"><Check size={14} /> Saved!</span>}
      </div>

      {/* avatar + basic info */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="relative flex-shrink-0">
            <Avatar src={user.avatar} name={user.name} size="xl" className="ring-4 ring-primary/20" />
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform">
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>

          <div className="flex-1 w-full">
            {editing ? (
              <div className="space-y-3">
                <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <Textarea label="Bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} />
                <div className="flex gap-3">
                  <Btn onClick={saveProfile}><Save size={14} /> Save Changes</Btn>
                  <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-foreground font-extrabold text-xl font-['Plus_Jakarta_Sans']">{user.name}</h3>
                    <p className="text-foreground/40 text-sm">{user.email}</p>
                  </div>
                  <Btn variant="outline" onClick={() => setEditing(true)} className="text-xs"><Edit3 size={13} /> Edit</Btn>
                </div>
                <p className="text-foreground/60 text-sm mt-3 leading-relaxed">{user.bio}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-foreground/30 text-xs">Member since</span>
                  <span className="text-foreground/60 text-xs font-medium">{user.joinDate}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Level", value: user.level, icon: "⚡", color: "from-violet-500 to-purple-500" },
          { label: "XP Today", value: `${user.xp}`, icon: "🔥", color: "from-orange-500 to-red-500" },
          { label: "Streak", value: `${user.streak}d`, icon: "🏆", color: "from-amber-500 to-yellow-500" },
          { label: "Since", value: "Jan '25", icon: "📅", color: "from-cyan-500 to-blue-500" },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl mx-auto mb-2`}>{s.icon}</div>
            <p className="text-foreground font-extrabold text-xl font-['Plus_Jakarta_Sans']">{s.value}</p>
            <p className="text-foreground/40 text-xs mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* goals */}
      <Card className="p-5">
        <h3 className="text-foreground font-bold mb-4 font-['Plus_Jakarta_Sans']">My Goals</h3>
        <div className="flex flex-wrap gap-2">
          {(user.goals || []).map(g => (
            <span key={g} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold border border-primary/20">{goalLabels[g] || g}</span>
          ))}
          <button onClick={() => onNavigate("onboarding")} className="px-3 py-1.5 rounded-xl border border-dashed border-border text-foreground/30 text-xs hover:border-primary/30 hover:text-primary/50 transition-colors flex items-center gap-1">
            <Plus size={11} /> Edit Goals
          </button>
        </div>
      </Card>

      {/* invite code */}
      <Card className="p-5">
        <h3 className="text-foreground font-bold mb-3 font-['Plus_Jakarta_Sans']">Your Invite Code</h3>
        <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3 border border-border">
          <span className="text-foreground font-bold text-xl font-['JetBrains_Mono'] flex-1 tracking-widest">{user.inviteCode}</span>
          <button onClick={() => onNavigate("friends")} className="text-primary text-xs font-semibold hover:underline flex items-center gap-1"><Users size={12} /> Share</button>
        </div>
      </Card>

      {/* danger zone */}
      <Card className="p-5 border-red-500/10">
        <h3 className="text-foreground font-bold mb-3 font-['Plus_Jakarta_Sans']">Account</h3>
        <Btn variant="danger" onClick={() => { logout(); onNavigate("landing"); }}><LogOut size={14} /> Log Out</Btn>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   REMAINING VIEWS (condensed)
══════════════════════════════════════════ */
function HabitsView() {
  const { habits, addHabit, updateHabit, deleteHabit } = useAuth();
  const [filter, setFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("Fitness");
  const cats = ["All", "Fitness", "Reading", "Hydration", "Career", "Mental Health", "Sleep"];
  const filtered = filter === "All" ? habits : habits.filter(h => h.category === filter);

  const handleAddHabit = () => {
    if (!newName.trim()) return;
    addHabit({
      name: newName,
      category: newCat,
      icon: newCat === "Fitness" ? "🏃" : newCat === "Reading" ? "📚" : newCat === "Hydration" ? "💧" : newCat === "Career" ? "💻" : newCat === "Sleep" ? "🌙" : "🧘",
      priority: "medium",
      freq: "Daily",
      target: "1 time",
    });
    setNewName("");
    setShowAdd(false);
  };

  // Streaks chart data
  const chartData = habits.map(h => ({ name: h.name, streak: h.streak }));

  return (
    <div className="p-7 space-y-6">
      {/* Subheader from Mockup */}
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-extrabold font-['Plus_Jakarta_Sans']">Habit progress</h2>
          <p className="text-foreground/40 text-xs mt-0.5">Visualize your habits streak and progress</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} /> New +
        </button>
      </div>

      {/* Progress Chart with All Habit (Mockup Feature) */}
      <Card className="p-5 border-border shadow-sm bg-card">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest mb-4">Progress chart with all habit</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} label={{ value: 'Streak (Days)', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="streak" fill="#5B3765" radius={[6, 6, 0, 0]} maxBarSize={40} name="Streak (Days)">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#5B3765" : "#BA88AE"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Filter tab row */}
      <div className="flex gap-2 flex-wrap">
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filter === c
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-foreground/50 border-border hover:text-foreground/75"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Add Habit panel */}
      {showAdd && (
        <Card className="p-5 border-primary/20 bg-card shadow-sm">
          <h3 className="text-sm font-extrabold font-['Plus_Jakarta_Sans'] mb-4">Add New Habit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input label="Habit Name" placeholder="e.g. Morning Stretch" value={newName} onChange={e => setNewName(e.target.value)} />
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Category</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary"
              >
                {cats.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Btn onClick={handleAddHabit}>Add Habit</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Habits Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(h => (
          <Card key={h.id} className={`p-4 transition-all hover:border-primary/20 ${h.completedToday ? "border-primary/20 bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm">{h.icon}</span>
                <div>
                  <h4 className="text-foreground font-bold text-sm">{h.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-foreground/40 text-xs font-semibold">{h.category}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border uppercase ${priorityColor[h.priority] || ""}`}>
                      {h.priority}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteHabit(h.id)}
                className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground/35 hover:text-red-500 hover:bg-red-500/5 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4 border-t border-border/40 pt-3">
              <span className="text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1">
                <Flame size={12} /> {h.streak} days streak
              </span>
              <button
                onClick={() => updateHabit(h.id, { completedToday: !h.completedToday })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                  h.completedToday
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-foreground/50 border-border hover:border-primary/20"
                }`}
              >
                {h.completedToday ? <><CheckCircle2 size={12} /> Done</> : <><Circle size={12} /> Mark Done</>}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HealthView() {
  const [water, setWater] = useState(5);
  const [mood, setMood] = useState("good");
  return (
    <div className="p-7 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><Droplets className="text-cyan-400" size={18} /><h3 className="text-foreground font-bold">Hydration</h3></div>
          <div className="flex items-end justify-between mb-3"><span className="text-4xl font-extrabold text-foreground font-['Plus_Jakarta_Sans']">{water}<span className="text-lg text-foreground/30">/8</span></span><span className="text-cyan-400 text-sm">glasses</span></div>
          <div className="flex gap-1.5 mb-4">{Array.from({ length: 8 }).map((_, i) => <button key={i} onClick={() => setWater(i + 1)} className={`flex-1 h-6 rounded-md transition-all ${i < water ? "bg-cyan-500" : "bg-muted hover:bg-muted/80"}`} />)}</div>
          <div className="flex gap-2"><Btn variant="ghost" onClick={() => setWater(w => Math.max(0, w - 1))} className="flex-1">−</Btn><Btn variant="outline" onClick={() => setWater(w => Math.min(8, w + 1))} className="flex-1 text-cyan-400">+ Glass</Btn></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><Moon className="text-indigo-400" size={18} /><h3 className="text-foreground font-bold">Sleep</h3></div>
          <div className="flex items-center justify-between mb-3"><span className="text-foreground/50 text-sm">Last night</span><span className="text-2xl font-extrabold text-foreground font-['Plus_Jakarta_Sans']">7.5h</span></div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: "93%" }} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted border border-border"><p className="text-foreground/40 text-xs">Quality</p><p className="text-foreground font-bold text-sm mt-0.5">Deep Sleep</p></div>
            <div className="p-3 rounded-xl bg-muted border border-border"><p className="text-foreground/40 text-xs">7-day avg</p><p className="text-foreground font-bold text-sm mt-0.5">7.2 hrs</p></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><Smile className="text-amber-400" size={18} /><h3 className="text-foreground font-bold">Mood</h3></div>
          <div className="grid grid-cols-3 gap-2">
            {[["😄","great"],["😊","good"],["😐","okay"],["😔","sad"],["😰","stressed"],["😤","angry"]].map(([e,m]) => (
              <button key={m} onClick={() => setMood(m)} className={`p-2.5 rounded-xl flex flex-col items-center gap-1 border transition-all ${mood === m ? "border-amber-500/40 bg-amber-500/10" : "border-border hover:border-border"}`}>
                <span className="text-lg">{e}</span><span className="text-[10px] text-foreground/40 capitalize">{m}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5"><Activity className="text-emerald-400" size={18} /><h3 className="text-foreground font-bold">Health Score Breakdown</h3></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[["Hydration",62,"#06b6d4"],["Sleep",78,"#6366f1"],["Exercise",85,"#f59e0b"],["Nutrition",70,"#10b981"],["Mental",88,"#ec4899"]].map(([l,s,c]) => (
            <div key={l as string} className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
                  <circle cx="30" cy="30" r="22" fill="none" stroke="var(--muted)" strokeWidth="6" />
                  <circle cx="30" cy="30" r="22" fill="none" stroke={c as string} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2*Math.PI*22}`} strokeDashoffset={`${2*Math.PI*22*(1-(s as number)/100)}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-foreground font-['JetBrains_Mono']">{s}</span></div>
              </div>
              <span className="text-foreground/50 text-xs mt-2">{l}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const weekData = [
  { day: "Mon", habits: 8 }, { day: "Tue", habits: 6 }, { day: "Wed", habits: 9 },
  { day: "Thu", habits: 7 }, { day: "Fri", habits: 10 }, { day: "Sat", habits: 5 }, { day: "Sun", habits: 8 },
];
function CareerView() {
  const { user } = useAuth();
  
  // Simulated Interview applications tracker data
  const interviews = [
    { company: "Google", role: "Frontend Engineer", stage: "Onsite Technical", date: "2026-07-22", color: "text-amber-500 bg-amber-500/10" },
    { company: "Stripe", role: "Software Engineer", stage: "System Design", date: "2026-07-28", color: "text-indigo-500 bg-indigo-500/10" },
    { company: "Vercel", role: "React Engineer", stage: "Resume Review", date: "2026-08-04", color: "text-foreground/50 bg-muted" }
  ];

  // GitHub contribution grid simulator data
  const commitGrid = Array.from({ length: 7 * 20 }, (_, i) => ({
    id: i,
    level: i % 7 === 0 ? 0 : i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1
  }));

  const commitColors = [
    "bg-muted/30 dark:bg-muted/15", // 0
    "bg-[#F3CCDE]",                 // 1
    "bg-[#BA88AE]",                 // 2
    "bg-[#5B3765]",                 // 3
  ];

  return (
    <div className="p-7 space-y-6 text-foreground font-['Poppins']">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Study Hours", value: "48.5 hrs", desc: "This Month Progress", percent: 72, color: "bg-primary" },
          { title: "Coding Sessions", value: "31 cycles", desc: "This Month Progress", percent: 85, color: "bg-accent" },
          { title: "Career Readiness", value: "76/100", desc: "Growth Score", percent: 76, color: "bg-primary" }
        ].map(item => (
          <Card key={item.title} className="p-5 bg-card border-border shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-extrabold text-foreground/40 uppercase tracking-widest">{item.title}</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-1">{item.value}</h3>
              <p className="text-[10px] text-foreground/45 mt-0.5">{item.desc}</p>
            </div>
            <div className="mt-4">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* GitHub Contributions Graph Simulation */}
      <Card className="p-5 border-border bg-card shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Self-Study Coding Activity</h4>
            <p className="text-xs text-foreground/50 mt-0.5">Mock git commits logged on GrowSync platform</p>
          </div>
          <span className="text-[10px] text-primary font-bold">142 contributions this season</span>
        </div>
        
        {/* Contributions Grid */}
        <div className="flex flex-wrap gap-1 items-center py-2 max-w-full overflow-x-auto">
          {commitGrid.map(cell => (
            <div
              key={cell.id}
              className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-110 ${commitColors[cell.level]}`}
              title={`Contributions logged level: ${cell.level}`}
            />
          ))}
        </div>
        <div className="flex justify-end gap-1.5 items-center text-[9px] text-foreground/40 font-bold">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-muted/30" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#F3CCDE]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#BA88AE]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#5B3765]" />
          <span>More</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Skills Progression */}
        <Card className="p-5 border-border bg-card shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Skill Progress</h3>
          <div className="space-y-4">
            {[
              { sk: "Python Algorithms", lvl: 78 },
              { sk: "React Native Framework", lvl: 82 },
              { sk: "System Architecture Design", lvl: 40 }
            ].map(item => (
              <div key={item.sk}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-foreground/80 text-xs font-bold">{item.sk}</span>
                  <span className="text-primary text-xs font-extrabold font-['Poppins']">{item.lvl}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${item.lvl}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Interview Applications Tracker */}
        <Card className="p-5 border-border bg-card shadow-sm space-y-3">
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Interview Tracker</h3>
          <div className="divide-y divide-border/40">
            {interviews.map(inv => (
              <div key={inv.company} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs">
                <div>
                  <p className="font-extrabold text-foreground/85">{inv.company}</p>
                  <p className="text-[10px] text-foreground/40 mt-0.5">{inv.role}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${inv.color}`}>{inv.stage}</span>
                  <p className="text-[9px] text-foreground/40 mt-1 font-medium">{inv.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}

function FocusView() {
  const { addFocusSession } = useAuth();
  const [duration, setDuration] = useState(25); // mins
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [focusCategory, setFocusCategory] = useState("Coding");

  useEffect(() => {
    setTimeLeft(duration * 60);
  }, [duration]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      addFocusSession({ duration, category: focusCategory });
      alert(`Focus session complete! You earned 10 XP and 5 GrowCoins.`);
      setTimeLeft(duration * 60);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, duration, focusCategory, addFocusSession]);

  const format = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      <Card className="p-8 text-center space-y-5">
        <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary">Focus Session Timer</span>
        <div className="text-6xl font-extrabold text-primary tracking-wider">{format(timeLeft)}</div>
        <div className="flex justify-center gap-2">
          {[15, 25, 45, 60].map(mins => (
            <button
              key={mins}
              onClick={() => { setIsActive(false); setDuration(mins); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${duration === mins ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-foreground/50 border-border"}`}
            >
              {mins}m
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 justify-center items-center">
          <span className="text-xs text-foreground/50 font-bold">Focusing Category:</span>
          <select
            value={focusCategory}
            onChange={e => setFocusCategory(e.target.value)}
            className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground outline-none"
          >
            <option value="Coding">Coding Practice 💻</option>
            <option value="Reading">Book Reading 📚</option>
            <option value="Design">Product Design 🎨</option>
            <option value="Mindfulness">Mindfulness 🧘</option>
          </select>
        </div>
        <div className="flex gap-4 max-w-xs mx-auto pt-2">
          <Btn onClick={() => setIsActive(!isActive)} className="flex-1">
            {isActive ? "Pause Focus" : "Start Deep Work"}
          </Btn>
          <Btn onClick={() => { setIsActive(false); setTimeLeft(duration * 60); }} variant="outline" className="flex-1">
            Reset
          </Btn>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5 space-y-3">
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Ambient white sounds</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { name: "Rain Storm 🌧️", active: "Rain storm sound active" },
              { name: "Summer Birds 🌲", active: "Bird sounds active" },
              { name: "Ocean Breeze 🌊", active: "Sea breeze sound active" },
              { name: "White Noise 🔇", active: "Static noise active" }
            ].map(s => (
              <button key={s.name} onClick={() => alert(`${s.name} selected!`)} className="p-3 border border-border rounded-2xl hover:border-primary/20 transition-all font-bold bg-muted/40 text-foreground/75">
                {s.name}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest mb-2.5">Focus Room Shortcuts</h3>
            <p className="text-xs text-foreground/50 leading-relaxed mb-4">Connect to your favorite productivity playlist or open your Spotify application directly.</p>
          </div>
          <a href="https://open.spotify.com" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 font-bold transition-all text-xs gap-1.5">
            Launch Spotify Web Player 🎧
          </a>
        </Card>
      </div>
    </div>
  );
}

function GoalsView() {
  const { goalsList, addGoal, deleteGoal } = useAuth();
  const [title, setTitle] = useState("");
  const [tf, setTf] = useState<"year" | "quarter" | "month">("month");
  const [mile, setMile] = useState("");

  const handleAddGoal = () => {
    if (!title.trim()) return;
    addGoal({
      title,
      timeframe: tf,
      progress: 0,
      milestones: mile ? mile.split(",").map(x => x.trim()) : [],
      dueDate: new Date().toISOString().split("T")[0]
    });
    setTitle("");
    setMile("");
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      {/* Vision Board Cards Deck */}
      <Card className="p-5 bg-gradient-to-r from-violet-500/5 to-pink-500/5 border-dashed border-primary/20">
        <h3 className="text-xs font-extrabold text-primary uppercase tracking-widest mb-2">My vision board</h3>
        <p className="text-xs text-foreground/50 mb-3">Jot down keywords or pictures that inspire you to accomplish your quarterly milestones.</p>
        <div className="flex gap-3 flex-wrap">
          {["Read 24 Books 📚", "Master React Native 📱", "Run 100km 🏃", "Stay hydrated 💧"].map(v => (
            <span key={v} className="bg-card px-3.5 py-2 rounded-2xl border border-border shadow-sm text-xs font-bold text-foreground/80">{v}</span>
          ))}
        </div>
      </Card>

      {/* Add goal */}
      <Card className="p-5 border-border bg-card space-y-4">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Create New Goal</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Goal Title" placeholder="e.g. Learn System Design" value={title} onChange={e => setTitle(e.target.value)} />
          <div>
            <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Timeframe</label>
            <select value={tf} onChange={e => setTf(e.target.value as any)} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary">
              <option value="year">Yearly Goal</option>
              <option value="quarter">Quarterly Goal</option>
              <option value="month">Monthly Goal</option>
            </select>
          </div>
          <Input label="Milestones (comma-separated)" placeholder="e.g. watch videos, build demo" value={mile} onChange={e => setMile(e.target.value)} />
        </div>
        <Btn onClick={handleAddGoal}>Add Goal</Btn>
      </Card>

      {/* Goal items listing */}
      <div className="space-y-4">
        {goalsList.map(g => (
          <Card key={g.id} className="p-5 border-border bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold">{g.title}</h4>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase">{g.timeframe}</span>
              </div>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {g.milestones.map(m => (
                  <span key={m} className="text-[10px] text-foreground/45 bg-muted px-2.5 py-0.5 rounded-lg border border-border/20 font-medium">✓ {m}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="text-right">
                <span className="text-[10px] text-foreground/40 block">Progress</span>
                <span className="text-xs font-extrabold text-primary">{g.progress}%</span>
              </div>
              <button onClick={() => deleteGoal(g.id)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/35 hover:text-red-500 hover:bg-red-500/5 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LearningView() {
  const [roadmapSteps, setRoadmapSteps] = useState([
    { step: 1, title: "HTML & CSS basics", desc: "Flexbox, CSS grid, semantic elements", done: true },
    { step: 2, title: "JavaScript Core ES6+", desc: "Promises, async/await, closures", done: true },
    { step: 3, title: "React Fundamentals", desc: "Hooks, routing, virtual DOM", done: true },
    { step: 4, title: "TypeScript Integration", desc: "Types, interfaces, generic parameters", done: false },
    { step: 5, title: "Full Stack Node/Express", desc: "REST APIs, database queries, JWT auth", done: false }
  ]);

  const toggleStep = (stepIdx: number) => {
    setRoadmapSteps(prev => prev.map((s, i) => i === stepIdx ? { ...s, done: !s.done } : s));
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      {/* Learning Roadmap Steps */}
      <Card className="p-5 border-border bg-card space-y-4">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Self-Study Roadmap Progress</h3>
        <div className="relative border-l border-border pl-6 ml-2 space-y-5">
          {roadmapSteps.map((r, idx) => (
            <div key={r.step} className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={() => toggleStep(idx)}>
              <div className={`absolute -left-9 top-0.5 w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${r.done ? "bg-primary border-transparent text-white shadow-sm" : "bg-muted border-border text-foreground/35"}`}>
                {r.done ? "✓" : r.step}
              </div>
              <div>
                <h4 className={`text-xs font-bold ${r.done ? "text-foreground" : "text-foreground/60"}`}>{r.title}</h4>
                <p className="text-[10px] text-foreground/45 mt-0.5 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Certificates & accomplishments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-border bg-card space-y-3">
          <h4 className="text-xs font-extrabold flex items-center gap-1"><Trophy size={14} className="text-amber-500" /> Active Certificates</h4>
          <div className="p-3 bg-muted/40 border border-border/30 rounded-xl">
            <p className="text-xs font-bold">Meta Front-End Developer certificate</p>
            <p className="text-[9px] text-foreground/40 mt-1">Acquired March 2025 · Credential ID: META-78Y2</p>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card space-y-3">
          <h4 className="text-xs font-extrabold flex items-center gap-1"><BookOpen size={14} className="text-primary" /> Recommended Courses</h4>
          <div className="p-3 bg-muted/40 border border-border/30 rounded-xl">
            <p className="text-xs font-bold text-primary">Advanced TypeScript with React</p>
            <p className="text-[9px] text-foreground/40 mt-1">Level up your generic typing skills · 12 hours</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function JournalView() {
  const { journals, addJournal } = useAuth();
  const [mood, setMood] = useState("😄");
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [lessons, setLessons] = useState("");

  const handleAddJournal = () => {
    if (!wins.trim() && !challenges.trim()) return;
    addJournal({ mood, wins, challenges, gratitude, lessons });
    setWins("");
    setChallenges("");
    setGratitude("");
    setLessons("");
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      <Card className="p-5 border-border bg-card space-y-4">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">New Journal Entry</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-foreground/50 font-bold mr-1">Select Mood:</span>
          {["😄", "😊", "😐", "😔", "😰", "😤", "🧘"].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border transition-all ${mood === m ? "bg-primary/10 border-primary scale-105" : "border-border hover:bg-muted"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Textarea label="Today's Wins" placeholder="What went well today?" value={wins} onChange={e => setWins(e.target.value)} rows={2} />
          <Textarea label="Today's Challenges" placeholder="What challenges did you face?" value={challenges} onChange={e => setChallenges(e.target.value)} rows={2} />
          <Textarea label="Gratitude focus" placeholder="Name 3 things you are grateful for today..." value={gratitude} onChange={e => setGratitude(e.target.value)} rows={2} />
          <Textarea label="Lessons Learned" placeholder="What will you do differently next time?" value={lessons} onChange={e => setLessons(e.target.value)} rows={2} />
        </div>
        <Btn onClick={handleAddJournal}>Save Reflection Journal</Btn>
      </Card>

      {/* Logged reflections */}
      <div className="space-y-4">
        {journals.map(j => (
          <Card key={j.id} className="p-5 border-border bg-card space-y-3">
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-[10px] text-foreground/45 font-bold uppercase tracking-wider">Reflected on {j.date}</span>
              <span className="text-lg bg-muted px-2 py-0.5 rounded-full border border-border/20">{j.mood}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {j.wins && <div><p className="text-primary font-bold">Wins</p><p className="text-foreground/70 mt-0.5 leading-relaxed">{j.wins}</p></div>}
              {j.challenges && <div><p className="text-red-500 font-bold">Challenges</p><p className="text-foreground/70 mt-0.5 leading-relaxed">{j.challenges}</p></div>}
              {j.gratitude && <div className="col-span-1 md:col-span-2 border-t border-border/30 pt-2"><p className="text-accent font-bold">Gratitude Focus</p><p className="text-foreground/60 mt-0.5 leading-relaxed">{j.gratitude}</p></div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TimeTrackerView() {
  const { focusSessions } = useAuth();
  const [seconds, setSeconds] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let interval: any;
    if (active) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [active]);

  const format = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const totalMinutes = focusSessions.reduce((acc, curr) => acc + curr.duration, 0);

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 flex flex-col justify-between md:col-span-2 bg-gradient-to-br from-primary/5 to-accent/5">
          <div>
            <span className="text-[10px] text-primary font-extrabold uppercase tracking-widest">Active stopwatch focus session</span>
            <div className="text-5xl font-extrabold text-primary tracking-wider mt-2.5">{format(seconds)}</div>
            <p className="text-xs text-foreground/45 mt-1">Log focus time for custom projects or learning roadmaps</p>
          </div>
          <div className="flex gap-3 mt-5">
            <Btn onClick={() => setActive(!active)} variant={active ? "outline" : "primary"} className="flex-1">
              {active ? "Pause session" : "Start Time Tracker"}
            </Btn>
            <Btn onClick={() => { setActive(false); setSeconds(0); }} variant="ghost" className="border border-border">Reset</Btn>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-foreground/40 font-extrabold uppercase tracking-widest">Deep focus logged</span>
            <div className="text-4xl font-extrabold text-primary mt-2">{totalMinutes} <span className="text-sm text-foreground/40 font-normal">mins</span></div>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-border/40 text-xs">
            <div className="flex justify-between"><span>Most active hour</span><span className="font-extrabold text-primary">09:00 AM</span></div>
            <div className="flex justify-between"><span>Total focus cycles</span><span className="font-extrabold text-accent">{focusSessions.length} sessions</span></div>
          </div>
        </Card>
      </div>

      <Card className="p-5 border-border bg-card">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest mb-4">Focus sessions log timeline</h3>
        <div className="space-y-2.5">
          {focusSessions.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 border border-border/40 bg-muted/20 rounded-xl text-xs">
              <div>
                <p className="font-extrabold">{s.category} Session</p>
                <p className="text-[10px] text-foreground/40 mt-0.5">{s.date}</p>
              </div>
              <span className="text-primary font-extrabold">{s.duration} minutes</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AchievementsView() {
  const { user, coins, rewards, buyReward } = useAuth();
  
  const badges = [
    { id: "b1", name: "Early Bird", desc: "Wake up before 6 AM for 5 consecutive days", icon: "🌅", unlocked: true },
    { id: "b2", name: "Habit Master", desc: "Reach 21-day streak on any habit", icon: "🏆", unlocked: true },
    { id: "b3", name: "Deep Thinker", desc: "Complete 10 hours of deep work sessions", icon: "🧠", unlocked: false },
    { id: "b4", name: "Study Partner", desc: "Participate in 3 shared Pomodoro tasks", icon: "👥", unlocked: false },
  ];

  const handleBuyReward = (id: string) => {
    const ok = buyReward(id);
    if (ok) {
      alert("Item purchased successfully!");
    } else {
      alert("Not enough GrowCoins or item already purchased.");
    }
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      {/* Season Pass tracker */}
      <Card className="p-5 border-border bg-card space-y-4">
        <div className="flex justify-between items-center border-b border-border/40 pb-2">
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Season Pass Progress (Season 1)</h3>
          <span className="text-xs text-primary font-bold">Current Tier: 4</span>
        </div>
        <div className="h-4 rounded-full bg-muted overflow-hidden relative flex items-center">
          <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: "45%" }} />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-foreground/60 font-bold">45% to Tier 5 Reward (Custom Soundscape)</span>
        </div>
      </Card>

      {/* Badges Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Unlocked Badges</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map(b => (
            <Card key={b.id} className={`p-4 text-center flex flex-col items-center justify-between border transition-all ${b.unlocked ? "border-primary/20 bg-primary/5" : "border-border opacity-50 bg-card"}`}>
              <span className="text-4xl filter drop-shadow-sm mb-2">{b.icon}</span>
              <div>
                <h4 className="text-xs font-bold truncate">{b.name}</h4>
                <p className="text-[9px] text-foreground/40 mt-1 leading-normal max-w-[120px] mx-auto">{b.desc}</p>
              </div>
              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border mt-3 ${b.unlocked ? "border-primary/30 text-primary bg-primary/10" : "border-border text-foreground/35"}`}>
                {b.unlocked ? "Unlocked" : "Locked"}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* Rewards Store */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">GrowCoins Store</h3>
          <span className="text-xs text-primary font-extrabold">Your Balance: 🪙 {coins} coins</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map(r => (
            <Card key={r.id} className="p-4 border-border bg-card flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{r.icon}</span>
                <div>
                  <h4 className="text-xs font-bold">{r.name}</h4>
                  <p className="text-[9px] text-foreground/40 mt-0.5">{r.category} Accessory</p>
                </div>
              </div>
              <button
                onClick={() => handleBuyReward(r.id)}
                disabled={r.bought}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${r.bought ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-primary text-white border-transparent hover:opacity-90 disabled:opacity-50"}`}
              >
                {r.bought ? "Bought" : `🪙 ${r.cost}`}
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView() {
  const habitCategories = [
    { name: "Fitness", value: 32, color: "#5B3765" },
    { name: "Reading", value: 24, color: "#9E6899" },
    { name: "Coding", value: 20, color: "#BA88AE" },
    { name: "Wellness", value: 14, color: "#D6A8C4" },
    { name: "Sleep", value: 10, color: "#F3CCDE" }
  ];
  const monthData = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, xp: Math.floor(Math.random() * 200 + 100) }));
  return (
    <div className="p-7 space-y-6 text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5 border-border bg-card shadow-sm">
          <h3 className="text-foreground font-bold mb-4">XP Earned (Monthly)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthData}>
              <defs>
                <linearGradient id="xpG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B3765" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#5B3765" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" stroke="#5B3765" strokeWidth={2.5} fill="url(#xpG)" name="XP" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5 border-border bg-card shadow-sm">
          <h3 className="text-foreground font-bold mb-4">Habit Split</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={habitCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {habitCategories.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2.5 justify-center mt-2">
            {habitCategories.map(c => (
              <div key={c.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-foreground/50 text-xs font-semibold">{c.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[["12,450","Total XP","⚡"],["67 days","Best Streak","🔥"],["843","Habits Done","✅"],["4","Challenges Won","🏆"]].map(([v,l,e]) => (
          <Card key={l} className="p-4 text-center border-border bg-card shadow-sm"><span className="text-2xl">{e}</span><p className="text-xl font-extrabold text-foreground font-['Plus_Jakarta_Sans'] mt-2">{v}</p><p className="text-foreground/40 text-xs mt-0.5">{l}</p></Card>
        ))}
      </div>
    </div>
  );
}

function ChallengesView() {
  const [joined, setJoined] = useState<number[]>([1]);
  const challenges = [
    { id: 1, name: "30-Day Hydration Challenge", icon: "💧", participants: 1247, duration: "30 days", xp: 500, difficulty: "Easy", desc: "Drink 8 glasses of water daily for 30 consecutive days." },
    { id: 2, name: "Code Every Day", icon: "💻", participants: 3891, duration: "30 days", xp: 800, difficulty: "Hard", desc: "Dedicate at least 1 hour to coding practice every single day." },
    { id: 3, name: "Morning Warrior", icon: "🌅", participants: 892, duration: "21 days", xp: 600, difficulty: "Medium", desc: "Wake up before 6 AM and complete your morning routine for 21 days." },
    { id: 4, name: "Bookworm Sprint", icon: "📚", participants: 2103, duration: "14 days", xp: 400, difficulty: "Easy", desc: "Read at least 30 minutes every day for 2 weeks." },
    { id: 5, name: "Fitness Beast Mode", icon: "🏋️", participants: 4502, duration: "30 days", xp: 900, difficulty: "Hard", desc: "Complete a workout session every day for 30 days." },
    { id: 6, name: "Mindfulness Journey", icon: "🧘", participants: 1876, duration: "21 days", xp: 550, difficulty: "Medium", desc: "Meditate for at least 10 minutes daily and journal your thoughts." },
  ];
  return (
    <div className="p-7"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {challenges.map(c => {
        const isJoined = joined.includes(c.id);
        return (
          <Card key={c.id} className={`p-5 hover:border-primary/20 transition-all ${isJoined ? "border-primary/20" : ""}`}>
            <div className="flex items-start justify-between mb-3"><span className="text-3xl">{c.icon}</span><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${c.difficulty==="Easy"?"bg-emerald-500/10 text-emerald-400":c.difficulty==="Medium"?"bg-amber-500/10 text-amber-400":"bg-red-500/10 text-red-400"}`}>{c.difficulty}</span></div>
            <h4 className="text-foreground font-bold mb-1.5">{c.name}</h4>
            <p className="text-foreground/40 text-xs leading-relaxed mb-4">{c.desc}</p>
            <div className="flex items-center gap-3 text-xs text-foreground/40 mb-4"><span><Users size={11} className="inline mr-1"/>{c.participants.toLocaleString()}</span><span><Calendar size={11} className="inline mr-1"/>{c.duration}</span><span className="text-primary font-bold">+{c.xp} XP</span></div>
            <Btn onClick={() => setJoined(j => isJoined ? j.filter(x=>x!==c.id) : [...j, c.id])} variant={isJoined ? "outline" : "primary"} className="w-full">
              {isJoined ? "✓ Joined" : "Join Challenge"}
            </Btn>
          </Card>
        );
      })}
    </div></div>
  );
}

/* ══════════════════════════════════════════
   APP SHELL
══════════════════════════════════════════ */
const viewMeta: Record<string, { title: string; subtitle: string }> = {
  tasks: { title: "My Tasks", subtitle: "Manage your personal to-do list" },
  habits: { title: "Habit Tracker", subtitle: "Build systems that last" },
  health: { title: "Health Tracking", subtitle: "Body & mind wellness" },
  career: { title: "Career Growth", subtitle: "Skills, study hours & AI coaching" },
  challenges: { title: "Challenges", subtitle: "Push limits with the community" },
  friends: { title: "Grow Together", subtitle: "Grow side-by-side with your partners" },
  analytics: { title: "Analytics", subtitle: "Your growth in numbers" },
  profile: { title: "My Profile", subtitle: "Manage your account and settings" },
};

function QuickAddTaskModal({ onClose }: { onClose: () => void }) {
  const { addTask } = useAuth();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Career");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueTime, setDueTime] = useState("12:00");
  const [estimatedDuration, setEstimatedDuration] = useState("30 mins");
  const [reminder, setReminder] = useState(false);
  const [tags, setTags] = useState("");
  const [recurring, setRecurring] = useState<"none" | "daily" | "weekly" | "monthly">("none");

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on clicking outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title,
      note,
      category,
      priority,
      done: false,
      dueDate,
      dueTime,
      estimatedDuration,
      reminder,
      tags,
      recurring
    });
    onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4 select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-6 max-w-lg w-full bg-card backdrop-blur-xl border border-border space-y-4 rounded-[24px] shadow-2xl card-neumorphic text-card-foreground relative"
      >
        <div className="flex justify-between items-center border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h3 className="font-extrabold text-base text-foreground font-['Poppins']">Quick Add Task</h3>
          </div>
          <button onClick={onClose} className="text-foreground/40 hover:text-foreground text-sm font-bold w-6 h-6 rounded-full hover:bg-muted/40 flex items-center justify-center transition-all">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Task Title" placeholder="e.g. Finish React native components" value={title} onChange={e => setTitle(e.target.value)} required />
          <Textarea label="Description / Notes" placeholder="Add some context details..." value={note} onChange={e => setNote(e.target.value)} rows={2} />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-xs font-bold outline-none focus:border-primary">
                <option value="Career">Career Growth 💻</option>
                <option value="Personal">Personal 🏠</option>
                <option value="Fitness">Fitness 🏃</option>
                <option value="Reading">Reading 📚</option>
                <option value="Wellness">Wellness 🧘</option>
              </select>
            </div>
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Recurring Task</label>
              <select value={recurring} onChange={e => setRecurring(e.target.value as any)} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-xs font-bold outline-none focus:border-primary">
                <option value="none">No Repeat</option>
                <option value="daily">Daily 🔄</option>
                <option value="weekly">Weekly 🔄</option>
                <option value="monthly">Monthly 🔄</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-xs font-bold outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Due Time</label>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-xs font-bold outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Duration</label>
              <input type="text" placeholder="e.g. 45m" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-xs font-bold outline-none focus:border-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <Input label="Tags (comma separated)" placeholder="react, study" value={tags} onChange={e => setTags(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-4 pl-1 select-none">
              <input type="checkbox" id="reminder-toggle" checked={reminder} onChange={e => setReminder(e.target.checked)} className="w-4.5 h-4.5 accent-primary cursor-pointer" />
              <label htmlFor="reminder-toggle" className="text-xs font-bold text-foreground/60 cursor-pointer">Enable Reminders</label>
            </div>
          </div>

          <div>
            <label className="block text-foreground/50 text-xs mb-1.5 font-bold">Priority</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 rounded-xl border text-[10px] uppercase font-bold tracking-wider transition-all ${priority === p ? "bg-primary text-white border-transparent" : "bg-muted border-border text-foreground/45"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Btn type="submit" className="flex-1">Create Task</Btn>
            <Btn type="button" variant="ghost" onClick={onClose} className="flex-1 border border-border">Cancel</Btn>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AppShell({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const navigate = (v: View) => {
    if (["landing", "login", "onboarding"].includes(v)) { onNavigate(v); return; }
    setView(v);
  };
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active={view} onNavigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onNavigate={navigate} onQuickAdd={() => setShowQuickAdd(true)} />
        <main className="flex-1 overflow-y-auto">
          {view === "dashboard" && <DashboardView onNavigate={navigate} onQuickAdd={() => setShowQuickAdd(true)} />}
          {view === "tasks" && <TasksView />}
          {view === "habits" && <HabitsView />}
          {view === "health" && <HealthView />}
          {view === "career" && <CareerView />}
          {view === "challenges" && <ChallengesView />}
          {view === "friends" && <FriendsView />}
          {view === "analytics" && <AnalyticsView />}
          {view === "profile" && <ProfileView onNavigate={navigate} />}
          {view === "focus" && <FocusView />}
          {view === "goals" && <GoalsView />}
          {view === "learning" && <LearningView />}
          {view === "journal" && <JournalView />}
          {view === "timetracker" && <TimeTrackerView />}
          {view === "achievements" && <AchievementsView />}
        </main>
      </div>
      {showQuickAdd && <QuickAddTaskModal onClose={() => setShowQuickAdd(false)} />}
    </div>
  );
}

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
function Inner() {
  const { user } = useAuth();
  const [view, setView] = useState<View>(user ? "dashboard" : "landing");

  // sync to auth state
  useEffect(() => {
    if (!user && view !== "landing" && view !== "login" && view !== "onboarding") setView("landing");
  }, [user, view]);

  if (view === "landing") return <LandingPage onNavigate={setView} />;
  if (view === "login") return <AuthPage onNavigate={setView} />;
  if (view === "onboarding") return <OnboardingPage onNavigate={setView} />;
  return <AppShell onNavigate={setView} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Inner />
      </AuthProvider>
    </ThemeProvider>
  );
}
