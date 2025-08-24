import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, Trash2, Edit3, CheckCircle2 } from 'lucide-react';
// Using basic date utilities instead of date-fns to avoid dependency issues

const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  return 'just now';
};

const differenceInDays = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / oneDay);
};

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${day.toString().padStart(2, '0')}, ${year}`;
};
import type { Task, TaskPriority, TaskStatus } from '../../../server/src/schema';

interface TaskListProps {
  tasks: Task[];
  onUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
  emptyMessage: string;
  showCompletionDate?: boolean;
}

const priorityConfig = {
  HIGH: { label: 'High', color: 'bg-red-100 text-red-800 border-red-200', emoji: '🔴' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', emoji: '🟡' },
  LOW: { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200', emoji: '🟢' }
};

const statusConfig = {
  TODO: { label: 'To-Do', color: 'bg-gray-100 text-gray-800', emoji: '📋' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', emoji: '⚡' },
  FINISHED: { label: 'Finished', color: 'bg-green-100 text-green-800', emoji: '✅' },
  IDEA: { label: 'Idea', color: 'bg-purple-100 text-purple-800', emoji: '💡' },
  NEXT: { label: 'Next', color: 'bg-orange-100 text-orange-800', emoji: '🎯' }
};

export function TaskList({ tasks, onUpdate, onDelete, emptyMessage, showCompletionDate = false }: TaskListProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<number>>(new Set());

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId));
    try {
      const updates: Partial<Task> = { status: newStatus };
      
      // If marking as finished, set finished_at timestamp
      if (newStatus === 'FINISHED') {
        updates.finished_at = new Date();
      }
      
      await onUpdate(taskId, updates);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTasks((prev) => {
        const updated = new Set(prev);
        updated.delete(taskId);
        return updated;
      });
    }
  };

  const handlePriorityChange = async (taskId: number, newPriority: TaskPriority) => {
    setUpdatingTasks((prev) => new Set(prev).add(taskId));
    try {
      await onUpdate(taskId, { priority: newPriority });
    } catch (error) {
      console.error('Failed to update task priority:', error);
    } finally {
      setUpdatingTasks((prev) => {
        const updated = new Set(prev);
        updated.delete(taskId);
        return updated;
      });
    }
  };

  const getDeadlineStatus = (deadline: Date | null) => {
    if (!deadline) return null;
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = differenceInDays(deadlineDate, now);
    
    if (daysUntil < 0) {
      return { type: 'overdue', message: 'Overdue', color: 'text-red-600' };
    } else if (daysUntil === 0) {
      return { type: 'today', message: 'Due today', color: 'text-orange-600' };
    } else if (daysUntil <= 3) {
      return { type: 'soon', message: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`, color: 'text-orange-600' };
    } else {
      return { type: 'future', message: `Due in ${daysUntil} days`, color: 'text-gray-600' };
    }
  };

  const quickMarkComplete = async (taskId: number) => {
    await handleStatusChange(taskId, 'FINISHED');
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌟</div>
        <p className="text-lg text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task: Task) => {
        const deadlineStatus = getDeadlineStatus(task.deadline);
        const isUpdating = updatingTasks.has(task.id);
        const priorityInfo = priorityConfig[task.priority];
        const statusInfo = statusConfig[task.status];

        return (
          <Card key={task.id} className={`task-card ${isUpdating ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {task.status !== 'FINISHED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => quickMarkComplete(task.id)}
                      disabled={isUpdating}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{task.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(task.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Priority Badge */}
                  <Badge variant="outline" className={priorityInfo.color}>
                    {priorityInfo.emoji} {priorityInfo.label}
                  </Badge>

                  {/* Status Badge */}
                  <Badge variant="secondary" className={statusInfo.color}>
                    {statusInfo.emoji} {statusInfo.label}
                  </Badge>

                  {/* Deadline Info */}
                  {task.deadline && (
                    <div className="flex items-center space-x-1 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(new Date(task.deadline))}</span>
                      {deadlineStatus && (
                        <span className={`font-medium ${deadlineStatus.color}`}>
                          ({deadlineStatus.message})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Completion Date */}
                  {showCompletionDate && task.finished_at && (
                    <div className="flex items-center space-x-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Completed {formatDate(new Date(task.finished_at))}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {/* Priority Selector */}
                  <Select
                    value={task.priority}
                    onValueChange={(value: TaskPriority) => handlePriorityChange(task.id, value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">🔴 High</SelectItem>
                      <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                      <SelectItem value="LOW">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Selector */}
                  <Select
                    value={task.status}
                    onValueChange={(value: TaskStatus) => handleStatusChange(task.id, value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">📋 To-Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">⚡ In Progress</SelectItem>
                      <SelectItem value="FINISHED">✅ Finished</SelectItem>
                      <SelectItem value="IDEA">💡 Idea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Task Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t">
                <span>Created {formatDistanceToNow(new Date(task.created_at))} ago</span>
                {task.updated_at && new Date(task.updated_at).getTime() !== new Date(task.created_at).getTime() && (
                  <span>Updated {formatDistanceToNow(new Date(task.updated_at))} ago</span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}