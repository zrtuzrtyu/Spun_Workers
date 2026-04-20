import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, Mail, Calendar, ArrowRight, Loader2, UserCircle, 
  Shield, Bell, Zap, CheckCircle2, Lock, Globe, 
  Target, Award, Sparkles, ChevronRight, ChevronLeft,
  Eye, EyeOff, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Account Created", icon: CheckCircle2, description: "Your secure workspace is ready." },
  { id: 2, title: "Privacy Profile", icon: Shield, description: "Choose how you appear to the network." },
  { id: 3, title: "Language Preferences", icon: Globe, description: "Select languages you are fluent in." },
  { id: 4, title: "Notifications", icon: Bell, description: "Never miss a high-value task." },
  { id: 5, title: "Skill Inventory", icon: Target, description: "Tell us what you're good at." },
  { id: 6, title: "Platform Rules", icon: Lock, description: "Our community standards." },
  { id: 7, title: "Wallet Setup", icon: Zap, description: "Configure your payout destination." },
  { id: 8, title: "Demographics", icon: Globe, description: "Help us match local tasks." },
  { id: 9, title: "Activation", icon: Zap, description: "You're ready to start earning." }
];

const SKILL_CATEGORIES = [
  "Data Labeling", "Content Moderation", "Image Tagging", 
  "Transcription", "Survey Participation", "App Testing",
  "Translation", "AI Training", "Search Evaluation"
];

export default function WorkerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(user?.onboardingStep || 2);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user?.onboardingStep && user.onboardingStep > currentStep) {
      setCurrentStep(user.onboardingStep);
    }
  }, [user?.onboardingStep]);

  const [formData, setFormData] = useState({
    username: user?.username || "",
    isAnonymous: user?.isAnonymous ?? true,
    languages: user?.languages || [] as string[],
    notificationsEnabled: user?.notificationsEnabled ?? false,
    skills: user?.skills || [] as string[],
    agreedToRules: false,
    paymentEmail: user?.paymentEmail || "",
    country: user?.country || "",
    age: user?.age || "",
    gender: user?.gender || "",
  });

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = async () => {
    if (currentStep < STEPS.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      window.scrollTo(0, 0);
      
      // Save progress to Firestore
      if (user) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            onboardingStep: next,
            ...formData
          });
        } catch (error) {
          console.error("Failed to save onboarding progress:", error);
          toast.error("Network error while saving progress.");
        }
      }
    }
  };

  const prevStep = async () => {
    if (currentStep > 2) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      window.scrollTo(0, 0);

      if (user) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            onboardingStep: prev
          });
        } catch (error) {
          console.error("Failed to revert stats:", error);
        }
      }
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Capture and store answers in a separate collection
      await addDoc(collection(db, "onboarding_answers"), {
        userId: user.uid,
        email: user.email,
        answers: formData,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        onboardingCompleted: true,
        quizCompleted: true, // Automatically complete quiz since tutorial is removed
        onboardingStep: 9,
        trustTier: "New",
        level: 1,
        status: "active"
      });
      toast.success("Onboarding complete! Welcome to the platform.");
      navigate("/worker");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 2:
        return (
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                <UserCircle className="w-4 h-4 text-primary" /> Choose a Username
              </label>
              <Input 
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="e.g. ShadowOperator_42"
                className="h-12 md:h-14 bg-background/50 border-border/50 text-lg font-bold rounded-xl md:rounded-2xl px-6 focus:border-primary transition-all"
              />
              <p className="text-xs text-muted-foreground italic font-medium leading-relaxed px-1">
                This is how you will be identified in the marketplace. You don't need to use your real name.
              </p>
            </div>
            
            <div className="flex items-center justify-between p-6 rounded-2xl md:rounded-3xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group">
              <div className="space-y-1">
                <div className="text-base md:text-lg font-black flex items-center gap-2">
                  {formData.isAnonymous ? <EyeOff className="w-5 h-5 text-primary" /> : <Eye className="w-5 h-5 text-primary" />}
                  Public Anonymity
                </div>
                <p className="text-xs text-muted-foreground font-medium">Hide your real identity from other operators.</p>
              </div>
              <Checkbox 
                checked={formData.isAnonymous}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAnonymous: !!checked }))}
                className="w-6 h-6 rounded-lg border-2 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 py-6">
            <p className="text-sm text-muted-foreground font-medium px-1">Select languages you are fluent in.</p>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {["English", "Spanish", "French", "German", "Chinese", "Japanese", "Hindi", "Arabic"].map(lang => (
                <button
                  key={lang}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    languages: prev.languages.includes(lang) 
                      ? prev.languages.filter(l => l !== lang) 
                      : [...prev.languages, lang] 
                  }))}
                  className={cn(
                    "px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border text-[10px] md:text-sm font-black uppercase tracking-[0.1em] transition-all text-left group relative overflow-hidden active:scale-95",
                    formData.languages.includes(lang)
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <span className="relative z-10">{lang}</span>
                  {formData.languages.includes(lang) && (
                    <motion.div 
                      layoutId="lang-bg"
                      className="absolute inset-0 bg-primary"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 py-8 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary border border-primary/20 shadow-lg shadow-primary/5">
                <Bell className="w-10 h-10" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-display font-bold tracking-tight">Enable Phone Notifications</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed max-w-xs mx-auto">
                High-value tasks often disappear in seconds. Get notified instantly when a new match is found for your profile.
              </p>
            </div>
            <Button 
              variant={formData.notificationsEnabled ? "outline" : "default"}
              className="w-full h-12 md:h-14 rounded-xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              onClick={() => {
                setFormData(prev => ({ ...prev, notificationsEnabled: true }));
                toast.success("Notifications enabled!");
              }}
            >
              {formData.notificationsEnabled ? "Notifications Enabled" : "Enable Notifications"}
            </Button>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 py-6">
            <p className="text-sm text-muted-foreground font-medium px-1">Select at least 3 categories you have experience in.</p>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {SKILL_CATEGORIES.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    "px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border text-[10px] md:text-xs font-black uppercase tracking-[0.1em] transition-all text-left group relative overflow-hidden active:scale-95",
                    formData.skills.includes(skill)
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <span className="relative z-10">{skill}</span>
                  {formData.skills.includes(skill) && (
                    <motion.div 
                      layoutId="skill-bg"
                      className="absolute inset-0 bg-primary"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 py-6">
            <div className="bg-muted/30 p-6 md:p-8 rounded-2xl md:rounded-3xl border border-border/50 space-y-6 max-h-[300px] overflow-y-auto hide-scrollbar">
              <div className="space-y-2">
                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">1. Accuracy First</h4>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">All tasks are peer-reviewed. Consistent low-quality submissions will result in account suspension.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">2. Confidentiality</h4>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">You may be exposed to sensitive data. Sharing task details outside the platform is strictly prohibited.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-primary">3. One Account</h4>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">Multiple accounts per person are not allowed and will be flagged by our sybil-detection system.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 md:p-5 rounded-2xl md:rounded-3xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group">
              <Checkbox 
                id="rules"
                checked={formData.agreedToRules}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreedToRules: !!checked }))}
                className="w-5 h-5 md:w-6 md:h-6 rounded-md border-2 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <label htmlFor="rules" className="text-[10px] md:text-xs font-black uppercase tracking-[0.1em] cursor-pointer text-foreground/80 group-hover:text-foreground transition-colors flex-1">
                I have read and agree to the Spunn Force Operator Guidelines.
              </label>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                <Mail className="w-4 h-4 text-primary" /> PayPal Payout Email
              </label>
              <Input 
                type="email"
                value={formData.paymentEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentEmail: e.target.value }))}
                placeholder="payouts@example.com"
                className="h-12 md:h-14 bg-background/50 border-border/50 text-lg font-bold rounded-xl md:rounded-2xl px-6 focus:border-primary transition-all"
              />
              <p className="text-xs text-muted-foreground italic font-medium leading-relaxed px-1">
                Earnings are processed every 48 hours once you hit the $25 threshold.
              </p>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 py-6">
            <div className="space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                <Globe className="w-4 h-4 text-primary" /> Primary Location
              </label>
              <Select onValueChange={(val) => setFormData(prev => ({ ...prev, country: val as string }))}>
                <SelectTrigger className="h-12 md:h-14 bg-background/50 border-border text-lg font-bold rounded-xl md:rounded-2xl px-6 focus:border-primary transition-all shadow-sm">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="rounded-xl md:rounded-2xl border-border shadow-xl bg-background/95 backdrop-blur-xl">
                  <SelectItem value="United States" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">United States</SelectItem>
                  <SelectItem value="United Kingdom" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">United Kingdom</SelectItem>
                  <SelectItem value="Canada" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">Canada</SelectItem>
                  <SelectItem value="India" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">India</SelectItem>
                  <SelectItem value="Philippines" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">Philippines</SelectItem>
                  <SelectItem value="Nigeria" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">Nigeria</SelectItem>
                  <SelectItem value="Global" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">Other / Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                <Calendar className="w-4 h-4 text-primary" /> Age Group
              </label>
              <Select onValueChange={(val) => setFormData(prev => ({ ...prev, age: val as string }))}>
                <SelectTrigger className="h-12 md:h-14 bg-background/50 border-border text-lg font-bold rounded-xl md:rounded-2xl px-6 focus:border-primary transition-all shadow-sm">
                  <SelectValue placeholder="Select your age group" />
                </SelectTrigger>
                <SelectContent className="rounded-xl md:rounded-2xl border-border shadow-xl bg-background/95 backdrop-blur-xl">
                  <SelectItem value="18-24" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">18 - 24</SelectItem>
                  <SelectItem value="25-34" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">25 - 34</SelectItem>
                  <SelectItem value="35-44" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">35 - 44</SelectItem>
                  <SelectItem value="45+" className="py-2.5 md:py-3 px-4 md:px-6 text-sm font-medium">45+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ml-1">
                <UserCircle className="w-4 h-4 text-primary" /> Gender Identity
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["Male", "Female", "Non-binary", "Other"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                    className={cn(
                      "h-12 md:h-14 rounded-xl border transition-all text-[10px] md:text-xs font-black uppercase tracking-[0.1em] flex items-center justify-center px-3 active:scale-95",
                      formData.gender === g 
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]" 
                        : "bg-background/50 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-8 py-8 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-primary-foreground shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500">
                <Zap className="w-12 h-12 fill-current" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-display font-bold tracking-tight">System Activated<span className="text-primary">.</span></h3>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto font-medium leading-relaxed">
                Your operator profile is now live. You have been granted Level 1 access to the Spunn Force network.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full">Level 1</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full">Verified</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full">Anonymous</Badge>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 2: return formData.username.length >= 3;
      case 3: return formData.languages.length >= 1;
      case 5: return formData.skills.length >= 3;
      case 6: return formData.agreedToRules;
      case 7: return formData.paymentEmail.includes("@");
      case 8: return formData.country && formData.age && formData.gender;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(var(--primary-rgb),0.05),transparent)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex justify-center mb-6">
          <Logo className="scale-100" />
        </div>

        <Card className="glass-card overflow-hidden border-border/50">
          <div className="h-1.5 w-full bg-muted/30">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <CardHeader className="space-y-1 pb-4 pt-5 px-6">
            <div className="flex justify-between items-center mb-1">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-primary/20 text-primary bg-primary/5">
                Step {currentStep} of {STEPS.length}
              </Badge>
              <div className="text-[9px] font-mono font-bold text-muted-foreground">{Math.round(progress)}% Complete</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary shrink-0">
                {React.createElement(STEPS[currentStep - 1].icon, { className: "w-4 h-4" })}
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-lg font-black tracking-tight leading-none">{STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">
                  {STEPS[currentStep - 1].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="min-h-[260px] flex flex-col justify-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between gap-4 border-t border-border/50 pt-5 pb-5 px-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={prevStep}
              disabled={currentStep <= 2 || loading}
              className="font-black text-[9px] uppercase tracking-widest h-9 px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
            
            {currentStep === STEPS.length ? (
              <Button 
                onClick={handleComplete}
                disabled={loading}
                className="font-black px-5 h-9 shadow-md shadow-primary/20 text-[9px] md:text-[10px] uppercase tracking-widest rounded-lg"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : "Activate"}
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!isStepValid() || loading}
                className="font-black px-5 h-9 shadow-md shadow-primary/20 group text-[9px] md:text-[10px] uppercase tracking-widest rounded-lg"
              >
                Continue <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </CardFooter>
        </Card>
        
        <div className="mt-6 flex justify-center gap-1.5">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                currentStep === step.id ? "w-4 bg-primary" : 
                currentStep > step.id ? "w-1 bg-primary/40" : "w-1 bg-muted"
              )}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
