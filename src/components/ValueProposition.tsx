import React from 'react';
import { Target, ShieldCheck, Zap } from 'lucide-react';

export const ValueProposition = () => {
  const benefits = [
    {
      title: "Quick Onboarding",
      desc: "Get verified and start earning without the typical hiring delays.",
      icon: Zap,
    },
    {
      title: "Fair Assessment",
      desc: "We value expertise. Your skills define your tier and earning potential.",
      icon: Target,
    },
    {
      title: "Secure & Trusted",
      desc: "Work in a protected, anonymous environment designed for professionals.",
      icon: ShieldCheck,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {benefits.map((b, i) => (
        <div key={i} className="glass-card p-6 flex flex-col gap-4 border border-border/50 hover:border-primary/50 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <b.icon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em]">{b.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
        </div>
      ))}
    </div>
  );
};
