import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import { LayoutDashboard, Users, CheckSquare, LogOut, Activity, Sparkles, Settings, DollarSign, Menu, X, MessageSquare, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row selection:bg-primary/30 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-background border-r border-border flex flex-col md:h-screen md:sticky top-0 relative z-20">
        <div className="p-6 border-b border-border flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-4">
            <Logo />
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-black font-sans ml-14">Admin Panel</div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <button onClick={handleLogout} className="text-destructive p-2"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible font-sans hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all whitespace-nowrap text-xs md:text-sm font-black uppercase tracking-wider ${
                  isActive 
                    ? "bg-primary/10 text-primary font-black shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border hidden md:block font-sans">
          <Button 
            variant="ghost" 
            onClick={toggleTheme}
            className="w-full justify-start gap-4 text-muted-foreground hover:text-foreground hover:bg-muted h-12 px-4 rounded-xl font-black uppercase tracking-widest text-[11px] mb-4"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </Button>

          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-muted/50 rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black border border-primary/30 text-lg">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-foreground truncate">{user?.name}</div>
              <div className="text-[10px] text-muted-foreground truncate font-medium">{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-black uppercase tracking-widest text-[11px]"
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
