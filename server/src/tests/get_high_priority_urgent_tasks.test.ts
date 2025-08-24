import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getHighPriorityUrgentTasks } from '../handlers/get_high_priority_urgent_tasks';

describe('getHighPriorityUrgentTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return high priority tasks due within 3 days', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create a high priority task due tomorrow
    await db.insert(tasksTable).values({
      title: 'Urgent Task',
      description: 'Very important task',
      priority: 'HIGH',
      status: 'TODO',
      deadline: tomorrow
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Urgent Task');
    expect(results[0].priority).toEqual('HIGH');
    expect(results[0].deadline).toEqual(tomorrow);
  });

  it('should exclude finished tasks even if high priority and due soon', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create a finished high priority task due tomorrow
    await db.insert(tasksTable).values({
      title: 'Finished Urgent Task',
      description: 'Already completed',
      priority: 'HIGH',
      status: 'FINISHED',
      deadline: tomorrow,
      finished_at: new Date()
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(0);
  });

  it('should exclude medium and low priority tasks even if due soon', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create medium and low priority tasks due tomorrow
    await db.insert(tasksTable).values([
      {
        title: 'Medium Priority Task',
        priority: 'MEDIUM',
        status: 'TODO',
        deadline: tomorrow
      },
      {
        title: 'Low Priority Task',
        priority: 'LOW',
        status: 'TODO',
        deadline: tomorrow
      }
    ]).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(0);
  });

  it('should exclude high priority tasks without deadlines', async () => {
    // Create high priority task without deadline
    await db.insert(tasksTable).values({
      title: 'High Priority No Deadline',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      deadline: null
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(0);
  });

  it('should exclude high priority tasks due more than 3 days away', async () => {
    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

    // Create high priority task due in 4 days
    await db.insert(tasksTable).values({
      title: 'Future High Priority Task',
      priority: 'HIGH',
      status: 'TODO',
      deadline: fourDaysFromNow
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(0);
  });

  it('should exclude high priority tasks with past due dates', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create high priority task that was due yesterday
    await db.insert(tasksTable).values({
      title: 'Overdue High Priority Task',
      priority: 'HIGH',
      status: 'TODO',
      deadline: yesterday
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(0);
  });

  it('should include tasks due exactly 3 days from now', async () => {
    const exactlyThreeDays = new Date();
    exactlyThreeDays.setDate(exactlyThreeDays.getDate() + 3);

    // Create high priority task due exactly 3 days from now
    await db.insert(tasksTable).values({
      title: 'Task Due in 3 Days',
      priority: 'HIGH',
      status: 'NEXT',
      deadline: exactlyThreeDays
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Task Due in 3 Days');
  });

  it('should include tasks due today', async () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Create high priority task due today
    await db.insert(tasksTable).values({
      title: 'Task Due Today',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      deadline: today
    }).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Task Due Today');
  });

  it('should return multiple urgent tasks when they exist', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // Create multiple high priority urgent tasks
    await db.insert(tasksTable).values([
      {
        title: 'First Urgent Task',
        priority: 'HIGH',
        status: 'TODO',
        deadline: tomorrow
      },
      {
        title: 'Second Urgent Task',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        deadline: dayAfterTomorrow
      }
    ]).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(2);
    const titles = results.map(task => task.title);
    expect(titles).toContain('First Urgent Task');
    expect(titles).toContain('Second Urgent Task');
  });

  it('should return empty array when no urgent tasks exist', async () => {
    // Create only non-urgent tasks
    await db.insert(tasksTable).values([
      {
        title: 'Low Priority Task',
        priority: 'LOW',
        status: 'TODO',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      {
        title: 'High Priority Future Task',
        priority: 'HIGH',
        status: 'TODO',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      }
    ]).execute();

    const results = await getHighPriorityUrgentTasks();

    expect(results).toHaveLength(0);
  });
});