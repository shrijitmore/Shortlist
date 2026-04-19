// src/components/HeroInput.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Users, Mountain } from 'lucide-react';
import { MapComponent } from './MapComponent';
import { theme } from '../theme';

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const QUICK_PICKS = [
  {
    icon: <Zap size={22} className="text-primary" />,
    title: 'Electric Commuters',
    subtitle: 'Efficient daily drivers',
    prompt: 'I need an electric car for daily city commuting, budget around ₹15L, easy to charge.',
  },
  {
    icon: <Users size={22} className="text-tertiary" />,
    title: 'Family Haulers',
    subtitle: '7-seats and safety first',
    prompt: 'Family of 5, need 7-seater SUV, budget ₹20L, safety is top priority, mostly highway.',
  },
  {
    icon: <Mountain size={22} className="text-secondary" />,
    title: 'Weekend Adventures',
    subtitle: 'AWD and cargo space',
    prompt: 'Couple in Bangalore, weekend road trips to Coorg and Ooty, need AWD, budget ₹25L.',
  },
];

export function HeroInput({ onSubmit, isLoading }: Props) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length >= 10) onSubmit(text.trim());
  };

  const isValid = text.trim().length >= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto flex flex-col items-center text-center px-6 py-12"
    >
      {/* Step pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container border border-surface-variant text-on-surface-variant text-sm font-label mb-8"
      >
        <Sparkles size={14} className="text-primary" />
        Step 1 of 4
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7 }}
        className="text-5xl md:text-6xl font-headline font-semibold text-on-surface mb-6 tracking-tight"
      >
        Find your ideal drive.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-lg text-on-surface-variant mb-12 max-w-xl font-body leading-relaxed"
      >
        Tell us what you're looking for — a family SUV, a city commuter, or a sporty weekend car?
      </motion.p>

      {/* Search input row */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full relative group"
      >
        <div className="absolute -inset-1 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur"
          style={{ background: theme.bg.inputGlow }}
        />
        <div className="relative bg-surface rounded-xl shadow-md border border-outline-variant p-2 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center px-4">
            <input
              id="hero-input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. 'Family of 4 in Pune, ₹15L budget, mostly city driving…'"
              className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline/70 font-body text-base h-14 outline-none"
              autoFocus
            />
          </div>
          <motion.button
            type="submit"
            disabled={!isValid || isLoading}
            whileHover={isValid && !isLoading ? { scale: 1.02 } : {}}
            whileTap={isValid && !isLoading ? { scale: 0.98 } : {}}
            className="btn-primary text-sm px-8 whitespace-nowrap flex-shrink-0"
            id="submit-btn"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Explore
                <ArrowRight size={18} />
              </span>
            )}
          </motion.button>
        </div>
      </motion.form>

      {/* Popular Starting Points */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mt-16 w-full text-left"
      >
        <h3 className="text-sm font-label font-medium text-on-surface-variant mb-4 px-2 uppercase tracking-wider">
          Popular Starting Points
        </h3>
        <MapComponent
          items={QUICK_PICKS}
          keyExtractor={(p) => p.title}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          renderItem={(pick) => (
            <button
              type="button"
              onClick={() => { setText(pick.prompt); }}
              className="bg-surface-container-low hover:bg-surface-container border border-surface-variant p-4 rounded-lg text-left transition-colors group"
            >
              <span className="mb-2 block group-hover:scale-110 transition-transform">
                {pick.icon}
              </span>
              <span className="block font-label font-medium text-on-surface mb-1">{pick.title}</span>
              <span className="block text-sm text-on-surface-variant">{pick.subtitle}</span>
            </button>
          )}
        />
      </motion.div>
    </motion.div>
  );
}
