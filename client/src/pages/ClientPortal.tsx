import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import UploadDocumentDialog from "@/components/UploadDocumentDialog";
import DocumentPreviewDialog from "@/components/DocumentPreviewDialog";
import { 
  Briefcase, 
  FileText, 
  DollarSign, 
  LogOut, 
  Scale,
  Download,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ClientPortal() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("clientPortalToken");
    if (!storedToken) {
      setLocation("/client-portal/login");
      return;
    }
    setToken(storedToken);
  }, [setLocation]);

  const { data: clientInfo, isLoading: clientLoading, error: clientError } = trpc.clientPortal.verify.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false }
  );

  const { data: matters, isLoading: mattersLoading } = trpc.clientPortal.matters.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const { data: documents, isLoading: documentsLoading } = trpc.clientPortal.documents.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const { data: invoices, isLoading: invoicesLoading } = trpc.clientPortal.invoices.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  useEffect(() => {
    if (clientError) {
      toast.error("Invalid or expired access token");
      localStorage.removeItem("clientPortalToken");
      setLocation("/client-portal/login");
    }
  }, [clientError, setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("clientPortalToken");
    setLocation("/client-portal/login");
    toast.success("Logged out successfully");
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      pending: "secondary",
      closed: "outline",
      draft: "secondary",
      sent: "default",
      paid: "default",
      overdue: "destructive",
    };
    
    const colors: Record<string, string> = {
      open: "bg-blue-500",
      pending: "bg-yellow-500",
      closed: "bg-gray-500",
      paid: "bg-green-500",
      sent: "bg-blue-500",
      overdue: "bg-red-500",
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "overdue":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!clientInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Scale className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Client Portal</h1>
                <p className="text-sm text-muted-foreground">CounselFlow</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome, {clientInfo.name}</CardTitle>
            <CardDescription>
              View your case information, documents, and invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Briefcase className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{matters?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Matters</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{documents?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Documents</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{invoices?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="matters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matters">
              <Briefcase className="h-4 w-4 mr-2" />
              Matters
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <DollarSign className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
          </TabsList>

          {/* Matters Tab */}
          <TabsContent value="matters">
            <Card>
              <CardHeader>
                <CardTitle>Your Matters</CardTitle>
                <CardDescription>View the status of your legal matters</CardDescription>
              </CardHeader>
              <CardContent>
                {mattersLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading matters...</p>
                ) : matters && matters.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matter</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Billing</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matters.map((matter) => (
                        <TableRow key={matter.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{matter.title}</p>
                              {matter.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {matter.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{matter.caseType}</TableCell>
                          <TableCell>{getStatusBadge(matter.status)}</TableCell>
                          <TableCell className="capitalize">{matter.billingType.replace("_", " ")}</TableCell>
                          <TableCell>{formatDate(matter.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No matters found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Documents</CardTitle>
                    <CardDescription>Access and download your case documents</CardDescription>
                  </div>
                  <UploadDocumentDialog token={token || ""} matters={matters || []} />
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading documents...</p>
                ) : documents && documents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <p className="font-medium">{doc.title}</p>
                          </TableCell>
                          <TableCell>Document</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>{formatDate(doc.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {doc.fileUrl && (
                                  <DocumentPreviewDialog
                                    documentTitle={doc.title}
                                    documentUrl={doc.fileUrl}
                                    documentId={doc.id}
                                    clientToken={token || undefined}
                                  />
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl || '#', '_blank')}
                                disabled={!doc.fileUrl}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
                <CardDescription>View and track your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoicesLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading invoices...</p>
                ) : invoices && invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Paid Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber || `INV-${invoice.id}`}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(invoice.status)}
                              {getStatusBadge(invoice.status)}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell>{formatDate(invoice.paidDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
