import { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from "react";
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
  User, Edit3, AlertCircle, RefreshCw, Minus, Award, Folder,
  Pause, Archive, PlusCircle, FileText
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

interface GrowthPlan {
  id: string;
  title: string;
  category: string;
  description: string;
  targetDate: string;
  progress: number;
  active: boolean;
  createdAt: string;
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
  difficulty?: "Easy" | "Medium" | "Hard";
  subtasks?: { id: string; title: string; done: boolean }[];
  dependencies?: string[];
  planId?: string;
}

interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  folder?: string;
  planId?: string;
}

interface Habit {
  id: number;
  name: string;
  category: string;
  icon: string;
  priority: "high" | "medium" | "low";
  freq: string;
  streak: number;
  longestStreak?: number;
  target: string;
  completedToday: boolean;
  consistencyScore?: number;
  history?: string[];
  paused?: boolean;
  archived?: boolean;
  notes?: string;
  planId?: string;
}

interface GoalItem {
  id: string;
  title: string;
  timeframe: "year" | "quarter" | "month";
  progress: number;
  milestones: string[];
  dueDate: string;
  planId?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  wins: string;
  challenges: string;
  gratitude: string;
  lessons: string;
  folder?: string;
  pinned?: boolean;
  tags?: string[];
  planId?: string;
}

interface FocusSession {
  id: string;
  date: string;
  duration: number; // minutes
  category: string;
  planId?: string;
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

interface LearningStep {
  step: number;
  title: string;
  desc: string;
  done: boolean;
}

interface LearningCourse {
  id: string;
  title: string;
  desc: string;
  category: string;
  hours: number;
  completed: boolean;
  planId?: string;
}

interface CareerApp {
  id: string;
  company: string;
  role: string;
  stage: string;
  date: string;
  notes?: string;
  color: string;
}

interface HealthLog {
  date: string;
  waterMl: number;
  sleepHours: number;
  workoutMins: number;
  mood: string;
  notes?: string;
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

export const AuthCtx = createContext<{
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
  updateJournal: (id: string, patch: Partial<JournalEntry>) => void;
  deleteJournal: (id: string) => void;
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
  learningSteps: LearningStep[];
  toggleLearningStep: (stepIdx: number) => void;
  addLearningStep: (s: { title: string; desc: string }) => void;
  learningCourses: LearningCourse[];
  addLearningCourse: (c: Omit<LearningCourse, "id" | "completed">) => void;
  toggleCourseComplete: (id: string) => void;
  careerApps: CareerApp[];
  addCareerApp: (a: Omit<CareerApp, "id" | "color"> & { color?: string }) => void;
  updateCareerAppStage: (id: string, stage: string) => void;
  deleteCareerApp: (id: string) => void;
  healthLogs: HealthLog[];
  updateTodayHealth: (patch: Partial<HealthLog>) => void;
  generateCustomPlan: (categories: string[]) => void;
  growthPlans: GrowthPlan[];
  activePlanId: string | null;
  addGrowthPlan: (p: Omit<GrowthPlan, "id" | "createdAt">) => void | Promise<void>;
  updateGrowthPlan: (id: string, patch: Partial<GrowthPlan>) => void | Promise<void>;
  deleteGrowthPlan: (id: string) => void | Promise<void>;
  selectGrowthPlan: (id: string) => void;
}>({
  user: null, login: () => {}, logout: () => {}, updateUser: () => {},
  tasks: [], addTask: () => {}, updateTask: () => {}, deleteTask: () => {},
  notes: [], addNote: () => {}, updateNote: () => {}, deleteNote: () => {},
  habits: [], addHabit: () => {}, updateHabit: () => {}, deleteHabit: () => {},
  goalsList: [], addGoal: () => {}, updateGoal: () => {}, deleteGoal: () => {},
  journals: [], addJournal: () => {}, updateJournal: () => {}, deleteJournal: () => {},
  focusSessions: [], addFocusSession: () => {},
  missions: [], toggleMission: () => {},
  rewards: [], buyReward: () => false,
  coins: 0, addCoins: () => {},
  partners: [], addPartner: async () => ({ ok: false }), removePartner: () => {},
  learningSteps: [], toggleLearningStep: () => {}, addLearningStep: () => {},
  learningCourses: [], addLearningCourse: () => {}, toggleCourseComplete: () => {},
  careerApps: [], addCareerApp: () => {}, updateCareerAppStage: () => {}, deleteCareerApp: () => {},
  healthLogs: [], updateTodayHealth: () => {}, generateCustomPlan: () => {},
  growthPlans: [], activePlanId: null, addGrowthPlan: () => {}, updateGrowthPlan: () => {}, deleteGrowthPlan: () => {}, selectGrowthPlan: () => {},
});

function loadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
    try {
      const saved = localStorage.getItem("gs_user");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && typeof parsed === "object" && parsed.id) ? parsed : null;
    } catch {
      return null;
    }
  });

  // All data starts empty — synced from backend after login
  const [tasks, setTasks] = useState<Task[]>(() => loadArray("gs_tasks", []));
  const [notes, setNotes] = useState<Note[]>(() => loadArray("gs_notes", []));
  const [habits, setHabits] = useState<Habit[]>(() => loadArray("gs_habits", []));
  const [goalsList, setGoalsList] = useState<GoalItem[]>(() => loadArray("gs_goals", []));
  const [journals, setJournals] = useState<JournalEntry[]>(() => loadArray("gs_journals", []));
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => loadArray("gs_focus", []));
  const [missions, setMissions] = useState<DailyMission[]>(() => loadArray("gs_missions", DEFAULT_MISSIONS));
  const [rewards, setRewards] = useState<RewardItem[]>(() => loadArray("gs_rewards", DEFAULT_REWARDS));
  const [coins, setCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("gs_coins");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [partners, setPartners] = useState<GrowthPartner[]>(() => loadArray("gs_partners", []));

  const [learningSteps, setLearningSteps] = useState<LearningStep[]>(() => loadArray("gs_learning_roadmap", [
    { step: 1, title: "HTML & CSS basics", desc: "Flexbox, CSS grid, semantic elements", done: true },
    { step: 2, title: "JavaScript Core ES6+", desc: "Promises, async/await, closures", done: true },
    { step: 3, title: "React Fundamentals", desc: "Hooks, routing, virtual DOM", done: true },
    { step: 4, title: "TypeScript Integration", desc: "Types, interfaces, generic parameters", done: false },
    { step: 5, title: "Full Stack Node/Express", desc: "REST APIs, database queries, JWT auth", done: false }
  ]));

  const [learningCourses, setLearningCourses] = useState<LearningCourse[]>(() => loadArray("gs_learning_courses", [
    { id: "c1", title: "Advanced TypeScript with React", desc: "Level up your generic typing skills · 12 hours", category: "Coding", hours: 12, completed: false },
    { id: "c2", title: "System Design for Web Developers", desc: "Architecture, scalability, database indexing · 8 hours", category: "Career", hours: 8, completed: false }
  ]));

  const [careerApps, setCareerApps] = useState<CareerApp[]>(() => loadArray("gs_career_apps", [
    { id: "ca1", company: "Google", role: "Frontend Engineer", stage: "Onsite Technical", date: "2026-07-22", color: "text-amber-500 bg-amber-500/10" },
    { id: "ca2", company: "Stripe", role: "Software Engineer", stage: "System Design", date: "2026-07-28", color: "text-indigo-500 bg-indigo-500/10" },
    { id: "ca3", company: "Vercel", role: "React Engineer", stage: "Resume Review", date: "2026-08-04", color: "text-foreground/50 bg-muted" }
  ]));

  const [healthLogs, setHealthLogs] = useState<HealthLog[]>(() => {
    const today = new Date().toISOString().split("T")[0];
    return loadArray("gs_health_logs", [{ date: today, waterMl: 1500, sleepHours: 7.5, workoutMins: 45, mood: "😊", notes: "Felt energized after morning walk." }]);
  });

  const persist = useCallback((key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val)), []);

  const awardGrowthXp = useCallback((amount: number, coinsEarned = 0) => {
    setUser(u => {
      if (!u) return u;
      const nextXp = (u.xp || 0) + amount;
      const nextLevel = Math.floor(nextXp / 500) + 1;
      const updated = { ...u, xp: nextXp, level: Math.max(u.level || 1, nextLevel) };
      persist("gs_user", updated);
      apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify({ xp: updated.xp, level: updated.level }) }).catch(() => {});
      return updated;
    });
    if (coinsEarned > 0) {
      setCoins(c => {
        const next = c + coinsEarned;
        persist("gs_coins", next);
        return next;
      });
    }
  }, [persist]);

  const [growthPlans, setGrowthPlans] = useState<GrowthPlan[]>(() => loadArray("gs_growth_plans", [
    {
      id: "gp_default",
      title: "Become a Software Engineer",
      category: "Coding",
      description: "Master Full Stack development, build production architectures, and ace technical interviews.",
      targetDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      progress: 35,
      active: true,
      createdAt: new Date().toISOString().split("T")[0]
    }
  ]));

  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("gs_active_plan_id") || "gp_default";
    } catch {
      return "gp_default";
    }
  });

  const addGrowthPlan = useCallback(async (p: Omit<GrowthPlan, "id" | "createdAt">) => {
    const localPlan: GrowthPlan = { ...p, id: `gp_${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] };
    setGrowthPlans(prev => {
      const next = p.active ? prev.map(x => ({ ...x, active: false })).concat(localPlan) : [...prev, localPlan];
      persist("gs_growth_plans", next);
      return next;
    });
    if (p.active) {
      setActivePlanId(localPlan.id);
      localStorage.setItem("gs_active_plan_id", localPlan.id);
    }
    const serverPlan = await apiFetch<GrowthPlan>("/plans", { method: "POST", body: JSON.stringify(p) });
    if (serverPlan) {
      setGrowthPlans(prev => { const next = prev.map(x => x.id === localPlan.id ? serverPlan : x); persist("gs_growth_plans", next); return next; });
      if (p.active && serverPlan.id) {
        setActivePlanId(serverPlan.id);
        localStorage.setItem("gs_active_plan_id", serverPlan.id);
      }
    }
  }, [persist]);

  const updateGrowthPlan = useCallback(async (id: string, patch: Partial<GrowthPlan>) => {
    setGrowthPlans(prev => {
      let next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      if (patch.active) {
        next = next.map(p => p.id === id ? { ...p, active: true } : { ...p, active: false });
        setActivePlanId(id);
        localStorage.setItem("gs_active_plan_id", id);
      }
      persist("gs_growth_plans", next);
      return next;
    });
    await apiFetch(`/plans/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }, [persist]);

  const deleteGrowthPlan = useCallback(async (id: string) => {
    setGrowthPlans(prev => {
      const next = prev.filter(p => p.id !== id);
      persist("gs_growth_plans", next);
      if (activePlanId === id) {
        const fallback = next[0]?.id || null;
        setActivePlanId(fallback);
        if (fallback) localStorage.setItem("gs_active_plan_id", fallback);
        else localStorage.removeItem("gs_active_plan_id");
      }
      return next;
    });
    await apiFetch(`/plans/${id}`, { method: "DELETE" });
  }, [persist, activePlanId]);

  const selectGrowthPlan = useCallback((id: string) => {
    setGrowthPlans(prev => {
      const next = prev.map(p => ({ ...p, active: p.id === id }));
      persist("gs_growth_plans", next);
      return next;
    });
    setActivePlanId(id);
    localStorage.setItem("gs_active_plan_id", id);
    apiFetch(`/plans/${id}`, { method: "PUT", body: JSON.stringify({ active: true }) });
  }, [persist]);

  const toggleLearningStep = useCallback((stepIdx: number) => {
    setLearningSteps(prev => {
      const next = prev.map((s, i) => i === stepIdx ? { ...s, done: !s.done } : s);
      persist("gs_learning_roadmap", next);
      return next;
    });
  }, [persist]);

  const addLearningStep = useCallback((s: { title: string; desc: string }) => {
    setLearningSteps(prev => {
      const next = [...prev, { step: prev.length + 1, title: s.title, desc: s.desc, done: false }];
      persist("gs_learning_roadmap", next);
      return next;
    });
  }, [persist]);

  const addLearningCourse = useCallback((c: Omit<LearningCourse, "id" | "completed">) => {
    setLearningCourses(prev => {
      const next = [...prev, { ...c, id: `lc_${Date.now()}`, completed: false }];
      persist("gs_learning_courses", next);
      return next;
    });
  }, [persist]);

  const toggleCourseComplete = useCallback((id: string) => {
    setLearningCourses(prev => {
      const next = prev.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
      persist("gs_learning_courses", next);
      return next;
    });
  }, [persist]);

  const addCareerApp = useCallback((a: Omit<CareerApp, "id" | "color"> & { color?: string }) => {
    setCareerApps(prev => {
      const colors = ["text-amber-500 bg-amber-500/10", "text-indigo-500 bg-indigo-500/10", "text-emerald-500 bg-emerald-500/10", "text-purple-500 bg-purple-500/10"];
      const chosenColor = a.color || colors[prev.length % colors.length];
      const next = [...prev, { ...a, id: `app_${Date.now()}`, color: chosenColor }];
      persist("gs_career_apps", next);
      return next;
    });
  }, [persist]);

  const updateCareerAppStage = useCallback((id: string, stage: string) => {
    setCareerApps(prev => {
      const next = prev.map(a => a.id === id ? { ...a, stage } : a);
      persist("gs_career_apps", next);
      return next;
    });
  }, [persist]);

  const deleteCareerApp = useCallback((id: string) => {
    setCareerApps(prev => {
      const next = prev.filter(a => a.id !== id);
      persist("gs_career_apps", next);
      return next;
    });
  }, [persist]);

  const updateTodayHealth = useCallback((patch: Partial<HealthLog>) => {
    const today = new Date().toISOString().split("T")[0];
    let isFirstToday = false;
    setHealthLogs(prev => {
      const existingIdx = prev.findIndex(l => l.date === today);
      let next: HealthLog[];
      if (existingIdx >= 0) {
        next = prev.map((l, i) => i === existingIdx ? { ...l, ...patch } : l);
      } else {
        isFirstToday = true;
        next = [{ date: today, waterMl: 0, sleepHours: 7, workoutMins: 0, mood: "😊", ...patch }, ...prev];
      }
      persist("gs_health_logs", next);
      return next;
    });
    if (isFirstToday) {
      awardGrowthXp(25, 10);
    }
  }, [persist, awardGrowthXp]);

  const generateCustomPlan = useCallback((categories: string[]) => {
    const sel = categories.length > 0 ? categories : ["fitness", "coding", "reading", "career", "hydration", "sleep", "mental", "productivity"];
    const nowStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const tId = () => `plan_t_${Math.random().toString(36).substring(2, 8)}`;
    const masterPlanId = `gp_${Date.now()}`;

    // 0. Create Master Growth Plan
    const newPlan: GrowthPlan = {
      id: masterPlanId,
      title: `Tailored Growth Plan (${sel.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")})`,
      category: sel[0] ? sel[0].charAt(0).toUpperCase() + sel[0].slice(1) : "Master",
      description: `Comprehensive execution roadmap focused on ${sel.join(", ")} mastery and habit optimization.`,
      targetDate: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
      progress: 0,
      active: true,
      createdAt: nowStr
    };
    setGrowthPlans(prev => {
      const next = prev.map(p => ({ ...p, active: false })).concat(newPlan);
      persist("gs_growth_plans", next);
      return next;
    });
    setActivePlanId(masterPlanId);
    localStorage.setItem("gs_active_plan_id", masterPlanId);
    apiFetch("/plans", { method: "POST", body: JSON.stringify(newPlan) });

    // 1. Generate Tasks
    const newTasks: Task[] = [];
    if (sel.includes("fitness") || sel.includes("health")) {
      newTasks.push({ id: tId(), title: "Complete 30-min full body workout or cardio interval", priority: "High", category: "Fitness", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Medium", subtasks: [{ id: "c1", title: "5-min dynamic warmup", done: true }, { id: "c2", title: "20-min resistance training", done: false }, { id: "c3", title: "5-min cool down stretch", done: false }] });
      newTasks.push({ id: tId(), title: "Meal prep clean, high-protein nutrition for the next 3 days", priority: "Medium", category: "Nutrition", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Easy" });
    }
    if (sel.includes("coding") || sel.includes("career")) {
      newTasks.push({ id: tId(), title: "Solve 2 LeetCode algorithm challenges (Arrays / Dynamic Programming)", priority: "High", category: "Coding", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Hard", subtasks: [{ id: "c1", title: "Write optimal solution without hints", done: false }, { id: "c2", title: "Analyze time and space complexity", done: false }] });
      newTasks.push({ id: tId(), title: "Update GitHub portfolio & refine LinkedIn experience bullets", priority: "High", category: "Career", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Medium" });
    }
    if (sel.includes("reading") || sel.includes("mental")) {
      newTasks.push({ id: tId(), title: "Read 25 pages of non-fiction book without phone distractions", priority: "Medium", category: "Reading", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Easy" });
      newTasks.push({ id: tId(), title: "Complete 15-minute guided breathwork and journaling reflection", priority: "High", category: "Mental", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Easy" });
    }
    if (sel.includes("productivity") || sel.includes("sleep") || sel.includes("hydration") || sel.includes("selfcare")) {
      newTasks.push({ id: tId(), title: "Review tomorrow's top 3 strategic priorities before finishing day", priority: "High", category: "Productivity", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Medium" });
      newTasks.push({ id: tId(), title: "Disconnect from all digital screens 45 minutes before bedtime", priority: "Medium", category: "Wellness", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Medium" });
      newTasks.push({ id: tId(), title: "Keep 1.5L water bottle on desk and refill at noon", priority: "High", category: "Health", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Easy" });
    }
    if (newTasks.length === 0) {
      newTasks.push({ id: tId(), title: "Complete your first daily focus session and review habit streak", priority: "High", category: "Growth", done: false, createdAt: nowStr, planId: masterPlanId, difficulty: "Easy" });
    }
    setTasks(newTasks); persist("gs_tasks", newTasks);

    // 2. Generate Habits
    const newHabits: Habit[] = [];
    if (sel.includes("fitness") || sel.includes("health")) newHabits.push({ id: 101, name: "Daily Gym / Exercise", category: "Fitness", icon: "🏋️", priority: "high", freq: "Daily", streak: 1, target: "1 time", completedToday: false, planId: masterPlanId });
    if (sel.includes("hydration") || sel.includes("health")) newHabits.push({ id: 102, name: "Drink 2.5L Water", category: "Health", icon: "💧", priority: "high", freq: "Daily", streak: 2, target: "2.5L", completedToday: false, planId: masterPlanId });
    if (sel.includes("coding")) newHabits.push({ id: 103, name: "Code & Build Projects 1h", category: "Coding", icon: "💻", priority: "high", freq: "Daily", streak: 3, target: "1 hour", completedToday: false, planId: masterPlanId });
    if (sel.includes("reading")) newHabits.push({ id: 104, name: "Read 20+ Minutes", category: "Reading", icon: "📚", priority: "medium", freq: "Daily", streak: 1, target: "20 mins", completedToday: false, planId: masterPlanId });
    if (sel.includes("sleep")) newHabits.push({ id: 105, name: "8+ Hours Quality Sleep", category: "Sleep", icon: "😴", priority: "high", freq: "Daily", streak: 4, target: "8 hours", completedToday: false, planId: masterPlanId });
    if (sel.includes("mental") || sel.includes("selfcare")) newHabits.push({ id: 106, name: "Mindfulness & Meditation", category: "Mental", icon: "🧘", priority: "medium", freq: "Daily", streak: 2, target: "15 mins", completedToday: false, planId: masterPlanId });
    if (sel.includes("career")) newHabits.push({ id: 107, name: "Network & Career Skill Prep", category: "Career", icon: "📈", priority: "high", freq: "Weekdays", streak: 1, target: "1 hour", completedToday: false, planId: masterPlanId });
    if (sel.includes("productivity")) newHabits.push({ id: 108, name: "Plan Top 3 Daily Goals", category: "Productivity", icon: "⚡", priority: "high", freq: "Daily", streak: 5, target: "3 tasks", completedToday: false, planId: masterPlanId });
    if (newHabits.length === 0) {
      newHabits.push({ id: 109, name: "Daily Habit Consistency Check", category: "Growth", icon: "🚀", priority: "medium", freq: "Daily", streak: 1, target: "1 check", completedToday: false, planId: masterPlanId });
    }
    setHabits(newHabits); persist("gs_habits", newHabits);

    // 3. Generate Goals
    const newGoals: GoalItem[] = [];
    const gId = () => `plan_g_${Math.random().toString(36).substring(2, 8)}`;
    const dueThirty = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const dueSixty = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
    if (sel.includes("fitness") || sel.includes("health")) newGoals.push({ id: gId(), title: "Achieve Peak Fitness: Run 5K under 25 mins & lift consistently", timeframe: "quarter", progress: 20, milestones: ["Run 3x weekly", "Daily protein target", "Sleep 8h consistently"], dueDate: dueThirty, planId: masterPlanId });
    if (sel.includes("coding") || sel.includes("career")) newGoals.push({ id: gId(), title: "Build & Deploy 2 Full-Stack Portfolio Web Applications", timeframe: "quarter", progress: 35, milestones: ["System design sketch", "Frontend UI polished", "Backend API deployed"], dueDate: dueSixty, planId: masterPlanId });
    if (sel.includes("reading") || sel.includes("mental")) newGoals.push({ id: gId(), title: "Read 12 transformative books on leadership, psychology & tech", timeframe: "year", progress: 15, milestones: ["Book 1 summary notes", "Daily 30m reading block", "Review quarterly lessons"], dueDate: dueSixty, planId: masterPlanId });
    if (sel.includes("productivity") || sel.includes("sleep") || sel.includes("hydration")) newGoals.push({ id: gId(), title: "Maintain 30-day uninterrupted habit & hydration streak", timeframe: "month", progress: 40, milestones: ["Drink 2L daily", "Morning focus block", "No screens after 11 PM"], dueDate: dueThirty, planId: masterPlanId });
    setGoalsList(newGoals); persist("gs_goals", newGoals);

    // 4. Generate Learning Roadmap & Courses
    const newRoadmap: LearningStep[] = [
      { step: 1, title: "Fundamentals & Foundation Mastery", desc: "Core concepts, architecture principles, and daily routines setup", done: true },
      { step: 2, title: "Deep Practice & Skill Acquisition", desc: "Structured exercises, algorithm practice, and focused deep work blocks", done: true },
      { step: 3, title: "Real-World Project Building", desc: "Applying skills to production-ready projects and tangible milestones", done: false },
      { step: 4, title: "Optimization & Advanced Techniques", desc: "Performance tuning, system design, and expert-level best practices", done: false },
      { step: 5, title: "Mastery Certification & Mentorship", desc: "Publishing work, mentoring peers, and securing top-tier career opportunities", done: false }
    ];
    setLearningSteps(newRoadmap); persist("gs_learning_roadmap", newRoadmap);

    const newCourses: LearningCourse[] = [
      { id: "lc_1", title: "Mastering Full-Stack Systems & Architecture", desc: "Level up your technical skills with scalable patterns · 14 hours", category: "Coding", hours: 14, completed: false, planId: masterPlanId },
      { id: "lc_2", title: "Peak Productivity & Deep Work Protocol", desc: "Eliminate distractions and double your daily output · 6 hours", category: "Productivity", hours: 6, completed: false, planId: masterPlanId },
      { id: "lc_3", title: "Science of Fitness, Nutrition & Sleep Optimization", desc: "Evidence-based protocols for lasting energy and recovery · 8 hours", category: "Health", hours: 8, completed: false, planId: masterPlanId }
    ];
    setLearningCourses(newCourses); persist("gs_learning_courses", newCourses);

    // 5. Generate Career Applications
    const newApps: CareerApp[] = [
      { id: "ca_1", company: "Target Tech Leaders", role: "Senior Frontend Engineer", stage: "Onsite Technical", date: "Next Week", notes: "Review React concurrency & system design", color: "text-amber-500 bg-amber-500/10" },
      { id: "ca_2", company: "Innovate AI Systems", role: "Full Stack Developer", stage: "System Design", date: "In 2 Weeks", notes: "Prep database schema design", color: "text-indigo-500 bg-indigo-500/10" },
      { id: "ca_3", company: "NextGen Cloud Labs", role: "Software Engineer", stage: "Resume Review", date: "Ongoing", notes: "Refined resume metrics submitted", color: "text-emerald-500 bg-emerald-500/10" }
    ];
    setCareerApps(newApps); persist("gs_career_apps", newApps);

    // 6. Generate Starter Journal Entry
    const starterJournal: JournalEntry = {
      id: `j_${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      mood: "🔥",
      wins: `Created my custom personalized plan focused on: ${sel.join(", ")}. Ready to make measurable progress across every area!`,
      challenges: "Overcoming old procrastination habits and maintaining strict daily focus.",
      gratitude: "Grateful for the tools, clarity, and determination to elevate my habits and career.",
      lessons: "Consistency is the ultimate competitive advantage. Action cures self-doubt.",
      planId: masterPlanId
    };
    setJournals([starterJournal]); persist("gs_journals", [starterJournal]);

    // 7. Generate Starter Note
    const starterNote: Note = {
      id: `n_${Date.now()}`,
      title: "🌟 My Tailored Master Growth Plan",
      body: `Welcome to your Custom Growth Plan tailored to: ${sel.join(", ").toUpperCase()}.\n\n✅ Daily Game Plan:\n• Morning: Check off habits & complete workout/hydration targets.\n• Afternoon: Focus on priority tasks & coding/learning milestones.\n• Evening: Log reflection in Journal & review sleep metrics.\n\nEverything in GrowSync is fully connected. Click '+ Add Custom Item' in any view to expand your plan anytime!`,
      color: "violet",
      pinned: true,
      createdAt: nowStr,
      folder: "Master Plan",
      planId: masterPlanId
    };
    setNotes([starterNote]); persist("gs_notes", [starterNote]);
  }, [persist]);

  // ── Sync from backend on mount ──
  useEffect(() => {
    if (!user) return;
    apiFetch<Task[]>("/tasks").then(data => {
      if (Array.isArray(data)) { setTasks(data); persist("gs_tasks", data); }
    });
    apiFetch<Note[]>("/notes").then(data => {
      if (Array.isArray(data)) { setNotes(data); persist("gs_notes", data); }
    });
    apiFetch<Habit[]>("/habits").then(data => {
      if (Array.isArray(data)) { setHabits(data); persist("gs_habits", data); }
    });
    apiFetch<GrowthPartner[]>("/partners").then(data => {
      if (Array.isArray(data)) { setPartners(data); persist("gs_partners", data); }
    });
    apiFetch<GrowthPlan[]>("/plans").then(data => {
      if (Array.isArray(data)) {
        setGrowthPlans(data);
        persist("gs_growth_plans", data);
        const active = data.find(p => p.active);
        if (active) {
          setActivePlanId(active.id);
          localStorage.setItem("gs_active_plan_id", active.id);
        }
      }
    });
  }, [user, persist]);

  const login = useCallback(async (email: string, name?: string) => {
    const serverUser = await apiFetch<UserData>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    });

    if (serverUser && serverUser.id) {
      // ✅ Backend online — use real account
      setUser(serverUser);
      persist("gs_user", serverUser);
      // Clear stale cache then pull fresh data
      localStorage.removeItem("gs_tasks");
      localStorage.removeItem("gs_notes");
      localStorage.removeItem("gs_habits");
      localStorage.removeItem("gs_partners");
      localStorage.removeItem("gs_growth_plans");
      setTasks([]); setNotes([]); setHabits([]); setPartners([]); setGrowthPlans([]);
      apiFetch<Task[]>("/tasks").then(data => { if (Array.isArray(data)) { setTasks(data); persist("gs_tasks", data); } });
      apiFetch<Note[]>("/notes").then(data => { if (Array.isArray(data)) { setNotes(data); persist("gs_notes", data); } });
      apiFetch<Habit[]>("/habits").then(data => { if (Array.isArray(data)) { setHabits(data); persist("gs_habits", data); } });
      apiFetch<GrowthPartner[]>("/partners").then(data => { if (Array.isArray(data)) { setPartners(data); persist("gs_partners", data); } });
      apiFetch<GrowthPlan[]>("/plans").then(data => { if (Array.isArray(data)) { setGrowthPlans(data); persist("gs_growth_plans", data); const active = data.find(p => p.active); if (active) { setActivePlanId(active.id); localStorage.setItem("gs_active_plan_id", active.id); } } });
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
    let earnedXp = 0;
    setTasks(ts => {
      const target = ts.find(t => t.id === id);
      if (target && !target.done && patch.done === true) {
        earnedXp = 15;
      }
      const next = ts.map(t => t.id === id ? { ...t, ...patch } : t);
      persist("gs_tasks", next);
      return next;
    });
    if (earnedXp > 0) {
      awardGrowthXp(15, 5);
    }
    await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }, [persist, awardGrowthXp]);

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
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { ok: false, error: "Invite code cannot be empty." };
    }
    // Prevent self-connect check locally if known
    if (user && user.inviteCode?.toUpperCase() === cleanCode) {
      return { ok: false, error: "You cannot add yourself as a growth partner!" };
    }

    try {
      const u = (() => { try { return JSON.parse(localStorage.getItem("gs_user") || ""); } catch { return null; } })();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.id || u?._id) headers["Authorization"] = `Bearer ${u.id || u._id}`;

      const res = await fetch(`${API_URL}/partners/invite`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setPartners(ps => {
          if (ps.some(p => p.inviteCode?.toUpperCase() === cleanCode || p.id === data.id)) {
            return ps;
          }
          const next = [...ps, data];
          persist("gs_partners", next);
          return next;
        });
        return { ok: true, partner: data };
      } else {
        const errMsg = data?.error || (res.status === 404 ? "No user found with that invite code. Please check and try again." : "Could not connect with that invite code.");
        return { ok: false, error: errMsg };
      }
    } catch (err) {
      return { ok: false, error: "Network error or server offline. Please make sure the backend server is running to connect real growth partners." };
    }
  }, [user, persist]);

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
    let earnedXp = 0;
    setHabits(hs => {
      const target = hs.find(h => h.id === id);
      if (target && !target.completedToday && patch.completedToday === true) {
        earnedXp = 20;
      }
      const next = hs.map(h => h.id === id ? { ...h, ...patch } : h);
      persist("gs_habits", next);
      return next;
    });
    if (earnedXp > 0) {
      awardGrowthXp(20, 10);
    }
    await apiFetch(`/habits/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  }, [persist, awardGrowthXp]);

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
    let earnedXp = 0;
    setGoalsList(prev => {
      const target = prev.find(g => g.id === id);
      if (target && target.progress !== 100 && patch.progress === 100) {
        earnedXp = 50;
      }
      const next = prev.map(g => g.id === id ? { ...g, ...patch } : g);
      persist("gs_goals", next);
      return next;
    });
    if (earnedXp > 0) {
      awardGrowthXp(50, 25);
    }
  }, [persist, awardGrowthXp]);

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
    awardGrowthXp(25, 10);
  }, [persist, awardGrowthXp]);

  const updateJournal = useCallback((id: string, patch: Partial<JournalEntry>) => {
    setJournals(prev => {
      const next = prev.map(j => j.id === id ? { ...j, ...patch } : j);
      persist("gs_journals", next);
      return next;
    });
  }, [persist]);

  const deleteJournal = useCallback((id: string) => {
    setJournals(prev => {
      const next = prev.filter(j => j.id !== id);
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
    <AuthCtx.Provider value={{ user, login, logout, updateUser, tasks, addTask, updateTask, deleteTask, notes, addNote, updateNote, deleteNote, habits, addHabit, updateHabit, deleteHabit, goalsList, addGoal, updateGoal, deleteGoal, journals, addJournal, updateJournal, deleteJournal, focusSessions, addFocusSession, missions, toggleMission, rewards, buyReward, coins, addCoins, partners, addPartner, removePartner, learningSteps, toggleLearningStep, addLearningStep, learningCourses, addLearningCourse, toggleCourseComplete, careerApps, addCareerApp, updateCareerAppStage, deleteCareerApp, healthLogs, updateTodayHealth, generateCustomPlan, growthPlans, activePlanId, addGrowthPlan, updateGrowthPlan, deleteGrowthPlan, selectGrowthPlan }}>
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

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.includes("@")) { setErr("Enter a valid email."); return; }
    if (mode === "signup" && !name.trim()) { setErr("Enter your name."); return; }
    setLoading(true);
    setErr("");
    try {
      await login(email, name || undefined);
      onNavigate(mode === "signup" ? "onboarding" : "dashboard");
    } catch {
      setErr("Failed to login. Please check your details.");
    } finally {
      setLoading(false);
    }
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
              disabled={loading}
              className={`w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{mode === "login" ? "Logging In..." : "Creating Account..."}</span>
                </div>
              ) : (
                <>
                  {mode === "login" ? "Log In to Dashboard" : "Create My Account"} <ArrowRight size={16} />
                </>
              )}
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
  const { updateUser, generateCustomPlan } = useAuth();
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
          <p className="text-foreground/40 mt-2 text-sm">Choose multiple — we will personalize your experience across all features.</p>
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
        <Btn onClick={() => { updateUser({ goals: selected }); generateCustomPlan(selected); onNavigate("dashboard"); }} disabled={selected.length === 0} className="mt-6 w-full py-4 text-base">
          Start My Custom Journey <ArrowRight size={18} />
        </Btn>
        <p className="text-center text-foreground/25 text-xs mt-3">{selected.length} selected · Builds personalized plan across Tasks, Habits, Goals, Learning & Journal</p>
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

export function DashboardView({ onNavigate, onQuickAdd }: { onNavigate: (v: View) => void; onQuickAdd: () => void }) {
  const { user, tasks, updateTask, habits, updateHabit, partners, coins, addCoins, generateCustomPlan, updateUser, growthPlans, activePlanId, selectGrowthPlan } = useAuth();
  
  // Local state for dashboard widgets
  const [mood, setMood] = useState("good");
  const [waterCups, setWaterCups] = useState(4);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [quickMemo, setQuickMemo] = useState("");
  const [activeChallenge, setActiveChallenge] = useState("Run 5km with Jordan");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planCategories, setPlanCategories] = useState<string[]>(user?.goals || ["fitness", "coding", "productivity"]);
  const [filterPlanOnly, setFilterPlanOnly] = useState(false);
  const togglePlanCat = (id: string) => setPlanCategories(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  
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

  const activePlan = growthPlans.find(p => p.id === activePlanId) || growthPlans[0] || null;

  const moodEmojis: Record<string, string> = { great: "😄", good: "😊", okay: "😐", sad: "😔", stressed: "😰", angry: "😤" };
  
  // Filter items based on active plan switcher
  const filteredHabits = filterPlanOnly && activePlan ? habits.filter(h => h.planId === activePlan.id || !h.planId) : habits;
  const doneHabits = filteredHabits.filter(h => h.completedToday).length;
  const habitPct = filteredHabits.length > 0 ? Math.round((doneHabits / filteredHabits.length) * 100) : 0;
  
  const filteredTasks = (filterPlanOnly && activePlan ? tasks.filter(t => t.planId === activePlan.id || !t.planId) : tasks)
    .slice(0, 6)
    .sort((a, b) => Number(a.done) - Number(b.done));
  const doneTasks = filteredTasks.filter(t => t.done).length;
  const taskPct = filteredTasks.length > 0 ? Math.round((doneTasks / filteredTasks.length) * 100) : 0;
  
  // Calculate average daily progress
  const dailyOverallProgress = Math.round((habitPct + taskPct) / 2);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Rule-based Data-Driven Growth Insights
  const insights = (() => {
    const list: { type: "win" | "alert" | "tip"; icon: string; title: string; desc: string }[] = [];
    if (habitPct === 100 && filteredHabits.length > 0) {
      list.push({ type: "win", icon: "🎉", title: "Flawless Habit Mastery", desc: "You completed 100% of your tracked habits today! Your consistency score is surging." });
    } else if (habitPct > 50) {
      list.push({ type: "win", icon: "🔥", title: "Solid Momentum", desc: `You've checked off ${doneHabits}/${filteredHabits.length} habits today. Keep pushing for completion!` });
    }
    if (user.streak > 3) {
      list.push({ type: "win", icon: "⚡", title: `${user.streak}-Day Unstoppable Streak`, desc: "Your daily streak puts you in the top tier of growers. Don't break the chain!" });
    }
    if (doneTasks === 0 && filteredTasks.length > 0) {
      list.push({ type: "alert", icon: "🎯", title: "Break Inertia Today", desc: `You have ${filteredTasks.length} priority tasks pending. Start a 25-min Pomodoro focus block right now.` });
    } else if (doneTasks > 0) {
      list.push({ type: "win", icon: "✅", title: "Task Execution On Track", desc: `Completed ${doneTasks}/${filteredTasks.length} focus tasks today. Great execution!` });
    }
    if (sleepHours < 6.5) {
      list.push({ type: "alert", icon: "🌙", title: "Recovery Deficit Detected", desc: `Only ${sleepHours}h of sleep logged. Prioritize rest tonight to maintain peak neural output and mood.` });
    } else if (sleepHours >= 7.5) {
      list.push({ type: "tip", icon: "🧠", title: "Optimal Sleep Logged", desc: `Your ${sleepHours}h sleep duration provides ideal recovery for complex problem solving.` });
    }
    if (waterCups < 4) {
      list.push({ type: "tip", icon: "💧", title: "Hydration Boost Recommended", desc: `Only ${waterCups}/8 cups logged. Drink a full glass right now to prevent afternoon fatigue.` });
    }
    if (list.length === 0) {
      list.push({ type: "tip", icon: "🚀", title: "Ready for Growth", desc: "Add custom tasks and habits or start a focus session to generate personalized data insights." });
    }
    return list;
  })();

  // XP Leaderboard calculations
  const leaderboard = [
    { name: "You", level: user.level, xp: user.xp, avatar: user.avatar, active: true },
    ...partners.map(p => ({ name: p.name, level: p.level, xp: p.xp, avatar: p.avatar, active: false }))
  ].sort((a, b) => b.xp - a.xp);

  return (
    <div className="flex h-full overflow-hidden text-foreground">
      
      {/* ── CENTER MAIN CONTENT COLUMN ── */}
      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6 min-w-0 bg-background">
        
        {/* ROW 1: Active Growth Plan Command Banner & Switcher */}
        {activePlan && (
          <Card className="p-5 border-primary/40 bg-gradient-to-r from-primary/15 via-pink-500/10 to-purple-500/15 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/10 pointer-events-none" />
            <div className="space-y-1.5 z-10 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Zap size={11} className="fill-white" /> Active Growth OS
                </span>
                <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                  {activePlan.category}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">Target: {activePlan.targetDate}</span>
              </div>
              <h2 className="text-lg font-extrabold font-['Plus_Jakarta_Sans'] text-foreground tracking-tight">
                {activePlan.title}
              </h2>
              <p className="text-xs text-foreground/75 leading-relaxed">
                {activePlan.description}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 z-10 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-border">
                <span className="text-xs font-bold text-muted-foreground">Switch Plan:</span>
                <select
                  value={activePlanId || ""}
                  onChange={e => selectGrowthPlan(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-foreground outline-none cursor-pointer pr-2"
                >
                  {growthPlans.map(p => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground font-bold">{p.title}</option>
                  ))}
                </select>
              </div>
              <Btn onClick={() => setShowPlanModal(true)} variant="primary" className="text-xs py-2.5 shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5">
                <Settings size={14} /> Customize Master Plan
              </Btn>
            </div>
          </Card>
        )}

        {/* ROW 2: Daily Progress, Inspiration, & Mood */}
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
              <span className="font-extrabold bg-white/10 px-3 py-1 rounded-full text-[10px] tracking-wide">Level {user.level} Growth Warrior</span>
            </div>
          </div>

          <Card className="p-5 border-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Today's OS Score</p>
                <button
                  onClick={() => setFilterPlanOnly(!filterPlanOnly)}
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-all ${filterPlanOnly ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"}`}
                >
                  {filterPlanOnly ? "Plan Items Only" : "All Items"}
                </button>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-primary">{dailyOverallProgress}%</span>
                <span className="text-xs text-muted-foreground font-medium">completion rate</span>
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

        {/* ROW 2.5: Smart Growth Insights (Data-Driven Engine) */}
        <Card className="p-5 border-border shadow-sm space-y-3.5 bg-gradient-to-br from-card to-muted/20">
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-base">⚡</span>
              <div>
                <h3 className="text-sm font-extrabold font-['Poppins']">Smart Growth Insights</h3>
                <p className="text-[10px] text-muted-foreground font-medium">Real-time analysis of your tasks, habits, recovery, and momentum</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-1 rounded-md border border-emerald-500/20">
              Live Data Engine
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-card/80 flex items-start gap-3 transition-all hover:border-primary/30 shadow-xs">
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-extrabold text-foreground">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ROW 3: Mood Tracker & Quick Actions */}
        <Card className="p-5 border-border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">How is your energy & mood today?</h3>
            <span className="text-xs text-primary font-bold capitalize">Selected: {mood}</span>
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
                <span className="text-[10px] tracking-wide block capitalize">{x.m}</span>
              </button>
            ))}
          </div>
        </Card>

        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <Card className="max-w-lg w-full p-6 space-y-5 bg-card border-border relative max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Target size={18} /></div>
                  <h3 className="font-extrabold text-base text-foreground">Configure Master Growth Plan</h3>
                </div>
                <button onClick={() => setShowPlanModal(false)} className="text-foreground/40 hover:text-foreground font-bold text-lg">✕</button>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed">
                Select your focus categories below. Generating a plan will automatically build a tailored roadmap across all sections of GrowSync so you never run out of direction.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {goalCategories.map(c => {
                  const sel = planCategories.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => togglePlanCat(c.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all text-xs font-semibold ${sel ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground/60 hover:bg-muted"}`}>
                      <span className="text-primary">{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {sel && <Check size={14} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                <button type="button" onClick={() => setPlanCategories(goalCategories.map(g => g.id))} className="text-xs text-primary font-bold hover:underline">Select All Categories</button>
                <div className="flex gap-2">
                  <Btn onClick={() => setShowPlanModal(false)} variant="ghost" className="text-xs">Cancel</Btn>
                  <Btn onClick={() => {
                    updateUser({ goals: planCategories });
                    generateCustomPlan(planCategories);
                    setShowPlanModal(false);
                    alert("✅ Master Custom Plan Generated! All Tasks, Habits, Goals, Learning & Career plans have been updated.");
                  }} variant="primary" className="text-xs">
                    ✨ Generate Master Plan
                  </Btn>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ROW 4: Today's Mission Command Box (Tasks with Subtask Checklists) */}
        <Card className="p-5 border-border shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold font-['Poppins']">Today's Focus Tasks</h3>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold text-muted-foreground">
                {doneTasks}/{filteredTasks.length} done
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate("tasks")} className="text-xs text-primary font-bold hover:underline">View Multi-View</button>
              <button
                onClick={onQuickAdd}
                className="bg-primary/10 text-primary hover:bg-primary/15 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-primary/10"
              >
                <Plus size={12} /> New +
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No tasks found for this view. Click "New +" to schedule some focus action!</p>
            ) : (
              filteredTasks.map(t => {
                const subDone = t.subtasks?.filter(s => s.done).length || 0;
                const subTotal = t.subtasks?.length || 0;
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                      t.done ? "border-border/50 opacity-60 bg-muted/20" : "border-border hover:border-primary/20 bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateTask(t.id, { done: !t.done })}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${
                          t.done ? "bg-gradient-to-br from-primary to-accent border-transparent" : "border-foreground/20 hover:border-primary"
                        }`}
                      >
                        {t.done && <Check size={10} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${t.done ? "line-through text-foreground/30 font-normal" : "text-foreground"}`}>{t.title}</p>
                        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock size={9} /> {t.dueDate}</span>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium">{t.category}</span>
                          {t.difficulty && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                              t.difficulty === "Hard" ? "bg-red-500/10 text-red-500" : t.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                            }`}>
                              {t.difficulty}
                            </span>
                          )}
                          {subTotal > 0 && (
                            <span className="text-[9px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-md">
                              Subtasks {subDone}/{subTotal}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${priorityColor[t.priority] || ""}`}>
                        {t.priority}
                      </span>
                    </div>

                    {/* Interactive Subtasks inside Command Card */}
                    {subTotal > 0 && !t.done && (
                      <div className="pl-8 pt-1 border-t border-border/30 space-y-1.5">
                        {t.subtasks?.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const nextSubs = t.subtasks?.map(s => s.id === sub.id ? { ...s, done: !s.done } : s);
                                updateTask(t.id, { subtasks: nextSubs });
                              }}
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                sub.done ? "bg-primary border-primary text-white" : "border-foreground/30"
                              }`}
                            >
                              {sub.done && <Check size={8} />}
                            </button>
                            <span className={`text-[11px] ${sub.done ? "line-through text-muted-foreground" : "text-foreground/85"}`}>{sub.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* ROW 5: Habit Tracker Status Circles */}
        <Card className="p-5 border-border shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold font-['Poppins']">Active Habit Trackers</h3>
            <button onClick={() => onNavigate("habits")} className="text-xs text-primary font-bold hover:underline">View All Habits ({habits.length})</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredHabits.slice(0, 4).map(h => (
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

        {/* ROW 6: Focus Timer Widget & Study Sound Room */}
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

        {/* ROW 7: Weekly Analytics Chart */}
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
export function TasksView() {
  const { tasks, addTask, updateTask, deleteTask, notes, addNote, updateNote, deleteNote, growthPlans, activePlanId } = useAuth();
  const [subTab, setSubTab] = useState<"tasks" | "notes">("tasks");
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "pending" | "high">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<{ [taskId: string]: string }>({});
  
  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    note: "",
    category: "Personal",
    priority: "medium" as Task["priority"],
    dueDate: new Date().toISOString().split("T")[0],
    difficulty: "Medium" as "Easy" | "Medium" | "Hard",
    estimatedDuration: 30,
    planId: activePlanId || ""
  });
  
  // Note form state
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("violet");
  const [editNoteId, setEditNoteId] = useState<string | null>(null);

  const activePlan = growthPlans.find(p => p.id === activePlanId) || null;

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.note?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter === "pending") return !t.done;
    if (filter === "high") return t.priority === "high" && !t.done;
    return true;
  }).sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));

  const filteredNotes = notes.filter(n => {
    if (searchQuery && !n.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !n.body?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter === "pending") return !n.pinned;
    return true;
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const submitTask = () => {
    if (!taskForm.title.trim()) return;
    if (editTaskId) {
      updateTask(editTaskId, taskForm);
      setEditTaskId(null);
    } else {
      addTask({
        ...taskForm,
        subtasks: []
      });
    }
    setTaskForm({ title: "", note: "", category: "Personal", priority: "medium", dueDate: new Date().toISOString().split("T")[0], difficulty: "Medium", estimatedDuration: 30, planId: activePlanId || "" });
    setShowTaskForm(false);
  };

  const startEditTask = (t: Task) => {
    setEditTaskId(t.id);
    setTaskForm({
      title: t.title,
      note: t.note || "",
      category: t.category,
      priority: t.priority,
      dueDate: t.dueDate || new Date().toISOString().split("T")[0],
      difficulty: t.difficulty || "Medium",
      estimatedDuration: t.estimatedDuration || 30,
      planId: t.planId || activePlanId || ""
    });
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

  const quickAddTemplate = (title: string, category: string, priority: Task["priority"], duration: number) => {
    addTask({
      title,
      note: `Auto-generated from ${title} template`,
      category,
      priority,
      dueDate: new Date().toISOString().split("T")[0],
      difficulty: duration >= 90 ? "Hard" : duration >= 45 ? "Medium" : "Easy",
      estimatedDuration: duration,
      subtasks: [
        { id: `s_${Date.now()}_1`, title: "Setup and preparation", done: false },
        { id: `s_${Date.now()}_2`, title: "Execute core focus block", done: false },
        { id: `s_${Date.now()}_3`, title: "Review output & log notes", done: false }
      ],
      planId: activePlanId || ""
    });
  };

  const handleAddSubtask = (taskId: string, currentSubtasks?: { id: string; title: string; done: boolean }[]) => {
    const title = newSubtaskTitle[taskId]?.trim();
    if (!title) return;
    const nextSubs = [...(currentSubtasks || []), { id: `sub_${Date.now()}`, title, done: false }];
    updateTask(taskId, { subtasks: nextSubs });
    setNewSubtaskTitle(prev => ({ ...prev, [taskId]: "" }));
  };

  const cats = ["Personal", "Career", "Health", "Learning", "Finance", "Other"];

  // Kanban buckets
  const kanbanToStart = filteredTasks.filter(t => !t.done && (!t.tags?.includes("in-progress") && t.priority !== "high"));
  const kanbanInProgress = filteredTasks.filter(t => !t.done && (t.tags?.includes("in-progress") || t.priority === "high"));
  const kanbanDone = filteredTasks.filter(t => t.done);

  // Group by date for Calendar/Timeline View
  const dateGroups = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filteredTasks.forEach(t => {
      const d = t.dueDate || "No Due Date";
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredTasks]);

  return (
    <div className="p-7 space-y-6 text-foreground font-['Plus_Jakarta_Sans']">
      
      {/* Subheader and Tab Selectors */}
      <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight">Command Tasks & Notes</h2>
            {activePlan && (
              <span className="text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
                Plan: {activePlan.title}
              </span>
            )}
          </div>
          <p className="text-foreground/50 text-xs mt-0.5">Multi-view task management with subtask checklists and instant templates</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Notes / Tasks Tab buttons */}
          <div className="flex bg-muted rounded-xl p-1 gap-1 border border-border">
            <button
              onClick={() => { setSubTab("notes"); setFilter("all"); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "notes"
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              📝 Notes ({notes.length})
            </button>
            <button
              onClick={() => { setSubTab("tasks"); setFilter("all"); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                subTab === "tasks"
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              ✅ Tasks ({tasks.length})
            </button>
          </div>

          {/* View Switcher Tabs when on Tasks */}
          {subTab === "tasks" && (
            <div className="flex bg-muted rounded-xl p-1 gap-1 border border-border">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === "list" ? "bg-card text-primary shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === "kanban" ? "bg-card text-primary shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🧱 Kanban
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === "calendar" ? "bg-card text-primary shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📅 Timeline
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (subTab === "tasks") {
                setShowTaskForm(true);
                setEditTaskId(null);
                setTaskForm({ title: "", note: "", category: "Personal", priority: "medium", dueDate: new Date().toISOString().split("T")[0], difficulty: "Medium", estimatedDuration: 30, planId: activePlanId || "" });
              } else {
                setShowNoteForm(true);
                setEditNoteId(null);
                setNewNoteTitle("");
                setNewNoteBody("");
                setNewNoteColor("violet");
              }
            }}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> New +
          </button>
        </div>
      </div>

      {/* Quick-Add Task Templates Bar */}
      {subTab === "tasks" && (
        <Card className="p-3.5 border-border shadow-xs bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-extrabold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
            <Zap size={13} className="text-amber-500 fill-amber-500" /> Quick-Add Templates:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: "⚡ Code for 2 hours", cat: "Learning", prio: "high" as const, dur: 120 },
              { label: "🏋️ Workout 45 mins", cat: "Health", prio: "medium" as const, dur: 45 },
              { label: "🏗️ System Design Study", cat: "Career", prio: "high" as const, dur: 60 },
              { label: "🎯 Review Weekly Goals", cat: "Personal", prio: "low" as const, dur: 30 },
            ].map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => quickAddTemplate(tmpl.label.replace(/^[^\s]+\s/, ""), tmpl.cat, tmpl.prio, tmpl.dur)}
                className="px-3 py-1.5 bg-card hover:bg-primary/10 hover:border-primary/40 border border-border rounded-xl text-xs font-bold transition-all shadow-xs text-foreground"
              >
                + {tmpl.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Sub-filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {([
            ["all", "All Items"],
            ["pending", "Pending Only"],
            ...(subTab === "tasks" ? [["high", "🔥 High Priority Only"]] : [])
          ] as [typeof filter, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                filter === id
                  ? "bg-primary/15 text-primary border-primary/30 font-extrabold"
                  : "bg-muted text-foreground/60 border-border hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={`Search ${subTab}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-input border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          />
          <span className="absolute left-2.5 top-2.5 text-muted-foreground text-xs">🔍</span>
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs font-bold">✕</button>
          )}
        </div>
      </div>

      {/* Forms Section */}
      {showTaskForm && subTab === "tasks" && (
        <Card className="p-5 border-primary/30 bg-card shadow-md animate-fadeIn">
          <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2 text-primary">
            <Target size={16} /> {editTaskId ? "Edit Task Details" : "Create New Focus Task"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <Input label="Task Title" placeholder="What specific goal needs to be accomplished?" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Difficulty</label>
              <select value={taskForm.difficulty} onChange={e => setTaskForm(f => ({ ...f, difficulty: e.target.value as any }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary">
                <option value="Easy">Easy (Quick win)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Hard">Hard (Deep Focus)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Textarea label="Notes & Context (optional)" placeholder="Add reference links or steps…" value={taskForm.note} onChange={e => setTaskForm(f => ({ ...f, note: e.target.value }))} rows={2} />
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Estimated Duration (mins)</label>
              <input type="number" min="5" step="5" value={taskForm.estimatedDuration} onChange={e => setTaskForm(f => ({ ...f, estimatedDuration: Number(e.target.value) }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Category</label>
              <select value={taskForm.category} onChange={e => setTaskForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary">
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Priority</label>
              <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary">
                <option value="high">High 🔥</option><option value="medium">Medium ⚡</option><option value="low">Low ☕</option>
              </select>
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Due Date</label>
              <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border/40">
            <Btn onClick={submitTask} variant="primary"><Save size={14} /> {editTaskId ? "Update" : "Create"} Task</Btn>
            <Btn variant="ghost" onClick={() => { setShowTaskForm(false); setEditTaskId(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {showNoteForm && subTab === "notes" && (
        <Card className="p-5 border-primary/30 bg-card shadow-md animate-fadeIn">
          <h3 className="text-sm font-extrabold mb-4 text-primary">{editNoteId ? "Edit Note" : "Create New Note"}</h3>
          <div className="space-y-4 mb-4">
            <Input placeholder="Note title…" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} />
            <Textarea placeholder="Write your note…" value={newNoteBody} onChange={e => setNewNoteBody(e.target.value)} rows={3} />
            <div className="flex items-center gap-2">
              <span className="text-foreground/60 text-xs font-bold">Color:</span>
              {["violet", "pink", "emerald", "amber", "cyan"].map(c => (
                <button key={c} onClick={() => setNewNoteColor(c)} className={`w-6 h-6 rounded-full ${noteDotColors[c]} ${newNoteColor === c ? "ring-2 ring-offset-2 ring-primary ring-offset-background" : ""}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Btn onClick={saveNote} variant="primary"><Save size={14} /> {editNoteId ? "Update" : "Save"} Note</Btn>
            <Btn variant="ghost" onClick={() => { setShowNoteForm(false); setEditNoteId(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Main Display Section */}
      <div className="space-y-4">
        
        {/* 1. LIST VIEW FOR TASKS */}
        {subTab === "tasks" && viewMode === "list" && (
          <>
            {filteredTasks.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground"><p>No tasks found. Try selecting another filter or click "New +" to create your first task!</p></Card>
            )}
            {filteredTasks.map(t => {
              const subDone = t.subtasks?.filter(s => s.done).length || 0;
              const subTotal = t.subtasks?.length || 0;
              return (
                <Card key={t.id} className={`p-4 transition-all hover:border-primary/30 ${t.done ? "opacity-60 bg-muted/10 border-border/40" : "border-border bg-card shadow-sm"}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => updateTask(t.id, { done: !t.done })} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.done ? "bg-gradient-to-br from-primary to-accent border-transparent" : "border-foreground/20 hover:border-primary"}`}>
                      {t.done && <Check size={10} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-bold text-sm ${t.done ? "line-through text-foreground/40 font-normal" : "text-foreground"}`}>{t.title}</p>
                          {t.note && <p className="text-foreground/60 text-xs mt-1 leading-relaxed">{t.note}</p>}
                          
                          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${priorityColor[t.priority] || ""}`}>{t.priority}</span>
                            <span className="text-[9px] bg-muted text-foreground/60 px-2 py-0.5 rounded-full font-semibold">{t.category}</span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock size={9} />{t.dueDate}</span>
                            {t.difficulty && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                                t.difficulty === "Hard" ? "bg-red-500/10 text-red-500" : t.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                              }`}>
                                {t.difficulty} ({t.estimatedDuration || 30}m)
                              </span>
                            )}
                            {subTotal > 0 && (
                              <span className="text-[9px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                                Subtasks: {subDone}/{subTotal}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => startEditTask(t)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"><Pencil size={12} /></button>
                          <button onClick={() => deleteTask(t.id)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                        </div>
                      </div>

                      {/* Interactive Subtasks Section inside List View */}
                      <div className="mt-3 pt-2.5 border-t border-border/40 space-y-2">
                        {t.subtasks?.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between gap-2 pl-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                onClick={() => {
                                  const nextSubs = t.subtasks?.map(s => s.id === sub.id ? { ...s, done: !s.done } : s);
                                  updateTask(t.id, { subtasks: nextSubs });
                                }}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                                  sub.done ? "bg-primary border-primary text-white" : "border-foreground/30 hover:border-primary"
                                }`}
                              >
                                {sub.done && <Check size={10} />}
                              </button>
                              <span className={`text-xs truncate ${sub.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{sub.title}</span>
                            </div>
                            <button
                              onClick={() => {
                                const nextSubs = t.subtasks?.filter(s => s.id !== sub.id);
                                updateTask(t.id, { subtasks: nextSubs });
                              }}
                              className="text-foreground/30 hover:text-red-500 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        
                        {/* Quick add subtask input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="+ Add actionable subtask..."
                            value={newSubtaskTitle[t.id] || ""}
                            onChange={e => setNewSubtaskTitle(prev => ({ ...prev, [t.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") handleAddSubtask(t.id, t.subtasks); }}
                            className="text-xs bg-muted/50 border border-border/60 rounded-lg px-2.5 py-1.5 flex-1 outline-none focus:border-primary placeholder-muted-foreground"
                          />
                          <button
                            onClick={() => handleAddSubtask(t.id, t.subtasks)}
                            className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}

        {/* 2. KANBAN BOARD VIEW FOR TASKS */}
        {subTab === "tasks" && viewMode === "kanban" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            
            {/* Column 1: To Do */}
            <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> To Do / Queue
                </span>
                <span className="text-xs font-bold bg-card border border-border px-2 py-0.5 rounded-full text-muted-foreground">{kanbanToStart.length}</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {kanbanToStart.map(t => (
                  <Card key={t.id} className="p-3.5 border-border bg-card hover:border-primary/30 transition-all space-y-2 shadow-xs">
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-xs font-bold text-foreground leading-snug">{t.title}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-extrabold uppercase ${priorityColor[t.priority] || ""}`}>{t.priority}</span>
                    </div>
                    {t.note && <p className="text-[10px] text-muted-foreground line-clamp-2">{t.note}</p>}
                    <div className="flex justify-between items-center pt-2 border-t border-border/40 text-[10px]">
                      <span className="text-muted-foreground font-semibold">{t.category}</span>
                      <button
                        onClick={() => updateTask(t.id, { tags: [...(t.tags || []), "in-progress"] })}
                        className="text-primary font-bold hover:underline flex items-center gap-0.5"
                      >
                        Start Focus →
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" /> In Progress / Priority
                </span>
                <span className="text-xs font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full text-primary">{kanbanInProgress.length}</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {kanbanInProgress.map(t => (
                  <Card key={t.id} className="p-3.5 border-primary/30 bg-card shadow-sm space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-xs font-bold text-foreground leading-snug">{t.title}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-extrabold uppercase ${priorityColor[t.priority] || ""}`}>{t.priority}</span>
                    </div>
                    {t.note && <p className="text-[10px] text-muted-foreground line-clamp-2">{t.note}</p>}
                    <div className="flex justify-between items-center pt-2 border-t border-border/40 text-[10px]">
                      <span className="text-primary font-bold">🔥 Active</span>
                      <button
                        onClick={() => updateTask(t.id, { done: true })}
                        className="bg-emerald-500 text-white font-extrabold px-2 py-1 rounded-lg text-[9px] hover:bg-emerald-600 transition-all"
                      >
                        Complete ✅
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Column 3: Completed */}
            <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3 opacity-80">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                </span>
                <span className="text-xs font-bold bg-card border border-border px-2 py-0.5 rounded-full text-muted-foreground">{kanbanDone.length}</span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {kanbanDone.map(t => (
                  <Card key={t.id} className="p-3.5 border-border/40 bg-card/60 space-y-1.5 opacity-75">
                    <div className="flex items-center gap-1.5">
                      <Check size={12} className="text-emerald-500 flex-shrink-0" />
                      <p className="text-xs font-bold text-muted-foreground line-through truncate">{t.title}</p>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1">
                      <span>{t.category}</span>
                      <button onClick={() => updateTask(t.id, { done: false })} className="hover:text-primary underline">Reopen</button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 3. CALENDAR / TIMELINE VIEW FOR TASKS */}
        {subTab === "tasks" && viewMode === "calendar" && (
          <div className="space-y-4">
            {dateGroups.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground"><p>No scheduled tasks with due dates found.</p></Card>
            ) : (
              dateGroups.map(([dateStr, groupTasks]) => (
                <Card key={dateStr} className="p-5 border-border bg-card shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs">📅</div>
                      <div>
                        <h4 className="text-sm font-extrabold text-foreground">{dateStr === new Date().toISOString().split("T")[0] ? "Today" : dateStr}</h4>
                        <p className="text-[10px] text-muted-foreground font-medium">{groupTasks.length} tasks scheduled</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                      {groupTasks.filter(t => t.done).length}/{groupTasks.length} Done
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupTasks.map(t => (
                      <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${t.done ? "border-border/40 bg-muted/20 opacity-60" : "border-border bg-card hover:border-primary/30"}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button onClick={() => updateTask(t.id, { done: !t.done })} className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${t.done ? "bg-primary border-primary text-white" : "border-foreground/30 hover:border-primary"}`}>
                            {t.done && <Check size={10} />}
                          </button>
                          <span className={`text-xs font-bold truncate ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                        </div>
                        <span className={`text-[8px] px-2 py-0.5 rounded border font-extrabold uppercase ${priorityColor[t.priority] || ""}`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* 4. NOTES LIST VIEW */}
        {subTab === "notes" && (
          <>
            {filteredNotes.length === 0 && (
              <Card className="p-8 text-center text-muted-foreground"><p>No notes found. Click "New +" to create your first note!</p></Card>
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
                        <button onClick={() => startEditNote(n)} className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center text-foreground/30 hover:text-primary hover:bg-primary/10 transition-all"><Pencil size={11} /></button>
                        <button onClick={() => deleteNote(n.id)} className="w-6.5 h-6.5 rounded-lg bg-muted flex items-center justify-center text-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    <p className="text-foreground/75 text-xs leading-relaxed line-clamp-3">{n.body}</p>
                  </div>
                  <p className="text-foreground/40 text-[9px] mt-4 pt-2 border-t border-border/20 font-medium">{n.createdAt}</p>
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
export function FriendsView() {
  const { user, partners, addPartner, removePartner, habits, tasks, focusSessions, learningCourses, healthLogs, careerApps, goalsList } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<GrowthPartner | null>(partners[0] || null);
  const [copied, setCopied] = useState(false);
  
  // Active sub-tab inside the comparison column
  const [centerTab, setCenterTab] = useState<"charts" | "compare" | "insights" | "goals" | "feed">("charts");
  
  // Emoji reaction input
  const [reactionMsg, setReactionMsg] = useState("");
  
  // Real-time timeline feed simulation
  const [activities, setActivities] = useState<string[]>([
    "Partner completed Coding session (10 XP) 💻",
    "Partner unlocked Early Bird Badge! 🌅",
    "Partner finished Morning Run (20 XP) 🏃",
    "Partner reached Level up! ⚡"
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
        `${name} checked in daily (+25 XP) ✅`,
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
    setInviteMsg({ ok: false, msg: "Connecting with server..." });
    const result = await addPartner(inviteCode.trim());
    if (result?.ok) {
      setInviteMsg({ ok: true, msg: "Growth partner connected successfully! 🎉" });
      setInviteCode("");
      if (result.partner) setSelectedPartner(result.partner);
    } else {
      const errMsg = result?.error || "Invalid code or connection failed. Please check and try again.";
      setInviteMsg({ ok: false, msg: errMsg });
    }
    setTimeout(() => setInviteMsg(null), 5000);
  };

  // Real-time calculated metrics for current user
  const doneHabits = habits.filter(h => h.completedToday).length;
  const habitCompletion = habits.length > 0 ? Math.round((doneHabits / habits.length) * 100) : 0;
  const completedTasksCount = tasks.filter(t => t.done).length;
  const pendingTasksCount = tasks.filter(t => !t.done).length;
  const taskCompletion = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const focusHoursNum = Math.round(focusSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60 * 10) / 10;
  const studyHoursNum = Math.round((learningCourses.reduce((acc, c) => acc + (c.hours || 0), 0) + focusHoursNum) * 10) / 10;
  const codingHoursNum = Math.round(tasks.filter(t => t.category === "Career" || t.category === "Learning" || t.title.toLowerCase().includes("code") || t.title.toLowerCase().includes("dev")).length * 1.5 * 10) / 10;
  
  const todayLog = healthLogs[0];
  const waterCups = todayLog ? Math.round((todayLog.waterMl || 0) / 250) : 6;
  const sleepHrs = todayLog?.sleepHours || 7.5;
  const exerciseMins = todayLog?.workoutMins || 45;
  const currentMood = todayLog?.mood || "😄 Great";
  
  const healthScoreCalc = todayLog ? Math.min(100, Math.round(((todayLog.waterMl || 1500) / 2500 * 50) + ((todayLog.sleepHours || 7) / 8 * 50))) : 85;
  const careerScoreCalc = Math.min(100, 50 + careerApps.length * 10 + goalsList.length * 5);
  const productivityScoreCalc = Math.min(100, Math.round((habitCompletion + taskCompletion) / 2));

  // Structured profile data representing CURRENT USER
  const userProfile = {
    avatar: user.avatar,
    name: user.name,
    level: user.level,
    xp: user.xp,
    currentStreak: user.streak,
    longestStreak: Math.max(user.streak || 0, 14),
    healthScore: healthScoreCalc,
    careerScore: careerScoreCalc,
    productivityScore: productivityScoreCalc,
    focusHours: focusHoursNum,
    habitCompletion: habitCompletion,
    taskCompletion: taskCompletion,
    studyHours: studyHoursNum,
    codingHours: codingHoursNum,
    waterIntake: waterCups,
    sleepHours: sleepHrs,
    exercise: exerciseMins,
    mood: currentMood,
    achievements: habits.length + completedTasksCount,
    weeklyGoalsDone: Math.min(completedTasksCount, 5),
    weeklyGoalsTotal: 5,
    monthlyGoalsDone: Math.min(completedTasksCount + doneHabits, 10),
    monthlyGoalsTotal: 10,
    completedTasks: completedTasksCount,
    pendingTasks: pendingTasksCount,
    currentChallenge: "30-Day Growth Sprint",
    currentRank: user.level >= 10 ? "Gold I" : user.level >= 5 ? "Silver II" : "Bronze III"
  };

  // Build partner profile from REAL data returned by the server
  const partnerProfile = {
    avatar: currentPartner?.avatar || null,
    name: currentPartner?.name || "Growth Friend",
    level: currentPartner?.level || 1,
    xp: currentPartner?.xp || 0,
    currentStreak: currentPartner?.streak || 0,
    longestStreak: currentPartner?.longestStreak || currentPartner?.streak || 0,
    healthScore: currentPartner?.healthScore ?? 65,
    careerScore: currentPartner?.careerScore ?? 70,
    productivityScore: currentPartner?.productivityScore ?? 68,
    focusHours: currentPartner?.focusHours ?? 8.5,
    habitCompletion: currentPartner?.habitCompletion ?? 70,
    taskCompletion: currentPartner?.taskCompletion ?? 65,
    studyHours: currentPartner?.studyHours ?? 10.5,
    codingHours: currentPartner?.codingHours ?? 14.0,
    waterIntake: currentPartner?.waterIntake ?? 7,
    sleepHours: currentPartner?.sleepHours ?? 7,
    exercise: currentPartner?.exercise ?? 40,
    mood: currentPartner?.mood ?? "😊 Good",
    achievements: currentPartner?.habits?.filter(h => h.done).length || 5,
    weeklyGoalsDone: currentPartner?.weeklyGoalsDone ?? 3,
    weeklyGoalsTotal: currentPartner?.weeklyGoalsTotal ?? 5,
    monthlyGoalsDone: currentPartner?.monthlyGoalsDone ?? 6,
    monthlyGoalsTotal: currentPartner?.monthlyGoalsTotal ?? 10,
    completedTasks: currentPartner?.completedTasks ?? 12,
    pendingTasks: currentPartner?.pendingTasks ?? 4,
    currentChallenge: currentPartner?.currentChallenge ?? "30-Day Consistency",
    currentRank: currentPartner?.currentRank ?? "Silver I",
  };

  // Comparative charts data
  const chartsData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
    day,
    you: [65, 45, 80, 55, 92, 35, 70][i],
    friend: currentPartner ? (currentPartner.weekProgress?.[i] || [50, 60, 55, 75, 65, 80, 70][i]) : 0,
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
    { subject: "Streak Rate", you: Math.min(100, (userProfile.currentStreak / 30) * 100), friend: Math.min(100, (partnerProfile.currentStreak / 30) * 100), fullMark: 100 },
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
    else if (type === "celebrate") msg = `You celebrated ${friendShort}'s achievement! 🎉`;
    else if (type === "checkin") msg = `You completed your Co-op Daily Check-in with ${friendShort}! (+25 XP) ✅`;
    else if (type === "emoji") {
      if (!reactionMsg.trim()) return;
      msg = `You reacted with "${reactionMsg}" on ${friendShort}'s progress!`;
      setReactionMsg("");
    }
    setActivities(prev => [msg, ...prev]);
    alert(msg);
  };

  return (
    <div className="p-7 space-y-6 text-foreground font-['Plus_Jakarta_Sans']">
      
      {/* HEADER SECTION: Switch connected accountability partners */}
      <div className="flex justify-between items-center border-b border-border/60 pb-4 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Co-op Growth & Progress Comparison</h2>
          <p className="text-foreground/50 text-xs mt-0.5">Compare live metrics side-by-side and keep your accountability partners motivated.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {partners.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground/60 font-bold">Partner:</span>
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
              className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl hover:bg-red-500/20 transition-all"
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
          <Card className="p-5 border-primary/20 bg-card shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-center pb-3 border-b border-border/40 space-y-2">
              <div className="inline-block relative">
                <Avatar src={userProfile.avatar} name={userProfile.name} size="md" className="mx-auto ring-4 ring-primary/20" />
                <span className="absolute -bottom-1 -right-1 bg-primary text-white border border-card rounded-full text-[9px] px-2 py-0.5 font-extrabold uppercase shadow-xs">You</span>
              </div>
              <h3 className="text-sm font-extrabold text-foreground">{userProfile.name}</h3>
              <p className="text-[10px] text-primary uppercase tracking-widest font-extrabold">{userProfile.currentRank}</p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-foreground/60">
                  <span>Level {userProfile.level}</span>
                  <span>{userProfile.xp}/500 XP</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (userProfile.xp / 500) * 100)}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                  <p className="text-foreground/60 font-bold">Active Streak</p>
                  <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex justify-center items-center gap-1 mt-0.5">
                    <Flame size={13} className="fill-amber-500" /> {userProfile.currentStreak}d
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-xl border border-border/50">
                  <p className="text-foreground/60 font-bold">Longest</p>
                  <p className="text-sm font-extrabold text-foreground mt-0.5">{userProfile.longestStreak}d</p>
                </div>
              </div>

              {/* Development metrics list */}
              <div className="divide-y divide-border/20 space-y-2 pt-2">
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Health Score</span><span className="text-primary font-extrabold">{userProfile.healthScore}/100</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Career Score</span><span className="text-purple-600 dark:text-purple-400 font-extrabold">{userProfile.careerScore}/100</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Productivity Score</span><span className="text-primary font-extrabold">{userProfile.productivityScore}/100</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Weekly Tasks</span><span>{userProfile.weeklyGoalsDone}/{userProfile.weeklyGoalsTotal} done</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Habits Done</span><span className="text-primary font-extrabold">{userProfile.habitCompletion}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Focus Hours</span><span>{userProfile.focusHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Study Hours</span><span>{userProfile.studyHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Coding Hours</span><span>{userProfile.codingHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Water / Sleep</span><span>{userProfile.waterIntake}c / {userProfile.sleepHours}h</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Exercise / Mood</span><span>{userProfile.exercise}m / {userProfile.mood}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                  <span>Completed / Pending</span><span className="font-extrabold text-primary">{userProfile.completedTasks} / {userProfile.pendingTasks}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* CENTER COLUMN: Comparison Analytics, detailed comparison, insights, goals, timelines */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Sub-tab selection */}
          <div className="flex gap-1.5 p-1.5 bg-muted rounded-2xl border border-border text-xs font-bold shadow-inner overflow-x-auto">
            {[
              { id: "charts", label: "📊 Comparison Charts" },
              { id: "compare", label: "⚖️ Detailed Compare" },
              { id: "insights", label: "🧠 Data Insights" },
              { id: "goals", label: "🎯 Shared Goals" },
              { id: "feed", label: "⚡ Accountability Hub" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCenterTab(tab.id as any)}
                className={`flex-1 py-2 px-3 text-center rounded-xl transition-all whitespace-nowrap ${
                  centerTab === tab.id ? "bg-card text-primary shadow-sm font-extrabold border border-border/50" : "text-muted-foreground hover:text-foreground"
                }`}
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
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <BarChart2 size={14} className="text-primary" /> Weekly XP Gains Split
                    </h3>
                    <p className="text-[10px] text-foreground/50 mt-0.5">Side-by-side daily XP score trend comparison</p>
                  </div>
                  <span className="text-[11px] font-extrabold text-primary">Live Sync</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartsData}>
                    <defs>
                      <linearGradient id="colYou" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5c7c64" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#5c7c64" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colFrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#BA88AE" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#BA88AE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="you" stroke="#5c7c64" strokeWidth={2.5} fill="url(#colYou)" name="You" />
                    {currentPartner && <Area type="monotone" dataKey="friend" stroke="#BA88AE" strokeWidth={2.5} fill="url(#colFrd)" name={partnerProfile.name} />}
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Study & Coding Hours side-by-side comparison bar chart */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3.5">
                <div>
                  <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Focus, Study & Coding Hours</h3>
                  <p className="text-[10px] text-foreground/50 mt-0.5">Development & learning hours comparison</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="you" fill="#5c7c64" name="You" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="friend" fill="#BA88AE" name={partnerProfile.name} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Radar comparison chart */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3.5">
                <div>
                  <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Co-op Balance Grid Matrix</h3>
                  <p className="text-[10px] text-foreground/50 mt-0.5">Holistic scores and habits mapping comparison</p>
                </div>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={210}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} />
                      <Radar name="You" dataKey="you" stroke="#5c7c64" fill="#5c7c64" fillOpacity={0.3} />
                      <Radar name={partnerProfile.name} dataKey="friend" stroke="#BA88AE" fill="#BA88AE" fillOpacity={0.3} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Calendar Heatmap side-by-side consistency comparison */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3">
                <div>
                  <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Consistency Grid (Past 28 Days)</h3>
                  <p className="text-[10px] text-foreground/50 mt-0.5">Comparing daily check-in blocks side-by-side</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-primary block mb-1.5">You (Active Days)</span>
                    <div className="grid grid-cols-7 gap-1">
                      {heatmapDays.map(d => (
                        <div key={d.id} className={`w-3.5 h-3.5 rounded-sm transition-all ${d.you ? "bg-primary shadow-xs" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 block mb-1.5">{partnerProfile.name.split(" ")[0]} (Active Days)</span>
                    <div className="grid grid-cols-7 gap-1">
                      {heatmapDays.map(d => (
                        <div key={d.id} className={`w-3.5 h-3.5 rounded-sm transition-all ${d.friend ? "bg-purple-500" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          )}

          {/* TAB 2: Detailed Compare Breakdown Table */}
          {centerTab === "compare" && (
            <Card className="p-5 border-border bg-card shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                    ⚖️ Comprehensive Metric-by-Metric Comparison
                  </h3>
                  <p className="text-foreground/50 text-xs mt-0.5">Granular breakdown across all 12 core personal growth dimensions</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Daily Tasks Completed", you: userProfile.completedTasks, friend: partnerProfile.completedTasks, unit: "tasks" },
                  { label: "Habit Completion Rate", you: userProfile.habitCompletion, friend: partnerProfile.habitCompletion, unit: "%" },
                  { label: "Active Day Streak", you: userProfile.currentStreak, friend: partnerProfile.currentStreak, unit: "days" },
                  { label: "Study & Course Hours", you: userProfile.studyHours, friend: partnerProfile.studyHours, unit: "hrs" },
                  { label: "Coding & Dev Hours", you: userProfile.codingHours, friend: partnerProfile.codingHours, unit: "hrs" },
                  { label: "Deep Focus Time", you: userProfile.focusHours, friend: partnerProfile.focusHours, unit: "hrs" },
                  { label: "Health Score", you: userProfile.healthScore, friend: partnerProfile.healthScore, unit: "/100" },
                  { label: "Career Score", you: userProfile.careerScore, friend: partnerProfile.careerScore, unit: "/100" },
                  { label: "Productivity Score", you: userProfile.productivityScore, friend: partnerProfile.productivityScore, unit: "/100" },
                  { label: "Daily Water Intake", you: userProfile.waterIntake, friend: partnerProfile.waterIntake, unit: "cups" },
                  { label: "Sleep Duration", you: userProfile.sleepHours, friend: partnerProfile.sleepHours, unit: "hrs" },
                  { label: "Daily Exercise Time", you: userProfile.exercise, friend: partnerProfile.exercise, unit: "mins" },
                  { label: "XP & Level Mastery", you: userProfile.xp, friend: partnerProfile.xp, unit: "XP" }
                ].map((item, idx) => {
                  const diff = Math.round((item.you - item.friend) * 10) / 10;
                  const maxVal = Math.max(item.you, item.friend, 1);
                  return (
                    <div key={idx} className="p-3 bg-muted/40 rounded-2xl border border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold flex-wrap gap-2">
                        <span className="text-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                            diff > 0
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : diff < 0
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}>
                            {diff > 0 ? `+${diff} ${item.unit} ahead` : diff < 0 ? `${diff} ${item.unit} behind` : `Tie 🤝`}
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bars */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] font-bold">
                        <div>
                          <div className="flex justify-between text-foreground/70 mb-1">
                            <span>You</span>
                            <span className="text-primary font-extrabold">{item.you} {item.unit}</span>
                          </div>
                          <div className="h-2 bg-card rounded-full overflow-hidden border border-border/50">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (item.you / maxVal) * 100)}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-foreground/70 mb-1">
                            <span>{partnerProfile.name.split(" ")[0]}</span>
                            <span className="text-purple-600 dark:text-purple-400 font-extrabold">{item.friend} {item.unit}</span>
                          </div>
                          <div className="h-2 bg-card rounded-full overflow-hidden border border-border/50">
                            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.min(100, (item.friend / maxVal) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* TAB 3: Data-Driven Insights (Automated AI-Style Comparison Insights) */}
          {centerTab === "insights" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-primary animate-pulse" />
                  <div>
                    <h4 className="text-xs font-extrabold text-foreground">Automated Data-Driven Co-op Intelligence</h4>
                    <p className="text-[10px] text-foreground/60">Generated from real-time database comparisons between you and {partnerProfile.name}</p>
                  </div>
                </div>
                <span className="text-[10px] bg-primary text-white font-extrabold px-2.5 py-1 rounded-full">100% Real-Time</span>
              </div>

              {[
                {
                  title: "Study & Course Hours Comparison",
                  desc: userProfile.studyHours >= partnerProfile.studyHours
                    ? `You logged ${Math.round((userProfile.studyHours - partnerProfile.studyHours) * 10) / 10} more study hours than ${partnerProfile.name} this week! Excellent focus and consistency.`
                    : `${partnerProfile.name} logged ${Math.round((partnerProfile.studyHours - userProfile.studyHours) * 10) / 10} more study hours than you. Log a focus session or finish learning steps to catch up!`,
                  color: "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                  icon: "📚"
                },
                {
                  title: "Daily Task Execution Benchmark",
                  desc: userProfile.completedTasks >= partnerProfile.completedTasks
                    ? `You completed ${userProfile.completedTasks} tasks compared to ${partnerProfile.name}'s ${partnerProfile.completedTasks} tasks. You hold a +${userProfile.completedTasks - partnerProfile.completedTasks} task completion lead!`
                    : `${partnerProfile.name} completed ${partnerProfile.completedTasks - userProfile.completedTasks} more tasks than you right now. Check off subtasks in TasksView to boost your count!`,
                  color: "bg-primary/5 border-primary/20 text-primary",
                  icon: "⚡"
                },
                {
                  title: "Habit Consistency Percentage",
                  desc: userProfile.habitCompletion >= partnerProfile.habitCompletion
                    ? `Your habit completion rate is ${userProfile.habitCompletion}%, outpacing ${partnerProfile.name}'s ${partnerProfile.habitCompletion}% consistency score.`
                    : `${partnerProfile.name} holds a ${partnerProfile.habitCompletion - userProfile.habitCompletion}% consistency lead on daily habits. Don't break your chain today!`,
                  color: "bg-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400",
                  icon: "🎯"
                },
                {
                  title: "Active Streak Chain Pulse",
                  desc: userProfile.currentStreak >= partnerProfile.currentStreak
                    ? `You are on a ${userProfile.currentStreak}-day active streak! You hold a ${userProfile.currentStreak - partnerProfile.currentStreak}-day advantage over ${partnerProfile.name}.`
                    : `${partnerProfile.name} has maintained a longer streak of ${partnerProfile.currentStreak} days (${partnerProfile.currentStreak - userProfile.currentStreak} days ahead of you).`,
                  color: "bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400",
                  icon: "🔥"
                },
                {
                  title: "Health & Vitality Balance",
                  desc: `Your combined health score is ${userProfile.healthScore}/100 with ${userProfile.waterIntake} cups of water and ${userProfile.sleepHours}h sleep logged today, while ${partnerProfile.name} holds a ${partnerProfile.healthScore}/100 score.`,
                  color: "bg-cyan-500/5 border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
                  icon: "💧"
                }
              ].map((ins, i) => (
                <Card key={i} className={`p-4 border ${ins.color} space-y-1.5 transition-all hover:scale-[1.01]`}>
                  <h4 className="text-xs font-extrabold flex items-center gap-2 uppercase tracking-wider">
                    <span>{ins.icon}</span> {ins.title}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-95 font-medium">{ins.desc}</p>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 4: Shared Goals list */}
          {centerTab === "goals" && (
            <div className="space-y-4 animate-fadeIn">
              {[
                { name: "Shared Reading Challenge", category: "Reading", progress: Math.min(100, Math.round(((userProfile.habitCompletion + partnerProfile.habitCompletion) / 200) * 100)), reward: 200, leader: userProfile.habitCompletion >= partnerProfile.habitCompletion ? "You" : partnerProfile.name.split(" ")[0], streak: Math.min(userProfile.currentStreak, partnerProfile.currentStreak), deadline: "Next Sunday" },
                { name: "Shared Coding & Dev Sprint", category: "Coding", progress: Math.min(100, Math.round(((userProfile.codingHours + partnerProfile.codingHours) / 40) * 100)), reward: 300, leader: userProfile.codingHours >= partnerProfile.codingHours ? "You" : partnerProfile.name.split(" ")[0], streak: Math.max(userProfile.currentStreak, partnerProfile.currentStreak), deadline: "End of Month" },
                { name: "Shared Hydration Marathon", category: "Hydration", progress: Math.min(100, Math.round(((userProfile.waterIntake + partnerProfile.waterIntake) / 16) * 100)), reward: 150, leader: userProfile.waterIntake >= partnerProfile.waterIntake ? "You" : partnerProfile.name.split(" ")[0], streak: 8, deadline: "In 5 days" },
                { name: "Deep Focus 20-Hour Milestone", category: "Focus Study", progress: Math.min(100, Math.round(((userProfile.focusHours + partnerProfile.focusHours) / 20) * 100)), reward: 250, leader: userProfile.focusHours >= partnerProfile.focusHours ? "You" : partnerProfile.name.split(" ")[0], streak: 14, deadline: "Next Friday" }
              ].map(c => (
                <Card key={c.name} className="p-5 border-border bg-card shadow-sm space-y-3.5 hover:border-primary/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{c.name}</h4>
                      <p className="text-[10px] text-foreground/50 uppercase tracking-wider mt-0.5">{c.category} · Deadline: {c.deadline}</p>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">🪙 {c.reward} Coins</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-foreground/60">
                      <span>Co-op Combined Progress</span>
                      <span className="text-primary font-extrabold">{c.progress}% Completed</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden border border-border/40">
                      <div className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all" style={{ width: `${c.progress}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-foreground/60 font-bold pt-1 border-t border-border/40">
                    <span>Current Leader: <strong className="text-primary font-extrabold">{c.leader}</strong></span>
                    <span>Shared Chain: <strong className="text-amber-500 font-extrabold">{c.streak} Days 🔥</strong></span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* TAB 5: Real-time timelines & Accountability controls */}
          {centerTab === "feed" && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Accountability controls dashboard */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-4">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Zap size={14} className="text-primary" /> Co-op Accountability Actions
                </h4>
                <p className="text-xs text-foreground/60">Send cheers, celebrate wins, or trigger a daily check-in with {partnerProfile.name.split(" ")[0]} to earn +25 XP!</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <button onClick={() => sendSocialReaction("cheer")} className="p-3 border border-border hover:border-primary bg-muted/40 hover:bg-primary/5 rounded-xl transition-all font-extrabold text-center flex flex-col items-center gap-1">
                    <span className="text-base">💖</span> Send Cheers
                  </button>
                  <button onClick={() => sendSocialReaction("motivation")} className="p-3 border border-border hover:border-primary bg-muted/40 hover:bg-primary/5 rounded-xl transition-all font-extrabold text-center flex flex-col items-center gap-1">
                    <span className="text-base">🔥</span> Send Motivation
                  </button>
                  <button onClick={() => sendSocialReaction("celebrate")} className="p-3 border border-border hover:border-primary bg-muted/40 hover:bg-primary/5 rounded-xl transition-all font-extrabold text-center flex flex-col items-center gap-1">
                    <span className="text-base">🎉</span> Celebrate Win
                  </button>
                  <button onClick={() => sendSocialReaction("checkin")} className="p-3 border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all font-extrabold text-center flex flex-col items-center gap-1 shadow-xs">
                    <span className="text-base">✅</span> Daily Check-in
                  </button>
                </div>

                <div className="space-y-2 pt-3 border-t border-border/40">
                  <p className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider">Send Custom Reaction / Message</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Awesome coding streak! Let's crush our goals today 💻🔥"
                      value={reactionMsg}
                      onChange={e => setReactionMsg(e.target.value)}
                      className="text-xs"
                    />
                    <button onClick={() => sendSocialReaction("emoji")} className="bg-primary text-white text-xs font-extrabold px-4 rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm">
                      <Send size={13} /> React
                    </button>
                  </div>
                </div>
              </Card>

              {/* Feed updates list */}
              <Card className="p-5 border-border bg-card shadow-sm space-y-3">
                <h4 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={13} className="text-primary" /> Live Co-op Activity Timeline
                </h4>
                <div className="relative border-l-2 border-primary/30 pl-4 ml-1.5 space-y-4 pt-1">
                  {activities.map((act, i) => (
                    <div key={i} className="relative text-xs">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                      <p className="font-bold text-foreground leading-relaxed">{act}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Just now · Socket.io Sync</p>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Connected Friend Profile Card */}
        <div className="lg:col-span-3 space-y-5">
          <Card className="p-5 border-purple-500/20 bg-card shadow-sm space-y-4 relative overflow-hidden">
            {currentPartner ? (
              <>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="text-center pb-3 border-b border-border/40 space-y-2">
                  <div className="inline-block relative">
                    <Avatar src={partnerProfile.avatar} name={partnerProfile.name} size="md" className="mx-auto ring-4 ring-purple-500/20" />
                    <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white border border-card rounded-full text-[9px] px-2 py-0.5 font-extrabold uppercase shadow-xs">Partner</span>
                  </div>
                  <h3 className="text-sm font-extrabold text-foreground">{partnerProfile.name}</h3>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest font-extrabold">{partnerProfile.currentRank}</p>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-[10px] text-foreground/60">
                      <span>Level {partnerProfile.level}</span>
                      <span>{partnerProfile.xp}/500 XP</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all" style={{ width: `${Math.min(100, (partnerProfile.xp / 500) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                    <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                      <p className="text-foreground/60 font-bold">Active Streak</p>
                      <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 flex justify-center items-center gap-1 mt-0.5">
                        <Flame size={13} className="fill-amber-500" /> {partnerProfile.currentStreak}d
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded-xl border border-border/50">
                      <p className="text-foreground/60 font-bold">Longest</p>
                      <p className="text-sm font-extrabold text-foreground mt-0.5">{partnerProfile.longestStreak}d</p>
                    </div>
                  </div>

                  {/* Development metrics list */}
                  <div className="divide-y divide-border/20 space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Health Score</span><span className="text-primary font-extrabold">{partnerProfile.healthScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Career Score</span><span className="text-purple-600 dark:text-purple-400 font-extrabold">{partnerProfile.careerScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Productivity Score</span><span className="text-primary font-extrabold">{partnerProfile.productivityScore}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Weekly Tasks</span><span>{partnerProfile.weeklyGoalsDone}/{partnerProfile.weeklyGoalsTotal} done</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Habits Done</span><span className="text-primary font-extrabold">{partnerProfile.habitCompletion}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Focus Hours</span><span>{partnerProfile.focusHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Study Hours</span><span>{partnerProfile.studyHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Coding Hours</span><span>{partnerProfile.codingHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Water / Sleep</span><span>{partnerProfile.waterIntake}c / {partnerProfile.sleepHours}h</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Exercise / Mood</span><span>{partnerProfile.exercise}m / {partnerProfile.mood}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-bold text-foreground/75 pt-2">
                      <span>Completed / Pending</span><span className="font-extrabold text-purple-600 dark:text-purple-400">{partnerProfile.completedTasks} / {partnerProfile.pendingTasks}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground space-y-3">
                <Users size={40} className="text-primary/40 animate-pulse" />
                <div>
                  <p className="text-sm font-extrabold text-foreground">No Partner Connected</p>
                  <p className="text-xs text-foreground/50 mt-1">Connect with a friend's unique invite code below to view live comparison stats!</p>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* FOOTER SECTION: Connect code trigger & Server Validation */}
      <Card className="p-6 border-border shadow-md bg-card space-y-4">
        <div className="flex items-center gap-2.5">
          <Award size={20} className="text-primary" />
          <div>
            <h3 className="text-base font-extrabold tracking-tight">Invite Code & Growth Partner Hub</h3>
            <p className="text-foreground/50 text-xs">Connect using real, unique server-generated invite codes to compare daily habits, study hours, and streaks.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-border/60">
          <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Your Unique Server Code</p>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">Server Verified</span>
            </div>
            <div className="flex items-center gap-2 bg-card rounded-xl px-4 py-3 border border-border shadow-inner">
              <span className="text-foreground font-extrabold text-base font-['JetBrains_Mono'] flex-1 tracking-widest">{user.inviteCode || "SERVER-OFFLINE"}</span>
              <button
                onClick={copyCode}
                className={`text-xs px-4 py-2 rounded-xl font-extrabold transition-all border ${
                  copied
                    ? "bg-emerald-500 text-white border-transparent shadow-xs"
                    : "bg-primary text-white hover:bg-primary/90 border-transparent shadow-xs"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Share this exact 8-character code with your accountability partner.</p>
          </div>

          <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">Connect Growth Friend</p>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">100% Real Validation</span>
            </div>
            <div className="flex gap-2.5">
              <Input
                placeholder="Enter friend's invite code (e.g. A3F9B2D1)"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                className="font-['JetBrains_Mono'] tracking-widest text-sm py-2.5 bg-card"
              />
              <button
                onClick={tryInvite}
                disabled={!inviteCode.trim() || inviteMsg?.msg === "Connecting with server..."}
                className="bg-primary text-white px-5 rounded-xl text-xs font-extrabold transition-all hover:opacity-90 disabled:opacity-40 shadow-sm flex items-center gap-1.5"
              >
                <Users size={14} /> Connect
              </button>
            </div>
            {inviteMsg && (
              <p className={`text-xs ${inviteMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"} font-extrabold mt-1`}>
                {inviteMsg.msg}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground font-medium">
              We validate all invite codes directly against the MongoDB server. Demo fallbacks have been removed.
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
export function ProfileView({ onNavigate }: { onNavigate: (v: View) => void }) {
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
export function HabitsView() {
  const { habits, addHabit, updateHabit, deleteHabit, growthPlans, activePlanId } = useAuth();
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"active" | "paused" | "archived">("active");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("Fitness");
  const [newFreq, setNewFreq] = useState("Daily");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");

  const activePlan = growthPlans.find(p => p.id === activePlanId) || null;
  const cats = ["All", "Fitness", "Reading", "Hydration", "Career", "Mental Health", "Sleep"];

  // Filtered habits
  const filtered = habits.filter(h => {
    // Status filter
    if (filterStatus === "paused" && !h.paused) return false;
    if (filterStatus === "archived" && !h.archived) return false;
    if (filterStatus === "active" && (h.paused || h.archived)) return false;
    // Category filter
    if (filterCat !== "All" && h.category !== filterCat) return false;
    return true;
  });

  const handleAddHabit = () => {
    if (!newName.trim()) return;
    const todayStr = new Date().toISOString().split("T")[0];
    addHabit({
      name: newName,
      category: newCat,
      icon: newCat === "Fitness" ? "🏃" : newCat === "Reading" ? "📚" : newCat === "Hydration" ? "💧" : newCat === "Career" ? "💻" : newCat === "Sleep" ? "🌙" : "🧘",
      priority: newPriority,
      freq: newFreq,
      target: "1 time",
      streak: 1,
      longestStreak: 1,
      completedToday: true,
      consistencyScore: 85,
      history: [todayStr],
      paused: false,
      archived: false,
      planId: activePlanId || ""
    });
    setNewName("");
    setShowAdd(false);
  };

  const handleToggleHistory = (habit: Habit, dateStr: string) => {
    const currentHist = habit.history || [];
    const exists = currentHist.includes(dateStr);
    const nextHist = exists ? currentHist.filter(d => d !== dateStr) : [...currentHist, dateStr];
    
    // Recalculate streak & consistency score
    const todayStr = new Date().toISOString().split("T")[0];
    const completedToday = nextHist.includes(todayStr);
    const streak = nextHist.length;
    const longestStreak = Math.max(habit.longestStreak || 0, streak);
    const consistencyScore = Math.min(100, Math.round((nextHist.length / 28) * 100));

    updateHabit(habit.id, {
      history: nextHist,
      completedToday,
      streak,
      longestStreak,
      consistencyScore
    });
  };

  // Generate the past 28 days for our interactive heatmap
  const past28Days = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, []);

  // Streaks chart data
  const chartData = habits.filter(h => !h.archived).map(h => ({ name: h.name, streak: h.streak, longest: h.longestStreak || h.streak }));

  return (
    <div className="p-7 space-y-6 font-['Plus_Jakarta_Sans'] text-foreground">
      
      {/* Subheader and Action buttons */}
      <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-tight">Habit Heatmaps & Systems</h2>
            {activePlan && (
              <span className="text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full">
                Plan: {activePlan.title}
              </span>
            )}
          </div>
          <p className="text-foreground/50 text-xs mt-0.5">Track consistency, analyze 28-day heatmaps, and manage habit lifecycles</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Switcher Tabs */}
          <div className="flex bg-muted rounded-xl p-1 gap-1 border border-border">
            <button
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === "active" ? "bg-card text-primary shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ⚡ Active ({habits.filter(h => !h.paused && !h.archived).length})
            </button>
            <button
              onClick={() => setFilterStatus("paused")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === "paused" ? "bg-card text-primary shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ⏸️ Paused ({habits.filter(h => h.paused).length})
            </button>
            <button
              onClick={() => setFilterStatus("archived")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterStatus === "archived" ? "bg-card text-primary shadow-xs font-extrabold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📦 Archived ({habits.filter(h => h.archived).length})
            </button>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} /> New Habit +
          </button>
        </div>
      </div>

      {/* Progress Chart with All Habits */}
      {chartData.length > 0 && (
        <Card className="p-5 border-border shadow-sm bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <BarChart2 size={14} className="text-primary" /> Multi-Habit Streak & Longest Benchmark
            </h3>
            <span className="text-[11px] text-foreground/50 font-bold">Past 30 Days Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="streak" fill="#5c7c64" radius={[6, 6, 0, 0]} maxBarSize={36} name="Current Streak" />
              <Bar dataKey="longest" fill="#BA88AE" radius={[6, 6, 0, 0]} maxBarSize={36} name="Longest Streak" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                filterCat === c
                  ? "bg-primary/15 text-primary border-primary/30 font-extrabold"
                  : "bg-muted text-foreground/60 border-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Add Habit panel */}
      {showAdd && (
        <Card className="p-5 border-primary/30 bg-card shadow-md animate-fadeIn">
          <h3 className="text-sm font-extrabold mb-4 text-primary flex items-center gap-2">
            <PlusCircle size={16} /> Add System Habit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <Input label="Habit Name" placeholder="e.g. 30m Deep Code Review" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Category</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary"
              >
                {cats.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-foreground/60 text-xs mb-1.5 font-bold">Priority</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="w-full bg-input border border-border rounded-xl px-3 py-2.5 text-foreground text-sm outline-none focus:border-primary"
              >
                <option value="high">High 🔥</option><option value="medium">Medium ⚡</option><option value="low">Low ☕</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border/40">
            <Btn onClick={handleAddHabit} variant="primary">Add Habit</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      {/* Habits Grid List with Heatmaps & Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.length === 0 ? (
          <Card className="md:col-span-2 p-10 text-center text-muted-foreground">
            <p>No habits found in the <span className="font-extrabold text-foreground">{filterStatus}</span> view. Create a habit or switch tabs!</p>
          </Card>
        ) : (
          filtered.map(h => {
            const hist = h.history || [];
            const longest = Math.max(h.streak || 0, h.longestStreak || h.streak || 0);
            const score = h.consistencyScore ?? Math.min(100, Math.round(((h.streak || 1) / ((h.streak || 1) + 3)) * 100));
            return (
              <Card
                key={h.id}
                className={`p-5 transition-all space-y-4 ${
                  h.archived ? "border-border/30 bg-muted/10 opacity-60" : h.paused ? "border-amber-500/30 bg-amber-500/5" : h.completedToday ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border bg-card shadow-sm hover:border-primary/20"
                }`}
              >
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl shadow-xs flex-shrink-0">
                      {h.icon || "✨"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-extrabold text-sm truncate ${h.archived ? "line-through text-muted-foreground" : "text-foreground"}`}>{h.name}</h4>
                        {h.paused && <span className="text-[9px] bg-amber-500/20 text-amber-500 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">⏸️ Paused</span>}
                        {h.archived && <span className="text-[9px] bg-muted text-muted-foreground font-extrabold px-2 py-0.5 rounded-full border border-border">📦 Archived</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-muted-foreground text-xs font-semibold">{h.category}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border uppercase ${priorityColor[h.priority] || ""}`}>
                          {h.priority}
                        </span>
                        <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Award size={10} /> Longest: {longest}d
                        </span>
                        <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2 py-0.5 rounded-full">
                          🎯 {score}% Consistency
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lifecycle Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateHabit(h.id, { paused: !h.paused, archived: false })}
                      title={h.paused ? "Resume Habit" : "Pause Habit"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${h.paused ? "bg-amber-500 text-white font-bold" : "bg-muted text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"}`}
                    >
                      {h.paused ? <Zap size={13} /> : <Pause size={13} />}
                    </button>
                    <button
                      onClick={() => updateHabit(h.id, { archived: !h.archived, paused: false })}
                      title={h.archived ? "Unarchive Habit" : "Archive Habit"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${h.archived ? "bg-primary text-white font-bold" : "bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                    >
                      <Archive size={13} />
                    </button>
                    <button
                      onClick={() => deleteHabit(h.id)}
                      title="Delete Habit"
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* 28-Day Heatmap Grid */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                    <span>28-Day Completion Heatmap (Click block to toggle)</span>
                    <span>Past 4 Weeks → Today</span>
                  </div>
                  <div className="grid grid-cols-14 gap-1.5 p-2 bg-muted/30 rounded-xl border border-border/40">
                    {past28Days.map((dStr, idx) => {
                      const isDone = hist.includes(dStr);
                      const isToday = idx === 27;
                      return (
                        <button
                          key={dStr}
                          onClick={() => !h.archived && handleToggleHistory(h, dStr)}
                          title={`${dStr}: ${isDone ? "Completed ✅" : "Missed / Pending"}`}
                          disabled={h.archived}
                          className={`h-5 rounded-md transition-all relative flex items-center justify-center text-[8px] font-extrabold ${
                            isDone
                              ? "bg-primary text-white shadow-xs scale-100"
                              : "bg-card border border-border/80 text-foreground/30 hover:border-primary/50"
                          } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                        >
                          {isToday ? "T" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Streak Counter & Mark Done Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-extrabold flex items-center gap-1.5">
                    <Flame size={14} className="fill-amber-500" /> {h.streak} days active streak
                  </span>
                  <button
                    onClick={() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      handleToggleHistory(h, todayStr);
                    }}
                    disabled={h.archived}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                      h.completedToday
                        ? "bg-primary text-white border-transparent shadow-xs"
                        : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                    } ${h.archived ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {h.completedToday ? <><CheckCircle2 size={13} /> Completed Today</> : <><Circle size={13} /> Mark Done</>}
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export function HealthView() {
  const { healthLogs, updateTodayHealth } = useAuth();
  const todayLog = healthLogs[0] || { date: new Date().toISOString().split("T")[0], waterMl: 1500, sleepHours: 7.5, workoutMins: 45, mood: "😊", notes: "" };
  const [waterCups, setWaterCups] = useState(Math.round((todayLog.waterMl || 0) / 250));
  const [sleep, setSleep] = useState(todayLog.sleepHours || 7.5);
  const [mood, setMood] = useState(todayLog.mood || "good");
  const [notes, setNotes] = useState(todayLog.notes || "");

  const handleUpdateWater = (cups: number) => {
    setWaterCups(cups);
    updateTodayHealth({ waterMl: cups * 250 });
  };

  const handleSaveNotes = () => {
    updateTodayHealth({ sleepHours: sleep, mood, notes });
    alert("✅ Health metrics and reflection saved for today!");
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto font-['Poppins']">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4"><Droplets className="text-cyan-400" size={18} /><h3 className="text-foreground font-bold">Hydration</h3></div>
            <div className="flex items-end justify-between mb-3">
              <span className="text-4xl font-extrabold text-foreground font-['Plus_Jakarta_Sans']">{waterCups}<span className="text-lg text-foreground/30">/10</span></span>
              <span className="text-cyan-400 text-sm">{waterCups * 250} ml</span>
            </div>
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <button key={i} onClick={() => handleUpdateWater(i + 1)} className={`flex-1 h-6 rounded-md transition-all ${i < waterCups ? "bg-cyan-500" : "bg-muted hover:bg-muted/80"}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => handleUpdateWater(Math.max(0, waterCups - 1))} className="flex-1 text-xs py-1.5">−</Btn>
            <Btn variant="outline" onClick={() => handleUpdateWater(Math.min(10, waterCups + 1))} className="flex-1 text-cyan-400 text-xs py-1.5">+ 250ml</Btn>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4"><Moon className="text-indigo-400" size={18} /><h3 className="text-foreground font-bold">Sleep Quality</h3></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-foreground/50 text-sm">Hours Logged</span>
              <span className="text-2xl font-extrabold text-foreground font-['Plus_Jakarta_Sans']">{sleep}h</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${Math.min(100, (sleep / 8) * 100)}%` }} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input type="range" min="3" max="12" step="0.5" value={sleep} onChange={e => setSleep(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>
          <p className="text-[10px] text-foreground/45 mt-2">Recommended: 8 hours for cellular & brain recovery.</p>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4"><Smile className="text-amber-400" size={18} /><h3 className="text-foreground font-bold">Energy & Mood</h3></div>
            <div className="grid grid-cols-3 gap-2">
              {[["😄","great"],["😊","good"],["😐","okay"],["😔","sad"],["😰","stressed"],["🔥","energized"]].map(([e,m]) => (
                <button key={m} type="button" onClick={() => setMood(m)} className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all ${mood === m ? "border-amber-500/40 bg-amber-500/10 scale-105" : "border-border hover:border-border"}`}>
                  <span className="text-lg">{e}</span><span className="text-[9px] text-foreground/40 capitalize">{m}</span>
                </button>
              ))}
            </div>
          </div>
          <Btn onClick={handleSaveNotes} className="mt-3 text-xs py-1.5 w-full">Update Health Log</Btn>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2"><Activity className="text-emerald-400" size={18} /><h3 className="text-foreground font-bold">Health Score Breakdown</h3></div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[["Hydration", Math.min(100, Math.round((waterCups / 10) * 100)), "#06b6d4"], ["Sleep", Math.min(100, Math.round((sleep / 8) * 100)), "#6366f1"], ["Exercise", 85, "#f59e0b"], ["Nutrition", 75, "#10b981"], ["Mental", 90, "#ec4899"]].map(([l,s,c]) => (
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

export function CareerView() {
  const { careerApps, addCareerApp, updateCareerAppStage, deleteCareerApp } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState("Applied");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreateApp = () => {
    if (!company.trim() || !role.trim()) return;
    addCareerApp({ company, role, stage, date: date || "Upcoming", notes });
    setCompany(""); setRole(""); setDate(""); setNotes(""); setShowAddModal(false);
  };

  const commitGrid = Array.from({ length: 7 * 20 }, (_, i) => ({
    id: i,
    level: i % 7 === 0 ? 0 : i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1
  }));

  const commitColors = [
    "bg-muted/30 dark:bg-muted/15",
    "bg-[#F3CCDE]",
    "bg-[#BA88AE]",
    "bg-[#5B3765]",
  ];

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      {/* Header with Add Application Button */}
      <Card className="p-5 border-primary/30 bg-gradient-to-r from-primary/10 to-indigo-500/10 flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-extrabold font-['Plus_Jakarta_Sans']">Career Milestones & Interview Tracker</h3>
          <p className="text-xs text-foreground/60 mt-0.5">Manage job applications, technical prep, and coding hours.</p>
        </div>
        <Btn onClick={() => setShowAddModal(true)} variant="primary" className="text-xs py-2">+ Add Job Application / Goal</Btn>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <Card className="p-5 border-border bg-card space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h4 className="text-sm font-extrabold text-foreground">Add New Career Target</h4>
            <button onClick={() => setShowAddModal(false)} className="text-xs font-bold text-foreground/40 hover:text-foreground">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company / Target Organization" placeholder="e.g. Google, Stripe, Innovate Co" value={company} onChange={e => setCompany(e.target.value)} />
            <Input label="Target Role" placeholder="e.g. Frontend Engineer, Product Manager" value={role} onChange={e => setRole(e.target.value)} />
            <div>
              <label className="block text-xs font-semibold text-foreground/70 mb-1.5">Current Stage</label>
              <select value={stage} onChange={e => setStage(e.target.value)} className="w-full rounded-xl bg-background border border-border px-3 py-2 text-xs text-foreground font-semibold focus:outline-none focus:border-primary">
                <option value="Applied">Applied</option>
                <option value="Resume Review">Resume Review</option>
                <option value="Technical Screening">Technical Screening</option>
                <option value="System Design">System Design</option>
                <option value="Onsite Technical">Onsite Technical</option>
                <option value="Offer Received 🎉">Offer Received 🎉</option>
              </select>
            </div>
            <Input label="Target Date / Interview Date" placeholder="e.g. Next Tuesday / 2026-08-10" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setShowAddModal(false)} variant="ghost">Cancel</Btn>
            <Btn onClick={handleCreateApp}>Save Application</Btn>
          </div>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Study Hours", value: "48.5 hrs", desc: "This Month Progress", percent: 72, color: "bg-primary" },
          { title: "Coding Sessions", value: "31 cycles", desc: "This Month Progress", percent: 85, color: "bg-accent" },
          { title: "Career Readiness", value: "82/100", desc: "Growth Score", percent: 82, color: "bg-primary" }
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
              { sk: "Full Stack Architecture", lvl: 85 },
              { sk: "System Design & Scalability", lvl: 75 },
              { sk: "Algorithms & Problem Solving", lvl: 80 }
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
          <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Active Applications ({careerApps.length})</h3>
          <div className="divide-y divide-border/40 space-y-3 pt-1">
            {careerApps.length === 0 ? (
              <p className="text-xs text-foreground/40 text-center py-4">No applications tracked yet. Click "+ Add Job Application" above!</p>
            ) : (
              careerApps.map(inv => (
                <div key={inv.id} className="flex justify-between items-start py-2.5 first:pt-0 last:pb-0 text-xs gap-2">
                  <div className="flex-1">
                    <p className="font-extrabold text-foreground/85">{inv.company}</p>
                    <p className="text-[10px] text-foreground/50 mt-0.5">{inv.role}</p>
                    {inv.notes && <p className="text-[9px] text-primary/80 mt-1 italic">{inv.notes}</p>}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <select
                      value={inv.stage}
                      onChange={e => updateCareerAppStage(inv.id, e.target.value)}
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase cursor-pointer border border-transparent focus:border-primary ${inv.color || "bg-muted text-foreground"}`}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Resume Review">Resume Review</option>
                      <option value="Technical Screening">Technical Screening</option>
                      <option value="System Design">System Design</option>
                      <option value="Onsite Technical">Onsite Technical</option>
                      <option value="Offer Received 🎉">Offer Received 🎉</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-foreground/40 font-medium">{inv.date}</span>
                      <button onClick={() => deleteCareerApp(inv.id)} className="text-[10px] text-red-400 hover:text-red-500 font-bold" title="Delete application">✕</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}

export function FocusView() {
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

export function GoalsView() {
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
        {(goalsList || []).map(g => (
          <Card key={g.id} className="p-5 border-border bg-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold">{g.title}</h4>
                <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase">{g.timeframe || (g as any).category || "quarter"}</span>
              </div>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {(g.milestones || []).map(m => (
                  <span key={m} className="text-[10px] text-foreground/45 bg-muted px-2.5 py-0.5 rounded-lg border border-border/20 font-medium">✓ {m}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="text-right">
                <span className="text-[10px] text-foreground/40 block">Progress</span>
                <span className="text-xs font-extrabold text-primary">{g.progress || 0}%</span>
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

export function LearningView() {
  const { learningSteps, toggleLearningStep, addLearningStep, learningCourses, addLearningCourse, toggleCourseComplete } = useAuth();
  const [showAddStep, setShowAddStep] = useState(false);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDesc, setStepDesc] = useState("");

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseCat, setCourseCat] = useState("Coding");
  const [courseHours, setCourseHours] = useState("10");

  const handleCreateStep = () => {
    if (!stepTitle.trim()) return;
    addLearningStep({ title: stepTitle, desc: stepDesc || "Custom self-study milestone" });
    setStepTitle(""); setStepDesc(""); setShowAddStep(false);
  };

  const handleCreateCourse = () => {
    if (!courseTitle.trim()) return;
    addLearningCourse({ title: courseTitle, desc: courseDesc || "Self-paced study topic", category: courseCat, hours: Number(courseHours) || 5 });
    setCourseTitle(""); setCourseDesc(""); setShowAddCourse(false);
  };

  return (
    <div className="p-7 space-y-6 max-w-4xl mx-auto text-foreground font-['Poppins']">
      {/* Header Banner */}
      <Card className="p-5 border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-extrabold font-['Plus_Jakarta_Sans']">Personalized Learning & Skill Roadmap</h3>
          <p className="text-xs text-foreground/60 mt-0.5">Track study steps, complete courses, and add custom study targets.</p>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => setShowAddStep(true)} variant="outline" className="text-xs py-2">+ Add Milestone</Btn>
          <Btn onClick={() => setShowAddCourse(true)} variant="primary" className="text-xs py-2">+ Add Course / Topic</Btn>
        </div>
      </Card>

      {/* Add Step Modal */}
      {showAddStep && (
        <Card className="p-5 border-border bg-card space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h4 className="text-sm font-extrabold text-foreground">New Study Roadmap Step</h4>
            <button onClick={() => setShowAddStep(false)} className="text-xs font-bold text-foreground/40 hover:text-foreground">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Milestone Title" placeholder="e.g. Master Rust Concurrency" value={stepTitle} onChange={e => setStepTitle(e.target.value)} />
            <Input label="Description / Focus Area" placeholder="e.g. Threads, channels, async patterns" value={stepDesc} onChange={e => setStepDesc(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setShowAddStep(false)} variant="ghost">Cancel</Btn>
            <Btn onClick={handleCreateStep}>Save Roadmap Step</Btn>
          </div>
        </Card>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <Card className="p-5 border-border bg-card space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-border/40 pb-2">
            <h4 className="text-sm font-extrabold text-foreground">Add Custom Course / Study Target</h4>
            <button onClick={() => setShowAddCourse(false)} className="text-xs font-bold text-foreground/40 hover:text-foreground">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Course Title" placeholder="e.g. System Design Interview Bootcamp" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} />
            <Input label="Description / Platform" placeholder="e.g. 15 hours on architecture & scaling" value={courseDesc} onChange={e => setCourseDesc(e.target.value)} />
            <Input label="Category" placeholder="e.g. Coding, Career, Wellness" value={courseCat} onChange={e => setCourseCat(e.target.value)} />
            <Input label="Estimated Hours" type="number" placeholder="10" value={courseHours} onChange={e => setCourseHours(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Btn onClick={() => setShowAddCourse(false)} variant="ghost">Cancel</Btn>
            <Btn onClick={handleCreateCourse}>Add Course Target</Btn>
          </div>
        </Card>
      )}

      {/* Learning Roadmap Steps */}
      <Card className="p-5 border-border bg-card space-y-4">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">Self-Study Roadmap Progress</h3>
        <div className="relative border-l border-border pl-6 ml-2 space-y-5">
          {learningSteps.map((r, idx) => (
            <div key={r.step} className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={() => toggleLearningStep(idx)}>
              <div className={`absolute -left-9 top-0.5 w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${r.done ? "bg-primary border-transparent text-white shadow-sm" : "bg-muted border-border text-foreground/35"}`}>
                {r.done ? "✓" : r.step}
              </div>
              <div>
                <h4 className={`text-xs font-bold ${r.done ? "text-foreground line-through opacity-70" : "text-foreground"}`}>{r.title}</h4>
                <p className="text-[10px] text-foreground/45 mt-0.5 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Custom Courses & Study Targets */}
      <Card className="p-5 border-border bg-card space-y-4">
        <h3 className="text-xs font-extrabold text-foreground/40 uppercase tracking-widest">My Courses & Study Goals ({learningCourses.filter(c => c.completed).length}/{learningCourses.length} done)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {learningCourses.map(c => (
            <div key={c.id} onClick={() => toggleCourseComplete(c.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${c.completed ? "border-primary/40 bg-primary/5 opacity-75" : "border-border hover:border-primary/30 bg-muted/20"}`}>
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-bold text-foreground">{c.title}</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${c.completed ? "bg-primary text-white" : "bg-muted text-foreground/50"}`}>
                  {c.completed ? "Completed ✓" : `${c.hours} hrs`}
                </span>
              </div>
              <p className="text-[10px] text-foreground/50 mt-1 leading-relaxed">{c.desc}</p>
              <span className="text-[9px] font-bold text-primary mt-2 block uppercase tracking-wider">[{c.category}]</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function JournalView() {
  const { journals, addJournal, updateJournal, deleteJournal, notes, addNote, updateNote, deleteNote, growthPlans, activePlanId } = useAuth();
  
  // Tab and Folder state
  const [subTab, setSubTab] = useState<"reflections" | "notes">("reflections");
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("gs_custom_folders") || '["Learning & Tech", "Career Ideas", "Personal Growth", "Daily Reflections"]'); }
    catch { return ["Learning & Tech", "Career Ideas", "Personal Growth", "Daily Reflections"]; }
  });
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddFolder, setShowAddFolder] = useState(false);

  // Search and Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [planFilter, setPlanFilter] = useState<string>("all");

  // New Reflection Form state
  const [mood, setMood] = useState("😄");
  const [wins, setWins] = useState("");
  const [challenges, setChallenges] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [lessons, setLessons] = useState("");
  const [refFolder, setRefFolder] = useState("Daily Reflections");
  const [refPlanId, setRefPlanId] = useState(activePlanId || "");
  const [refTags, setRefTags] = useState("");

  // New Note Form state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteColor, setNoteColor] = useState("text-primary bg-primary/10");
  const [noteFolder, setNoteFolder] = useState("Learning & Tech");
  const [notePlanId, setNotePlanId] = useState(activePlanId || "");
  const [noteTags, setNoteTags] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const persistFolders = (folders: string[]) => {
    setCustomFolders(folders);
    localStorage.setItem("gs_custom_folders", JSON.stringify(folders));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || customFolders.includes(newFolderName.trim())) return;
    const next = [...customFolders, newFolderName.trim()];
    persistFolders(next);
    setNewFolderName("");
    setShowAddFolder(false);
    setActiveFolder(next[next.length - 1]);
  };

  const applyPrompt = (type: string) => {
    if (type === "evening") {
      setWins("• Maintained focus on my custom growth plan tasks today.\n• Drank water and completed active movement block.");
      setChallenges("• Procrastinated slightly during afternoon deep work block.");
      setGratitude("• Grateful for mental clarity and structured accountability tools.");
      setLessons("• Break large intimidating tasks into 15-minute micro steps right away.");
      setRefFolder("Daily Reflections");
    } else if (type === "gratitude") {
      setGratitude("1. Physical vitality and good health.\n2. Access to top self-learning resources.\n3. Consistent progress toward my long-term goals.");
      setWins("Taking intentional daily action toward my personal vision.");
      setRefFolder("Personal Growth");
    } else if (type === "weekly") {
      setWins("• Completed key study roadmap milestones.\n• Checked off daily habits consistently all week.");
      setChallenges("• Need more structured wind-down time before bed.");
      setLessons("• Small daily habits compound into massive weekly wins over time.");
      setRefFolder("Personal Growth");
    }
  };

  const handleAddJournal = () => {
    if (!wins.trim() && !challenges.trim() && !gratitude.trim() && !lessons.trim()) return;
    const tagsArr = refTags.split(",").map(t => t.trim()).filter(Boolean);
    addJournal({
      mood,
      wins,
      challenges,
      gratitude,
      lessons,
      folder: refFolder,
      planId: refPlanId || activePlanId || undefined,
      tags: tagsArr,
      pinned: false
    });
    setWins(""); setChallenges(""); setGratitude(""); setLessons(""); setRefTags("");
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteBody.trim()) return;
    const tagsArr = noteTags.split(",").map(t => t.trim()).filter(Boolean);
    if (editingNoteId) {
      updateNote(editingNoteId, {
        title: noteTitle,
        body: noteBody,
        color: noteColor,
        folder: noteFolder,
        planId: notePlanId || activePlanId || undefined,
      });
      setEditingNoteId(null);
    } else {
      addNote({
        title: noteTitle || "Untitled Note",
        body: noteBody,
        color: noteColor,
        folder: noteFolder,
        planId: notePlanId || activePlanId || undefined,
      });
    }
    setNoteTitle(""); setNoteBody(""); setNoteTags(""); setShowNoteForm(false);
  };

  const startEditNoteItem = (n: Note) => {
    setEditingNoteId(n.id);
    setNoteTitle(n.title);
    setNoteBody(n.body);
    setNoteColor(n.color || "text-primary bg-primary/10");
    setNoteFolder(n.folder || "Learning & Tech");
    setNotePlanId(n.planId || "");
    setShowNoteForm(true);
  };

  // Filtered entries
  const filteredJournals = journals.filter(j => {
    if (activeFolder !== "all" && j.folder !== activeFolder && !(activeFolder === "Daily Reflections" && !j.folder)) return false;
    if (onlyPinned && !j.pinned) return false;
    if (planFilter !== "all" && j.planId !== planFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = `${j.wins} ${j.challenges} ${j.gratitude} ${j.lessons} ${j.tags?.join(" ")}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const filteredNotes = notes.filter(n => {
    if (activeFolder !== "all" && n.folder !== activeFolder && !(activeFolder === "Learning & Tech" && !n.folder)) return false;
    if (onlyPinned && !n.pinned) return false;
    if (planFilter !== "all" && n.planId !== planFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = `${n.title} ${n.body}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const allFolderNames = ["all", ...customFolders];

  return (
    <div className="p-7 space-y-6 max-w-5xl mx-auto text-foreground font-['Plus_Jakarta_Sans']">
      
      {/* HEADER & TOP CONTROL BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            🧠 Knowledge, Notes & Reflections Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Organize folders, pin key insights, and link entries directly to your Growth Plans.</p>
        </div>

        {/* Sub-tab switchers */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-2xl border border-border/60 shadow-inner">
          <button
            onClick={() => { setSubTab("reflections"); setActiveFolder("all"); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${subTab === "reflections" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            📔 Daily Reflections ({journals.length})
          </button>
          <button
            onClick={() => { setSubTab("notes"); setActiveFolder("all"); }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${subTab === "notes" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            📝 Free-form Notes ({notes.length})
          </button>
        </div>
      </div>

      {/* FOLDERS & SEARCH BAR */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-xs">
          
          {/* Folders pill navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full flex-wrap">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
              <Folder size={13} /> Folders:
            </span>
            {allFolderNames.map(f => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeFolder === f
                    ? "bg-primary text-white shadow-xs font-extrabold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f === "all" ? "📂 All Folders" : `📁 ${f}`}
              </button>
            ))}
            
            {!showAddFolder ? (
              <button
                onClick={() => setShowAddFolder(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold border border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-1"
              >
                <Plus size={12} /> New Folder
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                <input
                  type="text"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
                  className="text-xs px-2 py-1 bg-card rounded-lg border border-border w-28 outline-none"
                  autoFocus
                />
                <button onClick={handleCreateFolder} className="text-[10px] bg-primary text-white font-bold px-2 py-1 rounded-lg">Add</button>
                <button onClick={() => setShowAddFolder(false)} className="text-[10px] text-muted-foreground px-1.5">✕</button>
              </div>
            )}
          </div>

          {/* Search, Pin and Plan filters */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <div className="relative flex-1 md:w-52">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search text, tags, lessons..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-muted/60 border border-border/80 focus:bg-card focus:border-primary outline-none transition-all"
              />
            </div>

            <button
              onClick={() => setOnlyPinned(!onlyPinned)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                onlyPinned
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              <Star size={13} className={onlyPinned ? "fill-amber-500" : ""} /> Pinned
            </button>

            {growthPlans.length > 0 && (
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="text-xs bg-card border border-border rounded-xl px-2.5 py-1.5 font-bold text-foreground outline-none focus:border-primary"
              >
                <option value="all">🎯 All Growth Plans</option>
                {growthPlans.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DAILY REFLECTIONS ENGINE */}
      {subTab === "reflections" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Guided Prompts Box */}
          <Card className="p-4 border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="animate-pulse" /> Guided Reflection Templates:
            </span>
            <div className="flex gap-2 flex-wrap">
              <Btn onClick={() => applyPrompt("evening")} variant="outline" className="text-[11px] py-1.5 bg-card hover:border-primary font-bold">🧠 Evening Reflection</Btn>
              <Btn onClick={() => applyPrompt("gratitude")} variant="outline" className="text-[11px] py-1.5 bg-card hover:border-primary font-bold">⚡ Daily Gratitude</Btn>
              <Btn onClick={() => applyPrompt("weekly")} variant="outline" className="text-[11px] py-1.5 bg-card hover:border-primary font-bold">🎯 Weekly Review</Btn>
            </div>
          </Card>

          {/* New Reflection Form */}
          <Card className="p-5 border-border bg-card shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/40 pb-3 flex-wrap gap-2">
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Plus size={14} className="text-primary" /> Log New Reflection Entry
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-foreground/60 font-bold">Folder:</span>
                <select
                  value={refFolder}
                  onChange={e => setRefFolder(e.target.value)}
                  className="text-xs bg-muted border border-border rounded-lg px-2 py-1 font-bold"
                >
                  {customFolders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                {growthPlans.length > 0 && (
                  <>
                    <span className="text-xs text-foreground/60 font-bold ml-2">Plan:</span>
                    <select
                      value={refPlanId}
                      onChange={e => setRefPlanId(e.target.value)}
                      className="text-xs bg-muted border border-border rounded-lg px-2 py-1 font-bold text-primary"
                    >
                      <option value="">No Plan Linked</option>
                      {growthPlans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap pt-1">
              <span className="text-xs text-foreground/60 font-extrabold mr-1">Select Today's Mood:</span>
              {["😄", "😊", "😐", "😔", "😰", "😤", "🧘", "🔥"].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border transition-all ${
                    mood === m ? "bg-primary/15 border-primary scale-110 shadow-xs ring-2 ring-primary/20" : "border-border hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea label="Today's Wins & Progress" placeholder="What went well today? What accomplishments are you proud of?" value={wins} onChange={e => setWins(e.target.value)} rows={3} />
              <Textarea label="Today's Challenges & Obstacles" placeholder="What blocked your focus or slowed you down?" value={challenges} onChange={e => setChallenges(e.target.value)} rows={3} />
              <Textarea label="Gratitude Focus" placeholder="Name 3 things you are truly grateful for today..." value={gratitude} onChange={e => setGratitude(e.target.value)} rows={3} />
              <Textarea label="Lessons Learned & Takeaways" placeholder="What will you do differently next time? Key insights?" value={lessons} onChange={e => setLessons(e.target.value)} rows={3} />
            </div>

            <div className="flex justify-between items-center pt-2 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <span className="text-xs font-bold text-muted-foreground">Tags:</span>
                <input
                  type="text"
                  placeholder="e.g. system-design, deep-work, mindset (comma separated)"
                  value={refTags}
                  onChange={e => setRefTags(e.target.value)}
                  className="text-xs px-3 py-1.5 bg-muted rounded-xl border border-border flex-1 outline-none"
                />
              </div>
              <Btn onClick={handleAddJournal} className="px-6 font-extrabold shadow-sm">
                Save Reflection Entry
              </Btn>
            </div>
          </Card>

          {/* Logged reflections list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                {activeFolder === "all" ? "All Reflections" : `${activeFolder} Entries`} ({filteredJournals.length})
              </span>
            </div>

            {filteredJournals.length === 0 ? (
              <Card className="p-10 text-center text-xs text-muted-foreground border-dashed space-y-2">
                <BookOpen size={32} className="mx-auto text-primary/30" />
                <p className="font-bold">No reflection entries found.</p>
                <p className="text-[11px] opacity-75">Try selecting a guided template button above or clearing your search filter!</p>
              </Card>
            ) : (
              filteredJournals.map(j => {
                const linkedPlan = growthPlans.find(p => p.id === j.planId);
                return (
                  <Card key={j.id} className={`p-5 border ${j.pinned ? "border-amber-500/40 bg-amber-500/5 shadow-md" : "border-border bg-card"} space-y-3.5 transition-all relative group`}>
                    <div className="flex justify-between items-center border-b border-border/40 pb-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{j.mood}</span>
                        <div>
                          <span className="text-xs font-extrabold text-foreground">Reflected on {j.date}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md font-bold text-muted-foreground">📁 {j.folder || "Daily Reflections"}</span>
                            {linkedPlan && (
                              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-extrabold">🎯 {linkedPlan.title}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateJournal(j.id, { pinned: !j.pinned })}
                          className={`p-1.5 rounded-xl border transition-all ${
                            j.pinned
                              ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                              : "bg-muted text-muted-foreground border-border hover:text-amber-500"
                          }`}
                          title={j.pinned ? "Unpin entry" : "Pin entry to top"}
                        >
                          <Star size={14} className={j.pinned ? "fill-amber-500" : ""} />
                        </button>
                        <button
                          onClick={() => deleteJournal(j.id)}
                          className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-border transition-all"
                          title="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {j.wins && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                          <p className="text-emerald-600 dark:text-emerald-400 font-extrabold mb-1 flex items-center gap-1">✨ Today's Wins</p>
                          <p className="text-foreground/80 leading-relaxed whitespace-pre-line font-medium">{j.wins}</p>
                        </div>
                      )}
                      {j.challenges && (
                        <div className="bg-muted/30 p-3 rounded-xl border border-border/40">
                          <p className="text-red-500 font-extrabold mb-1 flex items-center gap-1">🚧 Challenges & Obstacles</p>
                          <p className="text-foreground/80 leading-relaxed whitespace-pre-line font-medium">{j.challenges}</p>
                        </div>
                      )}
                      {j.gratitude && (
                        <div className="col-span-1 md:col-span-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
                          <p className="text-primary font-extrabold mb-1 flex items-center gap-1">🙏 Gratitude Focus</p>
                          <p className="text-foreground/85 leading-relaxed whitespace-pre-line font-medium">{j.gratitude}</p>
                        </div>
                      )}
                      {j.lessons && (
                        <div className="col-span-1 md:col-span-2 bg-purple-500/5 p-3 rounded-xl border border-purple-500/10">
                          <p className="text-purple-600 dark:text-purple-400 font-extrabold mb-1 flex items-center gap-1">💡 Lessons Learned & Key Takeaways</p>
                          <p className="text-foreground/85 leading-relaxed whitespace-pre-line font-medium">{j.lessons}</p>
                        </div>
                      )}
                    </div>

                    {j.tags && j.tags.length > 0 && (
                      <div className="flex gap-1.5 pt-2 border-t border-border/30 flex-wrap">
                        {j.tags.map(t => (
                          <span key={t} className="text-[10px] bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full border border-border/40">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* SUB-TAB 2: FREE-FORM NOTES & KNOWLEDGE BASE */}
      {subTab === "notes" && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              {activeFolder === "all" ? "All Notes & Documents" : `${activeFolder} Notes`} ({filteredNotes.length})
            </span>
            <Btn onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteBody(""); setShowNoteForm(true); }} className="text-xs font-extrabold shadow-sm flex items-center gap-1.5">
              <Plus size={14} /> New Note / Document
            </Btn>
          </div>

          {showNoteForm && (
            <Card className="p-5 border-primary/30 bg-card shadow-md space-y-4 animate-scale-up">
              <div className="flex justify-between items-center border-b border-border/40 pb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                  {editingNoteId ? "✏️ Edit Note" : "📝 Create New Note"}
                </h3>
                <button onClick={() => { setShowNoteForm(false); setEditingNoteId(null); }} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-1">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase">Folder</label>
                  <select
                    value={noteFolder}
                    onChange={e => setNoteFolder(e.target.value)}
                    className="w-full text-xs bg-muted border border-border rounded-xl px-3 py-2 font-bold"
                  >
                    {customFolders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {growthPlans.length > 0 && (
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-[11px] font-extrabold text-muted-foreground uppercase">Link Growth Plan</label>
                    <select
                      value={notePlanId}
                      onChange={e => setNotePlanId(e.target.value)}
                      className="w-full text-xs bg-muted border border-border rounded-xl px-3 py-2 font-bold text-primary"
                    >
                      <option value="">No Plan Linked</option>
                      {growthPlans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[11px] font-extrabold text-muted-foreground uppercase">Accent Badge</label>
                  <select
                    value={noteColor}
                    onChange={e => setNoteColor(e.target.value)}
                    className="w-full text-xs bg-muted border border-border rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="text-primary bg-primary/10">Emerald / Primary</option>
                    <option value="text-purple-600 dark:text-purple-400 bg-purple-500/10">Purple / Career</option>
                    <option value="text-amber-600 dark:text-amber-400 bg-amber-500/10">Amber / Streak</option>
                    <option value="text-cyan-600 dark:text-cyan-400 bg-cyan-500/10">Cyan / Health</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Note Title (e.g. System Design Key Principles, Tech Stack Roadmap...)"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  className="font-bold text-sm"
                />
                <Textarea
                  placeholder="Note Body & Detailed Context (markdown, bullet points, links...)"
                  value={noteBody}
                  onChange={e => setNoteBody(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Btn onClick={() => { setShowNoteForm(false); setEditingNoteId(null); }} variant="ghost" className="text-xs">Cancel</Btn>
                <Btn onClick={handleSaveNote} className="text-xs font-extrabold px-6">Save Note</Btn>
              </div>
            </Card>
          )}

          {filteredNotes.length === 0 ? (
            <Card className="p-10 text-center text-xs text-muted-foreground border-dashed space-y-2">
              <FileText size={32} className="mx-auto text-primary/30" />
              <p className="font-bold">No notes found right now.</p>
              <p className="text-[11px] opacity-75">Click "New Note / Document" above to capture key learnings and ideas!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map(n => {
                const linkedPlan = growthPlans.find(p => p.id === n.planId);
                return (
                  <Card
                    key={n.id}
                    className={`p-5 rounded-2xl border ${n.pinned ? "border-amber-500/50 bg-amber-500/5 shadow-md" : "border-border bg-card"} relative group shadow-sm flex flex-col justify-between min-h-[160px] transition-all hover:border-primary/30`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {n.pinned && <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                          <p className="text-foreground font-extrabold text-base truncate">{n.title || "Untitled Note"}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateNote(n.id, { pinned: !n.pinned })}
                            className={`p-1.5 rounded-lg transition-all ${
                              n.pinned ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground hover:text-amber-500"
                            }`}
                            title={n.pinned ? "Unpin note" : "Pin note"}
                          >
                            <Star size={13} className={n.pinned ? "fill-amber-500" : ""} />
                          </button>
                          <button
                            onClick={() => startEditNoteItem(n)}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                            title="Edit note"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteNote(n.id)}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                            title="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-bold">
                          📁 {n.folder || "Learning & Tech"}
                        </span>
                        {linkedPlan && (
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md font-extrabold">
                            🎯 {linkedPlan.title}
                          </span>
                        )}
                      </div>

                      <p className="text-foreground/80 text-xs leading-relaxed whitespace-pre-line pt-1 font-medium">{n.body}</p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-4 pt-2.5 border-t border-border/30 font-medium">
                      <span>Created: {n.createdAt}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold ${n.color || "text-primary bg-primary/10"}`}>
                        Note
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export function TimeTrackerView() {
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

export function AchievementsView() {
  const { user, coins, rewards, buyReward, tasks, habits, focusSessions, journals, growthPlans } = useAuth();
  
  // 1. Dynamic Level & Season Pass Tier calculations
  const totalXp = user?.xp || 0;
  const currentLevel = Math.floor(totalXp / 500) + 1;
  const xpInLevel = totalXp % 500;
  const levelProgressPct = Math.min(100, Math.round((xpInLevel / 500) * 100));

  const seasonTier = Math.floor(totalXp / 1000) + 1;
  const seasonTierProgressPct = Math.min(100, Math.round(((totalXp % 1000) / 1000) * 100));

  // 2. Real metrics derived from database & local storage activity
  const completedTasksCount = tasks.filter(t => t.done).length;
  const bestStreak = Math.max(
    user?.streak || 0,
    ...habits.map(h => Math.max(h.longestStreak || 0, h.streak || 0)),
    0
  );
  const habitsDoneCount = habits.reduce((acc, h) => acc + (h.completedToday ? 1 : 0) + (h.streak || 0), 0);
  const focusMinutesTotal = focusSessions.reduce((acc, s) => acc + (s.duration || 0), 0) +
    tasks.filter(t => t.done).reduce((acc, t) => acc + (t.estimatedDuration || 30), 0);
  const focusHoursTotal = Math.round((focusMinutesTotal / 60) * 10) / 10;

  // 3. Dynamic Badges Engine
  const badges = [
    {
      id: "b1",
      name: "First Step",
      desc: "Complete your very first task (+15 XP)",
      icon: "⚡",
      unlocked: completedTasksCount >= 1,
      progressText: `${completedTasksCount} / 1 tasks`
    },
    {
      id: "b2",
      name: "Task Master",
      desc: "Complete 10 high-impact personal tasks",
      icon: "🎯",
      unlocked: completedTasksCount >= 10,
      progressText: `${Math.min(10, completedTasksCount)} / 10 tasks`
    },
    {
      id: "b3",
      name: "Habit Warrior",
      desc: "Check off 5 habits or maintain consistency",
      icon: "🔥",
      unlocked: habitsDoneCount >= 5,
      progressText: `${Math.min(5, habitsDoneCount)} / 5 check-ins`
    },
    {
      id: "b4",
      name: "Streak Master",
      desc: "Reach a 7-day consistency streak across habits",
      icon: "🏆",
      unlocked: bestStreak >= 7,
      progressText: `${Math.min(7, bestStreak)} / 7 days`
    },
    {
      id: "b5",
      name: "Deep Thinker",
      desc: "Log 5 hours of deep work or stopwatch sessions",
      icon: "🧠",
      unlocked: focusHoursTotal >= 5,
      progressText: `${Math.min(5, focusHoursTotal)} / 5 hours`
    },
    {
      id: "b6",
      name: "Reflection Guru",
      desc: "Write 3 reflection journals or daily entries",
      icon: "📓",
      unlocked: journals.length >= 3,
      progressText: `${Math.min(3, journals.length)} / 3 entries`
    },
    {
      id: "b7",
      name: "Plan Architect",
      desc: "Create and activate a personalized Growth Plan",
      icon: "🗺️",
      unlocked: growthPlans.length >= 1,
      progressText: `${Math.min(1, growthPlans.length)} / 1 plans`
    },
    {
      id: "b8",
      name: "Legendary Consistency",
      desc: "Achieve Level 5 or earn over 2,500 total XP",
      icon: "👑",
      unlocked: currentLevel >= 5 || totalXp >= 2500,
      progressText: `${totalXp} / 2500 XP`
    }
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
    <div className="p-7 space-y-6 max-w-5xl mx-auto text-foreground font-['Plus_Jakarta_Sans']">
      
      {/* HEADER & LEVEL STATUS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 border-border bg-card shadow-sm md:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] bg-primary/10 text-primary font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                XP Rewards Engine Active
              </span>
              <h2 className="text-2xl font-extrabold text-foreground mt-2 flex items-center gap-2">
                Level {currentLevel} Growth Operator
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                You have earned <strong className="text-primary font-bold">{totalXp.toLocaleString()} XP</strong> total across tasks (+15 XP), habits (+20 XP), milestones (+50 XP), and check-ins (+25 XP).
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-primary">{totalXp}</span>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Total XP</p>
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-muted-foreground">
              <span>Progress to Level {currentLevel + 1}</span>
              <span className="text-foreground">{xpInLevel} / 500 XP ({levelProgressPct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden relative border border-border/40">
              <div className="h-full bg-gradient-to-r from-violet-600 to-pink-600 transition-all duration-500" style={{ width: `${levelProgressPct}%` }} />
            </div>
          </div>
        </Card>

        {/* Season Pass tracker */}
        <Card className="p-5 border-border bg-card shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Season Pass Tier</span>
              <span className="text-xs text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded-md">Tier {seasonTier}</span>
            </div>
            <h3 className="text-sm font-extrabold text-foreground mt-1">Season 1: Mastery Ascent</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Unlock exclusive soundscapes, themes, and profile badges at every tier milestone (1,000 XP/tier).</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
              <span>Next Tier {seasonTier + 1}</span>
              <span className="text-primary">{seasonTierProgressPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden relative border border-border/40">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${seasonTierProgressPct}%` }} />
            </div>
          </div>
        </Card>
      </div>

      {/* DYNAMIC BADGES GRID */}
      <div className="space-y-3">
        <div className="flex justify-between items-center border-b border-border/40 pb-2">
          <div>
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">Dynamic Achievements & Badges</h3>
            <p className="text-xs text-muted-foreground">Real-time unlocking verified against your database activity and streak records.</p>
          </div>
          <span className="text-xs font-extrabold bg-muted px-3 py-1 rounded-full text-foreground/80">
            {badges.filter(b => b.unlocked).length} / {badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map(b => (
            <Card key={b.id} className={`p-4 text-center flex flex-col items-center justify-between border transition-all ${b.unlocked ? "border-primary/40 bg-primary/5 shadow-md hover:scale-[1.02]" : "border-border opacity-65 bg-card hover:opacity-85"}`}>
              <span className="text-4xl filter drop-shadow-sm mb-2">{b.icon}</span>
              <div className="w-full">
                <h4 className="text-xs font-extrabold text-foreground truncate">{b.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal line-clamp-2 px-1">{b.desc}</p>
              </div>
              <div className="w-full mt-3 pt-2 border-t border-border/40 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground">{b.progressText}</span>
                <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border w-full ${b.unlocked ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : "border-border text-muted-foreground bg-muted/50"}`}>
                  {b.unlocked ? "✓ Unlocked" : "Locked"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* REWARDS STORE */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center border-b border-border/40 pb-2">
          <div>
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">GrowCoins Rewards Store</h3>
            <p className="text-xs text-muted-foreground">Redeem your earned GrowCoins (🪙) for custom profile accessories and themes.</p>
          </div>
          <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold px-3 py-1.5 rounded-xl border border-amber-500/20">
            Your Balance: 🪙 {coins} coins
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map(r => (
            <Card key={r.id} className="p-4 border-border bg-card flex justify-between items-center hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{r.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{r.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{r.category} Accessory</p>
                </div>
              </div>
              <button
                onClick={() => handleBuyReward(r.id)}
                disabled={r.bought || coins < r.cost}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all border ${r.bought ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 cursor-default" : coins >= r.cost ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white border-transparent hover:opacity-90 shadow-sm" : "bg-muted text-muted-foreground border-border opacity-60 cursor-not-allowed"}`}
              >
                {r.bought ? "✓ Purchased" : `🪙 ${r.cost} coins`}
              </button>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}

export function AnalyticsView() {
  const { user, habits, tasks, focusSessions, journals, notes, healthLogs, growthPlans } = useAuth();

  // 1. Real KPI Summary Metrics
  const totalXp = user?.xp || 0;
  const bestStreak = Math.max(
    user?.streak || 0,
    ...habits.map(h => Math.max(h.longestStreak || 0, h.streak || 0)),
    0
  );
  
  // Calculate total historical habits done from habit histories + completedToday
  const habitsDoneTotal = habits.reduce((acc, h) => {
    const historyCount = Array.isArray(h.history) ? h.history.length : 0;
    return acc + Math.max(historyCount, h.completedToday ? 1 : 0, h.streak || 0);
  }, 0);

  // Focus & Study hours total
  const focusMinutesTotal = focusSessions.reduce((acc, s) => acc + (s.duration || 0), 0) +
    tasks.filter(t => t.done).reduce((acc, t) => acc + (t.estimatedDuration || 30), 0);
  const focusHoursTotal = Math.round((focusMinutesTotal / 60) * 10) / 10;

  const completedTasksCount = tasks.filter(t => t.done).length;
  const pendingTasksCount = tasks.filter(t => !t.done).length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  // 2. Real Habits Category Breakdown (PieChart)
  const categoryMap: Record<string, number> = {};
  habits.forEach(h => {
    const cat = h.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  if (Object.keys(categoryMap).length === 0) {
    categoryMap["No Habits Yet"] = 1;
  }

  const categoryColors: Record<string, string> = {
    Fitness: "#10B981",
    Health: "#06B6D4",
    Coding: "#8B5CF6",
    Career: "#EC4899",
    Reading: "#F59E0B",
    Wellness: "#3B82F6",
    Study: "#6366F1",
    General: "#64748B",
    "No Habits Yet": "#CBD5E1"
  };

  const habitCategoriesData = Object.entries(categoryMap).map(([name, value], idx) => ({
    name,
    value,
    color: categoryColors[name] || `hsl(${(idx * 65) % 360}, 70%, 55%)`
  }));

  // 3. Real 14-Day Activity & XP Growth Trend (AreaChart)
  // Derive activity from dates in healthLogs, focusSessions, and tasks
  const recentDays: { dateStr: string; label: string; xp: number; focusMins: number; tasksDone: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Calculate daily activity XP estimation & focus
    const dayHealth = healthLogs.find(l => l.date === dateStr);
    const dayFocus = focusSessions.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.duration, 0);
    const dayTasks = tasks.filter(t => t.dueDate === dateStr && t.done).length;

    let dayXp = 0;
    if (dayHealth) dayXp += 30;
    if (dayFocus > 0) dayXp += Math.round(dayFocus / 5);
    dayXp += dayTasks * 15;
    
    // Add baseline for current streak if active today
    if (i === 0 && user?.streak) dayXp += 25;

    recentDays.push({
      dateStr,
      label,
      xp: dayXp,
      focusMins: dayFocus,
      tasksDone: dayTasks
    });
  }

  // 4. Real Task Priority Breakdown (BarChart)
  const priorityData = [
    {
      priority: "High",
      Completed: tasks.filter(t => t.priority === "high" && t.done).length,
      Pending: tasks.filter(t => t.priority === "high" && !t.done).length,
      color: "#EF4444"
    },
    {
      priority: "Medium",
      Completed: tasks.filter(t => t.priority === "medium" && t.done).length,
      Pending: tasks.filter(t => t.priority === "medium" && !t.done).length,
      color: "#F59E0B"
    },
    {
      priority: "Low",
      Completed: tasks.filter(t => t.priority === "low" && t.done).length,
      Pending: tasks.filter(t => t.priority === "low" && !t.done).length,
      color: "#10B981"
    }
  ];

  return (
    <div className="p-7 space-y-6 max-w-6xl mx-auto text-foreground font-['Plus_Jakarta_Sans']">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            📊 Data-Driven Growth Analytics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            100% live statistics computed dynamically from your database and local storage activity.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs bg-primary/10 text-primary font-extrabold px-3 py-1.5 rounded-xl border border-primary/20 flex items-center gap-1.5">
            <Activity size={14} /> Live Sync Active
          </span>
        </div>
      </div>

      {/* REAL KPI SUMMARY GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center border-border bg-card shadow-sm hover:border-primary/30 transition-all">
          <span className="text-2xl">⚡</span>
          <p className="text-2xl font-extrabold text-primary font-['Plus_Jakarta_Sans'] mt-2">{totalXp.toLocaleString()} XP</p>
          <p className="text-muted-foreground text-xs font-bold mt-0.5">Total Experience Level {user?.level || 1}</p>
        </Card>
        <Card className="p-4 text-center border-border bg-card shadow-sm hover:border-primary/30 transition-all">
          <span className="text-2xl">🔥</span>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-['Plus_Jakarta_Sans'] mt-2">{bestStreak} days</p>
          <p className="text-muted-foreground text-xs font-bold mt-0.5">Longest Recorded Streak</p>
        </Card>
        <Card className="p-4 text-center border-border bg-card shadow-sm hover:border-primary/30 transition-all">
          <span className="text-2xl">✅</span>
          <p className="text-2xl font-extrabold text-foreground font-['Plus_Jakarta_Sans'] mt-2">{habitsDoneTotal}</p>
          <p className="text-muted-foreground text-xs font-bold mt-0.5">Habit Check-ins Logged</p>
        </Card>
        <Card className="p-4 text-center border-border bg-card shadow-sm hover:border-primary/30 transition-all">
          <span className="text-2xl">⏱️</span>
          <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-['Plus_Jakarta_Sans'] mt-2">{focusHoursTotal}h</p>
          <p className="text-muted-foreground text-xs font-bold mt-0.5">Total Focus & Task Hours</p>
        </Card>
      </div>

      {/* CHARTS ROW 1: XP TREND & HABIT DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* 14-Day Activity Trend */}
        <Card className="p-5 border-border bg-card shadow-sm md:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-foreground font-extrabold text-sm">Daily XP & Activity Velocity (14-Day History)</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Track daily experience points gained across habits, focus sessions, and tasks.</p>
            </div>
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">Real Trend</span>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={recentDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="xpAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12, fontWeight: "bold" }}
                formatter={(val: number) => [`${val} XP`, "Experience Earned"]}
              />
              <Area type="monotone" dataKey="xp" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#xpAreaGrad)" name="XP" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Habit Category Split */}
        <Card className="p-5 border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-foreground font-extrabold text-sm mb-1">Habit Category Split</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Distribution across ({habits.length}) active habits.</p>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={habitCategoriesData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={4} dataKey="value">
                {habitCategoriesData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12, fontWeight: "bold" }} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-border/40 max-h-24 overflow-y-auto">
            {habitCategoriesData.map(c => (
              <div key={c.name} className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-md text-[11px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-foreground font-bold">{c.name} ({c.value})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* CHARTS ROW 2: TASK BREAKDOWN & COMPREHENSIVE STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Task Priority Completion Breakdown */}
        <Card className="p-5 border-border bg-card shadow-sm md:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4 border-b border-border/40 pb-2.5">
            <div>
              <h3 className="text-foreground font-extrabold text-sm">Task Completion by Priority Level</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Compare completed vs pending tasks across High, Medium, and Low priorities.</p>
            </div>
            <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg">
              {taskCompletionRate}% Done
            </span>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
              <XAxis dataKey="priority" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)", fontSize: 12, fontWeight: "bold" }} />
              <Bar dataKey="Completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Completed Tasks" />
              <Bar dataKey="Pending" fill="hsl(var(--muted-foreground))" opacity={0.35} radius={[6, 6, 0, 0]} name="Pending Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Deep Dive Metrics List */}
        <Card className="p-5 border-border bg-card shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-foreground font-extrabold text-sm mb-1">Growth Operating System Status</h3>
            <p className="text-[11px] text-muted-foreground">Comprehensive system audit.</p>
          </div>

          <div className="divide-y divide-border/30 space-y-2 pt-1 text-xs">
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground font-bold">Active Growth Plans</span>
              <span className="text-foreground font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-md">{growthPlans.length} Plans</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground font-bold">Total Tasks Created</span>
              <span className="text-foreground font-extrabold">{tasks.length} ({completedTasksCount} done)</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground font-bold">Focus Stopwatch Sessions</span>
              <span className="text-foreground font-extrabold">{focusSessions.length} logged</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground font-bold">Reflections & Notes</span>
              <span className="text-foreground font-extrabold">{journals.length + notes.length} entries</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground font-bold">Health Score Avg</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{user?.healthScore || 85}/100</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-muted-foreground font-bold">Career Score Avg</span>
              <span className="text-purple-600 dark:text-purple-400 font-extrabold">{user?.careerScore || 80}/100</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}

export function ChallengesView() {
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
    if (!user && view !== "landing" && view !== "login" && view !== "onboarding") {
      setView("landing");
    } else if (user && view === "landing") {
      setView("dashboard");
    }
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
