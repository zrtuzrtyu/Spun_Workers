import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { Plus, Trash2, DollarSign, Clock, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import WorkerLayout from "../../components/WorkerLayout";

export default function Requests() {
  const { user, firebaseUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;

    const q = query(
      collection(db, "requests"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "requests");
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !user) return;

    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "requests"), {
        title: title.trim(),
        description: description.trim(),
        offerAmount: amount,
        requesterId: firebaseUser.uid,
        requesterName: user.name,
        status: "open",
        createdAt: serverTimestamp()
      });
      
      toast.success("Request posted successfully");
      setTitle("");
      setDescription("");
      setOfferAmount("");
      setIsCreating(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, "requests");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    try {
      await deleteDoc(doc(db, "requests", id));
      toast.success("Request deleted");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, "requests");
    }
  };

  return (
    <WorkerLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-medium text-white mb-2">Job Board</h1>
          <p className="text-zinc-400">Post requests or find tasks from other users.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-purple-500 hover:bg-purple-600 text-[#050505] font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          {isCreating ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isCreating ? "Cancel" : "Post Request"}
        </button>
      </div>

      {isCreating && (
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 mb-8 shadow-xl">
          <h2 className="text-xl font-display font-medium text-white mb-6">Create a New Request</h2>
          <form onSubmit={handleCreateRequest} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">Title</label>
              <input 
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Need a logo design"
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">Description</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what you need done in detail..."
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">Offer Amount ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-zinc-500" />
                </div>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#050505] border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 text-[#050505] font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-[#0A0A0A] border border-white/5 rounded-2xl">
            <p className="text-zinc-500">No requests posted yet. Be the first to post!</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-display font-medium text-white">{req.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
                    <span>Posted by {req.requesterName}</span>
                    <span>•</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      req.status === 'open' ? 'bg-green-500/20 text-green-400' :
                      req.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    ${req.offerAmount.toFixed(2)}
                  </div>
                  {req.requesterId === firebaseUser?.uid && (
                    <button 
                      onClick={() => handleDelete(req.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-2"
                      title="Delete Request"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                {req.description}
              </p>
            </div>
          ))
        )}
      </div>
    </WorkerLayout>
  );
}
