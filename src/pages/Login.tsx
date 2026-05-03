import React, { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType, extractErrorMessage } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from "firebase/auth";
import { googleProvider } from "@/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogIn, Loader2, ShieldAlert, Mail, Lock, ArrowLeft, Chrome } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { user: loggedInUser } = useAuth();

  useEffect(() => {
    if (loggedInUser) {
      navigate(loggedInUser.role === "admin" ? "/admin" : "/worker");
    }
  }, [loggedInUser, navigate]);

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
      toast.error(extractErrorMessage(error));
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email || "",
          name: result.user.displayName || "Unknown",
          role: "worker",
          status: "pending",
          earnings: 0,
          balance: 0,
          isAdult: true,
          createdAt: serverTimestamp()
        });
        
        toast.success("Account created successfully!");
        navigate("/worker/onboarding");
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
      handleFirestoreError(error, OperationType.GET, "users");
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

      if (result.user.email?.toLowerCase() === "tronicflamess@gmail.com") {
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
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email || "",
          name: result.user.displayName || "Unknown",
          role: "worker",
          status: "pending",
          earnings: 0,
          balance: 0,
          isAdult: true,
          createdAt: serverTimestamp()
        });
        
        toast.success("Account created successfully!");
        navigate("/worker/onboarding");
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
      handleFirestoreError(error, OperationType.GET, "users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-muted pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-none rounded-full translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-10">
          <Link to="/">
            <Logo className="scale-125" />
          </Link>
        </div>

        <Card className="glass-card shadow-md ">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto text-primary mb-4">
              <LogIn className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-sm">
              Access your Spunn Force operator dashboard.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 font-semibold shadow-sm  mt-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-11 border-border/50 bg-background/50 hover:bg-muted/50 font-semibold"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/50 pt-6 pb-8">
            <p className="text-xs text-muted-foreground">
              Don't have an account? <Link to="/apply" className="text-primary font-semibold hover:underline ml-1">Apply here</Link>
            </p>
          </CardFooter>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-center"
        >
          <Link to="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-foreground")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
