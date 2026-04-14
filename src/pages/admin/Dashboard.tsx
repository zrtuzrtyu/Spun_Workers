import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { collection, query, onSnapshot, orderBy, limit, where, getDocs, getDoc, doc, updateDoc, serverTimestamp, addDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { Activity, Users, CheckSquare, DollarSign, Clock, BarChart3, Trash2, Star } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Bar, Legend } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    workers: 0, 
    pendingTasks: 0, 
    totalPayouts: 0,
    avgProcessingHours: 0,
    overallCompletionRate: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    // System Config
    const unsubConfig = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        setSystemConfig(snap.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "system/config");
    });

    // Stats
    const fetchStats = async () => {
      const workersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "worker"), where("status", "==", "active")));
      const pendingAssignmentsSnap = await getDocs(query(collection(db, "assignments"), where("status", "==", "submitted")));
      
      const allAssignmentsSnap = await getDocs(collection(db, "assignments"));
      const allWithdrawalsSnap = await getDocs(collection(db, "withdrawals"));
      
      const assignments = allAssignmentsSnap.docs.map(d => d.data());
      const withdrawals = allWithdrawalsSnap.docs.map(d => d.data());

      let totalWorkerEarnings = 0;
      workersSnap.forEach(doc => {
        totalWorkerEarnings += doc.data().earnings || 0;
      });

      // Calculate Processing Times
      const processedWithdrawals = withdrawals.filter(w => w.status === 'paid' && w.createdAt && w.processedAt);
      let totalProcessingTime = 0;
      processedWithdrawals.forEach(w => {
        const created = w.createdAt.toDate().getTime();
        const processed = w.processedAt.toDate().getTime();
        totalProcessingTime += (processed - created);
      });
      const avgProcessingHours = processedWithdrawals.length > 0 
        ? (totalProcessingTime / processedWithdrawals.length) / (1000 * 60 * 60) 
        : 0;

      // Calculate Overall Completion Rate
      const totalAssignments = assignments.length;
      const approvedAssignments = assignments.filter(a => a.status === 'approved').length;
      const overallCompletionRate = totalAssignments > 0 ? (approvedAssignments / totalAssignments) * 100 : 0;

      setStats({
        workers: workersSnap.size,
        pendingTasks: pendingAssignmentsSnap.size,
        totalPayouts: totalWorkerEarnings,
        avgProcessingHours,
        overallCompletionRate
      });

      // Generate real chart data for the last 7 days
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, 'MMM dd');
        
        const dayAssignments = assignments.filter(a => {
          const date = a.submittedAt?.toDate() || a.assignedAt?.toDate() || a.createdAt?.toDate();
          if (!date) return false;
          return date.getDate() === d.getDate() && date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
        });

        const submissions = dayAssignments.length;
        const approvals = dayAssignments.filter(a => a.status === 'approved').length;
        const completionRate = submissions > 0 ? (approvals / submissions) * 100 : 0;

        const approvedWithRating = dayAssignments.filter(a => a.status === 'approved' && a.rating);
        const avgRating = approvedWithRating.length > 0 
          ? approvedWithRating.reduce((sum, a) => sum + a.rating, 0) / approvedWithRating.length 
          : 0;

        const uniqueWorkers = new Set(dayAssignments.map(a => a.workerId)).size;

        const dayWithdrawals = processedWithdrawals.filter(w => {
          const date = w.processedAt?.toDate();
          if (!date) return false;
          return date.getDate() === d.getDate() && date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
        });

        let dayProcessingTime = 0;
        dayWithdrawals.forEach(w => {
          const created = w.createdAt.toDate().getTime();
          const processed = w.processedAt.toDate().getTime();
          dayProcessingTime += (processed - created);
        });
        const dayAvgProcessingHours = dayWithdrawals.length > 0 
          ? (dayProcessingTime / dayWithdrawals.length) / (1000 * 60 * 60) 
          : 0;

        return {
          name: dateStr,
          submissions,
          approvals,
          completionRate: Math.round(completionRate),
          avgRating: Number(avgRating.toFixed(1)) || 0,
          activeWorkers: uniqueWorkers,
          avgProcessingTime: Number(dayAvgProcessingHours.toFixed(1)) || 0
        };
      });
      setChartData(last7Days);
    };
    fetchStats();

    // Recent Activities
    const qActivities = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(10));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "activities");
    });

    // Pending Submissions
    const qSubmissions = query(collection(db, "assignments"), where("status", "==", "submitted"), limit(5));
    const unsubSubmissions = onSnapshot(qSubmissions, async (snap) => {
      const subs = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const taskRef = doc(db, "tasks", data.taskId);
        const taskDoc = await getDoc(taskRef);
        
        const workerSnap = await getDoc(doc(db, "users", data.workerId));
        
        return { 
          id: d.id, 
          ...data, 
          taskTitle: taskDoc.exists() ? taskDoc.data().title : "Unknown Task",
          payout: taskDoc.exists() ? taskDoc.data().payout : 0,
          workerName: workerSnap.exists() ? workerSnap.data().name : "Unknown Worker"
        };
      }));
      setPendingSubmissions(subs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "assignments");
    });

    // Pending Requests
    const qRequests = query(collection(db, "requests"), where("status", "==", "pending_approval"), limit(5));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "requests");
    });

    // Payouts
    const qPayouts = query(collection(db, "payouts"), orderBy("createdAt", "desc"), limit(10));
    const unsubPayouts = onSnapshot(qPayouts, (snap) => {
      setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "payouts");
    });

    return () => {
      unsubConfig();
      unsubActivities();
      unsubSubmissions();
      unsubRequests();
      unsubPayouts();
    };
  }, []);

  const handleApprove = async (assignmentId: string, workerId: string, payout: number, taskId: string, taskTitle: string) => {
    const rating = ratings[assignmentId] || 5; // Default to 5 stars if not set
    try {
      const assignmentRef = doc(db, "assignments", assignmentId);
      await updateDoc(assignmentRef, {
        status: "approved",
        reviewedAt: serverTimestamp(),
        rating: rating
      });

      const workerRef = doc(db, "users", workerId);
      const workerSnap = await getDoc(workerRef);
      const workerName = workerSnap.exists() ? workerSnap.data().name : workerId;
      
      if (workerSnap.exists()) {
        const data = workerSnap.data();
        const newRatingCount = (data.ratingCount || 0) + 1;
        const newTotalRating = (data.totalRating || 0) + rating;
        const newAverageRating = newTotalRating / newRatingCount;

        // Auto-promotion logic
        let newTrustTier = data.trustTier || "New";
        if (newRatingCount >= 10 && newAverageRating >= 4.5) {
          newTrustTier = "Premium";
        } else if (newRatingCount >= 3 && newAverageRating >= 3.5) {
          newTrustTier = "Trusted";
        }

        await updateDoc(workerRef, {
          earnings: (data.earnings || 0) + payout,
          balance: (data.balance || 0) + payout,
          ratingCount: newRatingCount,
          totalRating: newTotalRating,
          averageRating: newAverageRating,
          trustTier: newTrustTier
        });
        
        if (newTrustTier !== (data.trustTier || "New")) {
          toast.success(`${workerName} was promoted to ${newTrustTier} Tier!`);
        }
      }

      await addDoc(collection(db, "activities"), {
        type: "task_approved",
        description: `Task approved for worker ${workerName}`,
        createdAt: serverTimestamp(),
        userId: workerId,
        taskId: taskId,
        taskTitle: taskTitle,
        workerName: workerName,
        amount: payout
      });

      await addDoc(collection(db, "payouts"), {
        taskId,
        taskTitle,
        workerId,
        workerName,
        amount: payout,
        createdAt: serverTimestamp()
      });

      toast.success("Submission approved!");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `assignments/${assignmentId}`);
    }
  };

  const handleReject = async (assignmentId: string, workerId: string, taskId: string, taskTitle: string, workerName: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;

    try {
      const assignmentRef = doc(db, "assignments", assignmentId);
      await updateDoc(assignmentRef, {
        status: "rejected",
        rejectionReason: reason,
        reviewedAt: serverTimestamp()
      });

      await addDoc(collection(db, "activities"), {
        type: "task_rejected",
        description: `Task submission rejected for ${workerName}. Reason: ${reason}`,
        createdAt: serverTimestamp(),
        userId: workerId,
        taskId: taskId,
        taskTitle: taskTitle,
        workerName: workerName
      });

      toast.success("Submission rejected.");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignmentId}`);
    }
  };

  const handleDeleteSubmission = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this submission record?")) return;
    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      toast.success("Submission deleted.");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentId}`);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "open"
      });
      toast.success("Request approved and published.");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "rejected"
      });
      toast.success("Request rejected.");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
        <div>
          <h1 className="text-4xl font-sans font-bold text-white mb-2 leading-none">
            Command Center
          </h1>
          <p className="text-zinc-400 text-lg font-sans max-w-2xl leading-relaxed">
            Monitor your global workforce and mission completion in real-time. System status is currently optimal.
          </p>
        </div>
        {systemConfig && (
          <div className="flex flex-wrap gap-4">
            <div className={`px-4 py-2 rounded-xl border font-sans text-xs font-medium flex items-center gap-3 ${
              systemConfig.maintenanceMode 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${systemConfig.maintenanceMode ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`} />
              {systemConfig.maintenanceMode ? 'Maintenance Active' : 'System Operational'}
            </div>
            <div className={`px-4 py-2 rounded-xl border font-sans text-xs font-medium flex items-center gap-3 ${
              systemConfig.allowNewRegistrations 
                ? 'bg-white/5 text-white border-white/10' 
                : 'bg-white/5 text-white/40 border-white/10'
            }`}>
              <Users className="w-4 h-4" />
              {systemConfig.allowNewRegistrations ? 'Registrations Open' : 'Registrations Closed'}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex items-center gap-6 group hover:bg-white/5 transition-all shadow-xl">
          <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-sans font-bold text-white tracking-tight">{stats.workers}</div>
            <div className="text-xs text-zinc-400 mt-1">Active Workforce</div>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex items-center gap-6 group hover:bg-white/5 transition-all shadow-xl">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-sans font-bold text-white tracking-tight">{stats.pendingTasks}</div>
            <div className="text-xs text-zinc-400 mt-1">Pending Reviews</div>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex items-center gap-6 group hover:bg-white/5 transition-all shadow-xl">
          <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-105 transition-transform">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-sans font-bold text-white tracking-tight">${stats.totalPayouts.toFixed(2)}</div>
            <div className="text-xs text-zinc-400 mt-1">Total Payouts</div>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex items-center gap-6 group hover:bg-white/5 transition-all shadow-xl">
          <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-sans font-bold text-white tracking-tight">{stats.overallCompletionRate.toFixed(1)}%</div>
            <div className="text-xs text-zinc-400 mt-1">Completion Rate</div>
          </div>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 flex items-center gap-6 group hover:bg-white/5 transition-all shadow-xl">
          <div className="w-14 h-14 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="text-3xl font-sans font-bold text-white tracking-tight">{stats.avgProcessingHours.toFixed(1)}h</div>
            <div className="text-xs text-zinc-400 mt-1">Avg Payout Time</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-sans font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-400" /> Mission Analytics
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} />
                <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontWeight: '500', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="submissions" name="Submissions" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="approvals" name="Approvals" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-sans font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" /> Live Worker Activity
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWorkers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontWeight: '500', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="activeWorkers" name="Active Workers" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWorkers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-sans font-bold text-white flex items-center gap-3">
              <Clock className="w-6 h-6 text-pink-400" /> Payout Processing Times
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => `${val}h`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontWeight: '500', fontSize: '12px' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="avgProcessingTime" name="Avg Processing Time (Hours)" stroke="#ec4899" strokeWidth={3} dot={{ r: 6, fill: '#ec4899', strokeWidth: 2, stroke: '#0A0A0A' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-sans font-bold text-white flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-400" /> Worker Performance Trend
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" domain={[1, 5]} stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#71717a" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontWeight: '500', fontSize: '12px' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line yAxisId="left" type="monotone" dataKey="avgRating" name="Avg Rating (1-5)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#0A0A0A' }} activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#0A0A0A' }} activeDot={{ r: 8 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Pending Submissions */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F]">
            <h2 className="text-xl font-sans font-bold text-white tracking-tight">Pending Reviews</h2>
            <span className="bg-purple-500/20 text-purple-400 text-xs font-medium px-3 py-1 rounded-full border border-purple-500/30">{pendingSubmissions.length} Pending</span>
          </div>
          <div className="divide-y divide-white/5">
            {pendingSubmissions.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">No pending missions.</div>
            ) : (
              pendingSubmissions.map((sub) => (
                <div key={sub.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="font-sans font-bold text-white text-xl tracking-tight mb-2">{sub.taskTitle}</div>
                      <div className="text-sm text-zinc-400 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400">
                            {sub.workerName?.[0]}
                          </div>
                          {sub.workerName}
                        </div>
                        <span className="text-white/20">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 
                          {sub.submittedAt?.toDate ? format(sub.submittedAt.toDate(), "MMM d, h:mm a") : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="text-purple-400 font-sans font-bold text-xl">
                      ${sub.payout.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-[#050505] border border-white/5 rounded-xl p-5 mb-6">
                    <div className="text-xs text-zinc-500 font-medium mb-2">Worker Proof:</div>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-4">{sub.proofText || "No text provided."}</p>
                    {sub.proofImageUrl && (
                      <a href={sub.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors">
                        View Visual Proof <Activity className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-sm text-zinc-400">Rate work:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRatings(prev => ({ ...prev, [sub.id]: star }))}
                          className="focus:outline-none"
                        >
                          <Star 
                            className={`w-5 h-5 ${
                              (ratings[sub.id] || 5) >= star 
                                ? 'text-amber-400 fill-amber-400' 
                                : 'text-zinc-600'
                            } transition-colors`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleApprove(sub.id, sub.workerId, sub.payout, sub.taskId, sub.taskTitle)}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-[#050505] font-bold py-2.5 rounded-xl transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(sub.id, sub.workerId, sub.taskId, sub.taskTitle, sub.workerName)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl transition-colors border border-white/10"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => handleDeleteSubmission(sub.id)}
                      className="px-4 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-colors flex items-center justify-center"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-white/5 bg-[#0F0F0F]">
            <h2 className="text-xl font-sans font-bold text-white flex items-center gap-3 tracking-tight">
              <Activity className="w-5 h-5 text-purple-400" /> Activity Log
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-px before:bg-white/10">
              {activities.length === 0 ? (
                <div className="text-center text-zinc-500 py-12 text-sm">No recent log entries.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-6 group">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#050505] border border-white/10 text-zinc-400 group-hover:text-purple-400 group-hover:border-purple-500/50 z-10 transition-all duration-300">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 bg-[#050505] border border-white/5 rounded-xl p-4 group-hover:border-white/10 transition-all duration-300">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="font-sans text-zinc-300 text-xs font-medium capitalize">{act.type?.replace('_', ' ') || 'Activity'}</div>
                        <time className="text-xs text-zinc-500">{act.createdAt?.toDate ? format(act.createdAt.toDate(), "h:mm a") : ""}</time>
                      </div>
                      <div className="text-sm text-zinc-400 font-sans leading-relaxed mb-2">{act.description}</div>
                      {(act.taskId || act.userId || act.amount !== undefined) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {act.userId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-mono">
                              <span className="text-zinc-500">USR:</span> {act.userId.slice(0, 8)}...
                            </span>
                          )}
                          {act.taskId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 font-mono">
                              <span className="text-purple-500/50">TSK:</span> {act.taskId.slice(0, 8)}...
                            </span>
                          )}
                          {act.amount !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-mono">
                              <span className="text-green-500/50">AMT:</span> ${act.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pending Member Requests */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl lg:col-span-2">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F]">
            <h2 className="text-xl font-sans font-bold text-white tracking-tight">Pending Member Requests</h2>
            <span className="bg-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1 rounded-full border border-blue-500/30">{pendingRequests.length} Pending</span>
          </div>
          <div className="divide-y divide-white/5">
            {pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">No pending member requests.</div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="p-6 hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-sans font-bold text-white text-xl tracking-tight mb-2">{req.title}</div>
                      <div className="text-sm text-zinc-400 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                            {req.requesterName?.[0]}
                          </div>
                          {req.requesterName}
                        </div>
                        <span className="text-white/20">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 
                          {req.createdAt?.toDate ? format(req.createdAt.toDate(), "MMM d, h:mm a") : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="text-blue-400 font-sans font-bold text-xl">
                      ${req.offerAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-[#050505] border border-white/5 rounded-xl p-5 mb-6">
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{req.description}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleApproveRequest(req.id)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-[#050505] font-bold py-2.5 rounded-xl transition-colors"
                    >
                      Approve & Publish
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-xl transition-colors border border-white/10"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="mt-12 bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-white/5 bg-[#0F0F0F]">
          <h2 className="text-xl font-sans font-bold text-white flex items-center gap-3 tracking-tight">
            <DollarSign className="w-5 h-5 text-purple-400" /> Transaction Ledger
          </h2>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead>
                <tr>
                  <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                  <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Worker</th>
                  <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Task</th>
                  <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-sm">No transactions recorded.</td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                        {payout.createdAt?.toDate ? format(payout.createdAt.toDate(), "MMM d, yyyy h:mm a") : "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-sans text-purple-400 text-xs font-medium">
                            {payout.workerName?.[0]}
                          </div>
                          <span className="font-sans font-medium text-zinc-200">{payout.workerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-sans text-zinc-400 text-sm">
                        {payout.taskTitle || payout.taskId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-purple-400 font-sans font-medium">
                          ${payout.amount?.toFixed(2)}
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
    </AdminLayout>
  );
}
