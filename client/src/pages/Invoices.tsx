import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Filter, 
  DollarSign, 
  Send, 
  CheckCircle, 
  Clock, 
  XCircle,
  Eye,
  Plus,
  Download
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "all";

export default function Invoices() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery({
    status: statusFilter,
    clientId: clientFilter !== "all" ? parseInt(clientFilter) : undefined,
  });

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: selectedInvoice } = trpc.invoices.get.useQuery(
    { id: selectedInvoiceId! },
    { enabled: !!selectedInvoiceId }
  );

  const utils = trpc.useUtils();

  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Invoice status updated!");
      utils.invoices.list.invalidate();
      utils.invoices.get.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const exportPDF = trpc.invoices.exportPDF.useMutation({
    onSuccess: (data) => {
      toast.success("PDF generated successfully!");
      // Open PDF in new tab
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(`Failed to generate PDF: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      draft: { variant: "secondary", icon: FileText },
      sent: { variant: "default", icon: Send },
      paid: { variant: "default", icon: CheckCircle },
      overdue: { variant: "destructive", icon: Clock },
      cancelled: { variant: "outline", icon: XCircle },
    };

    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleMarkAsSent = (invoiceId: number) => {
    updateStatus.mutate({
      id: invoiceId,
      status: "sent",
    });
  };

  const handleMarkAsPaid = (invoiceId: number) => {
    updateStatus.mutate({
      id: invoiceId,
      status: "paid",
      paidDate: new Date(),
    });
  };

  const handleExportPDF = (invoiceId: number) => {
    exportPDF.mutate({ id: invoiceId });
  };

  const totalAmount = invoices?.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) || 0;
  const paidAmount = invoices?.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) || 0;
  const unpaidAmount = invoices?.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track client invoices and payments
            </p>
          </div>
          <Button onClick={() => window.location.href = "/time"}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Invoice
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices?.length || 0} total invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices?.filter(inv => inv.status === "paid").length || 0} paid invoices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(unpaidAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoices?.filter(inv => inv.status !== "paid" && inv.status !== "cancelled").length || 0} unpaid invoices
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvoiceStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Client</label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice List</CardTitle>
            <CardDescription>
              {invoices?.length || 0} invoice(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">Loading invoices...</div>
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const client = clients?.find(c => c.id === invoice.clientId);
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{client?.name || "Unknown"}</TableCell>
                          <TableCell>{format(new Date(invoice.createdAt), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM dd, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(invoice.totalAmount || 0)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportPDF(invoice.id)}
                                disabled={exportPDF.isPending}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedInvoiceId(invoice.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Invoice Details</DialogTitle>
                                    <DialogDescription>
                                      {selectedInvoice?.invoiceNumber}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedInvoice && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm font-medium">Client</p>
                                          <p className="text-sm text-muted-foreground">
                                            {clients?.find(c => c.id === selectedInvoice.clientId)?.name}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Status</p>
                                          <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Invoice Date</p>
                                          <p className="text-sm text-muted-foreground">
                                            {format(new Date(selectedInvoice.createdAt), "MMMM dd, yyyy")}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Due Date</p>
                                          <p className="text-sm text-muted-foreground">
                                            {selectedInvoice.dueDate 
                                              ? format(new Date(selectedInvoice.dueDate), "MMMM dd, yyyy")
                                              : "Not set"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Total Amount</p>
                                          <p className="text-lg font-bold">
                                            {formatCurrency(selectedInvoice.totalAmount || 0)}
                                          </p>
                                        </div>
                                        {selectedInvoice.paidDate && (
                                          <div>
                                            <p className="text-sm font-medium">Paid Date</p>
                                            <p className="text-sm text-muted-foreground">
                                              {format(new Date(selectedInvoice.paidDate), "MMMM dd, yyyy")}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      {selectedInvoice.notes && (
                                        <div>
                                          <p className="text-sm font-medium">Notes</p>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {selectedInvoice.notes}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                          variant="outline"
                                          onClick={() => handleExportPDF(selectedInvoice.id)}
                                          disabled={exportPDF.isPending}
                                          className="flex-1"
                                        >
                                          <Download className="mr-2 h-4 w-4" />
                                          {exportPDF.isPending ? "Generating..." : "Export PDF"}
                                        </Button>
                                        {selectedInvoice.status === "draft" && (
                                          <Button
                                            onClick={() => handleMarkAsSent(selectedInvoice.id)}
                                            className="flex-1"
                                          >
                                            <Send className="mr-2 h-4 w-4" />
                                            Mark as Sent
                                          </Button>
                                        )}
                                        {(selectedInvoice.status === "sent" || selectedInvoice.status === "overdue") && (
                                          <Button
                                            onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                                            className="flex-1"
                                          >
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Mark as Paid
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {invoice.status === "draft" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkAsSent(invoice.id)}
                                >
                                  <Send className="mr-2 h-4 w-4" />
                                  Send
                                </Button>
                              )}
                              {(invoice.status === "sent" || invoice.status === "overdue") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkAsPaid(invoice.id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Paid
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No invoices found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate invoices from your time entries
                </p>
                <Button onClick={() => window.location.href = "/time"}>
                  <Plus className="mr-2 h-4 w-4" />
                  Go to Time Tracking
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
