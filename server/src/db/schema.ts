import { serial, text, pgTable, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Enums for task priority and status
export const taskPriorityEnum = pgEnum('task_priority', ['HIGH', 'MEDIUM', 'LOW']);
export const taskStatusEnum = pgEnum('task_status', ['TODO', 'IN_PROGRESS', 'FINISHED', 'IDEA', 'NEXT']);

export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  priority: taskPriorityEnum('priority').notNull(),
  status: taskStatusEnum('status').notNull().default('TODO'),
  deadline: timestamp('deadline'), // Nullable - not all tasks have deadlines
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  finished_at: timestamp('finished_at') // Nullable - only set when task is finished
});

// TypeScript types for the table schema
export type Task = typeof tasksTable.$inferSelect; // For SELECT operations
export type NewTask = typeof tasksTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { tasks: tasksTable };