import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type CreateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper to create a test task
const createTestTask = async (taskData: Partial<CreateTaskInput> = {}): Promise<number> => {
  const defaultTask: CreateTaskInput = {
    title: 'Test Task',
    description: 'A task for testing',
    priority: 'MEDIUM',
    status: 'TODO',
    deadline: null
  };

  const result = await db.insert(tasksTable)
    .values({
      ...defaultTask,
      ...taskData
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic task fields', async () => {
    const taskId = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Updated Task Title',
      description: 'Updated description',
      priority: 'HIGH'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(taskId);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Updated description');
    expect(result.priority).toEqual('HIGH');
    expect(result.status).toEqual('TODO'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.finished_at).toBeNull();
  });

  it('should update task status', async () => {
    const taskId = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: taskId,
      status: 'IN_PROGRESS'
    };

    const result = await updateTask(updateInput);

    expect(result.status).toEqual('IN_PROGRESS');
    expect(result.finished_at).toBeNull();
  });

  it('should set finished_at when status changes to FINISHED', async () => {
    const taskId = await createTestTask({ status: 'IN_PROGRESS' });

    const updateInput: UpdateTaskInput = {
      id: taskId,
      status: 'FINISHED'
    };

    const result = await updateTask(updateInput);

    expect(result.status).toEqual('FINISHED');
    expect(result.finished_at).toBeInstanceOf(Date);
    expect(result.finished_at).not.toBeNull();
  });

  it('should clear finished_at when status changes from FINISHED to another status', async () => {
    // First create a task and mark it as finished
    const taskId = await createTestTask();
    
    await updateTask({
      id: taskId,
      status: 'FINISHED'
    });

    // Now change it back to TODO
    const updateInput: UpdateTaskInput = {
      id: taskId,
      status: 'TODO'
    };

    const result = await updateTask(updateInput);

    expect(result.status).toEqual('TODO');
    expect(result.finished_at).toBeNull();
  });

  it('should not change finished_at when already FINISHED and staying FINISHED', async () => {
    // First create and finish a task
    const taskId = await createTestTask();
    
    const finishedTask = await updateTask({
      id: taskId,
      status: 'FINISHED'
    });

    const originalFinishedAt = finishedTask.finished_at;

    // Wait a moment to ensure timestamp would be different
    await new Promise(resolve => setTimeout(resolve, 1));

    // Update other fields while keeping status as FINISHED
    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Updated Title',
      status: 'FINISHED'
    };

    const result = await updateTask(updateInput);

    expect(result.status).toEqual('FINISHED');
    expect(result.title).toEqual('Updated Title');
    expect(result.finished_at).toEqual(originalFinishedAt); // Should remain the same
  });

  it('should update deadline', async () => {
    const taskId = await createTestTask();
    const deadline = new Date('2024-12-31');

    const updateInput: UpdateTaskInput = {
      id: taskId,
      deadline: deadline
    };

    const result = await updateTask(updateInput);

    expect(result.deadline).toEqual(deadline);
  });

  it('should clear deadline when set to null', async () => {
    const initialDeadline = new Date('2024-12-31');
    const taskId = await createTestTask({ deadline: initialDeadline });

    const updateInput: UpdateTaskInput = {
      id: taskId,
      deadline: null
    };

    const result = await updateTask(updateInput);

    expect(result.deadline).toBeNull();
  });

  it('should update task in database', async () => {
    const taskId = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Database Updated Title',
      priority: 'LOW'
    };

    await updateTask(updateInput);

    // Verify the update persisted in database
    const dbTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(dbTask).toHaveLength(1);
    expect(dbTask[0].title).toEqual('Database Updated Title');
    expect(dbTask[0].priority).toEqual('LOW');
    expect(dbTask[0].updated_at).toBeInstanceOf(Date);
  });

  it('should always update updated_at timestamp', async () => {
    const taskId = await createTestTask();

    // Get original timestamps
    const originalTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    const originalUpdatedAt = originalTask[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));

    const updateInput: UpdateTaskInput = {
      id: taskId,
      title: 'Updated Title'
    };

    const result = await updateTask(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error when task does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: 99999, // Non-existent task ID
      title: 'Should Fail'
    };

    expect(updateTask(updateInput)).rejects.toThrow(/task with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const taskId = await createTestTask({
      title: 'Original Title',
      description: 'Original Description',
      priority: 'LOW',
      status: 'TODO'
    });

    // Update only the priority
    const updateInput: UpdateTaskInput = {
      id: taskId,
      priority: 'HIGH'
    };

    const result = await updateTask(updateInput);

    // Only priority should change, other fields should remain the same
    expect(result.title).toEqual('Original Title');
    expect(result.description).toEqual('Original Description');
    expect(result.priority).toEqual('HIGH'); // This should be updated
    expect(result.status).toEqual('TODO');
  });
});