// src/components/RecoCard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RankedCar } from '../types';
import { CheckCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { theme } from '../theme';
import { MapComponent } from './MapComponent';

interface Props {
  rankedCar: RankedCar;
  index: number;
}

const RANK_CONFIG = {
  topPick: {
    label: 'Top Match',
    cardClass: '',
  },
  alternative: {
    label: 'Strong Alternative',
    cardClass: '',
  },
  surprise: {
    label: 'Surprise Pick',
    cardClass: '',
  },
};

const FUEL_LABELS: Record<string, string> = {
  petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric', hybrid: 'Hybrid', cng: 'CNG',
};

export function RecoCard({ rankedCar, index }: Props) {
  const { car, rankType, rationale, tradeoff, becauseYouSaid } = rankedCar;
  const config = RANK_CONFIG[rankType];
  const [imageError, setImageError] = useState(false);

  const priceRange = `₹${car.price_min_lakh.toFixed(1)}L – ₹${car.price_max_lakh.toFixed(1)}L`;

  const stats = [
    { label: 'Mileage', value: car.fuel_type === 'electric' ? 'Electric' : `${car.mileage_kmpl} kmpl` },
    { label: 'Seating',  value: `${car.seating} seats` },
    { label: 'Safety',   value: `${car.safety_rating}★ NCAP` },
  ];

  return (
    <motion.article
      id={`card-${rankType}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.18, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden flex flex-col group hover:shadow-md transition-shadow duration-300"
    >
      {/* Car image */}
      <div className="relative h-64 overflow-hidden">
        {!imageError ? (
          <img
            src={car.image_url}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <span className="text-6xl">🚗</span>
          </div>
        )}
        {/* Rank badge */}
        <div className="absolute top-4 right-4 bg-surface-container-lowest/90 backdrop-blur px-3 py-1 rounded-full text-xs font-label font-semibold text-primary">
          {config.label}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Title */}
        <div className="mb-4">
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">
            {car.brand} {car.model}
          </h2>
          <p className="text-sm text-on-surface-variant font-body">
            {car.variant} • {FUEL_LABELS[car.fuel_type] || car.fuel_type}
          </p>
          <p className="text-lg font-bold text-primary mt-1">{priceRange}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-outline-variant">
          <MapComponent
            items={stats}
            keyExtractor={(s) => s.label}
            renderItem={(stat, i) => (
              <div className={`text-center ${i > 0 ? 'border-l border-outline-variant' : ''}`}>
                <div className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider">{stat.label}</div>
                <div className="font-bold text-on-surface text-sm">{stat.value}</div>
              </div>
            )}
          />
        </div>

        {/* Why it fits */}
        <div className="mb-4 flex-1">
          <h3 className="text-sm font-label font-bold text-on-surface mb-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-primary" />
            Why it fits
          </h3>
          <p className="text-sm text-on-surface-variant font-body leading-relaxed">{rationale}</p>
        </div>

        {/* Because you said */}
        <div className="rounded-xl px-4 py-3 border border-primary/15 mb-4" style={{ background: theme.bg.becauseYouSaid }}>
          <p className="text-xs text-primary/70 font-medium mb-1">Because you said…</p>
          <p className="text-sm text-on-surface leading-relaxed">{becauseYouSaid}</p>
        </div>

        {/* Tradeoff */}
        <div className="flex items-start gap-2 mb-5">
          <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-on-surface-variant italic leading-relaxed">{tradeoff}</p>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant">Always verify specs with dealer</p>
          <a
            href={`https://www.cardekho.com/cars/${car.brand.toLowerCase().replace(/\s+/g, '-')}/${car.model.toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            CarDekho <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </motion.article>
  );
}
