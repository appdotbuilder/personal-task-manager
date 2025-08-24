import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats for empty database', async () => {
    const stats = await getDashboardStats();

    expect(stats.total_finished_tasks).toBe(0);
    expect(stats.tasks_by_status.TODO).toBe(0);
    expect(stats.tasks_by_status.IN_PROGRESS).toBe(0);
    expect(stats.tasks_by_status.FINISHED).toBe(0);
    expect(stats.tasks_by_status.IDEA).toBe(0);
    expect(stats.tasks_by_status.NEXT).toBe(0);
    expect(stats.tasks_by_priority.HIGH).toBe(0);
    expect(stats.tasks_by_priority.MEDIUM).toBe(0);
    expect(stats.tasks_by_priority.LOW).toBe(0);
    expect(stats.average_completion_time_days).toBe(null);
    expect(stats.tasks_due_soon).toBe(0);
    expect(stats.high_priority_urgent_count).toBe(0);
  });

  it('should count tasks by status correctly', async () => {
    // Create tasks with different statuses
    await db.insert(tasksTable).values([
      { title: 'Task 1', priority: 'HIGH', status: 'TODO' },
      { title: 'Task 2', priority: 'MEDIUM', status: 'IN_PROGRESS' },
      { title: 'Task 3', priority: 'LOW', status: 'FINISHED', finished_at: new Date() },
      { title: 'Task 4', priority: 'HIGH', status: 'IDEA' },
      { title: 'Task 5', priority: 'MEDIUM', status: 'NEXT' },
      { title: 'Task 6', priority: 'LOW', status: 'TODO' }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.tasks_by_status.TODO).toBe(2);
    expect(stats.tasks_by_status.IN_PROGRESS).toBe(1);
    expect(stats.tasks_by_status.FINISHED).toBe(1);
    expect(stats.tasks_by_status.IDEA).toBe(1);
    expect(stats.tasks_by_status.NEXT).toBe(1);
    expect(stats.total_finished_tasks).toBe(1);
  });

  it('should count tasks by priority correctly', async () => {
    // Create tasks with different priorities
    await db.insert(tasksTable).values([
      { title: 'Task 1', priority: 'HIGH', status: 'TODO' },
      { title: 'Task 2', priority: 'HIGH', status: 'IN_PROGRESS' },
      { title: 'Task 3', priority: 'MEDIUM', status: 'TODO' },
      { title: 'Task 4', priority: 'MEDIUM', status: 'FINISHED', finished_at: new Date() },
      { title: 'Task 5', priority: 'LOW', status: 'TODO' }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.tasks_by_priority.HIGH).toBe(2);
    expect(stats.tasks_by_priority.MEDIUM).toBe(2);
    expect(stats.tasks_by_priority.LOW).toBe(1);
  });

  it('should calculate average completion time correctly', async () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    // Create finished tasks with known completion times
    await db.insert(tasksTable).values([
      { 
        title: 'Task 1', 
        priority: 'HIGH', 
        status: 'FINISHED',
        created_at: fourDaysAgo,
        finished_at: twoDaysAgo // 2 days to complete
      },
      { 
        title: 'Task 2', 
        priority: 'MEDIUM', 
        status: 'FINISHED',
        created_at: fourDaysAgo,
        finished_at: now // 4 days to complete
      },
      { 
        title: 'Task 3', 
        priority: 'LOW', 
        status: 'TODO' // Not finished
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_finished_tasks).toBe(2);
    expect(stats.average_completion_time_days).not.toBe(null);
    // Average should be (2 + 4) / 2 = 3 days
    expect(stats.average_completion_time_days).toBeCloseTo(3, 1);
  });

  it('should handle null finished_at for finished tasks', async () => {
    // Create finished task without finished_at timestamp
    await db.insert(tasksTable).values([
      { 
        title: 'Task 1', 
        priority: 'HIGH', 
        status: 'FINISHED',
        finished_at: null // This shouldn't contribute to average
      }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.total_finished_tasks).toBe(1);
    expect(stats.average_completion_time_days).toBe(null); // No valid completion times
  });

  it('should count tasks due soon correctly', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    await db.insert(tasksTable).values([
      { title: 'Task 1', priority: 'HIGH', status: 'TODO', deadline: tomorrow },
      { title: 'Task 2', priority: 'MEDIUM', status: 'TODO', deadline: twoDaysFromNow },
      { title: 'Task 3', priority: 'LOW', status: 'TODO', deadline: fiveDaysFromNow }, // Too far
      { title: 'Task 4', priority: 'HIGH', status: 'TODO', deadline: yesterday }, // Past due
      { title: 'Task 5', priority: 'MEDIUM', status: 'TODO', deadline: null } // No deadline
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.tasks_due_soon).toBe(2); // Only tomorrow and two days from now
  });

  it('should count high priority urgent tasks correctly', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    await db.insert(tasksTable).values([
      { title: 'Task 1', priority: 'HIGH', status: 'TODO', deadline: tomorrow }, // High priority, due soon
      { title: 'Task 2', priority: 'HIGH', status: 'TODO', deadline: twoDaysFromNow }, // High priority, due soon
      { title: 'Task 3', priority: 'HIGH', status: 'TODO', deadline: fiveDaysFromNow }, // High priority, but not urgent
      { title: 'Task 4', priority: 'MEDIUM', status: 'TODO', deadline: tomorrow }, // Due soon, but not high priority
      { title: 'Task 5', priority: 'HIGH', status: 'TODO', deadline: null } // High priority, no deadline
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.high_priority_urgent_count).toBe(2); // Only high priority tasks due within 3 days
  });

  it('should handle edge case of tasks due exactly 3 days from now', async () => {
    const now = new Date();
    const exactlyThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    await db.insert(tasksTable).values([
      { title: 'Task 1', priority: 'HIGH', status: 'TODO', deadline: exactlyThreeDays }
    ]).execute();

    const stats = await getDashboardStats();

    expect(stats.tasks_due_soon).toBe(1); // Should include tasks due exactly 3 days from now
    expect(stats.high_priority_urgent_count).toBe(1);
  });

  it('should return comprehensive dashboard statistics', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Create a variety of tasks for comprehensive testing
    await db.insert(tasksTable).values([
      { 
        title: 'Completed Task', 
        priority: 'HIGH', 
        status: 'FINISHED',
        created_at: yesterday,
        finished_at: now,
        deadline: tomorrow
      },
      { title: 'Urgent Task', priority: 'HIGH', status: 'TODO', deadline: tomorrow },
      { title: 'Regular Task', priority: 'MEDIUM', status: 'IN_PROGRESS' },
      { title: 'Future Task', priority: 'LOW', status: 'IDEA' }
    ]).execute();

    const stats = await getDashboardStats();

    // Verify all fields are present and reasonable
    expect(typeof stats.total_finished_tasks).toBe('number');
    expect(typeof stats.tasks_by_status.TODO).toBe('number');
    expect(typeof stats.tasks_by_status.IN_PROGRESS).toBe('number');
    expect(typeof stats.tasks_by_status.FINISHED).toBe('number');
    expect(typeof stats.tasks_by_status.IDEA).toBe('number');
    expect(typeof stats.tasks_by_status.NEXT).toBe('number');
    expect(typeof stats.tasks_by_priority.HIGH).toBe('number');
    expect(typeof stats.tasks_by_priority.MEDIUM).toBe('number');
    expect(typeof stats.tasks_by_priority.LOW).toBe('number');
    expect(stats.average_completion_time_days === null || typeof stats.average_completion_time_days === 'number').toBe(true);
    expect(typeof stats.tasks_due_soon).toBe('number');
    expect(typeof stats.high_priority_urgent_count).toBe('number');

    // Verify specific values
    expect(stats.total_finished_tasks).toBe(1);
    expect(stats.tasks_by_status.FINISHED).toBe(1);
    expect(stats.tasks_by_status.TODO).toBe(1);
    expect(stats.tasks_by_status.IN_PROGRESS).toBe(1);
    expect(stats.tasks_by_status.IDEA).toBe(1);
    expect(stats.tasks_by_priority.HIGH).toBe(2);
    expect(stats.tasks_by_priority.MEDIUM).toBe(1);
    expect(stats.tasks_by_priority.LOW).toBe(1);
    expect(stats.tasks_due_soon).toBe(2); // Completed task and urgent task both have tomorrow deadline
    expect(stats.high_priority_urgent_count).toBe(2); // Both high priority tasks have tomorrow deadline
  });
});