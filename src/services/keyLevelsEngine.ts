import { CandleData } from './unifiedMarketData';

export interface KeyLevel {
  id: string;
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 1-10 scale
  touches: number;
  formed_at: string;
  timeframe: string;
  age_hours: number;
  distance_from_current: number;
  confidence: number;
  volume_confirmation: boolean;
}

export interface ComputedLevels {
  support: KeyLevel[];
  resistance: KeyLevel[];
  pivot_point: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export class KeyLevelsEngine {
  private static readonly LOOKBACK_PERIODS = {
    '1m': 200,
    '5m': 288,  // 24 hours
    '15m': 96,  // 24 hours
    '1h': 168,  // 7 days
    '4h': 180,  // 30 days
    '1d': 252   // 1 year
  };

  private static readonly CLUSTER_DISTANCE = {
    '1m': 0.00005,
    '5m': 0.0001,
    '15m': 0.0002,
    '1h': 0.0005,
    '4h': 0.001,
    '1d': 0.002
  };

  static computeKeyLevels(candles: CandleData[], timeframe: string = '15m'): ComputedLevels {
    if (!candles || candles.length < 20) {
      return this.getEmptyLevels();
    }

    const lookback = this.LOOKBACK_PERIODS[timeframe as keyof typeof this.LOOKBACK_PERIODS] || 96;
    const recentCandles = candles.slice(-lookback);
    const currentPrice = recentCandles[recentCandles.length - 1]?.close || 0;

    // Calculate pivot points (today's levels)
    const pivotLevels = this.calculatePivotPoints(recentCandles);
    
    // Find swing highs and lows
    const swingPoints = this.findSwingPoints(recentCandles, 5);
    
    // Cluster similar levels
    const clusteredLevels = this.clusterLevels(swingPoints, timeframe);
    
    // Calculate level strength and touches
    const enrichedLevels = this.enrichLevels(clusteredLevels, recentCandles, currentPrice, timeframe);
    
    // Separate support and resistance
    const support = enrichedLevels.filter(level => level.type === 'support')
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
      
    const resistance = enrichedLevels.filter(level => level.type === 'resistance')
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);

    return {
      support,
      resistance,
      ...pivotLevels
    };
  }

  private static getEmptyLevels(): ComputedLevels {
    return {
      support: [],
      resistance: [],
      pivot_point: 0,
      r1: 0, r2: 0, r3: 0,
      s1: 0, s2: 0, s3: 0
    };
  }

  private static calculatePivotPoints(candles: CandleData[]) {
    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) return { pivot_point: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };

    const high = lastCandle.high;
    const low = lastCandle.low;
    const close = lastCandle.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + 2 * (pivot - low);
    const s3 = low - 2 * (high - pivot);

    return {
      pivot_point: pivot,
      r1, r2, r3,
      s1, s2, s3
    };
  }

  private static findSwingPoints(candles: CandleData[], period: number = 5) {
    const swingPoints: Array<{price: number, type: 'support' | 'resistance', index: number, volume: number}> = [];
    
    for (let i = period; i < candles.length - period; i++) {
      const current = candles[i];
      const isSwingHigh = this.isSwingHigh(candles, i, period);
      const isSwingLow = this.isSwingLow(candles, i, period);
      
      if (isSwingHigh) {
        swingPoints.push({
          price: current.high,
          type: 'resistance',
          index: i,
          volume: current.volume || 0
        });
      }
      
      if (isSwingLow) {
        swingPoints.push({
          price: current.low,
          type: 'support',
          index: i,
          volume: current.volume || 0
        });
      }
    }
    
    return swingPoints;
  }

  private static isSwingHigh(candles: CandleData[], index: number, period: number): boolean {
    const current = candles[index];
    for (let i = index - period; i <= index + period; i++) {
      if (i !== index && candles[i] && candles[i].high >= current.high) {
        return false;
      }
    }
    return true;
  }

  private static isSwingLow(candles: CandleData[], index: number, period: number): boolean {
    const current = candles[index];
    for (let i = index - period; i <= index + period; i++) {
      if (i !== index && candles[i] && candles[i].low <= current.low) {
        return false;
      }
    }
    return true;
  }

  private static clusterLevels(swingPoints: Array<{price: number, type: 'support' | 'resistance', index: number, volume: number}>, timeframe: string) {
    const clusterDistance = this.CLUSTER_DISTANCE[timeframe as keyof typeof this.CLUSTER_DISTANCE] || 0.0002;
    const clusters: Array<{
      price: number,
      type: 'support' | 'resistance',
      points: Array<{price: number, type: 'support' | 'resistance', index: number, volume: number}>,
      totalVolume: number
    }> = [];

    for (const point of swingPoints) {
      let addedToCluster = false;
      
      for (const cluster of clusters) {
        if (cluster.type === point.type && Math.abs(cluster.price - point.price) <= clusterDistance) {
          cluster.points.push(point);
          cluster.totalVolume += point.volume;
          cluster.price = cluster.points.reduce((sum, p) => sum + p.price, 0) / cluster.points.length;
          addedToCluster = true;
          break;
        }
      }
      
      if (!addedToCluster) {
        clusters.push({
          price: point.price,
          type: point.type,
          points: [point],
          totalVolume: point.volume
        });
      }
    }

    return clusters;
  }

  private static enrichLevels(
    clusters: Array<{price: number, type: 'support' | 'resistance', points: any[], totalVolume: number}>,
    candles: CandleData[],
    currentPrice: number,
    timeframe: string
  ): KeyLevel[] {
    return clusters.map((cluster, index) => {
      const touches = cluster.points.length;
      const strength = Math.min(10, Math.max(1, touches * 2 + (cluster.totalVolume > 1000 ? 2 : 0)));
      const oldestPoint = cluster.points.reduce((oldest, point) => point.index < oldest.index ? point : oldest);
      const ageHours = this.calculateAgeHours(candles.length - oldestPoint.index, timeframe);
      const distanceFromCurrent = Math.abs(cluster.price - currentPrice);
      const confidence = Math.min(1, touches * 0.15 + (cluster.totalVolume > 1000 ? 0.2 : 0));

      return {
        id: `${cluster.type}_${index}_${Date.now()}`,
        price: cluster.price,
        type: cluster.type,
        strength,
        touches,
        formed_at: new Date(Date.now() - ageHours * 60 * 60 * 1000).toISOString(),
        timeframe,
        age_hours: ageHours,
        distance_from_current: distanceFromCurrent,
        confidence,
        volume_confirmation: cluster.totalVolume > 1000
      };
    });
  }

  private static calculateAgeHours(periodsAgo: number, timeframe: string): number {
    const timeframeMinutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };
    
    const minutes = timeframeMinutes[timeframe as keyof typeof timeframeMinutes] || 15;
    return (periodsAgo * minutes) / 60;
  }
}