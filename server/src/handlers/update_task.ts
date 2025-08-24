import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
  try {
    // First, get the current task to check its current status
    const currentTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (!currentTask || currentTask.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    const existingTask = currentTask[0];

    // Prepare update values
    const updateValues: any = {
      updated_at: new Date()
    };

    // Add provided fields to update
    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    if (input.priority !== undefined) {
      updateValues.priority = input.priority;
    }
    if (input.deadline !== undefined) {
      updateValues.deadline = input.deadline;
    }

    // Handle status changes and finished_at timestamp logic
    if (input.status !== undefined) {
      updateValues.status = input.status;
      
      // Set finished_at when status changes to 'FINISHED'
      if (input.status === 'FINISHED' && existingTask.status !== 'FINISHED') {
        updateValues.finished_at = new Date();
      }
      // Clear finished_at when status changes from 'FINISHED' to something else
      else if (input.status !== 'FINISHED' && existingTask.status === 'FINISHED') {
        updateValues.finished_at = null;
      }
    }

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateValues)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
};