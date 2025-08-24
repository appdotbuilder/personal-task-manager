import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, BarChart3, AlertTriangle, Target } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Task, CreateTaskInput, TaskFilter, DashboardStats } from '../../server/src/schema';

import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { Dashboard } from '@/components/Dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async (filter?: TaskFilter) => {
    try {
      const result = await trpc.getTasks.query(filter);
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  const loadDashboardStats = useCallback(async () => {
    try {
      const stats = await trpc.getDashboardStats.query();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([loadTasks(activeFilter), loadDashboardStats()]);
      setIsLoading(false);
    };
    loadInitialData();
  }, [loadTasks, loadDashboardStats, activeFilter]);

  const handleCreateTask = async (taskData: CreateTaskInput) => {
    try {
      const newTask = await trpc.createTask.mutate(taskData);
      setTasks((prev: Task[]) => [newTask, ...prev]);
      setIsCreateDialogOpen(false);
      // Reload dashboard stats after creating a task
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const updatedTask = await trpc.updateTask.mutate({ id: taskId, ...updates });
      setTasks((prev: Task[]) =>
        prev.map((task: Task) => (task.id === taskId ? updatedTask : task))
      );
      // Reload dashboard stats after updating a task
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await trpc.deleteTask.mutate(taskId);
      setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
      // Reload dashboard stats after deleting a task
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const applyFilter = (filter: TaskFilter) => {
    setActiveFilter(filter);
  };

  const clearFilter = () => {
    setActiveFilter({});
  };

  // Filter tasks locally for different views
  const todoTasks = tasks.filter((task: Task) => task.status === 'TODO');
  const inProgressTasks = tasks.filter((task: Task) => task.status === 'IN_PROGRESS');
  const finishedTasks = tasks.filter((task: Task) => task.status === 'FINISHED');
  const ideaTasks = tasks.filter((task: Task) => task.status === 'IDEA');
  const nextTasks = tasks.filter((task: Task) => task.status === 'NEXT');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📋 Task Manager</h1>
            <p className="text-gray-600">Stay organized and productive</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Active Filter Indicator */}
            {(activeFilter.status || activeFilter.priority || activeFilter.due_within_days !== undefined) && (
              <Badge variant="secondary" className="px-3 py-1">
                Filter Active
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilter}
                  className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                >
                  ✕
                </Button>
              </Badge>
            )}
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  onSubmit={handleCreateTask}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="next" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Next ({nextTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="todo" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>To-Do ({todoTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
              <span>In Progress ({inProgressTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="finished" className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <span>Finished ({finishedTasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="ideas" className="flex items-center space-x-2">
              <div className="h-4 w-4">💡</div>
              <span>Ideas ({ideaTasks.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard 
              stats={dashboardStats} 
              onFilterApply={applyFilter}
              totalTasks={tasks.length}
            />
          </TabsContent>

          <TabsContent value="next" className="space-y-6">
            <div className="bg-white rounded-lg border border-orange-200 p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-orange-800">Next Tasks</h2>
              </div>
              <p className="text-sm text-orange-700">
                High priority tasks automatically moved here based on deadline proximity
              </p>
            </div>
            <TaskList
              tasks={nextTasks}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              emptyMessage="No urgent tasks at the moment! 🎉"
            />
          </TabsContent>

          <TabsContent value="todo" className="space-y-6">
            <TaskList
              tasks={todoTasks}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              emptyMessage="No tasks in your to-do list. Create one to get started!"
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <TaskList
              tasks={inProgressTasks}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              emptyMessage="No tasks in progress. Move some from your to-do list!"
            />
          </TabsContent>

          <TabsContent value="finished" className="space-y-6">
            <TaskList
              tasks={finishedTasks}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              emptyMessage="No completed tasks yet. You've got this! 💪"
              showCompletionDate
            />
          </TabsContent>

          <TabsContent value="ideas" className="space-y-6">
            <div className="bg-white rounded-lg border border-purple-200 p-4 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xl">💡</span>
                <h2 className="text-lg font-semibold text-purple-800">Idea Bank</h2>
              </div>
              <p className="text-sm text-purple-700">
                Capture your ideas here - no deadlines required!
              </p>
            </div>
            <TaskList
              tasks={ideaTasks}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              emptyMessage="No ideas captured yet. Let your creativity flow! ✨"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;