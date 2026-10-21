import { create } from "zustand";

export type View = "corpus" | "train" | "inference" | "ask" | "model";
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

export interface GpuInfo {
  available: boolean;
  name: string;
  totalMb: number;
  freeMb: number;
  allocatedMb: number;
  reservedMb: number;
  deviceCount: number;
}

export interface ModelInfo {
  runDir: string;
  hasCheckpoint: boolean;
  hasOnnx: boolean;
  hasTokenizer: boolean;
  checkpointBytes?: number;
  onnxBytes?: number;
  vocabSize?: number;
  params?: number;
  step?: number | null;
  valLoss?: number | null;
  checkpointError?: string;
  config?: {
    vocab_size: number;
    context_len: number;
    d_model: number;
    n_layers: number;
    n_heads: number;
    dropout: number;
  };
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

// The chosen translation is persisted: without this the app silently reverted
// to "kjv" on every restart, so a run started after a restart trained on a
// different corpus than the one still showing as selected.
const CORPUS_KEY = "biblelm.activeCorpus";

function loadActiveCorpus(): string {
  try {
    return localStorage.getItem(CORPUS_KEY) || "kjv";
  } catch {
    return "kjv";
  }
}

// Tuned with Jev's judge (docs/evals/tuning.md): the coolest temperature that
// does not start repeating itself, where both scores peak; top-k barely matters.
const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  temperature: 0.4,
  maxTokens: 256,
  topK: 10,
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
  trainDevice: string | null;
  gpuInfo: GpuInfo | null;
  gpuError: string | null;
  modelInfo: ModelInfo | null;

  setActiveView: (view: View) => void;
  setCorpus: (corpus: CorpusInfo | null) => void;
  setCorpusLoading: (loading: boolean) => void;
  setActiveCorpus: (version: string) => void;
  updateTrainConfig: (updates: Partial<TrainConfig>) => void;
  resetTrainConfig: () => void;
  setTrainStatus: (status: TrainStatus) => void;
  addTrainMetric: (metric: TrainMetric) => void;
  clearTrainMetrics: () => void;
  updateInferenceConfig: (updates: Partial<InferenceConfig>) => void;
  resetInferenceConfig: () => void;
  appendInferenceOutput: (token: string) => void;
  clearInferenceOutput: () => void;
  setIsGenerating: (generating: boolean) => void;
  setExportStatus: (status: ExportStatus) => void;
  setExportPath: (path: string | null) => void;
  setTrainDevice: (device: string | null) => void;
  setGpuInfo: (info: GpuInfo | null) => void;
  setGpuError: (error: string | null) => void;
  setModelInfo: (info: ModelInfo | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "corpus",
  corpus: null,
  corpusLoading: false,
  activeCorpus: loadActiveCorpus(),
  trainConfig: DEFAULT_TRAIN_CONFIG,
  trainStatus: "idle",
  trainMetrics: [],
  inferenceConfig: DEFAULT_INFERENCE_CONFIG,
  inferenceOutput: "",
  isGenerating: false,
  exportStatus: "idle",
  exportPath: null,
  trainDevice: null,
  gpuInfo: null,
  gpuError: null,
  modelInfo: null,

  setActiveView: (view) => set({ activeView: view }),
  setCorpus: (corpus) => set({ corpus }),
  setCorpusLoading: (loading) => set({ corpusLoading: loading }),
  setActiveCorpus: (version) =>
    set(() => {
      try {
        localStorage.setItem(CORPUS_KEY, version);
      } catch {
        // Private mode / storage disabled — the selection just won't persist.
      }
      return { activeCorpus: version };
    }),
  updateTrainConfig: (updates) =>
    set((s) => ({ trainConfig: { ...s.trainConfig, ...updates } })),
  resetTrainConfig: () => set({ trainConfig: DEFAULT_TRAIN_CONFIG }),
  setTrainStatus: (status) => set({ trainStatus: status }),
  addTrainMetric: (metric) =>
    set((s) => ({ trainMetrics: [...s.trainMetrics, metric] })),
  clearTrainMetrics: () => set({ trainMetrics: [] }),
  updateInferenceConfig: (updates) =>
    set((s) => ({ inferenceConfig: { ...s.inferenceConfig, ...updates } })),
  resetInferenceConfig: () => set({ inferenceConfig: DEFAULT_INFERENCE_CONFIG }),
  appendInferenceOutput: (token) =>
    set((s) => ({ inferenceOutput: s.inferenceOutput + token })),
  clearInferenceOutput: () => set({ inferenceOutput: "" }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setExportStatus: (status) => set({ exportStatus: status }),
  setExportPath: (path) => set({ exportPath: path }),
  setTrainDevice: (device) => set({ trainDevice: device }),
  setGpuInfo: (info) => set({ gpuInfo: info }),
  setGpuError: (error) => set({ gpuError: error }),
  setModelInfo: (info) => set({ modelInfo: info }),
}));
