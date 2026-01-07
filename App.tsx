
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal, Database, Info, Upload, Play, Code, AlertCircle, Volume2 } from 'lucide-react';
import CodeViewer from './components/CodeViewer';
import PlaybackControls from './components/PlaybackControls';
import { analyzeCodeExecution, generateExplanationAudio } from './services/geminiService';
import { PlaybackState, TraceData, ExecutionStep } from './types';

// Helper for decoding base64 audio
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper for decoding audio data (raw PCM)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const INITIAL_CODE = `import os
import re
import json
import glob
import math
import time
import zlib
import cmd
import requests
from collections import defaultdict
from pathlib import Path
from tqdm import tqdm
from typing import Dict, List, Tuple, Set, Optional
from dada_engine import DadaEngine
# QueryParser is defined in \`wordberriesncream.py\` / \`THEWORDBERRY.py\`.
from wordberriesncream import QueryParser, CompositionBrain

try:
    import keyboard
    HAS_KEYBOARD = True
except ImportError:
    HAS_KEYBOARD = False

def initialize_engine():
    """Initializes the main logic engine."""
    print("Initializing DadaEngine...")
    engine = DadaEngine()
    brain = CompositionBrain()
    return engine, brain

def main():
    print("Starting visual walker simulation...")
    engine, brain = initialize_engine()
    
    # Simulate a 12k line traversal by iterating logical chunks
    for i in range(100):
        time.sleep(0.01)
        if i % 10 == 0:
            print(f"Processing chunk {i//10}...")
            
    parser = QueryParser()
    result = parser.parse("Hello wordberry!")
    print(f"Final Result: {result}")

if __name__ == "__main__":
    main()
`;

const App: React.FC = () => {
  const [code, setCode] = useState(INITIAL_CODE);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.IDLE);
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [speed, setSpeed] = useState(1500);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize audio context on first interaction
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const stopSpeaking = () => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const speakExplanation = async (text: string) => {
    if (!isTtsEnabled) return;
    
    stopSpeaking();
    setIsSpeaking(true);
    
    try {
      const base64Audio = await generateExplanationAudio(text);
      if (base64Audio) {
        const ctx = getAudioContext();
        const audioBuffer = await decodeAudioData(
          decodeBase64(base64Audio),
          ctx,
          24000,
          1
        );
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        currentAudioSourceRef.current = source;
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error("Speech generation error:", err);
      setIsSpeaking(false);
    }
  };

  // Load trace from AI
  const startWalking = async () => {
    setPlaybackState(PlaybackState.LOADING);
    try {
      const result = await analyzeCodeExecution(code, [1, 100]);
      setTraceData(result);
      setCurrentStepIdx(0);
      setPlaybackState(PlaybackState.PAUSED);
    } catch (error) {
      console.error("Failed to analyze code:", error);
      setPlaybackState(PlaybackState.IDLE);
      alert("AI analysis failed. Please check your API key.");
    }
  };

  const handleNext = useCallback(() => {
    if (traceData && currentStepIdx < traceData.steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      setPlaybackState(PlaybackState.PAUSED);
    }
  }, [traceData, currentStepIdx]);

  const handlePrev = useCallback(() => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  }, [currentStepIdx]);

  useEffect(() => {
    if (playbackState === PlaybackState.PLAYING) {
      timerRef.current = window.setInterval(handleNext, speed) as unknown as number;
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playbackState, handleNext, speed]);

  // Handle TTS when step changes
  useEffect(() => {
    if (isTtsEnabled && currentStepIdx >= 0 && traceData) {
      const explanation = traceData.steps[currentStepIdx].explanation;
      speakExplanation(explanation);
    }
  }, [currentStepIdx, isTtsEnabled]);

  const currentStep: ExecutionStep | null = traceData ? traceData.steps[currentStepIdx] : null;

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-[#161b22] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Code size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">PyTrace <span className="text-blue-500">Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-700"
          >
            <Upload size={16} />
            {isEditorOpen ? 'Close Code Input' : 'Update Code (12k+)'}
          </button>
          
          {playbackState === PlaybackState.IDLE && (
            <button 
              onClick={startWalking}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors text-sm font-bold text-white shadow-lg"
            >
              <Play size={16} fill="white" />
              Analyze & Walk
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Code View (Left/Main) */}
        <section className="flex-1 relative overflow-hidden border-r border-gray-800">
          <CodeViewer 
            code={code} 
            activeLine={currentStep?.lineNumber || 0} 
          />

          {/* Code Input Overlay */}
          {isEditorOpen && (
            <div className="absolute inset-0 z-40 bg-[#0d1117] flex flex-col p-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Terminal size={20} className="text-blue-500" />
                  Python Code Input
                </h2>
                <div className="text-xs text-gray-500 uppercase font-mono tracking-widest">
                  Ready for large codebases (~12,000 lines)
                </div>
              </div>
              <textarea 
                className="flex-1 bg-[#090c10] border border-gray-700 rounded-lg p-4 fira-code text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your massive Python codebase here..."
              />
              <div className="mt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditorOpen(false)}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all active:scale-95"
                >
                  Confirm & Initialize
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Info/State Panel (Right) */}
        <aside className="w-[400px] bg-[#090c10] overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
          
          {/* AI Explanation Bubble (The "Popup") */}
          <div className={`transition-all duration-300 border-l-4 p-5 rounded-r-lg shadow-xl animate-in zoom-in-95 ${isSpeaking ? 'bg-blue-900/20 border-blue-400 scale-[1.02]' : 'bg-[#161b22] border-blue-500'}`}>
            <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Info size={14} /> AI Context Analysis</span>
              {isSpeaking && <Volume2 size={14} className="animate-pulse" />}
            </h3>
            {currentStep ? (
              <p className="text-gray-200 text-sm leading-relaxed">
                {currentStep.explanation}
              </p>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Start the walk to see AI-powered explanations of each logical step...
              </p>
            )}
          </div>

          {/* Variable State Explorer */}
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Database size={14} /> Simulated Variable State
            </h3>
            <div className="flex-1 bg-[#0d1117] border border-gray-800 rounded-lg p-4 font-mono text-xs overflow-auto">
              {currentStep?.variableState ? (
                Object.entries(currentStep.variableState).map(([key, val]) => (
                  <div key={key} className="mb-2 group">
                    <span className="text-blue-400">{key}</span>
                    <span className="text-gray-500 mx-2">=</span>
                    <span className="text-green-400 break-all">{JSON.stringify(val)}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 text-center px-4">
                  <AlertCircle size={32} className="mb-3 opacity-20" />
                  <p>No variables in current scope or waiting for execution...</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Panel */}
          {traceData?.summary && (
            <div className="bg-gray-800/20 rounded-lg p-4 border border-gray-700/50">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Program Overview</h4>
              <p className="text-xs text-gray-400 italic">{traceData.summary}</p>
            </div>
          )}
        </aside>
      </main>

      {/* Playback Controls Container */}
      {traceData && (
        <PlaybackControls 
          state={playbackState}
          currentStep={currentStepIdx}
          totalSteps={traceData.steps.length}
          speed={speed}
          isTtsEnabled={isTtsEnabled}
          onPlay={() => setPlaybackState(PlaybackState.PLAYING)}
          onPause={() => {
            setPlaybackState(PlaybackState.PAUSED);
            stopSpeaking();
          }}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={setCurrentStepIdx}
          onSpeedChange={setSpeed}
          onToggleTts={() => {
            if (!isTtsEnabled) getAudioContext(); // Initialize context on first enable
            setIsTtsEnabled(!isTtsEnabled);
            if (isTtsEnabled) stopSpeaking();
          }}
        />
      )}

      {/* Loading Overlay */}
      {playbackState === PlaybackState.LOADING && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Execution Logic</h2>
          <p className="text-gray-400 max-w-md">
            Gemini is mapping your codebase and simulating the visual walk for {code.split('\n').length} lines...
          </p>
          <div className="mt-8 flex gap-4">
             <div className="px-3 py-1 bg-gray-800 rounded text-[10px] uppercase tracking-tighter text-gray-500 border border-gray-700">Mapping Imports</div>
             <div className="px-3 py-1 bg-gray-800 rounded text-[10px] uppercase tracking-tighter text-gray-500 border border-gray-700">Analyzing Flows</div>
             <div className="px-3 py-1 bg-gray-800 rounded text-[10px] uppercase tracking-tighter text-gray-500 border border-gray-700">Identifying State</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
