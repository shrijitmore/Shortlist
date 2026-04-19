// src/components/MapComponent.tsx — shared list renderer using for-loops (no .map())
import React from 'react';

interface Props<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
}

export function MapComponent<T>({ items, renderItem, keyExtractor, className }: Props<T>) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < items.length; i++) {
    elements.push(
      <React.Fragment key={keyExtractor(items[i], i)}>
        {renderItem(items[i], i)}
      </React.Fragment>
    );
  }
  if (className) {
    return <div className={className}>{elements}</div>;
  }
  return <>{elements}</>;
}
