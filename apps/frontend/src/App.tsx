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
import { Bell, Settings, Star, ArrowLeftRight, Car, History } from 'lucide-react';
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
      // api.ts already showed the toast
    }
  };

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
      goToStep('input');
    }
  };

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

  const showSideNav = step === 'results';

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body antialiased">
      <Toast />

      {/* Top Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 h-16 border-b border-stone-200 shadow-sm"
        style={{ background: theme.bg.nav }}
      >
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold tracking-tight text-stone-900">Shortlist</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors p-2 rounded-full flex items-center justify-center">
            <Bell size={20} />
          </button>
          <button className="text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors p-2 rounded-full flex items-center justify-center">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant overflow-hidden flex items-center justify-center">
            <span className="text-sm font-bold text-primary">S</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Side Nav — only on results */}
        {showSideNav && (
          <nav
            className="hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-stone-200 p-4 gap-2 z-40"
            style={{ background: theme.bg.sideNav }}
          >
            <div className="mb-8 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container font-bold text-xl">
                  A
                </div>
                <div>
                  <div className="text-lg font-semibold" style={{ color: theme.bg.accentText }}>Atelier</div>
                  <div className="text-xs text-stone-500">Curated Selection</div>
                </div>
              </div>
            </div>
            <a className="bg-white text-primary shadow-sm rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer select-none" href="#">
              <Star size={18} />
              Recommendations
            </a>
            <button
              onClick={handleReset}
              className="text-stone-600 hover:bg-stone-100 hover:translate-x-1 transition-all duration-200 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer select-none text-sm font-medium"
            >
              <ArrowLeftRight size={18} />
              New Search
            </button>
            <a className="text-stone-600 hover:bg-stone-100 hover:translate-x-1 transition-all duration-200 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer select-none" href="#">
              <Car size={18} />
              Garage
            </a>
            <a className="text-stone-600 hover:bg-stone-100 hover:translate-x-1 transition-all duration-200 rounded-lg flex items-center gap-3 px-4 py-3 cursor-pointer select-none" href="#">
              <History size={18} />
              History
            </a>
          </nav>
        )}

        {/* Main */}
        <main className={`flex-1 relative min-h-[calc(100vh-4rem)] ${showSideNav ? 'md:ml-64' : ''}`}>
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)] relative"
              >
                {/* Hero background image overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <div
                    className="absolute inset-0 z-10 backdrop-blur-[2px]"
                    style={{ background: theme.bg.heroOverlay }}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1600&q=80"
                    alt=""
                    className="w-full h-full object-cover opacity-60"
                    aria-hidden="true"
                  />
                </div>
                <div className="relative z-20 w-full px-4">
                  <HeroInput onSubmit={handleIntakeSubmit} isLoading={isLoading} />
                </div>
              </motion.div>
            )}

            {step === 'clarify' && (
              <motion.div
                key="clarify"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center min-h-[calc(100vh-4rem)] relative"
              >
                {/* Background overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                  <div
                    className="absolute inset-0 z-10"
                    style={{ background: theme.bg.clarifyOverlay }}
                  />
                  <img
                    src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
                    alt=""
                    className="w-full h-full object-cover object-center opacity-30 mix-blend-multiply"
                    aria-hidden="true"
                  />
                </div>
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-4xl mx-auto w-full">
                  <StepProgressBars current={0} />
                  <ClarifyChips
                    question={clarifyQuestion}
                    options={clarifyOptions}
                    questionNumber={clarifyQuestionNumber}
                    maxQuestions={MAX_CLARIFY_QUESTIONS}
                    onSelect={handleClarifySelect}
                    onBack={handleReset}
                    isLoading={isLoading}
                  />
                </div>
              </motion.div>
            )}

            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 relative overflow-hidden"
              >
                {/* Gradient blobs */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                  <div className="absolute inset-0" style={{ background: theme.bg.loadingBlob }} />
                  <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full opacity-30 blur-3xl" style={{ background: theme.bg.loadingOrb1 }} />
                  <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-3xl" style={{ background: theme.bg.loadingOrb2 }} />
                </div>
                <div className="relative z-10 w-full max-w-2xl">
                  <LoadingStream events={streamEvents} currentStage={currentStage} />
                </div>
              </motion.div>
            )}

            {step === 'results' && shortlist && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex-1 overflow-y-auto pb-32"
                style={{ background: theme.bg.resultsGradient }}
              >
                <div className="max-w-6xl mx-auto px-6 py-12">
                  <header className="mb-12">
                    <h1 className="text-4xl md:text-5xl font-headline font-bold text-on-surface mb-4">
                      Your Curated Collection
                    </h1>
                    {shortlist.latentPersona && (
                      <div className="inline-block px-4 py-1.5 rounded-full bg-surface-container border border-surface-variant text-on-surface-variant text-sm font-label mb-4">
                        {shortlist.latentPersona}
                      </div>
                    )}
                    <p className="text-lg text-on-surface-variant max-w-2xl font-body">
                      Based on your preferences, we've handpicked these three exceptional vehicles for your consideration.
                    </p>
                  </header>

                  <MapComponent
                    items={resultCards}
                    keyExtractor={(rc) => rc.car.id}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    renderItem={(rc, i) => <RecoCard rankedCar={rc} index={i} />}
                  />

                  <p className="text-center text-xs text-on-surface-variant mt-10">
                    Prices are indicative ex-showroom ranges. Verify OTR pricing, availability, and specs with your local dealer before purchase.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-stone-50 border-t border-stone-200 flex justify-between items-center px-8 py-4 w-full relative z-50 text-xs">
        <div className="font-bold text-stone-400">© 2024 Shortlist Automotive</div>
        <div className="flex gap-6">
          <a className="text-stone-500 hover:underline transition-opacity hover:opacity-80" style={{ textDecorationColor: theme.bg.accentText }} href="#">Privacy</a>
          <a className="text-stone-500 hover:underline transition-opacity hover:opacity-80" style={{ textDecorationColor: theme.bg.accentText }} href="#">Terms</a>
          <a className="text-stone-500 hover:underline transition-opacity hover:opacity-80" style={{ textDecorationColor: theme.bg.accentText }} href="#">Support</a>
        </div>
      </footer>

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

// Step 2/3 progress bars (3 segments)
function StepProgressBars({ current }: { current: number }) {
  const bars = [0, 1, 2];
  return (
    <div className="mb-8 flex items-center gap-2">
      <MapComponent
        items={bars}
        keyExtractor={(i) => i}
        renderItem={(_, i) => (
          <div className={`h-2 w-12 rounded-full transition-colors duration-300 ${i <= current ? 'bg-primary' : 'bg-surface-variant'}`} />
        )}
      />
      <span className="ml-4 text-sm font-medium text-on-surface-variant font-label uppercase tracking-wider">
        Step {current + 2} of 4
      </span>
    </div>
  );
}
