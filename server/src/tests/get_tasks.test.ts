import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type TaskFilter } from '../schema';
import { getTasks, getTaskById } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all tasks when no filter is provided', async () => {
    // Create test tasks
    await db.insert(tasksTable).values([
      {
        title: 'Task 1',
        description: 'First task',
        priority: 'HIGH',
        status: 'TODO'
      },
      {
        title: 'Task 2',
        description: 'Second task',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS'
      }
    ]).execute();

    const results = await getTasks();

    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('Task 1');
    expect(results[1].title).toEqual('Task 2');
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter tasks by status', async () => {
    // Create test tasks with different statuses
    await db.insert(tasksTable).values([
      {
        title: 'Todo Task',
        description: 'A todo task',
        priority: 'HIGH',
        status: 'TODO'
      },
      {
        title: 'In Progress Task',
        description: 'A task in progress',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS'
      },
      {
        title: 'Finished Task',
        description: 'A finished task',
        priority: 'LOW',
        status: 'FINISHED'
      }
    ]).execute();

    const filter: TaskFilter = { status: 'IN_PROGRESS' };
    const results = await getTasks(filter);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('In Progress Task');
    expect(results[0].status).toEqual('IN_PROGRESS');
  });

  it('should filter tasks by priority', async () => {
    // Create test tasks with different priorities
    await db.insert(tasksTable).values([
      {
        title: 'High Priority Task',
        description: 'Important task',
        priority: 'HIGH',
        status: 'TODO'
      },
      {
        title: 'Low Priority Task',
        description: 'Less important task',
        priority: 'LOW',
        status: 'TODO'
      }
    ]).execute();

    const filter: TaskFilter = { priority: 'HIGH' };
    const results = await getTasks(filter);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('High Priority Task');
    expect(results[0].priority).toEqual('HIGH');
  });

  it('should filter tasks due within specified days', async () => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    // Create test tasks with different deadlines
    await db.insert(tasksTable).values([
      {
        title: 'Due Tomorrow',
        description: 'Task due soon',
        priority: 'HIGH',
        status: 'TODO',
        deadline: tomorrow
      },
      {
        title: 'Due Next Week',
        description: 'Task due later',
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: nextWeek
      },
      {
        title: 'No Deadline',
        description: 'Task without deadline',
        priority: 'LOW',
        status: 'TODO'
      }
    ]).execute();

    const filter: TaskFilter = { due_within_days: 3 };
    const results = await getTasks(filter);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Due Tomorrow');
    expect(results[0].deadline).toBeInstanceOf(Date);
  });

  it('should filter high priority urgent tasks', async () => {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    // Create test tasks
    await db.insert(tasksTable).values([
      {
        title: 'High Priority Due Soon',
        description: 'Urgent task',
        priority: 'HIGH',
        status: 'TODO',
        deadline: tomorrow
      },
      {
        title: 'High Priority Due Later',
        description: 'Important but not urgent',
        priority: 'HIGH',
        status: 'TODO',
        deadline: nextWeek
      },
      {
        title: 'Medium Priority Due Soon',
        description: 'Soon but not high priority',
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: tomorrow
      }
    ]).execute();

    const filter: TaskFilter = { high_priority_urgent: true };
    const results = await getTasks(filter);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('High Priority Due Soon');
    expect(results[0].priority).toEqual('HIGH');
    expect(results[0].deadline).toBeInstanceOf(Date);
  });

  it('should apply multiple filters simultaneously', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);

    // Create test tasks
    await db.insert(tasksTable).values([
      {
        title: 'High Priority Todo Due Soon',
        description: 'Matches all filters',
        priority: 'HIGH',
        status: 'TODO',
        deadline: tomorrow
      },
      {
        title: 'High Priority In Progress Due Soon',
        description: 'Different status',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        deadline: tomorrow
      },
      {
        title: 'Medium Priority Todo Due Soon',
        description: 'Different priority',
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: tomorrow
      }
    ]).execute();

    const filter: TaskFilter = {
      status: 'TODO',
      priority: 'HIGH',
      due_within_days: 3
    };
    const results = await getTasks(filter);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('High Priority Todo Due Soon');
    expect(results[0].status).toEqual('TODO');
    expect(results[0].priority).toEqual('HIGH');
  });

  it('should return empty array when no tasks match filter', async () => {
    // Create a task that won't match the filter
    await db.insert(tasksTable).values({
      title: 'Low Priority Task',
      description: 'Won\'t match high priority filter',
      priority: 'LOW',
      status: 'TODO'
    }).execute();

    const filter: TaskFilter = { priority: 'HIGH' };
    const results = await getTasks(filter);

    expect(results).toHaveLength(0);
  });
});

describe('getTaskById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return task when it exists', async () => {
    // Create a test task
    const insertResult = await db.insert(tasksTable).values({
      title: 'Test Task',
      description: 'A test task',
      priority: 'MEDIUM',
      status: 'TODO'
    }).returning().execute();

    const taskId = insertResult[0].id;
    const result = await getTaskById(taskId);

    expect(result).not.toBeNull();
    expect(result?.id).toEqual(taskId);
    expect(result?.title).toEqual('Test Task');
    expect(result?.description).toEqual('A test task');
    expect(result?.priority).toEqual('MEDIUM');
    expect(result?.status).toEqual('TODO');
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
    expect(result?.deadline).toBeNull();
    expect(result?.finished_at).toBeNull();
  });

  it('should return task with all fields populated', async () => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    const finishedAt = new Date();

    // Create a task with all fields
    const insertResult = await db.insert(tasksTable).values({
      title: 'Complete Task',
      description: 'Task with all fields',
      priority: 'HIGH',
      status: 'FINISHED',
      deadline: deadline,
      finished_at: finishedAt
    }).returning().execute();

    const taskId = insertResult[0].id;
    const result = await getTaskById(taskId);

    expect(result).not.toBeNull();
    expect(result?.title).toEqual('Complete Task');
    expect(result?.description).toEqual('Task with all fields');
    expect(result?.priority).toEqual('HIGH');
    expect(result?.status).toEqual('FINISHED');
    expect(result?.deadline).toBeInstanceOf(Date);
    expect(result?.finished_at).toBeInstanceOf(Date);
  });

  it('should return null when task does not exist', async () => {
    const result = await getTaskById(999);

    expect(result).toBeNull();
  });

  it('should handle tasks with nullable fields correctly', async () => {
    // Create a task with minimal required fields
    const insertResult = await db.insert(tasksTable).values({
      title: 'Minimal Task',
      description: null, // Explicitly null
      priority: 'LOW',
      status: 'IDEA'
      // deadline and finished_at will be null by default
    }).returning().execute();

    const taskId = insertResult[0].id;
    const result = await getTaskById(taskId);

    expect(result).not.toBeNull();
    expect(result?.title).toEqual('Minimal Task');
    expect(result?.description).toBeNull();
    expect(result?.deadline).toBeNull();
    expect(result?.finished_at).toBeNull();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });
});