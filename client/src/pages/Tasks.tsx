import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  CheckSquare,
  Plus,
  MoreHorizontal,
  Calendar,
  CalendarPlus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  Trash2,
  Edit,
  Briefcase,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "critical";

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-gray-400" />,
  in_progress: <PlayCircle className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-400" />,
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function Tasks() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    matterId: "",
    priority: "medium" as TaskPriority,
    dueDate: "",
    estimatedMinutes: "",
    tags: "",
  });

  const { data: tasks, isLoading } = trpc.tasks.list.useQuery({
    status: statusFilter as any,
    priority: priorityFilter as any,
  });
  const { data: matters } = trpc.matters.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: overdueTasks } = trpc.tasks.getOverdue.useQuery();
  const { data: dueTodayTasks } = trpc.tasks.getDueToday.useQuery();
  const { data: calendarIntegration } = trpc.calendar.getIntegration.useQuery();
  const { data: syncedEvents } = trpc.calendar.getSyncedEvents.useQuery();

  const utils = trpc.useUtils();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      utils.tasks.list.invalidate();
      utils.tasks.getOverdue.invalidate();
      utils.tasks.getDueToday.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully");
      utils.tasks.list.invalidate();
      utils.tasks.getOverdue.invalidate();
      utils.tasks.getDueToday.invalidate();
      setIsDialogOpen(false);
      setEditingTask(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast.success("Task deleted successfully");
      utils.tasks.list.invalidate();
      utils.tasks.getOverdue.invalidate();
      utils.tasks.getDueToday.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const bulkUpdateStatus = trpc.tasks.bulkUpdateStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.count} tasks`);
      utils.tasks.list.invalidate();
      utils.tasks.getOverdue.invalidate();
      utils.tasks.getDueToday.invalidate();
      setSelectedTasks([]);
    },
    onError: (error) => {
      toast.error(`Failed to update tasks: ${error.message}`);
    },
  });

  const syncTaskToCalendar = trpc.calendar.syncTask.useMutation({
    onSuccess: () => {
      toast.success("Task synced to calendar");
      utils.calendar.getSyncedEvents.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to sync: ${error.message}`);
    },
  });

  const isTaskSynced = (taskId: number) => {
    return syncedEvents?.some((e) => e.entityType === "task" && e.entityId === taskId);
  };

  const canSyncTask = calendarIntegration?.isConnected && calendarIntegration?.syncTasks;

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      matterId: "",
      priority: "medium",
      dueDate: "",
      estimatedMinutes: "",
      tags: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title: formData.title,
      description: formData.description || undefined,
      matterId: formData.matterId ? parseInt(formData.matterId) : undefined,
      priority: formData.priority,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      estimatedMinutes: formData.estimatedMinutes
        ? parseInt(formData.estimatedMinutes)
        : undefined,
      tags: formData.tags || undefined,
    };

    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...data });
    } else {
      createTask.mutate(data);
    }
  };

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      matterId: task.matterId?.toString() || "",
      priority: task.priority,
      dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      estimatedMinutes: task.estimatedMinutes?.toString() || "",
      tags: task.tags || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask.mutate({ id: taskId });
    }
  };

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleBulkAction = (status: TaskStatus) => {
    if (selectedTasks.length === 0) return;
    bulkUpdateStatus.mutate({ ids: selectedTasks, status });
  };

  const getMatterTitle = (matterId: number | null) => {
    if (!matterId || !matters) return null;
    const matter = matters.find((m) => m.id === matterId);
    return matter?.title;
  };

  const getClientName = (clientId: number | null) => {
    if (!clientId || !clients) return null;
    const client = clients.find((c) => c.id === clientId);
    return client?.name;
  };

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const TaskCard = ({ task }: { task: any }) => {
    const matter = getMatterTitle(task.matterId);
    const taskOverdue = isOverdue(task.dueDate);

    return (
      <Card
        className={`hover:shadow-md transition-shadow ${
          task.status === "completed" ? "opacity-60" : ""
        } ${taskOverdue && task.status !== "completed" ? "border-red-300" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={selectedTasks.includes(task.id)}
              onCheckedChange={() => toggleTaskSelection(task.id)}
              className="mt-1"
            />
            <div
              className="cursor-pointer"
              onClick={() =>
                handleStatusChange(
                  task.id,
                  task.status === "completed" ? "pending" : "completed"
                )
              }
            >
              {statusIcons[task.status as TaskStatus]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={`font-medium ${
                      task.status === "completed" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(task)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(task.id, "pending")}
                    >
                      <Circle className="mr-2 h-4 w-4" />
                      Mark Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(task.id, "in_progress")}
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Mark In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(task.id, "completed")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Completed
                    </DropdownMenuItem>
                    {canSyncTask && task.dueDate && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => syncTaskToCalendar.mutate({ taskId: task.id })}
                          disabled={syncTaskToCalendar.isPending}
                        >
                          <CalendarPlus className="mr-2 h-4 w-4" />
                          {isTaskSynced(task.id) ? "Update in Calendar" : "Sync to Calendar"}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge className={priorityColors[task.priority as TaskPriority]}>
                  {task.priority}
                </Badge>
                {matter && (
                  <Badge variant="outline" className="gap-1">
                    <Briefcase className="h-3 w-3" />
                    {matter}
                  </Badge>
                )}
                {task.dueDate && (
                  <Badge
                    variant="outline"
                    className={`gap-1 ${
                      taskOverdue && task.status !== "completed"
                        ? "border-red-500 text-red-600"
                        : ""
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </Badge>
                )}
                {task.estimatedMinutes && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {task.estimatedMinutes}m
                  </Badge>
                )}
                {task.tags &&
                  task.tags.split(",").map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag.trim()}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pendingTasks = tasks?.filter((t) => t.status === "pending") || [];
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress") || [];
  const completedTasks = tasks?.filter((t) => t.status === "completed") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground mt-2">
              Manage your work items and to-dos
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingTask(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingTask ? "Edit Task" : "Create New Task"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingTask
                      ? "Update task details"
                      : "Add a new task to track your work"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Review contract draft"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Additional details about the task"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="matter">Related Matter</Label>
                      <Select
                        value={formData.matterId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, matterId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select matter (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No matter</SelectItem>
                          {matters?.map((matter) => (
                            <SelectItem
                              key={matter.id}
                              value={matter.id.toString()}
                            >
                              {matter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: TaskPriority) =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData({ ...formData, dueDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="estimatedMinutes">
                        Estimated Time (minutes)
                      </Label>
                      <Input
                        id="estimatedMinutes"
                        type="number"
                        value={formData.estimatedMinutes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimatedMinutes: e.target.value,
                          })
                        }
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) =>
                        setFormData({ ...formData, tags: e.target.value })
                      }
                      placeholder="e.g., urgent, client-call, research"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createTask.isPending || updateTask.isPending}
                  >
                    {createTask.isPending || updateTask.isPending
                      ? "Saving..."
                      : editingTask
                      ? "Update Task"
                      : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueTasks?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dueTodayTasks?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Due Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <PlayCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedTasks.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("completed")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction("in_progress")}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Start
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTasks([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Task Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingTasks.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress ({inProgressTasks.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading tasks...</div>
              </div>
            ) : tasks && tasks.length > 0 ? (
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No tasks yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first task to get started
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {pendingTasks.length > 0 ? (
              <div className="grid gap-3">
                {pendingTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <p className="text-muted-foreground">No pending tasks</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="mt-4">
            {inProgressTasks.length > 0 ? (
              <div className="grid gap-3">
                {inProgressTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <p className="text-muted-foreground">No tasks in progress</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedTasks.length > 0 ? (
              <div className="grid gap-3">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-40">
                  <p className="text-muted-foreground">No completed tasks</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
