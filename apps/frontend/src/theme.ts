// src/theme.ts — inline style values that can't be expressed as Tailwind classes
// All color tokens are in tailwind.config.js; this file covers rgba/gradient values only.

export const theme = {
  bg: {
    nav:              '#fdfbf9',
    sideNav:          '#fcf8f2',
    accentText:       '#ee8732',
    compareBar:       'rgba(255, 248, 243, 0.96)',
    modal:            'rgba(255, 248, 243, 0.98)',
    heroOverlay:      'linear-gradient(to bottom, rgba(255,248,243,0.80), rgba(255,248,243,0.95))',
    clarifyOverlay:   'linear-gradient(to bottom, rgba(255,248,243,0.90), rgba(243,214,170,0.90))',
    resultsGradient:  'linear-gradient(135deg, #fff8f3, #fff2e2)',
    loadingBlob:      'linear-gradient(135deg, #fcdeb2, #fff8f3, #ffe4be)',
    loadingOrb1:      'radial-gradient(circle, #ffb784, transparent)',
    loadingOrb2:      'radial-gradient(circle, #fadebe, transparent)',
    becauseYouSaid:   'rgba(145, 72, 0, 0.06)',
    inputGlow:        'linear-gradient(135deg, rgba(180,92,0,0.2), rgba(189,87,0,0.2))',
    modalShadow:      '0_-4px_6px_-1px_rgba(0,0,0,0.05)',
  },
  blur: {
    modal: 'blur(20px)',
  },
  border: {
    accentUnderline: '#ee8732',
    compareBarShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)',
  },
} as const;
