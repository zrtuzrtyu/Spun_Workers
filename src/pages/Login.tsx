import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from "firebase/auth";
import { googleProvider } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, Loader2, ShieldAlert, HardHat, Mail, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first to reset your password.");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to send password reset email.");
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        toast.error("Account not found. Please create an account first.");
        auth.signOut();
        navigate("/apply");
        return;
      }

      const userData = userSnap.data();
      
      if (userData.status === "inactive") {
        toast.error("Your account has been deactivated. Contact support.");
        auth.signOut();
        return;
      }

      toast.success("Logged in successfully!");
      if (userData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/worker");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error("An account already exists with this email. Please sign in using your original method (e.g., Email/Password).");
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in popup was closed before completing.");
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("This domain is not authorized for Google Sign-In. Please contact support.");
      } else {
        toast.error(error.message || "Failed to login with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please enter email and password.");
    
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      // Root Admin Auto-Redirect
      if (result.user.email?.toLowerCase() === "somiladodo@gmail.com") {
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || "Root Admin",
            role: "admin",
            status: "active",
            earnings: 0,
            balance: 0,
            isAdult: true,
            createdAt: serverTimestamp()
          });
        } else {
          await updateDoc(userRef, {
            role: "admin",
            status: "active"
          });
        }

        toast.success("Welcome back, Root Admin!");
        navigate("/admin");
        return;
      }

      if (!userSnap.exists()) {
        toast.error("Account not found. Please apply first.");
        auth.signOut();
        navigate("/apply");
        return;
      }

      const userData = userSnap.data();
      
      if (userData.status === "inactive") {
        toast.error("Your account has been deactivated. Contact support.");
        auth.signOut();
        return;
      }

      toast.success("Logged in successfully!");
      if (userData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/worker");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error("Invalid email or password. Please try again.");
      } else if (error.code === 'auth/too-many-requests') {
        toast.error("Too many failed login attempts. Please try again later or reset your password.");
      } else if (error.code === 'auth/user-disabled') {
        toast.error("This account has been disabled by an administrator.");
      } else {
        toast.error(error.message || "Failed to login.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-accent-neon border border-white\/10 rounded-full -z-10 shadow-2xl shadow-black\/50 hidden md:block"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-[#0A0A0A] border border-white\/10 -z-10 shadow-2xl shadow-black\/50 rotate-12 hidden md:block"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#0A0A0A] p-8 rounded-2xl border border-white/10 text-center relative z-10 shadow-2xl"
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
          className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
        >
          <LogIn className="w-8 h-8" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-sans font-bold mb-2 text-white tracking-tight"
        >
          Welcome Back
        </motion.h1>
        
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-zinc-400 mb-8 font-sans text-sm"
        >
          Login to access your micro-task dashboard.
        </motion.p>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleLogin}
          className="space-y-8"
        >
          <div className="space-y-5 mb-8 text-left">
            <div className="relative group">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-purple-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#050505] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>
            <div className="relative group">
              <label className="block text-sm font-medium text-zinc-300 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#050505] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-purple-400 hover:text-purple-300 hover:underline transition-all"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              "Sign In"
            )}
          </button>

          <div className="relative flex items-center py-2 mt-6">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">Or continue with</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>

          <div className="mt-8 text-zinc-400 text-sm font-sans">
            Don't have an account? <Link to="/apply" className="text-purple-400 hover:text-purple-300 hover:underline transition-all ml-1 font-medium">Apply here</Link>
          </div>
        </motion.form>
      </motion.div>
      
      <Link to="/" className="mt-8 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2">
        ← Back to home
      </Link>
    </div>
  );
}
