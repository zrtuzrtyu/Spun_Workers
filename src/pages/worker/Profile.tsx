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
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useState } from "react";
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
      <div className="mb-16 space-y-4">
        <Badge variant="outline" className="bg-white/[0.03] border-white/[0.08] text-muted-foreground px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] rounded-full">
          <Settings className="w-3 h-3 mr-2 text-primary" /> System Configuration
        </Badge>
        <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-white leading-none">Profile<span className="text-primary">.</span></h1>
        <p className="text-muted-foreground text-lg font-light max-w-xl">Manage your operator identity, network privacy, and system preferences.</p>
      </div>
      
      <div className="grid lg:grid-cols-12 gap-12">
        {/* Left Column: Identity Card */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex flex-col items-center text-center space-y-8 relative z-10">
              <div className="relative group/avatar">
                <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-5xl shadow-2xl shadow-primary/20 relative z-10">
                  {user?.username?.charAt(0) || user?.name?.charAt(0) || "W"}
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-display font-bold text-white flex items-center justify-center gap-3">
                  {user?.isAnonymous ? user?.username : user?.name}
                  {user?.trustTier === 'Premium' && <ShieldCheck className="w-6 h-6 text-primary" />}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="bg-white/[0.03] border-white/[0.1] text-muted-foreground px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full">
                    {user?.isAnonymous ? "Anonymous Operator" : "Public Profile"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                  Level {Math.floor((user?.earnings || 0) / 15) + 1}
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                  {user?.trustTier || 'New'}
                </Badge>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-white/[0.05] space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">Accuracy Score</span>
                  <span className="text-xl font-display font-bold text-white">98.4%</span>
                </div>
                <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "98.4%" }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">Tasks Completed</span>
                <span className="text-xl font-display font-bold text-white">142</span>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 px-2">Privacy & Alerts</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", user?.isAnonymous ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.03] text-muted-foreground border-white/[0.05]")}>
                    {user?.isAnonymous ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">Anonymity</div>
                    <div className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Hide real name</div>
                  </div>
                </div>
                <Switch 
                  checked={user?.isAnonymous} 
                  onCheckedChange={toggleAnonymity}
                  disabled={updating}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-colors", user?.notificationsEnabled ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.03] text-muted-foreground border-white/[0.05]")}>
                    {user?.notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">Notifications</div>
                    <div className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">Task alerts</div>
                  </div>
                </div>
                <Switch 
                  checked={user?.notificationsEnabled} 
                  onCheckedChange={toggleNotifications}
                  disabled={updating}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Skills */}
        <div className="lg:col-span-8 space-y-12">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 md:p-12 shadow-2xl space-y-12">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-4">
                <DesignerIcon icon={Fingerprint} size="sm" /> Account Details
              </h3>
              <div className="text-[9px] font-mono font-bold text-muted-foreground/40 uppercase tracking-widest">
                ID_VERIFICATION // SUCCESS
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-10">
              {[
                { label: "Full Name", value: user?.name, icon: User },
                { label: "Username", value: user?.username || "Not set", icon: Hash },
                { label: "Email Address", value: user?.email, icon: Mail },
                { label: "Payment Email", value: user?.paymentEmail || "Not set", icon: CreditCard },
                { label: "Location", value: user?.country || "Not set", icon: MapPin },
                { label: "Age Group", value: user?.age || "Not set", icon: Calendar },
              ].map((item, i) => (
                <div key={i} className="space-y-3 group">
                  <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 ml-1 group-hover:text-primary transition-colors">{item.label}</label>
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-sm font-medium text-white flex items-center justify-between group-hover:border-primary/20 transition-all">
                    {item.value}
                    <item.icon className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[3rem] p-10 md:p-12 shadow-2xl space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-4">
                <DesignerIcon icon={Zap} size="sm" /> Verified Skills
              </h3>
              <Badge variant="outline" className="bg-emerald-500/5 border-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Active Nodes
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {user?.skills?.map((skill, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[11px] font-bold text-white flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default group"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" /> {skill}
                </motion.div>
              )) || (
                <p className="text-sm text-muted-foreground italic font-light">No skills listed yet.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <Button 
              variant="outline" 
              className="flex-1 h-20 rounded-[2rem] border-white/[0.08] bg-white/[0.02] hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-bold text-[11px] uppercase tracking-[0.2em] group"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" /> Sign Out
            </Button>
            <Button 
              className="flex-1 h-20 rounded-[2rem] font-bold text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 group"
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
