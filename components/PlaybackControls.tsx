
import React from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  FastForward, 
  Rewind,
  Clock,
  Volume2,
  VolumeX
} from 'lucide-react';
import { PlaybackState } from '../types';

interface PlaybackControlsProps {
  state: PlaybackState;
  currentStep: number;
  totalSteps: number;
  speed: number;
  isTtsEnabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (step: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleTts: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  state,
  currentStep,
  totalSteps,
  speed,
  isTtsEnabled,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
  onSpeedChange,
  onToggleTts
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#161b22] border border-gray-700 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button 
          onClick={onPrev}
          disabled={currentStep <= 0}
          className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-30 text-gray-400 transition-colors"
        >
          <Rewind size={20} />
        </button>
        
        <button 
          onClick={onPrev}
          className="p-2 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        {state === PlaybackState.PLAYING ? (
          <button 
            onClick={onPause}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-all transform hover:scale-105"
          >
            <Pause size={28} fill="currentColor" />
          </button>
        ) : (
          <button 
            onClick={onPlay}
            disabled={totalSteps === 0 || state === PlaybackState.LOADING}
            className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-all transform hover:scale-105 disabled:bg-gray-700"
          >
            <Play size={28} className="ml-1" fill="currentColor" />
          </button>
        )}

        <button 
          onClick={handleNextAction}
          className="p-2 hover:bg-gray-700 rounded-full text-gray-300 transition-colors"
        >
          <ChevronRight size={24} />
        </button>

        <button 
          onClick={() => onSeek(totalSteps - 1)}
          disabled={currentStep >= totalSteps - 1}
          className="p-2 hover:bg-gray-700 rounded-full disabled:opacity-30 text-gray-400 transition-colors"
        >
          <FastForward size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-1 min-w-[300px]">
        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-wider">
          <span>Step {currentStep + 1} of {totalSteps || 1}</span>
          <span>{Math.round((currentStep / (totalSteps || 1)) * 100)}% Complete</span>
        </div>
        <input 
          type="range"
          min="0"
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="flex items-center gap-4 border-l border-gray-700 pl-6">
        <div className="flex flex-col">
          <label className="text-[10px] uppercase font-bold text-gray-500">Speed</label>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-500" />
            <select 
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="bg-transparent text-sm text-gray-400 focus:outline-none cursor-pointer hover:text-white transition-colors"
            >
              <option value={3000} className="bg-[#161b22]">Slow (3s)</option>
              <option value={1500} className="bg-[#161b22]">Normal (1.5s)</option>
              <option value={800} className="bg-[#161b22]">Fast (0.8s)</option>
              <option value={400} className="bg-[#161b22]">Turbo (0.4s)</option>
            </select>
          </div>
        </div>

        <button 
          onClick={onToggleTts}
          className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${isTtsEnabled ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300'}`}
          title={isTtsEnabled ? "Disable Readback" : "Enable Readback"}
        >
          {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span className="text-[8px] uppercase font-bold tracking-widest">TTS</span>
        </button>
      </div>
    </div>
  );

  function handleNextAction() {
    onNext();
  }
};

export default PlaybackControls;
