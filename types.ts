
export interface UploadedImage {
  id: string;
  dataUrl: string;
  mimeType: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
}

export interface AnalysisResult {
  systemPrompt: string;
  positivePrompt: string;
  negativePrompt: string;
}

export interface SavedStyle {
  id: string;
  timestamp: number;
  thumbnail: string;
  content: string;
  referenceImages: UploadedImage[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
