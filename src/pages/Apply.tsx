import React, { useState, useEffect, useRef } from "react";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "@/firebase";
import { signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { Smartphone, Monitor, CheckCircle2, ArrowRight, Loader2, DollarSign, ArrowLeft, Globe, MessageCircle, Sparkles, User, Mail, Lock, Chrome } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type Device = "iPhone" | "Android" | "Laptop/Desktop" | "All" | "";
type Hours = "1-2" | "3-4" | "5+" | "";

function NumberTicker({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 100 });

  useEffect(() => {
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

  return <span ref={ref} className="font-mono">{prefix}0{suffix}</span>;
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
  const { user: loggedInUser } = useAuth();

  React.useEffect(() => {
    if (loggedInUser) {
      navigate(loggedInUser.role === "admin" ? "/admin" : "/worker");
    }
  }, [loggedInUser, navigate]);

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
        status: "pending",
        device: device,
        hoursPerDay: hoursNum,
        country: country,
        earnings: 0,
        balance: 0,
        telegram: telegram,
        isAdult: true,
        createdAt: serverTimestamp()
      });

      toast.success("Account created successfully!");
      navigate("/worker/onboarding");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up with Google");
      handleFirestoreError(error, OperationType.WRITE, "users");
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
        status: "pending",
        device: device,
        hoursPerDay: hoursNum,
        country: country,
        earnings: 0,
        balance: 0,
        telegram: telegram,
        isAdult: true,
        createdAt: serverTimestamp()
      });

      await sendEmailVerification(user);
      toast.success("Account created! Please verify your email.");
      navigate("/worker/onboarding");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
      handleFirestoreError(error, OperationType.WRITE, "users");
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb),0.05),transparent)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <header className="p-6 flex justify-between items-center relative z-10">
        <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
          <Logo className="scale-90" />
        </Link>
        <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          Already a member? Login
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-xl">
          
          {/* Progress Bar */}
          <AnimatePresence>
            {step > 0 && step < 4 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-10"
              >
                <div className="flex justify-between text-[10px] text-muted-foreground mb-3 font-bold uppercase tracking-[0.2em]">
                  <span>Step {step} of 3</span>
                  <span className="text-primary">{Math.round((step / 3) * 100)}%</span>
                </div>
                <Progress value={(step / 3) * 100} className="h-1.5" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* STEP 0: Hook */}
            {step === 0 && (
              <motion.div 
                key="step0"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center space-y-10"
              >
                <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary shadow-lg shadow-primary/5">
                  <DollarSign className="w-10 h-10" />
                </div>
                <div className="space-y-6">
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tighter text-foreground leading-tight">
                    Discover Your <br />Earning Potential
                  </h1>
                  <p className="text-muted-foreground text-xl max-w-md mx-auto leading-relaxed font-medium">
                    Take our 30-second survey to see how much you could earn completing simple digital tasks.
                  </p>
                </div>
                <Button size="lg" onClick={handleNext} className="h-16 px-12 font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 group rounded-full">
                  Start Survey <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
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
                className="space-y-10"
              >
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground -ml-2 hover:bg-muted/50 rounded-full px-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <h2 className="text-4xl font-bold tracking-tight text-foreground">What device will you use?</h2>
                  <p className="text-muted-foreground text-lg font-medium">This helps us match you with compatible tasks.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { id: "iPhone", icon: Smartphone, label: "iPhone / iPad" },
                    { id: "Android", icon: Smartphone, label: "Android Device" },
                    { id: "Laptop/Desktop", icon: Monitor, label: "Laptop / Desktop" },
                    { id: "All", icon: CheckCircle2, label: "All of the above" }
                  ].map((item) => (
                    <Card 
                      key={item.id}
                      className={cn(
                        "cursor-pointer transition-all border-border/50 hover:bg-muted/50 rounded-3xl overflow-hidden group",
                        device === item.id && "border-primary bg-primary/5 shadow-xl shadow-primary/5"
                      )}
                      onClick={() => { setDevice(item.id as Device); setTimeout(handleNext, 300); }}
                    >
                      <CardContent className="p-8 flex flex-col items-center text-center gap-6">
                        <div className={cn("w-16 h-16 rounded-2xl bg-muted flex items-center justify-center transition-all group-hover:scale-110", device === item.id && "bg-primary text-primary-foreground")}>
                          <item.icon className="w-8 h-8" />
                        </div>
                        <span className="text-lg font-black tracking-tight">{item.label}</span>
                      </CardContent>
                    </Card>
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
                className="space-y-8"
              >
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground -ml-2">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">How much time can you commit?</h2>
                  <p className="text-muted-foreground">Consistent workers receive higher-paying tasks.</p>
                </div>
                
                <div className="space-y-4">
                  {[
                    { id: "1-2", label: "1 - 2 hours per day", desc: "Casual earning" },
                    { id: "3-4", label: "3 - 4 hours per day", desc: "Part-time income" },
                    { id: "5+", label: "5+ hours per day", desc: "Maximum earnings" }
                  ].map((item) => (
                    <Card 
                      key={item.id}
                      className={cn(
                        "cursor-pointer transition-all border-border/50 hover:bg-muted/50",
                        hours === item.id && "border-primary bg-primary/5 shadow-lg shadow-primary/5"
                      )}
                      onClick={() => { setHours(item.id as Hours); setTimeout(handleNext, 300); }}
                    >
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-bold text-foreground">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                        <div className={cn("w-5 h-5 rounded-full border-2 border-muted transition-colors flex items-center justify-center", hours === item.id && "border-primary")}>
                          {hours === item.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                        </div>
                      </CardContent>
                    </Card>
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
                className="space-y-8"
              >
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground -ml-2">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Final Details</h2>
                  <p className="text-muted-foreground">Where should we send your tasks and payouts?</p>
                </div>
                
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Country of Residence
                      </label>
                      <Input 
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. United States"
                        className="h-12 bg-background/50 border-border/50 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                        <MessageCircle className="w-3 h-3" /> Telegram Username
                      </label>
                      <Input 
                        value={telegram}
                        onChange={(e) => setTelegram(e.target.value)}
                        placeholder="@username"
                        className="h-12 bg-background/50 border-border/50 focus:border-primary transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground/60 font-medium">Urgent task notifications are sent via Telegram.</p>
                    </div>

                    <Button 
                      onClick={handleNext}
                      disabled={!country || !telegram}
                      className="w-full h-12 font-bold shadow-lg shadow-primary/20 group"
                    >
                      Calculate My Earnings <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
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
                className="text-center space-y-8 py-10"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                  <motion.div 
                    className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xl">
                    {progress}%
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {progress < 40 ? "Analyzing profile..." : progress < 80 ? "Checking availability..." : "Finalizing potential..."}
                  </h2>
                  <p className="text-muted-foreground text-sm">Please wait while we process your operator profile.</p>
                </div>
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
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto text-primary shadow-lg shadow-primary/5">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">You're a Great Fit!</h2>
                  <p className="text-muted-foreground text-sm">Based on your availability, here is your potential earning range:</p>
                </div>
                
                <Card className="border-primary/20 bg-primary/5 shadow-2xl shadow-primary/10 overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1),transparent)] pointer-events-none" />
                  <CardContent className="p-10 text-center space-y-6 relative z-10">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Estimated Monthly Earnings</div>
                      <div className="text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
                        <span className="text-primary">$</span><NumberTicker value={getEarnings().min} /> <span className="text-muted-foreground/30">-</span> <span className="text-primary">$</span><NumberTicker value={getEarnings().max} />
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary px-4 py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2" />
                      Tasks available right now
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold">Create Your Account</CardTitle>
                    <CardDescription>Finalize your profile to start receiving tasks.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-all" />
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 pt-2">
                      <Checkbox id="isAdult" checked={isAdult} onCheckedChange={(checked) => setIsAdult(checked as boolean)} className="mt-1" />
                      <label htmlFor="isAdult" className="text-xs text-muted-foreground leading-relaxed font-medium">
                        I confirm that I am 18 years of age or older and agree to the terms.
                      </label>
                    </div>

                    <Button 
                      onClick={onSubmitEmail}
                      disabled={loading || !isAdult}
                      className="w-full h-11 font-bold shadow-lg shadow-primary/20 mt-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Application"}
                    </Button>

                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                        <span className="bg-card px-3 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full h-11 border-border/50 bg-background/50 hover:bg-muted/50 font-bold"
                      onClick={onSubmitGoogle}
                      disabled={loading || !isAdult}
                    >
                      <Chrome className="w-4 h-4 mr-2" />
                      Google
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
