import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import { 
  createTaskInputSchema, 
  updateTaskInputSchema, 
  taskFilterSchema 
} from './schema';

// Import handlers
import { createTask } from './handlers/create_task';
import { getTasks, getTaskById } from './handlers/get_tasks';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { getHighPriorityUrgentTasks } from './handlers/get_high_priority_urgent_tasks';
import { getNextTasks } from './handlers/get_next_tasks';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Task CRUD operations
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input)),

  getTasks: publicProcedure
    .input(taskFilterSchema.optional())
    .query(({ input }) => getTasks(input)),

  getTaskById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTaskById(input)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input)),

  deleteTask: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteTask(input)),

  // Dashboard and statistics
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Special task views
  getHighPriorityUrgentTasks: publicProcedure
    .query(() => getHighPriorityUrgentTasks()),

  getNextTasks: publicProcedure
    .query(() => getNextTasks()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();