import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Settings as SettingsIcon,
  Unlink,
  AlertTriangle,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Settings() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);

  // Calendar integration
  const { data: integration, isLoading, refetch } = trpc.calendar.getIntegration.useQuery();
  const { data: calendars, refetch: refetchCalendars } = trpc.calendar.listCalendars.useQuery(
    undefined,
    { enabled: integration?.isConnected ?? false }
  );
  const { data: syncedEvents } = trpc.calendar.getSyncedEvents.useQuery(
    undefined,
    { enabled: integration?.isConnected ?? false }
  );

  // Email integration
  const { data: emailIntegration, isLoading: emailLoading, refetch: refetchEmail } = trpc.email.getIntegration.useQuery();

  const utils = trpc.useUtils();

  const getAuthUrl = trpc.calendar.getAuthUrl.useQuery();
  const handleCallback = trpc.calendar.handleCallback.useMutation({
    onSuccess: () => {
      toast.success("Successfully connected to Google Calendar!");
      refetch();
      refetchCalendars();
      setIsConnecting(false);
      setLocation("/settings");
    },
    onError: (error) => {
      toast.error(`Failed to connect: ${error.message}`);
      setIsConnecting(false);
    },
  });

  const updateSettings = trpc.calendar.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const disconnect = trpc.calendar.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Calendar disconnected");
      utils.calendar.getIntegration.invalidate();
      utils.calendar.getSyncedEvents.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });

  // Email mutations
  const getGmailAuthUrl = trpc.email.getGmailAuthUrl.useQuery();
  const getOutlookAuthUrl = trpc.email.getOutlookAuthUrl.useQuery();

  const handleGmailCallback = trpc.email.handleGmailCallback.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected to Gmail: ${data.email}`);
      refetchEmail();
      setIsConnectingEmail(false);
      setLocation("/settings");
    },
    onError: (error) => {
      toast.error(`Failed to connect Gmail: ${error.message}`);
      setIsConnectingEmail(false);
    },
  });

  const handleOutlookCallback = trpc.email.handleOutlookCallback.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected to Outlook: ${data.email}`);
      refetchEmail();
      setIsConnectingEmail(false);
      setLocation("/settings");
    },
    onError: (error) => {
      toast.error(`Failed to connect Outlook: ${error.message}`);
      setIsConnectingEmail(false);
    },
  });

  const updateEmailSettings = trpc.email.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Email settings updated");
      refetchEmail();
    },
  });

  const disconnectEmail = trpc.email.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Email disconnected");
      utils.email.getIntegration.invalidate();
    },
  });

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && !isConnecting && !isConnectingEmail) {
      // Determine which OAuth flow this is based on state parameter
      if (state === "gmail") {
        setIsConnectingEmail(true);
        handleGmailCallback.mutate({ code });
      } else if (state === "outlook") {
        setIsConnectingEmail(true);
        handleOutlookCallback.mutate({ code });
      } else {
        // Default to calendar OAuth
        setIsConnecting(true);
        handleCallback.mutate({ code });
      }
    }
  }, [search]);

  const handleConnect = () => {
    if (getAuthUrl.data?.url) {
      window.location.href = getAuthUrl.data.url;
    }
  };

  const handleCalendarSelect = (calendarId: string) => {
    updateSettings.mutate({ calendarId });
  };

  const handleSyncDeadlinesToggle = (checked: boolean) => {
    updateSettings.mutate({ syncDeadlines: checked });
  };

  const handleSyncTasksToggle = (checked: boolean) => {
    updateSettings.mutate({ syncTasks: checked });
  };

  const handleConnectGmail = () => {
    if (getGmailAuthUrl.data?.url) {
      window.location.href = getGmailAuthUrl.data.url;
    }
  };

  const handleConnectOutlook = () => {
    if (getOutlookAuthUrl.data?.url) {
      window.location.href = getOutlookAuthUrl.data.url;
    }
  };

  const handleAutoLinkToggle = (checked: boolean) => {
    updateEmailSettings.mutate({ autoLinkToClients: checked });
  };

  const handleSyncEnabledToggle = (checked: boolean) => {
    updateEmailSettings.mutate({ syncEnabled: checked });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your integrations and preferences
          </p>
        </div>

        {/* Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Google Calendar</CardTitle>
                  <CardDescription>
                    Sync deadlines and tasks to your calendar
                  </CardDescription>
                </div>
              </div>
              {integration?.isConnected ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            ) : integration?.isConnected ? (
              <>
                {/* Calendar Selection */}
                <div className="space-y-2">
                  <Label>Sync to Calendar</Label>
                  <Select
                    value={integration.calendarId || ""}
                    onValueChange={handleCalendarSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars?.map((cal) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.summary} {cal.primary && "(Primary)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose which calendar to sync events to
                  </p>
                </div>

                <Separator />

                {/* Sync Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Sync Options</h4>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Deadlines</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync matter deadlines to calendar
                      </p>
                    </div>
                    <Switch
                      checked={integration.syncDeadlines}
                      onCheckedChange={handleSyncDeadlinesToggle}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Tasks</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync tasks with due dates to calendar
                      </p>
                    </div>
                    <Switch
                      checked={integration.syncTasks}
                      onCheckedChange={handleSyncTasksToggle}
                    />
                  </div>
                </div>

                <Separator />

                {/* Sync Status */}
                <div className="space-y-2">
                  <h4 className="font-medium">Sync Status</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last synced</span>
                    <span>
                      {integration.lastSyncAt
                        ? format(new Date(integration.lastSyncAt), "MMM d, yyyy h:mm a")
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Synced events</span>
                    <span>{syncedEvents?.length || 0}</span>
                  </div>
                </div>

                <Separator />

                {/* Disconnect */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect Google Calendar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Calendar?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the calendar connection. Events that were already
                        synced will remain in your calendar, but no new events will be
                        created.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnect.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Connect your Google Calendar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sync your deadlines and tasks to stay organized
                    </p>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting || !getAuthUrl.data}
                    className="gap-2"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        Connect Google Calendar
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> Calendar integration requires Google OAuth
                      credentials to be configured. Contact your administrator if you're
                      unable to connect.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Email Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Email Integration</CardTitle>
                  <CardDescription>
                    Connect Gmail or Outlook to sync and send emails
                  </CardDescription>
                </div>
              </div>
              {emailIntegration?.isConnected ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {emailIntegration.provider === "gmail" ? "Gmail" : "Outlook"}
                </Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {emailLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            ) : emailIntegration?.isConnected ? (
              <>
                {/* Connected Email Info */}
                <div className="space-y-2">
                  <Label>Connected Account</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{emailIntegration.email}</span>
                  </div>
                </div>

                <Separator />

                {/* Email Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Email Options</h4>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-link to Clients</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically associate emails with clients based on email address
                      </p>
                    </div>
                    <Switch
                      checked={emailIntegration.autoLinkToClients}
                      onCheckedChange={handleAutoLinkToggle}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sync Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Continuously sync new emails in the background
                      </p>
                    </div>
                    <Switch
                      checked={emailIntegration.syncEnabled}
                      onCheckedChange={handleSyncEnabledToggle}
                    />
                  </div>
                </div>

                <Separator />

                {/* Sync Status */}
                <div className="space-y-2">
                  <h4 className="font-medium">Sync Status</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last synced</span>
                    <span>
                      {emailIntegration.lastSyncAt
                        ? format(new Date(emailIntegration.lastSyncAt), "MMM d, yyyy h:mm a")
                        : "Never"}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Disconnect */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect {emailIntegration.provider === "gmail" ? "Gmail" : "Outlook"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Email?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the email connection. Emails that were already
                        synced will remain, but no new emails will be imported.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnectEmail.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Connect your email</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sync emails and send messages directly from CounselFlow
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleConnectGmail}
                      disabled={isConnectingEmail || !getGmailAuthUrl.data}
                      className="gap-2"
                      variant="outline"
                    >
                      {isConnectingEmail ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          Connect Gmail
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleConnectOutlook}
                      disabled={isConnectingEmail || !getOutlookAuthUrl.data}
                      className="gap-2"
                      variant="outline"
                    >
                      {isConnectingEmail ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4" />
                          Connect Outlook
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-muted-foreground">
                      <strong>Note:</strong> Email integration requires OAuth
                      credentials to be configured. Contact your administrator if you're
                      unable to connect.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Future integrations placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <SettingsIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <CardTitle>More Integrations</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-dashed">
                <p className="font-medium text-muted-foreground">Document Storage</p>
                <p className="text-sm text-muted-foreground">Google Drive & Dropbox</p>
              </div>
              <div className="p-4 rounded-lg border border-dashed">
                <p className="font-medium text-muted-foreground">Accounting</p>
                <p className="text-sm text-muted-foreground">QuickBooks & Xero</p>
              </div>
              <div className="p-4 rounded-lg border border-dashed">
                <p className="font-medium text-muted-foreground">Automation</p>
                <p className="text-sm text-muted-foreground">Zapier & Make</p>
              </div>
              <div className="p-4 rounded-lg border border-dashed">
                <p className="font-medium text-muted-foreground">E-Signature</p>
                <p className="text-sm text-muted-foreground">DocuSign & HelloSign</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
