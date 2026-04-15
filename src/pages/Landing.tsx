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
  Fingerprint
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * DesignerIcon Wrapper
 * Adds a custom, high-end look to standard Lucide icons
 */
function DesignerIcon({ icon: Icon, className }: { icon: any, className?: string }) {
  return (
    <div className={cn(
      "relative flex items-center justify-center w-12 h-12 rounded-2xl",
      "bg-gradient-to-br from-white/[0.08] to-transparent border border-white/[0.05]",
      "shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] overflow-hidden group-hover:border-primary/30 transition-all duration-500",
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

export default function Landing() {
  const [hours, setHours] = useState([4]);
  const hourlyRate = 12.50;
  const potentialDaily = hours[0] * hourlyRate;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden font-sans antialiased">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/40 backdrop-blur-2xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-10 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo className="scale-110 group-hover:opacity-80 transition-opacity" />
          </Link>
          
          <div className="hidden md:flex items-center gap-12 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">Network</a>
            <a href="#calculator" className="hover:text-primary transition-colors">Earnings</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">Protocol</a>
          </div>

          <div className="flex items-center gap-8">
            <Link to="/login" className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link to="/apply" className={cn(
              buttonVariants({ size: "lg" }), 
              "font-black uppercase tracking-[0.2em] text-xs h-14 px-10 rounded-full",
              "bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-xl shadow-primary/20"
            )}>
              Join Force
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-5xl mx-auto text-center space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-6 py-2.5 text-xs font-black uppercase tracking-[0.4em] rounded-full">
                <Sparkles className="w-4 h-4 mr-3 text-primary" /> Distributed Intelligence Network
              </Badge>
              
              <h1 className="text-8xl md:text-[140px] font-display font-bold tracking-[-0.05em] leading-[0.8] text-foreground">
                Precision <br />
                <span className="text-primary">at Scale.</span>
              </h1>
              
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
                Spunn Force is the premier network for high-accuracy micro-tasks. 
                Join 12,000+ verified operators turning digital precision into sustainable profit.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8"
            >
              <Link to="/apply" className={cn(
                buttonVariants({ size: "lg" }), 
                "h-20 px-16 text-lg font-black uppercase tracking-[0.2em] rounded-full group bg-foreground text-background hover:opacity-90 transition-all shadow-2xl shadow-foreground/10"
              )}>
                Start Earning <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#calculator" className={cn(
                buttonVariants({ variant: "outline", size: "lg" }), 
                "h-20 px-16 text-lg font-black uppercase tracking-[0.2em] rounded-full border-border hover:bg-muted transition-all"
              )}>
                View Potential
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
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted overflow-hidden ring-1 ring-white/10 grayscale hover:grayscale-0 transition-all duration-500 cursor-pointer">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
                Trusted by <span className="text-white">12,402</span> Global Operators
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/[0.05] bg-white/[0.01]">
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
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</div>
                </div>
                <div className="text-4xl font-display font-bold tracking-tight text-white">
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
            <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-white leading-[1.1]">
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
                className="group p-10 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
              >
                <div className="space-y-8">
                  <DesignerIcon icon={feature.icon} />
                  <div className="space-y-4">
                    <h3 className="text-xl font-display font-bold text-white tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-light">{feature.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section id="calculator" className="py-40 px-8 bg-white/[0.01] border-y border-white/[0.05]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-32 items-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-bold uppercase tracking-[0.3em] text-[10px] rounded-full px-4 py-1">
                Projection
              </Badge>
              <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-white leading-[1.1]">
                Scale Your <br />Earnings.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed max-w-md">
                Top operators maintain high accuracy scores to unlock Premium tier tasks with significantly higher rates.
              </p>
            </div>
            
            <div className="space-y-12 p-12 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] shadow-2xl">
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Daily Commitment</label>
                    <div className="text-4xl font-display font-bold text-white">{hours[0]} <span className="text-lg font-light text-muted-foreground">Hours</span></div>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
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

              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-white/[0.05]">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Daily</div>
                  <div className="text-4xl font-display font-bold text-white">${potentialDaily.toFixed(2)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Monthly</div>
                  <div className="text-4xl font-display font-bold text-primary">${(potentialDaily * 30).toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12 relative">
            <div className="absolute -left-16 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent hidden lg:block" />
            {[
              { icon: Target, title: "Vetted Flow", desc: "No low-quality noise. Only high-value operations from verified global partners." },
              { icon: TrendingUp, title: "Career Path", desc: "Grow from a New operator to a Premium strategist with exclusive access." },
              { icon: Shield, title: "Smart Payouts", desc: "Automated verification and smart-contract escrow for total financial security." }
            ].map((item, i) => (
              <div key={i} className="flex gap-8 group">
                <DesignerIcon icon={item.icon} className="shrink-0" />
                <div className="space-y-3">
                  <h4 className="text-xl font-display font-bold text-white tracking-tight">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{item.desc}</p>
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
            <h2 className="text-5xl font-display font-bold tracking-tight text-white">The Protocol.</h2>
            <p className="text-muted-foreground font-light text-lg">Everything you need to know about joining the Force.</p>
          </div>

          <Accordion className="w-full space-y-4">
            {[
              { q: "How do I get started?", a: "Complete our 30-second application and verify your identity. Once approved, you'll gain access to the dashboard where tasks are automatically assigned based on your profile." },
              { q: "When do I get paid?", a: "Payouts are processed within 48 hours of reaching the $25 withdrawal threshold. We support PayPal, Bank Transfer, and major Cryptocurrencies." },
              { q: "What are the requirements?", a: "You need a reliable internet connection, a modern smartphone or laptop, and the ability to follow detailed instructions with high precision." },
              { q: "How do I unlock higher rates?", a: "Maintain a quality score above 95% and complete at least 50 tasks to unlock 'Trusted' status. Premium status is granted to our top 5% of operators." }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-white/[0.05] px-8 rounded-3xl bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                <AccordionTrigger className="text-lg font-display font-bold hover:no-underline py-8">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed font-light pb-8 text-base">
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
          <div className="relative p-16 md:p-32 rounded-[3.5rem] bg-primary overflow-hidden text-center space-y-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-5xl md:text-8xl font-display font-bold tracking-tight text-primary-foreground leading-[0.9]">
                Join the <br />Future of Work.
              </h2>
              <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
                Applications are currently open for all regions. 
                Start your journey as a Spunn Force operator today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
                <Link to="/apply" className={cn(
                  buttonVariants({ size: "lg", variant: "secondary" }), 
                  "h-20 px-16 text-xl font-bold rounded-full shadow-2xl bg-white text-black hover:bg-white/90 transition-all"
                )}>
                  Apply Now
                </Link>
                <div className="flex items-center gap-3 text-primary-foreground/60 text-[11px] font-bold uppercase tracking-[0.3em]">
                  <Clock className="w-4 h-4" /> 30-Second Setup
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="flex flex-col md:flex-row justify-between items-start gap-20">
            <div className="space-y-8">
              <Logo showText={true} />
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed font-light">
                The premier distributed workforce for high-accuracy micro-tasks and digital asset generation.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-20 sm:gap-32">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Platform</h4>
                <ul className="space-y-4 text-sm text-muted-foreground font-light">
                  <li><a href="#" className="hover:text-primary transition-colors">Network</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Earnings</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Protocol</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Company</h4>
                <ul className="space-y-4 text-sm text-muted-foreground font-light">
                  <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Support</h4>
                <ul className="space-y-4 text-sm text-muted-foreground font-light">
                  <li><a href="#" className="hover:text-primary transition-colors">Help</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/40">
            <p>© 2026 Spunn Force Network. All rights reserved.</p>
            <div className="flex gap-12">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Discord</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

