import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, ShieldCheck, LogOut, CheckCircle2, Sparkles, Zap, Trophy } from "lucide-react";
import { auth, db } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export default function PendingApproval() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"status" | "missions">("status");
  const [missions, setMissions] = useState([
    { id: 1, title: "Account Secured", desc: "Your account has been successfully created and secured.", icon: ShieldCheck, completed: true, action: "" },
    { id: 2, title: "Identity Check", desc: "Ensure your name matches your payment email.", icon: ShieldCheck, completed: true, action: "" },
    { id: 3, title: "Network Warmup", desc: "Read our Quality Guidelines to boost starting trust.", icon: Sparkles, completed: false, action: "/guidelines" },
  ]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const progress = Math.round((missions.filter(m => m.completed).length / missions.length) * 100);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-[#0A0A0A] border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
      >
        {/* Progress Header */}
        <div className="relative z-10 mb-12">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-medium text-white mb-2">Verification</h1>
              <p className="text-zinc-500 text-sm">Step 2 of 3: Manual Compliance Review</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-display font-bold text-purple-500">{progress}%</div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-black">Readiness</div>
            </div>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-8 relative z-10">
          <button 
            onClick={() => setActiveTab("status")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "status" ? "bg-white text-[#050505] shadow-lg" : "text-zinc-500 hover:text-white"}`}
          >
            Queue Status
          </button>
          <button 
            onClick={() => setActiveTab("missions")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "missions" ? "bg-white text-[#050505] shadow-lg" : "text-zinc-500 hover:text-white"}`}
          >
            <Zap className="w-4 h-4" /> Boost Rank
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "status" ? (
            <motion.div 
              key="status"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="relative z-10"
            >
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6 text-amber-500 animate-pulse shadow-[0_0_40px_rgba(245,158,11,0.1)]">
                  <Clock className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">In the Spotlight</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Our team is currently reviewing your profile. We prioritize operators with complete profiles and high-quality applications.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Application Received</div>
                    <div className="text-xs text-zinc-500">Timestamp: {user?.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Compliance Review</div>
                    <div className="text-xs text-zinc-500">Estimated wait: 12-24 hours</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="missions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative z-10 space-y-4"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Pre-Approval Missions
                </h3>
                <p className="text-zinc-500 text-sm">Complete these to start at a higher Trust Tier.</p>
              </div>

              {missions.map((mission) => (
                <div 
                  key={mission.id}
                  className={`p-5 rounded-3xl border transition-all ${mission.completed ? 'bg-green-500/5 border-green-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${mission.completed ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-zinc-500'}`}>
                      <mission.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className={`font-bold ${mission.completed ? 'text-green-400' : 'text-white'}`}>{mission.title}</h4>
                        {mission.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed mb-3">{mission.desc}</p>
                      {!mission.completed && mission.action && (
                        <Link to={mission.action} className="text-xs font-bold text-purple-500 hover:text-purple-400 flex items-center gap-1">
                          Complete Now <Sparkles className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4 relative z-10">
          <Link 
            to="/" 
            className="flex-1 bg-white text-[#050505] font-black py-4 rounded-2xl text-center hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            Back to Home
          </Link>
          <button 
            onClick={handleLogout}
            className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}

