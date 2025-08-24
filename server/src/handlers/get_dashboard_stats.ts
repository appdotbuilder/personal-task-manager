import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DashboardStats, type TaskStatus, type TaskPriority } from '../schema';
import { eq, gte, and, isNotNull, sql } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get all tasks for comprehensive stats calculation
    const allTasks = await db.select().from(tasksTable).execute();

    // Calculate total finished tasks
    const finishedTasks = allTasks.filter(task => task.status === 'FINISHED');
    const total_finished_tasks = finishedTasks.length;

    // Calculate tasks by status
    const tasks_by_status = {
      TODO: allTasks.filter(task => task.status === 'TODO').length,
      IN_PROGRESS: allTasks.filter(task => task.status === 'IN_PROGRESS').length,
      FINISHED: allTasks.filter(task => task.status === 'FINISHED').length,
      IDEA: allTasks.filter(task => task.status === 'IDEA').length,
      NEXT: allTasks.filter(task => task.status === 'NEXT').length
    };

    // Calculate tasks by priority
    const tasks_by_priority = {
      HIGH: allTasks.filter(task => task.priority === 'HIGH').length,
      MEDIUM: allTasks.filter(task => task.priority === 'MEDIUM').length,
      LOW: allTasks.filter(task => task.priority === 'LOW').length
    };

    // Calculate average completion time in days for finished tasks
    let average_completion_time_days: number | null = null;
    if (finishedTasks.length > 0) {
      const completionTimes = finishedTasks
        .filter(task => task.finished_at !== null && task.created_at !== null)
        .map(task => {
          const createdAt = new Date(task.created_at);
          const finishedAt = new Date(task.finished_at!);
          return (finishedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
        });

      if (completionTimes.length > 0) {
        average_completion_time_days = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
      }
    }

    // Calculate tasks due within next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of the 3rd day

    const now = new Date();

    const tasks_due_soon = allTasks.filter(task => {
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      return deadline >= now && deadline <= threeDaysFromNow;
    }).length;

    // Calculate high priority tasks due within next 3 days
    const high_priority_urgent_count = allTasks.filter(task => {
      if (!task.deadline || task.priority !== 'HIGH') return false;
      const deadline = new Date(task.deadline);
      return deadline >= now && deadline <= threeDaysFromNow;
    }).length;

    return {
      total_finished_tasks,
      tasks_by_status,
      tasks_by_priority,
      average_completion_time_days,
      tasks_due_soon,
      high_priority_urgent_count
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
};