// src/components/LoadingStream.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { StreamEvent } from '../types';
import { MapComponent } from './MapComponent';

interface Props {
  events: StreamEvent[];
  currentStage: string;
}

const STAGES = [
  { key: 'analyzing',  label: 'Decoding your story',       icon: '📖' },
  { key: 'persona',    label: 'Mapping your persona',       icon: '👤' },
  { key: 'parsed',     label: 'Setting the constraints',    icon: '🧠' },
  { key: 'clarifying', label: 'Analysing your answer',      icon: '💭' },
  { key: 'retrieving', label: 'Searching 40+ models',       icon: '🔍' },
  { key: 'ranking',    label: 'Ranking recommendations',    icon: '🏆' },
  { key: 'done',       label: 'Ready!',                     icon: '✅' },
];

const VISIBLE_STAGES = STAGES.slice(0, -1);
const SKELETON_INDICES = [0, 1, 2];

export function LoadingStream({ events, currentStage }: Props) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Central animation */}
      <div className="relative flex items-center justify-center mb-12">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-36 h-36 rounded-full border border-indigo-500/20"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute w-28 h-28 rounded-full border border-indigo-500/30"
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute w-20 h-20 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#6366f1', borderRightColor: '#8b5cf6' }}
        />
        <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStage}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl"
            >
              {STAGES[currentIdx]?.icon || '🔍'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Current message */}
      <div className="text-center mb-10">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-xl font-semibold text-white mb-2"
          >
            {events[events.length - 1]?.message || 'Analysing your needs…'}
          </motion.p>
        </AnimatePresence>
        <p className="text-zinc-500 text-sm">This usually takes just a few seconds</p>
      </div>

      {/* Progress steps */}
      <MapComponent
        items={VISIBLE_STAGES}
        keyExtractor={(s) => s.key}
        className="space-y-2"
        renderItem={(stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${isCurrent ? 'glass-card' : ''}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs border transition-all duration-500 ${
                isDone    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                isCurrent ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' :
                            'bg-white/5 border-white/10 text-zinc-600'
              }`}>
                {isDone ? '✓' : isCurrent
                  ? <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse block" />
                  : <span className="w-2 h-2 rounded-full bg-zinc-700 block" />}
              </div>
              <span className={`text-sm font-medium transition-colors duration-500 ${
                isDone ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-zinc-600'
              }`}>
                {stage.label}
              </span>
              {isCurrent && (
                <motion.span className="ml-auto text-xs text-indigo-400/70">
                  <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    in progress…
                  </motion.span>
                </motion.span>
              )}
            </motion.div>
          );
        }}
      />

      {/* Skeleton cards */}
      <MapComponent
        items={SKELETON_INDICES}
        keyExtractor={(i) => i}
        className="mt-10 grid grid-cols-3 gap-3"
        renderItem={(_, i) => (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="h-32 rounded-xl shimmer"
          />
        )}
      />
    </motion.div>
  );
}
