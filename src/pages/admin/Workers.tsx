import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import WorkerDetailsModal from "@/components/WorkerDetailsModal";

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workerStats, setWorkerStats] = useState<Record<string, { completionRate: number, avgRating: number }>>({});
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const workersData = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((w: any) => w.role === "worker");
      setWorkers(workersData);
      
      // Fetch stats for each worker
      const stats: Record<string, { completionRate: number, avgRating: number }> = {};
      for (const worker of workersData) {
        try {
          const assignmentsQuery = query(collection(db, "assignments"), where("workerId", "==", worker.id));
          const assignmentsSnap = await getDocs(assignmentsQuery);
          const assignments = assignmentsSnap.docs.map(d => d.data());
          
          const totalTasks = assignments.length;
          const completedTasks = assignments.filter(a => a.status === "approved").length;
          const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          // Mock rating for now, as there is no rating system yet
          const avgRating = 4.5 + (Math.random() * 0.5); 
          
          stats[worker.id] = { completionRate, avgRating };
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, "assignments");
        }
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

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-sans">Worker Roster</h1>
          <p className="text-zinc-400 font-sans">Manage your workforce, approve applications, and track earnings.</p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-[#050505] border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold whitespace-nowrap">Worker</th>
                <th className="p-4 font-semibold whitespace-nowrap">Contact</th>
                <th className="p-4 font-semibold whitespace-nowrap">Stats</th>
                <th className="p-4 font-semibold whitespace-nowrap">Earnings</th>
                <th className="p-4 font-semibold whitespace-nowrap">Status</th>
                <th className="p-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {workers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-white/40">No workers found.</td>
                </tr>
              ) : (
                workers.map((worker, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={worker.id} 
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                        {worker.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          worker.trustTier === 'Premium' ? 'bg-amber-500/20 text-amber-400' :
                          worker.trustTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {worker.trustTier || 'New'}
                        </span>
                      </div>
                      <div className="text-xs text-white/40">ID: {worker.uid.substring(0, 8)}...</div>
                      <div className="text-xs text-white/40">Joined: {worker.createdAt?.toDate ? format(worker.createdAt.toDate(), "MMM d, yyyy") : "Unknown"}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm text-white/80">{worker.email}</div>
                      <div className="text-xs text-purple-400">{worker.telegram}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm text-white/80">
                        {workerStats[worker.id]?.completionRate || 0}% Completion
                      </div>
                      <div className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                        ★ {worker.averageRating ? worker.averageRating.toFixed(1) : 'N/A'} ({worker.ratingCount || 0})
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">${(worker.earnings || 0).toFixed(2)}</div>
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
                        <select 
                          value={worker.status}
                          onChange={(e) => handleStatusChange(worker.id, e.target.value)}
                          className="bg-[#050505] border border-white/10 rounded-xl p-2 text-sm text-white outline-none focus:border-purple-500 transition-colors cursor-pointer hover:bg-white/5"
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
    </AdminLayout>
  );
}
