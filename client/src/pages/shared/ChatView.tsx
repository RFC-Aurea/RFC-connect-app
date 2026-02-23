import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useParams } from "wouter";
import { Phone, Video, Send, AlertTriangle, Flag, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
};

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatView() {
  const [, setLocation] = useLocation();
  const params = useParams<{ userId: string }>();
  const partnerId = params.userId;
  const { user } = useAuth();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", partnerId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/messages/${partnerId}`);
      return res.json();
    },
    enabled: !!partnerId,
    refetchInterval: 5000,
  });

  const { data: partnerInfo } = useQuery<{ id: number; name: string }>({
    queryKey: ["/api/users", partnerId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${partnerId}`);
      return res.json();
    },
    enabled: !!partnerId,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/messages/${partnerId}`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", partnerId] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: number; reason: string }) => {
      const res = await apiRequest("POST", "/api/reports", { messageId, reason });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message reported", description: "Thank you for your report." });
      setReportDialogOpen(false);
      setReportReason("");
      setReportMessageId(null);
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMutation.mutate(input.trim());
    setInput("");
  };

  const handleOpenReport = (messageId: number) => {
    setReportMessageId(messageId);
    setReportDialogOpen(true);
  };

  const handleSubmitReport = () => {
    if (!reportMessageId || !reportReason.trim()) return;
    reportMutation.mutate({ messageId: reportMessageId, reason: reportReason.trim() });
  };

  const partnerName = partnerInfo?.name ?? "Chat";

  const headerActions = (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" data-testid="button-phone-call">
        <Phone className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" data-testid="button-video-call">
        <Video className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <MobileLayout title={partnerName} showBack headerAction={headerActions}>
      <div className="flex flex-col h-full bg-card" data-testid="chat-view">

        <div className="bg-accent/10 border-b border-accent/20 p-3 px-4 flex items-start gap-3 shrink-0" data-testid="medical-disclaimer">
          <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-accent-foreground leading-tight">
            Mentors provide peer support based on personal experience. For medical advice, always contact your RFC clinical team.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
          {isLoading ? (
            <div className="flex items-center justify-center h-full" data-testid="chat-loading">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm" data-testid="chat-empty">
              No messages yet. Say hello!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = user ? msg.senderId === user.id : false;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  data-testid={`message-${msg.id}`}
                  onMouseEnter={() => !isMe && setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="relative group">
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                      data-testid={`message-bubble-${msg.id}`}
                    >
                      {msg.content}
                    </div>
                    {!isMe && (
                      <button
                        onClick={() => handleOpenReport(msg.id)}
                        className={`absolute -right-8 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity ${
                          hoveredMessageId === msg.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                        data-testid={`button-report-message-${msg.id}`}
                        title="Report message"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1" data-testid={`message-time-${msg.id}`}>
                    {formatTimestamp(msg.createdAt)}
                  </span>
                </motion.div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 bg-background border-t border-border shrink-0">
          <form onSubmit={handleSend} className="flex gap-2" data-testid="chat-input-form">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="rounded-full bg-card border-border h-12 px-4 focus-visible:ring-primary"
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 shrink-0"
              disabled={sendMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent data-testid="dialog-report-message">
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please describe why you are reporting this message.
            </p>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for reporting..."
              className="min-h-[100px]"
              data-testid="input-report-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)} data-testid="button-cancel-report">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmitReport}
              disabled={!reportReason.trim() || reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
