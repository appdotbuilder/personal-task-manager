import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getNextTasks } from '../handlers/get_next_tasks';

describe('getNextTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTask = async (input: CreateTaskInput & { status?: string }) => {
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: (input.status as any) || 'TODO',
        deadline: input.deadline
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should return high priority tasks with approaching deadlines', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // High priority task due tomorrow - should be included
    await createTask({
      title: 'Urgent Task',
      description: 'High priority with deadline',
      priority: 'HIGH',
      status: 'TODO',
      deadline: tomorrow
    });

    // Low priority task due tomorrow - should be included (any task due within 3 days)
    await createTask({
      title: 'Regular Task',
      description: 'Low priority but due soon',
      priority: 'LOW',
      status: 'TODO',
      deadline: tomorrow
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(2);
    expect(nextTasks.some(task => task.title === 'Urgent Task')).toBe(true);
    expect(nextTasks.some(task => task.title === 'Regular Task')).toBe(true);
  });

  it('should return any tasks due within 3 days regardless of priority', async () => {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Medium priority task due in 2 days
    await createTask({
      title: 'Medium Task',
      description: 'Due in 2 days',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: twoDaysFromNow
    });

    // Low priority task due in 3 days
    await createTask({
      title: 'Low Priority Task',
      description: 'Due in 3 days',
      priority: 'LOW',
      status: 'TODO',
      deadline: threeDaysFromNow
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(2);
    expect(nextTasks.some(task => task.title === 'Medium Task')).toBe(true);
    expect(nextTasks.some(task => task.title === 'Low Priority Task')).toBe(true);
  });

  it('should return high priority tasks without deadlines', async () => {
    // High priority task without deadline - should be included
    await createTask({
      title: 'High Priority No Deadline',
      description: 'Important but no specific deadline',
      priority: 'HIGH',
      status: 'TODO',
      deadline: null
    });

    // Medium priority task without deadline - should NOT be included
    await createTask({
      title: 'Medium Priority No Deadline',
      description: 'Medium priority without deadline',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: null
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(1);
    expect(nextTasks[0].title).toBe('High Priority No Deadline');
    expect(nextTasks[0].priority).toBe('HIGH');
  });

  it('should exclude finished tasks and ideas', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // High priority finished task - should be excluded
    await createTask({
      title: 'Finished High Priority',
      description: 'High priority but finished',
      priority: 'HIGH',
      deadline: tomorrow,
      status: 'FINISHED'
    });

    // High priority idea - should be excluded
    await createTask({
      title: 'High Priority Idea',
      description: 'High priority but just an idea',
      priority: 'HIGH',
      deadline: tomorrow,
      status: 'IDEA'
    });

    // High priority todo task - should be included
    await createTask({
      title: 'Active High Priority',
      description: 'High priority and active',
      priority: 'HIGH',
      deadline: tomorrow,
      status: 'TODO'
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(1);
    expect(nextTasks[0].title).toBe('Active High Priority');
    expect(nextTasks[0].status).toBe('TODO');
  });

  it('should exclude tasks due more than 3 days from now (unless high priority without deadline)', async () => {
    const fourDaysFromNow = new Date();
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4);

    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    // High priority task due in 4 days - should NOT be included
    await createTask({
      title: 'High Priority Far Future',
      description: 'High priority but due in 4 days',
      priority: 'HIGH',
      status: 'TODO',
      deadline: fourDaysFromNow
    });

    // Medium priority task due in a week - should NOT be included
    await createTask({
      title: 'Medium Priority Week',
      description: 'Medium priority due in a week',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: oneWeekFromNow
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(0);
  });

  it('should include in-progress tasks that meet criteria', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // In-progress high priority task due tomorrow
    await createTask({
      title: 'In Progress Task',
      description: 'Already started but due soon',
      priority: 'HIGH',
      deadline: tomorrow,
      status: 'IN_PROGRESS'
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(1);
    expect(nextTasks[0].title).toBe('In Progress Task');
    expect(nextTasks[0].status).toBe('IN_PROGRESS');
  });

  it('should handle edge case with deadline exactly 3 days from now', async () => {
    const exactlyThreeDays = new Date();
    exactlyThreeDays.setDate(exactlyThreeDays.getDate() + 3);
    exactlyThreeDays.setHours(12, 0, 0, 0); // Middle of the day

    // Task due exactly 3 days from now
    await createTask({
      title: 'Exactly Three Days',
      description: 'Due exactly 3 days from now',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: exactlyThreeDays
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(1);
    expect(nextTasks[0].title).toBe('Exactly Three Days');
  });

  it('should return empty array when no tasks meet criteria', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Only create tasks that don't meet "next" criteria
    await createTask({
      title: 'Future Low Priority',
      description: 'Low priority task due next week',
      priority: 'LOW',
      status: 'TODO',
      deadline: nextWeek
    });

    await createTask({
      title: 'Medium No Deadline',
      description: 'Medium priority without deadline',
      priority: 'MEDIUM',
      status: 'TODO',
      deadline: null
    });

    const nextTasks = await getNextTasks();

    expect(nextTasks).toHaveLength(0);
  });
});