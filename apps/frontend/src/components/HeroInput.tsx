// src/components/HeroInput.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import { MapComponent } from './MapComponent';
import { theme } from '../theme';

interface Props {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const PLACEHOLDER = `Family of 4 in Pune, 15L OTR, mostly city driving, Ooty once a year, wife finds parking scary, no clue about fuel type...`;

const EXAMPLES = [
  'First car buyer in Bangalore, budget ₹8L, mostly office commute 25km daily, safety is my top priority.',
  'Couple in Mumbai, ₹20L budget, weekend highway trips, want automatic, considering EV if charging is sorted.',
  'Joint family of 6 in Delhi, ₹12L max, need 7 seats, CNG or petrol, driver drives daily 50km.',
];

const BADGES = ['20 Indian car models', '5 fuel types covered', 'Zero spam, no login'];

export function HeroInput({ onSubmit, isLoading }: Props) {
  const [text, setText] = useState('');
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length >= 10) onSubmit(text.trim());
  };

  const charCount = text.length;
  const isValid = charCount >= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-6"
        >
          <Sparkles size={14} className="text-indigo-400" />
          AI-powered shortlisting for Indian buyers
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4"
        >
          <span className="gradient-text">Find your</span>
          <br />
          <span className="text-white">perfect car.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto"
        >
          Just describe your situation in plain language.
          We'll ask smart questions, then shortlist exactly 3 cars for you.
        </motion.p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="space-y-4"
      >
        <div className="relative group">
          <div
            className="absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"
            style={{ background: theme.gradient.inputGlowBlur, filter: 'blur(8px)' }}
          />
          <div className="relative glass-card overflow-hidden">
            <textarea
              id="hero-input"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={5}
              className="w-full bg-transparent px-6 pt-5 pb-16 text-base text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none leading-relaxed"
              autoFocus
            />
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 border-t border-white/5">
              <span className={`text-xs font-medium transition-colors ${isValid ? 'text-zinc-500' : 'text-zinc-700'}`}>
                {charCount < 10 ? `${10 - charCount} more characters…` : `${charCount} characters`}
              </span>
              <motion.button
                type="submit"
                disabled={!isValid || isLoading}
                whileHover={isValid && !isLoading ? { scale: 1.02 } : {}}
                whileTap={isValid && !isLoading ? { scale: 0.98 } : {}}
                className="btn-primary text-sm px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                id="submit-btn"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2 relative z-10">
                    Shortlist my car
                    <ArrowRight size={16} />
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowExamples(v => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${showExamples ? 'rotate-180' : ''}`} />
            Show example inputs
          </button>

          {showExamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              <MapComponent
                items={EXAMPLES}
                keyExtractor={(_, i) => i}
                renderItem={(ex) => (
                  <button
                    type="button"
                    onClick={() => { setText(ex); setShowExamples(false); }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/8 bg-white/3 text-zinc-500 text-xs hover:text-zinc-300 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
                  >
                    "{ex}"
                  </button>
                )}
              />
            </motion.div>
          )}
        </div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="flex items-center justify-center gap-4 sm:gap-6 mt-10 flex-wrap"
      >
        <MapComponent
          items={BADGES}
          keyExtractor={(b) => b}
          renderItem={(badge) => (
            <span className="text-xs text-zinc-600 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-500/60" />
              {badge}
            </span>
          )}
        />
      </motion.div>
    </motion.div>
  );
}
