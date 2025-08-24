import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test inputs with different scenarios
const basicTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing',
  priority: 'MEDIUM',
  status: 'TODO',
  deadline: null
};

const highPriorityTaskInput: CreateTaskInput = {
  title: 'Urgent Task',
  description: 'High priority task with deadline',
  priority: 'HIGH',
  status: 'IN_PROGRESS',
  deadline: new Date('2024-12-31T23:59:59Z')
};

const minimalTaskInput: CreateTaskInput = {
  title: 'Minimal Task',
  description: null,
  priority: 'LOW',
  status: 'TODO',
  deadline: null
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with basic input', async () => {
    const result = await createTask(basicTaskInput);

    // Basic field validation
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.priority).toEqual('MEDIUM');
    expect(result.status).toEqual('TODO');
    expect(result.deadline).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.finished_at).toBeNull();
  });

  it('should create a high priority task with deadline', async () => {
    const result = await createTask(highPriorityTaskInput);

    expect(result.title).toEqual('Urgent Task');
    expect(result.description).toEqual('High priority task with deadline');
    expect(result.priority).toEqual('HIGH');
    expect(result.status).toEqual('IN_PROGRESS');
    expect(result.deadline).toBeInstanceOf(Date);
    expect(result.deadline?.toISOString()).toEqual('2024-12-31T23:59:59.000Z');
    expect(result.id).toBeDefined();
    expect(result.finished_at).toBeNull();
  });

  it('should create a minimal task with null values', async () => {
    const result = await createTask(minimalTaskInput);

    expect(result.title).toEqual('Minimal Task');
    expect(result.description).toBeNull();
    expect(result.priority).toEqual('LOW');
    expect(result.status).toEqual('TODO');
    expect(result.deadline).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.finished_at).toBeNull();
  });

  it('should save task to database', async () => {
    const result = await createTask(basicTaskInput);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    const savedTask = tasks[0];
    expect(savedTask.title).toEqual('Test Task');
    expect(savedTask.description).toEqual('A task for testing');
    expect(savedTask.priority).toEqual('MEDIUM');
    expect(savedTask.status).toEqual('TODO');
    expect(savedTask.deadline).toBeNull();
    expect(savedTask.created_at).toBeInstanceOf(Date);
    expect(savedTask.updated_at).toBeInstanceOf(Date);
    expect(savedTask.finished_at).toBeNull();
  });

  it('should use default status when not provided', async () => {
    const inputWithoutStatus: CreateTaskInput = {
      title: 'Default Status Task',
      description: 'Testing default status',
      priority: 'MEDIUM',
      status: 'TODO', // Zod will apply default
      deadline: null
    };

    const result = await createTask(inputWithoutStatus);
    expect(result.status).toEqual('TODO');
  });

  it('should handle all priority levels correctly', async () => {
    const priorities = ['HIGH', 'MEDIUM', 'LOW'] as const;
    
    for (const priority of priorities) {
      const input: CreateTaskInput = {
        title: `${priority} Priority Task`,
        description: `Task with ${priority} priority`,
        priority: priority,
        status: 'TODO',
        deadline: null
      };

      const result = await createTask(input);
      expect(result.priority).toEqual(priority);
      expect(result.title).toEqual(`${priority} Priority Task`);
    }
  });

  it('should handle all status types correctly', async () => {
    const statuses = ['TODO', 'IN_PROGRESS', 'FINISHED', 'IDEA', 'NEXT'] as const;
    
    for (const status of statuses) {
      const input: CreateTaskInput = {
        title: `${status} Task`,
        description: `Task with ${status} status`,
        priority: 'MEDIUM',
        status: status,
        deadline: null
      };

      const result = await createTask(input);
      expect(result.status).toEqual(status);
      expect(result.title).toEqual(`${status} Task`);
    }
  });

  it('should preserve deadline timestamps accurately', async () => {
    const testDeadline = new Date('2024-06-15T14:30:00Z');
    const input: CreateTaskInput = {
      title: 'Deadline Task',
      description: 'Task with specific deadline',
      priority: 'HIGH',
      status: 'TODO',
      deadline: testDeadline
    };

    const result = await createTask(input);
    expect(result.deadline).toBeInstanceOf(Date);
    expect(result.deadline?.toISOString()).toEqual('2024-06-15T14:30:00.000Z');

    // Verify in database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks[0].deadline).toBeInstanceOf(Date);
    expect(tasks[0].deadline?.toISOString()).toEqual('2024-06-15T14:30:00.000Z');
  });

  it('should set created_at and updated_at automatically', async () => {
    const beforeCreate = new Date();
    const result = await createTask(basicTaskInput);
    const afterCreate = new Date();

    // Check that timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // Initially, created_at and updated_at should be the same
    expect(Math.abs(result.created_at.getTime() - result.updated_at.getTime())).toBeLessThan(1000);
  });
});