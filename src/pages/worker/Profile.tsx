import { useAuth } from "@/contexts/AuthContext";
import WorkerLayout from "@/components/WorkerLayout";
import { 
  User, Mail, Hash, LogOut, ShieldCheck, Award, Star, 
  MapPin, Calendar, CreditCard, Eye, EyeOff, Bell, 
  BellOff, Target, Shield, CheckCircle2
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
      <div className="max-w-4xl mx-auto pb-20">
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Operator Profile</h1>
          <p className="text-muted-foreground">Manage your identity, privacy, and network preferences.</p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Identity Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-primary/20">
                  {user?.username?.charAt(0) || user?.name?.charAt(0) || "W"}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                    {user?.isAnonymous ? user?.username : user?.name}
                    {user?.trustTier === 'Premium' && <ShieldCheck className="w-4 h-4 text-amber-500" />}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                    {user?.isAnonymous ? "Anonymous Operator" : "Public Profile"}
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Level {Math.floor((user?.earnings || 0) / 15) + 1}
                  </Badge>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {user?.trustTier || 'New'}
                  </Badge>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border/50 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Accuracy Score</span>
                  <span className="text-white font-bold">98.4%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[98.4%]" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-medium">Tasks Completed</span>
                  <span className="text-white font-bold">142</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Privacy & Alerts</h3>
              
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", user?.isAnonymous ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {user?.isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold">Anonymity</div>
                    <div className="text-[10px] text-muted-foreground">Hide real name</div>
                  </div>
                </div>
                <Switch 
                  checked={user?.isAnonymous} 
                  onCheckedChange={toggleAnonymity}
                  disabled={updating}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", user?.notificationsEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    {user?.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold">Notifications</div>
                    <div className="text-[10px] text-muted-foreground">Task alerts</div>
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

          {/* Right Column: Details & Skills */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Account Details
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium text-white">
                    {user?.name}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Username</label>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium text-white">
                    {user?.username || "Not set"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium text-white">
                    {user?.email}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Payment Email</label>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium text-white">
                    {user?.paymentEmail || "Not set"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Location</label>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium text-white">
                    {user?.country || "Not set"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Age Group</label>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-sm font-medium text-white">
                    {user?.age || "Not set"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Verified Skills
              </h3>
              
              <div className="flex flex-wrap gap-3">
                {user?.skills?.map((skill, i) => (
                  <div key={i} className="px-4 py-2 rounded-xl bg-primary/5 border border-primary/10 text-xs font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {skill}
                  </div>
                )) || (
                  <p className="text-sm text-muted-foreground italic">No skills listed yet.</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-bold"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" /> Sign Out
              </Button>
              <Button 
                className="flex-1 h-14 rounded-2xl font-bold shadow-xl shadow-primary/20"
                onClick={() => navigate("/worker/wallet")}
              >
                <CreditCard className="w-5 h-5 mr-2" /> Manage Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
