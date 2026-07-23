import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/* ══════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════ */

/** Generate a GROW-XXXXXX style invite code */
function makeInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'GROW-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Generate a GS-XXXXXX numeric GrowSync User ID */
function makeGrowSyncId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `GS-${num}`;
}

/* ══════════════════════════════════════════
   USER MODEL
   ══════════════════════════════════════════ */
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;        // bcrypt hash (optional for backward compat)
  growSyncId: string;       // unique GS-XXXXXX identifier
  avatar: string | null;
  bio: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  joinDate: string;
  goals: string[];
  inviteCode: string;
  // Self-reported / computed stats (updated via profile PUT)
  healthScore: number;
  careerScore: number;
  productivityScore: number;
  focusHours: number;
  studyHours: number;
  codingHours: number;
  waterIntake: number;
  sleepHours: number;
  exercise: number;
  currentChallenge: string;
  currentRank: string;
  mood: string;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },   // never returned by default
  growSyncId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: null },
  bio: { type: String, default: 'Building better habits, one day at a time. 🚀' },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  joinDate: { type: String, required: true },
  goals: { type: [String], default: [] },
  inviteCode: { type: String, unique: true, sparse: true },
  healthScore: { type: Number, default: 50 },
  careerScore: { type: Number, default: 50 },
  productivityScore: { type: Number, default: 50 },
  focusHours: { type: Number, default: 0 },
  studyHours: { type: Number, default: 0 },
  codingHours: { type: Number, default: 0 },
  waterIntake: { type: Number, default: 0 },
  sleepHours: { type: Number, default: 7 },
  exercise: { type: Number, default: 0 },
  currentChallenge: { type: String, default: 'None' },
  currentRank: { type: String, default: 'Bronze I' },
  mood: { type: String, default: '😐 Okay' },
}, { timestamps: true });

// Auto-assign a unique invite code and growSyncId before first save
UserSchema.pre('save', async function () {
  const UserModel = this.constructor as mongoose.Model<IUser>;

  if (!this.inviteCode) {
    let code = makeInviteCode();
    while (await UserModel.exists({ inviteCode: code })) {
      code = makeInviteCode();
    }
    this.inviteCode = code;
  }

  if (!this.growSyncId) {
    let gsId = makeGrowSyncId();
    while (await UserModel.exists({ growSyncId: gsId })) {
      gsId = makeGrowSyncId();
    }
    this.growSyncId = gsId;
  }
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password; // NEVER expose hash
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);

/* ══════════════════════════════════════════
   TASK MODEL
   ══════════════════════════════════════════ */
export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  note: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  done: boolean;
  dueDate: string;
  createdAt: string;
  dueTime?: string;
  estimatedDuration?: string;
  reminder?: boolean;
  tags?: string;
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  subtasks?: { id: string; title: string; done: boolean }[];
  dependencies?: string[];
  planId?: string;
}

const TaskSchema = new Schema<ITask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  note: { type: String, default: '' },
  category: { type: String, default: 'Personal' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  done: { type: Boolean, default: false },
  dueDate: { type: String, required: true },
  createdAt: { type: String, required: true },
  dueTime: { type: String },
  estimatedDuration: { type: String },
  reminder: { type: Boolean },
  tags: { type: String },
  recurring: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'] },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  subtasks: { type: [{ id: String, title: String, done: Boolean }], default: [] },
  dependencies: { type: [String], default: [] },
  planId: { type: String }
});

TaskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const Task = mongoose.model<ITask>('Task', TaskSchema);

/* ══════════════════════════════════════════
   NOTE MODEL
   ══════════════════════════════════════════ */
export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  folder?: string;
  planId?: string;
}

const NoteSchema = new Schema<INote>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  color: { type: String, default: 'violet' },
  pinned: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
  folder: { type: String, default: 'General' },
  planId: { type: String }
});

NoteSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const Note = mongoose.model<INote>('Note', NoteSchema);

/* ══════════════════════════════════════════
   HABIT MODEL
   ══════════════════════════════════════════ */
export interface IHabit extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
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

const HabitSchema = new Schema<IHabit>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Fitness' },
  icon: { type: String, default: '🏃' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  freq: { type: String, default: 'Daily' },
  streak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  target: { type: String, default: '1 time' },
  completedToday: { type: Boolean, default: false },
  consistencyScore: { type: Number, default: 100 },
  history: { type: [String], default: [] },
  paused: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  planId: { type: String }
});

HabitSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const Habit = mongoose.model<IHabit>('Habit', HabitSchema);

/* ══════════════════════════════════════════
   GROWTH PLAN MODEL
   ══════════════════════════════════════════ */
export interface IGrowthPlan extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  category: string;
  description: string;
  targetDate: string;
  progress: number;
  active: boolean;
  createdAt: string;
}

const GrowthPlanSchema = new Schema<IGrowthPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'Career' },
  description: { type: String, default: '' },
  targetDate: { type: String, required: true },
  progress: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  createdAt: { type: String, required: true }
});

GrowthPlanSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const GrowthPlan = mongoose.model<IGrowthPlan>('GrowthPlan', GrowthPlanSchema);

/* ══════════════════════════════════════════
   FRIEND CONNECTION MODEL
   Real two-way friendship record.
   Each connection is stored once per user (user A stores a record
   pointing to user B, and vice-versa when B connects back).
   ══════════════════════════════════════════ */
export interface IFriendConnection extends Document {
  userId: mongoose.Types.ObjectId;        // The user who initiated the connection
  friendUserId: mongoose.Types.ObjectId;  // The friend they connected with
  friendInviteCode: string;               // Invite code used at connection time
  connectedAt: string;
}

const FriendConnectionSchema = new Schema<IFriendConnection>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  friendUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  friendInviteCode: { type: String, required: true },
  connectedAt: { type: String, required: true },
});

// Prevent duplicate connections from the same user to same friend
FriendConnectionSchema.index({ userId: 1, friendUserId: 1 }, { unique: true });

FriendConnectionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const FriendConnection = mongoose.model<IFriendConnection>('FriendConnection', FriendConnectionSchema);

/* ══════════════════════════════════════════
   FRIEND REQUEST MODEL
   ══════════════════════════════════════════ */
export interface IFriendRequest extends Document {
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

const FriendRequestSchema = new Schema<IFriendRequest>({
  fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
  createdAt: { type: String, required: true },
});

FriendRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
FriendRequestSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const FriendRequest = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);

/* ══════════════════════════════════════════
   ACTIVITY FEED MODEL
   ══════════════════════════════════════════ */
export interface IActivityFeed extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  description: string;
  xpEarned: number;
  createdAt: string;
}

const ActivityFeedSchema = new Schema<IActivityFeed>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g., 'task_completed', 'habit_completed', 'level_up'
  description: { type: String, required: true },
  xpEarned: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
});

ActivityFeedSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const ActivityFeed = mongoose.model<IActivityFeed>('ActivityFeed', ActivityFeedSchema);

/* ══════════════════════════════════════════
   NOTIFICATION MODEL
   ══════════════════════════════════════════ */
export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
});

NotificationSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

/* ══════════════════════════════════════════
   CONVERSATION MODEL
   One document per friendship pair (private chat thread)
   ══════════════════════════════════════════ */
export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessageAt: Date;
  unreadCounts: Map<string, number>;
}

const ConversationSchema = new Schema<IConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessageAt: { type: Date, default: Date.now },
  unreadCounts: { type: Map, of: Number, default: {} },
}, { timestamps: true });

ConversationSchema.index({ participants: 1 });
ConversationSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

/* ══════════════════════════════════════════
   MESSAGE MODEL
   Individual chat messages within a conversation
   ══════════════════════════════════════════ */
export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text: string;
  seenBy: mongoose.Types.ObjectId[];
  replyTo?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  editedAt?: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  seenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  deletedAt: { type: Date },
  editedAt: { type: Date },
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const Message = mongoose.model<IMessage>('Message', MessageSchema);

/* ══════════════════════════════════════════
   SHARED ENTITIES (TASKS, HABITS, CHALLENGES)
   ══════════════════════════════════════════ */
export interface ISharedTask extends Document {
  title: string;
  creatorId: mongoose.Types.ObjectId;
  assigneeId: mongoose.Types.ObjectId;
  done: boolean;
  dueDate: string;
  category: string;
  createdAt: string;
}

const SharedTaskSchema = new Schema<ISharedTask>({
  title: { type: String, required: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  done: { type: Boolean, default: false },
  dueDate: { type: String, required: true },
  category: { type: String, default: 'Shared' },
  createdAt: { type: String, required: true },
});
SharedTaskSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const SharedTask = mongoose.model<ISharedTask>('SharedTask', SharedTaskSchema);

export interface ISharedHabit extends Document {
  title: string;
  creatorId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  creatorStreak: number;
  partnerStreak: number;
  creatorCompletedToday: boolean;
  partnerCompletedToday: boolean;
  createdAt: string;
}

const SharedHabitSchema = new Schema<ISharedHabit>({
  title: { type: String, required: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  creatorStreak: { type: Number, default: 0 },
  partnerStreak: { type: Number, default: 0 },
  creatorCompletedToday: { type: Boolean, default: false },
  partnerCompletedToday: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
});
SharedHabitSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const SharedHabit = mongoose.model<ISharedHabit>('SharedHabit', SharedHabitSchema);

export interface ISharedChallenge extends Document {
  title: string;
  description: string;
  participants: mongoose.Types.ObjectId[];
  progress: Map<string, number>; // Maps participant ObjectId string to progress percentage
  xpReward: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const SharedChallengeSchema = new Schema<ISharedChallenge>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  progress: { type: Map, of: Number, default: {} },
  xpReward: { type: Number, default: 100 },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  createdAt: { type: String, required: true },
});
SharedChallengeSchema.set('toJSON', { virtuals: true, transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; } });
export const SharedChallenge = mongoose.model<ISharedChallenge>('SharedChallenge', SharedChallengeSchema);

/* ══════════════════════════════════════════
   FOCUS SESSION MODEL
   Tracks individual study/focus/coding sessions
   ══════════════════════════════════════════ */
export interface IFocusSession extends Document {
  userId: mongoose.Types.ObjectId;
  duration: number;        // in minutes
  category: string;        // e.g. "Coding", "Study", "Reading"
  date: string;            // ISO date string YYYY-MM-DD
  notes?: string;
  durationMinutes?: number; // alias kept for frontend compat
}

const FocusSessionSchema = new Schema<IFocusSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  duration: { type: Number, required: true, min: 1 },
  category: { type: String, default: 'General' },
  date: { type: String, required: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

FocusSessionSchema.virtual('durationMinutes').get(function () {
  return this.duration;
});

FocusSessionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const FocusSession = mongoose.model<IFocusSession>('FocusSession', FocusSessionSchema);

/* ══════════════════════════════════════════
   HEALTH LOG MODEL
   One document per user per day for water/sleep/mood/workout
   ══════════════════════════════════════════ */
export interface IHealthLog extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;            // YYYY-MM-DD
  waterMl: number;         // total water in ml (250 per cup)
  sleepHours: number;
  workoutMins: number;
  mood: string;
  notes: string;
}

const HealthLogSchema = new Schema<IHealthLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  waterMl: { type: Number, default: 0 },
  sleepHours: { type: Number, default: 7 },
  workoutMins: { type: Number, default: 0 },
  mood: { type: String, default: 'okay' },
  notes: { type: String, default: '' },
}, { timestamps: true });

// One log per user per day
HealthLogSchema.index({ userId: 1, date: 1 }, { unique: true });

HealthLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const HealthLog = mongoose.model<IHealthLog>('HealthLog', HealthLogSchema);

/* ══════════════════════════════════════════
   JOURNAL ENTRY MODEL
   Daily journal with structured reflection fields
   ══════════════════════════════════════════ */
export interface IJournalEntry extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  mood: string;
  wins: string;
  challenges: string;
  gratitude: string;
  lessons: string;
  folder: string;
  pinned: boolean;
  tags: string[];
  planId?: string;
}

const JournalEntrySchema = new Schema<IJournalEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  mood: { type: String, default: 'okay' },
  wins: { type: String, default: '' },
  challenges: { type: String, default: '' },
  gratitude: { type: String, default: '' },
  lessons: { type: String, default: '' },
  folder: { type: String, default: 'General' },
  pinned: { type: Boolean, default: false },
  tags: { type: [String], default: [] },
  planId: { type: String },
}, { timestamps: true });

JournalEntrySchema.set('toJSON', {
  virtuals: true,
  transform: (doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const JournalEntry = mongoose.model<IJournalEntry>('JournalEntry', JournalEntrySchema);
