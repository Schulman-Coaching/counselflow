import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";

export default function Documents() {
  const { data: documents, isLoading } = trpc.documents.list.useQuery();
  const { data: matters } = trpc.matters.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-2">
              AI-powered document generation and management
            </p>
          </div>
          <Button onClick={() => window.location.href = "/documents/generate"}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Document
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid gap-4">
            {documents.map((doc) => {
              const matter = matters?.find(m => m.id === doc.matterId);
              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <CardDescription>
                            {matter?.title || "No matter assigned"} • Version {doc.version}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge
                          variant={
                            doc.status === "draft"
                              ? "secondary"
                              : doc.status === "final"
                              ? "default"
                              : "outline"
                          }
                        >
                          {doc.status}
                        </Badge>
                        {doc.fileUrl && (
                          <>
                            <DocumentPreviewDialog
                              documentTitle={doc.title}
                              documentUrl={doc.fileUrl}
                              documentId={doc.id}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(doc.fileUrl || '#', '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {doc.content.substring(0, 200)}...
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(doc.createdAt).toLocaleDateString()} • 
                        Updated {new Date(doc.updatedAt).toLocaleDateString()}
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
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No documents yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first document using AI
              </p>
              <Button onClick={() => window.location.href = "/documents/generate"}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Document
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
