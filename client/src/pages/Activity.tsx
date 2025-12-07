import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Upload, 
  MessageSquare, 
  UserPlus, 
  Briefcase, 
  DollarSign,
  Clock,
  Filter,
  Search,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

const activityIcons: Record<string, any> = {
  client: UserPlus,
  matter: Briefcase,
  document: FileText,
  client_upload: Upload,
  comment: MessageSquare,
  invoice: DollarSign,
  time_entry: Clock,
};

const activityColors: Record<string, string> = {
  created: "bg-green-500/10 text-green-700 border-green-200",
  updated: "bg-blue-500/10 text-blue-700 border-blue-200",
  deleted: "bg-red-500/10 text-red-700 border-red-200",
  client_upload: "bg-purple-500/10 text-purple-700 border-purple-200",
  comment: "bg-orange-500/10 text-orange-700 border-orange-200",
};

export default function Activity() {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: activities = [], isLoading } = trpc.activity.getAll.useQuery({ limit: 100 });

  const filteredActivities = activities.filter((activity) => {
    const matchesType = filterType === "all" || activity.entityType === filterType;
    const matchesSearch = searchQuery === "" || 
      activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.details?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getActivityIcon = (activity: any) => {
    const IconComponent = activityIcons[activity.entityType] || activityIcons[activity.action] || AlertCircle;
    return <IconComponent className="h-5 w-5" />;
  };

  const getActivityColor = (action: string) => {
    return activityColors[action] || "bg-gray-500/10 text-gray-700 border-gray-200";
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground">
            Track all activities across your practice in real-time
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  {filteredActivities.length} activities
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="client">Clients</SelectItem>
                    <SelectItem value="matter">Matters</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="invoice">Invoices</SelectItem>
                    <SelectItem value="time_entry">Time Entries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground">No activities found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterType !== "all" 
                    ? "Try adjusting your filters" 
                    : "Activities will appear here as you work"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity) => {
                  const details = parseDetails(activity.details);
                  return (
                    <div
                      key={activity.id}
                      className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
                        {getActivityIcon(activity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">
                              {activity.action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.entityType.charAt(0).toUpperCase() + activity.entityType.slice(1)}
                              {details && details.clientName && ` • ${details.clientName}`}
                              {details && details.matterTitle && ` • ${details.matterTitle}`}
                              {details && details.fileName && ` • ${details.fileName}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {formatDate(activity.createdAt)}
                          </Badge>
                        </div>
                        {details && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {details.description && <p>{details.description}</p>}
                            {details.amount && (
                              <p className="font-medium text-foreground">
                                ${typeof details.amount === 'number' ? details.amount.toFixed(2) : details.amount}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
