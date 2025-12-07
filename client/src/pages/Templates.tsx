import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const CATEGORIES = [
  "Estate Planning",
  "Business Law",
  "Litigation",
  "Real Estate",
  "Family Law",
  "Employment",
  "Intellectual Property",
  "Other",
];

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  state: string;
  templateContent: string;
  questionnaireSchema: string;
}

const emptyFormData: TemplateFormData = {
  name: "",
  description: "",
  category: "",
  state: "",
  templateContent: "",
  questionnaireSchema: "",
};

export default function Templates() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<TemplateFormData>(emptyFormData);

  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully!");
      utils.templates.list.invalidate();
      setIsCreateDialogOpen(false);
      setFormData(emptyFormData);
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully!");
      utils.templates.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      setFormData(emptyFormData);
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully!");
      utils.templates.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.category || !formData.templateContent) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      state: formData.state || undefined,
      templateContent: formData.templateContent,
      questionnaireSchema: formData.questionnaireSchema || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingTemplate) return;
    updateMutation.mutate({
      id: editingTemplate.id,
      name: formData.name || undefined,
      description: formData.description || undefined,
      category: formData.category || undefined,
      state: formData.state || undefined,
      templateContent: formData.templateContent || undefined,
      questionnaireSchema: formData.questionnaireSchema || undefined,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      category: template.category,
      state: template.state || "",
      templateContent: template.templateContent,
      questionnaireSchema: template.questionnaireSchema || "",
    });
    setIsEditDialogOpen(true);
  };

  const openPreview = (template: any) => {
    setPreviewTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const duplicateTemplate = (template: any) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      category: template.category,
      state: template.state || "",
      templateContent: template.templateContent,
      questionnaireSchema: template.questionnaireSchema || "",
    });
    setIsCreateDialogOpen(true);
  };

  const useTemplate = (template: any) => {
    setLocation("/documents/generate");
  };

  // Filter templates
  const filteredTemplates = templates?.filter((template: any) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group templates by category
  const templatesByCategory = filteredTemplates?.reduce((acc: any, template: any) => {
    const cat = template.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {});

  const TemplateForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Simple Will"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the template"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State (if applicable)</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="e.g., NY, CA"
            maxLength={2}
          />
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Template Content *</TabsTrigger>
          <TabsTrigger value="variables">Variable Schema</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use {"{{variable_name}}"} syntax for placeholders
          </p>
          <Textarea
            value={formData.templateContent}
            onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
            placeholder="Enter your template content with {{variables}}..."
            rows={12}
            className="font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="variables" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            JSON schema defining the variables (optional). Example:
          </p>
          <pre className="text-xs bg-muted p-2 rounded mb-2">
{`{
  "client_name": { "type": "text", "label": "Client Name", "required": true },
  "date": { "type": "date", "label": "Date", "required": true }
}`}
          </pre>
          <Textarea
            value={formData.questionnaireSchema}
            onChange={(e) => setFormData({ ...formData, questionnaireSchema: e.target.value })}
            placeholder='{"variable_name": {"type": "text", "label": "Label", "required": true}}'
            rows={8}
            className="font-mono text-sm"
          />
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Document Templates</h1>
            <p className="text-muted-foreground mt-1">
              Manage and create reusable legal document templates
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData(emptyFormData)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a reusable document template with variable placeholders
                </DialogDescription>
              </DialogHeader>
              <TemplateForm onSubmit={handleCreate} submitLabel="Create Template" />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Templates List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading templates...</div>
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(templatesByCategory || {}).map(([category, categoryTemplates]: [string, any]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {category}
                  <Badge variant="secondary" className="ml-2">
                    {categoryTemplates.length}
                  </Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryTemplates.map((template: any) => (
                    <Card key={template.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">
                              {template.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 mt-1">
                              {template.description || "No description"}
                            </CardDescription>
                          </div>
                          {template.isPublic && (
                            <Badge variant="outline" className="ml-2 shrink-0">
                              System
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-end">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                          {template.state && (
                            <Badge variant="secondary">{template.state}</Badge>
                          )}
                          <span className="text-xs">
                            Updated {new Date(template.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => useTemplate(template)}
                          >
                            Use Template
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPreview(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateTemplate(template)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {!template.isPublic && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(template)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(template.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No templates found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first document template to get started"}
              </p>
              {!searchQuery && categoryFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Modify the template content and settings
              </DialogDescription>
            </DialogHeader>
            <TemplateForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewTemplate?.name}</DialogTitle>
              <DialogDescription>
                {previewTemplate?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>{previewTemplate?.category}</Badge>
                {previewTemplate?.state && (
                  <Badge variant="secondary">{previewTemplate?.state}</Badge>
                )}
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {previewTemplate?.templateContent}
                </pre>
              </div>
              {previewTemplate?.questionnaireSchema && (
                <div>
                  <h4 className="font-medium mb-2">Variable Schema</h4>
                  <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(previewTemplate.questionnaireSchema), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
