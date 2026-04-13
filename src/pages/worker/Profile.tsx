import { useAuth } from "../../contexts/AuthContext";
import WorkerLayout from "../../components/WorkerLayout";
import { User, Mail, Hash, LogOut, ShieldCheck, Award, Star, MapPin, Calendar, CreditCard } from "lucide-react";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function WorkerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <WorkerLayout>
      <div className="max-w-3xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-medium text-white mb-2">My Profile</h1>
          <p className="text-zinc-400">View your account details and status.</p>
        </div>
        
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center text-white font-display text-5xl font-bold shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              {user?.name?.charAt(0) || "W"}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-display font-semibold text-white">{user?.name}</h2>
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Worker
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Level {Math.floor((user?.earnings || 0) / 15) + 1}
                </span>
                {user?.averageRating && (
                  <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-yellow-400" /> {user.averageRating.toFixed(1)} Rating
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-6 p-6 bg-[#050505] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-medium mb-1">Email Address</div>
                <div className="text-white font-medium">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-[#050505] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-medium mb-1">Location</div>
                <div className="text-white font-medium">{user?.country || "Not set"}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-[#050505] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-medium mb-1">Age Group</div>
                <div className="text-white font-medium">{user?.age || "Not set"}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-[#050505] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-medium mb-1">Payment Email</div>
                <div className="text-white font-medium break-all">{user?.paymentEmail || "Not set"}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-[#050505] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors md:col-span-2">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <Hash className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-zinc-500 font-medium mb-1">Account ID</div>
                <div className="text-zinc-300 font-mono text-sm break-all">{user?.uid}</div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="w-full bg-white/5 hover:bg-red-500/10 text-white hover:text-red-400 border border-white/10 hover:border-red-500/20 font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
