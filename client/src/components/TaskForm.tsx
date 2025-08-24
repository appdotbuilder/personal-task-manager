import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Note: Using basic date formatting instead of date-fns to avoid dependency issues
// import { format } from 'date-fns';
import type { CreateTaskInput, TaskPriority, TaskStatus } from '../../../server/src/schema';

interface TaskFormProps {
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateTaskInput>;
  isLoading?: boolean;
}

const priorityOptions: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'HIGH', label: '🔴 High', color: 'text-red-600' },
  { value: 'MEDIUM', label: '🟡 Medium', color: 'text-yellow-600' },
  { value: 'LOW', label: '🟢 Low', color: 'text-green-600' }
];

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: '📋 To-Do' },
  { value: 'IN_PROGRESS', label: '⚡ In Progress' },
  { value: 'FINISHED', label: '✅ Finished' },
  { value: 'IDEA', label: '💡 Idea' }
];

export function TaskForm({ onSubmit, onCancel, initialData, isLoading = false }: TaskFormProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: initialData?.title || '',
    description: initialData?.description || null,
    priority: initialData?.priority || 'MEDIUM',
    status: initialData?.status || 'TODO',
    deadline: initialData?.deadline || null
  });

  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(
    formData.deadline ? new Date(formData.deadline) : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit task:', error);
    }
  };

  const handleDeadlineChange = (date: Date | undefined) => {
    setDeadlineDate(date);
    setFormData((prev: CreateTaskInput) => ({
      ...prev,
      deadline: date || null
    }));
  };

  const clearDeadline = () => {
    setDeadlineDate(undefined);
    setFormData((prev: CreateTaskInput) => ({
      ...prev,
      deadline: null
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
          }
          placeholder="What needs to be done?"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setFormData((prev: CreateTaskInput) => ({
              ...prev,
              description: e.target.value || null
            }))
          }
          placeholder="Add more details about this task..."
          rows={3}
        />
      </div>

      {/* Priority and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: TaskPriority) =>
              setFormData((prev: CreateTaskInput) => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={option.color}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: TaskStatus) =>
              setFormData((prev: CreateTaskInput) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label>Deadline (Optional)</Label>
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deadlineDate ? deadlineDate.toLocaleDateString() : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deadlineDate}
                onSelect={handleDeadlineChange}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
          {deadlineDate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={clearDeadline}
              className="shrink-0"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !formData.title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}