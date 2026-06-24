import { create } from "zustand";

export type View = "corpus" | "train" | "inference" | "export";
export type TrainStatus = "idle" | "running" | "paused" | "completed" | "error";
export type ExportStatus = "idle" | "running" | "completed" | "error";

export interface TrainConfig {
  dModel: number;
  nLayers: number;
  nHeads: number;
  contextLen: number;
  batchSize: number;
  learningRate: number;
  epochs: number;
  evalInterval: number;
  tokenizerType: "char" | "bpe";
}

export interface TrainMetric {
  step: number;
  epoch: number;
  trainLoss: number;
  valLoss: number | null;
  tokensPerSec: number;
}

export interface CorpusInfo {
  downloaded: boolean;
  sizeBytes: number;
  wordCount: number;
  charCount: number;
  tokenCount: number;
  vocabSize: number;
}

export interface InferenceConfig {
  temperature: number;
  maxTokens: number;
  topK: number;
}

const DEFAULT_TRAIN_CONFIG: TrainConfig = {
  dModel: 256,
  nLayers: 4,
  nHeads: 4,
  contextLen: 256,
  batchSize: 32,
  learningRate: 0.0003,
  epochs: 10,
  evalInterval: 200,
  tokenizerType: "char",
};

const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  temperature: 0.8,
  maxTokens: 256,
  topK: 40,
};

interface AppState {
  activeView: View;
  corpus: CorpusInfo | null;
  corpusLoading: boolean;
  activeCorpus: string;
  trainConfig: TrainConfig;
  trainStatus: TrainStatus;
  trainMetrics: TrainMetric[];
  inferenceConfig: InferenceConfig;
  inferenceOutput: string;
  isGenerating: boolean;
  exportStatus: ExportStatus;
  exportPath: string | null;

  setActiveView: (view: View) => void;
  setCorpus: (corpus: CorpusInfo | null) => void;
  setCorpusLoading: (loading: boolean) => void;
  setActiveCorpus: (version: string) => void;
  updateTrainConfig: (updates: Partial<TrainConfig>) => void;
  setTrainStatus: (status: TrainStatus) => void;
  addTrainMetric: (metric: TrainMetric) => void;
  clearTrainMetrics: () => void;
  updateInferenceConfig: (updates: Partial<InferenceConfig>) => void;
  appendInferenceOutput: (token: string) => void;
  clearInferenceOutput: () => void;
  setIsGenerating: (generating: boolean) => void;
  setExportStatus: (status: ExportStatus) => void;
  setExportPath: (path: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "corpus",
  corpus: null,
  corpusLoading: false,
  activeCorpus: "kjv",
  trainConfig: DEFAULT_TRAIN_CONFIG,
  trainStatus: "idle",
  trainMetrics: [],
  inferenceConfig: DEFAULT_INFERENCE_CONFIG,
  inferenceOutput: "",
  isGenerating: false,
  exportStatus: "idle",
  exportPath: null,

  setActiveView: (view) => set({ activeView: view }),
  setCorpus: (corpus) => set({ corpus }),
  setCorpusLoading: (loading) => set({ corpusLoading: loading }),
  setActiveCorpus: (version) => set({ activeCorpus: version }),
  updateTrainConfig: (updates) =>
    set((s) => ({ trainConfig: { ...s.trainConfig, ...updates } })),
  setTrainStatus: (status) => set({ trainStatus: status }),
  addTrainMetric: (metric) =>
    set((s) => ({ trainMetrics: [...s.trainMetrics, metric] })),
  clearTrainMetrics: () => set({ trainMetrics: [] }),
  updateInferenceConfig: (updates) =>
    set((s) => ({ inferenceConfig: { ...s.inferenceConfig, ...updates } })),
  appendInferenceOutput: (token) =>
    set((s) => ({ inferenceOutput: s.inferenceOutput + token })),
  clearInferenceOutput: () => set({ inferenceOutput: "" }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setExportStatus: (status) => set({ exportStatus: status }),
  setExportPath: (path) => set({ exportPath: path }),
}));
