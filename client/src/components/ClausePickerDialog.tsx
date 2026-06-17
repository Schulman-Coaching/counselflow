import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Search, Library, Plus, FileText } from "lucide-react";

interface ClausePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (content: string) => void;
}

const CLAUSE_CATEGORIES = [
  "Confidentiality",
  "Indemnification",
  "Limitation of Liability",
  "Termination",
  "Governing Law",
  "Dispute Resolution",
  "Force Majeure",
  "Intellectual Property",
  "Warranties",
  "Payment Terms",
  "Other",
];

export function ClausePickerDialog({ open, onOpenChange, onSelect }: ClausePickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: clauses, isLoading } = trpc.clauses.search.useQuery(
    {
      query: searchQuery || undefined,
      category: categoryFilter === "all" ? undefined : categoryFilter,
    },
    { enabled: open }
  );

  const handleSelect = (clause: { content: string; title: string }) => {
    onSelect(clause.content);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Insert Clause from Library
          </DialogTitle>
          <DialogDescription>
            Search and select a clause to insert into your template
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clauses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CLAUSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-muted-foreground">Loading clauses...</p>
            </div>
          ) : clauses && clauses.length > 0 ? (
            <div className="space-y-3 pr-4">
              {clauses.map((clause: any) => (
                <Card
                  key={clause.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSelect(clause)}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium">
                          {clause.title}
                        </CardTitle>
                        {clause.category && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {clause.category}
                          </Badge>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="shrink-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {clause.content.substring(0, 200)}
                      {clause.content.length > 200 ? "..." : ""}
                    </p>
                    {clause.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {clause.tags.split(",").map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No clauses found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery || categoryFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create clauses in the Clause Library to use them here"}
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ClausePickerDialog;
