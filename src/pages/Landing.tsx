import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "motion/react";
import { 
  ArrowRight, 
  CheckCircle2, 
  DollarSign, 
  Zap, 
  Shield, 
  Globe, 
  Sparkles, 
  Users, 
  TrendingUp, 
  ChevronRight, 
  Play, 
  Star, 
  Clock, 
  Target,
  Layout,
  Cpu,
  Layers,
  Fingerprint,
  Sun,
  Moon,
  X,
  Mail
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * DesignerIcon Wrapper
 * Adds a custom, high-end look to standard Lucide icons
 */
function DesignerIcon({ icon: Icon, className }: { icon: any, className?: string }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center w-12 h-12 rounded-2xl",
      "bg-muted border border-border group-hover:border-primary/50 transition-all duration-300",
      "shadow-sm overflow-hidden group-hover:border-primary/30 transition-all duration-500",
      className
    )}>
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-500 relative z-10" />
    </div>
  );
}

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

function SpecialOfferPopup({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Auto-focus input when opened
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen && !submitted) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, submitted]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-lg p-6"
          >
            <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border shadow-sm">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/20 rounded-full blur-none pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-500/20 rounded-full blur-none pointer-events-none" />
              
              <div className="p-8 relative z-10">
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted/50"
                  aria-label="Close popup"
                >
                  <X className="w-5 h-5" />
                </button>

                {!submitted ? (
                  <div className="space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 shadow-inner">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-display font-semibold tracking-tight text-foreground leading-tight">
                      Unlock Elite <br /><span className="text-primary">Operator Status.</span>
                    </h3>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                      Get exclusive access to premium tasks before they hit the general pool. Earn up to 3x more per action.
                    </p>
                    
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if(email) setSubmitted(true);
                      }} 
                      className="space-y-5 pt-2"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Work Email</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input 
                            ref={inputRef}
                            type="email" 
                            required
                            placeholder="operator@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-muted/40 border border-border rounded-xl pl-11 pr-4 py-3.5 text-foreground focus:outline-none focus:border-primary/50 transition-all focus:ring-4 focus:ring-primary/10 font-medium placeholder:text-muted-foreground/50"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        Join Waitlist <ChevronRight className="w-4 h-4" />
                      </button>
                    </form>
                    <p className="text-xs text-muted-foreground/50 font-semibold text-center uppercase tracking-widest">
                      No spam. Unsubscribe anytime.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 text-center py-8">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 20, stiffness: 200, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-sm"
                    >
                      <CheckCircle2 className="w-10 h-10" />
                    </motion.div>
                    <h3 className="text-3xl font-display font-semibold tracking-tight text-foreground">
                      Access Granted.
                    </h3>
                    <p className="text-muted-foreground font-medium leading-relaxed max-w-sm mx-auto">
                      You're on the elite list. Check your inbox to confirm your advanced clearance.
                    </p>
                    <button 
                      onClick={onClose}
                      className="mt-6 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 px-10 rounded-xl transition-colors border border-border"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [hours, setHours] = useState([4]);
  const hourlyRate = 12.50;
  const potentialDaily = hours[0] * hourlyRate;

  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Show popup after 3.5 seconds
    const timer = setTimeout(() => {
      // Only show it if they haven't seen it recently (could use localStorage in a real app, 
      // but for this demo just show it once per session)
      if (!sessionStorage.getItem('hasSeenPopup')) {
        setShowPopup(true);
        sessionStorage.setItem('hasSeenPopup', 'true');
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden font-sans antialiased">
      <SpecialOfferPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/40 backdrop-blur-2xl border-b border-border">
        <div className="max-w-7xl mx-auto px-10 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo className="scale-110 group-hover:opacity-80 transition-opacity" />
          </Link>
          
          <div className="hidden md:flex items-center gap-12 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Network</a>
            <a href="#calculator" className="hover:text-primary transition-colors">Earnings</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">Protocol</a>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Link to="/login" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link to="/apply" className={cn(
              buttonVariants({ size: "lg" }), 
              "font-semibold uppercase tracking-widest text-xs h-12 md:h-14 px-6 md:px-10 rounded-full",
              "bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm "
            )}>
              Join Force
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-muted pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 blur-none rounded-full pointer-events-none animate-pulse" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(124,58,237,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] rounded-full">
                <Sparkles className="w-4 h-4 mr-3 text-primary" /> Distributed Intelligence Network
              </Badge>
              
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[140px] font-display font-semibold tracking-[-0.05em] leading-[0.9] md:leading-[0.8] text-foreground">
                Precision <br />
                <span className="text-primary">at Scale.</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium px-4">
                Spunn Force is the premier network for high-accuracy micro-tasks. 
                Join 12,000+ verified operators turning digital precision into sustainable profit.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8"
            >
              <Link to="/apply" className={cn(
                buttonVariants({ size: "lg" }), 
                "w-full sm:w-auto h-14 md:h-16 px-10 md:px-12 text-sm font-semibold uppercase tracking-widest rounded-full group bg-foreground text-background hover:bg-foreground/90 transition-all shadow-sm shadow-foreground/10"
              )}>
                START EARNING <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#calculator" className={cn(
                buttonVariants({ variant: "outline", size: "lg" }), 
                "w-full sm:w-auto h-14 md:h-16 px-10 md:px-12 text-sm font-semibold uppercase tracking-widest rounded-full bg-transparent border border-foreground/20 text-foreground hover:bg-foreground/5 transition-all"
              )}>
                VIEW POTENTIAL
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="pt-12 flex flex-col items-center gap-6"
            >
              <div className="flex -space-x-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted overflow-hidden ring-1 ring-foreground/10 grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                Trusted by <span className="text-foreground">12,402</span> Global Operators
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/10">
        <div className="max-w-7xl mx-auto px-8 py-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-16">
            {[
              { label: "Tasks Verified", value: 500, suffix: "k+", icon: Target },
              { label: "Avg. Payout", value: 48, suffix: "h", icon: Clock },
              { label: "Min. Threshold", value: 25, prefix: "$", icon: DollarSign },
              { label: "Network Uptime", value: 100, suffix: "%", icon: Zap }
            ].map((stat, i) => (
              <div key={i} className="space-y-4 group">
                <div className="flex items-center gap-3">
                  <stat.icon className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
                </div>
                <div className="text-4xl font-display font-semibold tracking-tight text-foreground">
                  <NumberTicker value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Features Section */}
      <section id="features" className="py-40 px-8">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="max-w-2xl space-y-6">
            <h2 className="text-5xl md:text-6xl font-display font-semibold tracking-tight text-foreground leading-[1.1]">
              Engineered for <br />
              <span className="text-muted-foreground">High-Performance.</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              Our infrastructure is built to reward accuracy and consistency. 
              The more precise your work, the higher your tier and earning potential.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Cpu, 
                title: "Automated Dispatch", 
                desc: "Proprietary algorithms match tasks to your specific device profile and location for maximum efficiency." 
              },
              { 
                icon: Shield, 
                title: "Smart Escrow", 
                desc: "Every task is backed by our automated payout system, ensuring you get paid instantly upon verification." 
              },
              { 
                icon: Globe, 
                title: "Borderless Access", 
                desc: "A truly global network. Work from anywhere in the world with zero friction and instant onboarding." 
              },
              { 
                icon: Layers, 
                title: "Tiered Progression", 
                desc: "Unlock higher-value tasks and priority support as you build your reputation within the network." 
              },
              { 
                icon: Fingerprint, 
                title: "Identity Verified", 
                desc: "We maintain a high-trust environment through rigorous identity verification and quality control." 
              },
              { 
                icon: Layout, 
                title: "Unified Dashboard", 
                desc: "Manage your tasks, earnings, and profile through a single, minimalist interface designed for speed." 
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="group p-10 rounded-[1.5rem] bg-card border border-border hover:bg-muted/30 transition-all duration-500 shadow-sm"
              >
                <div className="space-y-8">
                  <DesignerIcon icon={feature.icon} />
                  <div className="space-y-4">
                    <h3 className="text-xl font-display font-semibold text-foreground tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section id="calculator" className="py-40 px-8 bg-muted/10 border-y border-border">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-32 items-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-semibold uppercase tracking-widest text-xs rounded-full px-4 py-1">
                Projection
              </Badge>
              <h2 className="text-5xl md:text-6xl font-display font-semibold tracking-tight text-foreground leading-[1.1]">
                Scale Your <br />Earnings.
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed max-w-md">
                Top operators maintain high accuracy scores to unlock Premium tier tasks with significantly higher rates.
              </p>
            </div>
            
            <div className="space-y-12 p-12 rounded-[1.5rem] bg-card border border-border shadow-sm">
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily Commitment</label>
                    <div className="text-4xl font-display font-semibold text-foreground">{hours[0]} <span className="text-lg font-medium text-muted-foreground">Hours</span></div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-md border border-primary/20">
                    $12.50 / Hour
                  </div>
                </div>
                <Slider 
                  value={hours} 
                  onValueChange={(val) => setHours(Array.isArray(val) ? [...val] : [val])} 
                  max={12} 
                  min={1} 
                  step={1} 
                  className="py-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-border">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily</div>
                  <div className="text-4xl font-display font-semibold text-foreground">${potentialDaily.toFixed(2)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-widest text-primary">Monthly</div>
                  <div className="text-4xl font-display font-semibold text-primary">${(potentialDaily * 30).toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12 relative">
            <div className="absolute -left-16 top-0 bottom-0 w-px bg-border hidden lg:block" />
            {[
              { icon: Target, title: "Vetted Flow", desc: "No low-quality noise. Only high-value operations from verified global partners." },
              { icon: TrendingUp, title: "Career Path", desc: "Grow from a New operator to a Premium strategist with exclusive access." },
              { icon: Shield, title: "Smart Payouts", desc: "Automated verification and smart-contract escrow for total financial security." }
            ].map((item, i) => (
              <div key={i} className="flex gap-8 group">
                <DesignerIcon icon={item.icon} className="shrink-0" />
                <div className="space-y-3">
                  <h4 className="text-xl font-display font-semibold text-foreground tracking-tight">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="how-it-works" className="py-40 px-8">
        <div className="max-w-3xl mx-auto space-y-24">
          <div className="text-center space-y-6">
            <h2 className="text-5xl font-display font-semibold tracking-tight text-foreground">The Protocol.</h2>
            <p className="text-muted-foreground font-medium text-lg">Everything you need to know about joining the Force.</p>
          </div>

          <Accordion className="w-full space-y-4">
            {[
              { q: "How do I get started?", a: "Complete our 30-second application and verify your identity. Once approved, you'll gain access to the dashboard where tasks are automatically assigned based on your profile." },
              { q: "When do I get paid?", a: "Payouts are processed within 48 hours of reaching the $25 withdrawal threshold. We support PayPal, Bank Transfer, and major Cryptocurrencies." },
              { q: "What are the requirements?", a: "You need a reliable internet connection, a modern smartphone or laptop, and the ability to follow detailed instructions with high precision." },
              { q: "How do I unlock higher rates?", a: "Maintain a quality score above 95% and complete at least 50 tasks to unlock 'Trusted' status. Premium status is granted to our top 5% of operators." }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border px-8 rounded-[1.5rem] bg-muted/20 hover:bg-muted/30 transition-colors">
                <AccordionTrigger className="text-lg font-display font-semibold hover:no-underline py-8">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed font-medium pb-8 text-base">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative p-16 md:p-32 rounded-[2.5rem] bg-primary overflow-hidden text-center space-y-12">
            <div className="absolute inset-0 bg-muted pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-foreground/10 blur-none rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-5xl md:text-8xl font-display font-semibold tracking-tight text-primary-foreground leading-[0.9]">
                Join the <br />Future of Work.
              </h2>
              <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto font-medium leading-relaxed">
                Applications are currently open for all regions. 
                Start your journey as a Spunn Force operator today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-8 pt-8">
                <Link to="/apply" className={cn(
                  buttonVariants({ size: "lg", variant: "secondary" }), 
                  "w-full sm:w-auto h-16 md:h-20 px-10 md:px-16 text-lg md:text-xl font-semibold rounded-full shadow-md bg-foreground text-background hover:bg-foreground/90 transition-all uppercase tracking-wider"
                )}>
                  Apply Now
                </Link>
                <div className="flex items-center gap-3 text-primary-foreground/60 text-xs font-semibold uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> 30-Second Setup
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-border bg-muted/10">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="flex flex-col md:flex-row justify-between items-start gap-20">
            <div className="space-y-8">
              <Logo showText={true} />
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed font-medium">
                The premier distributed workforce for high-accuracy micro-tasks and digital asset generation.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-20 sm:gap-32">
              <div className="space-y-6">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">Platform</h4>
                <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                  <li><a href="#" className="hover:text-primary transition-colors">Network</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Earnings</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Protocol</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">Company</h4>
                <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                  <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">Support</h4>
                <ul className="space-y-4 text-sm text-muted-foreground font-medium">
                  <li><a href="#" className="hover:text-primary transition-colors">Help</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
            <p>© 2026 Spunn Force Network. All rights reserved.</p>
            <div className="flex gap-12">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">Discord</a>
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

