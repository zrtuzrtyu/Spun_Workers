import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import { 
  collection, addDoc, query, onSnapshot, orderBy, 
  serverTimestamp, deleteDoc, doc, where, updateDoc, 
  getDocs, writeBatch
} from "firebase/firestore";
import { 
  Plus, Trash2, DollarSign, Clock, CheckCircle2, X, 
  Gavel, MessageSquare, ShieldAlert, ArrowRight,
  TrendingUp, Users, Target, Zap, Lock, Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import WorkerLayout from "../../components/WorkerLayout";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "../../components/ui/dialog";
import { cn } from "../../lib/utils";
import { Link } from "react-router-dom";

export default function Requests() {
  const { user, firebaseUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [proposal, setProposal] = useState("");
  const [bids, setBids] = useState<any[]>([]);
  const [viewingBidsFor, setViewingBidsFor] = useState<string | null>(null);

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
      })).filter((req: any) => {
        if (req.requesterId === firebaseUser.uid) return true;
        return ['open', 'in_progress', 'completed'].includes(req.status);
      });
      setRequests(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "requests");
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  useEffect(() => {
    if (!viewingBidsFor) {
      setBids([]);
      return;
    }

    const q = query(
      collection(db, "bids"),
      where("requestId", "==", viewingBidsFor),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBids(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "bids");
    });

    return () => unsubscribe();
  }, [viewingBidsFor]);

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
        requesterName: user.username || user.name,
        status: "open", // Default to open for now, or pending_approval if admin review is needed
        createdAt: serverTimestamp()
      });
      
      toast.success("Job request posted to the marketplace");
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

  const handlePlaceBid = async () => {
    if (!firebaseUser || !user || !selectedRequest) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid bid amount");
      return;
    }

    if (!proposal.trim()) {
      toast.error("Please include a proposal message");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "bids"), {
        requestId: selectedRequest.id,
        workerId: firebaseUser.uid,
        workerName: user.username || user.name,
        amount,
        proposal: proposal.trim(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      toast.success("Your bid has been submitted");
      setBidAmount("");
      setProposal("");
      setSelectedRequest(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, "bids");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (bid: any) => {
    if (!firebaseUser) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      // Update request
      batch.update(doc(db, "requests", bid.requestId), {
        status: "in_progress",
        winnerId: bid.workerId,
        acceptedBidId: bid.id,
        finalAmount: bid.amount
      });

      // Update accepted bid
      batch.update(doc(db, "bids", bid.id), {
        status: "accepted"
      });

      // Reject other bids
      const otherBidsQuery = query(
        collection(db, "bids"), 
        where("requestId", "==", bid.requestId),
        where("status", "==", "pending")
      );
      const otherBidsSnap = await getDocs(otherBidsQuery);
      otherBidsSnap.forEach(doc => {
        if (doc.id !== bid.id) {
          batch.update(doc.ref, { status: "rejected" });
        }
      });

      await batch.commit();
      toast.success("Bid accepted! Job is now in progress.");
      setViewingBidsFor(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, "requests");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    try {
      await deleteDoc(doc(db, "requests", id));
      toast.success("Request removed from marketplace");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, "requests");
    }
  };

  if (user && !user.onboardingCompleted) {
    return (
      <WorkerLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center text-primary relative">
            <Lock className="w-12 h-12" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white">Marketplace Locked</h1>
            <p className="text-muted-foreground leading-relaxed">
              To maintain the integrity of the SpunForce network, all operators must complete the 10-step precision onboarding protocol before posting or bidding on jobs.
            </p>
          </div>
          <Link to="/worker/onboarding">
            <Button size="lg" className="h-14 px-10 font-bold shadow-xl shadow-primary/20 group">
              Complete Onboarding <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <div className="grid grid-cols-3 gap-6 w-full pt-8">
            {[
              { icon: ShieldAlert, label: "Identity Verified" },
              { icon: Target, label: "Skill Assessment" },
              { icon: Zap, label: "Instant Payouts" }
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center mx-auto text-muted-foreground">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-white">Marketplace</h1>
          <p className="text-muted-foreground">Browse high-accuracy job requests or post your own protocol.</p>
        </div>
        <Button 
          onClick={() => setIsCreating(!isCreating)}
          className={cn(
            "h-12 px-6 font-bold shadow-xl transition-all",
            isCreating ? "bg-muted text-foreground hover:bg-muted/80" : "shadow-primary/20"
          )}
        >
          {isCreating ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          {isCreating ? "Cancel Posting" : "Post Job Request"}
        </Button>
      </div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="text-xl font-bold">New Job Specification</CardTitle>
              <CardDescription>Define the parameters for your distributed task.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Job Title</label>
                    <Input 
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. High-Res Image Annotation"
                      className="h-12 bg-background/50 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Offer Amount ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-12 pl-10 bg-background/50 border-border/50"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Detailed Description</label>
                  <Textarea 
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Provide clear instructions and expected deliverables..."
                    className="bg-background/50 border-border/50 resize-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="h-12 px-10 font-bold shadow-lg shadow-primary/20"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Broadcast to Network"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 border border-dashed border-border rounded-3xl">
            <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto text-muted-foreground mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <p className="text-muted-foreground font-medium">No active job requests in the marketplace.</p>
          </div>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="border-border/50 bg-card/50 hover:bg-muted/30 transition-all group overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-8 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white">{req.title}</h3>
                          <Badge variant="secondary" className={cn(
                            "text-[9px] font-bold uppercase tracking-widest",
                            req.status === 'open' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                            req.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-primary/10 text-primary border-primary/20'
                          )}>
                            {req.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {req.requesterName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.createdAt?.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-3xl font-bold tracking-tighter text-primary">
                        ${req.offerAmount.toFixed(2)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {req.description}
                    </p>
                  </div>
                  
                  <div className="w-full md:w-64 bg-muted/30 border-t md:border-t-0 md:border-l border-border/50 p-6 flex flex-col justify-center gap-3">
                    {req.requesterId === firebaseUser?.uid ? (
                      <>
                        <Button 
                          variant="secondary" 
                          className="w-full font-bold text-xs uppercase tracking-widest h-10"
                          onClick={() => setViewingBidsFor(req.id)}
                        >
                          <Gavel className="w-4 h-4 mr-2" /> View Bids
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full font-bold text-xs uppercase tracking-widest h-10 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(req.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        {req.status === 'open' && (
                          <Dialog open={selectedRequest?.id === req.id} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                            <DialogTrigger 
                              render={
                                <Button 
                                  className="w-full font-bold text-xs uppercase tracking-widest h-12 shadow-lg shadow-primary/20"
                                  onClick={() => setSelectedRequest(req)}
                                >
                                  <Zap className="w-4 h-4 mr-2" /> Place Bid
                                </Button>
                              }
                            />
                            <DialogContent className="bg-card border-border/50">
                              <DialogHeader>
                                <DialogTitle>Submit Proposal</DialogTitle>
                                <DialogDescription>
                                  Propose your terms for "{req.title}"
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 py-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Bid Amount ($)</label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={bidAmount}
                                      onChange={(e) => setBidAmount(e.target.value)}
                                      placeholder={req.offerAmount.toString()}
                                      className="h-12 pl-10 bg-background/50 border-border/50"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Proposal / Cover Letter</label>
                                  <Textarea 
                                    value={proposal}
                                    onChange={(e) => setProposal(e.target.value)}
                                    rows={4}
                                    placeholder="Explain why you're the best fit for this task..."
                                    className="bg-background/50 border-border/50 resize-none"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  className="w-full h-12 font-bold"
                                  onClick={handlePlaceBid}
                                  disabled={loading}
                                >
                                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Bid"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button variant="outline" className="w-full font-bold text-xs uppercase tracking-widest h-10 border-border/50">
                          <MessageSquare className="w-4 h-4 mr-2" /> Message
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Bids Viewer Dialog */}
      <Dialog open={!!viewingBidsFor} onOpenChange={(open) => !open && setViewingBidsFor(null)}>
        <DialogContent className="max-w-2xl bg-card border-border/50 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>Active Bids</DialogTitle>
            <DialogDescription>
              Review proposals from verified operators.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {bids.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm italic">
                No bids received yet.
              </div>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="p-6 rounded-2xl bg-muted/30 border border-border/50 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {bid.workerName.charAt(0)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-white">{bid.workerName}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verified Operator</div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-primary">${bid.amount.toFixed(2)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-background/50 p-4 rounded-xl border border-border/50">
                    {bid.proposal}
                  </p>
                  <div className="flex justify-end pt-2">
                    <Button 
                      size="sm" 
                      className="font-bold text-[10px] uppercase tracking-widest px-6"
                      onClick={() => handleAcceptBid(bid)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Accept Bid"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </WorkerLayout>
  );
}
