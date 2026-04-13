import React, { useEffect, useState } from "react";
import WorkerLayout from "../../components/WorkerLayout";
import { collection, query, onSnapshot, where, doc, updateDoc, getDoc, serverTimestamp, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Clock, DollarSign, UploadCloud, FileUp } from "lucide-react";

export default function WorkerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const autoAssignTasks = async (workerId: string, currentLevel: number) => {
    // Tasks are assigned based on level 1-5
    const tasksQuery = query(collection(db, "tasks"), where("level", "<=", currentLevel));
    const tasksSnap = await getDocs(tasksQuery);
    
    const assignmentsQuery = query(collection(db, "assignments"), where("workerId", "==", workerId));
    const assignmentsSnap = await getDocs(assignmentsQuery);
    const assignedTaskIds = assignmentsSnap.docs.map(d => d.data().taskId);

    for (const taskDoc of tasksSnap.docs) {
      if (!assignedTaskIds.includes(taskDoc.id)) {
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
      autoAssignTasks(user.uid, user.level || 1);
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
        // Sort pending first, then submitted, then approved/rejected
        const order: any = { pending: 0, submitted: 1, rejected: 2, approved: 3 };
        return order[a.status] - order[b.status];
      }));
    });

    return () => unsub();
  }, [user]);

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!proofFile) {
      toast.error("Please select a screenshot file.");
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
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-medium text-white mb-2">My Tasks</h1>
          <p className="text-zinc-400">Complete your assigned tasks and submit proof to get paid.</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Current Trust Tier</div>
            <div className={`text-lg font-bold ${
              user?.trustTier === 'Premium' ? 'text-amber-400' :
              user?.trustTier === 'Trusted' ? 'text-blue-400' :
              'text-zinc-300'
            }`}>
              {user?.trustTier || 'New'} Worker
            </div>
          </div>
          <div className="w-px h-10 bg-white/10 mx-2"></div>
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Quality Score</div>
            <div className="text-lg font-bold text-white flex items-center gap-1">
              {user?.averageRating ? user.averageRating.toFixed(1) : 'N/A'} <span className="text-amber-400 text-sm">★</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {assignments.length === 0 ? (
            <div className="bg-[#0A0A0A] border border-white/5 p-12 rounded-3xl text-center shadow-xl">
              <CheckCircle2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-display font-medium text-white mb-2">You're all caught up!</h3>
              <p className="text-zinc-400">No new tasks assigned right now. Check back later.</p>
            </div>
          ) : (
            assignments.map(assign => (
              <div key={assign.id} className={`bg-[#0A0A0A] border rounded-2xl p-6 transition-all shadow-xl ${
                assign.status === 'pending' ? 'border-purple-500/50 shadow-[0_0_20px_-5px_rgba(139,92,246,0.2)]' : 'border-white/5'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-display font-medium text-white">{assign.taskTitle}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        assign.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        assign.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
                        assign.status === 'approved' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {assign.status}
                      </span>
                      <span className="text-purple-400 font-bold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" /> {assign.payout.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {assign.status === 'pending' && (
                    <button 
                      onClick={() => setSelectedAssignment(assign)}
                      className="bg-purple-500 hover:bg-purple-600 text-[#050505] font-bold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Submit Proof
                    </button>
                  )}
                </div>
                
                <div className="bg-[#050505] p-4 rounded-xl border border-white/5">
                  <div className="text-xs text-zinc-500 uppercase font-bold mb-2 tracking-wider">Instructions:</div>
                  <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed mb-4">{assign.taskDescription}</p>
                  
                  {assign.taskLink && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <a 
                        href={getTrackedUrl(assign)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={() => handleOfferClick(assign)}
                        className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm"
                      >
                        Start Task
                      </a>
                    </div>
                  )}
                </div>

                {assign.status === 'rejected' && (
                  <div className="mt-4 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm">
                    <strong>Task Rejected:</strong> Your submission was not approved. Please ensure you follow all instructions carefully.
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedAssignment ? (
            <div className="bg-[#0A0A0A] border border-purple-500/50 rounded-2xl p-6 sticky top-8 shadow-[0_0_30px_-10px_rgba(139,92,246,0.3)]">
              <h3 className="text-xl font-display font-medium text-white mb-6 flex items-center gap-2">
                <UploadCloud className="w-6 h-6 text-purple-400" /> Submit Proof
              </h3>
              <div className="mb-6">
                <div className="text-sm text-zinc-400 mb-1">Task:</div>
                <div className="font-bold text-white">{selectedAssignment.taskTitle}</div>
              </div>
              <form onSubmit={handleSubmitProof} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-300">Proof Details / Text (Optional)</label>
                  <textarea 
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    rows={4}
                    placeholder="Enter any required text, emails, or links..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-300">Screenshot (Required)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 bg-[#050505] border border-white/10 rounded-xl p-4 text-zinc-500 cursor-pointer hover:border-purple-500/50 transition-all flex items-center gap-3">
                      <FileUp className="w-5 h-5" />
                      {proofFile ? proofFile.name : "Choose a screenshot..."}
                      <input 
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Upload a screenshot of the completed task. This is required.</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setSelectedAssignment(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-[#050505] font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 text-center sticky top-8 shadow-xl">
              <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-display font-medium text-white mb-2">Ready to work?</h3>
              <p className="text-zinc-400 text-sm">Select a pending task from the list to submit your proof of completion.</p>
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
