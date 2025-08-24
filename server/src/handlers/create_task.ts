import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  try {
    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: input.status || 'TODO',
        deadline: input.deadline,
        // created_at and updated_at are set automatically by defaultNow()
      })
      .returning()
      .execute();

    // Return the created task
    const task = result[0];
    return {
      ...task,
    };
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
};