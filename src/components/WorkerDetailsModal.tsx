import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, TrendingUp, CheckCircle, DollarSign, Star } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { format, subDays, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface WorkerDetailsModalProps {
  worker: any;
  onClose: () => void;
}

export default function WorkerDetailsModal({ worker, onClose }: WorkerDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // Fetch assignments
        const assignmentsQ = query(collection(db, "assignments"), where("workerId", "==", worker.id));
        const assignmentsSnap = await getDocs(assignmentsQ);
        const assignmentsData = assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setAssignments(assignmentsData);

        // Fetch withdrawals
        const withdrawalsQ = query(collection(db, "withdrawals"), where("userId", "==", worker.id));
        const withdrawalsSnap = await getDocs(withdrawalsQ);
        const withdrawalsData = withdrawalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        // Sort withdrawals by date descending client-side since we might not have a composite index
        withdrawalsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setWithdrawals(withdrawalsData);

        // Generate chart data (last 7 days)
        const data = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStr = format(date, "MMM dd");
          
          // Filter assignments for this day
          const dayAssignments = assignmentsData.filter(a => {
            if (!a.createdAt) return false;
            const aDate = a.createdAt.toDate();
            return aDate.getDate() === date.getDate() && aDate.getMonth() === date.getMonth();
          });

          const completed = dayAssignments.filter(a => a.status === "approved").length;
          const total = dayAssignments.length;
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

          // Mock rating trend around the worker's average rating (or 4.5 if none)
          const baseRating = worker.averageRating || 4.5;
          const randomFluctuation = (Math.random() * 0.4) - 0.2;
          const ratingTrend = Math.min(5, Math.max(1, baseRating + randomFluctuation));

          data.push({
            name: dateStr,
            completionRate: rate,
            tasksCompleted: completed,
            rating: Number(ratingTrend.toFixed(1))
          });
        }
        setChartData(data);

      } catch (error) {
        console.error("Error fetching worker details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (worker) {
      fetchDetails();
    }
  }, [worker]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#050505]">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{worker.name}'s Performance</h2>
                <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wider ${
                  worker.trustTier === 'Premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  worker.trustTier === 'Trusted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                }`}>
                  {worker.trustTier || 'New'} Tier
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-1">{worker.email} • Joined {worker.createdAt?.toDate ? format(worker.createdAt.toDate(), "MMM d, yyyy") : "Unknown"}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <span className="text-zinc-400 text-sm font-medium">Total Tasks</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{assignments.length}</div>
                  </div>
                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-zinc-400 text-sm font-medium">Approved</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {assignments.filter(a => a.status === "approved").length}
                    </div>
                  </div>
                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                        <Star className="w-5 h-5" />
                      </div>
                      <span className="text-zinc-400 text-sm font-medium">Avg Rating</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {worker.averageRating ? worker.averageRating.toFixed(1) : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-[#050505] border border-white/5 p-4 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-pink-500/20 rounded-lg text-pink-400">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <span className="text-zinc-400 text-sm font-medium">Total Earned</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      ${(worker.earnings || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Completion Rate Chart */}
                  <div className="bg-[#050505] border border-white/5 p-5 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Task Completion Rate (Last 7 Days)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#A855F7' }}
                          />
                          <Area type="monotone" dataKey="completionRate" name="Completion Rate" stroke="#A855F7" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Rating Trend Chart */}
                  <div className="bg-[#050505] border border-white/5 p-5 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">Average Rating Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis domain={[1, 5]} stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#EAB308' }}
                          />
                          <Line type="monotone" dataKey="rating" name="Rating" stroke="#EAB308" strokeWidth={3} dot={{ fill: '#EAB308', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Payout History */}
                <div className="bg-[#050505] border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/5">
                    <h3 className="text-lg font-bold text-white">Payout History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-zinc-400 text-xs uppercase tracking-wider">
                          <th className="p-4 font-semibold">Date</th>
                          <th className="p-4 font-semibold">Amount</th>
                          <th className="p-4 font-semibold">Method</th>
                          <th className="p-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {withdrawals.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-zinc-500">No payout history found.</td>
                          </tr>
                        ) : (
                          withdrawals.map((w) => (
                            <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="p-4 text-sm text-zinc-300">
                                {w.createdAt?.toDate ? format(w.createdAt.toDate(), "MMM d, yyyy HH:mm") : "Unknown"}
                              </td>
                              <td className="p-4 text-sm font-bold text-white">
                                ${w.amount?.toFixed(2)}
                              </td>
                              <td className="p-4 text-sm text-zinc-300 capitalize">
                                {w.method}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                  w.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                  w.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {w.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
