import React, { useState, useEffect, useRef } from "react";
import WorkerLayout from "../../components/WorkerLayout";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Send, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function WorkerChat() {
  const { user, firebaseUser } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    }, (error) => {
      console.error("Chat error:", error);
      toast.error("Failed to load chat messages.");
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !firebaseUser || !user) return;

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage.trim(),
        userId: firebaseUser.uid,
        userName: user.name,
        userRole: user.role,
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <WorkerLayout>
      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-medium text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-pink-500" /> Spicy Chat
            </h1>
            <p className="text-zinc-400 mt-1">Connect with other workers and admins in real-time.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
            <span className="text-pink-400 text-sm font-medium">Live Global Chat</span>
          </div>
        </div>

        <div className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-32 bg-pink-500/10 blur-[80px] rounded-full pointer-events-none"></div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p>No messages yet. Be the first to say hello!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.userId === firebaseUser?.uid;
                const isAdmin = msg.userRole === "admin";
                const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {showHeader && (
                      <div className={`flex items-center gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className={`text-xs font-bold ${isAdmin ? 'text-purple-400' : isMe ? 'text-pink-400' : 'text-zinc-400'}`}>
                          {msg.userName}
                        </span>
                        {isAdmin && <ShieldCheck className="w-3 h-3 text-purple-500" />}
                        <span className="text-[10px] text-zinc-600">
                          {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), "h:mm a") : "Just now"}
                        </span>
                      </div>
                    )}
                    <div 
                      className={`max-w-[80%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe 
                          ? 'bg-gradient-to-br from-pink-600 to-pink-500 text-white rounded-tr-sm shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                          : isAdmin
                            ? 'bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-500/30 text-purple-100 rounded-tl-sm shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                            : 'bg-[#111111] border border-white/5 text-zinc-200 rounded-tl-sm'
                      }`}
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
          <div className="p-4 bg-[#0F0F0F] border-t border-white/5">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a spicy message..."
                className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all placeholder:text-zinc-600"
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
