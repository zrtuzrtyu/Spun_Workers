import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { 
  collection, addDoc, query, onSnapshot, orderBy, 
  serverTimestamp, deleteDoc, doc, where, updateDoc, 
  getDocs, writeBatch
} from "firebase/firestore";
import { 
  Plus, Trash2, DollarSign, Clock, CheckCircle2, X, 
  Gavel, MessageSquare, ShieldAlert, ArrowRight,
  TrendingUp, Users, Target, Zap, Lock, Loader2,
  ChevronRight,
  Search,
  Filter,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import WorkerLayout from "@/components/WorkerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { DesignerIcon } from "@/components/DesignerIcon";

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
  const [hasActiveTask, setHasActiveTask] = useState(false);

  const currentLevel = user?.level || Math.floor((user?.earnings || 0) / 15) + 1;
  const isMarketplaceLocked = currentLevel < 2;

  useEffect(() => {
    if (!firebaseUser) return;

    // Check for active assignments
    const qAssigns = query(
      collection(db, "assignments"),
      where("workerId", "==", firebaseUser.uid)
    );
    
    // Check for active marketplace jobs
    const qMarket = query(
      collection(db, "requests"),
      where("winnerId", "==", firebaseUser.uid)
    );

    const unsubAssigns = onSnapshot(qAssigns, (snap) => {
      const hasAssign = snap.docs.some(doc => ['pending', 'submitted'].includes(doc.data().status));
      setHasActiveTask(prev => hasAssign || prev);
    }, (err) => { console.warn("Requests assigns snapshot restricted:", err) });

    const unsubMarket = onSnapshot(qMarket, (snap) => {
      const hasMarket = snap.docs.some(doc => doc.data().status === 'in_progress');
      setHasActiveTask(prev => hasMarket || prev);
    }, (err) => { console.warn("Requests market snapshot restricted:", err) });

    // Initial check to reset if both are empty
    const checkActive = async () => {
      try {
        const [s1, s2] = await Promise.all([getDocs(qAssigns), getDocs(qMarket)]);
        const assignExists = s1.docs.some(doc => ['pending', 'submitted'].includes(doc.data().status));
        const marketExists = s2.docs.some(doc => doc.data().status === 'in_progress');
        setHasActiveTask(assignExists || marketExists);
      } catch (err) {
        console.warn("Requests capacity fetch failed", err);
      }
    };
    checkActive();

    return () => {
      unsubAssigns();
      unsubMarket();
    };
  }, [firebaseUser]);

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
        
        // Tier filtering logic
        const tiers = ['New', 'Trusted', 'Premium'];
        const userTierIndex = tiers.indexOf(user?.trustTier || 'New');
        const requiredTierIndex = tiers.indexOf(req.requiredTier || 'New');
        
        if (userTierIndex < requiredTierIndex) return false;

        return ['open', 'in_progress', 'completed'].includes(req.status);
      });
      setRequests(data);
    }, (error: any) => {
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
    }, (error: any) => {
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
        status: "open",
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
      
      batch.update(doc(db, "requests", bid.requestId), {
        status: "in_progress",
        winnerId: bid.workerId,
        acceptedBidId: bid.id,
        finalAmount: bid.amount
      });

      batch.update(doc(db, "bids", bid.id), {
        status: "accepted"
      });

      const otherBidsQuery = query(
        collection(db, "bids"), 
        where("requestId", "==", bid.requestId)
      );
      const otherBidsSnap = await getDocs(otherBidsQuery);
      otherBidsSnap.forEach(doc => {
        if (doc.id !== bid.id && doc.data().status === "pending") {
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

  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "requests", id));
      toast.success("Request removed from marketplace");
      setRequestToDelete(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, "requests");
    }
  };

  if (user && user.role !== 'admin' && (isMarketplaceLocked || !user.onboardingCompleted)) {
    return (
      <WorkerLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-10 max-w-2xl mx-auto px-4">
          <DesignerIcon icon={Lock} size="lg" className="" />
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-foreground">Marketplace Locked</h1>
            <p className="text-muted-foreground leading-relaxed text-base md:text-lg font-light">
              {!user.onboardingCompleted 
                ? "You must complete the onboarding protocol before posting or bidding on jobs."
                : "You must reach Level 2 to unlock the Global Marketplace. Keep completing active assignments to level up!"}
            </p>
          </div>
          {!user.onboardingCompleted ? (
            <Link to="/worker/onboarding">
              <Button size="lg" className="h-14 px-8 rounded-full font-medium shadow-md  group">
                Complete Onboarding <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          ) : (
            <Link to="/worker">
              <Button size="lg" className="h-14 px-8 rounded-full font-medium shadow-md  group">
                Go to My Tasks <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          )}
          
          <div className="grid grid-cols-3 gap-8 w-full pt-12 border-t border-border">
            {[
              { icon: ShieldAlert, label: "Identity Verified" },
              { icon: Target, label: "Skill Assessment" },
              { icon: Zap, label: "Instant Payouts" }
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="w-12 h-12 bg-card border border-border rounded-2xl flex items-center justify-center mx-auto text-muted-foreground/60">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
        <div className="space-y-4">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-md">
            <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" /> Distributed Marketplace
          </Badge>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-foreground leading-[1.1]">Marketplace<span className="text-primary drop-shadow-sm">.</span></h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium max-w-xl leading-relaxed">Browse high-accuracy job requests or post your own protocol to the network.</p>
        </div>
        <Button 
          onClick={() => setIsCreating(!isCreating)}
          className={cn(
            "h-14 px-8 rounded-[1rem] font-semibold text-xs uppercase tracking-widest transition-all shadow-sm",
            isCreating ? "bg-card text-foreground hover:bg-muted border border-border" : ""
          )}
        >
          {isCreating ? <X className="w-5 h-5 mr-3" /> : <Plus className="w-5 h-5 mr-3" />}
          {isCreating ? "Cancel Posting" : "Post Job Request"}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-12 overflow-hidden"
          >
            <Card className="border-border bg-card rounded-[1.5rem] overflow-hidden shadow-sm">
              <CardHeader className="p-8 pb-6 border-b border-border">
                <CardTitle className="text-2xl font-display font-semibold text-foreground">New Job Specification</CardTitle>
                <CardDescription className="text-xs font-medium text-muted-foreground mt-2">Define the parameters for your distributed task.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={handleCreateRequest} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-1">Job Title</label>
                      <Input 
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. High-Res Image Annotation"
                        className="h-14 bg-card border-border focus:border-primary rounded-2xl px-6 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-1">Offer Amount ($)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <Input 
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                          placeholder="0.00"
                          className="h-14 pl-14 bg-card border-border focus:border-primary rounded-2xl px-6 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 ml-1">Detailed Description</label>
                    <Textarea 
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Provide clear instructions and expected deliverables..."
                      className="bg-card border-border focus:border-primary rounded-2xl p-6 text-sm resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={loading}
                      className="h-16 px-12 rounded-full font-semibold text-xs uppercase tracking-widest shadow-sm "
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Zap className="w-4 h-4 mr-3" />}
                      Broadcast to Network
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-10">
        {requests.length === 0 ? (
          <div className="text-center py-40 bg-muted/30 border border-dashed border-border rounded-[3rem] space-y-8">
            <div className="w-24 h-24 bg-muted border border-border rounded-[2rem] flex items-center justify-center mx-auto text-muted-foreground/40">
              <TrendingUp className="w-12 h-12" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold uppercase tracking-widest text-muted-foreground/60">No Jobs Available</h3>
              <p className="text-xs font-mono text-muted-foreground/30 uppercase tracking-widest italic">Check back later for new requests.</p>
            </div>
          </div>
        ) : (
          requests.map((req) => {
            const isQualified = user?.skills?.some((skill: string) => req.category === skill || req.title.toLowerCase().includes(skill.toLowerCase()));
            
            return (
              <motion.div
                layout
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, scale: 1.005 }}
                className="group relative rounded-[1.5rem] bg-card border border-border hover:border-primary/30 shadow-sm transition-all duration-300 overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                   <div className="flex-1 p-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="outline" className={cn(
                            "text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-md border-none",
                            req.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' :
                            req.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-primary/10 text-primary'
                          )}>
                            {req.status.replace('_', ' ')}
                          </Badge>
                          {isQualified && (
                            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-md shadow-sm">
                              <Sparkles className="w-3 h-3 mr-1 fill-current" /> Qualified Match
                            </Badge>
                          )}
                          <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                            REQ_{req.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-display font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">{req.title}</h3>
                        <div className="flex items-center gap-6 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> {req.requesterName}</span>
                          <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {req.createdAt?.toDate().toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-3xl md:text-4xl font-display font-semibold text-foreground">
                          ${req.offerAmount.toFixed(2)}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Offer Amount</div>
                      </div>
                    </div>
                    <p className="text-muted-foreground font-medium text-lg md:text-xl line-clamp-3 leading-relaxed">
                      {req.description}
                    </p>
                  </div>
                  
                  <div className="w-full md:w-80 bg-muted/20 border-t md:border-t-0 md:border-l border-border p-8 flex flex-col justify-center gap-4">
                    {req.requesterId === firebaseUser?.uid ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="w-full h-12 rounded-[1rem] font-semibold text-xs border-border hover:bg-muted"
                          onClick={() => setViewingBidsFor(req.id)}
                        >
                          <Gavel className="w-4 h-4 mr-2" /> View Bids
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full h-12 rounded-[1rem] font-semibold text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRequestToDelete(req.id)}
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
                                  className="w-full h-12 rounded-[1rem] font-semibold text-xs shadow-sm "
                                  onClick={() => {
                                    if (hasActiveTask) {
                                      toast.error("Linear Protocol Active: Finish your current task before bidding on new ones.");
                                      return;
                                    }
                                    setSelectedRequest(req);
                                  }}
                                  disabled={hasActiveTask}
                                >
                                  {hasActiveTask ? <Lock className="w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                                  {hasActiveTask ? "Task In Progress" : "Place Bid"}
                                </Button>
                              }
                            />
                            <DialogContent className="bg-card border-border rounded-[1.5rem] p-8 max-w-xl shadow-md">
                              <DialogHeader className="space-y-2">
                                <DialogTitle className="text-2xl font-display font-semibold text-foreground">Submit Proposal</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground">
                                  Propose your terms for "{req.title}"
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 py-6">
                                <div className="space-y-3">
                                  <label className="text-xs font-semibold text-muted-foreground ml-1">Your Bid Amount ($)</label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                      type="number"
                                      step="0.01"
                                      value={bidAmount}
                                      onChange={(e) => setBidAmount(e.target.value)}
                                      placeholder={req.offerAmount.toString()}
                                      className="h-12 pl-12 bg-muted/50 border-border focus:border-primary rounded-[1rem] px-4 font-medium"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <label className="text-xs font-semibold text-muted-foreground ml-1">Proposal / Cover Letter</label>
                                  <Textarea 
                                    value={proposal}
                                    onChange={(e) => setProposal(e.target.value)}
                                    rows={5}
                                    placeholder="Explain why you're the best fit for this task..."
                                    className="bg-muted/50 border-border focus:border-primary rounded-[1rem] p-4 font-medium resize-none"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  className="w-full h-12 rounded-[1rem] font-semibold text-sm shadow-sm "
                                  onClick={handlePlaceBid}
                                  disabled={loading}
                                >
                                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                                  Submit Bid
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button variant="outline" className="w-full h-12 rounded-[1rem] font-semibold text-xs border-border hover:bg-muted">
                          <MessageSquare className="w-4 h-4 mr-2 text-muted-foreground" /> Message
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Bids Viewer Dialog */}
      <Dialog open={!!viewingBidsFor} onOpenChange={(open) => !open && setViewingBidsFor(null)}>
        <DialogContent className="max-w-2xl bg-card border-border rounded-[1.5rem] p-8 max-h-[85vh] overflow-y-auto hide-scrollbar shadow-md">
          <DialogHeader className="space-y-2 mb-8">
            <DialogTitle className="text-2xl font-display font-semibold text-foreground">Active Bids</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              Review proposals from verified operators.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {bids.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground/40 text-sm font-medium">
                No bids received yet.
              </div>
            ) : (
              bids.map((bid) => (
                <div key={bid.id} className="p-6 rounded-[1rem] bg-muted/20 border border-border space-y-6 hover:border-primary/20 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold border border-primary/20 text-lg">
                        {bid.workerName.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-semibold text-foreground">{bid.workerName}</div>
                        <Badge variant="outline" className="text-xs font-semibold uppercase tracking-widest border-border text-muted-foreground/60">Verified Operator</Badge>
                      </div>
                    </div>
                    <div className="text-2xl font-display font-semibold text-primary">${bid.amount.toFixed(2)}</div>
                  </div>
                  <div className="p-6 rounded-[1rem] bg-card border border-border text-muted-foreground font-medium leading-relaxed text-sm">
                    {bid.proposal}
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      className="h-12 px-6 rounded-[1rem] font-semibold text-xs shadow-sm "
                      onClick={() => handleAcceptBid(bid)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Accept Bid
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {requestToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-[1.5rem] p-8 max-w-sm w-full shadow-md space-y-6"
            >
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-destructive/10 rounded-[1rem] flex items-center justify-center mx-auto text-destructive mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-display font-semibold text-foreground">Delete Request</h3>
                <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                  Are you sure you want to delete this request? This action cannot be undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  className="h-12 rounded-[1rem] font-semibold text-xs border-border"
                  onClick={() => setRequestToDelete(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  className="h-12 rounded-[1rem] font-semibold text-xs shadow-sm shadow-destructive/20"
                  onClick={() => handleDelete(requestToDelete)}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </WorkerLayout>
  );
}
