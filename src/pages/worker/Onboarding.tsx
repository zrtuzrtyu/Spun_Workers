import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
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
  { id: 7, title: "Identity Verification", icon: UserCircle, description: "Verify your identity for higher payouts." },
  { id: 8, title: "Wallet Setup", icon: Zap, description: "Configure your payout destination." },
  { id: 9, title: "Demographics", icon: Globe, description: "Help us match local tasks." },
  { id: 10, title: "Interactive Tutorial", icon: Sparkles, description: "Learn the Spunn Force protocol." },
  { id: 11, title: "Certification", icon: Award, description: "Final quality assessment." },
  { id: 12, title: "Activation", icon: Zap, description: "You're ready to start earning." }
];

const SKILL_CATEGORIES = [
  "Data Labeling", "Content Moderation", "Image Tagging", 
  "Transcription", "Survey Participation", "App Testing",
  "Translation", "AI Training", "Search Evaluation"
];

export default function WorkerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(2); // Start at step 2 since 1 is done
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: user?.username || "",
    isAnonymous: user?.isAnonymous ?? true,
    languages: user?.languages || [] as string[],
    notificationsEnabled: user?.notificationsEnabled ?? false,
    skills: user?.skills || [] as string[],
    agreedToRules: false,
    identityVerified: false,
    paymentEmail: user?.paymentEmail || "",
    country: user?.country || "",
    age: user?.age || "",
    quizScore: 0
  });

  const progress = (currentStep / STEPS.length) * 100;

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 2) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        onboardingCompleted: true,
        quizCompleted: true,
        onboardingStep: 12,
        trustTier: "New",
        level: 1,
        status: "active"
      });
      toast.success("Onboarding complete! Welcome to Spunn Force.");
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
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <UserCircle className="w-3 h-3" /> Choose a Username
              </label>
              <Input 
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="e.g. ShadowOperator_42"
                className="h-12 bg-background/50 border-border/50"
              />
              <p className="text-[10px] text-muted-foreground italic">
                This is how you will be identified in the marketplace. You don't need to use your real name.
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="space-y-1">
                <div className="text-sm font-bold flex items-center gap-2">
                  {formData.isAnonymous ? <EyeOff className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-primary" />}
                  Public Anonymity
                </div>
                <p className="text-[10px] text-muted-foreground">Hide your real identity from other operators.</p>
              </div>
              <Checkbox 
                checked={formData.isAnonymous}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAnonymous: !!checked }))}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">Select languages you are fluent in.</p>
            <div className="grid grid-cols-2 gap-3">
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
                    "px-4 py-3 rounded-xl border text-[11px] font-bold transition-all text-left",
                    formData.languages.includes(lang)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 py-6 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
              <Bell className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Enable Phone Notifications</h3>
              <p className="text-sm text-muted-foreground">
                High-value tasks often disappear in seconds. Get notified instantly when a new match is found for your profile.
              </p>
            </div>
            <Button 
              variant={formData.notificationsEnabled ? "outline" : "default"}
              className="w-full h-12 font-bold"
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
          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">Select at least 3 categories you have experience in.</p>
            <div className="grid grid-cols-2 gap-3">
              {SKILL_CATEGORIES.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-[11px] font-bold transition-all text-left",
                    formData.skills.includes(skill)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background/50 border-border/50 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary">1. Accuracy First</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">All tasks are peer-reviewed. Consistent low-quality submissions will result in account suspension.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary">2. Confidentiality</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">You may be exposed to sensitive data. Sharing task details outside the platform is strictly prohibited.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary">3. One Account</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Multiple accounts per person are not allowed and will be flagged by our sybil-detection system.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2">
              <Checkbox 
                id="rules"
                checked={formData.agreedToRules}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreedToRules: !!checked }))}
              />
              <label htmlFor="rules" className="text-xs font-medium cursor-pointer">
                I have read and agree to the Spunn Force Operator Guidelines.
              </label>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 py-4 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <UserCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Verify Identity</h3>
              <p className="text-sm text-muted-foreground">
                Upload a government-issued ID to unlock higher-paying tasks and faster payouts.
              </p>
            </div>
            <Button 
              variant={formData.identityVerified ? "outline" : "default"}
              className="w-full h-12 font-bold"
              onClick={() => {
                setFormData(prev => ({ ...prev, identityVerified: true }));
                toast.success("Identity verified!");
              }}
            >
              {formData.identityVerified ? "Identity Verified" : "Upload ID"}
            </Button>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Mail className="w-3 h-3" /> PayPal Payout Email
              </label>
              <Input 
                type="email"
                value={formData.paymentEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentEmail: e.target.value }))}
                placeholder="payouts@example.com"
                className="h-12 bg-background/50 border-border/50"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Earnings are processed every 48 hours once you hit the $25 threshold.
              </p>
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Globe className="w-3 h-3" /> Primary Location
              </label>
              <Select onValueChange={(val) => setFormData(prev => ({ ...prev, country: val as string }))}>
                <SelectTrigger className="h-12 bg-background/50 border-border/50">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Philippines">Philippines</SelectItem>
                  <SelectItem value="Nigeria">Nigeria</SelectItem>
                  <SelectItem value="Global">Other / Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Age Group
              </label>
              <Select onValueChange={(val) => setFormData(prev => ({ ...prev, age: val as string }))}>
                <SelectTrigger className="h-12 bg-background/50 border-border/50">
                  <SelectValue placeholder="Select your age group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-24">18 - 24</SelectItem>
                  <SelectItem value="25-34">25 - 34</SelectItem>
                  <SelectItem value="35-44">35 - 44</SelectItem>
                  <SelectItem value="45+">45+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 10:
        return (
          <div className="space-y-6 py-4">
            <div className="aspect-video bg-muted/50 rounded-2xl border border-border/50 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold">Interactive Protocol Walkthrough</h4>
                <p className="text-[11px] text-muted-foreground">Learn how to claim, execute, and submit tasks for verification.</p>
              </div>
              <Button variant="secondary" size="sm" className="font-bold">Start Tutorial</Button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="text-[10px] font-medium">Tutorial completion grants +5 Trust Points.</p>
            </div>
          </div>
        );
      case 11:
        return (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                <p className="text-xs font-bold">Quick Quiz: What happens if your accuracy falls below 80%?</p>
                <div className="space-y-2">
                  {["Nothing", "Temporary suspension", "Bonus earnings"].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => setFormData(prev => ({ ...prev, quizScore: opt === "Temporary suspension" ? 100 : 0 }))}
                      className={cn(
                        "w-full p-3 rounded-lg border text-[11px] font-medium text-left transition-all",
                        formData.quizScore === 100 && opt === "Temporary suspension" 
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                          : "bg-background border-border/50 hover:border-primary/30"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 12:
        return (
          <div className="space-y-8 py-10 text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-primary-foreground shadow-2xl">
                <Zap className="w-12 h-12 fill-current" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">System Activated</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Your operator profile is now live. You have been granted Level 1 access to the Spunn Force network.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Level 1</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Verified</Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Anonymous</Badge>
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
      case 7: return formData.identityVerified;
      case 8: return formData.paymentEmail.includes("@");
      case 9: return formData.country && formData.age;
      case 11: return formData.quizScore === 100;
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
        <div className="flex justify-center mb-8">
          <Logo className="scale-110" />
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden">
          <div className="h-1.5 w-full bg-muted/30">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <CardHeader className="space-y-2 pb-6">
            <div className="flex justify-between items-center mb-2">
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
                Step {currentStep} of {STEPS.length}
              </Badge>
              <div className="text-[10px] font-mono text-muted-foreground">{Math.round(progress)}% Complete</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                {React.createElement(STEPS[currentStep - 1].icon, { className: "w-5 h-5" })}
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-bold tracking-tight">{STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription className="text-xs">
                  {STEPS[currentStep - 1].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="min-h-[300px] flex flex-col justify-center">
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

          <CardFooter className="flex justify-between gap-4 border-t border-border/50 pt-6 pb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={prevStep}
              disabled={currentStep <= 2 || loading}
              className="font-bold text-[11px] uppercase tracking-widest"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            
            {currentStep === STEPS.length ? (
              <Button 
                onClick={handleComplete}
                disabled={loading}
                className="font-bold px-8 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate Account"}
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                disabled={!isStepValid() || loading}
                className="font-bold px-8 shadow-lg shadow-primary/20 group"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </CardFooter>
        </Card>
        
        <div className="mt-8 flex justify-center gap-2">
          {STEPS.map((step) => (
            <div 
              key={step.id} 
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                currentStep === step.id ? "w-6 bg-primary" : 
                currentStep > step.id ? "bg-primary/40" : "bg-muted"
              )}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
