import React, { useEffect, useState } from "react";
import WorkerLayout from "../../components/WorkerLayout";
import { collection, query, onSnapshot, where, doc, updateDoc, getDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Clock, DollarSign, UploadCloud, FileUp, TrendingUp, Zap, Trophy, Users, ExternalLink, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button, buttonVariants } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../lib/utils";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const earningsToNextLevel = 15 - ((user?.earnings || 0) % 15);
  const levelProgress = Math.round(((15 - earningsToNextLevel) / 15) * 100);
  const currentLevel = Math.floor((user?.earnings || 0) / 15) + 1;

  const autoAssignTasks = async (workerId: string, trustTier: string, userCountry: string) => {
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
      
      const isGeoMatch = taskGeo === "Global" || 
                         taskGeo.toLowerCase().includes(userCountry.toLowerCase()) ||
                         userCountry.toLowerCase().includes(taskGeo.toLowerCase());

      if (!assignedTaskIds.includes(taskDoc.id) && isGeoMatch) {
        await addDoc(collection(db, "assignments"), {
          taskId: taskDoc.id,
          workerId: workerId,
          status: "pending",
          assignedAt: serverTimestamp()
        });
      }
    }
  };

  useEffect(() => {
    if (user && !user.quizCompleted) {
      navigate("/worker/quiz");
    } else if (user) {
      autoAssignTasks(user.uid, user.trustTier || 'New', user.country || "Global");
    }
  }, [user, navigate]);


  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "assignments"), where("workerId", "==", user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const assigns = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const taskRef = doc(db, "tasks", data.taskId);
        const taskDoc = await getDoc(taskRef);
        return { 
          id: d.id, 
          ...data, 
          taskTitle: taskDoc.exists() ? taskDoc.data().title : "Unknown Task",
          taskDescription: taskDoc.exists() ? taskDoc.data().description : "No description",
          taskLink: taskDoc.exists() ? taskDoc.data().link : "",
          payout: taskDoc.exists() ? taskDoc.data().payout : 0,
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
        submittedAt: serverTimestamp()
      });

      await addDoc(collection(db, "activities"), {
        type: "task_submitted",
        description: `Worker submitted proof for task`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });

      toast.success("Proof submitted successfully!");
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

  return (
    <WorkerLayout>
      {/* Scanline Overlay Effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* System Metrics Bar */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 border border-border/50 bg-muted/5 p-2">
        <div className="flex flex-col gap-1 border-r border-border/30 px-3">
          <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest">CPU_LOAD</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-none overflow-hidden">
              <div className="h-full bg-primary w-[42%] animate-pulse" />
            </div>
            <span className="text-[10px] font-mono text-primary">42%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-r border-border/30 px-3">
          <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest">MEM_USAGE</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-none overflow-hidden">
              <div className="h-full bg-primary w-[68%]" />
            </div>
            <span className="text-[10px] font-mono text-primary">6.8GB</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 border-r border-border/30 px-3">
          <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest">NET_LATENCY</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-muted rounded-none overflow-hidden">
              <div className="h-full bg-emerald-500 w-[12%]" />
            </div>
            <span className="text-[10px] font-mono text-emerald-500">12ms</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 px-3">
          <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest">UPLINK_STATUS</div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-mono text-emerald-500 uppercase">Encrypted</span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-border/50 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-primary/60">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
            System Status: Online
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase">
            Console<span className="text-primary">.</span>{user?.isAnonymous ? user?.username : user?.name?.split(' ')[0]}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 border border-border/50 rounded text-[10px] font-mono font-bold text-muted-foreground uppercase">
              <Zap className="w-3 h-3 text-primary fill-current" />
              Streak: 3D
            </div>
            <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Next Tier: <span className="text-foreground">Level {currentLevel + 1}</span> (${earningsToNextLevel.toFixed(2)} req)
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-72 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
            <span>Sync Progress</span>
            <span className="text-primary">{levelProgress}%</span>
          </div>
          <div className="h-2 bg-muted/50 border border-border/50 rounded-none overflow-hidden p-[1px]">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)]" 
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground/50 uppercase">
            <span>Lvl {currentLevel}</span>
            <span>Lvl {currentLevel + 1}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between border-l-2 border-primary pl-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                Active Assignments
              </h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">Queue processing: {assignments.length} active nodes</p>
            </div>
            <div className="text-[10px] font-mono font-bold text-primary bg-primary/5 px-2 py-1 border border-primary/20">
              {new Date().toLocaleTimeString([], { hour12: false })}
            </div>
          </div>

          <div className="grid gap-4">
            {assignments.length === 0 ? (
              <div className="border border-dashed border-border/50 p-12 text-center bg-muted/5">
                <div className="w-12 h-12 border border-muted-foreground/20 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No Active Tasks</h3>
                <p className="text-[10px] font-mono text-muted-foreground/50 mt-2 italic">Awaiting network broadcast...</p>
              </div>
            ) : (
              assignments.map(assign => (
                <div 
                  key={assign.id} 
                  className={cn(
                    "relative group border transition-all duration-200",
                    assign.status === 'pending' 
                      ? "bg-card border-primary/30 shadow-[4px_4px_0px_rgba(var(--primary),0.1)]" 
                      : "bg-muted/5 border-border/50"
                  )}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-5 border-r border-border/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1">
                          <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              assign.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                              assign.status === 'submitted' ? 'bg-blue-500' :
                              assign.status === 'approved' ? 'bg-emerald-500' : 'bg-destructive'
                            )} />
                            Node ID: {assign.id.slice(0, 8).toUpperCase()}
                          </div>
                          <h3 className="text-lg font-black tracking-tight uppercase text-foreground group-hover:text-primary transition-colors">
                            {assign.taskTitle}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-primary font-mono tracking-tighter">
                            ${assign.payout.toFixed(2)}
                          </div>
                          <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase">Payout Value</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-muted/30 p-3 border border-border/30 font-mono text-[11px] text-muted-foreground leading-relaxed">
                          <span className="text-primary/50 mr-2"># INSTRUCTIONS:</span>
                          {assign.taskDescription}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2 px-2 py-0.5 bg-muted/50 border border-border/30 rounded text-[8px] font-mono font-bold text-muted-foreground uppercase">
                            Priority: High
                          </div>
                          <div className="flex items-center gap-2 px-2 py-0.5 bg-muted/50 border border-border/30 rounded text-[8px] font-mono font-bold text-muted-foreground uppercase">
                            Latency: 45ms
                          </div>
                          <div className="flex items-center gap-2 px-2 py-0.5 bg-muted/50 border border-border/30 rounded text-[8px] font-mono font-bold text-muted-foreground uppercase">
                            Thread: 0x{assign.id.slice(-4).toUpperCase()}
                          </div>
                        </div>

                        {assign.taskLink && (
                          <div className="flex items-center gap-4 pt-2">
                            <a 
                              href={getTrackedUrl(assign)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={() => handleOfferClick(assign)}
                              className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase text-primary hover:text-primary/80 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> Execute Protocol
                            </a>
                            <div className="h-px flex-1 bg-border/30" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full md:w-48 p-5 flex flex-col justify-between bg-muted/5">
                      <div className="space-y-4">
                        <div>
                          <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase mb-1">Status</div>
                          <Badge className={cn(
                            "w-full justify-center rounded-none text-[10px] font-mono font-bold uppercase tracking-widest h-7",
                            assign.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            assign.status === 'submitted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            assign.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            'bg-destructive/10 text-destructive border-destructive/20'
                          )}>
                            {assign.status}
                          </Badge>
                        </div>
                        {assign.status === 'pending' && (
                          <Button 
                            onClick={() => setSelectedAssignment(assign)}
                            className="w-full h-10 rounded-none font-mono font-bold text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_rgba(var(--primary),0.2)]"
                          >
                            Upload Proof
                          </Button>
                        )}
                      </div>

                      {assign.status === 'rejected' && (
                        <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-destructive uppercase animate-pulse">
                          <AlertCircle className="w-3 h-3" /> Error Detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="border border-border/50 bg-card/30 overflow-hidden">
            <div className="bg-muted/50 px-4 py-1.5 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
              </div>
              <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Network_Monitor.exe</span>
            </div>
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                <Users className="w-3 h-3 text-primary" /> Live Network Feed
              </h3>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-primary/30" />
                <span className="w-1 h-1 rounded-full bg-primary/30" />
                <span className="w-1 h-1 rounded-full bg-primary" />
              </div>
            </div>
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-black/20">
              {activities.map((activity, i) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-1 border-l border-border/50 pl-3 py-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-primary/70 uppercase">Event_{activity.id.slice(0, 4)}</span>
                    <span className="text-[8px] font-mono text-muted-foreground/50">T+{i*12}s</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground leading-tight">
                    <span className="text-foreground font-bold">Node_{activity.userId?.slice(0, 4)}</span> verified submission in <span className="text-primary/80">Region_US</span>
                  </div>
                </motion.div>
              ))}
              {activities.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Syncing Nodes...</p>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-border/50 bg-muted/10 text-[8px] font-mono text-muted-foreground/40 uppercase text-center">
              End of Stream // SpunForce Protocol v1.0.4
            </div>
          </div>

          <AnimatePresence>
            {selectedAssignment ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="sticky top-6"
              >
                <div className="border-2 border-primary bg-card shadow-[8px_8px_0px_rgba(var(--primary),0.1)] overflow-hidden">
                  <div className="bg-primary px-4 py-1 flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-primary-foreground uppercase tracking-widest">Secure_Uplink_v2.1</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary-foreground/30" />
                      <div className="w-1.5 h-1.5 bg-primary-foreground/30" />
                      <div className="w-1.5 h-1.5 bg-primary-foreground" />
                    </div>
                  </div>
                  <div className="p-4 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <UploadCloud className="w-4 h-4" /> Proof Submission
                    </h3>
                    <button onClick={() => setSelectedAssignment(null)} className="text-primary hover:text-primary/70">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5">
                    <form onSubmit={handleSubmitProof} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Verification Data</label>
                        <Textarea 
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          placeholder="Enter protocol verification strings..."
                          className="min-h-[120px] bg-muted/30 border-border/50 focus:border-primary rounded-none font-mono text-xs resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Visual Confirmation</label>
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
                            className="flex items-center justify-between px-4 py-3 bg-muted/30 border border-border/50 rounded-none cursor-pointer hover:bg-muted/50 transition-all group"
                          >
                            <span className="text-[10px] font-mono text-muted-foreground truncate">
                              {proofFile ? proofFile.name : "SELECT_SCREENSHOT.IMG"}
                            </span>
                            <FileUp className="w-4 h-4 text-primary" />
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedAssignment(null)}
                          className="rounded-none font-mono font-bold text-[10px] uppercase tracking-widest h-10"
                        >
                          Abort
                        </Button>
                        <Button 
                          type="submit"
                          disabled={submitting}
                          className="rounded-none font-mono font-bold text-[10px] uppercase tracking-widest h-10 shadow-[4px_4px_0px_rgba(var(--primary),0.2)]"
                        >
                          {submitting ? "Uploading..." : "Commit Data"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="border border-dashed border-border/50 p-8 text-center bg-muted/5 sticky top-6">
                <div className="w-10 h-10 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3 opacity-20">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Input Required</h3>
                <p className="text-[9px] font-mono text-muted-foreground/40 mt-2 uppercase">Select active node to begin verification</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </WorkerLayout>
  );
}
