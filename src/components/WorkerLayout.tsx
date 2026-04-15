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

  const currentLevel = Math.floor((user?.earnings || 0) / 15) + 1;
  const isChatLocked = completedTasks < 5;
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
    { name: "Marketplace", path: "/worker/requests", icon: Sparkles, locked: isOnboardingIncomplete },
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
      <aside className="w-full md:w-72 bg-background border-r border-border flex flex-col md:h-screen md:sticky top-0 relative z-20">
        <div className="p-8 border-b border-border flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-10">
            <Logo />
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.3em] font-black ml-14 opacity-80">Operator Portal</div>
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
        
        <div className="p-8 border-b border-border bg-muted/30">
          <div className="flex justify-between items-center mb-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.3em] font-black">Level {currentLevel}</div>
            <div className="text-sm font-mono text-primary font-black">${(user?.earnings || 0).toFixed(2)}</div>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.4)]" 
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            Next Tier: Level {currentLevel + 1}
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-3 flex flex-row md:flex-col overflow-x-auto md:overflow-visible hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-6 py-4 rounded-2xl transition-all text-sm font-black uppercase tracking-[0.15em] group whitespace-nowrap md:whitespace-normal",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-4">
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                  {item.name}
                </div>
                {item.locked ? (
                  <Lock className="w-4 h-4 opacity-60" />
                ) : (
                  !isActive && <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border hidden md:block">
          <Button 
            variant="ghost" 
            onClick={toggleTheme}
            className="w-full justify-start gap-4 text-muted-foreground hover:text-foreground hover:bg-muted h-12 px-5 rounded-2xl font-black uppercase tracking-widest text-[11px] mb-4"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </Button>

          <div className="flex items-center gap-4 px-4 py-4 mb-4 bg-muted/50 rounded-[1.5rem] border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shrink-0 text-lg">
              {(user?.isAnonymous ? user?.username : user?.name)?.charAt(0) || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-foreground truncate flex items-center gap-1.5 uppercase tracking-wider">
                {user?.isAnonymous ? user?.username : user?.name}
                {user?.trustTier === 'Premium' && <ShieldCheck className="w-4 h-4 text-primary" />}
              </div>
              <Badge variant="outline" className="text-[9px] h-5 px-2 font-black uppercase tracking-widest border-border text-muted-foreground bg-background">
                {user?.trustTier || 'New'}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-4 text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-12 px-5 rounded-2xl font-black uppercase tracking-widest text-[11px]"
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
            <Link to="/worker/onboarding" className="flex items-center gap-2 text-white hover:text-primary transition-colors uppercase tracking-widest">
              Complete Setup <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        <div className="p-8 md:p-16 max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
