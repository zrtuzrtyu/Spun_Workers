import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { Wallet as WalletIcon, ArrowUpRight, Clock, CheckCircle2, XCircle, DollarSign, Sparkles, TrendingUp, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import WorkerLayout from "@/components/WorkerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { DesignerIcon } from "@/components/DesignerIcon";

export default function Wallet() {
  const { user, firebaseUser } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("paypal");
  const [address, setAddress] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;

    const q = query(
      collection(db, "withdrawals"),
      where("workerId", "==", firebaseUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWithdrawals(data);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, "withdrawals");
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  const pendingWithdrawalsAmount = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  const availableBalance = Math.max(0, (user?.balance || 0) - pendingWithdrawalsAmount);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !user) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!address.trim()) {
      toast.error("Please enter your payment address");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "withdrawals"), {
        workerId: firebaseUser.uid,
        workerName: user.name,
        workerCountry: user.country || 'Global',
        amount: withdrawAmount,
        method,
        address,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      toast.success("Withdrawal request submitted successfully");
      setAmount("");
      setAddress("");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, "withdrawals");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkerLayout>
      <div className="mb-10 md:mb-16 space-y-4">
        <Badge variant="outline" className="bg-white/[0.03] border-white/[0.08] text-muted-foreground px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.3em] rounded-full">
          <TrendingUp className="w-3 h-3 mr-2 text-primary" /> Financial Overview
        </Badge>
        <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-white leading-none">Wallet<span className="text-primary">.</span></h1>
        <p className="text-muted-foreground text-base md:text-lg font-light max-w-xl">Manage your distributed earnings and execute secure payout protocols.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          {/* Balance Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[2.5rem] md:rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="relative bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
              
              <div className="relative z-10 space-y-8 md:space-y-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <DesignerIcon icon={WalletIcon} size="md" />
                    <div className="space-y-1">
                      <h2 className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-white">Available Balance</h2>
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                        <ShieldCheck className="w-3 h-3" /> Secure Node Verified
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <Badge variant="outline" className="bg-white/[0.03] border-white/[0.1] text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full">
                      USD / FIAT
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 md:gap-4">
                  <span className="text-2xl md:text-5xl font-display font-bold text-muted-foreground/30">$</span>
                  <div className="text-5xl md:text-9xl font-display font-bold text-white tracking-tighter">
                    {availableBalance.toFixed(2)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 md:gap-12 pt-8 md:pt-12 border-t border-white/[0.05]">
                  <div className="space-y-2">
                    <div className="text-[9px] md:text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">Total Earnings</div>
                    <div className="text-xl md:text-3xl font-display font-bold text-white">${(user?.earnings || 0).toFixed(2)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[9px] md:text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">Pending Payouts</div>
                    <div className="text-xl md:text-3xl font-display font-bold text-primary">${pendingWithdrawalsAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">Recent Transactions</h2>
              <div className="text-[9px] font-mono font-bold text-muted-foreground/40 uppercase tracking-widest">
                Node_History // v1.0.4
              </div>
            </div>
            
            <div className="rounded-[2.5rem] border border-white/[0.05] bg-white/[0.01] overflow-hidden">
              <div className="divide-y divide-white/[0.05]">
                {withdrawals.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto opacity-20">
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">No transaction history detected</p>
                  </div>
                ) : (
                  withdrawals.map((w) => (
                    <div key={w.id} className="p-6 md:p-8 flex items-center justify-between hover:bg-white/[0.02] transition-all duration-300 group">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border transition-colors duration-500",
                          w.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          w.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        )}>
                          {w.status === 'paid' ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> :
                           w.status === 'rejected' ? <XCircle className="w-5 h-5 md:w-6 md:h-6" /> :
                           <Clock className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-base md:text-lg font-bold text-white capitalize">{w.method} Payout</div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                            {w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Processing...'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1 md:space-y-2">
                        <div className="text-xl md:text-2xl font-display font-bold text-white">-${w.amount.toFixed(2)}</div>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-bold uppercase tracking-widest border-none px-3 py-1 rounded-full",
                          w.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          w.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                          'bg-amber-500/10 text-amber-500'
                        )}>
                          {w.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          {/* Withdrawal Form */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-10 sticky top-12 shadow-2xl space-y-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">Request Payout</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Execute secure withdrawal protocol.</p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Withdrawal Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input
                    type="number"
                    step="0.01"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 pl-14 bg-white/[0.02] border-white/[0.08] focus:border-primary rounded-2xl px-6 text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Max: ${availableBalance.toFixed(2)}</span>
                  <button 
                    type="button" 
                    onClick={() => setAmount(availableBalance.toString())}
                    className="text-[9px] font-bold text-primary uppercase tracking-widest hover:opacity-70"
                  >
                    Withdraw All
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Payout Method</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="h-14 bg-white/[0.02] border-white/[0.08] focus:border-primary rounded-2xl px-6 text-sm">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/[0.1] rounded-2xl">
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                    <SelectItem value="cashapp">CashApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Destination Details</label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-14 bg-white/[0.02] border-white/[0.08] focus:border-primary rounded-2xl px-6 text-sm"
                  placeholder={method === 'paypal' ? "PayPal Email" : method === 'crypto' ? "USDT Wallet Address" : "$Cashtag"}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || availableBalance <= 0}
                className="w-full h-14 md:h-16 rounded-full font-bold text-[10px] md:text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <>
                    Submit Request <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
              <div className="flex items-start gap-3 text-[10px] text-muted-foreground/60 font-light leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                Payouts are processed within 24-48 hours after verification.
              </div>
              <div className="flex items-start gap-3 text-[10px] text-muted-foreground/60 font-light leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                Minimum withdrawal amount is $5.00.
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
