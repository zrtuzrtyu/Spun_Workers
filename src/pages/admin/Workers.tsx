import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, where, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Eye, Trash2, TrendingUp, Loader2 } from "lucide-react";
import WorkerDetailsModal from "@/components/WorkerDetailsModal";

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<Record<string, { completionRate: number, avgRating: number, totalCompleted: number }>>({});
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const workersData: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((w: any) => w.role === "worker");
      setWorkers(workersData);
      
      try {
        const assignmentsSnap = await getDocs(collection(db, "assignments"));
        const allAssignments = assignmentsSnap.docs.map(d => d.data());
        
        const stats: Record<string, { completionRate: number, avgRating: number, totalCompleted: number }> = {};
        
        for (const worker of workersData) {
          const workerAssignments = allAssignments.filter((a: any) => a.workerId === worker.id);
          const totalCompleted = workerAssignments.filter((a: any) => a.status === 'approved' || a.status === 'completed').length;
          const totalRejected = workerAssignments.filter((a: any) => a.status === 'rejected').length;
          
          const settledTasks = totalCompleted + totalRejected;
          const completionRate = settledTasks > 0 ? Math.round((totalCompleted / settledTasks) * 100) : 0;
          
          stats[worker.id] = { 
            completionRate,
            avgRating: worker.averageRating || 0,
            totalCompleted
          };
        }
        setWorkerStats(stats);
      } catch (error) {
        console.error("Failed to calculate stats", error);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsub();
  }, []);

  const runPromotionEngine = async () => {
    setIsPromoting(true);
    let promotedCount = 0;
    try {
      for (const worker of workers) {
        const stats = workerStats[worker.id];
        if (!stats) continue;

        const currentTier = worker.trustTier || 'New';
        let newTier = 'New';
        
        // Promotion Criteria
        if (stats.totalCompleted >= 20 && stats.completionRate >= 90 && stats.avgRating >= 4.5) {
          newTier = 'Premium';
        } else if (stats.totalCompleted >= 5 && stats.completionRate >= 80 && stats.avgRating >= 4.0) {
          newTier = 'Trusted';
        }

        // Demotion Criteria (optional, but good for maintaining quality)
        if (newTier === 'Premium' && (stats.completionRate < 85 || stats.avgRating < 4.3)) {
           newTier = 'Trusted';
        }
        if (newTier === 'Trusted' && (stats.completionRate < 70 || stats.avgRating < 3.5)) {
           newTier = 'New';
        }

        if (newTier !== currentTier) {
          await updateDoc(doc(db, "users", worker.id), { trustTier: newTier });
          promotedCount++;
        }
      }
      if (promotedCount > 0) {
        toast.success(`Evaluation complete! Promoted or adjusted ${promotedCount} workers.`);
      } else {
        toast.info("Evaluation complete. No tier adjustments needed.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to run promotion engine.");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleStatusChange = async (workerId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "users", workerId), { status: newStatus });
      toast.success(`Worker status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    }
  };

  const [workerToDelete, setWorkerToDelete] = useState<any | null>(null);

  const handleDeleteWorker = async (workerId: string) => {
    try {
      await deleteDoc(doc(db, "users", workerId));
      toast.success("Worker deleted successfully");
      setWorkerToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "users");
    }
  };

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2 font-sans">Worker Roster</h1>
          <p className="text-muted-foreground font-sans">Manage your workforce, approve applications, and track earnings.</p>
        </div>
        <button
          onClick={runPromotionEngine}
          disabled={isPromoting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isPromoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          Run Promotion Engine
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm relative"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold whitespace-nowrap">Worker</th>
                <th className="p-4 font-semibold whitespace-nowrap">Contact</th>
                <th className="p-4 font-semibold whitespace-nowrap">Stats</th>
                <th className="p-4 font-semibold whitespace-nowrap">Earnings</th>
                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No workers found.</td>
                </tr>
              ) : (
                workers.map((worker, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={worker.id} 
                    className="hover:bg-muted/50 transition-colors group"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        {worker.name}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider ${
                          worker.trustTier === 'Premium' ? 'bg-amber-500/20 text-amber-400' :
                          worker.trustTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {worker.trustTier || 'New'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">ID: {worker.uid.substring(0, 8)}...</div>
                      <div className="text-xs text-muted-foreground">Joined: {worker.createdAt?.toDate ? format(worker.createdAt.toDate(), "MMM d, yyyy") : "Unknown"}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm text-foreground/80">{worker.email}</div>
                      <div className="text-xs text-primary">{worker.telegram}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm text-foreground/80">
                        {workerStats[worker.id]?.completionRate || 0}% Completion
                      </div>
                      <div className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                        ★ {worker.averageRating ? worker.averageRating.toFixed(1) : 'N/A'} ({worker.ratingCount || 0})
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-transparent bg-clip-text bg-primary to-pink-400">${(worker.earnings || 0).toFixed(2)}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider ${
                        (worker.status || 'pending') === 'active' ? 'bg-primary/20 text-primary border border-primary/30' :
                        (worker.status || 'pending') === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {(worker.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedWorker(worker)}
                          className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setWorkerToDelete(worker)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                          title="Delete Worker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <select 
                          value={worker.status || 'pending'}
                          onChange={(e) => handleStatusChange(worker.id, e.target.value)}
                          className="bg-background border border-border rounded-xl p-2 text-sm text-foreground outline-none focus:border-primary transition-colors cursor-pointer hover:bg-muted/50"
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {selectedWorker && (
        <WorkerDetailsModal 
          worker={selectedWorker} 
          onClose={() => setSelectedWorker(null)} 
        />
      )}

      {workerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-md"
          >
            <h3 className="text-xl font-semibold text-foreground mb-2">Delete Worker</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete worker <span className="text-foreground font-semibold">{workerToDelete.name}</span>? This action is irreversible.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setWorkerToDelete(null)}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteWorker(workerToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-foreground font-semibold transition-colors shadow-sm shadow-red-500/20"
              >
                Delete Worker
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
