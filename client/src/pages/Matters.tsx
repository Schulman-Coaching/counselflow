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
import { Briefcase, Plus, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Matters() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    caseType: "",
    billingType: "hourly" as "hourly" | "flat_fee" | "contingency",
    hourlyRate: "",
    flatFeeAmount: "",
  });

  const { data: matters, isLoading } = trpc.matters.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMatter = trpc.matters.create.useMutation({
    onSuccess: () => {
      toast.success("Matter created successfully");
      utils.matters.list.invalidate();
      utils.dashboard.stats.invalidate();
      setIsDialogOpen(false);
      setFormData({
        clientId: "",
        title: "",
        description: "",
        caseType: "",
        billingType: "hourly",
        hourlyRate: "",
        flatFeeAmount: "",
      });
    },
    onError: (error) => {
      toast.error(`Failed to create matter: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMatter.mutate({
      clientId: parseInt(formData.clientId),
      title: formData.title,
      description: formData.description,
      caseType: formData.caseType,
      billingType: formData.billingType,
      hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) * 100 : undefined,
      flatFeeAmount: formData.flatFeeAmount ? parseInt(formData.flatFeeAmount) * 100 : undefined,
    });
  };

  const activeClients = clients?.filter(c => c.status === "active" || c.status === "lead") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Matters</h1>
            <p className="text-muted-foreground mt-2">Manage your legal matters and cases</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Matter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Matter</DialogTitle>
                  <DialogDescription>
                    Start a new legal matter for a client
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeClients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Matter Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Estate Planning for Smith Family"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="caseType">Case Type *</Label>
                    <Input
                      id="caseType"
                      value={formData.caseType}
                      onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                      placeholder="e.g., Estate Planning, Personal Injury, Business Law"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the matter"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="billingType">Billing Type *</Label>
                    <Select
                      value={formData.billingType}
                      onValueChange={(value: any) => setFormData({ ...formData, billingType: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="flat_fee">Flat Fee</SelectItem>
                        <SelectItem value="contingency">Contingency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.billingType === "hourly" && (
                    <div className="grid gap-2">
                      <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        placeholder="250"
                      />
                    </div>
                  )}
                  {formData.billingType === "flat_fee" && (
                    <div className="grid gap-2">
                      <Label htmlFor="flatFeeAmount">Flat Fee Amount ($)</Label>
                      <Input
                        id="flatFeeAmount"
                        type="number"
                        value={formData.flatFeeAmount}
                        onChange={(e) => setFormData({ ...formData, flatFeeAmount: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMatter.isPending}>
                    {createMatter.isPending ? "Creating..." : "Create Matter"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading matters...</div>
          </div>
        ) : matters && matters.length > 0 ? (
          <div className="grid gap-4">
            {matters.map((matter) => {
              const client = clients?.find(c => c.id === matter.clientId);
              return (
                <Card
                  key={matter.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/matters/${matter.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {matter.title}
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </CardTitle>
                          <CardDescription>
                            {client?.name} • {matter.caseType}
                          </CardDescription>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          matter.status === "open"
                            ? "bg-green-100 text-green-700"
                            : matter.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : matter.status === "closed"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {matter.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {matter.description && (
                        <p className="text-sm text-muted-foreground">{matter.description}</p>
                      )}
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Billing: </span>
                          <span className="font-medium capitalize">
                            {matter.billingType.replace("_", " ")}
                          </span>
                        </div>
                        {matter.hourlyRate && (
                          <div>
                            <span className="text-muted-foreground">Rate: </span>
                            <span className="font-medium">${(matter.hourlyRate / 100).toFixed(2)}/hr</span>
                          </div>
                        )}
                        {matter.flatFeeAmount && (
                          <div>
                            <span className="text-muted-foreground">Fee: </span>
                            <span className="font-medium">${(matter.flatFeeAmount / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(matter.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No matters yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first matter to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Matter
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
