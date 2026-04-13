import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowUpRight, CheckCircle2, DollarSign, Clock, ShieldCheck, CheckSquare, Sparkles, ArrowRight } from "lucide-react";
import { motion, useInView, useMotionValue, useSpring } from "motion/react";
import { Logo } from "../components/Logo";

function NumberTicker({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 40, stiffness: 100 });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Intl.NumberFormat("en-US").format(Math.round(latest))}${suffix}`;
      }
    });
  }, [springValue, prefix, suffix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay, type: "spring", bounce: 0.4 }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-purple-500/30 overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center justify-center gap-3 group hover:opacity-80 transition-opacity">
            <Logo />
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-400">
            <Link to="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link to="#requirements" className="hover:text-white transition-colors">Requirements</Link>
            <Link to="/login" className="hover:text-white transition-colors">Worker Login</Link>
            <Link to="/apply" className="text-[#050505] bg-white hover:bg-zinc-200 px-6 py-2.5 rounded-full transition-all flex items-center gap-2 font-semibold hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
              Apply Now
            </Link>
          </div>
          
          {/* Mobile Nav Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/login" className="text-sm text-zinc-400 hover:text-white">Login</Link>
            <Link to="/apply" className="text-[#050505] bg-white px-4 py-2 rounded-full text-sm font-semibold active:scale-95 transition-transform">Apply</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 flex flex-col items-center text-center px-6">
        {/* Ambient Glow */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-500/10 blur-[120px] rounded-[100%] pointer-events-none"
        />

        <FadeIn delay={0.1}>
          <div className="flex items-center space-x-4 mb-12 relative z-10">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-purple-500/50"></div>
            <span className="text-purple-400 uppercase tracking-[0.2em] text-xs font-semibold flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Now Hiring
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-purple-500/50"></div>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="relative inline-block mb-8 z-10">
            <div className="absolute -inset-8 border border-white/10 hidden md:block">
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#050505] border border-white/20 rounded-sm"></div>
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#050505] border border-white/20 rounded-sm"></div>
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#050505] border border-white/20 rounded-sm"></div>
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#050505] border border-white/20 rounded-sm"></div>
            </div>
            <h1 className="text-6xl md:text-[8rem] font-display font-medium tracking-tight leading-none">
              <span className="text-[#FDFBF7]">Spun</span><span className="text-zinc-500">Force</span>
            </h1>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mt-12 mb-12 relative z-10 font-medium">
            Get paid for simple online tasks.<br className="hidden md:block" />
            Join a private, global team completing short digital actions. Consistent work, fast payouts.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 relative z-10">
            <Link to="/apply">
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px -10px rgba(255,255,255,0.5)" }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto text-[#050505] bg-white px-8 py-4 rounded-full font-bold transition-colors shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] flex items-center gap-2"
              >
                Apply to Join the Team <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto text-white border border-white/10 bg-white/5 px-8 py-4 rounded-full font-semibold transition-colors"
              >
                Worker Login
              </motion.button>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Stats / Social Proof */}
      <div className="max-w-5xl mx-auto px-6 relative z-20 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-white/5 py-10">
          <FadeIn delay={0.1} className="flex flex-col items-center">
            <div className="text-3xl font-display font-bold text-white mb-1">
              <NumberTicker value={500} suffix="+" />
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Tasks Completed</div>
          </FadeIn>
          <FadeIn delay={0.2} className="flex flex-col items-center">
            <div className="text-3xl font-display font-bold text-white mb-1">2-3 Days</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Fast Payouts</div>
          </FadeIn>
          <FadeIn delay={0.3} className="flex flex-col items-center">
            <div className="text-3xl font-display font-bold text-white mb-1">
              <NumberTicker value={25} prefix="$" />
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Min Payout</div>
          </FadeIn>
          <FadeIn delay={0.4} className="flex flex-col items-center">
            <div className="text-3xl font-display font-bold text-purple-400 mb-1 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
              </span>
              Active
            </div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Hiring Status</div>
          </FadeIn>
        </div>
      </div>

      {/* Dashboard Mockup */}
      <FadeIn delay={0.2}>
        <section className="max-w-5xl mx-auto px-6 relative z-20 mb-32">
          <motion.div 
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="rounded-2xl border border-white/10 bg-[#0A0A0A] shadow-2xl overflow-hidden ring-1 ring-white/5 group"
          >
            {/* Browser Header */}
            <div className="flex items-center px-4 py-3 border-b border-white/5 bg-[#0F0F0F]">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
              </div>
              <div className="mx-auto bg-[#1A1A1A] rounded-md px-32 py-1.5 text-xs text-zinc-500 flex items-center border border-white/5">
                <Lock className="w-3 h-3 mr-2" /> taskforce.app/worker
              </div>
            </div>
            
            {/* Dashboard Content */}
            <div className="p-8 bg-gradient-to-b from-[#0A0A0A] to-[#050505] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                  <h2 className="text-white text-xl font-display font-semibold">Welcome back, Worker!</h2>
                  <p className="text-zinc-500 text-sm">Here's a quick peek at your tasks and earnings.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center space-x-6 text-sm text-zinc-400">
                    <span className="text-white">Dashboard</span>
                    <span>Available Tasks</span>
                    <span>Earnings</span>
                    <span>Settings</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-amber-500 ml-8 shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {/* Earnings Overview */}
                <div className="col-span-1 md:col-span-1 bg-[#111111] border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-colors">
                  <h3 className="text-white text-sm font-medium mb-6">Earnings overview</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-display font-bold text-white mb-1">$145.50</div>
                      <div className="text-xs text-zinc-500">Total earned</div>
                      <div className="text-xs text-purple-400 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> $12.50 pending</div>
                    </div>
                    {/* Donut Chart Mock */}
                    <div className="relative w-24 h-24 rounded-full border-[8px] border-zinc-800 border-t-purple-500 border-r-purple-500 border-b-amber-500">
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium"></div>
                    </div>
                  </div>
                </div>

                {/* Tasks / Bar Chart */}
                <div className="col-span-1 md:col-span-1 bg-[#111111] border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-colors">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white text-sm font-medium">Tasks</h3>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Approved</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-600"></div> Pending</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[40, 70, 45, 90, 65, 85, 50, 75, 60, 80, 55, 95].map((h, i) => (
                      <motion.div 
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        viewport={{ once: true }}
                        key={i} 
                        className="flex-1 bg-purple-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" 
                      />
                    ))}
                  </div>
                </div>

                {/* Payouts / Bar Chart */}
                <div className="col-span-1 md:col-span-1 bg-[#111111] border border-white/5 rounded-2xl p-6 hover:border-amber-500/30 transition-colors">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white text-sm font-medium">Payouts</h3>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Paid</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-zinc-600"></div> Processing</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-24">
                    {[60, 80, 55, 95, 40, 70, 45, 90, 65, 85, 50, 75].map((h, i) => (
                      <motion.div 
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        viewport={{ once: true }}
                        key={i} 
                        className="flex-1 bg-amber-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </FadeIn>

      {/* Bento Grid Features (How It Works) */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <FadeIn className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-medium text-white mb-4">How It Works</h2>
          <p className="text-zinc-400">Four simple steps to start earning.</p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Apply */}
          <FadeIn delay={0.1}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center group hover:border-purple-500/30 transition-all duration-300 h-full">
              <div className="w-full bg-[#111111] rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full group-hover:bg-purple-500/40 transition-colors duration-500"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <span className="text-white text-sm font-medium">Application Status</span>
                  <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-md">Step 1</span>
                </div>
                <div className="flex justify-center items-center relative z-10 py-4">
                  <div className="relative w-32 h-32 rounded-full border-[12px] border-zinc-800 border-t-purple-500 border-r-purple-500 border-b-purple-500"></div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Review</div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-purple-400 font-bold drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">Approved</div>
                </div>
              </div>
              <h3 className="text-white text-xl font-display font-semibold mb-3">1. Apply to Join</h3>
              <p className="text-zinc-500 text-sm max-w-sm">Fill out our quick application to join the private roster. We review applications daily.</p>
            </motion.div>
          </FadeIn>

          {/* Card 2: Get Tasks */}
          <FadeIn delay={0.2}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center group hover:border-amber-500/30 transition-all duration-300 h-full">
              <div className="w-full bg-[#111111] rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/20 blur-[50px] rounded-full group-hover:bg-amber-500/40 transition-colors duration-500"></div>
                <div className="flex justify-between items-center mb-2 relative z-10">
                  <span className="text-zinc-500 text-sm font-medium">Available Tasks</span>
                  <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-md">Step 2</span>
                </div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <span className="text-3xl font-display font-bold text-white">14 New</span>
                  <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-md flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> Daily</span>
                </div>
                {/* Line Chart Mock */}
                <div className="relative h-24 w-full z-10">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible preserve-aspect-ratio-none">
                    <path d="M0,30 L15,15 L30,25 L45,5 L60,20 L75,10 L90,30 L100,15" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                    <circle cx="15" cy="15" r="2" fill="#0A0A0A" stroke="#f59e0b" strokeWidth="1" />
                    <circle cx="30" cy="25" r="2" fill="#0A0A0A" stroke="#f59e0b" strokeWidth="1" />
                    <circle cx="45" cy="5" r="2" fill="#0A0A0A" stroke="#f59e0b" strokeWidth="1" />
                    <circle cx="60" cy="20" r="2" fill="#0A0A0A" stroke="#f59e0b" strokeWidth="1" />
                    <circle cx="75" cy="10" r="2" fill="#0A0A0A" stroke="#f59e0b" strokeWidth="1" />
                  </svg>
                  <div className="flex justify-between text-[8px] text-zinc-600 mt-2 uppercase">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                </div>
              </div>
              <h3 className="text-white text-xl font-display font-semibold mb-3">2. Get Tasks</h3>
              <p className="text-zinc-500 text-sm max-w-sm">Receive daily micro-tasks directly in your dashboard. Work whenever you have free time.</p>
            </motion.div>
          </FadeIn>

          {/* Card 3: Complete */}
          <FadeIn delay={0.3}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center group hover:border-purple-500/30 transition-all duration-300 h-full">
              <div className="w-full bg-[#111111] rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500/10 blur-[40px] rounded-full group-hover:bg-purple-500/30 transition-colors duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="text-left">
                    <div className="text-zinc-400 text-sm font-bold tracking-wider uppercase mb-2">Time per task</div>
                    <div className="text-4xl font-display font-bold text-white">5-20 <span className="text-xl text-zinc-500 font-sans">mins</span></div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-purple-500/20 transition-colors">
                    <CheckSquare className="w-5 h-5 text-white group-hover:text-purple-400 transition-colors" />
                  </div>
                </div>
                <div className="flex justify-between items-end relative z-10 mt-8">
                  <div className="text-sm text-zinc-500 flex items-center">
                    <span className="text-purple-400 flex items-center mr-2"><ArrowUpRight className="w-4 h-4 mr-1" /> $0.30 - $5.00</span> per completion
                  </div>
                  {/* Small Trend Line */}
                  <div className="w-24 h-12">
                    <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                      <path d="M0,35 L20,30 L40,35 L60,20 L80,25 L100,5" fill="none" stroke="#8b5cf6" strokeWidth="2" className="drop-shadow-[0_0_5px_rgba(139,92,246,0.5)]" />
                      <path d="M0,35 L20,30 L40,35 L60,20 L80,25 L100,5 L100,40 L0,40 Z" fill="url(#purpleGradient)" opacity="0.2" />
                      <defs>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
              <h3 className="text-white text-xl font-display font-semibold mb-3">3. Complete Actions</h3>
              <p className="text-zinc-500 text-sm max-w-sm">Spend a few minutes completing simple actions like app testing, surveys, and data entry.</p>
            </motion.div>
          </FadeIn>

          {/* Card 4: Get Paid */}
          <FadeIn delay={0.4}>
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center group hover:border-white/20 transition-all duration-300 h-full">
              <div className="w-full bg-[#111111] rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden min-h-[220px]">
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <span className="text-white text-sm font-medium">Recent Payouts</span>
                  <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded-md">Step 4</span>
                </div>
                <div className="space-y-4 relative z-10 text-left">
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(139,92,246,0.5)] group-hover/item:scale-110 transition-transform">$</div>
                      <div>
                        <div className="text-white text-sm font-medium">PayPal Transfer</div>
                        <div className="text-xs text-zinc-500">Paid $25.50 to your account</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-purple-400 font-medium bg-purple-400/10 px-2 py-1 rounded">Completed</div>
                  </div>
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(139,92,246,0.5)] group-hover/item:scale-110 transition-transform">$</div>
                      <div>
                        <div className="text-white text-sm font-medium">Crypto (USDT)</div>
                        <div className="text-xs text-zinc-500">Paid $42.00 to your wallet</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-purple-400 font-medium bg-purple-400/10 px-2 py-1 rounded">Completed</div>
                  </div>
                  <div className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white text-xs font-bold group-hover/item:scale-110 transition-transform">$</div>
                      <div>
                        <div className="text-white text-sm font-medium">CashApp</div>
                        <div className="text-xs text-zinc-500">Processing $15.00</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-medium bg-zinc-800 px-2 py-1 rounded">Pending</div>
                  </div>
                </div>
              </div>
              <h3 className="text-white text-xl font-display font-semibold mb-3">4. Get Paid</h3>
              <p className="text-zinc-500 text-sm max-w-sm">Submit proof and get paid via PayPal, CashApp, or Crypto. Minimum payout is just $25.</p>
            </motion.div>
          </FadeIn>

        </div>
      </section>

      {/* Requirements Section */}
      <section id="requirements" className="max-w-5xl mx-auto px-6 pb-32">
        <FadeIn>
          <div className="bg-[#0A0A0A] p-12 rounded-3xl border border-white/5 text-left relative overflow-hidden group hover:border-purple-500/20 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-purple-500/10 transition-colors duration-700"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="flex-1">
                <h2 className="text-3xl md:text-4xl font-display font-medium text-white mb-6">Requirements</h2>
                <p className="text-zinc-400 mb-8 max-w-md">We maintain a high-quality workforce. To join the private roster, you must meet these criteria:</p>
                <ul className="space-y-5">
                  {[
                    "Must be based in an eligible country",
                    "Own a smartphone or laptop",
                    "Available for at least 2 hours per day",
                    "Commitment to consistent, daily work"
                  ].map((req, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-4 group/li"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover/li:bg-purple-500/20 group-hover/li:scale-110 transition-all">
                        <CheckCircle2 className="text-purple-400 w-4 h-4" />
                      </div>
                      <span className="text-zinc-300">{req}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
              
              <div className="flex-1 bg-[#111111] p-8 rounded-2xl border border-white/5 w-full">
                <div className="flex items-center gap-5 mb-8 group/feat">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/feat:bg-purple-500/10 group-hover/feat:border-purple-500/30 transition-colors">
                    <ShieldCheck className="w-6 h-6 text-white group-hover/feat:text-purple-400 transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-lg">Strict Fraud Control</div>
                    <div className="text-sm text-zinc-500">No VPNs or duplicate accounts</div>
                  </div>
                </div>
                <div className="flex items-center gap-5 mb-8 group/feat">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/feat:bg-purple-500/10 group-hover/feat:border-purple-500/30 transition-colors">
                    <DollarSign className="w-6 h-6 text-white group-hover/feat:text-purple-400 transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-lg">$0.30 - $5.00 per task</div>
                    <div className="text-sm text-zinc-500">Higher payouts for consistent workers</div>
                  </div>
                </div>
                <div className="flex items-center gap-5 group/feat">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/feat:bg-purple-500/10 group-hover/feat:border-purple-500/30 transition-colors">
                    <Clock className="w-6 h-6 text-white group-hover/feat:text-purple-400 transition-colors" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-lg">Flexible Hours</div>
                    <div className="text-sm text-zinc-500">Work whenever you have free time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
