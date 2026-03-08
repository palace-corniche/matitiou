import React, { useMemo } from 'react';

const SYMBOLS = ['$', '💰', '💵', '$', '💎', '$', '🤑', '$', '💲', '$'];

interface FloatingItem {
  symbol: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

export const MoneyBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const items: FloatingItem[] = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      symbol: SYMBOLS[i % SYMBOLS.length],
      left: (i * 5.8 + Math.sin(i * 2.1) * 3) % 100,
      delay: (i * 1.7) % 12,
      duration: 10 + (i % 5) * 4,
      size: 14 + (i % 4) * 6,
      opacity: 0.08 + (i % 3) * 0.04,
    }));
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Floating money layer */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {items.map((item, i) => (
          <span
            key={i}
            className="absolute animate-float-money select-none"
            style={{
              left: `${item.left}%`,
              fontSize: `${item.size}px`,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
              opacity: item.opacity,
            }}
          >
            {item.symbol}
          </span>
        ))}
      </div>
      {/* Main content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
