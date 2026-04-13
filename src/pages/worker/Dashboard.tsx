import React, { useEffect, useState } from "react";
import WorkerLayout from "../../components/WorkerLayout";
import { collection, query, onSnapshot, where, doc, updateDoc, getDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Clock, DollarSign, UploadCloud, FileUp, TrendingUp, Zap, Trophy, Users, ExternalLink, AlertCircle } from "lucide-react";
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
    }, (error) => {
      console.error("Assignments listener error:", error);
    });

    const qActivities = query(collection(db, "activities"), where("type", "==", "task_submitted"));
    const unsubActivities = onSnapshot(qActivities, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    }, (error) => {
      console.error("Activities listener error:", error);
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
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit proof.");
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
      <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user?.name?.split(' ')[0]}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors px-2 py-0.5">
              <Zap className="w-3 h-3 mr-1.5 fill-current" />
              3 Day Streak
            </Badge>
            <p className="text-muted-foreground text-sm font-medium">
              ${earningsToNextLevel.toFixed(2)} until <span className="text-foreground">Level {currentLevel + 1}</span>
            </p>
          </div>
        </div>
        
        <Card className="w-full lg:w-80 bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-5">
            <div className="flex justify-between items-end mb-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Progress</div>
              <div className="text-xs font-mono font-bold text-primary">{levelProgress}%</div>
            </div>
            <Progress value={levelProgress} className="h-1.5 mb-2" />
            <p className="text-[10px] text-muted-foreground/70 font-medium">Unlock Premium Tier at Level {currentLevel + 1}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-primary" /> Active Assignments
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {assignments.length} Tasks
            </Badge>
          </div>

          <div className="space-y-4">
            {assignments.length === 0 ? (
              <Card className="border-dashed border-2 bg-transparent">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">All caught up!</h3>
                  <p className="text-sm text-muted-foreground">No new tasks assigned. We'll notify you when new jobs arrive.</p>
                </CardContent>
              </Card>
            ) : (
              assignments.map(assign => (
                <Card key={assign.id} className={cn(
                  "transition-all duration-300 group overflow-hidden",
                  assign.status === 'pending' ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-border/50'
                )}>
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{assign.taskTitle}</h3>
                          <div className="flex items-center gap-2.5">
                            <Badge className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0",
                              assign.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              assign.status === 'submitted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                              assign.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              'bg-destructive/10 text-destructive border-destructive/20'
                            )}>
                              {assign.status}
                            </Badge>
                            <span className="text-primary font-mono font-bold text-sm flex items-center">
                              <DollarSign className="w-3.5 h-3.5" />{assign.payout.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {assign.status === 'pending' && (
                          <Button 
                            onClick={() => setSelectedAssignment(assign)}
                            size="sm"
                            className="font-bold shadow-lg shadow-primary/20"
                          >
                            Submit Proof
                          </Button>
                        )}
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2 tracking-widest">Instructions</div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                          {assign.taskDescription}
                        </p>
                        
                        {assign.taskLink && (
                          <div className="pt-4 border-t border-border/50">
                            <a 
                              href={getTrackedUrl(assign)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              onClick={() => handleOfferClick(assign)}
                              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "h-8 font-bold")}
                            >
                              Start Task <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </div>
                        )}
                      </div>

                      {assign.status === 'rejected' && (
                        <div className="mt-4 flex items-start gap-3 bg-destructive/5 border border-destructive/20 p-3 rounded-lg text-destructive text-xs font-medium">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Submission rejected. Please review instructions and try again.</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Network Activity
              </CardTitle>
              <CardDescription className="text-[10px] uppercase tracking-widest">Real-time global feed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {activities.map((activity, i) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 group"
                >
                  <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">Task Verified in US</div>
                    <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      Just now • Global Node
                    </div>
                  </div>
                </motion.div>
              ))}
              {activities.length === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">Synchronizing with network...</p>
              )}
            </CardContent>
          </Card>

          <AnimatePresence>
            {selectedAssignment ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="sticky top-6"
              >
                <Card className="border-primary/50 shadow-2xl shadow-primary/10">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-primary" /> Submit Proof
                    </CardTitle>
                    <CardDescription className="text-xs font-medium">
                      Task: <span className="text-foreground font-bold">{selectedAssignment.taskTitle}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitProof} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Proof Details</label>
                        <Textarea 
                          value={proofText}
                          onChange={(e) => setProofText(e.target.value)}
                          placeholder="Enter required text, links, or comments..."
                          className="min-h-[100px] bg-muted/50 border-border/50 focus:border-primary transition-all resize-none text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Screenshot</label>
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
                            className="flex items-center gap-3 px-4 py-3 bg-muted/50 border border-border/50 rounded-lg cursor-pointer hover:bg-muted transition-all group"
                          >
                            <FileUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <span className="text-xs text-muted-foreground truncate font-medium">
                              {proofFile ? proofFile.name : "Select screenshot..."}
                            </span>
                          </label>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">Max size: 5MB. Format: PNG, JPG.</p>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="button"
                          variant="ghost"
                          onClick={() => setSelectedAssignment(null)}
                          className="flex-1 font-bold text-xs"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={submitting}
                          className="flex-1 font-bold text-xs shadow-lg shadow-primary/20"
                        >
                          {submitting ? "Processing..." : "Submit Proof"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="bg-muted/20 border-dashed border-border/50 sticky top-6">
                <CardContent className="p-8 text-center">
                  <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-muted-foreground mb-1">Queue Empty</h3>
                  <p className="text-[11px] text-muted-foreground/60">Select a task to begin the verification process.</p>
                </CardContent>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </WorkerLayout>
  );
}
