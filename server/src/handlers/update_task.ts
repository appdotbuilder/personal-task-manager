import { type UpdateTaskInput, type Task } from '../schema';

export const updateTask = async (input: UpdateTaskInput): Promise<Task> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is updating an existing task in the database.
    // Should validate input, update the updated_at timestamp.
    // Should set finished_at timestamp when status changes to 'FINISHED'.
    // Should clear finished_at timestamp when status changes from 'FINISHED' to something else.
    return Promise.resolve({
        id: input.id,
        title: input.title || "Placeholder Title",
        description: input.description || null,
        priority: input.priority || 'MEDIUM',
        status: input.status || 'TODO',
        deadline: input.deadline || null,
        created_at: new Date(),
        updated_at: new Date(),
        finished_at: null
    } as Task);
};