// src/components/LoadingStream.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { StreamEvent } from '../types';
import { MapComponent } from './MapComponent';

interface Props {
  events: StreamEvent[];
  currentStage: string;
}

const STAGES = [
  { key: 'parsed',     label: 'Scanning inventory base',         subLabel: 'Loading car database' },
  { key: 'clarifying', label: 'Evaluating lifestyle metrics',    subLabel: 'Matching your profile' },
  { key: 'retrieving', label: 'Cross-referencing safety ratings', subLabel: 'Fetching safety data' },
  { key: 'ranking',    label: 'Calculating total cost of ownership', subLabel: 'Finalising picks' },
  { key: 'done',       label: 'Ready!',                          subLabel: 'Results prepared' },
];

const PROGRESS_MAP: Record<string, number> = {
  parsed: 25, clarifying: 50, retrieving: 75, ranking: 90, done: 100,
};

export function LoadingStream({ events, currentStage }: Props) {
  const progress = PROGRESS_MAP[currentStage] ?? 5;
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  // SVG circle math
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-on-surface mb-3 tracking-tight font-headline">
          Analyzing Options
        </h1>
        <p className="text-lg text-on-surface-variant font-body">Finding your perfect match.</p>
      </div>

      {/* Bento: progress ring + telemetry log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Circular progress card */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-8 border border-outline-variant/30 flex flex-col items-center justify-center shadow-sm">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-surface-variant"
              />
              <motion.circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={progress}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-4xl font-bold text-primary font-headline"
                >
                  {progress}%
                </motion.span>
              </AnimatePresence>
              <span className="text-sm text-on-surface-variant font-label mt-1">Complete</span>
            </div>
          </div>
        </div>

        {/* Telemetry log card */}
        <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-xl p-6 border border-outline-variant/30 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4 font-label">
            Telemetry Log
          </h3>
          <div className="flex-grow flex flex-col justify-center space-y-4">
            <MapComponent
              items={STAGES.slice(0, -1)}
              keyExtractor={(s) => s.key}
              renderItem={(stage, i) => {
                const isDone    = i < currentIdx;
                const isCurrent = i === currentIdx;
                const isPending = i > currentIdx;
                return (
                  <div className={`flex items-start gap-3 transition-opacity duration-300 ${isPending ? 'opacity-40' : ''}`}>
                    <div className={`mt-0.5 rounded-full p-1 shadow-sm flex-shrink-0 ${
                      isDone    ? 'bg-secondary-container text-on-secondary-container' :
                      isCurrent ? 'bg-primary-container text-on-primary-container' :
                                  'border-2 border-outline-variant text-outline'
                    }`}>
                      {isDone    ? <CheckCircle size={14} /> :
                       isCurrent ? <RefreshCw size={14} className="animate-spin" /> :
                                   <Clock size={14} />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium font-body ${
                        isDone ? 'line-through opacity-60 text-on-surface' :
                        isCurrent ? 'font-bold text-primary' :
                                    'text-on-surface'
                      }`}>
                        {stage.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{stage.subLabel}</p>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* Current message */}
      <div className="mt-8 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm text-on-surface-variant font-body"
          >
            {events[events.length - 1]?.message || 'Analysing your needs…'}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Skeleton cards preview */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <MapComponent
          items={[0, 1, 2] as number[]}
          keyExtractor={(i) => i}
          renderItem={(_, i) => (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="h-32 rounded-xl shimmer"
            />
          )}
        />
      </div>
    </motion.div>
  );
}
