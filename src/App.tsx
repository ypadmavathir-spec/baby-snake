import React, { useState, useEffect, useRef, useCallback } from 'react';

const GRID_SIZE = 20;

const TRACKS = [
  { title: "NEON CORE_DUMP", artist: "SYNTH-AI [SECTOR 4]", url: "https://archive.org/download/KevinMacLeod-Electrodoodle/Electrodoodle.mp3" },
  { title: "DIGITAL_HORIZON.WAV", artist: "BITSTREAM CORRUPTION", url: "https://archive.org/download/KevinMacLeod-PixelPeekerPolkaFaster/Pixel%20Peeker%20Polka%20-%20faster.mp3" },
  { title: "VOID_ECHOES [NULL]", artist: "NEURAL_MIND_0xFF", url: "https://archive.org/download/KevinMacLeod-JauntyGumption/Jaunty%20Gumption.mp3" }
];

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default function App() {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 10 });
  const queueDir = useRef<{x:number, y:number}[]>([]);
  const lastProcessedDir = useRef({ x: 0, y: 0 }); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 10 });
    queueDir.current = [];
    lastProcessedDir.current = { x: 0, y: 0 }; 
    setIsGameOver(false);
    setScore(0);
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error(e));
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (isGameOver) {
      if (e.key === 'Enter' || e.key === ' ') resetGame();
      return;
    }
    const { key } = e;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) {
      let requestedDir = { x: 0, y: 0 };
      if (key === 'ArrowUp' || key === 'w') requestedDir = { x: 0, y: -1 };
      if (key === 'ArrowDown' || key === 's') requestedDir = { x: 0, y: 1 };
      if (key === 'ArrowLeft' || key === 'a') requestedDir = { x: -1, y: 0 };
      if (key === 'ArrowRight' || key === 'd') requestedDir = { x: 1, y: 0 };

      const currentDir = queueDir.current.length > 0 ? queueDir.current[queueDir.current.length - 1] : lastProcessedDir.current;
      
      if (currentDir.x === 0 && currentDir.y === 0) queueDir.current.push(requestedDir);
      else if ((requestedDir.x !== 0 && requestedDir.x !== -currentDir.x) || (requestedDir.y !== 0 && requestedDir.y !== -currentDir.y)) {
         queueDir.current.push(requestedDir);
      }
      if (currentDir.x === 0 && currentDir.y === 0 && !isPlaying && !isGameOver) togglePlay();
    }
  }, [isGameOver, isPlaying, togglePlay]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useInterval(() => {
    if (isGameOver) return;
    setSnake(prevSnake => {
      let currentDir = lastProcessedDir.current;
      if (queueDir.current.length > 0) {
         currentDir = queueDir.current.shift()!;
         lastProcessedDir.current = currentDir;
      }
      if (currentDir.x === 0 && currentDir.y === 0) return prevSnake;

      const head = prevSnake[0];
      const newHead = { x: head.x + currentDir.x, y: head.y + currentDir.y };

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE || 
          prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        if (score > highScore) setHighScore(score);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      if (newHead.x === food.x && newHead.y === food.y) {
         setScore(s => s + 10);
         let newFood;
         while (true) {
           newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
           if (!newSnake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
         }
         setFood(newFood);
      } else { newSnake.pop(); }
      return newSnake;
    });
  }, !isGameOver ? 100 : null);

  const nextTrack = useCallback(() => setCurrentTrackIndex(p => (p + 1) % TRACKS.length), []);
  const prevTrack = () => setCurrentTrackIndex(p => (p - 1 + TRACKS.length) % TRACKS.length);

  useEffect(() => {
    if (isPlaying && audioRef.current) audioRef.current.play().catch(() => setIsPlaying(false));
  }, [currentTrackIndex]); // eslint-disable-line

  return (
    <div className="bg-[#000] text-[#0ff] font-pixel min-h-screen w-full flex items-center justify-center relative overflow-hidden select-none crt-flicker">
      <div className="static-noise"></div>
      <div className="scanlines"></div>
      <audio ref={audioRef} src={TRACKS[currentTrackIndex].url} onTimeUpdate={() => audioRef.current && setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0)} onEnded={nextTrack} />

      <div className="relative z-10 w-full max-w-[1024px] h-screen md:h-[768px] max-h-[100vh] p-4 lg:p-8 flex flex-col md:grid md:grid-cols-[260px_1fr_260px] gap-6 items-stretch overflow-y-auto md:overflow-visible">
        
        {/* Left Sidebar - Audio Subsystem */}
        <div className="glitch-box p-5 flex flex-col shrink-0 md:h-full group">
          <div className="mb-6 border-b-2 border-[#f0f] pb-2">
            <h1 className="glitch-text text-2xl font-bold text-[#f0f]" data-text="MOD::AUDIO_SEQ">MOD::AUDIO_SEQ</h1>
            <div className="text-xs tracking-widest mt-1 opacity-75">SUBSYSTEM_ONLINE</div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar mb-4 pr-1">
             {TRACKS.map((track, i) => {
                const isActive = i === currentTrackIndex;
                return (
                    <div key={i} onClick={() => { setCurrentTrackIndex(i); if (!isPlaying) togglePlay(); }}
                        className={`p-3 border-2 cursor-pointer transition-colors ${isActive ? 'bg-[#f0f] border-[#f0f] text-black shadow-[4px_4px_0_#0ff]' : 'border-[#0ff] text-[#0ff] bg-black hover:bg-[#0ff] hover:text-black'}`}>
                        <div className="text-[16px] font-bold truncate leading-none">{track.title}</div>
                        <div className="text-[12px] opacity-80 truncate mt-1">BY: {track.artist}</div>
                        {isActive && isPlaying && ( <div className="mt-2 text-[10px] animate-pulse font-bold tracking-widest">STATUS: EMITTING...</div> )}
                    </div>
                );
            })}
          </div>
          
          <div className="mt-auto border-t-2 border-[#0ff] pt-4">
             <div className="h-4 border-2 border-[#f0f] relative cursor-pointer mb-5" onClick={(e) => {
                 const percentage = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width;
                 if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
                    audioRef.current.currentTime = percentage * audioRef.current.duration;
                    setProgress(percentage * 100);
                 }
             }}>
                <div className="h-full bg-[#0ff] shadow-[0_0_10px_#0ff] pointer-events-none" style={{width: `${progress}%`}}></div>
             </div>
             <div className="flex justify-between items-center text-3xl px-2">
                <span className="cursor-pointer hover:bg-[#0ff] hover:text-black transition-colors" onClick={prevTrack}>[&lt;&lt;]</span>
                <span className="cursor-pointer border-b-2 border-transparent hover:border-[#f0f] hover:text-[#f0f]" onClick={togglePlay}>{isPlaying ? '[||]' : '[&gt;]'}</span>
                <span className="cursor-pointer hover:bg-[#0ff] hover:text-black transition-colors" onClick={nextTrack}>[&gt;&gt;]</span>
             </div>
          </div>
        </div>

        {/* Middle - Execution Env */}
        <div className="glitch-box-magenta p-6 flex flex-col items-center justify-center shrink-0 relative md:h-full">
          <div className="absolute top-0 left-0 w-full bg-[#f0f] text-black text-center font-bold text-sm tracking-[2px] py-1 border-b-2 border-[#0ff]">TTY01 // SNAKE.BIN</div>
          
          <div className="w-full max-w-[400px] aspect-square bg-black border-4 border-[#0ff] shadow-[0_0_20px_#0ff] grid p-0.5 mt-4 relative"
             style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
             {snake.map((sem, i) => (
               <div key={i} className={`${i === 0 ? 'bg-white z-10 box-shadow-[0_0_15px_#fff]' : 'bg-[#0ff] border border-black'}`}
                 style={{ gridColumnStart: sem.x + 1, gridRowStart: sem.y + 1 }} />
             ))}
             <div className="bg-[#f0f] animate-pulse" style={{ gridColumnStart: food.x + 1, gridRowStart: food.y + 1 }} />

             {isGameOver && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 border-[3px] border-[#f0f] m-[1px]">
                  <h2 className="glitch-text text-3xl font-extrabold text-[#f0f] mb-3 text-center" data-text="FATAL_EXCEPTION">FATAL_EXCEPTION</h2>
                  <div className="text-xl text-[#0ff] mb-6">ADDR: {score}x00</div>
                  <button className="border-2 border-[#0ff] text-[#0ff] hover:bg-[#0ff] hover:text-black px-6 py-2 tracking-widest text-lg font-bold outline-none uppercase" onClick={resetGame}>
                    [ INITIATE_REBOOT ]
                  </button>
               </div>
             )}

             {lastProcessedDir.current.x === 0 && lastProcessedDir.current.y === 0 && !isGameOver && (
               <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
                 <div className="text-xl font-bold border-2 border-[#0ff] p-3 text-center bg-black animate-pulse shadow-[0_0_15px_#0ff]">PRESS ARROW KEYS<br/>TO EXECUTE</div>
               </div>
             )}
          </div>

          <div className="flex w-full justify-between items-center mt-6 py-2 border-y-2 border-[#f0f]">
             <div className="text-left">
                <div className="text-sm text-[#f0f] tracking-widest">ALLOCATED</div>
                <div className="text-4xl text-[#0ff] drop-shadow-[0_0_8px_#0ff] font-bold">{score} <span className="text-sm">B</span></div>
             </div>
             <div className="text-right">
                <div className="text-sm text-[#f0f] tracking-widest">PEAK_MEM</div>
                <div className="text-4xl text-[#0ff] drop-shadow-[0_0_8px_#0ff] font-bold">{highScore} <span className="text-sm">B</span></div>
             </div>
          </div>
        </div>

        {/* Right Sidebar - System Diagnostics */}
        <div className="glitch-box p-5 flex flex-col shrink-0 md:h-full">
          <div className="mb-6 border-b-2 border-[#0ff] pb-2">
             <h1 className="glitch-text text-2xl font-bold text-[#0ff]" data-text="SYS_DIAGNOSTICS">SYS_DIAGNOSTICS</h1>
             <div className="text-xs tracking-widest mt-1 opacity-75">HARDWARE_MONITOR</div>
          </div>

          <div className="mt-2 flex-grow space-y-6">
             <div className="border-l-[4px] border-[#f0f] pl-3">
                <div className="text-[#f0f] mb-1 font-bold tracking-widest">STATUS_REPORT</div>
                <div className="text-lg leading-tight uppercase">
                   STATE: <span className="text-[#f0f]">DEGRADED</span><br/>
                   CORES: <span className="text-white">ERR (3/4)</span><br/>
                   TEMP: <span className="text-[#f0f]">98&deg;C [WARN]</span>
                </div>
             </div>

             <div className="border-l-[4px] border-[#0ff] pl-3 uppercase">
                <div className="text-[#0ff] mb-2 font-bold tracking-widest">EVENT_BUFFER</div>
                <div className="text-sm opacity-70 leading-relaxed">
                   &gt; HEAP_CORRUPTION_DETECTED<br/>
                   &gt; AUDIO_SEQ_MOUNTED<br/>
                   &gt; SNAKE.BIN LOADED<br/>
                   {score > 0 && <span className="text-[#0ff]">&gt; MEM_ALLOC: +{score}B<br/></span>}
                   {isGameOver && <span className="text-[#f0f]">&gt; FATAL: SEGMENTATION_FAULT<br/></span>}
                </div>
             </div>
          </div>

          <div className="mt-auto border-t-2 border-[#f0f] pt-4 text-center">
             <div className="text-sm opacity-50 tracking-widest text-[#f0f]">FW_V_0.1.4 // DO NOT TRUST</div>
          </div>
        </div>

      </div>
    </div>
  );
}
