import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import type { CandlestickPattern, ChartPattern } from '@/services/patternRecognition';

interface PatternAnnotationsProps {
  candlestickPatterns: CandlestickPattern[];
  chartPatterns: ChartPattern[];
  data: any[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  xScale?: any;
  yScale?: any;
  showLabels?: boolean;
}

const PatternAnnotations: React.FC<PatternAnnotationsProps> = ({
  candlestickPatterns,
  chartPatterns,
  data,
  width,
  height,
  margin,
  xScale,
  yScale,
  showLabels = true
}) => {
  const getPatternIcon = (signal: string, strength: number) => {
    const iconSize = strength >= 8 ? 20 : strength >= 6 ? 16 : 12;
    const props = { 
      width: iconSize, 
      height: iconSize, 
      className: strength >= 7 ? 'animate-pulse' : '' 
    };

    switch (signal) {
      case 'bullish':
        return <TrendingUp {...props} className={`${props.className} text-bullish`} />;
      case 'bearish':
        return <TrendingDown {...props} className={`${props.className} text-bearish`} />;
      default:
        return <AlertTriangle {...props} className={`${props.className} text-warning`} />;
    }
  };

  const getPatternColor = (signal: string, strength: number) => {
    const opacity = Math.min(0.8, strength / 10);
    switch (signal) {
      case 'bullish':
        return `rgba(34, 197, 94, ${opacity})`; // green
      case 'bearish':
        return `rgba(239, 68, 68, ${opacity})`; // red
      default:
        return `rgba(245, 158, 11, ${opacity})`; // yellow
    }
  };

  const renderCandlestickPatterns = () => {
    if (!xScale || !yScale || !data.length) return null;

    return candlestickPatterns.map((pattern, index) => {
      const dataPoint = data[pattern.position];
      if (!dataPoint) return null;

      const x = xScale(pattern.position);
      const y = yScale(dataPoint.high);
      const patternColor = getPatternColor(pattern.signal, pattern.strength);

      return (
        <TooltipProvider key={`candlestick-${index}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <g>
                {/* Pattern highlight circle */}
                <circle
                  cx={x}
                  cy={y - 20}
                  r={pattern.strength + 5}
                  fill={patternColor}
                  stroke={pattern.signal === 'bullish' ? '#22c55e' : pattern.signal === 'bearish' ? '#ef4444' : '#f59e0b'}
                  strokeWidth={2}
                  className="animate-pulse"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
                
                {/* Pattern icon */}
                <foreignObject x={x - 10} y={y - 30} width={20} height={20}>
                  <div className="flex items-center justify-center w-full h-full">
                    {getPatternIcon(pattern.signal, pattern.strength)}
                  </div>
                </foreignObject>

                {/* Pattern label */}
                {showLabels && (
                  <text
                    x={x}
                    y={y - 40}
                    textAnchor="middle"
                    className="fill-foreground text-xs font-semibold"
                    style={{ 
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                      textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                    }}
                  >
                    {pattern.name}
                  </text>
                )}
              </g>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    pattern.signal === 'bullish' ? 'default' : 
                    pattern.signal === 'bearish' ? 'destructive' : 'secondary'
                  }>
                    {pattern.name}
                  </Badge>
                  <Badge variant="outline">
                    Strength: {pattern.strength}/10
                  </Badge>
                </div>
                <p className="text-sm">{pattern.description}</p>
                <div className="text-xs text-muted-foreground">
                  Type: {pattern.type} | Signal: {pattern.signal}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    });
  };

  const renderChartPatterns = () => {
    if (!xScale || !yScale || !data.length) return null;

    return chartPatterns.map((pattern, index) => {
      const startX = xScale(pattern.startIndex);
      const endX = xScale(pattern.endIndex);
      const patternColor = getPatternColor(pattern.signal, pattern.strength);

      return (
        <TooltipProvider key={`chart-${index}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <g>
                {/* Pattern area highlight */}
                <rect
                  x={startX}
                  y={margin.top}
                  width={endX - startX}
                  height={height - margin.top - margin.bottom}
                  fill={patternColor}
                  opacity={0.1}
                  stroke={patternColor}
                  strokeWidth={1}
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />

                {/* Support/Resistance levels */}
                {pattern.levels && pattern.levels.map((level, levelIndex) => (
                  <line
                    key={levelIndex}
                    x1={startX}
                    y1={yScale(level)}
                    x2={endX}
                    y2={yScale(level)}
                    stroke={pattern.signal === 'bullish' ? '#22c55e' : '#ef4444'}
                    strokeWidth={2}
                    strokeDasharray="3,3"
                    opacity={0.8}
                  />
                ))}

                {/* Pattern label */}
                {showLabels && (
                  <foreignObject 
                    x={startX + (endX - startX) / 2 - 40} 
                    y={margin.top + 10} 
                    width={80} 
                    height={30}
                  >
                    <div className="flex items-center justify-center">
                      <Badge 
                        variant={
                          pattern.signal === 'bullish' ? 'default' : 
                          pattern.signal === 'bearish' ? 'destructive' : 'secondary'
                        }
                        className="text-xs whitespace-nowrap"
                      >
                        {pattern.name}
                      </Badge>
                    </div>
                  </foreignObject>
                )}

                {/* Pattern strength indicator */}
                <foreignObject 
                  x={endX - 25} 
                  y={margin.top + 50} 
                  width={20} 
                  height={20}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                </foreignObject>
              </g>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    pattern.signal === 'bullish' ? 'default' : 
                    pattern.signal === 'bearish' ? 'destructive' : 'secondary'
                  }>
                    {pattern.name}
                  </Badge>
                  <Badge variant="outline">
                    Strength: {pattern.strength}/10
                  </Badge>
                </div>
                <p className="text-sm">{pattern.description}</p>
                <div className="text-xs text-muted-foreground">
                  Type: {pattern.type} | Signal: {pattern.signal}
                </div>
                {pattern.levels && (
                  <div className="text-xs">
                    <strong>Key Levels:</strong>
                    <ul className="list-disc list-inside">
                      {pattern.levels.map((level, i) => (
                        <li key={i}>{level.toFixed(5)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    });
  };

  return (
    <g className="pattern-annotations">
      {renderChartPatterns()}
      {renderCandlestickPatterns()}
    </g>
  );
};

export default PatternAnnotations;