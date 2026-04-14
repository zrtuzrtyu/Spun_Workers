import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import { LayoutDashboard, Users, CheckSquare, LogOut, Activity, Sparkles, Settings, DollarSign, Menu, X, MessageSquare } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Workers", path: "/admin/workers", icon: Users },
    { name: "Tasks", path: "/admin/tasks", icon: CheckSquare },
    { name: "Withdrawals", path: "/admin/withdrawals", icon: DollarSign },
    { name: "Spicy Chat", path: "/worker/chat", icon: MessageSquare },
    { name: "AI Tools", path: "/admin/ai", icon: Sparkles },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans flex flex-col md:flex-row selection:bg-purple-500/30">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col md:h-screen md:sticky top-0 relative z-20">
        <div className="p-6 border-b border-white/5 flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-4">
            <Logo />
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans ml-14">Admin Panel</div>
          </div>
          <button onClick={handleLogout} className="md:hidden text-red-400 p-2"><LogOut className="w-5 h-5" /></button>
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
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
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
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
