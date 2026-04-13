import { useState, useEffect, useRef } from "react";
import { auth, db, googleProvider } from "../firebase";
import { signInWithPopup, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { Smartphone, Monitor, CheckCircle2, ArrowRight, Loader2, DollarSign, ArrowLeft, Globe, MessageCircle, Sparkles } from "lucide-react";
import { Logo } from "../components/Logo";

type Device = "iPhone" | "Android" | "Laptop/Desktop" | "All" | "";
type Hours = "1-2" | "3-4" | "5+" | "";

function NumberTicker({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });

  useEffect(() => {
    // Slight delay for dopamine anticipation
    const timer = setTimeout(() => {
      motionValue.set(value);
    }, 400);
    return () => clearTimeout(timer);
  }, [value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Intl.NumberFormat("en-US").format(Math.round(latest))}${suffix}`;
      }
    });
  }, [springValue, prefix, suffix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

export default function Apply() {
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState<Device>("");
  const [hours, setHours] = useState<Hours>("");
  const [country, setCountry] = useState("");
  const [telegram, setTelegram] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const navigate = useNavigate();

  // Calculate potential earnings based on hours
  const getEarnings = () => {
    if (hours === "1-2") return { min: 150, max: 300 };
    if (hours === "3-4") return { min: 450, max: 800 };
    if (hours === "5+") return { min: 900, max: 1500 };
    return { min: 0, max: 0 };
  };

  const handleNext = () => {
    if (step === 1 && !device) return toast.error("Please select a device");
    if (step === 2 && !hours) return toast.error("Please select your availability");
    if (step === 3 && (!country || !telegram)) return toast.error("Please fill in all fields");
    
    if (step === 3) {
      // Start analyzing phase
      setStep(4);
      setAnalyzing(true);
      let p = 0;
      const interval = setInterval(() => {
        p += 5;
        setProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          setAnalyzing(false);
          setStep(5);
        }
      }, 100);
      return;
    }
    
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(0, prev - 1));
  };

  const onSubmitGoogle = async () => {
    if (!isAdult) {
      toast.error("You must be 18 or older to apply.");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        toast.success("Welcome back!");
        if (userSnap.data().role === "admin") {
          navigate("/admin");
        } else {
          navigate("/worker");
        }
        return;
      }

      let hoursNum = 2;
      if (hours === "3-4") hoursNum = 4;
      if (hours === "5+") hoursNum = 6;

      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "Unknown",
        role: "worker",
        status: "active",
        device: device,
        hoursPerDay: hoursNum,
        country: country,
        earnings: 0,
        balance: 0,
        telegram: telegram,
        isAdult: true,
        createdAt: serverTimestamp()
      });

      toast.success("Account created successfully! Welcome to SpunForce.");
      navigate("/worker");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/account-exists-with-different-credential') {
        toast.error("An account already exists with this email. Please sign in using your original method (e.g., Email/Password).");
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Sign-in popup was closed before completing.");
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error("This domain is not authorized for Google Sign-In. Please contact support.");
      } else {
        toast.error(error.message || "An error occurred during application.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitEmail = async () => {
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!isAdult) {
      toast.error("You must be 18 or older to apply.");
      return;
    }
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      
      let hoursNum = 2;
      if (hours === "3-4") hoursNum = 4;
      if (hours === "5+") hoursNum = 6;

      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: name,
        role: "worker",
        status: "active",
        device: device,
        hoursPerDay: hoursNum,
        country: country,
        earnings: 0,
        balance: 0,
        telegram: telegram,
        isAdult: true,
        createdAt: serverTimestamp()
      });

      toast.success("Account created successfully! Welcome to SpunForce.");
      navigate("/worker");
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("This email address is already registered. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Please enter a valid email address.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("Password is too weak. Please use at least 6 characters.");
      } else {
        toast.error(error.message || "An error occurred during application.");
      }
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-purple-500/30 flex flex-col">
      {/* Simple Header */}
      <header className="p-6 flex justify-between items-center relative z-10">
        <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <Link to="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Already a member? Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative">
        {/* Ambient Glow */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"
        />

        <div className="w-full max-w-xl relative z-10">
          
          {/* Progress Bar */}
          {step > 0 && step < 4 && (
            <div className="mb-8">
              <div className="flex justify-between text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">
                <span>Step {step} of 3</span>
                <span>{Math.round((step / 3) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 3) * 100}%` }}
                  transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
                />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 0: Hook */}
            {step === 0 && (
              <motion.div 
                key="step0"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center"
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-6 text-purple-400 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                >
                  <DollarSign className="w-8 h-8" />
                </motion.div>
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-display font-medium text-white mb-4"
                >
                  Discover Your Earning Potential
                </motion.h1>
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-zinc-400 text-lg mb-10 max-w-md mx-auto"
                >
                  Take our 30-second survey to see how much you could earn completing simple digital tasks.
                </motion.p>
                <motion.button 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px -10px rgba(255,255,255,0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  className="w-full sm:w-auto bg-white text-[#050505] px-8 py-4 rounded-full font-bold transition-colors shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 mx-auto"
                >
                  Start Survey <ArrowRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}

            {/* STEP 1: Device */}
            {step === 1 && (
              <motion.div 
                key="step1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button onClick={handleBack} className="text-zinc-500 hover:text-white mb-6 flex items-center gap-1 text-sm transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-3xl font-display font-medium text-white mb-2">What device will you use?</h2>
                <p className="text-zinc-400 mb-8">This helps us match you with compatible tasks.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "iPhone", icon: Smartphone, label: "iPhone / iPad" },
                    { id: "Android", icon: Smartphone, label: "Android Device" },
                    { id: "Laptop/Desktop", icon: Monitor, label: "Laptop / Desktop" },
                    { id: "All", icon: CheckCircle2, label: "All of the above" }
                  ].map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(16, 185, 129, 0.05)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setDevice(item.id as Device); setTimeout(handleNext, 300); }}
                      className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-4 transition-colors ${
                        device === item.id 
                          ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]" 
                          : "bg-[#0A0A0A] border-white/5 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <item.icon className="w-8 h-8" />
                      <span className="font-medium">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: Hours */}
            {step === 2 && (
              <motion.div 
                key="step2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button onClick={handleBack} className="text-zinc-500 hover:text-white mb-6 flex items-center gap-1 text-sm transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-3xl font-display font-medium text-white mb-2">How much time can you commit?</h2>
                <p className="text-zinc-400 mb-8">Consistent workers receive higher-paying tasks.</p>
                
                <div className="space-y-4">
                  {[
                    { id: "1-2", label: "1 - 2 hours per day", desc: "Casual earning" },
                    { id: "3-4", label: "3 - 4 hours per day", desc: "Part-time income" },
                    { id: "5+", label: "5+ hours per day", desc: "Maximum earnings" }
                  ].map((item, i) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(16, 185, 129, 0.05)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setHours(item.id as Hours); setTimeout(handleNext, 300); }}
                      className={`w-full p-6 rounded-2xl border flex items-center justify-between transition-colors ${
                        hours === item.id 
                          ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]" 
                          : "bg-[#0A0A0A] border-white/5 text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-medium text-lg text-white">{item.label}</div>
                        <div className="text-sm opacity-80">{item.desc}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${hours === item.id ? "border-purple-500" : "border-zinc-600"}`}>
                        {hours === item.id && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 bg-purple-500 rounded-full" />}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Details */}
            {step === 3 && (
              <motion.div 
                key="step3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <button onClick={handleBack} className="text-zinc-500 hover:text-white mb-6 flex items-center gap-1 text-sm transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-3xl font-display font-medium text-white mb-2">Final Details</h2>
                <p className="text-zinc-400 mb-8">Where should we send your tasks and payouts?</p>
                
                <div className="space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <label className="block text-sm font-medium mb-2 text-zinc-400 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Country of Residence
                    </label>
                    <input 
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. United States, UK, India"
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                    />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <label className="block text-sm font-medium mb-2 text-zinc-400 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> Telegram Username
                    </label>
                    <input 
                      value={telegram}
                      onChange={(e) => setTelegram(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-zinc-600 hover:border-white/20"
                    />
                    <p className="text-xs text-zinc-500 mt-2">We use Telegram to send urgent task notifications.</p>
                  </motion.div>

                  <motion.button 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(255,255,255,0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNext}
                    disabled={!country || !telegram}
                    className="w-full bg-white text-[#050505] px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                  >
                    Calculate My Earnings <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Analyzing */}
            {step === 4 && (
              <motion.div 
                key="step4"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center py-12"
              >
                <div className="relative w-32 h-32 mx-auto mb-8">
                  {/* High-tech scanning ring */}
                  <svg className="animate-[spin_3s_linear_infinite] w-full h-full text-white/5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"></circle>
                    <path className="opacity-75 text-purple-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-purple-500/30"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white font-display font-bold text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                    {progress}%
                  </div>
                </div>
                <h2 className="text-2xl font-display font-medium text-white mb-2">
                  {progress < 40 ? "Analyzing profile..." : progress < 80 ? "Checking task availability..." : "Calculating potential..."}
                </h2>
                <p className="text-zinc-500">Please wait while we process your information.</p>
              </motion.div>
            )}

            {/* STEP 5: Results & Auth */}
            {step === 5 && (
              <motion.div 
                key="step5"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center"
              >
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/40 mb-6 text-purple-400 shadow-[0_0_50px_rgba(139,92,246,0.4)]"
                >
                  <Sparkles className="w-10 h-10" />
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="text-4xl font-display font-medium text-white mb-2"
                >
                  You're a Great Fit!
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="text-zinc-400 mb-8"
                >
                  Based on your {hours} hours/day availability, here is your potential earning range:
                </motion.p>
                
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.4 }}
                  className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-purple-500/30 rounded-3xl p-8 mb-8 relative overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)]"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 blur-[60px] rounded-full"
                  />
                  
                  <div className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2 relative z-10">Estimated Monthly Earnings</div>
                  <div className="text-5xl md:text-6xl font-display font-bold text-white mb-4 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    <span className="text-purple-400">$</span><NumberTicker value={getEarnings().min} /> <span className="text-zinc-600">-</span> <span className="text-purple-400">$</span><NumberTicker value={getEarnings().max} />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 px-4 py-2 rounded-lg text-sm font-medium relative z-10 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping absolute"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500 relative"></div>
                    Tasks available right now
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <div className="space-y-4 text-left mb-6 bg-[#111111] p-6 rounded-2xl border border-white/5">
                    <h3 className="text-white font-medium mb-4">Create your account</h3>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Full Name</label>
                      <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="••••••••" />
                    </div>
                    <div className="flex items-start gap-3 mt-4 mb-2">
                      <input 
                        type="checkbox" 
                        id="isAdult" 
                        checked={isAdult}
                        onChange={(e) => setIsAdult(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-white/10 bg-[#0A0A0A] text-purple-500 focus:ring-purple-500 focus:ring-offset-[#111111]"
                      />
                      <label htmlFor="isAdult" className="text-sm text-zinc-400 leading-tight">
                        I confirm that I am 18 years of age or older.
                      </label>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onSubmitEmail}
                      disabled={loading || !isAdult}
                      className="w-full bg-purple-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 mt-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Account & Start Earning"}
                    </motion.button>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-zinc-500 text-sm">Or continue with</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSubmitGoogle}
                    disabled={loading || !isAdult}
                    className="w-full bg-white text-[#050505] px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google
                      </>
                    )}
                  </motion.button>
                  <p className="text-xs text-zinc-500 mt-4">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
