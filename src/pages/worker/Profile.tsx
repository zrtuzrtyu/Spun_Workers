import { useAuth } from "@/contexts/AuthContext";
import WorkerLayout from "@/components/WorkerLayout";
import { 
  User, Mail, Hash, LogOut, ShieldCheck, Award, Star, 
  MapPin, Calendar, CreditCard, Eye, EyeOff, Bell, 
  BellOff, Target, Shield, CheckCircle2, ChevronRight,
  Settings,
  Fingerprint,
  Zap,
  TrendingUp,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "@/firebase";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DesignerIcon } from "@/components/DesignerIcon";
import { motion } from "motion/react";

export default function WorkerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const q = query(
          collection(db, "assignments"),
          where("workerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        let approved = 0;
        let rejected = 0;
        snapshot.forEach(doc => {
          if (doc.data().status === "approved") approved++;
          if (doc.data().status === "rejected") rejected++;
        });
        setCompletedTasks(approved);
        const totalGraded = approved + rejected;
        if (totalGraded > 0) {
          setAccuracy(Math.round((approved / totalGraded) * 1000) / 10);
        } else {
          setAccuracy(100);
        }
      } catch (error) {
        console.error("Failed to fetch assignment stats:", error);
      }
    };
    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const toggleAnonymity = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        isAnonymous: !user.isAnonymous
      });
      toast.success(user.isAnonymous ? "Identity is now public" : "Identity is now hidden");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUpdating(false);
    }
  };

  const toggleNotifications = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        notificationsEnabled: !user.notificationsEnabled
      });
      toast.success(user.notificationsEnabled ? "Notifications disabled" : "Notifications enabled");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <WorkerLayout>
      <div className="mb-10 md:mb-16 space-y-4">
        <Badge variant="outline" className="bg-muted/30 border-border text-muted-foreground px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full">
          <Settings className="w-3.5 h-3.5 mr-2 text-primary" /> System Configuration
        </Badge>
        <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground leading-none">Profile<span className="text-primary">.</span></h1>
        <p className="text-muted-foreground text-sm md:text-base font-light max-w-xl">Manage your operator identity, network privacy, and system preferences.</p>
      </div>
      
      <div className="grid lg:grid-cols-12 gap-12">
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-4 space-y-8 md:space-y-10">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="relative group/avatar">
                <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2rem] bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground font-bold text-4xl shadow-lg relative z-10">
                  {user?.username?.charAt(0) || user?.name?.charAt(0) || "W"}
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-display font-bold text-foreground flex items-center justify-center gap-2">
                  {user?.isAnonymous ? user?.username : user?.name}
                  {user?.trustTier === 'Premium' && <ShieldCheck className="w-5 h-5 text-primary" />}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="bg-muted/30 border-border text-muted-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full">
                    {user?.isAnonymous ? "Anonymous Operator" : "Public Profile"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-[250px]">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-semibold shrink-0">
                  Level {Math.floor((user?.earnings || 0) / 15) + 1}
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-xs font-semibold shrink-0">
                  {user?.trustTier || 'New'}
                </Badge>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-border space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Accuracy Score</span>
                  <span className="text-xl font-display font-bold text-foreground">{accuracy}%</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden border border-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracy}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-emerald-500 shadow-sm" 
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Tasks Completed</span>
                <span className="text-xl font-display font-bold text-foreground">{completedTasks}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 space-y-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Privacy & Alerts</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", user?.isAnonymous ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border")}>
                    {user?.isAnonymous ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-foreground">Anonymity</div>
                    <div className="text-xs text-muted-foreground">Hide real name</div>
                  </div>
                </div>
                <Switch 
                  checked={user?.isAnonymous} 
                  onCheckedChange={toggleAnonymity}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", user?.notificationsEnabled ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border")}>
                    {user?.notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-foreground">Notifications</div>
                    <div className="text-xs text-muted-foreground">Task alerts</div>
                  </div>
                </div>
                <Switch 
                  checked={user?.notificationsEnabled} 
                  onCheckedChange={toggleNotifications}
                  disabled={updating}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Skills */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Fingerprint className="w-4 h-4" />
                </div>
                Account Details
              </h3>
              <Badge variant="outline" className="bg-secondary border-border text-muted-foreground font-mono font-medium text-xs">
                ID_VERIF // SUCCESS
              </Badge>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { label: "Full Name", value: user?.name, icon: User },
                { label: "Username", value: user?.username || "Not set", icon: Hash },
                { label: "Email Address", value: user?.email, icon: Mail },
                { label: "Payment Email", value: user?.paymentEmail || "Not set", icon: CreditCard },
                { label: "Location", value: user?.country || "Not set", icon: MapPin },
                { label: "Age Group", value: user?.age || "Not set", icon: Calendar },
              ].map((item, i) => (
                <div key={i} className="space-y-2 group">
                  <label className="text-xs font-semibold uppercase text-muted-foreground ml-1">{item.label}</label>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border text-sm font-medium text-foreground flex items-center justify-between group-hover:border-primary/30 transition-all">
                    <span className="truncate pr-4">{item.value}</span>
                    <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 shadow-sm space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Zap className="w-4 h-4" />
                </div>
                Verified Skills
              </h3>
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 text-xs font-semibold uppercase px-3 py-1 rounded-full">
                Active Nodes
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {user?.skills?.map((skill, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-4 py-2 rounded-xl bg-muted/40 border border-border text-sm font-medium text-foreground flex items-center gap-2 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {skill}
                </motion.div>
              )) || (
                <p className="text-sm text-muted-foreground italic font-light">No skills listed yet.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 h-16 rounded-2xl border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-semibold text-sm group"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" /> Sign Out
            </Button>
            <Button 
              className="flex-1 h-16 rounded-2xl font-semibold text-sm shadow-md shadow-primary/20 group"
              onClick={() => navigate("/worker/wallet")}
            >
              <CreditCard className="w-5 h-5 mr-3" /> Manage Wallet <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
