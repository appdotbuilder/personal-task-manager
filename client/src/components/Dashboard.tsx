import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, Target, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DashboardStats, TaskFilter } from '../../../server/src/schema';

interface DashboardProps {
  stats: DashboardStats | null;
  onFilterApply: (filter: TaskFilter) => void;
  totalTasks: number;
}

export function Dashboard({ stats, onFilterApply, totalTasks }: DashboardProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalActiveTasks = totalTasks - stats.total_finished_tasks;
  const completionRate = totalTasks > 0 ? Math.round((stats.total_finished_tasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Tasks</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalTasks}</div>
            <p className="text-xs text-blue-600">
              {totalActiveTasks} active • {stats.total_finished_tasks} completed
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{completionRate}%</div>
            <Progress value={completionRate} className="w-full mt-2" />
          </CardContent>
        </Card>

        {/* Urgent Tasks */}
        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Due Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats.tasks_due_soon}</div>
            <p className="text-xs text-orange-600">Tasks due within 3 days</p>
            {stats.tasks_due_soon > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFilterApply({ due_within_days: 3 })}
                className="mt-2 text-orange-700 border-orange-300 hover:bg-orange-50"
              >
                View Tasks
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Average Completion Time */}
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Avg Completion</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {stats.average_completion_time_days !== null 
                ? `${Math.round(stats.average_completion_time_days)}d`
                : 'N/A'
              }
            </div>
            <p className="text-xs text-purple-600">Days to complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Tasks by Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.tasks_by_status).map(([status, count]) => {
              const statusConfig = {
                TODO: { label: '📋 To-Do', color: 'bg-gray-100 text-gray-800' },
                IN_PROGRESS: { label: '⚡ In Progress', color: 'bg-blue-100 text-blue-800' },
                FINISHED: { label: '✅ Finished', color: 'bg-green-100 text-green-800' },
                IDEA: { label: '💡 Ideas', color: 'bg-purple-100 text-purple-800' },
                NEXT: { label: '🎯 Next', color: 'bg-orange-100 text-orange-800' }
              };

              const config = statusConfig[status as keyof typeof statusConfig];
              if (!config || count === 0) return null;

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{count}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFilterApply({ status: status as any })}
                      className="h-6 px-2 text-xs"
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Tasks by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Tasks by Priority</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.tasks_by_priority).map(([priority, count]) => {
              const priorityConfig = {
                HIGH: { label: '🔴 High Priority', color: 'bg-red-100 text-red-800' },
                MEDIUM: { label: '🟡 Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
                LOW: { label: '🟢 Low Priority', color: 'bg-green-100 text-green-800' }
              };

              const config = priorityConfig[priority as keyof typeof priorityConfig];
              if (!config || count === 0) return null;

              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{count}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFilterApply({ priority: priority as any })}
                      className="h-6 px-2 text-xs"
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* High Priority Urgent Tasks Alert */}
      {stats.high_priority_urgent_count > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>⚠️ Urgent Attention Required!</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-3">
              You have <strong>{stats.high_priority_urgent_count}</strong> high priority task{stats.high_priority_urgent_count === 1 ? '' : 's'} due within the next 3 days.
            </p>
            <Button
              onClick={() => onFilterApply({ high_priority_urgent: true })}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              View Urgent Tasks
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              onClick={() => onFilterApply({ status: 'TODO' })}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <span className="text-lg">📋</span>
              <span className="text-sm">To-Do Tasks</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onFilterApply({ status: 'IN_PROGRESS' })}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <span className="text-lg">⚡</span>
              <span className="text-sm">In Progress</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onFilterApply({ priority: 'HIGH' })}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <span className="text-lg">🔴</span>
              <span className="text-sm">High Priority</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onFilterApply({ due_within_days: 7 })}
              className="flex flex-col h-auto p-4 space-y-2"
            >
              <span className="text-lg">⏰</span>
              <span className="text-sm">Due This Week</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}