import React, { useEffect, useState } from "react";
import WorkerLayout from "@/components/WorkerLayout";
import { collection, query, onSnapshot, where, doc, updateDoc, getDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  UploadCloud, 
  FileUp, 
  TrendingUp, 
  Zap, 
  Trophy, 
  Users, 
  ExternalLink, 
  X, 
  RefreshCw,
  Target,
  Cpu,
  Activity,
  Shield,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isGeoMatch } from "@/lib/geoUtils";
import { DesignerIcon } from "@/components/DesignerIcon";

export default function WorkerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const earningsToNextLevel = 15 - ((user?.earnings || 0) % 15);
  const levelProgress = Math.round(((15 - earningsToNextLevel) / 15) * 100);
  const currentLevel = Math.floor((user?.earnings || 0) / 15) + 1;

  const autoAssignTasks = async (workerId: string, trustTier: string, userCountry: string) => {
    // Check if user already has an active assignment (pending or submitted)
    const activeQuery = query(
      collection(db, "assignments"), 
      where("workerId", "==", workerId),
      where("status", "in", ["pending", "submitted"])
    );
    const activeSnap = await getDocs(activeQuery);
    if (!activeSnap.empty) {
      console.log("Worker already has an active assignment. Skipping auto-assign.");
      return;
    }

    let allowedTiers = ['New'];
    if (trustTier === 'Trusted') allowedTiers = ['New', 'Trusted'];
    if (trustTier === 'Premium') allowedTiers = ['New', 'Trusted', 'Premium'];

    const tasksQuery = query(collection(db, "tasks"), where("requiredTier", "in", allowedTiers), where("status", "==", "active"));
    const tasksSnap = await getDocs(tasksQuery);
    
    const assignmentsQuery = query(collection(db, "assignments"), where("workerId", "==", workerId));
    const assignmentsSnap = await getDocs(assignmentsQuery);
    const assignedTaskIds = assignmentsSnap.docs.map(d => d.data().taskId);

    for (const taskDoc of tasksSnap.docs) {
      const taskData = taskDoc.data();
      const taskGeo = taskData.targetGeo || "Global";
      
      const geoMatch = isGeoMatch(taskGeo, userCountry);

      if (!assignedTaskIds.includes(taskDoc.id) && geoMatch) {
        const taskAssignmentsQuery = query(collection(db, "assignments"), where("taskId", "==", taskDoc.id));
        const taskAssignmentsSnap = await getDocs(taskAssignmentsQuery);
        
        if (taskAssignmentsSnap.size < (taskData.limit || Infinity)) {
          await addDoc(collection(db, "assignments"), {
            taskId: taskDoc.id,
            workerId: workerId,
            status: "pending",
            assignedAt: serverTimestamp()
          });
          // After assigning one task, stop to enforce linear progression
          return;
        }
      }
    }
  };

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin' && !user.quizCompleted) {
      navigate("/worker/quiz");
    } else if (user) {
      autoAssignTasks(user.uid, user.trustTier || 'New', user.country || "Global");
    }
  }, [user, navigate, loading]);


  useEffect(() => {
    if (!user) return;

    // Cache for task data to prevent N+1 queries on every snapshot
    const taskCache = new Map<string, any>();

    const q = query(collection(db, "assignments"), where("workerId", "==", user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const assigns = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        let taskData = taskCache.get(data.taskId);
        
        if (!taskData) {
          const taskRef = doc(db, "tasks", data.taskId);
          const taskDoc = await getDoc(taskRef);
          taskData = taskDoc.exists() ? taskDoc.data() : null;
          if (taskData) {
            taskCache.set(data.taskId, taskData);
          }
        }

        return { 
          id: d.id, 
          ...data, 
          taskTitle: taskData ? taskData.title : "Unknown Task",
          taskDescription: taskData ? taskData.description : "No description",
          taskLink: taskData ? taskData.link : "",
          payout: taskData ? taskData.payout : 0,
        };
      }));
      
      setAssignments(assigns.sort((a: any, b: any) => {
        const order: any = { pending: 0, submitted: 1, rejected: 2, approved: 3 };
        return order[a.status] - order[b.status];
      }));
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, "assignments");
    });

    const qActivities = query(collection(db, "activities"), where("type", "==", "task_submitted"));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, "activities");
    });

    return () => {
      unsub();
      unsubActivities();
    };
  }, [user]);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!proofFile) {
      toast.error("Please select a screenshot file.");
      return;
    }

    if (!proofFile.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc).");
      return;
    }
    if (proofFile.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum 5MB allowed.");
      return;
    }

    setSubmitting(true);
    try {
      const storageRef = ref(storage, `proofs/${selectedAssignment.id}/${proofFile.name}`);
      const snapshot = await uploadBytes(storageRef, proofFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      await updateDoc(doc(db, "assignments", selectedAssignment.id), {
        status: "submitted",
        proofText,
        proofImageUrl: downloadUrl,
        submittedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activities"), {
        type: "task_submitted",
        description: `Worker submitted proof for task`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });

      toast.success("Proof submitted successfully! Pending admin review.");
      setSelectedAssignment(null);
      setProofText("");
      setProofFile(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `assignments/${selectedAssignment.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getTrackedUrl = (assign: any) => {
    if (!assign.taskLink) return "";
    let url = assign.taskLink;
    url = url.replace(/{user_id}/g, user?.uid || "");
    url = url.replace(/{task_id}/g, assign.taskId || "");
    url = url.replace(/{attempt_id}/g, assign.id || "");
    return url;
  };

  const handleOfferClick = async (assign: any) => {
    try {
      await addDoc(collection(db, "activities"), {
        type: "offer_click",
        description: `Worker clicked task link for "${assign.taskTitle}"`,
        taskId: assign.taskId,
        assignmentId: assign.id,
        workerId: user?.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to log offer click", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (user) {
      await autoAssignTasks(user.uid, user.trustTier || 'New', user.country || "Global");
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <WorkerLayout>
      {/* Header Section */}
      <div className="mb-10 md:mb-16 space-y-8 md:space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 md:gap-10">
          <div className="space-y-4 md:space-y-6">
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] rounded-full">
              <Activity className="w-4 h-4 mr-2 text-primary animate-pulse" /> System Operational
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground leading-none">
              Console<span className="text-primary">.</span>{user?.isAnonymous ? user?.username : user?.name?.split(' ')[0]}
            </h1>
            <div className="flex flex-wrap items-center gap-6 md:gap-8">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                Streak: <span className="text-foreground">3 Days</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                Tier: <span className="text-foreground">{user?.trustTier || 'New'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto">
            {[
              { label: "CPU", value: "42%", color: "text-primary" },
              { label: "MEM", value: "6.8GB", color: "text-primary" },
              { label: "LAT", value: "12ms", color: "text-emerald-500" },
              { label: "NET", value: "SECURE", color: "text-emerald-500" }
            ].map((metric, i) => (
              <div key={i} className="px-6 py-4 md:px-8 md:py-5 rounded-2xl glass-card space-y-1 hover:bg-white/[0.03] transition-all duration-300">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">{metric.label}</div>
                <div className={cn("text-xs md:text-sm font-mono font-black", metric.color)}>{metric.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-12">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-4xl font-display font-bold text-gradient tracking-tight">Active Assignments</h2>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60">
                Processing {assignments.length} nodes in current queue
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full border-border bg-muted/50 hover:bg-muted h-12 px-6 text-xs font-black uppercase tracking-widest shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh Queue
            </Button>
          </div>

          <div className="space-y-12">
            {assignments.length === 0 ? (
              <div className="p-20 rounded-[2.5rem] border border-dashed border-white/[0.08] bg-white/[0.01] text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto opacity-40">
                  <Target className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Queue Empty</h3>
                  <p className="text-[10px] font-mono text-muted-foreground/40 italic uppercase tracking-widest">Awaiting network broadcast...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Current Active Task */}
                {assignments.find(a => ['pending', 'submitted'].includes(a.status)) ? (
                  <div className="space-y-8">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary px-2">Current Protocol</h3>
                    {assignments.filter(a => ['pending', 'submitted'].includes(a.status)).slice(0, 1).map(assign => (
                      <motion.div 
                        key={assign.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative rounded-[2.5rem] md:rounded-[3.5rem] glass-card border-primary/20 shadow-2xl shadow-primary/10 overflow-hidden transition-all duration-500 hover:border-primary/40"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                        <div className="relative p-8 md:p-14 flex flex-col md:flex-row gap-8 md:gap-12">
                          <div className="flex-1 space-y-8 md:space-y-10">
                            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                                  <span className="text-[10px] md:text-xs font-mono font-black text-primary uppercase tracking-[0.3em]">
                                    ACTIVE_NODE: {assign.id.slice(0, 8).toUpperCase()}
                                  </span>
                                </div>
                                <h3 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-gradient tracking-tight leading-tight md:leading-none">
                                  {assign.taskTitle}
                                </h3>
                              </div>
                              <div className="text-left md:text-right space-y-1">
                                <div className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary tracking-tighter">
                                  ${assign.payout.toFixed(2)}
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Payout</div>
                              </div>
                            </div>

                            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] font-medium text-lg md:text-2xl text-muted-foreground leading-relaxed">
                              {assign.taskDescription}
                            </div>

                            <div className="flex flex-wrap items-center gap-8">
                              {assign.taskLink && (
                                <a 
                                  href={getTrackedUrl(assign)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={() => handleOfferClick(assign)}
                                  className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] text-primary-foreground bg-primary px-8 py-4 rounded-full border border-primary/10 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                                >
                                  <ExternalLink className="w-5 h-5" /> Execute Protocol
                                </a>
                              )}
                              <div className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                                Status: <span className="text-foreground ml-2">{assign.status}</span>
                              </div>
                            </div>
                          </div>

                          <div className="w-full md:w-72 flex flex-col justify-center">
                            {assign.status === 'pending' && (
                              <Button 
                                onClick={() => setSelectedAssignment(assign)}
                                className="w-full h-16 md:h-24 rounded-2xl md:rounded-[2rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20"
                              >
                                <UploadCloud className="w-5 h-5 md:w-6 md:h-6 mr-3" /> Upload Proof
                              </Button>
                            )}
                            {assign.status === 'submitted' && (
                              <div className="p-10 rounded-[2rem] bg-primary/5 border border-primary/20 text-center space-y-4">
                                <RefreshCw className="w-8 h-8 text-primary mx-auto animate-spin" />
                                <div className="text-xs font-black text-primary uppercase tracking-widest">Awaiting Verification</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 rounded-[2.5rem] border border-dashed border-white/[0.08] bg-white/[0.01] text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-500">All Protocols Cleared</h3>
                      <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest italic">Refresh queue for new assignments</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleRefresh}
                      className="rounded-full border-white/[0.1] text-[10px] font-bold uppercase tracking-widest h-12 px-8"
                    >
                      Scan for Nodes
                    </Button>
                  </div>
                )}

                {/* History Section */}
                {assignments.filter(a => ['approved', 'rejected'].includes(a.status)).length > 0 && (
                  <div className="space-y-6 pt-12 border-t border-white/[0.05]">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40 px-2">Protocol History</h3>
                    <div className="grid gap-4">
                      {assignments.filter(a => ['approved', 'rejected'].includes(a.status)).map(assign => (
                        <div 
                          key={assign.id}
                          className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.05] flex items-center justify-between group hover:bg-white/[0.02] transition-all"
                        >
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border",
                              assign.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-destructive/5 border-destructive/10 text-destructive'
                            )}>
                              {assign.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{assign.taskTitle}</div>
                              <div className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">COMPLETED // {assign.id.slice(0, 8)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">${assign.payout.toFixed(2)}</div>
                            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{assign.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-4 space-y-12">
          {/* Network Feed */}
          <div className="rounded-[2.5rem] border border-white/[0.05] bg-white/[0.01] overflow-hidden">
            <div className="p-8 border-b border-white/[0.05] flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
                <Activity className="w-4 h-4 text-primary" /> Network Feed
              </h3>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-primary/30" />
                <span className="w-1 h-1 rounded-full bg-primary" />
              </div>
            </div>
            <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto hide-scrollbar">
              {activities.map((activity, i) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-2 border-l border-white/[0.05] pl-6 py-1"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-primary/60">Event_{activity.id.slice(0, 4)}</span>
                    <span className="text-muted-foreground/30">T+{i*12}s</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed font-light">
                    <span className="text-white font-bold">Node_{activity.userId?.slice(0, 4)}</span> verified submission in <span className="text-primary/80">Region_US</span>
                  </div>
                </motion.div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em]">Syncing Nodes...</p>
                </div>
              )}
            </div>
          </div>

          {/* Submission Panel */}
          <AnimatePresence>
            {selectedAssignment ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="sticky top-12"
              >
                <div className="rounded-[2.5rem] border-2 border-primary/30 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
                  <div className="p-8 border-b border-white/[0.05] bg-primary/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                      <UploadCloud className="w-5 h-5" /> Submission
                    </h3>
                    <button onClick={() => setSelectedAssignment(null)} className="text-primary hover:opacity-70 transition-opacity">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Requirements</h4>
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
                        <div className="flex items-start gap-3 text-[11px] text-muted-foreground font-light leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          Clear screenshot of completion
                        </div>
                        <div className="flex items-start gap-3 text-[11px] text-muted-foreground font-light leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          Visible Task ID or confirmation
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitProof} className="space-y-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Verification Data</label>
                        <Textarea 
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          placeholder="Enter protocol verification strings..."
                          className="min-h-[140px] bg-white/[0.02] border-white/[0.08] focus:border-primary rounded-2xl font-light text-sm resize-none p-5"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Confirmation Image</label>
                        <div className="relative">
                          <Input 
                            type="file"
                            accept="image/*"
                            required
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="proof-upload"
                          />
                          <label 
                            htmlFor="proof-upload"
                            className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl cursor-pointer hover:bg-white/[0.04] transition-all group"
                          >
                            <span className="text-[11px] text-muted-foreground truncate font-light">
                              {proofFile ? proofFile.name : "Select Screenshot"}
                            </span>
                            <FileUp className="w-4 h-4 text-primary" />
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedAssignment(null)}
                          className="rounded-full font-bold text-[10px] uppercase tracking-widest h-14 border-white/[0.08]"
                        >
                          Abort
                        </Button>
                        <Button 
                          type="submit"
                          disabled={submitting}
                          className="rounded-full font-bold text-[10px] uppercase tracking-widest h-14 shadow-xl shadow-primary/20"
                        >
                          {submitting ? "Syncing..." : "Commit Data"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="p-12 rounded-[2.5rem] border border-dashed border-white/[0.08] bg-white/[0.01] text-center space-y-4 sticky top-12">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto opacity-20">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Input Required</h3>
                  <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">Select active node to begin</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </WorkerLayout>
  );
}
