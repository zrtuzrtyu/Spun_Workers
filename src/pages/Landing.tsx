import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, AnimatePresence } from "motion/react";
import { ArrowRight, CheckCircle2, DollarSign, Zap, Shield, Globe, Sparkles, Users, TrendingUp, ChevronRight, Play, Star, Clock, Target } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 overflow-x-hidden font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group hover:opacity-80 transition-opacity">
            <Logo className="scale-90" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Network</a>
            <a href="#calculator" className="hover:text-foreground transition-colors">Earnings</a>
          </div>
            <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors px-4">Log in</Link>
            <Link to="/apply" className={cn(buttonVariants({ size: "sm" }), "font-bold uppercase tracking-wider h-9 px-6 shadow-lg shadow-primary/20")}>
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Editorial Split Layout */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden border-b border-border/50">
        {/* Ambient Background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3 mr-2" /> Vetted Network Open
            </Badge>
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-foreground">
              Precision <br />
              <span className="text-primary italic">Workforce</span> <br />
              at Scale.
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed font-medium">
              SpunForce is the premier distributed network for high-accuracy micro-tasks. Join 12,000+ verified operators turning precision into profit.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Link to="/apply" className={cn(buttonVariants({ size: "lg" }), "h-14 px-10 text-base font-bold shadow-xl shadow-primary/20 group")}>
                Start Earning <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#calculator" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-14 px-10 text-base font-bold border-border/50 hover:bg-muted/50")}>
                <TrendingUp className="w-4 h-4 mr-2" /> Earnings Calculator
              </a>
            </div>

            <div className="flex items-center gap-6 pt-8">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden ring-1 ring-border">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-primary text-primary" />)}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trusted by 12k+ Operators</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl relative z-10">
              <div className="p-1 bg-border/50">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                  <div className="ml-4 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Live_Network_Status.sh</div>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-muted/20 relative overflow-hidden">
                  <div className="absolute inset-0 p-8 font-mono text-[10px] space-y-4">
                    <div className="flex items-center gap-4 text-primary">
                      <span className="opacity-50">01</span>
                      <span>Initializing SpunForce Protocol...</span>
                    </div>
                    <div className="flex items-center gap-4 text-foreground/80">
                      <span className="opacity-50">02</span>
                      <span>Connecting to Global Nodes [12,402 Active]</span>
                    </div>
                    <div className="flex items-center gap-4 text-foreground/80">
                      <span className="opacity-50">03</span>
                      <span>Syncing Task Queue: 8,291 Available</span>
                    </div>
                    <div className="pt-4 space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-foreground/60">Task #{8290 + i} Verified</span>
                          </div>
                          <span className="text-primary font-bold">+$12.50</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 flex items-center gap-2 text-primary animate-pulse">
                      <span>_</span>
                      <span className="h-4 w-1 bg-primary" />
                    </div>
                  </div>
                  {/* Grid Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - Minimalist */}
      <section className="bg-muted/30 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { label: "Tasks Completed", value: 500, suffix: "k+" },
            { label: "Avg. Payout Time", value: 48, suffix: "h" },
            { label: "Min. Withdrawal", value: 25, prefix: "$" },
            { label: "Network Status", value: 100, suffix: "%", custom: "Active" }
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <div className="text-3xl font-bold tracking-tighter text-foreground">
                {stat.custom ? <span className="text-primary">{stat.custom}</span> : <NumberTicker value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Earnings Calculator - SaaS Split */}
      <section id="calculator" className="py-32 px-6 border-b border-border/50">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-bold uppercase tracking-widest text-[9px]">Potential</Badge>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Calculate Your <br />Earnings Potential</h2>
              <p className="text-muted-foreground leading-relaxed max-w-md">Our top operators earn significantly more by maintaining high accuracy and unlocking Premium tier tasks.</p>
            </div>
            
            <div className="space-y-10 bg-muted/30 p-8 rounded-3xl border border-border/50">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Commitment</label>
                    <div className="text-2xl font-bold text-foreground">{hours[0]} Hours</div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                    Standard Rate: $12.50/hr
                  </Badge>
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

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Daily Potential</div>
                  <div className="text-3xl font-bold tracking-tighter text-foreground">${potentialDaily.toFixed(2)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-primary">Monthly Potential</div>
                  <div className="text-3xl font-bold tracking-tighter text-primary">${(potentialDaily * 30).toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {[
              { icon: Target, title: "Vetted Opportunities", desc: "No low-quality tasks. Only high-value operations from verified partners." },
              { icon: TrendingUp, title: "Career Progression", desc: "Grow from a New operator to a Premium strategist with higher rates." },
              { icon: Shield, title: "Guaranteed Payouts", desc: "Our smart-contract escrow ensures you get paid for every verified task." }
            ].map((item, i) => (
              <Card key={i} className="border-border/50 bg-card/50 hover:bg-muted/30 transition-colors group">
                <CardContent className="p-6 flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="py-32 px-6 bg-muted/10">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-bold uppercase tracking-widest text-[9px]">Infrastructure</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground">Built for Performance</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Our platform is designed to reward accuracy and consistency with higher-tier opportunities.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Instant Access", desc: "Get assigned tasks matching your device and location automatically." },
              { icon: Shield, title: "Secure Payouts", desc: "Reliable withdrawals via PayPal or Crypto once you hit the threshold." },
              { icon: Globe, title: "Global Reach", desc: "Work from anywhere in the world with just a smartphone or laptop." }
            ].map((feature, i) => (
              <Card key={i} className="border-border/50 bg-card/50 hover:border-primary/30 transition-all group overflow-hidden">
                <CardContent className="p-10 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold tracking-tight text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ / How it Works - Accordion */}
      <section id="how-it-works" className="py-32 px-6 border-y border-border/50">
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tighter text-foreground">The Path to Success</h2>
            <p className="text-muted-foreground">Everything you need to know about joining the SpunForce network.</p>
          </div>

          <Accordion className="w-full">
            {[
              { q: "How do I get started?", a: "Complete our 30-second application and verify your identity. Once approved, you'll gain access to the dashboard where tasks are automatically assigned based on your profile." },
              { q: "When do I get paid?", a: "Payouts are processed within 48 hours of reaching the $25 withdrawal threshold. We support PayPal, Bank Transfer, and major Cryptocurrencies." },
              { q: "What are the requirements?", a: "You need a reliable internet connection, a modern smartphone or laptop, and the ability to follow detailed instructions with high precision." },
              { q: "How do I unlock higher rates?", a: "Maintain a quality score above 95% and complete at least 50 tasks to unlock 'Trusted' status. Premium status is granted to our top 5% of operators." }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
                <AccordionTrigger className="text-base font-bold hover:text-primary transition-colors text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-primary border-none overflow-hidden relative shadow-2xl shadow-primary/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
            <CardContent className="p-12 md:p-20 text-center space-y-8 relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-primary-foreground">Ready to join the <br />distributed future?</h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto text-lg font-medium">
                Applications are currently open for all regions. Start your journey as a SpunForce operator today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/apply" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "h-16 px-12 text-lg font-bold shadow-xl")}>
                  Apply Now
                </Link>
                <div className="flex items-center gap-3 text-primary-foreground/60 text-sm font-bold uppercase tracking-widest">
                  <Clock className="w-4 h-4" /> 30-Second Setup
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6">
              <Logo showText={true} />
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                The premier distributed workforce for high-accuracy micro-tasks and digital asset generation.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-24">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Platform</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Earnings</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Network</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">Support</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
                </ul>
              </div>
            </div>
          </div>
          <Separator className="bg-border/50" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            <p>© 2026 SpunForce Network. All rights reserved.</p>
            <div className="flex gap-8">
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

