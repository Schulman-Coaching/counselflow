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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Mail,
  MailPlus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Star,
  StarOff,
  Archive,
  Trash2,
  User,
  Briefcase,
  ArrowLeft,
  Send,
  Paperclip,
  Inbox,
  SendHorizontal,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

export default function Emails() {
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "inbox" | "sent" | "starred">("inbox");

  const [composeData, setComposeData] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
    clientId: "",
    matterId: "",
  });

  const { data: emailIntegration } = trpc.email.getIntegration.useQuery();
  const { data: emails, isLoading, refetch } = trpc.email.list.useQuery(
    { limit: 100 },
    { enabled: emailIntegration?.isConnected }
  );
  const { data: searchResults } = trpc.email.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 && emailIntegration?.isConnected }
  );
  const { data: unreadCount } = trpc.email.getUnreadCount.useQuery(
    undefined,
    { enabled: emailIntegration?.isConnected }
  );
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: matters } = trpc.matters.list.useQuery();

  const utils = trpc.useUtils();

  const syncEmails = trpc.email.sync.useMutation({
    onSuccess: (result) => {
      toast.success(`Synced ${result.synced} emails`);
      refetch();
      utils.email.getUnreadCount.invalidate();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const updateEmail = trpc.email.update.useMutation({
    onSuccess: () => {
      refetch();
      utils.email.getUnreadCount.invalidate();
    },
  });

  const sendEmail = trpc.email.send.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully");
      setIsComposeOpen(false);
      setComposeData({ to: "", cc: "", subject: "", body: "", clientId: "", matterId: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error.message}`);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const toAddresses = composeData.to.split(",").map((s) => s.trim()).filter(Boolean);
    const ccAddresses = composeData.cc ? composeData.cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    sendEmail.mutate({
      to: toAddresses,
      cc: ccAddresses,
      subject: composeData.subject,
      bodyHtml: `<div style="font-family: sans-serif;">${composeData.body.replace(/\n/g, "<br>")}</div>`,
      clientId: composeData.clientId ? parseInt(composeData.clientId) : undefined,
      matterId: composeData.matterId ? parseInt(composeData.matterId) : undefined,
    });
  };

  const handleMarkRead = (emailId: number, isRead: boolean) => {
    updateEmail.mutate({ id: emailId, isRead });
    if (selectedEmail?.id === emailId) {
      setSelectedEmail({ ...selectedEmail, isRead });
    }
  };

  const handleStar = (emailId: number, isStarred: boolean) => {
    updateEmail.mutate({ id: emailId, isStarred });
    if (selectedEmail?.id === emailId) {
      setSelectedEmail({ ...selectedEmail, isStarred });
    }
  };

  const handleArchive = (emailId: number) => {
    updateEmail.mutate({ id: emailId, isArchived: true });
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
    toast.success("Email archived");
  };

  const handleLinkToMatter = (emailId: number, matterId: number) => {
    updateEmail.mutate({ id: emailId, matterId });
    toast.success("Email linked to matter");
  };

  const selectEmail = (email: any) => {
    setSelectedEmail(email);
    if (!email.isRead) {
      handleMarkRead(email.id, true);
    }
  };

  const getClientName = (clientId: number | null) => {
    if (!clientId || !clients) return null;
    return clients.find((c) => c.id === clientId)?.name;
  };

  const getMatterTitle = (matterId: number | null) => {
    if (!matterId || !matters) return null;
    return matters.find((m) => m.id === matterId)?.title;
  };

  // Filter emails
  const displayEmails = searchQuery.length > 2 ? searchResults : emails;
  const filteredEmails = displayEmails?.filter((email) => {
    if (filter === "inbox") return email.direction === "inbound" && !email.isArchived;
    if (filter === "sent") return email.direction === "outbound";
    if (filter === "starred") return email.isStarred;
    return !email.isArchived;
  });

  if (!emailIntegration?.isConnected) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Emails</h1>
            <p className="text-muted-foreground mt-2">
              Manage client communications
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Email not connected</p>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Connect your Gmail or Outlook account to view and send emails
              </p>
              <Button onClick={() => window.location.href = "/settings"}>
                Go to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Emails</h1>
            <p className="text-muted-foreground mt-2">
              {emailIntegration.email} • {unreadCount || 0} unread
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncEmails.mutate()}
              disabled={syncEmails.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncEmails.isPending ? "animate-spin" : ""}`} />
              Sync
            </Button>
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <MailPlus className="mr-2 h-4 w-4" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px]">
                <form onSubmit={handleSend}>
                  <DialogHeader>
                    <DialogTitle>New Email</DialogTitle>
                    <DialogDescription>
                      Send an email from {emailIntegration.email}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="to">To *</Label>
                      <Input
                        id="to"
                        value={composeData.to}
                        onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                        placeholder="email@example.com (comma-separated for multiple)"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cc">CC</Label>
                      <Input
                        id="cc"
                        value={composeData.cc}
                        onChange={(e) => setComposeData({ ...composeData, cc: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Link to Client</Label>
                        <Select
                          value={composeData.clientId}
                          onValueChange={(value) => setComposeData({ ...composeData, clientId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No client</SelectItem>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Link to Matter</Label>
                        <Select
                          value={composeData.matterId}
                          onValueChange={(value) => setComposeData({ ...composeData, matterId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select matter (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No matter</SelectItem>
                            {matters?.map((matter) => (
                              <SelectItem key={matter.id} value={matter.id.toString()}>
                                {matter.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        value={composeData.subject}
                        onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                        placeholder="Email subject"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="body">Message *</Label>
                      <Textarea
                        id="body"
                        value={composeData.body}
                        onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                        placeholder="Write your message..."
                        rows={10}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={sendEmail.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      {sendEmail.isPending ? "Sending..." : "Send Email"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
          {/* Email List */}
          <div className="lg:col-span-1 space-y-4 overflow-hidden flex flex-col">
            {/* Search and Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  variant={filter === "inbox" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("inbox")}
                >
                  <Inbox className="mr-1 h-3 w-3" />
                  Inbox
                </Button>
                <Button
                  variant={filter === "sent" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("sent")}
                >
                  <SendHorizontal className="mr-1 h-3 w-3" />
                  Sent
                </Button>
                <Button
                  variant={filter === "starred" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("starred")}
                >
                  <Star className="mr-1 h-3 w-3" />
                  Starred
                </Button>
              </div>
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredEmails && filteredEmails.length > 0 ? (
                filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedEmail?.id === email.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted"
                    } ${!email.isRead ? "bg-blue-50" : ""}`}
                    onClick={() => selectEmail(email)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {email.isStarred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          <p className={`text-sm truncate ${!email.isRead ? "font-semibold" : ""}`}>
                            {email.direction === "inbound" ? email.fromName || email.fromAddress : "To: " + JSON.parse(email.toAddresses || "[]")[0]?.address}
                          </p>
                        </div>
                        <p className={`text-sm truncate ${!email.isRead ? "font-medium" : "text-muted-foreground"}`}>
                          {email.subject || "(No Subject)"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {email.bodyText?.slice(0, 60)}...
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(email.receivedAt || email.sentAt || email.createdAt), { addSuffix: true })}
                        </span>
                        {email.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>
                    {(email.clientId || email.matterId) && (
                      <div className="flex gap-1 mt-2">
                        {email.clientId && (
                          <Badge variant="outline" className="text-xs">
                            <User className="h-2 w-2 mr-1" />
                            {getClientName(email.clientId)}
                          </Badge>
                        )}
                        {email.matterId && (
                          <Badge variant="outline" className="text-xs">
                            <Briefcase className="h-2 w-2 mr-1" />
                            {getMatterTitle(email.matterId)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No emails found
                </div>
              )}
            </div>
          </div>

          {/* Email Detail */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <Card className="h-full overflow-hidden flex flex-col">
                <CardHeader className="border-b shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{selectedEmail.subject || "(No Subject)"}</CardTitle>
                      <CardDescription className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {selectedEmail.direction === "inbound" ? "From:" : "To:"}
                          </span>
                          {selectedEmail.direction === "inbound" ? (
                            <span>{selectedEmail.fromName || selectedEmail.fromAddress}</span>
                          ) : (
                            <span>{JSON.parse(selectedEmail.toAddresses || "[]").map((a: any) => a.address).join(", ")}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(selectedEmail.receivedAt || selectedEmail.sentAt || selectedEmail.createdAt), "PPpp")}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStar(selectedEmail.id, !selectedEmail.isStarred)}
                      >
                        {selectedEmail.isStarred ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleArchive(selectedEmail.id)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {matters?.slice(0, 5).map((matter) => (
                            <DropdownMenuItem
                              key={matter.id}
                              onClick={() => handleLinkToMatter(selectedEmail.id, matter.id)}
                            >
                              <Briefcase className="mr-2 h-4 w-4" />
                              Link to: {matter.title}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {(selectedEmail.clientId || selectedEmail.matterId) && (
                    <div className="flex gap-2 mt-3">
                      {selectedEmail.clientId && (
                        <Badge className="gap-1">
                          <User className="h-3 w-3" />
                          {getClientName(selectedEmail.clientId)}
                        </Badge>
                      )}
                      {selectedEmail.matterId && (
                        <Badge className="gap-1">
                          <Briefcase className="h-3 w-3" />
                          {getMatterTitle(selectedEmail.matterId)}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {selectedEmail.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {selectedEmail.bodyText}
                    </pre>
                  )}
                  {selectedEmail.hasAttachments && selectedEmail.attachments && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-sm font-medium mb-2">Attachments</p>
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(selectedEmail.attachments).map((att: any, i: number) => (
                            <Badge key={i} variant="outline" className="gap-1">
                              <Paperclip className="h-3 w-3" />
                              {att.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select an email to view</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
