import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { LayoutDashboard, Users, CheckSquare, LogOut, Activity, Sparkles, Settings, DollarSign, Menu, X, MessageSquare, Sun, Moon, Eye, Bell } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingWorkers, setPendingWorkers] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    if (user?.role !== "admin") return;
    
    // Subscribe to pending workers
    const unsubWorkers = onSnapshot(query(collection(db, "users"), where("status", "==", "pending")), (snap) => {
      setPendingWorkers(snap.size);
    });

    // Subscribe to pending tasks
    const unsubTasks = onSnapshot(query(collection(db, "assignments"), where("status", "==", "submitted")), (snap) => {
      setPendingTasks(snap.size);
    });

    // Subscribe to pending withdrawals
    const unsubWithdrawals = onSnapshot(query(collection(db, "withdrawals"), where("status", "==", "pending")), (snap) => {
      setPendingWithdrawals(snap.size);
    });

    return () => {
      unsubWorkers();
      unsubTasks();
      unsubWithdrawals();
    };
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Worker View", path: "/worker", icon: Eye },
    { name: "Workers", path: "/admin/workers", icon: Users, badge: pendingWorkers },
    { name: "Tasks", path: "/admin/tasks", icon: CheckSquare, badge: pendingTasks },
    { name: "Withdrawals", path: "/admin/withdrawals", icon: DollarSign, badge: pendingWithdrawals },
    { name: "Spicy Chat", path: "/worker/chat", icon: MessageSquare },
    { name: "AI Tools", path: "/admin/ai", icon: Sparkles },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  const totalPending = pendingWorkers + pendingTasks + pendingWithdrawals;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row selection:bg-primary/30 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass border-r border-border flex flex-col md:h-screen md:sticky top-0 relative z-20">
        <div className="p-6 border-b border-border flex justify-between items-center md:block">
          <div className="flex flex-col gap-1 md:mb-6">
            <Logo />
            <div className="text-xs text-muted-foreground font-medium ml-10 md:ml-12 opacity-80">Admin Panel</div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setNotificationsOpen(true)} className="relative text-muted-foreground hover:bg-muted">
              <Bell className="w-5 h-5" />
              {totalPending > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:bg-muted">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <button onClick={handleLogout} className="text-destructive p-2 hover:bg-destructive/10 rounded-md"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 md:p-5 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible font-sans hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 rounded-[0.8rem] transition-all whitespace-nowrap text-sm font-semibold group ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm " 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors"}`} />
                  {item.name}
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-border hidden md:block font-sans">
          <Button 
            variant="ghost" 
            onClick={() => setNotificationsOpen(true)}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted h-10 px-4 rounded-[0.8rem] font-semibold text-sm mb-3 relative"
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
            {totalPending > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {totalPending}
              </span>
            )}
          </Button>

          <Button 
            variant="ghost" 
            onClick={toggleTheme}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted h-10 px-4 rounded-[0.8rem] font-semibold text-sm mb-3"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </Button>

          <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-muted/50 rounded-[1rem] border border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-semibold border border-primary/30 text-base">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate font-medium">{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-[0.8rem] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-semibold text-sm h-10"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-none rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        {/* Notifications Panel */}
        {notificationsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" onClick={() => setNotificationsOpen(false)}></div>
            <div className="relative w-full max-w-sm h-full bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" /> Notifications
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Actions requiring your attention</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setNotificationsOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-3 font-sans">
                {totalPending === 0 ? (
                  <div className="text-center p-8 text-muted-foreground text-sm flex flex-col items-center">
                    <CheckSquare className="w-8 h-8 opacity-20 mb-3" />
                    All caught up! No pending actions.
                  </div>
                ) : (
                  <>
                    {pendingWorkers > 0 && (
                      <div 
                        onClick={() => { setNotificationsOpen(false); navigate("/admin/workers"); }}
                        className="p-4 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">New Worker Applications</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              You have {pendingWorkers} worker{pendingWorkers > 1 ? 's' : ''} awaiting approval to join the platform.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {pendingTasks > 0 && (
                      <div 
                        onClick={() => { setNotificationsOpen(false); navigate("/admin/tasks"); }}
                        className="p-4 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-500/20 text-green-500 rounded-lg">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">Task Submissions Pending</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              There {pendingTasks === 1 ? 'is' : 'are'} {pendingTasks} task submission{pendingTasks > 1 ? 's' : ''} awaiting your review and approval.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {pendingWithdrawals > 0 && (
                      <div 
                        onClick={() => { setNotificationsOpen(false); navigate("/admin/withdrawals"); }}
                        className="p-4 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">Withdrawals Pending</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              There {pendingWithdrawals === 1 ? 'is' : 'are'} {pendingWithdrawals} withdrawal request{pendingWithdrawals > 1 ? 's' : ''} awaiting payout.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-7xl mx-auto relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
