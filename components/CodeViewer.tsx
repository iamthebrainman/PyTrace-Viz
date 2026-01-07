
import React, { useRef, useEffect, useMemo } from 'react';

interface CodeViewerProps {
  code: string;
  activeLine: number;
  onLineClick?: (line: number) => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, activeLine, onLineClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => code.split('\n'), [code]);

  useEffect(() => {
    // Auto-scroll to active line
    if (containerRef.current && activeLine > 0) {
      const lineElement = containerRef.current.querySelector(`[data-line="${activeLine}"]`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLine]);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full bg-[#0d1117] overflow-auto fira-code text-sm leading-relaxed relative"
    >
      <div className="flex">
        {/* Line Numbers */}
        <div className="bg-[#090c10] text-gray-600 text-right pr-4 pl-2 select-none border-r border-gray-800 sticky left-0 z-10">
          {lines.map((_, i) => (
            <div key={i} className={`h-6 ${activeLine === i + 1 ? 'text-blue-400 font-bold' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 min-w-0">
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isActive = activeLine === lineNum;
            return (
              <div 
                key={i}
                data-line={lineNum}
                onClick={() => onLineClick?.(lineNum)}
                className={`h-6 px-4 whitespace-pre group cursor-pointer transition-colors ${
                  isActive ? 'bg-blue-900/30 border-l-4 border-blue-500' : 'hover:bg-gray-800/50'
                }`}
              >
                <span className={`${
                  line.trim().startsWith('#') ? 'text-gray-500 italic' : 
                  line.trim().startsWith('import') || line.trim().startsWith('from') ? 'text-purple-400' :
                  line.trim().startsWith('def') || line.trim().startsWith('class') ? 'text-yellow-400 font-medium' :
                  'text-gray-300'
                }`}>
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;
