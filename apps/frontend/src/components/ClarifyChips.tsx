// src/components/ClarifyChips.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, ArrowRight, Send } from 'lucide-react';
import { MapComponent } from './MapComponent';
import { theme } from '../theme';

interface Props {
  question: string;
  options: string[];
  questionNumber: number;
  maxQuestions: number;
  onSelect: (answer: string) => void;
  isLoading: boolean;
}

export function ClarifyChips({ question, options, questionNumber, maxQuestions, onSelect, isLoading }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(null);
    setCustomText('');
  }, [question]);

  const handleChipSelect = (option: string) => {
    if (isLoading) return;
    setSelected(option);
    setCustomText('');
    onSelect(option);
  };

  const handleCustomSubmit = () => {
    const trimmed = customText.trim();
    if (!trimmed || isLoading) return;
    setSelected(null);
    onSelect(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCustomSubmit();
  };

  const dots: number[] = [];
  for (let i = 0; i < maxQuestions; i++) dots.push(i);

  return (
    <motion.div
      key={question}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="flex items-start gap-4 mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center"
        >
          <MessageCircleQuestion size={20} className="text-indigo-400" />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-xs font-semibold uppercase tracking-widest text-indigo-400"
            >
              Question {questionNumber} of up to {maxQuestions}
            </motion.p>
            <div className="flex items-center gap-1">
              <MapComponent
                items={dots}
                keyExtractor={(i) => i}
                renderItem={(_, i) => (
                  <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < questionNumber ? 'bg-indigo-500' : 'bg-white/10'}`} />
                )}
              />
            </div>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl sm:text-2xl font-bold text-white leading-snug"
          >
            {question}
          </motion.h2>
        </div>
      </div>

      <MapComponent
        items={options}
        keyExtractor={(o) => o}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        renderItem={(option, i) => (
          <motion.button
            id={`chip-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => handleChipSelect(option)}
            disabled={isLoading}
            className={`chip text-left group relative overflow-hidden ${selected === option ? 'selected' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selected === option && (
              <motion.div
                layoutId="chip-selection"
                className="absolute inset-0 rounded-xl"
                style={{ background: theme.bg.chipSelected, border: theme.bg.chipSelectedBorder }}
              />
            )}
            <span className="relative z-10 flex items-center justify-between">
              <span className="text-sm leading-snug">{option}</span>
              {selected === option && (
                <motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} className="ml-2 flex-shrink-0">
                  {isLoading
                    ? <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin block" />
                    : <ArrowRight size={14} className="text-indigo-400" />}
                </motion.span>
              )}
            </span>
          </motion.button>
        )}
      />

      {/* Free-text input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-4"
      >
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 transition-all duration-200 ${
            isFocused ? 'border-indigo-500/40' : 'border-white/8'
          }`}
          style={{ background: isFocused ? theme.bg.textInputFocus : theme.bg.textInput }}
        >
          <input
            ref={inputRef}
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isLoading}
            placeholder="Or describe your situation in your own words…"
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none disabled:opacity-40"
          />
          <AnimatePresence>
            {customText.trim().length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleCustomSubmit}
                disabled={isLoading}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-colors disabled:opacity-40"
              >
                {isLoading
                  ? <span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin block" />
                  : <Send size={12} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-xs text-zinc-600 text-center mt-4"
      >
        Pick an option above or type your own context below
      </motion.p>
    </motion.div>
  );
}
