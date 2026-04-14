import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { motion } from "motion/react";
import { Sparkles, Brain, Zap, MessageSquare } from "lucide-react";

export default function AdminAI() {
  const tools = [
    { name: "Task Generator", desc: "Generate task descriptions using AI", icon: Brain, color: "text-purple-400" },
    { name: "Fraud Detection", desc: "Analyze worker behavior patterns", icon: Zap, color: "text-amber-400" },
    { name: "Support Assistant", desc: "Automated worker support chat", icon: MessageSquare, color: "text-blue-400" },
  ];

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2 font-sans flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-purple-400" /> AI Tools
        </h1>
        <p className="text-zinc-400 font-sans">Leverage artificial intelligence to optimize your workforce management.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#0A0A0A] border border-white/5 p-8 rounded-3xl hover:border-purple-500/30 transition-all group"
          >
            <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <tool.icon className={`w-6 h-6 ${tool.color}`} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{tool.desc}</p>
            <button className="mt-6 w-full py-3 rounded-xl bg-white/5 border border-white/5 text-white font-medium hover:bg-white/10 transition-colors">
              Launch Tool
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-12 bg-gradient-to-br from-purple-500/10 to-amber-500/10 border border-white/5 rounded-3xl p-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">More AI Features Coming Soon</h2>
        <p className="text-zinc-400 max-w-xl mx-auto">We are working on integrating Gemini 3.1 to provide even more powerful insights and automation for your Spunn Force team.</p>
      </div>
    </AdminLayout>
  );
}
