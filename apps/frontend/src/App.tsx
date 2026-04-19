// src/App.tsx
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HeroInput } from './components/HeroInput';
import { ClarifyChips } from './components/ClarifyChips';
import { LoadingStream } from './components/LoadingStream';
import { RecoCard } from './components/RecoCard';
import { CompareBar } from './components/CompareBar';
import { Toast } from './components/Toast';
import { MapComponent } from './components/MapComponent';
import { postIntake, postClarify, postShortlist, createSSEConnection } from './api';
import { AppStep, ShortlistResult, StreamEvent } from './types';
import { theme } from './theme';

const MAX_CLARIFY_QUESTIONS = 5;

export default function App() {
  const [step, setStep] = useState<AppStep>('input');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [clarifyQuestion, setClarifyQuestion] = useState<string>('');
  const [clarifyOptions, setClarifyOptions] = useState<string[]>([]);
  const [clarifyQuestionNumber, setClarifyQuestionNumber] = useState<number>(1);
  const [shortlist, setShortlist] = useState<ShortlistResult | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const sseRef = useRef<EventSource | null>(null);

  // Single effect: SSE cleanup + SPA back-button popstate listener
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const prev: AppStep = (e.state as { step?: AppStep })?.step || 'input';
      setStep(prev);
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      sseRef.current?.close();
    };
  }, []);

  const goToStep = (next: AppStep) => {
    window.history.pushState({ step: next }, '');
    setStep(next);
  };

  const addStreamEvent = (event: StreamEvent) => {
    setStreamEvents(prev => [...prev, event]);
    setCurrentStage(event.stage);
  };

  // ── Step 1: User submits paragraph ───────────────────────────────────────
  const handleIntakeSubmit = async (text: string) => {
    setStreamEvents([]);
    setCurrentStage('');

    try {
      const { requestId: rid } = await postIntake(text, setIsLoading);
      setRequestId(rid);

      const es = createSSEConnection(rid, addStreamEvent);
      sseRef.current = es;

      const { question, options } = await postClarify(rid, setIsLoading);
      setClarifyQuestion(question);
      setClarifyOptions(options);
      setClarifyQuestionNumber(1);
      goToStep('clarify');
    } catch {
      // api.ts already showed the toast; nothing else to do
    }
  };

  // ── Step 2: User selects clarifier chip ──────────────────────────────────
  const handleClarifySelect = async (answer: string) => {
    if (!requestId) return;

    try {
      const result = await postShortlist(requestId, answer, setIsLoading);

      if (result.needsMoreClarification && result.nextQuestion) {
        setClarifyQuestion(result.nextQuestion.question);
        setClarifyOptions(result.nextQuestion.options);
        setClarifyQuestionNumber(result.nextQuestion.questionNumber);
        return;
      }

      setShortlist(result.shortlist);
      goToStep('loading');
      setTimeout(() => goToStep('results'), 600);
    } catch {
      // api.ts already showed the toast
      goToStep('input');
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    sseRef.current?.close();
    sseRef.current = null;
    window.history.pushState({ step: 'input' }, '');
    setStep('input');
    setRequestId(null);
    setClarifyQuestion('');
    setClarifyOptions([]);
    setClarifyQuestionNumber(1);
    setShortlist(null);
    setStreamEvents([]);
    setCurrentStage('');
  };

  const resultCards = shortlist
    ? [shortlist.topPick, shortlist.alternative, shortlist.surprise]
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Toast />

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-white/5"
        style={{ background: theme.bg.nav }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: theme.gradient.logoBg }}
            >
              <span className="text-sm">✦</span>
            </div>
            <span className="font-bold text-white text-base tracking-tight">Shortlist</span>
            <span className="hidden sm:inline text-xs text-zinc-600 font-medium">for Indian car buyers</span>
          </motion.div>

          {step !== 'input' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleReset}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Start over
            </motion.button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 pb-32 px-4 sm:px-6">
        <div className="w-full max-w-5xl">
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div key="input" exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.4 }}>
                <HeroInput onSubmit={handleIntakeSubmit} isLoading={isLoading} />
              </motion.div>
            )}

            {step === 'clarify' && (
              <motion.div key="clarify" className="flex flex-col items-center">
                <ProgressStepper current={1} questionNumber={clarifyQuestionNumber} />
                <div className="w-full max-w-2xl">
                  <ClarifyChips
                    question={clarifyQuestion}
                    options={clarifyOptions}
                    questionNumber={clarifyQuestionNumber}
                    maxQuestions={MAX_CLARIFY_QUESTIONS}
                    onSelect={handleClarifySelect}
                    isLoading={isLoading}
                  />
                </div>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div key="loading" className="flex flex-col items-center">
                <ProgressStepper current={2} questionNumber={clarifyQuestionNumber} />
                <div className="w-full max-w-lg">
                  <LoadingStream events={streamEvents} currentStage={currentStage} />
                </div>
              </motion.div>
            )}

            {step === 'results' && shortlist && (
              <motion.div key="results" exit={{ opacity: 0 }}>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-10"
                >
                  <ProgressStepper current={3} questionNumber={clarifyQuestionNumber} />
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-6 mb-2">Your Shortlist</h2>
                  {shortlist.latentPersona && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold uppercase tracking-widest mb-2"
                    >
                      {shortlist.latentPersona}
                    </motion.div>
                  )}
                  <p className="text-zinc-500 text-sm">3 picks, curated exactly for your situation</p>
                </motion.div>

                <MapComponent
                  items={resultCards}
                  keyExtractor={(rc) => rc.car.id}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  renderItem={(rc, i) => <RecoCard rankedCar={rc} index={i} />}
                />

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center text-xs text-zinc-700 mt-8"
                >
                  Prices are indicative ex-showroom ranges. Verify OTR pricing, availability, and specs with your local dealer before purchase.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {step === 'results' && shortlist && (
        <CompareBar
          shortlist={shortlist}
          requestId={requestId!}
          onReset={handleReset}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}
    </div>
  );
}

// ── Internal: step breadcrumb ──────────────────────────────────────────────
function ProgressStepper({ current, questionNumber }: { current: number; questionNumber: number }) {
  const clarifyLabel = questionNumber > 1 ? `Clarifying (${questionNumber})` : 'Clarifying';
  const steps = ['Your story', clarifyLabel, 'Your shortlist'];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mb-8 flex-wrap justify-center">
      <MapComponent
        items={steps}
        keyExtractor={(_, i) => i}
        renderItem={(label, i) => {
          const isDone = i < current;
          const isCurrent = i === current;
          return (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                  isDone ? 'bg-indigo-500 text-white' : isCurrent ? 'bg-indigo-500/30 border border-indigo-500 text-indigo-300' : 'bg-white/5 border border-white/10 text-zinc-600'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium transition-colors ${isCurrent ? 'text-white' : isDone ? 'text-indigo-400' : 'text-zinc-600'}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 sm:w-8 h-px transition-colors ${isDone ? 'bg-indigo-500/50' : 'bg-white/8'}`} />
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
