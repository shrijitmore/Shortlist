// src/components/RecoCard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RankedCar } from '../types';
import { ExternalLink, Settings2, Users, Star, AlertTriangle } from 'lucide-react';
import { MapComponent } from './MapComponent';
import { theme } from '../theme';

interface Props {
  rankedCar: RankedCar;
  index: number;
}

const RANK_CONFIG = {
  topPick: {
    label: '🏆 Top Pick',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  alternative: {
    label: '🔄 Alternative',
    gradient: 'from-sky-500/15 via-blue-500/8 to-transparent',
    border: 'border-sky-500/25',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  surprise: {
    label: '⚡ Surprise Pick',
    gradient: 'from-violet-500/15 via-purple-500/8 to-transparent',
    border: 'border-violet-500/25',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
};

const FUEL_ICONS: Record<string, string> = {
  petrol: '⛽', diesel: '🛢️', electric: '⚡', hybrid: '🔋', cng: '🌿',
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'Manual', automatic: 'Automatic', amt: 'AMT', cvt: 'CVT',
};

export function RecoCard({ rankedCar, index }: Props) {
  const { car, rankType, insight1, insight2, tradeoff, becauseYouSaid } = rankedCar;
  const config = RANK_CONFIG[rankType];
  const [imageError, setImageError] = useState(false);

  const priceRange = `₹${car.price_min_lakh.toFixed(2)}L – ₹${car.price_max_lakh.toFixed(2)}L`;

  const insights = [insight1, insight2];
  const specBadges = [
    { icon: <span>{FUEL_ICONS[car.fuel_type] || '⛽'}</span>, label: car.fuel_type.charAt(0).toUpperCase() + car.fuel_type.slice(1) },
    { icon: <Settings2 size={11} />, label: TRANSMISSION_LABELS[car.transmission] || car.transmission },
    { icon: <Users size={11} />,     label: `${car.seating} seats` },
    { icon: <Star size={11} className="text-amber-400" />, label: `${car.safety_rating} NCAP` },
  ];

  return (
    <motion.article
      id={`card-${rankType}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.18, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border ${config.border} overflow-hidden group h-full flex flex-col`}
      style={{ background: theme.bg.rankCardOverlay }}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${config.gradient} pointer-events-none`} />

      <div className="relative p-5 pb-0 flex items-center justify-between">
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${config.badge}`}>
          {config.label}
        </span>
        <span className="text-xs text-zinc-600">{car.source_tag}</span>
      </div>

      <div className="relative px-5 pt-4">
        <div className="relative rounded-xl overflow-hidden bg-white/5" style={{ aspectRatio: '16/9' }}>
          {!imageError ? (
            <img
              src={car.image_url}
              alt={`${car.brand} ${car.model}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">🚗</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </div>

      <div className="relative p-5 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="text-xl font-bold text-white leading-tight">{car.brand} {car.model}</h3>
          <p className="text-zinc-500 text-xs mt-0.5 truncate">{car.variant}</p>
          <p className="text-lg font-semibold mt-2" style={{ color: theme.color.price }}>{priceRange}</p>
        </div>

        <MapComponent
          items={specBadges}
          keyExtractor={(_, i) => i}
          className="flex flex-wrap gap-2"
          renderItem={(badge) => (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-zinc-400">
              {badge.icon}
              {badge.label}
            </span>
          )}
        />

        <MapComponent
          items={insights}
          keyExtractor={(_, i) => i}
          className="space-y-2"
          renderItem={(insight) => (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">{insight}</p>
            </div>
          )}
        />

        <div
          className="rounded-xl px-4 py-3 border border-indigo-500/15"
          style={{ background: theme.bg.becauseYouSaid }}
        >
          <p className="text-xs text-indigo-300/70 font-medium mb-1">Because you said…</p>
          <p className="text-sm text-indigo-200 leading-relaxed">{becauseYouSaid}</p>
        </div>

        <div className="flex items-start gap-2 mt-auto">
          <AlertTriangle size={13} className="text-amber-500/70 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-zinc-500 italic leading-relaxed">{tradeoff}</p>
        </div>

        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-zinc-700">Always verify specs with dealer</p>
          <a
            href={`https://www.cardekho.com/cars/${car.brand.toLowerCase().replace(/\s+/g, '-')}/${car.model.toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            CarDekho
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
