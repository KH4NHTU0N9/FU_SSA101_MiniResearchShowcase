"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, Info, Calculator, Cpu, Binary, FastForward, ArrowRightLeft, BookOpen, Sparkles, Loader2, X, BarChart2, Play, Square, RefreshCw, Search, Terminal } from 'lucide-react';
import {
  type AlgorithmFrame,
  generateBinarySearchFrames,
  generateBubbleSortFrames,
  generateInsertionSortFrames,
  generateLinearSearchFrames,
  generateMergeSortFrames,
  generateQuickSortFrames,
  generateSelectionSortFrames,
} from '@/lib/it-support/algorithms';
import {
  type ArithmeticOp,
  type BitShiftOp,
  type BitwiseLogicOp,
  binToFloat32,
  computeBitShift,
  computeBitwiseLogic,
  computeTwoComplementArithmetic,
  toggleBit,
  toSignMagnitude,
  toTwoComplement,
  toUnsigned,
} from '@/lib/it-support/binary';

// ==========================================
// AI TUTOR SERVER PROXY (/api/it-support/ai)
// ==========================================
const askGemini = async (context: string, signal?: AbortSignal): Promise<string> => {
  const response = await fetch("/api/it-support/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ context: context.slice(0, 2000) }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    explanation?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || `Lỗi kết nối AI (${response.status})`);
  }

  return data.explanation || "Không có phản hồi từ AI.";
};

const AiTutor = ({ context }: { context: string }) => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setResponse('');
    setError('');
    setLoading(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [context]);

  const handleAsk = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const res = await askGemini(context, controller.signal);
      if (!controller.signal.aborted) {
        setResponse(res);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc">{line.replace(/^[\*\-]\s/, '')}</li>;
      }
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        return <p key={i} className="font-bold mt-2">{line.replace(/\*\*/g, '')}</p>;
      }
      return <p key={i} className="min-h-[1rem]">{line}</p>;
    });
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      {!response && !loading && (
        <button 
          onClick={handleAsk} 
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Sparkles size={18} /> Giải thích chuyên sâu bằng AI ✨
        </button>
      )}
      {loading && (
        <div className="flex items-center gap-3 text-indigo-600 font-medium bg-indigo-50 w-fit px-4 py-2 rounded-lg">
          <Loader2 size={18} className="animate-spin" /> Giáo sư AI đang phân tích...
        </div>
      )}
      {error && <div className="text-rose-600 text-sm bg-rose-50 p-3 rounded">{error}</div>}
      {response && (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-6 relative shadow-sm">
           <button type="button" onClick={() => setResponse('')} aria-label="Đóng phản hồi AI" className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-600 bg-white rounded-full p-1 shadow-sm transition-colors"><X size={16} aria-hidden="true"/></button>
           <h4 className="flex items-center gap-2 text-indigo-800 font-bold mb-4 pb-2 border-b border-indigo-200/50">
             <Sparkles size={20} className="text-indigo-600"/> Phân tích từ Giáo sư AI:
           </h4>
           <div className="text-slate-700 text-sm space-y-1.5 leading-relaxed overflow-y-auto max-h-96 pr-2">
             {renderFormattedText(response)}
           </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// UI COMPONENTS
// ==========================================
const BitArray = ({ binStr, onChange, colorClass = "bg-blue-600", readOnly = false }: { binStr: string, onChange?: (val: string) => void, colorClass?: string, readOnly?: boolean }) => (
  <div className="flex gap-1 sm:gap-1.5 w-full">
    {binStr.split('').map((bit, idx) => (
      <button
        key={idx}
        onClick={() => !readOnly && onChange && onChange(toggleBit(binStr, idx))}
        disabled={readOnly}
        className={`flex-1 min-w-0 h-12 sm:h-16 rounded flex flex-col items-center justify-center font-mono text-base sm:text-lg font-bold transition-all
          ${readOnly ? 'cursor-default' : 'cursor-pointer hover:-translate-y-1 shadow-sm'}
          ${bit === '1' ? `${colorClass} text-white` : 'bg-slate-200 text-slate-400'}`}
      >
        <span className="leading-none">{bit}</span>
        <span className="text-[9px] sm:text-xs opacity-60 font-sans mt-0.5 sm:mt-1 leading-none">{binStr.length - 1 - idx}</span>
      </button>
    ))}
  </div>
);

const SectionPanel = ({ title, icon: Icon, children, description, source, aiContext }: { title: string, icon: React.ElementType, children: React.ReactNode, description?: string, source?: string, aiContext?: string }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
    <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Icon size={20} /></div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
    </div>
    <div className="p-6">
      {description && <p className="text-sm text-slate-600 mb-6 pb-4 border-b border-slate-100">{description}</p>}
      {children}
      {aiContext && <AiTutor context={aiContext} />}
      {source && (
        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-start gap-2">
          <BookOpen size={14} className="shrink-0 mt-0.5" />
          <span><strong>Nguồn xác thực:</strong> {source}</span>
        </div>
      )}
    </div>
  </div>
);

const LiveConsole = ({ title, message }: { title: string, message: string }) => (
  <div className="mt-4 bg-slate-900 border-l-4 border-indigo-500 p-4 rounded-r-lg shadow-inner flex flex-col gap-2">
    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">
      <Terminal size={14} /> {title}
    </div>
    <div className="text-emerald-400 font-mono text-sm leading-relaxed transition-all min-h-[1.5rem]">
      {'>'} {message || "Sẵn sàng (Waiting for process...)"}
    </div>
  </div>
);

// Main App Component
export default function ITSearch() {
  const [activeTab, setActiveTab] = useState('logic'); 

  // Basic States
  const [logicA, setLogicA] = useState('01011010');
  const [logicB, setLogicB] = useState('00111100');
  const [logicOp, setLogicOp] = useState('AND');
  
  const [shiftA, setShiftA] = useState('10110100');
  const [shiftOp, setShiftOp] = useState('LSL');
  
  const [arithA, setArithA] = useState('00000101'); 
  const [arithB, setArithB] = useState('11111101'); 
  const [arithOp, setArithOp] = useState('ADD');
  
  const [intA, setIntA] = useState('10000101');
  
  const [floatBits, setFloatBits] = useState('11000001010010000000000000000000');

  // Animation Engine States
  const [dataArray, setDataArray] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(80); 
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [sortedIndices, setSortedIndices] = useState<number[]>([]);
  const [foundIndex, setFoundIndex] = useState<number | null>(null);
  const [activeRange, setActiveRange] = useState<number[] | null>(null); 
  const [stepMessage, setStepMessage] = useState('');
  
  // Specific settings
  const [sortAlgo, setSortAlgo] = useState('BUBBLE');
  const [searchAlgo, setSearchAlgo] = useState('LINEAR');
  const [searchTarget, setSearchTarget] = useState(50);
  
  const isRunningRef = useRef(false);
  const speedRef = useRef(speed);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const tabs = [
    { id: 'logic', name: '1. Toán tử Logic', icon: Cpu },
    { id: 'shift', name: '2. Dịch Bit (Shift)', icon: FastForward },
    { id: 'integer', name: '3. Biểu diễn Số nguyên', icon: Binary },
    { id: 'arithmetic', name: '4. Số học Nguyên', icon: Calculator },
    { id: 'float', name: '5. Số thực', icon: ArrowRightLeft },
    { id: 'sort', name: '6. Sắp xếp (Sorting)', icon: BarChart2 },
    { id: 'search', name: '7. Tìm kiếm (Searching)', icon: Search },
  ];

  const generateRandomArray = () => {
    isRunningRef.current = false;
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    setIsRunning(false);
    setActiveIndices([]);
    setSortedIndices([]);
    setFoundIndex(null);
    setActiveRange(null);
    setStepMessage('');
    
    const arr = Array.from({ length: 25 }, () => Math.floor(Math.random() * 90) + 10);
    
    // Yêu cầu tiên quyết cho Binary Search
    if (activeTab === 'search' && searchAlgo === 'BINARY') {
      arr.sort((a, b) => a - b);
    }
    
    setDataArray(arr);
    
    if (activeTab === 'search') {
      if (Math.random() > 0.3) {
        setSearchTarget(arr[Math.floor(Math.random() * arr.length)]);
      } else {
        setSearchTarget(Math.floor(Math.random() * 90) + 10);
      }
    }
  };

  useEffect(() => {
    isRunningRef.current = false;
    if (['sort', 'search'].includes(activeTab)) {
      const timer = setTimeout(() => {
        setIsRunning(false);
        setActiveIndices([]);
        setSortedIndices([]);
        setFoundIndex(null);
        setActiveRange(null);
        setStepMessage('');

        const arr = Array.from({ length: 25 }, () => Math.floor(Math.random() * 90) + 10);
        if (activeTab === 'search' && searchAlgo === 'BINARY') {
          arr.sort((a, b) => a - b);
        }
        setDataArray(arr);
        if (activeTab === 'search') {
          setSearchTarget(
            Math.random() > 0.3
              ? arr[Math.floor(Math.random() * arr.length)]
              : Math.floor(Math.random() * 90) + 10
          );
        }
      }, 0);
      return () => {
        clearTimeout(timer);
        isRunningRef.current = false;
        if (animTimerRef.current) clearTimeout(animTimerRef.current);
      };
    }
    return () => {
      isRunningRef.current = false;
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [activeTab, searchAlgo]);

  const runAnimationLoop = async (frames: AlgorithmFrame[]) => {
    setIsRunning(true);
    isRunningRef.current = true;
    setActiveIndices([]);
    setSortedIndices([]);
    setFoundIndex(null);
    setActiveRange(null);
    setStepMessage('');

    for (let i = 0; i < frames.length; i++) {
      if (!isRunningRef.current) break;
      
      const frame = frames[i];
      if (frame.arr) setDataArray(frame.arr);
      if (frame.indices) setActiveIndices(frame.indices);
      if (frame.msg) setStepMessage(frame.msg);

      if (frame.type === 'sorted' && frame.index !== undefined) {
        setSortedIndices(prev => [...prev, frame.index as number]);
      } else if (frame.type === 'mark_sorted_up_to' && frame.index !== undefined) {
        const newSorted = Array.from({ length: frame.index + 1 }, (_, k) => k);
        setSortedIndices(newSorted);
      } else if (frame.type === 'all_sorted') {
        setSortedIndices((frame.arr || dataArray).map((_, idx) => idx));
        setActiveIndices([]);
      }

      if (frame.type === 'range') setActiveRange(frame.range || null);
      if (frame.type === 'found' && frame.indices && frame.indices.length > 0) {
        setFoundIndex(frame.indices[0]);
        setActiveIndices([]);
      }

      const delay = Math.max(10, 505 - speedRef.current * 5);
      await new Promise<void>(r => {
        animTimerRef.current = setTimeout(r, delay);
      });
    }

    if (isRunningRef.current && activeTab === 'sort') {
      setSortedIndices(Array.from({ length: dataArray.length }, (_, idx) => idx)); 
      setActiveIndices([]);
    }
    isRunningRef.current = false;
    setIsRunning(false);
  };

  const handleStartSort = () => {
    if (isRunning) return;
    let frames: AlgorithmFrame[] = [];
    if (sortAlgo === 'BUBBLE') frames = generateBubbleSortFrames(dataArray);
    else if (sortAlgo === 'SELECTION') frames = generateSelectionSortFrames(dataArray);
    else if (sortAlgo === 'INSERTION') frames = generateInsertionSortFrames(dataArray);
    else if (sortAlgo === 'MERGE') frames = generateMergeSortFrames(dataArray);
    else if (sortAlgo === 'QUICK') frames = generateQuickSortFrames(dataArray);
    runAnimationLoop(frames);
  };

  const handleStartSearch = () => {
    if (isRunning) return;
    let frames: AlgorithmFrame[] = [];
    if (searchAlgo === 'LINEAR') frames = generateLinearSearchFrames(dataArray, searchTarget);
    else if (searchAlgo === 'BINARY') frames = generateBinarySearchFrames(dataArray, searchTarget);
    runAnimationLoop(frames);
  };

  const handleStop = () => {
    isRunningRef.current = false;
    setIsRunning(false);
    setActiveIndices([]);
    setStepMessage('Đã dừng tiến trình.');
  };

  // AI Contexts (Simplified for component rendering)
  const logicResult = useMemo(
    () => computeBitwiseLogic(logicA, logicB, logicOp as BitwiseLogicOp),
    [logicA, logicB, logicOp]
  );

  const shiftResult = useMemo(
    () => computeBitShift(shiftA, shiftOp as BitShiftOp),
    [shiftA, shiftOp]
  );

  const arithResult = useMemo(
    () => computeTwoComplementArithmetic(arithA, arithB, arithOp as ArithmeticOp),
    [arithA, arithB, arithOp]
  );

  const aiLogicContext = `Giải thích Toán tử ${logicOp} giữa ${logicA} và ${logicOp !== 'NOT' ? logicB : ''}. Kết quả: ${logicResult}.`;
  const aiShiftContext = `Giải thích phép dịch ${shiftOp} trên ${shiftA}. Kết quả: ${shiftResult}.`;
  const aiIntContext = `Chuỗi: ${intA}. Unsigned: ${toUnsigned(intA)}, Sign&Mag: ${toSignMagnitude(intA)}, 2's Comp: ${toTwoComplement(intA)}. Giải thích cách tính.`;
  const aiArithContext = `Giải thích phép ${arithOp} hệ Bù 2: ${toTwoComplement(arithA)} ${arithOp==='ADD'?'+':'-'} ${toTwoComplement(arithB)} = ${toTwoComplement(arithResult)}.`;
  const aiFloatContext = `Giải thích số thực IEEE 754: ${floatBits} -> ${binToFloat32(floatBits)}. Phân tích bit dấu, mũ, định trị.`;
  const aiSortContext = `Giải thích nguyên lý, di chuyển bộ nhớ và Big-O của ${sortAlgo} đang chạy trên mảng: [${dataArray.join(', ')}].`;
  const aiSearchContext = `Giải thích cơ chế và Big-O của ${searchAlgo} để tìm số ${searchTarget} trong mảng.`;

  return (
    <div className="w-full flex justify-center py-8">
      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-6">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-28">
            <h1 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Settings className="text-indigo-600" /> CompArch Lab
            </h1>
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <tab.icon size={18} /> {tab.name}
                </button>
              ))}
            </nav>
            <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800 shadow-sm">
              <Info size={16} className="mb-2" />
              Tương tác với hệ thống, xem &quot;Live Console&quot; và hỏi <strong>Giáo sư AI ✨</strong> ở bên dưới nhé!
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          
          {/* TAB 1: LOGIC */}
          {activeTab === 'logic' && (
            <SectionPanel title="Toán tử Logic (Bitwise Operations)" icon={Cpu} description="Phép toán logic trên từng cặp bit." source="Stallings, W. (2016). Computer Organization and Architecture." aiContext={aiLogicContext}>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Toán hạng A</label><BitArray binStr={logicA} onChange={setLogicA} /></div>
                  {logicOp !== 'NOT' && (<div><label className="block text-sm font-bold text-slate-700 mb-2">Toán hạng B</label><BitArray binStr={logicB} onChange={setLogicB} colorClass="bg-indigo-500" /></div>)}
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Toán tử (Opcode)</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-500" value={logicOp} onChange={e => setLogicOp(e.target.value)}>
                      <option value="AND">AND (Và)</option><option value="OR">OR (Hoặc)</option><option value="XOR">XOR (Loại trừ)</option><option value="NOT">NOT (Phủ định)</option>
                    </select>
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl shadow-inner text-white flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-indigo-300 mb-4 uppercase">Kết Quả: A {logicOp} {logicOp !== 'NOT' ? 'B' : ''}</h3>
                  <BitArray binStr={logicResult} readOnly colorClass="bg-emerald-500" />
                </div>
              </div>
            </SectionPanel>
          )}

          {/* TAB 2: SHIFT */}
          {activeTab === 'shift' && (
            <SectionPanel title="Dịch & Xoay Bit (Shift & Rotate)" icon={FastForward} description="Di chuyển bit để nhân/chia nhanh." source="Patterson & Hennessy. RISC-V Edition." aiContext={aiShiftContext}>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Toán hạng A <span className="text-slate-500 font-normal">(Bù 2: {toTwoComplement(shiftA)})</span></label><BitArray binStr={shiftA} onChange={setShiftA} /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Loại Dịch / Xoay</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold" value={shiftOp} onChange={e => setShiftOp(e.target.value)}>
                      <option value="LSL">Logical Shift Left</option><option value="LSR">Logical Shift Right</option><option value="ASL">Arithmetic Shift Left</option><option value="ASR">Arithmetic Shift Right</option><option value="ROL">Rotate Left</option><option value="ROR">Rotate Right</option>
                    </select>
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl text-white flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-indigo-300 mb-4 uppercase">Kết Quả {shiftOp} <span className="text-emerald-400 font-normal">(Bù 2: {toTwoComplement(shiftResult)})</span></h3>
                  <BitArray binStr={shiftResult} readOnly colorClass="bg-emerald-500" />
                </div>
              </div>
            </SectionPanel>
          )}

          {/* TAB 3: INTEGER */}
          {activeTab === 'integer' && (
            <SectionPanel title="Biểu diễn Số Nguyên" icon={Binary} description="3 cách CPU diễn giải chuỗi bit." aiContext={aiIntContext}>
              <div className="mb-8"><label className="block text-sm font-bold text-slate-700 mb-2">Nhập chuỗi 8-bit</label><div className="max-w-md"><BitArray binStr={intA} onChange={setIntA} colorClass="bg-purple-600" /></div></div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-5 border rounded-xl shadow-sm"><h3 className="text-slate-500 font-bold mb-1">1. Không Dấu</h3><div className="text-3xl font-black text-slate-800 mb-2">{toUnsigned(intA)}</div></div>
                <div className="bg-white p-5 border rounded-xl shadow-sm"><h3 className="text-slate-500 font-bold mb-1">2. Dấu & Độ Lớn</h3><div className="text-3xl font-black text-slate-800 mb-2">{toSignMagnitude(intA)}</div></div>
                <div className="bg-indigo-50 p-5 border border-indigo-200 rounded-xl"><h3 className="text-indigo-700 font-bold mb-1">3. Số Bù 2 (Chuẩn)</h3><div className="text-3xl font-black text-indigo-900 mb-2">{toTwoComplement(intA)}</div></div>
              </div>
            </SectionPanel>
          )}

          {/* TAB 4: ARITHMETIC */}
          {activeTab === 'arithmetic' && (
            <SectionPanel title="Số học trên Số Nguyên" icon={Calculator} description="ALU thực hiện Cộng/Trừ (A - B = A + (-B))." aiContext={aiArithContext}>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Số A ({toTwoComplement(arithA)})</label><BitArray binStr={arithA} onChange={setArithA} /></div>
                  <div><label className="block text-sm font-bold text-slate-700 mb-2">Số B ({toTwoComplement(arithB)})</label><BitArray binStr={arithB} onChange={setArithB} colorClass="bg-indigo-500" /></div>
                  <div className="flex gap-4">
                    <button onClick={() => setArithOp('ADD')} className={`flex-1 py-3 font-bold rounded-xl border-2 transition-all ${arithOp === 'ADD' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>CỘNG (A+B)</button>
                    <button onClick={() => setArithOp('SUB')} className={`flex-1 py-3 font-bold rounded-xl border-2 transition-all ${arithOp === 'SUB' ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>TRỪ (A-B)</button>
                  </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl text-white flex flex-col justify-center text-center">
                  <h3 className="text-sm font-bold text-indigo-300 mb-4 text-left">Kết Quả (Output)</h3>
                  <BitArray binStr={arithResult} readOnly colorClass="bg-emerald-500" />
                  <div className="text-5xl font-black text-emerald-400 mt-6">{toTwoComplement(arithResult)}</div>
                </div>
              </div>
            </SectionPanel>
          )}

          {/* TAB 5: FLOAT */}
          {activeTab === 'float' && (
            <SectionPanel title="Số Thực (IEEE 754 32-bit)" icon={ArrowRightLeft} description="Biểu diễn bằng Dấu, Mũ và Định trị." source="IEEE 754 Standard." aiContext={aiFloatContext}>
               <div className="bg-slate-900 p-4 md:p-6 rounded-xl text-white">
                <div className="text-4xl md:text-5xl font-black text-amber-400 font-mono text-center mb-8">{binToFloat32(floatBits).toPrecision(7)}</div>
                <div className="space-y-5">
                  <div className="bg-slate-800/50 p-3 rounded-lg"><div className="text-rose-400 text-xs font-bold mb-2">DẤU (1 bit)</div><div className="flex gap-1 w-12"><button onClick={() => setFloatBits(toggleBit(floatBits, 0))} className={`w-10 h-10 rounded font-mono font-bold transition-all ${floatBits[0] === '1' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{floatBits[0]}</button></div></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg"><div className="text-blue-400 text-xs font-bold mb-2">SỐ MŨ (8 bits)</div><div className="flex flex-wrap gap-1">{floatBits.slice(1, 9).split('').map((bit, idx) => (<button key={`exp-${idx}`} onClick={() => setFloatBits(toggleBit(floatBits, idx + 1))} className={`w-8 h-10 rounded font-mono font-bold transition-all ${bit === '1' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{bit}</button>))}</div></div>
                  <div className="bg-slate-800/50 p-3 rounded-lg"><div className="text-emerald-400 text-xs font-bold mb-2">ĐỊNH TRỊ (23 bits)</div><div className="flex flex-wrap gap-1">{floatBits.slice(9, 32).split('').map((bit, idx) => (<button key={`man-${idx}`} onClick={() => setFloatBits(toggleBit(floatBits, idx + 9))} className={`w-8 h-10 rounded font-mono font-bold transition-all ${bit === '1' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{bit}</button>))}</div></div>
                </div>
              </div>
            </SectionPanel>
          )}

          {/* TAB 6: SORTING */}
          {activeTab === 'sort' && (
            <SectionPanel title="Thuật toán Sắp xếp (Sorting Visualizer)" icon={BarChart2} description="Mô phỏng trực quan truy xuất và hoán đổi ô nhớ." source="CLRS (Introduction to Algorithms)." aiContext={aiSortContext}>
              <div className="bg-slate-50 p-4 rounded-xl border flex flex-wrap gap-4 items-end mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Thuật toán</label>
                  <select disabled={isRunning} className="w-full p-2.5 bg-white border rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-500" value={sortAlgo} onChange={e => setSortAlgo(e.target.value)}>
                    <option value="BUBBLE">Bubble Sort</option><option value="SELECTION">Selection Sort</option><option value="INSERTION">Insertion Sort</option><option value="MERGE">Merge Sort</option><option value="QUICK">Quick Sort</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tốc độ</label>
                  <input type="range" min="1" max="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"/>
                </div>
                <div className="flex gap-2">
                  <button onClick={generateRandomArray} disabled={isRunning} className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 transition-colors font-bold rounded-lg disabled:opacity-50"><RefreshCw size={18} /> Mới</button>
                  {!isRunning ? (<button onClick={handleStartSort} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-all font-bold rounded-lg shadow-md hover:shadow-lg"><Play size={18} /> Chạy</button>) : (<button onClick={handleStop} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-bold rounded-lg animate-pulse"><Square size={18} /> Dừng</button>)}
                </div>
              </div>
              <div className="h-64 sm:h-80 w-full bg-slate-900 rounded-xl p-4 flex items-end gap-1 shadow-inner">
                {dataArray.map((val, idx) => {
                  let bgColor = "bg-blue-500", isGlow = false;
                  if (activeIndices.includes(idx)) { bgColor = "bg-rose-500"; isGlow = true; } else if (sortedIndices.includes(idx)) { bgColor = "bg-emerald-500"; }
                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black text-white text-[10px] py-1 px-2 rounded z-10 whitespace-nowrap">Val: {val}</div>
                       <div className={`w-full rounded-t-sm transition-all duration-100 ease-in-out ${bgColor} ${isGlow ? 'shadow-[0_0_12px_rgba(244,63,94,0.8)] z-10 brightness-110' : ''}`} style={{ height: `${val}%` }}></div>
                    </div>
                  );
                })}
              </div>
              <LiveConsole title={`Lịch sử: ${sortAlgo}`} message={stepMessage} />
            </SectionPanel>
          )}

          {/* TAB 7: SEARCHING */}
          {activeTab === 'search' && (
            <SectionPanel title="Thuật toán Tìm kiếm (Searching Visualizer)" icon={Search} description="Mô phỏng cơ chế quét (Linear) và chia để trị (Binary)." source="CLRS (Introduction to Algorithms)." aiContext={aiSearchContext}>
              <div className="bg-slate-50 p-4 rounded-xl border flex flex-wrap gap-4 items-end mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Thuật toán</label>
                  <select disabled={isRunning} className="w-full p-2.5 bg-white border rounded-lg font-semibold outline-none focus:ring-2 focus:ring-indigo-500" value={searchAlgo} onChange={e => setSearchAlgo(e.target.value)}>
                    <option value="LINEAR">Sequential Search (Tuyến tính)</option><option value="BINARY">Binary Search (Nhị phân)</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-bold text-center mb-2">Mục tiêu</label>
                  <input type="number" value={searchTarget} onChange={(e) => setSearchTarget(Number(e.target.value))} disabled={isRunning} className="w-full p-2.5 text-center bg-white border rounded-lg font-bold text-rose-600 outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50" />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tốc độ</label>
                  <input type="range" aria-label="Tốc độ mô phỏng tìm kiếm" min="1" max="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-indigo-600 cursor-pointer"/>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={generateRandomArray} disabled={isRunning} aria-label="Tạo mảng ngẫu nhiên mới" className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg disabled:opacity-50"><RefreshCw size={18} aria-hidden="true" /></button>
                  {!isRunning ? (<button onClick={handleStartSearch} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white transition-all font-bold rounded-lg shadow-md hover:shadow-lg"><Search size={18} /> Tìm</button>) : (<button onClick={handleStop} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-bold rounded-lg animate-pulse"><Square size={18} /> Dừng</button>)}
                </div>
              </div>
              <div className="relative h-64 sm:h-80 w-full bg-slate-900 rounded-xl p-4 flex items-end gap-1 shadow-inner overflow-hidden">
                <div className="absolute left-0 right-0 border-t border-dashed border-amber-400/50 flex items-end pb-1 px-2 z-0" style={{ bottom: `${searchTarget}%`, height: '1px' }}>
                  <span className="text-amber-400 text-[10px] font-bold bg-slate-900 px-1">TARGET: {searchTarget}</span>
                </div>
                {dataArray.map((val, idx) => {
                  let bgColor = "bg-blue-500", isGlow = false, isDimmed = false;
                  if (activeRange && searchAlgo === 'BINARY') { if (idx < activeRange[0] || idx > activeRange[1]) isDimmed = true; }
                  if (foundIndex === idx) { bgColor = "bg-emerald-500"; isGlow = true; } else if (activeIndices.includes(idx)) { bgColor = "bg-rose-500"; isGlow = true; }
                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full z-10">
                       <div className={`w-full rounded-t-sm transition-all duration-100 ease-in-out ${bgColor} ${isGlow ? 'shadow-[0_0_12px_rgba(244,63,94,0.8)] brightness-110' : ''} ${isDimmed ? 'opacity-10 grayscale blur-[1px]' : 'opacity-100'}`} style={{ height: `${val}%` }}></div>
                    </div>
                  );
                })}
              </div>
              <LiveConsole title={`Lịch sử: ${searchAlgo}`} message={stepMessage} />
            </SectionPanel>
          )}

        </div>
      </div>
    </div>
  );
}
