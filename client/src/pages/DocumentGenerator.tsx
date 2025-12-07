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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Sparkles, Download, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function DocumentGenerator() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedDocument, setGeneratedDocument] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: templates, isLoading: templatesLoading } = trpc.templates.list.useQuery();
  const { data: matters } = trpc.matters.list.useQuery();
  const utils = trpc.useUtils();

  const generateDocument = trpc.documents.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedDocument(data.content);
      toast.success("Document generated successfully!");
      utils.documents.list.invalidate();
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate document: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);
  const templateVariables = selectedTemplate?.questionnaireSchema ? JSON.parse(selectedTemplate.questionnaireSchema) : {};

  const handleTemplateSelect = (templateId: string) => {
    const id = parseInt(templateId);
    setSelectedTemplateId(id);
    setGeneratedDocument("");
    setVariables({});
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    const matterId = selectedMatterId ? parseInt(selectedMatterId) : undefined;

    setIsGenerating(true);
    generateDocument.mutate({
      templateId: selectedTemplateId,
      matterId,
      title: selectedTemplate?.name || "Generated Document",
      answers: variables,
    });
  };

  const handleSaveDocument = () => {
    toast.success("Document saved! You can find it in the Documents section.");
  };

  const handleDownloadPDF = () => {
    toast.info("PDF export coming soon!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Document Generator</h1>
          <p className="text-muted-foreground mt-2">
            Create professional legal documents using AI-powered templates
          </p>
        </div>

        {templatesLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading templates...</div>
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Template Selection */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Template</CardTitle>
                  <CardDescription>Choose a document template to get started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {templates.map((template: any) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? "ring-2 ring-primary"
                          : "hover:shadow-md"
                      }`}
                      onClick={() => handleTemplateSelect(template.id.toString())}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {template.description}
                            </CardDescription>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Variable Input & Preview */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <Tabs defaultValue="variables" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="variables">Fill Variables</TabsTrigger>
                    <TabsTrigger value="preview" disabled={!generatedDocument}>
                      Preview Document
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="variables" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <CardDescription>{selectedTemplate.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4">
                          <div>
                            <Label htmlFor="matter">Associate with Matter (Optional)</Label>
                            <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a matter" />
                              </SelectTrigger>
                              <SelectContent>
                                {matters?.map((matter) => (
                                  <SelectItem key={matter.id} value={matter.id.toString()}>
                                    {matter.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              Document Variables
                            </h3>
                            <div className="grid gap-4">
                              {Object.entries(templateVariables).map(([key, config]: [string, any]) => (
                                <div key={key} className="grid gap-2">
                                  <Label htmlFor={key}>
                                    {config.label}
                                    {config.required && <span className="text-destructive ml-1">*</span>}
                                  </Label>
                                  {config.type === "textarea" ? (
                                    <Textarea
                                      id={key}
                                      value={variables[key] || ""}
                                      onChange={(e) => handleVariableChange(key, e.target.value)}
                                      placeholder={`Enter ${config.label.toLowerCase()}`}
                                      rows={3}
                                    />
                                  ) : config.type === "select" ? (
                                    <Select
                                      value={variables[key] || ""}
                                      onValueChange={(value) => handleVariableChange(key, value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {config.options?.map((option: string) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : config.type === "date" ? (
                                    <Input
                                      id={key}
                                      type="date"
                                      value={variables[key] || ""}
                                      onChange={(e) => handleVariableChange(key, e.target.value)}
                                    />
                                  ) : config.type === "number" ? (
                                    <Input
                                      id={key}
                                      type="number"
                                      value={variables[key] || ""}
                                      onChange={(e) => handleVariableChange(key, e.target.value)}
                                      placeholder={`Enter ${config.label.toLowerCase()}`}
                                    />
                                  ) : (
                                    <Input
                                      id={key}
                                      type="text"
                                      value={variables[key] || ""}
                                      onChange={(e) => handleVariableChange(key, e.target.value)}
                                      placeholder={`Enter ${config.label.toLowerCase()}`}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                          <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex-1"
                          >
                            {isGenerating ? (
                              <>Generating...</>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Document
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>Document Preview</CardTitle>
                            <CardDescription>Review your generated document</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                              <Download className="mr-2 h-4 w-4" />
                              Export PDF
                            </Button>
                            <Button size="sm" onClick={handleSaveDocument}>
                              Save Document
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none bg-muted/30 p-6 rounded-lg min-h-[500px] whitespace-pre-wrap font-mono text-sm">
                          {generatedDocument || "Generate a document to see the preview"}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-96">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Select a Template</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a template from the left to start generating documents
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No templates available</p>
              <p className="text-sm text-muted-foreground">
                Document templates will appear here once added
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
