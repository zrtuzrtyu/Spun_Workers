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

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all activity logs? This cannot be undone.")) return;
    
    try {
      const q = query(collection(db, "activities"));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast.success("All logs cleared!");
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

  if (loading) return <AdminLayout><div className="p-20 text-center font-sans font-black  text-3xl animate-pulse">INITIALIZING BACKEND CONTROL...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-sans font-bold text-white mb-2 leading-none">
            System Settings
          </h1>
          <p className="text-zinc-400 text-lg font-sans max-w-2xl leading-relaxed">
            Global system configuration and administrative tools.
          </p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={saving}
          className="bg-purple-500 hover:bg-purple-600 text-[#050505] font-bold py-3 px-8 rounded-xl transition-colors flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Configuration */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0F0F0F]">
              <h2 className="text-xl font-sans font-bold text-white flex items-center gap-3">
                <SettingsIcon className="w-5 h-5 text-purple-400" /> System Configuration
              </h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-[#050505] border border-white/5 rounded-xl p-6 flex items-center justify-between group hover:border-white/10 transition-all">
                  <div>
                    <div className="font-sans text-zinc-200 font-medium text-sm">Maintenance Mode</div>
                    <div className="text-xs text-zinc-500 mt-1">Disable worker access globally</div>
                  </div>
                  <button 
                    onClick={() => setSystemConfig({...systemConfig, maintenanceMode: !systemConfig.maintenanceMode})}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${systemConfig.maintenanceMode ? 'bg-red-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${systemConfig.maintenanceMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-[#050505] border border-white/5 rounded-xl p-6 flex items-center justify-between group hover:border-white/10 transition-all">
                  <div>
                    <div className="font-sans text-zinc-200 font-medium text-sm">New Registrations</div>
                    <div className="text-xs text-zinc-500 mt-1">Allow new workers to join</div>
                  </div>
                  <button 
                    onClick={() => setSystemConfig({...systemConfig, allowNewRegistrations: !systemConfig.allowNewRegistrations})}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${systemConfig.allowNewRegistrations ? 'bg-purple-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${systemConfig.allowNewRegistrations ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#050505] border border-white/5 rounded-xl p-6 group hover:border-white/10 transition-all">
                  <label className="block text-sm font-medium mb-3 text-zinc-400">Global Payout Multiplier</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" step="0.1" min="0.1" max="5.0"
                      value={systemConfig.globalMultiplier}
                      onChange={(e) => setSystemConfig({...systemConfig, globalMultiplier: parseFloat(e.target.value)})}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors text-xl font-sans"
                    />
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-sans font-bold text-purple-400 text-lg">
                      X
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-3">Boosts all task payouts by this factor.</p>
                </div>

                <div className="bg-[#050505] border border-white/5 rounded-xl p-6 group hover:border-white/10 transition-all">
                  <label className="block text-sm font-medium mb-3 text-zinc-400">Min. Withdrawal ($)</label>
                  <input 
                    type="number" step="1" min="1"
                    value={systemConfig.minWithdrawal}
                    onChange={(e) => setSystemConfig({...systemConfig, minWithdrawal: parseInt(e.target.value)})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors text-xl font-sans"
                  />
                  <p className="text-xs text-zinc-500 mt-3">Minimum balance required for payout.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Management */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0F0F0F]">
              <h2 className="text-xl font-sans font-bold text-white flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" /> Admin Access
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input 
                  id="admin-email"
                  type="email" 
                  placeholder="User email to promote..."
                  className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('admin-email') as HTMLInputElement;
                    if (input.value) handlePromoteAdmin(input.value);
                  }}
                  className="bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-8 rounded-xl transition-colors border border-white/10"
                >
                  Promote
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {admins.map(admin => (
                  <div key={admin.id} className="bg-[#050505] border border-white/5 rounded-xl p-4 flex items-center gap-4 group hover:border-white/10 transition-all">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-sans font-bold text-lg text-purple-400">
                      {admin.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-zinc-200 text-sm font-medium truncate">{admin.name}</div>
                      <div className="text-xs text-zinc-500 truncate mt-0.5">{admin.email}</div>
                    </div>
                    <div className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-medium tracking-wide">
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
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-sans font-bold text-white mb-6">System Tools</h2>
            <div className="space-y-4">
              <button 
                onClick={handleClearLogs}
                className="w-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Clear Activity Logs
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-medium py-3 px-4 rounded-xl transition-colors border border-white/10 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Restart App Instance
              </button>
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-red-400/80 text-xs leading-relaxed">
                <AlertTriangle className="w-5 h-5 mb-2 text-red-400" />
                Warning: These actions are irreversible. Use with caution.
              </div>
            </div>
          </div>

          {/* Detailed Activity Log */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 bg-[#0F0F0F] flex items-center justify-between">
              <h2 className="text-lg font-sans font-bold text-white">System Log</h2>
              <Activity className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="max-h-[600px] overflow-auto divide-y divide-white/5">
              {logs.map(log => (
                <div key={log.id} className="p-6 hover:bg-white/[0.02] transition-all group">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="text-xs font-sans text-zinc-300 capitalize bg-white/5 border border-white/10 px-2 py-1 rounded-md">{log.type?.replace('_', ' ')}</div>
                    <div className="text-xs text-zinc-500">{log.createdAt?.toDate ? format(log.createdAt.toDate(), "HH:mm:ss") : ""}</div>
                  </div>
                  <div className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors font-sans">{log.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
