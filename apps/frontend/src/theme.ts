// src/theme.ts — single source of truth for all inline style values
// Tailwind utility classes live in index.css; this file covers values
// that cannot be expressed as Tailwind classes (rgba, specific gradients, etc.)

export const theme = {
  bg: {
    nav:        'rgba(10,10,20,0.7)',
    compareBar: 'rgba(10,10,20,0.9)',
    modal:      'rgba(15,15,30,0.97)',
    card:       'rgba(255,255,255,0.035)',
    chipSelected:       'rgba(99,102,241,0.15)',
    chipSelectedBorder: '1px solid rgba(99,102,241,0.5)',
    becauseYouSaid:     'rgba(99,102,241,0.06)',
    rankCardOverlay:    'rgba(255,255,255,0.035)',
    textInput:          'rgba(255,255,255,0.04)',
    textInputFocus:     'rgba(99,102,241,0.08)',
  },
  gradient: {
    logoBg:        'linear-gradient(135deg, #7c3aed, #4f46e5)',
    primaryBtn:    'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
    primaryBtnHover: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
    inputGlowBlur: 'linear-gradient(135deg, rgba(99,102,241,0.6) 0%, rgba(139,92,246,0.4) 100%)',
  },
  color: {
    price:    '#a78bfa',
    indigo:   '#6366f1',
  },
  blur: {
    modal: 'blur(24px)',
  },
} as const;
