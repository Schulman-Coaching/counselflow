import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Briefcase,
  User,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CheckSquare,
  AlertTriangle,
  Plus,
  Edit,
  History,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  closed: "bg-gray-100 text-gray-700",
  archived: "bg-gray-100 text-gray-500",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function MatterDetail() {
  const [, params] = useRoute("/matters/:id");
  const [, setLocation] = useLocation();
  const matterId = params?.id ? parseInt(params.id) : null;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isDeadlineDialogOpen, setIsDeadlineDialogOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    status: "" as "open" | "pending" | "closed" | "archived",
  });

  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    dueDate: "",
  });

  const [deadlineFormData, setDeadlineFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
  });

  // Queries
  const { data: matter, isLoading: matterLoading } = trpc.matters.get.useQuery(
    { id: matterId! },
    { enabled: !!matterId }
  );

  const { data: client } = trpc.clients.get.useQuery(
    { id: matter?.clientId! },
    { enabled: !!matter?.clientId }
  );

  const { data: documents } = trpc.documents.getByMatter.useQuery(
    { matterId: matterId! },
    { enabled: !!matterId }
  );

  const { data: tasks } = trpc.tasks.getByMatter.useQuery(
    { matterId: matterId! },
    { enabled: !!matterId }
  );

  const { data: timeEntries } = trpc.timeEntries.getByMatter.useQuery(
    { matterId: matterId! },
    { enabled: !!matterId }
  );

  const { data: deadlines } = trpc.deadlines.getByMatter.useQuery(
    { matterId: matterId! },
    { enabled: !!matterId }
  );

  const { data: invoices } = trpc.invoices.getByMatter.useQuery(
    { matterId: matterId! },
    { enabled: !!matterId }
  );

  const { data: activityLog } = trpc.activity.getAll.useQuery({ limit: 100 });

  const utils = trpc.useUtils();

  // Mutations
  const updateMatter = trpc.matters.update.useMutation({
    onSuccess: () => {
      toast.success("Matter updated successfully");
      utils.matters.get.invalidate({ id: matterId! });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update matter: ${error.message}`);
    },
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully");
      utils.tasks.getByMatter.invalidate({ matterId: matterId! });
      setIsTaskDialogOpen(false);
      setTaskFormData({ title: "", description: "", priority: "medium", dueDate: "" });
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    },
  });

  const createDeadline = trpc.deadlines.create.useMutation({
    onSuccess: () => {
      toast.success("Deadline created successfully");
      utils.deadlines.getByMatter.invalidate({ matterId: matterId! });
      setIsDeadlineDialogOpen(false);
      setDeadlineFormData({ title: "", description: "", dueDate: "", priority: "medium" });
    },
    onError: (error) => {
      toast.error(`Failed to create deadline: ${error.message}`);
    },
  });

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.getByMatter.invalidate({ matterId: matterId! });
    },
  });

  const updateDeadline = trpc.deadlines.update.useMutation({
    onSuccess: () => {
      utils.deadlines.getByMatter.invalidate({ matterId: matterId! });
    },
  });

  // Filter activity log for this matter
  const matterActivity = activityLog?.filter(
    (activity) =>
      (activity.entityType === "matter" && activity.entityId === matterId) ||
      (activity.entityType === "document" && documents?.some((d) => d.id === activity.entityId)) ||
      (activity.entityType === "task" && tasks?.some((t) => t.id === activity.entityId)) ||
      (activity.entityType === "time_entry" && timeEntries?.some((te) => te.id === activity.entityId)) ||
      (activity.entityType === "invoice" && invoices?.some((i) => i.id === activity.entityId))
  ) || [];

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMatter.mutate({
      id: matterId!,
      title: editFormData.title,
      description: editFormData.description,
      status: editFormData.status,
    });
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate({
      matterId: matterId!,
      clientId: matter?.clientId,
      title: taskFormData.title,
      description: taskFormData.description || undefined,
      priority: taskFormData.priority,
      dueDate: taskFormData.dueDate ? new Date(taskFormData.dueDate) : undefined,
    });
  };

  const handleDeadlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDeadline.mutate({
      matterId: matterId!,
      title: deadlineFormData.title,
      description: deadlineFormData.description || undefined,
      dueDate: new Date(deadlineFormData.dueDate),
      priority: deadlineFormData.priority,
    });
  };

  const openEditDialog = () => {
    if (matter) {
      setEditFormData({
        title: matter.title,
        description: matter.description || "",
        status: matter.status,
      });
      setIsEditDialogOpen(true);
    }
  };

  // Calculate financials
  const totalBilledTime = timeEntries?.reduce((acc, te) => acc + te.durationMinutes, 0) || 0;
  const totalBilledAmount = timeEntries?.reduce((acc, te) => {
    if (te.isBillable && te.hourlyRate) {
      return acc + (te.durationMinutes / 60) * te.hourlyRate;
    }
    return acc;
  }, 0) || 0;
  const totalInvoiced = invoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0;
  const totalPaid = invoices?.filter((inv) => inv.status === "paid").reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0;

  const pendingTasks = tasks?.filter((t) => t.status === "pending" || t.status === "in_progress") || [];
  const upcomingDeadlines = deadlines?.filter((d) => !d.isCompleted) || [];

  if (!matterId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Invalid matter ID</p>
        </div>
      </DashboardLayout>
    );
  }

  if (matterLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading matter...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!matter) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Matter not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/matters")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{matter.title}</h1>
                <Badge className={statusColors[matter.status]}>{matter.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {matter.caseType} • Created {format(new Date(matter.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <Button onClick={openEditDialog}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Matter
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{(totalBilledTime / 60).toFixed(1)}h</p>
                  <p className="text-sm text-muted-foreground">Time Logged</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(totalBilledAmount / 100).toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Billable Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckSquare className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Open Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingDeadlines.length}</p>
                  <p className="text-sm text-muted-foreground">Deadlines</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details and Client */}
          <div className="space-y-6">
            {/* Client Info */}
            {client && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium text-lg">{client.name}</p>
                    <Badge variant="outline" className="mt-1">
                      {client.status}
                    </Badge>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </div>
                  )}
                  {client.phoneNumber && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {client.phoneNumber}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {client.address}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Matter Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Matter Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {matter.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="mt-1">{matter.description}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Billing Type</p>
                    <p className="font-medium capitalize">{matter.billingType.replace("_", " ")}</p>
                  </div>
                  {matter.hourlyRate && (
                    <div>
                      <p className="text-muted-foreground">Hourly Rate</p>
                      <p className="font-medium">${(matter.hourlyRate / 100).toFixed(2)}/hr</p>
                    </div>
                  )}
                  {matter.flatFeeAmount && (
                    <div>
                      <p className="text-muted-foreground">Flat Fee</p>
                      <p className="font-medium">${(matter.flatFeeAmount / 100).toFixed(2)}</p>
                    </div>
                  )}
                  {matter.estimatedValue && (
                    <div>
                      <p className="text-muted-foreground">Estimated Value</p>
                      <p className="font-medium">${(matter.estimatedValue / 100).toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Invoiced</p>
                    <p className="font-medium">${(totalInvoiced / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Collected</p>
                    <p className="font-medium text-green-600">${(totalPaid / 100).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
                <TabsTrigger value="time">Time ({timeEntries?.length || 0})</TabsTrigger>
                <TabsTrigger value="deadlines">Deadlines ({deadlines?.length || 0})</TabsTrigger>
              </TabsList>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {matterActivity.length > 0 ? (
                      <div className="space-y-4">
                        {matterActivity.slice(0, 20).map((activity) => (
                          <div key={activity.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              <div className="w-px h-full bg-border" />
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {activity.action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.entityType} #{activity.entityId}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No activity recorded yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Tasks</CardTitle>
                    <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <form onSubmit={handleTaskSubmit}>
                          <DialogHeader>
                            <DialogTitle>Add Task</DialogTitle>
                            <DialogDescription>Create a new task for this matter</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="taskTitle">Title *</Label>
                              <Input
                                id="taskTitle"
                                value={taskFormData.title}
                                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                required
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="taskDescription">Description</Label>
                              <Textarea
                                id="taskDescription"
                                value={taskFormData.description}
                                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="taskPriority">Priority</Label>
                                <Select
                                  value={taskFormData.priority}
                                  onValueChange={(value: any) => setTaskFormData({ ...taskFormData, priority: value })}
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
                              <div className="grid gap-2">
                                <Label htmlFor="taskDueDate">Due Date</Label>
                                <Input
                                  id="taskDueDate"
                                  type="date"
                                  value={taskFormData.dueDate}
                                  onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={createTask.isPending}>
                              {createTask.isPending ? "Creating..." : "Create Task"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {tasks && tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-start justify-between p-3 rounded-lg border ${
                              task.status === "completed" ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={task.status === "completed"}
                                onChange={() =>
                                  updateTask.mutate({
                                    id: task.id,
                                    status: task.status === "completed" ? "pending" : "completed",
                                  })
                                }
                                className="mt-1"
                              />
                              <div>
                                <p className={`font-medium ${task.status === "completed" ? "line-through" : ""}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                                  {task.dueDate && (
                                    <Badge variant="outline">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {format(new Date(task.dueDate), "MMM d")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No tasks for this matter</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Documents</CardTitle>
                    <Button size="sm" onClick={() => setLocation("/documents/generate")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Document
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {documents && documents.length > 0 ? (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(doc.createdAt), "MMM d, yyyy")} • v{doc.version}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">{doc.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No documents for this matter</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Time Entries Tab */}
              <TabsContent value="time" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Time Entries</CardTitle>
                    <Button size="sm" onClick={() => setLocation("/time")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Log Time
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {timeEntries && timeEntries.length > 0 ? (
                      <div className="space-y-3">
                        {timeEntries.map((entry) => (
                          <div key={entry.id} className="flex items-start justify-between p-3 rounded-lg border">
                            <div>
                              <p className="font-medium">{entry.description}</p>
                              {entry.aiNarrative && (
                                <p className="text-sm text-muted-foreground mt-1 italic">{entry.aiNarrative}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {(entry.durationMinutes / 60).toFixed(1)}h
                                </Badge>
                                {entry.hourlyRate && (
                                  <Badge variant="outline">
                                    ${((entry.durationMinutes / 60) * (entry.hourlyRate / 100)).toFixed(2)}
                                  </Badge>
                                )}
                                <Badge variant={entry.isBillable ? "default" : "secondary"}>
                                  {entry.isBillable ? "Billable" : "Non-billable"}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(entry.entryDate), "MMM d")}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No time entries for this matter</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Deadlines Tab */}
              <TabsContent value="deadlines" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Deadlines</CardTitle>
                    <Dialog open={isDeadlineDialogOpen} onOpenChange={setIsDeadlineDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Deadline
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <form onSubmit={handleDeadlineSubmit}>
                          <DialogHeader>
                            <DialogTitle>Add Deadline</DialogTitle>
                            <DialogDescription>Create a new deadline for this matter</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="deadlineTitle">Title *</Label>
                              <Input
                                id="deadlineTitle"
                                value={deadlineFormData.title}
                                onChange={(e) => setDeadlineFormData({ ...deadlineFormData, title: e.target.value })}
                                required
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="deadlineDescription">Description</Label>
                              <Textarea
                                id="deadlineDescription"
                                value={deadlineFormData.description}
                                onChange={(e) =>
                                  setDeadlineFormData({ ...deadlineFormData, description: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="deadlineDueDate">Due Date *</Label>
                                <Input
                                  id="deadlineDueDate"
                                  type="date"
                                  value={deadlineFormData.dueDate}
                                  onChange={(e) => setDeadlineFormData({ ...deadlineFormData, dueDate: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="deadlinePriority">Priority</Label>
                                <Select
                                  value={deadlineFormData.priority}
                                  onValueChange={(value: any) =>
                                    setDeadlineFormData({ ...deadlineFormData, priority: value })
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
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={createDeadline.isPending}>
                              {createDeadline.isPending ? "Creating..." : "Create Deadline"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {deadlines && deadlines.length > 0 ? (
                      <div className="space-y-3">
                        {deadlines.map((deadline) => {
                          const isOverdue =
                            !deadline.isCompleted && new Date(deadline.dueDate) < new Date();
                          return (
                            <div
                              key={deadline.id}
                              className={`flex items-start justify-between p-3 rounded-lg border ${
                                deadline.isCompleted ? "opacity-60" : isOverdue ? "border-red-300" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={deadline.isCompleted}
                                  onChange={() =>
                                    updateDeadline.mutate({
                                      id: deadline.id,
                                      isCompleted: !deadline.isCompleted,
                                    })
                                  }
                                  className="mt-1"
                                />
                                <div>
                                  <p
                                    className={`font-medium ${deadline.isCompleted ? "line-through" : ""}`}
                                  >
                                    {deadline.title}
                                  </p>
                                  {deadline.description && (
                                    <p className="text-sm text-muted-foreground mt-1">{deadline.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge className={priorityColors[deadline.priority]}>{deadline.priority}</Badge>
                                    <Badge variant="outline" className={isOverdue ? "border-red-500 text-red-600" : ""}>
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {format(new Date(deadline.dueDate), "MMM d, yyyy")}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No deadlines for this matter</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Matter Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Matter</DialogTitle>
              <DialogDescription>Update matter details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="editTitle">Title</Label>
                <Input
                  id="editTitle"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: any) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMatter.isPending}>
                {updateMatter.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
