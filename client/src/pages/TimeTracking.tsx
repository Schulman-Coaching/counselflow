import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { trpc } from "@/lib/trpc";
import { Clock, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TimeTracking() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    matterId: "",
    description: "",
    durationMinutes: "",
    entryDate: new Date().toISOString().split("T")[0],
  });

  const { data: timeEntries, isLoading } = trpc.timeEntries.list.useQuery();
  const { data: matters } = trpc.matters.list.useQuery();
  const utils = trpc.useUtils();
  
  const createTimeEntry = trpc.timeEntries.create.useMutation({
    onSuccess: (data) => {
      toast.success("Time entry logged with AI-enhanced narrative");
      utils.timeEntries.list.invalidate();
      setIsDialogOpen(false);
      setFormData({
        matterId: "",
        description: "",
        durationMinutes: "",
        entryDate: new Date().toISOString().split("T")[0],
      });
    },
    onError: (error) => {
      toast.error(`Failed to log time: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matter = matters?.find(m => m.id === parseInt(formData.matterId));
    createTimeEntry.mutate({
      matterId: parseInt(formData.matterId),
      description: formData.description,
      durationMinutes: parseInt(formData.durationMinutes),
      hourlyRate: matter?.hourlyRate || undefined,
      isBillable: true,
      entryDate: new Date(formData.entryDate),
    });
  };

  const openMatters = matters?.filter(m => m.status === "open") || [];
  
  const totalHours = timeEntries?.reduce((sum, entry) => sum + entry.durationMinutes, 0) || 0;
  const totalBillable = timeEntries?.filter(e => e.isBillable).reduce((sum, entry) => {
    return sum + ((entry.durationMinutes / 60) * (entry.hourlyRate || 0));
  }, 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Time Tracking</h1>
            <p className="text-muted-foreground mt-2">
              Log your time with AI-powered billing narratives
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Log Time Entry</DialogTitle>
                  <DialogDescription>
                    Record your billable time. AI will enhance your description for invoicing.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="matter">Matter *</Label>
                    <Select
                      value={formData.matterId}
                      onValueChange={(value) => setFormData({ ...formData, matterId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a matter" />
                      </SelectTrigger>
                      <SelectContent>
                        {openMatters.map((matter) => (
                          <SelectItem key={matter.id} value={matter.id.toString()}>
                            {matter.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Drafted response to motion"
                      required
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI will generate a professional billing narrative
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                      placeholder="60"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTimeEntry.isPending}>
                    {createTimeEntry.isPending ? "Logging..." : "Log Time"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(totalHours / 60).toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">All time entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Billable Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalBillable / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total billable amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeEntries?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Time entries logged</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading time entries...</div>
          </div>
        ) : timeEntries && timeEntries.length > 0 ? (
          <div className="grid gap-4">
            {timeEntries.map((entry) => {
              const matter = matters?.find(m => m.id === entry.matterId);
              const amount = entry.hourlyRate ? (entry.durationMinutes / 60) * entry.hourlyRate : 0;
              return (
                <Card key={entry.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{matter?.title || "Unknown Matter"}</CardTitle>
                        <CardDescription>
                          {new Date(entry.entryDate).toLocaleDateString()} • {(entry.durationMinutes / 60).toFixed(2)} hours
                        </CardDescription>
                      </div>
                      {entry.isBillable && (
                        <div className="text-right">
                          <div className="font-semibold">${(amount / 100).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.isInvoiced ? "Invoiced" : "Unbilled"}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium mb-1">Original Description:</p>
                      <p className="text-sm text-muted-foreground">{entry.description}</p>
                    </div>
                    {entry.aiNarrative && (
                      <div>
                        <p className="text-sm font-medium mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          AI-Enhanced Narrative:
                        </p>
                        <p className="text-sm bg-primary/5 p-3 rounded-lg">{entry.aiNarrative}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No time entries yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your billable hours
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
