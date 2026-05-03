import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { collection, query, onSnapshot, orderBy, limit, where, getDocs, getDoc, doc, updateDoc, serverTimestamp, addDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { Activity, Users, CheckSquare, DollarSign, Clock, BarChart3, Trash2, Star, Wallet } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Bar, Legend } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    workers: 0, 
    pendingTasks: 0, 
    totalPayouts: 0,
    avgProcessingHours: 0,
    overallCompletionRate: 0,
    activeTasks: 0,
    pendingWithdrawals: 0,
    totalUnpaidBalance: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingWithdrawalsList, setPendingWithdrawalsList] = useState<any[]>([]);
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
      try {
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "worker")));
        const activeWorkers = usersSnap.docs.filter(doc => doc.data().status === "active");
        
        const pendingAssignmentsSnap = await getDocs(query(collection(db, "assignments"), where("status", "==", "submitted")));
        const activeTasksSnap = await getDocs(query(collection(db, "tasks"), where("status", "==", "active")));
        const pendingWithdrawalsSnap = await getDocs(query(collection(db, "withdrawals"), where("status", "==", "pending")));
        
        const allAssignmentsSnap = await getDocs(collection(db, "assignments"));
        const allWithdrawalsSnap = await getDocs(collection(db, "withdrawals"));
        
        const assignments = allAssignmentsSnap.docs.map(d => d.data());
        const withdrawals = allWithdrawalsSnap.docs.map(d => d.data());

        let totalWorkerEarnings = 0;
        let totalUnpaidBalance = 0;
        activeWorkers.forEach(doc => {
          totalWorkerEarnings += doc.data().earnings || 0;
          totalUnpaidBalance += doc.data().balance || 0;
        });

      const paidWithdrawals = withdrawals.filter(w => w.status === 'paid');
      const totalPayouts = paidWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

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
        workers: activeWorkers.length,
        pendingTasks: pendingAssignmentsSnap.size,
        totalPayouts: totalPayouts,
        avgProcessingHours,
        overallCompletionRate,
        activeTasks: activeTasksSnap.size,
        pendingWithdrawals: pendingWithdrawalsSnap.size,
        totalUnpaidBalance
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
      } catch (err) { console.warn("Missing index on admin load", err) }
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

    // Pending Withdrawals
    const qPendingWithdrawals = query(collection(db, "withdrawals"), where("status", "==", "pending"), limit(5));
    const unsubPendingWithdrawals = onSnapshot(qPendingWithdrawals, async (snap) => {
      const wList = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const workerSnap = await getDoc(doc(db, "users", data.workerId));
        return {
          id: d.id,
          ...data,
          workerName: workerSnap.exists() ? workerSnap.data().name : "Unknown Worker",
          workerEmail: workerSnap.exists() ? workerSnap.data().email : "Unknown Email",
          workerBalance: workerSnap.exists() ? workerSnap.data().balance : 0
        };
      }));
      setPendingWithdrawalsList(wList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "withdrawals");
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
      unsubPendingWithdrawals();
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

  const [rejectionData, setRejectionData] = useState<{assignmentId: string, workerId: string, taskId: string, taskTitle: string, workerName: string} | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReject = async () => {
    if (!rejectionData || !rejectionReason.trim()) return;

    const { assignmentId, workerId, taskId, taskTitle, workerName } = rejectionData;

    try {
      const assignmentRef = doc(db, "assignments", assignmentId);
      await updateDoc(assignmentRef, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
        reviewedAt: serverTimestamp()
      });

      await addDoc(collection(db, "activities"), {
        type: "task_rejected",
        description: `Task submission rejected for ${workerName}. Reason: ${rejectionReason.trim()}`,
        createdAt: serverTimestamp(),
        userId: workerId,
        taskId: taskId,
        taskTitle: taskTitle,
        workerName: workerName
      });

      toast.success("Submission rejected.");
      setRejectionData(null);
      setRejectionReason("");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignmentId}`);
    }
  };

  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);

  const handleDeleteSubmission = async (assignmentId: string) => {
    try {
      await deleteDoc(doc(db, "assignments", assignmentId));
      toast.success("Submission deleted.");
      setSubmissionToDelete(null);
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

  const handleApproveWithdrawal = async (withdrawalId: string, workerId: string, amount: number, workerName: string) => {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      const workerRef = doc(db, "users", workerId);

      const workerSnap = await getDoc(workerRef);
      if (!workerSnap.exists()) {
        toast.error("Worker not found");
        return;
      }

      const currentBalance = workerSnap.data().balance || 0;
      if (currentBalance < amount) {
        toast.error("Worker has insufficient balance for this withdrawal");
        return;
      }

      await updateDoc(withdrawalRef, {
        status: "paid",
        processedAt: serverTimestamp()
      });

      await updateDoc(workerRef, {
        balance: currentBalance - amount
      });

      await addDoc(collection(db, "activities"), {
        type: "payout",
        description: `Processed payout of $${amount.toFixed(2)} to ${workerName}`,
        createdAt: serverTimestamp()
      });

      toast.success("Withdrawal marked as paid");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, "withdrawals");
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      await updateDoc(withdrawalRef, {
        status: "rejected",
        processedAt: serverTimestamp()
      });
      toast.success("Withdrawal rejected");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, "withdrawals");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-sans font-semibold text-foreground leading-none">
              Command Center
            </h1>
            <Link to="/worker">
              <Button variant="outline" size="sm" className="bg-background/5 border-border text-foreground hover:bg-muted/50 gap-2 h-8 text-xs">
                <Users className="w-3.5 h-3.5" />
                Worker View
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground text-sm font-sans max-w-2xl leading-relaxed">
            Monitor your global workforce and mission completion in real-time. System status is currently optimal.
          </p>
        </div>
        {systemConfig && (
          <div className="flex flex-wrap gap-3">
            <div className={`px-3 py-1.5 rounded-xl border font-sans text-xs uppercase font-semibold tracking-widest flex items-center gap-2 ${
              systemConfig.maintenanceMode 
                ? 'bg-destructive/20 text-destructive border-destructive/30' 
                : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${systemConfig.maintenanceMode ? 'bg-destructive animate-pulse' : 'bg-primary'}`} />
              {systemConfig.maintenanceMode ? 'Maintenance Active' : 'System Operational'}
            </div>
            <div className={`px-3 py-1.5 rounded-xl border font-sans text-xs uppercase font-semibold tracking-widest flex items-center gap-2 ${
              systemConfig.allowNewRegistrations 
                ? 'bg-card text-foreground border-border' 
                : 'bg-muted/50 text-muted-foreground border-border'
            }`}>
              <Users className="w-3.5 h-3.5" />
              {systemConfig.allowNewRegistrations ? 'Registrations Open' : 'Registrations Closed'}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{stats.workers}</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Active Workforce</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{stats.activeTasks}</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Active Tasks</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{stats.pendingTasks}</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Pending Reviews</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{stats.pendingWithdrawals}</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Pending Withdrawals</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-600 group-hover:scale-105 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">${stats.totalPayouts.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Total Payouts</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 group-hover:scale-105 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">${stats.totalUnpaidBalance.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Total Unpaid Balance</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{stats.overallCompletionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Completion Rate</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-[1.5rem] shadow-sm p-6 flex items-center gap-5 group hover:bg-muted/30 transition-all">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-600 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-display font-semibold text-foreground tracking-tight">{stats.avgProcessingHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground mt-1 font-semibold uppercase tracking-widest leading-none">Avg Payout Time</div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border shadow-sm rounded-[1.5rem] p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" /> Mission Analytics
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} />
                <YAxis yAxisId="right" orientation="right" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: '500', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar yAxisId="left" dataKey="submissions" name="Submissions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" dataKey="approvals" name="Approvals" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-[1.5rem] p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" /> Live Worker Activity
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWorkers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: '500', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="activeWorkers" name="Active Workers" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorWorkers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <div className="bg-card border border-border shadow-sm rounded-[1.5rem] p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-3">
              <Clock className="w-6 h-6 text-pink-600" /> Payout Processing Times
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => `${val}h`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: '500', fontSize: '12px' }}
                  cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="avgProcessingTime" name="Avg Processing Time (Hours)" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899', strokeWidth: 0 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-[1.5rem] p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-2xl font-display font-semibold text-foreground flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-600" /> Worker Performance Trend
            </h2>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" domain={[1, 5]} stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={-10} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="currentColor" className="text-muted-foreground" fontSize={10} fontWeight="500" tickLine={false} axisLine={false} dx={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '12px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: '500', fontSize: '12px' }}
                  cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line yAxisId="left" type="monotone" dataKey="avgRating" name="Avg Rating (1-5)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Completion Rate" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 8 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Pending Submissions */}
        <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="text-xl font-display font-semibold text-foreground tracking-tight">Pending Reviews</h2>
            <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-md border border-primary/20 tracking-wider">
              {pendingSubmissions.length} Pending
            </span>
          </div>
          <div className="divide-y divide-border">
            {pendingSubmissions.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm font-medium">No pending missions.</div>
            ) : (
              pendingSubmissions.map((sub) => (
                <div key={sub.id} className="p-6 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="font-sans font-semibold text-foreground text-xl tracking-tight mb-2">{sub.taskTitle}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                            {sub.workerName?.[0]}
                          </div>
                          {sub.workerName}
                        </div>
                        <span className="text-border">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 
                          {sub.submittedAt?.toDate ? format(sub.submittedAt.toDate(), "MMM d, h:mm a") : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="text-primary font-sans font-semibold text-xl">
                      ${sub.payout.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-card/50 border border-border rounded-xl p-5 mb-6">
                    <div className="text-xs uppercase font-semibold tracking-widest text-muted-foreground mb-2">Worker Proof:</div>
                    <p className="text-sm text-foreground leading-relaxed mb-4">{sub.proofText || "No text provided."}</p>
                    {sub.proofImageUrl && (
                      <a href={sub.proofImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
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
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-primary-foreground font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => setRejectionData({ assignmentId: sub.id, workerId: sub.workerId, taskId: sub.taskId, taskTitle: sub.taskTitle, workerName: sub.workerName })}
                      className="flex-1 bg-card hover:bg-muted/80 text-foreground font-medium py-2.5 rounded-xl transition-colors border border-border"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => setSubmissionToDelete(sub.id)}
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
        <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border bg-muted/20">
            <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-3 tracking-tight">
              <Activity className="w-5 h-5 text-primary" /> Activity Log
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px before:h-full before:w-px before:border-l before:border-border">
              {activities.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 text-sm font-medium">No recent log entries.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-6 group">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-card border border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/50 z-10 transition-all duration-300">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 glass-card rounded-xl p-4 group-hover:border-primary/30 transition-all duration-300">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="font-sans text-foreground text-xs font-semibold uppercase tracking-widest leading-relaxed capitalize">{act.type?.replace('_', ' ') || 'Activity'}</div>
                        <time className="text-xs text-muted-foreground">{act.createdAt?.toDate ? format(act.createdAt.toDate(), "h:mm a") : ""}</time>
                      </div>
                      <div className="text-sm text-muted-foreground font-sans leading-relaxed mb-2">{act.description}</div>
                      {(act.taskId || act.userId || act.amount !== undefined) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {act.userId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 border border-border text-xs text-muted-foreground font-mono">
                              <span className="text-muted-foreground/60">USR:</span> {act.userId.slice(0, 8)}...
                            </span>
                          )}
                          {act.taskId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs text-purple-400 font-mono">
                              <span className="text-purple-500/50">TSK:</span> {act.taskId.slice(0, 8)}...
                            </span>
                          )}
                          {act.amount !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-mono">
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
        <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm lg:col-span-2">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="text-xl font-display font-semibold text-foreground tracking-tight">Pending Member Requests</h2>
            <span className="bg-blue-500/10 text-blue-600 text-xs font-medium px-3 py-1 rounded-md border border-blue-500/20">{pendingRequests.length} Pending</span>
          </div>
          <div className="divide-y divide-border">
            {pendingRequests.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm font-medium">No pending member requests.</div>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="p-6 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-sans font-semibold text-foreground text-xl tracking-tight mb-2">{req.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-semibold text-blue-600">
                            {req.requesterName?.[0]}
                          </div>
                          {req.requesterName}
                        </div>
                        <span className="text-border">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 
                          {req.createdAt?.toDate ? format(req.createdAt.toDate(), "MMM d, h:mm a") : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="text-blue-600 font-sans font-semibold text-xl">
                      ${req.offerAmount.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-card/50 border border-border rounded-xl p-5 mb-6">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{req.description}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleApproveRequest(req.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-foreground font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      Approve & Publish
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 bg-card hover:bg-muted/80 text-foreground font-medium py-2.5 rounded-xl transition-colors border border-border"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Pending Withdrawals */}
        <div className="bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm lg:col-span-2">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <h2 className="text-xl font-display font-semibold text-foreground tracking-tight">Pending Withdrawals</h2>
            <span className="bg-pink-500/10 text-pink-600 text-xs font-medium px-3 py-1 rounded-md border border-pink-500/20">{pendingWithdrawalsList.length} Pending</span>
          </div>
          <div className="divide-y divide-border">
            {pendingWithdrawalsList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm font-medium">No pending withdrawals.</div>
            ) : (
              pendingWithdrawalsList.map((w) => (
                <div key={w.id} className="p-6 hover:bg-muted/10 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-sans font-semibold text-foreground text-xl tracking-tight mb-2">Withdrawal Request</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xs font-semibold text-pink-600">
                            {w.workerName?.[0]}
                          </div>
                          {w.workerName}
                        </div>
                        <span className="text-border">•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> 
                          {w.createdAt?.toDate ? format(w.createdAt.toDate(), "MMM d, h:mm a") : "Unknown"}
                        </div>
                      </div>
                    </div>
                    <div className="text-pink-600 font-sans font-semibold text-xl">
                      ${w.amount?.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-card/50 border border-border rounded-xl p-5 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs uppercase font-semibold tracking-widest text-muted-foreground mb-1">Payment Method:</div>
                        <div className="text-sm text-foreground capitalize">{w.method}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase font-semibold tracking-widest text-muted-foreground mb-1">Payment Details:</div>
                        <div className="text-sm text-foreground">{w.details}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase font-semibold tracking-widest text-muted-foreground mb-1">Worker Balance:</div>
                        <div className="text-sm text-foreground">${w.workerBalance?.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleApproveWithdrawal(w.id, w.workerId, w.amount, w.workerName)}
                      className="flex-1 bg-pink-600 hover:bg-pink-700 text-foreground font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      Approve & Pay
                    </button>
                    <button 
                      onClick={() => handleRejectWithdrawal(w.id)}
                      className="flex-1 bg-card hover:bg-muted/80 text-foreground font-medium py-2.5 rounded-xl transition-colors border border-border"
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
      <div className="mt-12 bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border bg-muted/20">
          <h2 className="text-xl font-display font-semibold text-foreground flex items-center gap-3 tracking-tight">
            <DollarSign className="w-5 h-5 text-primary" /> Transaction Ledger
          </h2>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead>
                <tr>
                  <th className="px-6 py-4 border-b border-border bg-card text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                  <th className="px-6 py-4 border-b border-border bg-card text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Worker</th>
                  <th className="px-6 py-4 border-b border-border bg-card text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Task</th>
                  <th className="px-6 py-4 border-b border-border bg-card text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm font-medium">No transactions recorded.</td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {payout.createdAt?.toDate ? format(payout.createdAt.toDate(), "MMM d, yyyy h:mm a") : "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-sans text-primary text-xs font-semibold">
                            {payout.workerName?.[0]}
                          </div>
                          <span className="font-sans font-medium text-foreground">{payout.workerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-sans text-muted-foreground text-sm">
                        {payout.taskTitle || payout.taskId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-primary font-sans font-medium">
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

      {rejectionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-md">
            <h3 className="text-xl font-semibold text-foreground mb-2">Reject Submission</h3>
            <p className="text-muted-foreground mb-4">
              Please provide a reason for rejecting this submission from <span className="text-foreground font-semibold">{rejectionData.workerName}</span>.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:border-primary transition-colors mb-6 min-h-[100px] resize-none"
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setRejectionData(null);
                  setRejectionReason("");
                }}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-foreground font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {submissionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-md">
            <h3 className="text-xl font-semibold text-foreground mb-2">Delete Submission</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this submission record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteSubmission(submissionToDelete)}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-foreground font-semibold transition-colors shadow-sm shadow-destructive/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
