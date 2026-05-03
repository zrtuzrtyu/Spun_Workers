import React, { useEffect, useState } from "react";
import WorkerLayout from "@/components/WorkerLayout";
import { collection, query, onSnapshot, where, doc, updateDoc, getDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  CheckCircle2, Clock, UploadCloud, FileUp, Zap, Target, Activity, Shield, RefreshCw, X, ArrowRight, Home
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isGeoMatch } from "@/lib/geoUtils";
import { DashboardTour } from "@/components/DashboardTour";
import { ValueProposition } from "@/components/ValueProposition";

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
  const [isNetworkSyncing, setIsNetworkSyncing] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (user && !user.tutorialShown && !loading) {
      setShowTour(true);
    }
  }, [user, loading]);

  const handleTourComplete = async () => {
    setShowTour(false);
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { tutorialShown: true });
      } catch (error) { console.error("Failed to mark tutorial as shown:", error); }
    }
  };

  const autoAssignTasks = async (workerId: string, trustTier: string, userCountry: string, isAdmin: boolean = false) => {
    try {
      const assignmentsQuery = query(collection(db, "assignments"), where("workerId", "==", workerId));
      const assignmentsSnap = await getDocs(assignmentsQuery);
      
      const activeAssignments = assignmentsSnap.docs.filter(d => 
        d.data().status === "pending" || d.data().status === "submitted"
      );
      if (activeAssignments.length > 0) return;

      let allowedTiers = ['New'];
      if (trustTier === 'Trusted') allowedTiers = ['New', 'Trusted'];
      if (trustTier === 'Premium') allowedTiers = ['New', 'Trusted', 'Premium'];

      const tasksQuery = query(collection(db, "tasks"), where("status", "==", "active"));
      const tasksSnap = await getDocs(tasksQuery);
      
      const assignedTaskIds = assignmentsSnap.docs.map(d => d.data().taskId);
      
      for (const taskDoc of tasksSnap.docs) {
        const taskData = taskDoc.data();
        if (!allowedTiers.includes(taskData.requiredTier || 'New')) continue;
        
        const taskGeo = taskData.targetGeo || "Global";
        const geoMatch = isAdmin ? true : isGeoMatch(taskGeo, userCountry);
        
        if (!assignedTaskIds.includes(taskDoc.id) && geoMatch) {
          let limitReached = false;
          
          if (isAdmin) {
            try {
              const taskAssignmentsQuery = query(collection(db, "assignments"), where("taskId", "==", taskDoc.id));
              const taskAssignmentsSnap = await getDocs(taskAssignmentsQuery);
              if (taskAssignmentsSnap.size >= (taskData.limit || Infinity)) {
                limitReached = true;
              }
            } catch (err) {
              console.warn("Could not verify task capacity", err);
            }
          }

          if (!limitReached) {
            await addDoc(collection(db, "assignments"), {
              taskId: taskDoc.id, workerId: workerId, status: "pending", assignedAt: serverTimestamp()
            });
            return;
          }
        }
      }
    } catch (error) { 
        // Silently catch to prevent ui interruption
        console.warn("Auto-assignment skipped due to permissions/index:", error); 
    }
  };

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'admin' && !user.quizCompleted) {
      navigate("/worker/quiz");
    } else if (user) {
      autoAssignTasks(user.uid, user.trustTier || 'New', user.country || "Global", user.role === 'admin');
    }
  }, [user, navigate, loading]);

  useEffect(() => {
    if (!user) return;
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
          if (taskData) taskCache.set(data.taskId, taskData);
        }
        return { 
          id: d.id, ...data, 
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
      
      // Auto-allocate if out of active tasks
      const activeCount = assigns.filter((a: any) => a.status === 'pending' || a.status === 'submitted').length;
      if (activeCount === 0 && user && user.role !== 'admin') {
         autoAssignTasks(user.uid, user.trustTier || 'New', user.country || 'Global', false);
      }
    }, (error: any) => { handleFirestoreError(error, OperationType.LIST, "assignments"); });

    const qActivities = query(collection(db, "activities"), where("type", "==", "task_submitted"));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    }, (error: any) => { 
        console.warn("Activities feed restricted:", error); 
    });

    return () => { unsub(); unsubActivities(); };
  }, [user]);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !proofFile) return;
    setSubmitting(true);
    try {
      const storageRef = ref(storage, `proofs/${selectedAssignment.id}/${proofFile.name}`);
      const snapshot = await uploadBytes(storageRef, proofFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      await updateDoc(doc(db, "assignments", selectedAssignment.id), {
        status: "submitted", proofText, proofImageUrl: downloadUrl, submittedAt: serverTimestamp(),
      });
      await addDoc(collection(db, "activities"), {
        type: "task_submitted", description: `Worker submitted proof`, createdAt: serverTimestamp(), userId: user?.uid
      });
      toast.success("Proof submitted successfully!");
      setSelectedAssignment(null);
      setProofFile(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `assignments/${selectedAssignment.id}`);
    } finally { 
      setSubmitting(false); 
    }
  };

  const getTrackedUrl = (assign: any) => {
    if (!assign.taskLink) return "";
    return assign.taskLink.replace(/{user_id}/g, user?.uid || "").replace(/{task_id}/g, assign.taskId || "").replace(/{attempt_id}/g, assign.id || "");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (user) await autoAssignTasks(user.uid, user.trustTier || 'New', user.country || "Global", user.role === 'admin');
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <WorkerLayout>
      {showTour && <DashboardTour onComplete={handleTourComplete} />}
      <div className="mb-12 space-y-2">
        <h1 className="text-4xl md:text-6xl font-display font-medium tracking-tight leading-[0.9]">
          Your Next Job<br />
          <span className="text-primary drop-shadow-sm">Starts Here.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-medium pt-3 max-w-xl">
          Join a growing network of elite operators. Complete tasks, build your reputation, and scale your earnings securely.
        </p>
      </div>
      <ValueProposition />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-semibold tracking-tight">Available Tasks</h2>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="rounded-xl border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground shadow-none">
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} /> Refresh
            </Button>
          </div>
          {assignments.length > 0 ? (
            assignments.map(assign => (
              <div key={assign.id} className="p-6 md:p-8 rounded-[1.5rem] bg-card border border-border space-y-4 relative overflow-hidden hover:border-primary/30 transition-colors shadow-sm">
                <div className="absolute top-0 right-0 bg-primary/10 text-primary font-semibold px-4 py-2 rounded-bl-[1rem] shadow-sm">
                  ${Number(assign.payout || 0).toFixed(2)}
                </div>
                <h3 className="text-xl font-semibold pr-16 text-foreground">{assign.taskTitle}</h3>
                <p className="text-muted-foreground leading-relaxed">{assign.taskDescription}</p>
                <div className="flex gap-4 pt-2">
                  <a href={getTrackedUrl(assign)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
                    Start Task <ArrowRight className="w-4 h-4" />
                  </a>
                  {assign.status === 'pending' && <Button size="sm" className="rounded-xl shadow-sm" onClick={() => setSelectedAssignment(assign)}>Submit Proof</Button>}
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 rounded-[1.5rem] border border-dashed border-border bg-card/50 text-center">
              <Target className="w-10 h-10 mx-auto text-muted-foreground mb-4 opacity-30" />
              <p className="font-medium text-muted-foreground text-sm">No tasks assigned</p>
            </div>
          )}
        </div>
      </div>

      {/* Submission Dialog */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedAssignment(null)} />
          <div className="relative bg-card border border-border shadow-md rounded-[1.5rem] w-full max-w-lg p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-display font-semibold text-foreground">Submit Proof</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">Provide evidence for task completion</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAssignment(null)} className="h-8 w-8 rounded-full border border-border">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmitProof} className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground ml-1">Proof Description</label>
                <Textarea 
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Describe your actions..."
                  className="h-32 bg-muted/50 border-border rounded-xl resize-none"
                  required
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground ml-1">Screenshot / Evidence</label>
                <div className="relative h-32 border-2 border-dashed border-border rounded-xl bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                  <input 
                    type="file" 
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*"
                    required
                  />
                  <FileUp className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {proofFile ? proofFile.name : "Upload Image"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="rounded-xl w-full h-12 shadow-sm  text-sm font-semibold"
                >
                  {submitting ? "Submitting..." : "Submit Proof"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}
