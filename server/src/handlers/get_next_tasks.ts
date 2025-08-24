import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task } from '../schema';
import { eq, ne, and, or, lte, isNull } from 'drizzle-orm';

export const getNextTasks = async (): Promise<Task[]> => {
  try {
    // Calculate date boundaries for "next few days" (3 days from now)
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999); // End of day

    // Query for tasks that should be considered "NEXT"
    const results = await db.select()
      .from(tasksTable)
      .where(
        and(
          // Exclude finished tasks and ideas
          ne(tasksTable.status, 'FINISHED'),
          ne(tasksTable.status, 'IDEA'),
          // Include tasks based on priority and deadline logic
          or(
            // 1. High priority tasks with approaching deadlines (within 3 days)
            and(
              eq(tasksTable.priority, 'HIGH'),
              lte(tasksTable.deadline, threeDaysFromNow)
            ),
            // 2. Any tasks with deadlines in the next 3 days (regardless of priority)
            lte(tasksTable.deadline, threeDaysFromNow),
            // 3. High priority tasks without deadlines
            and(
              eq(tasksTable.priority, 'HIGH'),
              isNull(tasksTable.deadline)
            )
          )
        )
      )
      .execute();

    // Return the tasks - no numeric conversions needed for this table
    return results;
  } catch (error) {
    console.error('Failed to get next tasks:', error);
    throw error;
  }
};