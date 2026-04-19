// src/components/Toast.tsx — shared toast renderer; subscribe to toast bus
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToasts, ToastItem } from '../toast';
import { MapComponent } from './MapComponent';

const TYPE_STYLES: Record<ToastItem['type'], string> = {
  success: 'border-green-600/30 bg-green-50 text-green-800',
  error:   'border-error/30 bg-error-container text-on-error-container',
  info:    'border-primary/30 bg-surface-container text-on-surface',
};

const TYPE_ICON: Record<ToastItem['type'], string> = {
  success: '✓',
  error:   '⚠️',
  info:    'ℹ',
};

export function Toast() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        <MapComponent
          items={items}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <motion.div
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border text-sm max-w-sm shadow-xl ${TYPE_STYLES[item.type]}`}
            >
              <span className="flex-shrink-0 font-bold">{TYPE_ICON[item.type]}</span>
              <span className="flex-1 leading-snug">{item.message}</span>
            </motion.div>
          )}
        />
      </AnimatePresence>
    </div>
  );
}
