import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/firebase";
import { sendEmailVerification } from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Mail, Loader2, RefreshCw, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function VerifyEmail() {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const handleResend = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success("Verification email sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (auth.currentUser) {
      setLoading(true);
      try {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          window.location.reload();
        } else {
          toast.error("Email not verified yet. Please check your inbox.");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-muted pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="flex justify-center">
          <Logo className="scale-110" />
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-md ">
          <CardHeader className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
              <Mail className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to <span className="text-foreground font-medium">{firebaseUser?.email}</span>. 
              Please check your inbox and click the link to continue.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
              <p>Don't see the email? Check your spam folder or click the button below to resend it.</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button 
              onClick={handleRefresh}
              className="w-full h-12 font-semibold shadow-sm "
            >
              <RefreshCw className="w-4 h-4 mr-2" /> I've Verified My Email
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleResend}
              disabled={loading}
              className="w-full h-12 border-border/50 font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend Verification Email"}
            </Button>

            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full h-12 text-muted-foreground font-semibold"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
