import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebase";
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";
import { Wallet as WalletIcon, ArrowUpRight, Clock, CheckCircle2, XCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import WorkerLayout from "../../components/WorkerLayout";

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
      toast.error(error.message || "Failed to submit withdrawal request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkerLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-medium text-white mb-2">Wallet & Earnings</h1>
        <p className="text-zinc-400">Manage your balance and request payouts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <WalletIcon className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-white font-medium">Available Balance</h2>
              </div>
              
              <div className="text-6xl font-display font-bold text-white mb-12 tracking-tight">
                <span className="text-zinc-500 font-medium mr-2">$</span>
                {availableBalance.toFixed(2)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-8">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Total Earned</div>
                  <div className="text-xl font-medium text-white">${(user?.earnings || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Pending Withdrawals</div>
                  <div className="text-xl font-medium text-amber-400">${pendingWithdrawalsAmount.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0F0F0F]">
              <h2 className="text-lg font-medium text-white">Recent Transactions</h2>
            </div>
            <div className="divide-y divide-white/5">
              {withdrawals.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  No transaction history found.
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        w.status === 'paid' ? 'bg-purple-500/10 text-purple-400' :
                        w.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {w.status === 'paid' ? <CheckCircle2 className="w-6 h-6" /> :
                         w.status === 'rejected' ? <XCircle className="w-6 h-6" /> :
                         <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="text-white font-medium capitalize">{w.method} Payout</div>
                        <div className="text-zinc-500 text-sm mt-0.5">
                          {w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Processing...'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium text-lg">-${w.amount.toFixed(2)}</div>
                      <div className={`text-xs font-bold uppercase tracking-wider mt-1 ${
                        w.status === 'paid' ? 'text-purple-400' :
                        w.status === 'rejected' ? 'text-red-400' :
                        'text-amber-400'
                      }`}>
                        {w.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {/* Withdrawal Form */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 sticky top-8 shadow-xl">
            <h2 className="text-xl font-display font-medium text-white mb-6">Request Payout</h2>
            <form onSubmit={handleWithdraw} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Amount to Withdraw</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-zinc-500" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Payout Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all hover:border-white/20 appearance-none"
                >
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Crypto (USDT)</option>
                  <option value="cashapp">CashApp</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Destination Details</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                  placeholder={method === 'paypal' ? "PayPal Email" : method === 'crypto' ? "USDT Wallet Address" : "$Cashtag"}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || availableBalance <= 0}
                className="w-full bg-white text-[#050505] hover:bg-zinc-200 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-white mt-4 flex items-center justify-center gap-2"
              >
                {loading ? "Processing..." : "Submit Request"}
                {!loading && <ArrowUpRight className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
