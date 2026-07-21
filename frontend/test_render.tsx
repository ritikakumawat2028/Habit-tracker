import React from "react";
import ReactDOMServer from "react-dom/server";
import {
  AuthCtx,
  DashboardView,
  TasksView,
  HabitsView,
  HealthView,
  CareerView,
  ChallengesView,
  FriendsView,
  AnalyticsView,
  ProfileView,
  FocusView,
  GoalsView,
  LearningView,
  JournalView,
  TimeTrackerView,
  AchievementsView
} from "./src/app/App.tsx";

const mockUser = {
  id: "u1",
  name: "Alex Chen",
  email: "alex@example.com",
  avatar: null,
  bio: "Growth operator",
  level: 3,
  xp: 1450,
  coins: 100,
  streak: 5,
  joinDate: "2026-01-01",
  goals: ["coding", "fitness"],
  inviteCode: "GS-8912"
};

const mockContext: any = {
  user: mockUser,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  tasks: [
    { id: "t1", title: "Test Task", note: "Note", category: "Personal", priority: "high" as const, done: false, subtasks: [] }
  ],
  addTask: () => {},
  updateTask: () => {},
  deleteTask: () => {},
  notes: [
    { id: "n1", title: "Test Note", body: "Body", color: "violet", folder: "Learning & Tech", pinned: false }
  ],
  addNote: () => {},
  updateNote: () => {},
  deleteNote: () => {},
  habits: [
    { id: 101, name: "Drink Water", category: "Health", icon: "💧", priority: "high" as const, freq: "Daily", streak: 3, completedToday: false }
  ],
  addHabit: () => {},
  updateHabit: () => {},
  deleteHabit: () => {},
  goalsList: [],
  addGoal: () => {},
  updateGoal: () => {},
  deleteGoal: () => {},
  journals: [
    { id: "j1", date: "2026-07-21", mood: "😄", wins: "Win", challenges: "Challenge", gratitude: "Gratitude", lessons: "Lesson", folder: "Daily Reflections", pinned: false }
  ],
  addJournal: () => {},
  updateJournal: () => {},
  deleteJournal: () => {},
  focusSessions: [
    { id: "f1", date: "2026-07-21", duration: 30, category: "Coding" }
  ],
  addFocusSession: () => {},
  missions: [],
  toggleMission: () => {},
  rewards: [],
  buyReward: () => false,
  coins: 100,
  addCoins: () => {},
  partners: [
    { id: "p1", name: "Sam Lee", avatar: null, level: 4, xp: 2100, currentStreak: 7, longestStreak: 14, healthScore: 90, careerScore: 80, productivityScore: 85, consistencyRate: 95, topHabit: "LeetCode", topSkill: "TypeScript", recentActivity: "Completed task" }
  ],
  addPartner: async () => ({ ok: true }),
  removePartner: () => {},
  learningSteps: [],
  toggleLearningStep: () => {},
  addLearningStep: () => {},
  learningCourses: [],
  addLearningCourse: () => {},
  toggleCourseComplete: () => {},
  careerApps: [],
  addCareerApp: () => {},
  updateCareerAppStage: () => {},
  deleteCareerApp: () => {},
  healthLogs: [
    { date: "2026-07-21", waterMl: 1500, sleepHours: 7.5, workoutMins: 45, mood: "😊", notes: "" }
  ],
  updateTodayHealth: () => {},
  generateCustomPlan: () => {},
  growthPlans: [
    { id: "gp_default", title: "Master Plan", category: "Growth", description: "Plan", targetDate: "2026-12-31", progress: 50, active: true, createdAt: "2026-01-01" }
  ],
  activePlanId: "gp_default",
  addGrowthPlan: () => {},
  updateGrowthPlan: () => {},
  deleteGrowthPlan: () => {},
  selectGrowthPlan: () => {}
};

// Polyfill minimal browser globals
const store = new Map();
global.localStorage = {
  getItem: (k: string) => store.get(k) || null,
  setItem: (k: string, v: string) => store.set(k, String(v)),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
} as any;
global.window = global as any;
global.navigator = { clipboard: { writeText: async () => {} } } as any;

console.log("=== STARTING COMPREHENSIVE VIEW RENDER TESTS ===");

const components = [
  { name: "DashboardView", Comp: (props: any) => <DashboardView onNavigate={() => {}} onQuickAdd={() => {}} {...props} /> },
  { name: "TasksView", Comp: TasksView },
  { name: "HabitsView", Comp: HabitsView },
  { name: "HealthView", Comp: HealthView },
  { name: "CareerView", Comp: CareerView },
  { name: "ChallengesView", Comp: ChallengesView },
  { name: "FriendsView", Comp: FriendsView },
  { name: "AnalyticsView", Comp: AnalyticsView },
  { name: "ProfileView", Comp: (props: any) => <ProfileView onNavigate={() => {}} {...props} /> },
  { name: "FocusView", Comp: FocusView },
  { name: "GoalsView", Comp: GoalsView },
  { name: "LearningView", Comp: LearningView },
  { name: "JournalView", Comp: JournalView },
  { name: "TimeTrackerView", Comp: TimeTrackerView },
  { name: "AchievementsView", Comp: AchievementsView }
];

let failed = false;

components.forEach(({ name, Comp }) => {
  try {
    const html = ReactDOMServer.renderToString(
      <AuthCtx.Provider value={mockContext}>
        <Comp />
      </AuthCtx.Provider>
    );
    console.log(`[PASS] ${name} rendered successfully! HTML length: ${html.length}`);
  } catch (err) {
    failed = true;
    console.error(`[FAIL] ${name} threw error:`, err);
  }
});

if (failed) {
  process.exit(1);
} else {
  console.log("\n✅ ALL 15 VIEWS RENDERED SUCCESSFULLY WITHOUT ANY REFERENCE OR RUNTIME ERRORS!");
}
