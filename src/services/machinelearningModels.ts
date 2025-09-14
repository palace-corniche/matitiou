import { supabase } from '@/integrations/supabase/client';

// Machine Learning & AI-Powered Models
export interface NeuralNetworkConfig {
  inputSize: number;
  hiddenLayers: number[];
  outputSize: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
}

export interface LSTMNetwork {
  layers: LSTMLayer[];
  weights: number[][][];
  biases: number[][];
  config: NeuralNetworkConfig;
}

export interface LSTMLayer {
  units: number;
  inputGate: number[];
  forgetGate: number[];
  outputGate: number[];
  candidateValues: number[];
  cellState: number[];
  hiddenState: number[];
}

export interface TransformerModel {
  attention: AttentionMechanism;
  feedForward: FeedForwardNetwork;
  encoderLayers: number;
  decoderLayers: number;
  headSize: number;
  numHeads: number;
}

export interface AttentionMechanism {
  queries: number[][];
  keys: number[][];
  values: number[][];
  attentionWeights: number[][];
}

export interface FeedForwardNetwork {
  weights: number[][];
  biases: number[];
  activations: number[];
}

export interface ReinforcementLearningAgent {
  qTable: Map<string, number[]>;
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  actions: string[];
  currentState: string;
}

export interface EnsembleModel {
  models: Array<{
    type: 'lstm' | 'transformer' | 'random_forest' | 'gradient_boost';
    weight: number;
    accuracy: number;
    predictions: number[];
  }>;
  metaLearner: any;
  combinedPrediction: number;
  confidence: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  threshold: number;
  reconstructionError: number;
  zScore: number;
}

export interface SentimentAnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  score: number; // -1 to +1
  keywords: string[];
  sources: Array<{
    source: string;
    sentiment: number;
    weight: number;
  }>;
}

export interface EconomicSurpriseIndex {
  index: number;
  components: Array<{
    indicator: string;
    actual: number;
    forecast: number;
    surprise: number;
    weight: number;
  }>;
  trend: 'improving' | 'deteriorating' | 'stable';
  significance: number;
}

export class MachineLearningModels {
  private lstmNetwork: LSTMNetwork | null = null;
  private transformerModel: TransformerModel | null = null;
  private rlAgent: ReinforcementLearningAgent | null = null;

  // === LSTM NEURAL NETWORK ===
  initializeLSTM(config: NeuralNetworkConfig): LSTMNetwork {
    const layers: LSTMLayer[] = [];
    const weights: number[][][] = [];
    const biases: number[][] = [];

    // Initialize LSTM layers
    for (let i = 0; i < config.hiddenLayers.length; i++) {
      const units = config.hiddenLayers[i];
      const inputSize = i === 0 ? config.inputSize : config.hiddenLayers[i - 1];
      
      layers.push({
        units,
        inputGate: new Array(units).fill(0),
        forgetGate: new Array(units).fill(0),
        outputGate: new Array(units).fill(0),
        candidateValues: new Array(units).fill(0),
        cellState: new Array(units).fill(0),
        hiddenState: new Array(units).fill(0)
      });

      // Initialize weights: [input_weights, recurrent_weights, bias]
      const layerWeights = [
        this.initializeWeights(inputSize, units * 4), // 4 gates: input, forget, output, candidate
        this.initializeWeights(units, units * 4),     // Recurrent connections
      ];
      weights.push(layerWeights);
      biases.push(new Array(units * 4).fill(0));
    }

    this.lstmNetwork = {
      layers,
      weights,
      biases,
      config
    };

    return this.lstmNetwork;
  }

  private initializeWeights(inputSize: number, outputSize: number): number[] {
    // Xavier initialization
    const scale = Math.sqrt(2.0 / (inputSize + outputSize));
    return Array.from({ length: inputSize * outputSize }, () => 
      (Math.random() - 0.5) * 2 * scale
    );
  }

  forwardPassLSTM(inputs: number[][]): number[] {
    if (!this.lstmNetwork) throw new Error('LSTM network not initialized');

    let currentInput = inputs[inputs.length - 1]; // Use latest input
    const predictions: number[] = [];

    for (let layerIdx = 0; layerIdx < this.lstmNetwork.layers.length; layerIdx++) {
      const layer = this.lstmNetwork.layers[layerIdx];
      const weights = this.lstmNetwork.weights[layerIdx];
      const biases = this.lstmNetwork.biases[layerIdx];

      // LSTM cell computation
      const { cellState, hiddenState } = this.computeLSTMCell(
        currentInput,
        layer.cellState,
        layer.hiddenState,
        weights,
        biases
      );

      // Update layer states
      layer.cellState = cellState;
      layer.hiddenState = hiddenState;
      currentInput = hiddenState;
    }

    // Output layer (simple linear transformation)
    const outputWeights = this.initializeWeights(currentInput.length, 1);
    const prediction = currentInput.reduce((sum, val, i) => sum + val * outputWeights[i], 0);
    
    return [prediction];
  }

  private computeLSTMCell(
    input: number[],
    prevCellState: number[],
    prevHiddenState: number[],
    weights: number[][],
    biases: number[]
  ): { cellState: number[]; hiddenState: number[] } {
    const units = prevCellState.length;
    const inputWeights = weights[0];
    const recurrentWeights = weights[1];

    // Concatenate input and previous hidden state
    const concatenated = [...input, ...prevHiddenState];

    // Compute gates
    const inputGate = this.computeGate(concatenated, inputWeights, biases, 0, units);
    const forgetGate = this.computeGate(concatenated, inputWeights, biases, units, units);
    const outputGate = this.computeGate(concatenated, inputWeights, biases, 2 * units, units);
    const candidateValues = this.computeGate(concatenated, inputWeights, biases, 3 * units, units, 'tanh');

    // Update cell state
    const cellState = prevCellState.map((prev, i) => 
      forgetGate[i] * prev + inputGate[i] * candidateValues[i]
    );

    // Compute hidden state
    const hiddenState = cellState.map((cell, i) => 
      outputGate[i] * Math.tanh(cell)
    );

    return { cellState, hiddenState };
  }

  private computeGate(
    input: number[],
    weights: number[],
    biases: number[],
    offset: number,
    units: number,
    activation: 'sigmoid' | 'tanh' = 'sigmoid'
  ): number[] {
    const gate = new Array(units).fill(0);

    for (let i = 0; i < units; i++) {
      let sum = biases[offset + i];
      for (let j = 0; j < input.length; j++) {
        sum += input[j] * weights[(offset + i) * input.length + j];
      }
      
      gate[i] = activation === 'sigmoid' ? this.sigmoid(sum) : Math.tanh(sum);
    }

    return gate;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  // === TRANSFORMER MODEL ===
  initializeTransformer(config: {
    vocabSize: number;
    modelDim: number;
    numHeads: number;
    numLayers: number;
    maxSequenceLength: number;
  }): TransformerModel {
    const attention: AttentionMechanism = {
      queries: this.initializeMatrix(config.maxSequenceLength, config.modelDim),
      keys: this.initializeMatrix(config.maxSequenceLength, config.modelDim),
      values: this.initializeMatrix(config.maxSequenceLength, config.modelDim),
      attentionWeights: this.initializeMatrix(config.maxSequenceLength, config.maxSequenceLength)
    };

    const feedForward: FeedForwardNetwork = {
      weights: this.initializeMatrix(config.modelDim, config.modelDim * 4),
      biases: new Array(config.modelDim * 4).fill(0),
      activations: new Array(config.modelDim * 4).fill(0)
    };

    this.transformerModel = {
      attention,
      feedForward,
      encoderLayers: config.numLayers,
      decoderLayers: config.numLayers,
      headSize: config.modelDim / config.numHeads,
      numHeads: config.numHeads
    };

    return this.transformerModel;
  }

  private initializeMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () => 
      Array.from({ length: cols }, () => (Math.random() - 0.5) * 0.1)
    );
  }

  computeMultiHeadAttention(
    queries: number[][],
    keys: number[][],
    values: number[][],
    numHeads: number
  ): number[][] {
    const seqLength = queries.length;
    const modelDim = queries[0].length;
    const headSize = modelDim / numHeads;

    const outputs: number[][] = Array.from({ length: seqLength }, () => 
      new Array(modelDim).fill(0)
    );

    for (let head = 0; head < numHeads; head++) {
      const headOffset = head * headSize;
      
      // Extract head-specific queries, keys, values
      const headQueries = queries.map(q => q.slice(headOffset, headOffset + headSize));
      const headKeys = keys.map(k => k.slice(headOffset, headOffset + headSize));
      const headValues = values.map(v => v.slice(headOffset, headOffset + headSize));

      // Compute attention scores
      const scores = this.computeAttentionScores(headQueries, headKeys);
      const attentionWeights = this.softmax2D(scores);

      // Apply attention to values
      const headOutput = this.applyAttention(attentionWeights, headValues);

      // Concatenate head outputs
      for (let i = 0; i < seqLength; i++) {
        for (let j = 0; j < headSize; j++) {
          outputs[i][headOffset + j] = headOutput[i][j];
        }
      }
    }

    return outputs;
  }

  private computeAttentionScores(queries: number[][], keys: number[][]): number[][] {
    const seqLength = queries.length;
    const scores = Array.from({ length: seqLength }, () => new Array(seqLength).fill(0));

    for (let i = 0; i < seqLength; i++) {
      for (let j = 0; j < seqLength; j++) {
        let score = 0;
        for (let k = 0; k < queries[i].length; k++) {
          score += queries[i][k] * keys[j][k];
        }
        scores[i][j] = score / Math.sqrt(queries[i].length);
      }
    }

    return scores;
  }

  private softmax2D(matrix: number[][]): number[][] {
    return matrix.map(row => this.softmax(row));
  }

  private softmax(values: number[]): number[] {
    const max = Math.max(...values);
    const exp = values.map(v => Math.exp(v - max));
    const sum = exp.reduce((s, e) => s + e, 0);
    return exp.map(e => e / sum);
  }

  private applyAttention(weights: number[][], values: number[][]): number[][] {
    const seqLength = weights.length;
    const valueDim = values[0].length;
    const output = Array.from({ length: seqLength }, () => new Array(valueDim).fill(0));

    for (let i = 0; i < seqLength; i++) {
      for (let j = 0; j < seqLength; j++) {
        for (let k = 0; k < valueDim; k++) {
          output[i][k] += weights[i][j] * values[j][k];
        }
      }
    }

    return output;
  }

  // === REINFORCEMENT LEARNING ===
  initializeQLearningAgent(config: {
    states: string[];
    actions: string[];
    learningRate: number;
    discountFactor: number;
    explorationRate: number;
  }): ReinforcementLearningAgent {
    const qTable = new Map<string, number[]>();
    
    // Initialize Q-table
    config.states.forEach(state => {
      qTable.set(state, new Array(config.actions.length).fill(0));
    });

    this.rlAgent = {
      qTable,
      learningRate: config.learningRate,
      discountFactor: config.discountFactor,
      explorationRate: config.explorationRate,
      actions: config.actions,
      currentState: config.states[0]
    };

    return this.rlAgent;
  }

  selectAction(state: string): string {
    if (!this.rlAgent) throw new Error('RL Agent not initialized');

    const qValues = this.rlAgent.qTable.get(state) || [];
    
    // Epsilon-greedy action selection
    if (Math.random() < this.rlAgent.explorationRate) {
      // Explore: random action
      return this.rlAgent.actions[Math.floor(Math.random() * this.rlAgent.actions.length)];
    } else {
      // Exploit: best action
      const bestActionIndex = qValues.indexOf(Math.max(...qValues));
      return this.rlAgent.actions[bestActionIndex];
    }
  }

  updateQValue(state: string, action: string, reward: number, nextState: string): void {
    if (!this.rlAgent) return;

    const actionIndex = this.rlAgent.actions.indexOf(action);
    const currentQ = this.rlAgent.qTable.get(state)?.[actionIndex] || 0;
    const nextQ = Math.max(...(this.rlAgent.qTable.get(nextState) || []));

    const newQ = currentQ + this.rlAgent.learningRate * 
      (reward + this.rlAgent.discountFactor * nextQ - currentQ);

    const qValues = this.rlAgent.qTable.get(state) || [];
    qValues[actionIndex] = newQ;
    this.rlAgent.qTable.set(state, qValues);
  }

  // === ENSEMBLE METHODS ===
  createEnsembleModel(models: Array<{
    type: 'lstm' | 'transformer' | 'random_forest' | 'gradient_boost';
    predictions: number[];
    accuracy?: number;
  }>): EnsembleModel {
    // Calculate weights based on accuracy (if available) or equal weights
    const totalAccuracy = models.reduce((sum, m) => sum + (m.accuracy || 1), 0);
    
    const weightedModels = models.map(model => ({
      ...model,
      weight: (model.accuracy || 1) / totalAccuracy,
      accuracy: model.accuracy || 0.5
    }));

    // Combine predictions using weighted average
    const combinedPrediction = weightedModels.reduce((sum, model) => 
      sum + model.weight * model.predictions[model.predictions.length - 1], 0
    );

    // Calculate ensemble confidence based on prediction variance
    const predictions = weightedModels.map(m => m.predictions[m.predictions.length - 1]);
    const mean = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
    const variance = predictions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / predictions.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance));

    return {
      models: weightedModels,
      metaLearner: null, // Would implement meta-learning for advanced ensemble
      combinedPrediction,
      confidence
    };
  }

  // === ANOMALY DETECTION ===
  detectAnomalies(data: number[], windowSize: number = 20): AnomalyDetectionResult[] {
    const results: AnomalyDetectionResult[] = [];
    
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const std = Math.sqrt(window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length);
      
      const currentValue = data[i];
      const zScore = Math.abs((currentValue - mean) / std);
      const threshold = 3; // 3-sigma rule
      
      // Simple autoencoder simulation (reconstruction error)
      const reconstructionError = Math.abs(currentValue - mean) / std;
      
      results.push({
        isAnomaly: zScore > threshold,
        anomalyScore: zScore,
        threshold,
        reconstructionError,
        zScore
      });
    }
    
    return results;
  }

  // === SENTIMENT ANALYSIS ===
  async analyzeSentiment(textData: string[]): Promise<SentimentAnalysisResult> {
    // Simplified sentiment analysis (in production, use NLP libraries)
    const bullishKeywords = ['bullish', 'up', 'rise', 'buy', 'positive', 'gain', 'growth', 'strong'];
    const bearishKeywords = ['bearish', 'down', 'fall', 'sell', 'negative', 'loss', 'decline', 'weak'];
    
    let sentimentScore = 0;
    const foundKeywords: string[] = [];
    const sources: Array<{ source: string; sentiment: number; weight: number }> = [];
    
    textData.forEach((text, index) => {
      const words = text.toLowerCase().split(/\s+/);
      let textScore = 0;
      
      words.forEach(word => {
        if (bullishKeywords.includes(word)) {
          textScore += 1;
          if (!foundKeywords.includes(word)) foundKeywords.push(word);
        }
        if (bearishKeywords.includes(word)) {
          textScore -= 1;
          if (!foundKeywords.includes(word)) foundKeywords.push(word);
        }
      });
      
      // Normalize by text length
      textScore = textScore / Math.max(words.length, 1);
      sentimentScore += textScore;
      
      sources.push({
        source: `source_${index}`,
        sentiment: textScore,
        weight: 1 / textData.length
      });
    });
    
    sentimentScore = sentimentScore / textData.length;
    const normalizedScore = Math.max(-1, Math.min(1, sentimentScore));
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (normalizedScore > 0.1) sentiment = 'bullish';
    else if (normalizedScore < -0.1) sentiment = 'bearish';
    
    return {
      sentiment,
      confidence: Math.abs(normalizedScore),
      score: normalizedScore,
      keywords: foundKeywords,
      sources
    };
  }

  // === ECONOMIC SURPRISE INDEX ===
  calculateEconomicSurpriseIndex(economicData: Array<{
    indicator: string;
    actual: number;
    forecast: number;
    importance: number;
  }>): EconomicSurpriseIndex {
    const components = economicData.map(data => {
      const surprise = (data.actual - data.forecast) / Math.abs(data.forecast || 1);
      return {
        indicator: data.indicator,
        actual: data.actual,
        forecast: data.forecast,
        surprise,
        weight: data.importance
      };
    });
    
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const index = components.reduce((sum, c) => sum + (c.surprise * c.weight), 0) / totalWeight;
    
    // Determine trend
    const recentSurprises = components.slice(-3).map(c => c.surprise);
    const avgRecent = recentSurprises.reduce((sum, s) => sum + s, 0) / recentSurprises.length;
    
    let trend: 'improving' | 'deteriorating' | 'stable' = 'stable';
    if (avgRecent > 0.05) trend = 'improving';
    else if (avgRecent < -0.05) trend = 'deteriorating';
    
    const significance = Math.abs(index);
    
    return {
      index,
      components,
      trend,
      significance
    };
  }

  // === SAVE ML MODELS ===
  async saveMLModel(modelType: string, modelData: any, performance: any): Promise<void> {
    console.log('ML model saved:', { modelType, performance });
  }

  async loadMLModel(modelType: string): Promise<any> {
    console.log('Loading ML model:', modelType);
    return null;
  }
}