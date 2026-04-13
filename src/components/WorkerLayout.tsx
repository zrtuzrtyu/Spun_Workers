import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";
import { LayoutDashboard, LogOut, DollarSign, Sparkles, Wallet, User, Bell, MessageSquare } from "lucide-react";
import { Logo } from "./Logo";
import { toast } from "sonner";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "assignments"),
      where("workerId", "==", user.uid),
      orderBy("assignedAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.docs.length > 0) {
        const assignment = snap.docs[0].data();
        // Check if assigned recently (within 5 seconds)
        const assignedAt = assignment.assignedAt?.toDate();
        if (assignedAt && (new Date().getTime() - assignedAt.getTime() < 5000)) {
          toast.success("New task assigned!");
        }
      }
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const navItems = [
    { name: "My Tasks", path: "/worker", icon: LayoutDashboard },
    { name: "Post a Job", path: "/worker/requests", icon: Sparkles },
    { name: "Spicy Chat", path: "/worker/chat", icon: MessageSquare },
    { name: "My Wallet", path: "/worker/wallet", icon: Wallet },
    { name: "My Profile", path: "/worker/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans flex flex-col md:flex-row selection:bg-purple-500/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col md:h-screen md:sticky top-0 relative z-20">
        <div className="p-6 border-b border-white/5 flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-4">
            <Logo />
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans ml-14">Worker Portal</div>
          </div>
          <button onClick={handleLogout} className="md:hidden text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold font-sans">Level {user?.level || 1}</div>
            <div className="text-xs text-zinc-500 font-sans">${(user?.earnings || 0).toFixed(2)} / $25.00</div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((user?.earnings || 0) / 25 * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 flex flex-row md:flex-col overflow-x-auto md:overflow-visible font-sans hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                  isActive 
                    ? "bg-purple-500/10 text-purple-400 font-medium shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 hidden md:block font-sans">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white/5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold border border-purple-500/30">
              {user?.name?.charAt(0) || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                {user?.name}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  user?.trustTier === 'Premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  user?.trustTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                }`}>
                  {user?.trustTier || 'New'}
                </span>
              </div>
              <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="p-4 md:p-8 max-w-5xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
