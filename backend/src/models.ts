import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/* ══════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════ */

/** Generate a cryptographically random 8-char hex code e.g. A3F9B2D1 */
function makeInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/* ══════════════════════════════════════════
   USER MODEL
   ══════════════════════════════════════════ */
export interface IUser extends Document {
  name: string;
  email: string;
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

// Auto-assign a unique invite code before first save
UserSchema.pre('save', async function (next) {
  if (!this.inviteCode) {
    const UserModel = this.constructor as mongoose.Model<IUser>;
    let code = makeInviteCode();
    while (await UserModel.exists({ inviteCode: code })) {
      code = makeInviteCode();
    }
    this.inviteCode = code;
  }
  next();
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
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
  recurring: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'] }
});

TaskSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
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
}

const NoteSchema = new Schema<INote>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: '' },
  body: { type: String, default: '' },
  color: { type: String, default: 'violet' },
  pinned: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
});

NoteSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
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
  target: string;
  completedToday: boolean;
}

const HabitSchema = new Schema<IHabit>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Fitness' },
  icon: { type: String, default: '🏃' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  freq: { type: String, default: 'Daily' },
  streak: { type: Number, default: 0 },
  target: { type: String, default: '1 time' },
  completedToday: { type: Boolean, default: false }
});

HabitSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const Habit = mongoose.model<IHabit>('Habit', HabitSchema);

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
  transform: (doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; }
});
export const FriendConnection = mongoose.model<IFriendConnection>('FriendConnection', FriendConnectionSchema);
