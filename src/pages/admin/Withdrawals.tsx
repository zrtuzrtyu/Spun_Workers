import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDoc, serverTimestamp, addDoc, where } from "firebase/firestore";
import { Wallet as WalletIcon, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AdminLayout from "@/components/AdminLayout";

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [workersMap, setWorkersMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWithdrawals(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "withdrawals");
    });

    const qWorkers = query(collection(db, "users"), where("role", "==", "worker"));
    const unsubWorkers = onSnapshot(qWorkers, (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setWorkersMap(map);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => {
      unsubscribe();
      unsubWorkers();
    };
  }, []);

  const handleApprove = async (withdrawalId: string, workerId: string, amount: number) => {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      const workerRef = doc(db, "users", workerId);

      // Verify worker balance
      const workerSnap = await getDoc(workerRef);
      if (!workerSnap.exists()) {
        toast.error("Worker not found");
        return;
      }

      const currentBalance = workerSnap.data().balance || 0;
      if (currentBalance < amount) {
        toast.error("Worker has insufficient balance for this withdrawal");
        return;
      }

      // Update withdrawal status
      await updateDoc(withdrawalRef, {
        status: "paid",
        processedAt: serverTimestamp()
      });

      // Deduct from worker balance
      await updateDoc(workerRef, {
        balance: currentBalance - amount
      });

      // Log activity
      await addDoc(collection(db, "activities"), {
        type: "payout",
        description: `Processed payout of $${amount.toFixed(2)} to ${workerSnap.data().name}`,
        createdAt: serverTimestamp()
      });

      toast.success("Withdrawal marked as paid");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, "withdrawals");
    }
  };

  const handleReject = async (withdrawalId: string) => {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      await updateDoc(withdrawalRef, {
        status: "rejected",
        processedAt: serverTimestamp()
      });
      toast.success("Withdrawal rejected");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, "withdrawals");
    }
  };

  const filteredWithdrawals = withdrawals.filter(w => 
    w.workerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.method?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-sans font-bold text-white mb-2 leading-none">
            Financial Clearance
          </h1>
          <p className="text-zinc-400 text-lg font-sans max-w-2xl leading-relaxed">
            Authorize worker payout requests and monitor liquidity flow.
          </p>
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden shadow-xl mb-16">
        <div className="p-6 border-b border-white/5 bg-[#0F0F0F] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Search withdrawals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050505] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Worker Identity</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Country</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Volume</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Payout Method</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Destination Address</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Processed At</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-4 border-b border-white/5 bg-[#0A0A0A] text-xs font-medium text-zinc-500 uppercase tracking-wider text-right whitespace-nowrap">Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 text-sm">Scanning financial records...</td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500 text-sm">No payout requests detected in the system.</td>
                </tr>
              ) : (
                filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-sans font-medium text-zinc-200 text-base">{w.workerName}</div>
                      <div className="text-xs text-zinc-500 mt-1">UID: {w.workerId.substring(0, 12)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-400">
                        {workersMap[w.workerId]?.country || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-sans font-medium text-purple-400 text-lg">
                        ${w.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 bg-[#050505] border border-white/10 rounded-md text-xs font-medium text-zinc-300">
                        {w.method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-400 text-xs font-mono break-all max-w-[200px] bg-[#050505] border border-white/5 rounded-md p-2">{w.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-zinc-400">
                        {w.createdAt?.toDate ? format(w.createdAt.toDate(), "MMM d, yyyy") : 'Just now'}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {w.createdAt?.toDate ? format(w.createdAt.toDate(), "HH:mm:ss") : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {w.processedAt?.toDate ? (
                        <>
                          <div className="text-xs text-zinc-400">
                            {format(w.processedAt.toDate(), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {format(w.processedAt.toDate(), "HH:mm:ss")}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-zinc-500">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        w.status === 'paid' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        w.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-white/5 text-zinc-300 border border-white/10'
                      }`}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {w.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(w.id, w.workerId, w.amount)}
                            className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg transition-colors"
                            title="Authorize Payout"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button
                            onClick={() => handleReject(w.id)}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Reject Request"
                          >
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
