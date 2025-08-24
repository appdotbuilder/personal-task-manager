import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task, type TaskFilter } from '../schema';
import { eq, and, gte, lte, isNotNull, type SQL } from 'drizzle-orm';

export const getTasks = async (filter?: TaskFilter): Promise<Task[]> => {
  try {
    // Build conditions array for filters
    const conditions: SQL<unknown>[] = [];
    
    if (filter) {
      // Filter by status
      if (filter.status) {
        conditions.push(eq(tasksTable.status, filter.status));
      }
      
      // Filter by priority
      if (filter.priority) {
        conditions.push(eq(tasksTable.priority, filter.priority));
      }
      
      // Filter by tasks due within specified days
      if (filter.due_within_days !== undefined) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + filter.due_within_days);
        
        // Add individual conditions for deadline range (only for tasks with deadlines)
        conditions.push(isNotNull(tasksTable.deadline));
        conditions.push(gte(tasksTable.deadline, now));
        conditions.push(lte(tasksTable.deadline, futureDate));
      }
      
      // Filter for high priority urgent tasks (high priority + due within 3 days)
      if (filter.high_priority_urgent) {
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(now.getDate() + 3);
        
        // Add individual conditions for high priority urgent filter
        conditions.push(eq(tasksTable.priority, 'HIGH'));
        conditions.push(isNotNull(tasksTable.deadline));
        conditions.push(gte(tasksTable.deadline, now));
        conditions.push(lte(tasksTable.deadline, threeDaysFromNow));
      }
    }
    
    // Build and execute query with or without where clause
    const results = conditions.length > 0
      ? await db.select().from(tasksTable).where(and(...conditions)).execute()
      : await db.select().from(tasksTable).execute();
    
    // Convert results to match the schema types
    return results.map(task => ({
      ...task,
      // Ensure dates are properly handled
      created_at: task.created_at,
      updated_at: task.updated_at,
      deadline: task.deadline,
      finished_at: task.finished_at
    }));
    
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
};

export const getTaskById = async (id: number): Promise<Task | null> => {
  try {
    const results = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, id))
      .execute();
    
    if (results.length === 0) {
      return null;
    }
    
    const task = results[0];
    return {
      ...task,
      // Ensure dates are properly handled
      created_at: task.created_at,
      updated_at: task.updated_at,
      deadline: task.deadline,
      finished_at: task.finished_at
    };
    
  } catch (error) {
    console.error('Failed to fetch task by id:', error);
    throw error;
  }
};