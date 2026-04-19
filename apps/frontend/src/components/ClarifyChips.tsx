// src/components/ClarifyChips.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Leaf, Users, Gauge, Wallet, Navigation, Car } from 'lucide-react';
import { MapComponent } from './MapComponent';

interface Props {
  question: string;
  options: string[];
  questionNumber: number;
  maxQuestions: number;
  onSelect: (answer: string) => void;
  onBack: () => void;
  isLoading: boolean;
}

// Map keywords in option text to lucide icons
function getOptionIcon(option: string) {
  const lower = option.toLowerCase();
  if (/eco|electric|hybrid|green|ev|fuel/.test(lower))    return <Leaf size={24} className="text-primary" />;
  if (/family|seat|space|room|kids|child/.test(lower))     return <Users size={24} className="text-primary" />;
  if (/perfo|speed|sport|power|fast/.test(lower))          return <Gauge size={24} className="text-primary" />;
  if (/budget|afford|cost|cheap|value/.test(lower))        return <Wallet size={24} className="text-primary" />;
  if (/highway|long|distance|commut|route/.test(lower))    return <Navigation size={24} className="text-primary" />;
  return <Car size={24} className="text-primary" />;
}

export function ClarifyChips({ question, options, questionNumber, maxQuestions, onSelect, onBack, isLoading }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { setSelected(null); }, [question]);

  const handleSelect = (option: string) => {
    if (isLoading) return;
    setSelected(option);
    onSelect(option);
  };

  const dots: number[] = [];
  for (let i = 0; i < maxQuestions; i++) dots.push(i);

  return (
    <motion.div
      key={question}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl"
    >
      {/* Question counter dots */}
      <div className="flex items-center gap-1.5 mb-6">
        <MapComponent
          items={dots}
          keyExtractor={(i) => i}
          renderItem={(_, i) => (
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i < questionNumber ? 'bg-primary' : 'bg-surface-variant'
            }`} />
          )}
        />
        <span className="ml-2 text-xs text-on-surface-variant font-label">
          Question {questionNumber} of up to {maxQuestions}
        </span>
      </div>

      {/* Header */}
      <div className="text-center mb-12 max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-on-surface mb-4">
          Refine your profile.
        </h1>
        <p className="text-lg md:text-xl text-on-surface-variant font-body">{question}</p>
      </div>

      {/* Bento chip grid */}
      <MapComponent
        items={options}
        keyExtractor={(o) => o}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full mb-12"
        renderItem={(option, i) => (
          <motion.button
            id={`chip-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => handleSelect(option)}
            disabled={isLoading}
            className={`chip ${selected === option ? 'selected' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="mb-4 block">{getOptionIcon(option)}</span>
            <span className="font-semibold text-lg font-label block leading-snug">{option}</span>
            {selected === option && isLoading && (
              <span className="mt-2 w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin block" />
            )}
          </motion.button>
        )}
      />

      {/* Action row */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pt-8 border-t border-outline-variant/30">
        <button
          onClick={onBack}
          className="px-6 py-3 text-on-surface font-medium font-label hover:bg-surface-container rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        {selected && !isLoading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-on-surface-variant font-label flex items-center gap-2"
          >
            <ArrowRight size={16} className="text-primary" />
            Proceeding with "{selected}"…
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
