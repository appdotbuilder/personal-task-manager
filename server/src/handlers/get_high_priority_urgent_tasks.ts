import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task } from '../schema';
import { and, eq, ne, gte, lte, isNotNull } from 'drizzle-orm';

export const getHighPriorityUrgentTasks = async (): Promise<Task[]> => {
  try {
    // Calculate date range: from now to 3 days from now
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);

    // Query for high priority tasks due within next 3 days that are not finished
    const results = await db.select()
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.priority, 'HIGH'),
          ne(tasksTable.status, 'FINISHED'),
          isNotNull(tasksTable.deadline), // Must have a deadline to be urgent
          gte(tasksTable.deadline, now), // Deadline must be in the future or today
          lte(tasksTable.deadline, threeDaysFromNow) // Deadline must be within 3 days
        )
      )
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch high priority urgent tasks:', error);
    throw error;
  }
};