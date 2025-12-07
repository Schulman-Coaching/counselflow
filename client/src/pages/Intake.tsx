import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, FileText, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Intake() {
  const [selectedIntake, setSelectedIntake] = useState<number | null>(null);
  const { data: intakeForms, isLoading } = trpc.intake.list.useQuery();
  const { data: selectedIntakeData } = trpc.intake.get.useQuery(
    { id: selectedIntake! },
    { enabled: !!selectedIntake }
  );
  const utils = trpc.useUtils();
  
  const updateStatus = trpc.intake.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Intake status updated");
      utils.intake.list.invalidate();
      utils.dashboard.stats.invalidate();
      setSelectedIntake(null);
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleStatusUpdate = (id: number, status: "reviewed" | "converted" | "rejected") => {
    updateStatus.mutate({ id, status });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Client Intake</h1>
          <p className="text-muted-foreground mt-2">Review and process new client inquiries</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading intake forms...</div>
          </div>
        ) : intakeForms && intakeForms.length > 0 ? (
          <div className="grid gap-4">
            {intakeForms.map((intake) => {
              const formData = JSON.parse(intake.formData);
              return (
                <Card
                  key={intake.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedIntake(intake.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{formData.name || "Unknown"}</CardTitle>
                          <CardDescription>
                            {formData.email || "No email provided"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {intake.urgencyFlag && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Urgent
                          </Badge>
                        )}
                        <Badge
                          variant={
                            intake.status === "new"
                              ? "default"
                              : intake.status === "reviewed"
                              ? "secondary"
                              : intake.status === "converted"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {intake.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {intake.conflictCheckResult && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Conflict Check: </span>
                          <span className={intake.conflictCheckResult.includes("No") ? "text-green-600" : "text-destructive"}>
                            {intake.conflictCheckResult}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(intake.createdAt).toLocaleString()}
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
              <p className="text-lg font-medium mb-2">No intake forms yet</p>
              <p className="text-sm text-muted-foreground">
                New client inquiries will appear here
              </p>
            </CardContent>
          </Card>
        )}

        {selectedIntake && selectedIntakeData && (
          <Dialog open={!!selectedIntake} onOpenChange={() => setSelectedIntake(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Intake Form Details</DialogTitle>
                <DialogDescription>
                  Review the client inquiry and AI analysis
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Client Information</h3>
                  <div className="grid gap-3 text-sm">
                    {Object.entries(JSON.parse(selectedIntakeData.formData)).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="col-span-2">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedIntakeData.aiAnalysis && (
                  <div>
                    <h3 className="font-semibold mb-3">AI Analysis</h3>
                    <div className="prose prose-sm max-w-none bg-muted/50 p-4 rounded-lg">
                      <Streamdown>{selectedIntakeData.aiAnalysis}</Streamdown>
                    </div>
                  </div>
                )}

                {selectedIntakeData.conflictCheckResult && (
                  <div>
                    <h3 className="font-semibold mb-3">Conflict Check</h3>
                    <div className={`p-3 rounded-lg ${selectedIntakeData.conflictCheckResult.includes("No") ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                      {selectedIntakeData.conflictCheckResult}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(selectedIntake, "reviewed")}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Reviewed
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(selectedIntake, "converted")}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Convert to Client
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(selectedIntake, "rejected")}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
