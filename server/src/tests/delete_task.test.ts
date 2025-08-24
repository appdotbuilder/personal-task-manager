import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

// Test input for creating tasks
const testTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing deletion',
  priority: 'HIGH',
  status: 'TODO',
  deadline: null
};

const anotherTaskInput: CreateTaskInput = {
  title: 'Another Task',
  description: 'Another task to ensure selective deletion',
  priority: 'MEDIUM',
  status: 'IN_PROGRESS',
  deadline: new Date('2024-12-31')
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a task first
    const result = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        priority: testTaskInput.priority,
        status: testTaskInput.status,
        deadline: testTaskInput.deadline
      })
      .returning()
      .execute();

    const createdTask = result[0];

    // Delete the task
    await deleteTask(createdTask.id);

    // Verify task is deleted
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, createdTask.id))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should throw error when deleting non-existent task', async () => {
    // Try to delete a task with non-existent ID
    await expect(deleteTask(99999)).rejects.toThrow(/task with id 99999 not found/i);
  });

  it('should delete only the specified task', async () => {
    // Create two tasks
    const task1Result = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        priority: testTaskInput.priority,
        status: testTaskInput.status,
        deadline: testTaskInput.deadline
      })
      .returning()
      .execute();

    const task2Result = await db.insert(tasksTable)
      .values({
        title: anotherTaskInput.title,
        description: anotherTaskInput.description,
        priority: anotherTaskInput.priority,
        status: anotherTaskInput.status,
        deadline: anotherTaskInput.deadline
      })
      .returning()
      .execute();

    const task1 = task1Result[0];
    const task2 = task2Result[0];

    // Delete only the first task
    await deleteTask(task1.id);

    // Verify first task is deleted
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task1.id))
      .execute();

    expect(deletedTask).toHaveLength(0);

    // Verify second task still exists
    const remainingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task2.id))
      .execute();

    expect(remainingTask).toHaveLength(1);
    expect(remainingTask[0].title).toEqual(anotherTaskInput.title);
    expect(remainingTask[0].status).toEqual(anotherTaskInput.status);
  });

  it('should handle deletion of finished tasks', async () => {
    // Create a finished task
    const finishedAt = new Date();
    const result = await db.insert(tasksTable)
      .values({
        title: 'Finished Task',
        description: 'A completed task',
        priority: 'LOW',
        status: 'FINISHED',
        deadline: null,
        finished_at: finishedAt
      })
      .returning()
      .execute();

    const finishedTask = result[0];

    // Delete the finished task
    await deleteTask(finishedTask.id);

    // Verify task is deleted
    const deletedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, finishedTask.id))
      .execute();

    expect(deletedTask).toHaveLength(0);
  });

  it('should handle deletion of tasks with different priorities', async () => {
    // Create tasks with all priority levels
    const highPriorityResult = await db.insert(tasksTable)
      .values({
        title: 'High Priority Task',
        description: null,
        priority: 'HIGH',
        status: 'TODO',
        deadline: null
      })
      .returning()
      .execute();

    const mediumPriorityResult = await db.insert(tasksTable)
      .values({
        title: 'Medium Priority Task',
        description: 'Medium priority task',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        deadline: new Date('2024-06-01')
      })
      .returning()
      .execute();

    const highTask = highPriorityResult[0];
    const mediumTask = mediumPriorityResult[0];

    // Delete high priority task
    await deleteTask(highTask.id);

    // Verify high priority task is deleted
    const deletedHighTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, highTask.id))
      .execute();

    expect(deletedHighTask).toHaveLength(0);

    // Verify medium priority task still exists
    const remainingMediumTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, mediumTask.id))
      .execute();

    expect(remainingMediumTask).toHaveLength(1);
    expect(remainingMediumTask[0].priority).toEqual('MEDIUM');
  });
});