import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Target, Zap, UploadCloud, ChevronRight, X } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: TourStep[] = [
  { 
    title: "Welcome to Your Dashboard", 
    description: "This is your control center for completing tasks and earning rewards.",
    icon: Target
  },
  { 
    title: "Your Task List", 
    description: "Here you can see tasks ready for you to start immediately.",
    icon: Zap
  },
  { 
    title: "Proof Submission", 
    description: "Once you complete a task, upload your screenshot here to get paid.",
    icon: UploadCloud
  }
];

export const DashboardTour = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card w-full max-w-sm rounded-3xl border border-border shadow-2xl p-6 space-y-6"
        >
          <div className="flex justify-between items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {React.createElement(steps[currentStep].icon, { className: "w-6 h-6" })}
            </div>
            <button onClick={onComplete} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-[0.1em]">{steps[currentStep].title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{steps[currentStep].description}</p>
          </div>

          <Button onClick={nextStep} className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-11">
            {currentStep === steps.length - 1 ? "Finish Tutorial" : "Next"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
