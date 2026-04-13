import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MapPin, Mail, Calendar, ArrowRight } from "lucide-react";

export default function WorkerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    country: "",
    paymentEmail: "",
    age: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.country || !formData.paymentEmail || !formData.age) {
      toast.error("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        country: formData.country,
        paymentEmail: formData.paymentEmail,
        age: formData.age,
        onboardingCompleted: true
      });
      toast.success("Onboarding complete! Welcome aboard.");
      navigate("/worker");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to save your information.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-sans font-bold text-white mb-2 tracking-tight">Welcome to the Team</h1>
          <p className="text-zinc-400 text-sm">Let's get your profile set up so we can match you with the best tasks.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Where are you located?</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <MapPin className="w-5 h-5" />
              </div>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none"
                required
              >
                <option value="" disabled>Select your country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="IN">India</option>
                <option value="PH">Philippines</option>
                <option value="NG">Nigeria</option>
                <option value="ZA">South Africa</option>
                <option value="Global">Other (Global)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Email (PayPal)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                name="paymentEmail"
                value={formData.paymentEmail}
                onChange={handleChange}
                placeholder="Where should we send your money?"
                className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-zinc-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Age Group</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Calendar className="w-5 h-5" />
              </div>
              <select
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all appearance-none"
                required
              >
                <option value="" disabled>Select your age group</option>
                <option value="18-24">18 - 24</option>
                <option value="25-34">25 - 34</option>
                <option value="35-44">35 - 44</option>
                <option value="45-54">45 - 54</option>
                <option value="55+">55+</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? "Saving..." : "Complete Setup"}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
