import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import { 
  LayoutDashboard, LogOut, DollarSign, Sparkles, Wallet, 
  User, Bell, MessageSquare, Lock, ShieldCheck, ShieldAlert,
  ArrowRight,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { collection, query, where, onSnapshot, orderBy, limit, getCountFromServer } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [completedTasks, setCompletedTasks] = useState(0);

  const currentLevel = user?.level || Math.floor((user?.earnings || 0) / 15) + 1;
  const isChatLocked = completedTasks < 5;
  const isMarketplaceLocked = currentLevel < 2; // Requires level 2 to access Open Market
  const isOnboardingIncomplete = user && !user.onboardingCompleted;
  
  const nextLevelGoal = currentLevel * 15;
  const levelProgress = (((user?.earnings || 0) % 15) / 15) * 100;

  useEffect(() => {
    if (!user) return;

    const fetchCompletedCount = async () => {
      const q = query(
        collection(db, "assignments"),
        where("workerId", "==", user.uid),
        where("status", "==", "approved")
      );
      const snapshot = await getCountFromServer(q);
      setCompletedTasks(snapshot.data().count);
    };

    fetchCompletedCount();

    const q = query(
      collection(db, "assignments"),
      where("workerId", "==", user.uid),
      orderBy("assignedAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.docs.length > 0) {
        const assignment = snap.docs[0].data();
        const assignedAt = assignment.assignedAt?.toDate();
        if (assignedAt && (new Date().getTime() - assignedAt.getTime() < 5000)) {
          toast.success("New task assigned!");
        }
      }
    }, (error) => {
      console.error("WorkerLayout assignments listener error:", error);
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const navItems = [
    { name: "My Tasks", path: "/worker", icon: LayoutDashboard },
    { name: "Marketplace", path: "/worker/requests", icon: Sparkles, locked: isMarketplaceLocked },
    { name: "Spicy Chat", path: "/worker/chat", icon: MessageSquare, locked: isChatLocked },
    { name: "My Wallet", path: "/worker/wallet", icon: Wallet },
    { name: "My Profile", path: "/worker/profile", icon: User },
  ];

  if (user?.role === "admin") {
    navItems.unshift({ name: "Admin Panel", path: "/admin", icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row antialiased transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col md:h-screen md:sticky top-0 relative z-20 shadow-sm">
        <div className="p-6 border-b border-border flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-6">
            <Logo />
            <div className="text-xs text-muted-foreground font-medium ml-10 md:ml-12 opacity-80">Worker Dashboard</div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-6 border-b border-border bg-muted/40">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-semibold text-foreground">Level {currentLevel}</div>
            <div className="text-sm font-mono text-primary font-bold">${(user?.earnings || 0).toFixed(2)}</div>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.4)]" 
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground font-medium">
            <span>{completedTasks} tasks done</span>
            <span>Next: Lvl {currentLevel + 1}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 md:p-5 space-y-1 md:space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.locked ? "#" : item.path}
                onClick={(e) => {
                  if (item.locked) {
                    e.preventDefault();
                    if (item.name === "Spicy Chat") toast.error("Complete 5 tasks to unlock chat!");
                    else if (item.name === "Marketplace") toast.error("Reach Level 2 to unlock Marketplace!");
                  }
                }}
                className={cn(
                  "flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all text-sm font-medium group whitespace-nowrap md:whitespace-normal",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                    : item.locked
                    ? "text-muted-foreground/50 hover:bg-muted/50 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                  {item.name}
                </div>
                {item.locked ? (
                  <Lock className="w-4 h-4 opacity-50" />
                ) : (
                  !isActive && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 -translate-x-2 group-hover:translate-x-0 transition-all hidden md:block" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-border hidden md:block">
          <Button 
            variant="ghost" 
            onClick={toggleTheme}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted h-10 px-4 rounded-lg font-medium text-sm mb-3"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </Button>

          <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-muted/50 rounded-2xl border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shrink-0 text-base">
              {(user?.isAnonymous ? user?.username : user?.name)?.charAt(0) || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-foreground truncate flex items-center gap-1.5 uppercase tracking-wider">
                {user?.isAnonymous ? user?.username : user?.name}
                {user?.trustTier === 'Premium' && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
              </div>
              <Badge variant="outline" className="text-[8px] h-4 md:h-5 px-1.5 mt-0.5 font-black uppercase tracking-widest border-border text-muted-foreground bg-background">
                {user?.trustTier || 'New'}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-background">
        {isOnboardingIncomplete && location.pathname !== '/worker/onboarding' && (
          <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-center gap-6 text-[10px] font-bold sticky top-0 z-30 backdrop-blur-md">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-primary uppercase tracking-[0.2em]">Onboarding Incomplete: Marketplace Access Restricted</span>
            <Link to="/worker/onboarding" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors uppercase tracking-widest">
              Complete Setup <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        <div className="p-6 md:p-16 max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
