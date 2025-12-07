import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Download, ZoomIn, ZoomOut, X, MessageSquare, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DocumentPreviewDialogProps {
  documentTitle: string;
  documentUrl: string;
  documentId: number;
  fileType?: string;
  trigger?: React.ReactNode;
  clientToken?: string; // For client portal
}

export default function DocumentPreviewDialog({
  documentTitle,
  documentUrl,
  documentId,
  fileType,
  trigger,
  clientToken,
}: DocumentPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  
  const utils = trpc.useUtils();
  
  // Fetch comments based on user type
  const { data: comments = [] } = clientToken
    ? trpc.clientPortal.getComments.useQuery(
        { token: clientToken, documentId },
        { enabled: open }
      )
    : trpc.documentComments.list.useQuery(
        { documentId },
        { enabled: open }
      );
  
  // Add comment mutation
  const addCommentMutation = clientToken
    ? trpc.clientPortal.addComment.useMutation({
        onSuccess: () => {
          setNewComment("");
          utils.clientPortal.getComments.invalidate({ token: clientToken, documentId });
          toast.success("Comment added");
        },
      })
    : trpc.documentComments.create.useMutation({
        onSuccess: () => {
          setNewComment("");
          utils.documentComments.list.invalidate({ documentId });
          toast.success("Comment added");
        },
      });
  
  // Delete comment mutation (attorney only)
  const deleteCommentMutation = trpc.documentComments.delete.useMutation({
    onSuccess: () => {
      utils.documentComments.list.invalidate({ documentId });
      toast.success("Comment deleted");
    },
  });

  const isPDF = fileType?.includes("pdf") || documentUrl.toLowerCase().endsWith(".pdf");
  const isImage =
    fileType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(documentUrl);

  const handleDownload = () => {
    window.open(documentUrl, "_blank");
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    if (clientToken) {
      (addCommentMutation as any).mutate({
        token: clientToken,
        documentId,
        content: newComment,
      });
    } else {
      (addCommentMutation as any).mutate({
        documentId,
        content: newComment,
      });
    }
  };
  
  const handleDeleteComment = (commentId: number) => {
    if (confirm("Delete this comment?")) {
      deleteCommentMutation.mutate({ commentId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{documentTitle}</DialogTitle>
              <DialogDescription className="truncate">
                {isPDF ? "PDF Document" : isImage ? "Image" : "Document"} Preview
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 ml-4">
              {isImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant={showComments ? "default" : "outline"}
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments ({comments.length})
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="flex-1 overflow-auto bg-muted/30 rounded-lg border">
          {isPDF ? (
            <iframe
              src={documentUrl}
              className="w-full h-full"
              title={documentTitle}
              style={{ minHeight: "600px" }}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center min-h-full p-4">
              <img
                src={documentUrl}
                alt={documentTitle}
                className="max-w-full h-auto object-contain transition-transform"
                style={{ transform: `scale(${zoom / 100})` }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Preview not available</p>
                  <p className="text-sm">
                    This file type cannot be previewed in the browser.
                  </p>
                </div>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Comments Panel */}
        {showComments && (
          <div className="w-80 flex flex-col border-l">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Comments</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet
                  </p>
                ) : (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="space-y-2 pb-4 border-b last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {comment.authorName}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {comment.authorType}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!clientToken && comment.userId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="w-full"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {addCommentMutation.isPending ? "Sending..." : "Send Comment"}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
