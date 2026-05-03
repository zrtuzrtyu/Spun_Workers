import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, serverTimestamp, addDoc, getDocs, where, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { Settings as SettingsIcon, Shield, Zap, Trash2, Activity, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "motion/react";

export default function AdminSettings() {
  const [systemConfig, setSystemConfig] = useState<any>({
    maintenanceMode: false,
    globalMultiplier: 1.0,
    minWithdrawal: 5.0,
    allowNewRegistrations: true
  });
  const [admins, setAdmins] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch System Config (from a single doc in 'config' collection)
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setSystemConfig(snap.data());
      } else {
        // Initialize default config if it doesn't exist
        setDoc(doc(db, "system", "config"), {
          maintenanceMode: false,
          globalMultiplier: 1.0,
          minWithdrawal: 5.0,
          allowNewRegistrations: true,
          createdAt: serverTimestamp()
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "system/config");
    });

    // Fetch Admins
    const qAdmins = query(collection(db, "users"), where("role", "==", "admin"));
    const unsubAdmins = onSnapshot(qAdmins, (snap) => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    // Fetch Detailed Logs
    const qLogs = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(20));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "activities");
    });

    return () => {
      unsubConfig();
      unsubAdmins();
      unsubLogs();
    };
  }, []);

  const handleSaveConfig = async () => {
    if (isNaN(systemConfig.globalMultiplier) || systemConfig.globalMultiplier < 0.1 || systemConfig.globalMultiplier > 5.0) {
      toast.error("Global Payout Multiplier must be a number between 0.1 and 5.0.");
      return;
    }
    if (isNaN(systemConfig.minWithdrawal) || systemConfig.minWithdrawal < 1) {
      toast.error("Min. Withdrawal must be at least $1.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "system", "config"), {
        ...systemConfig,
        updatedAt: serverTimestamp()
      });
      toast.success("System configuration updated!");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, "system/config");
    } finally {
      setSaving(false);
    }
  };

  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);

  const handleClearLogs = async () => {
    try {
      const q = query(collection(db, "activities"));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast.success("All logs cleared!");
      setShowClearLogsConfirm(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, "activities");
    }
  };

  const handlePromoteAdmin = async (email: string) => {
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error("User not found");
        return;
      }
      const userDoc = snap.docs[0];
      await updateDoc(userDoc.ref, { role: "admin" });
      toast.success(`${email} promoted to Admin!`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    }
  };

  if (loading) return <AdminLayout><div className="p-20 text-center font-sans font-semibold  text-3xl animate-pulse">INITIALIZING BACKEND CONTROL...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-sans font-semibold text-foreground mb-2 leading-none">
            System Settings
          </h1>
          <p className="text-zinc-400 text-lg font-sans max-w-2xl leading-relaxed">
            Global system configuration and administrative tools.
          </p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
        >
          <Save className="w-5 h-5" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Configuration */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-3">
                <SettingsIcon className="w-5 h-5 text-primary" /> System Configuration
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-muted/30 border border-border rounded-[1rem] p-6 flex items-center justify-between group hover:border-border transition-all">
                  <div>
                    <div className="font-sans text-foreground font-semibold text-sm">Maintenance Mode</div>
                    <div className="text-xs text-muted-foreground mt-1 font-medium">Disable worker access globally</div>
                  </div>
                  <button 
                    onClick={() => setSystemConfig({...systemConfig, maintenanceMode: !systemConfig.maintenanceMode})}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${systemConfig.maintenanceMode ? 'bg-red-500' : 'bg-muted/80'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${systemConfig.maintenanceMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-muted/30 border border-border rounded-[1rem] p-6 flex items-center justify-between group hover:border-border transition-all">
                  <div>
                    <div className="font-sans text-foreground font-semibold text-sm">New Registrations</div>
                    <div className="text-xs text-muted-foreground mt-1 font-medium">Allow new workers to join</div>
                  </div>
                  <button 
                    onClick={() => setSystemConfig({...systemConfig, allowNewRegistrations: !systemConfig.allowNewRegistrations})}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${systemConfig.allowNewRegistrations ? 'bg-primary' : 'bg-muted/80'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${systemConfig.allowNewRegistrations ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/30 border border-border rounded-[1rem] p-6 group hover:border-border transition-all">
                  <label className="block text-sm font-semibold mb-3 text-muted-foreground">Global Payout Multiplier</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" step="0.1" min="0.1" max="5.0"
                      value={systemConfig.globalMultiplier}
                      onChange={(e) => setSystemConfig({...systemConfig, globalMultiplier: parseFloat(e.target.value)})}
                      className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-xl font-sans"
                    />
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-sans font-semibold text-primary text-lg">
                      X
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 font-medium">Boosts all task payouts by this factor.</p>
                </div>

                <div className="bg-muted/30 border border-border rounded-[1rem] p-6 group hover:border-border transition-all">
                  <label className="block text-sm font-semibold mb-3 text-muted-foreground">Min. Withdrawal ($)</label>
                  <input 
                    type="number" step="1" min="1"
                    value={systemConfig.minWithdrawal}
                    onChange={(e) => setSystemConfig({...systemConfig, minWithdrawal: parseInt(e.target.value)})}
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-xl font-sans"
                  />
                  <p className="text-xs text-muted-foreground mt-3 font-medium">Minimum balance required for payout.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Management */}
          <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" /> Admin Access
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input 
                  id="admin-email"
                  type="email" 
                  placeholder="User email to promote..."
                  className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('admin-email') as HTMLInputElement;
                    if (input.value) handlePromoteAdmin(input.value);
                  }}
                  className="bg-muted hover:bg-muted/80 text-foreground font-medium py-3 px-8 rounded-xl transition-colors border border-border"
                >
                  Promote
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map(admin => (
                  <div key={admin.id} className="bg-muted/30 border border-border rounded-[1rem] p-4 flex items-center gap-4 group hover:border-border transition-all">
                    <div className="w-10 h-10 rounded-[0.8rem] bg-primary/10 border border-primary/20 flex items-center justify-center font-sans font-semibold text-lg text-primary">
                      {admin.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-foreground text-sm font-semibold truncate">{admin.name}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5 font-medium">{admin.email}</div>
                    </div>
                    <div className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-xs font-semibold tracking-wider uppercase">
                      Admin
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-[1.5rem] p-6 shadow-sm">
            <h2 className="text-lg font-display font-semibold text-foreground mb-6">System Tools</h2>
            <div className="space-y-4">
              <button 
                onClick={() => setShowClearLogsConfirm(true)}
                className="w-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear Activity Logs
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-muted/50 hover:bg-muted/80 text-foreground font-semibold py-3 px-4 rounded-xl transition-colors border border-border flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Restart App Instance
              </button>
              <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-4 text-destructive/80 text-xs leading-relaxed font-medium">
                <AlertTriangle className="w-5 h-5 mb-2 text-destructive" />
                Warning: These actions are irreversible. Use with caution.
              </div>
            </div>
          </div>

          {/* Detailed Activity Log */}
          <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-foreground">System Log</h2>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="max-h-[600px] overflow-auto divide-y divide-border">
              {logs.map(log => (
                <div key={log.id} className="p-6 hover:bg-muted/30 transition-all group">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="text-xs font-sans text-foreground font-medium capitalize bg-muted/50 border border-border px-2 py-1 rounded-md tracking-wide">{log.type?.replace('_', ' ')}</div>
                    <div className="text-xs text-muted-foreground font-medium">{log.createdAt?.toDate ? format(log.createdAt.toDate(), "HH:mm:ss") : ""}</div>
                  </div>
                  <div className="text-sm text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors font-sans">{log.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showClearLogsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-md">
            <h3 className="text-xl font-semibold text-foreground mb-2">Clear Activity Logs</h3>
            <p className="text-zinc-400 mb-6">
              Are you sure you want to clear all activity logs? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowClearLogsConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleClearLogs}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-foreground font-semibold transition-colors shadow-sm shadow-red-500/20"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
