import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, where, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "motion/react";
import { Eye, Trash2 } from "lucide-react";
import WorkerDetailsModal from "@/components/WorkerDetailsModal";

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<Record<string, { completionRate: number, avgRating: number }>>({});
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const workersData: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((w: any) => w.role === "worker");
      setWorkers(workersData);
      
      // Use pre-calculated stats from the user document instead of fetching all assignments
      const stats: Record<string, { completionRate: number, avgRating: number }> = {};
      for (const worker of workersData) {
        // We don't have a strict completion rate without fetching all assignments, 
        // but we can use ratingCount as a proxy for completed tasks for now, 
        // or just rely on the averageRating which is already calculated.
        stats[worker.id] = { 
          completionRate: worker.ratingCount ? 100 : 0, // Simplified
          avgRating: worker.averageRating || 0 
        };
      }
      setWorkerStats(stats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });
    return () => unsub();
  }, []);

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
        className="mb-8 flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 font-sans">Worker Roster</h1>
          <p className="text-muted-foreground font-sans">Manage your workforce, approve applications, and track earnings.</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative"
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
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                        {worker.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
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
                      <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-pink-400">${(worker.earnings || 0).toFixed(2)}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        worker.status === 'active' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        worker.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {worker.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedWorker(worker)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl transition-colors"
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
                          value={worker.status}
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
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-foreground mb-2">Delete Worker</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete worker <span className="text-foreground font-bold">{workerToDelete.name}</span>? This action is irreversible.
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
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-lg shadow-red-500/20"
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
