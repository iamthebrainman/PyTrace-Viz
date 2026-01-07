
export interface ExecutionStep {
  lineNumber: number;
  explanation: string;
  variableState?: Record<string, any>;
  importantChange?: boolean;
}

export interface CodeMetadata {
  filename: string;
  content: string;
  language: string;
}

export interface TraceData {
  steps: ExecutionStep[];
  summary: string;
}

export enum PlaybackState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LOADING = 'LOADING'
}
