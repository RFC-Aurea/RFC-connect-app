import MobileLayout from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Phone, Video, Send, AlertTriangle } from "lucide-react";
import { mockChatHistory } from "@/lib/mockData";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function ChatView() {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState(mockChatHistory);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, {
      id: Date.now().toString(),
      senderId: "p1",
      senderName: "Me",
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMentor: false,
    }]);
    setInput("");
  };

  const headerActions = (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
        <Phone className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
        <Video className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <MobileLayout title="Rachel (Mentor)" showBack headerAction={headerActions}>
      <div className="flex flex-col h-full bg-card">
        
        {/* Medical Disclaimer Banner */}
        <div className="bg-accent/10 border-b border-accent/20 p-3 px-4 flex items-start gap-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-accent-foreground leading-tight">
            Mentors provide peer support based on personal experience. For medical advice, always contact your RFC clinical team.
          </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => {
            const isMe = !msg.isMentor; // Assuming we are viewing as Patient for prototype
            return (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-br-sm' 
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.timestamp}
                </span>
              </motion.div>
            )
          })}
          <div ref={endRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t border-border shrink-0">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..." 
              className="rounded-full bg-card border-border h-12 px-4 focus-visible:ring-primary"
            />
            <Button type="submit" size="icon" className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 shrink-0">
              <Send className="w-5 h-5 ml-0.5" />
            </Button>
          </form>
        </div>

      </div>
    </MobileLayout>
  );
}