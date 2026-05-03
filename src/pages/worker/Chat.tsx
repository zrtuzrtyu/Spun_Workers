import React, { useState, useEffect, useRef } from "react";
import WorkerLayout from "@/components/WorkerLayout";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getCountFromServer } from "firebase/firestore";
import { toast } from "sonner";
import { Send, MessageSquare, ShieldCheck, Zap, Lock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function WorkerChat() {
  const { user, firebaseUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLocked = user?.role !== 'admin' && completedTasks < 5;

  useEffect(() => {
    if (!user) return;
    
    // Use the pre-calculated ratingCount (which increments on every approved task)
    // instead of querying the server for all assignments.
    setCompletedTasks(user.ratingCount || 0);
    setIsAuthReady(true);
  }, [user]);

  useEffect(() => {
    if (isLocked || !isAuthReady) return;
    
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, "messages");
    });

    return () => unsubscribe();
  }, [isLocked, isAuthReady]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !firebaseUser || !user) return;

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage.trim(),
        userId: firebaseUser.uid,
        userName: user.isAnonymous ? (user.username || "Anonymous") : user.name,
        userRole: user.role,
        isAnonymous: user.isAnonymous,
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, "messages");
    } finally {
      setSending(false);
    }
  };

  const Layout = user?.role === 'admin' ? AdminLayout : WorkerLayout;

  if (!isAuthReady) return <Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto h-[calc(100vh-10rem)] flex flex-col relative">
        <AnimatePresence>
          {isLocked && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-xl rounded-3xl border border-border/50" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
              >
                <Card className="border-primary/20 bg-card/50 shadow-md ">
                  <CardContent className="p-10 text-center space-y-6">
                    <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary shadow-sm ">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Communication Locked</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Spicy Chat is reserved for verified operators. Complete <span className="text-primary font-semibold">5 approved tasks</span> to unlock the global network.
                      </p>
                    </div>
                    
                    <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                      <div className="flex justify-between items-end mb-2.5">
                        <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Verification Progress</div>
                        <div className="text-xs font-mono font-semibold text-primary">{completedTasks}/5</div>
                      </div>
                      <Progress value={(completedTasks / 5) * 100} className="h-1.5" />
                      <p className="text-xs text-muted-foreground/60 mt-3 font-medium">
                        {5 - completedTasks} more approved tasks required
                      </p>
                    </div>

                    <Link to="/worker" className={cn(buttonVariants(), "w-full font-semibold shadow-sm ")}>
                      Go to Tasks <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" /> Spicy Chat
            </h1>
            <p className="text-sm text-muted-foreground">Real-time collaboration with the Spunn Force network.</p>
          </div>
          <Badge variant="outline" className="hidden sm:flex items-center gap-2 bg-emerald-500/5 border-emerald-500/20 text-emerald-500 px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">Network Online</span>
          </Badge>
        </div>

        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col relative">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium">No transmissions detected.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.userId === firebaseUser?.uid;
                const isAdmin = msg.userRole === "admin";
                const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={cn("flex flex-col", isMe ? 'items-end' : 'items-start')}
                  >
                    {showHeader && (
                      <div className={cn("flex items-center gap-2 mb-1.5 px-1", isMe ? 'flex-row-reverse' : 'flex-row')}>
                        <span className={cn(
                          "text-xs font-semibold uppercase tracking-wider",
                          isAdmin ? 'text-primary' : isMe ? 'text-primary/70' : 'text-muted-foreground'
                        )}>
                          {msg.userName}
                        </span>
                        {isAdmin && <ShieldCheck className="w-3 h-3 text-primary" />}
                        <span className="text-xs font-mono text-muted-foreground/50">
                          {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "HH:mm") : "--:--"}
                        </span>
                      </div>
                    )}
                    <div 
                      className={cn(
                        "max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-xl text-sm leading-relaxed shadow-sm",
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : isAdmin
                            ? 'bg-primary/10 border border-primary/20 text-foreground rounded-tl-none'
                            : 'bg-muted/50 border border-border/50 text-foreground rounded-tl-none'
                      )}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-muted/30 border-t border-border">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-background border-border/50 focus:border-primary transition-all h-11 text-sm"
                maxLength={1000}
                disabled={isLocked}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || sending || isLocked}
                className="h-11 px-6 font-semibold shadow-sm "
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
