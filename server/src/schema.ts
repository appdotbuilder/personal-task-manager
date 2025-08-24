import { z } from 'zod';

// Priority enum schema
export const taskPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

// Status enum schema
export const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'FINISHED', 'IDEA', 'NEXT']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

// Task schema with proper type handling
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  deadline: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  finished_at: z.coerce.date().nullable()
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  status: taskStatusSchema.default('TODO'),
  deadline: z.coerce.date().nullable()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating tasks
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().nullable().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusSchema.optional(),
  deadline: z.coerce.date().nullable().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Filter schema for querying tasks
export const taskFilterSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  due_within_days: z.number().int().nonnegative().optional(),
  high_priority_urgent: z.boolean().optional() // Special filter for high priority tasks due within 3 days
});

export type TaskFilter = z.infer<typeof taskFilterSchema>;

// Dashboard statistics schema
export const dashboardStatsSchema = z.object({
  total_finished_tasks: z.number().int().nonnegative(),
  tasks_by_status: z.object({
    TODO: z.number().int().nonnegative(),
    IN_PROGRESS: z.number().int().nonnegative(),
    FINISHED: z.number().int().nonnegative(),
    IDEA: z.number().int().nonnegative(),
    NEXT: z.number().int().nonnegative()
  }),
  tasks_by_priority: z.object({
    HIGH: z.number().int().nonnegative(),
    MEDIUM: z.number().int().nonnegative(),
    LOW: z.number().int().nonnegative()
  }),
  average_completion_time_days: z.number().nullable(), // Average time from creation to completion in days
  tasks_due_soon: z.number().int().nonnegative(), // Tasks due within next 3 days
  high_priority_urgent_count: z.number().int().nonnegative() // High priority tasks due within 3 days
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;