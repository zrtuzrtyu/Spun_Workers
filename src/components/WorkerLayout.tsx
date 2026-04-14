import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import { 
  LayoutDashboard, LogOut, DollarSign, Sparkles, Wallet, 
  User, Bell, MessageSquare, Lock, ShieldCheck, ShieldAlert,
  ArrowRight
} from "lucide-react";
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

    // Fetch completed tasks count
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col md:h-screen md:sticky top-0 relative z-20">
        <div className="p-6 border-b border-border flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-6">
            <Logo />
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold ml-14">Operator Portal</div>
            <div className="text-[8px] font-mono text-primary/40 uppercase tracking-widest ml-14 mt-1">v1.0.4 // SECURE_NODE</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="md:hidden text-destructive">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Level {currentLevel}</div>
            <div className="text-[10px] font-mono text-muted-foreground">${(user?.earnings || 0).toFixed(2)} / ${nextLevelGoal.toFixed(2)}</div>
          </div>
          <Progress value={levelProgress} className="h-1.5 mb-2" />
          <div className="text-[9px] text-muted-foreground/60 font-medium">Next tier unlock at Level {currentLevel + 1}</div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-sm group",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.name}
                </div>
                {item.locked && <Lock className="w-3 h-3 text-muted-foreground/40" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border hidden md:block">
          <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-muted/50 rounded-xl border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
              {(user?.isAnonymous ? user?.username : user?.name)?.charAt(0) || "W"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                {user?.isAnonymous ? user?.username : user?.name}
                {user?.trustTier === 'Premium' && <ShieldCheck className="w-3 h-3 text-amber-500" />}
              </div>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-tighter border-muted-foreground/20 text-muted-foreground">
                {user?.trustTier || 'New'}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 px-3"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative bg-background">
        {isOnboardingIncomplete && location.pathname !== '/worker/onboarding' && (
          <div className="bg-primary/10 border-b border-primary/20 p-3 flex items-center justify-center gap-4 text-xs font-bold sticky top-0 z-30 backdrop-blur-md">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-primary uppercase tracking-widest">Onboarding Incomplete: Marketplace Access Restricted</span>
            <Link to="/worker/onboarding" className="flex items-center gap-1 text-white hover:underline">
              Complete Setup <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
        <div className="p-6 md:p-10 max-w-6xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
