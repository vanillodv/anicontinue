"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, BookOpen, Wand2, History, Book } from "lucide-react";

interface SceneConstructorProps {
  animeId: number;
  animeTitle: string;
  isOpen: boolean;
  onClose: () => void;
  continuePrevious?: boolean;
  lastChapterTitle?: string | null;
  officialEndingContext?: string | null;
}

type Mood = 'Action' | 'Drama' | 'Romance' | 'Humor';
type SceneType = 'continuation' | 'alternative';

export default function SceneConstructor({ 
  animeId, 
  animeTitle, 
  isOpen, 
  onClose,
  continuePrevious,
  lastChapterTitle,
  officialEndingContext
}: SceneConstructorProps) {
  const [mood, setMood] = useState<Mood>('Action');
  const [sceneType, setSceneType] = useState<SceneType>('continuation');
  const [endingContext, setEndingContext] = useState("");
  const [startingPoint, setStartingPoint] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'result' | 'error' | 'limit'>('idle');
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          animeId, mood, sceneType,
          endingContext: endingContext || officialEndingContext,
          startingPoint,
          continuePrevious
        })
      });

      if (response.status === 403) {
        setStatus('limit');
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data.content);
      setStatus('result');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0D0D1A]/90 backdrop-blur-sm" />

        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-[#1A1A2E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {continuePrevious ? <History className="w-5 h-5 text-[#E8409A]" /> : <Sparkles className="w-5 h-5 text-[#E8409A]" />}
                {continuePrevious ? "Продолжить историю" : "Настрой свою главу"}
              </h2>
              {continuePrevious && lastChapterTitle && (
                <p className="text-xs text-gray-500 mt-1">Последний раз: {lastChapterTitle}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          </div>

          <div className="p-8 overflow-y-auto">
            {status === 'idle' && (
              <div className="space-y-6">
                {/* Официальное окончание */}
                {!continuePrevious && officialEndingContext && (
                  <div className="p-4 rounded-2xl bg-[#E8409A]/5 border border-[#E8409A]/20 space-y-2">
                    <h4 className="text-xs font-bold text-[#E8409A] flex items-center gap-2 uppercase tracking-widest">
                      <Book className="w-3 h-3" /> Официальное окончание аниме:
                    </h4>
                    <p className="text-sm text-gray-300 italic leading-relaxed">
                      "{officialEndingContext}"
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-500 mb-3 block uppercase font-bold tracking-wider">Настроение</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['Action', 'Drama', 'Romance', 'Humor'] as Mood[]).map((m) => (
                      <button key={m} onClick={() => setMood(m)} className={`py-2.5 rounded-xl border transition-all text-sm font-medium ${mood === m ? 'bg-[#E8409A] border-[#E8409A] shadow-lg shadow-[#E8409A]/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                        {m === 'Action' ? 'Экшн' : m === 'Drama' ? 'Драма' : m === 'Romance' ? 'Романтика' : m === 'Humor' ? 'Юмор'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={() => setSceneType('continuation')} className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${sceneType === 'continuation' ? 'bg-[#E8409A]/10 border-[#E8409A]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                    <BookOpen className={`w-5 h-5 ${sceneType === 'continuation' ? 'text-[#E8409A]' : 'text-gray-500'}`} />
                    <div className="text-sm font-bold text-gray-200">Продолжение</div>
                  </button>
                  <button onClick={() => setSceneType('alternative')} className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${sceneType === 'alternative' ? 'bg-[#E8409A]/10 border-[#E8409A]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                    <Wand2 className={`w-5 h-5 ${sceneType === 'alternative' ? 'text-[#E8409A]' : 'text-gray-500'}`} />
                    <div className="text-sm font-bold text-gray-200">Альт. концовка</div>
                  </button>
                </div>

                <div className="space-y-4 pt-2 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Свой вариант финала? (необязательно)</label>
                    <textarea value={endingContext} onChange={(e) => setEndingContext(e.target.value)} placeholder="Например: Эрен не погиб, а перенесся в наше время..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 transition-all resize-none placeholder:text-gray-600" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">С чего начать главу?</label>
                    <textarea value={startingPoint} onChange={(e) => setStartingPoint(e.target.value)} placeholder="Например: Спустя 5 лет после событий аниме..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 transition-all resize-none placeholder:text-gray-600" />
                  </div>
                </div>

                <button onClick={handleGenerate} className="w-full bg-[#E8409A] hover:bg-[#d13589] py-5 rounded-2xl font-bold text-xl shadow-lg shadow-[#E8409A]/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3">
                  Создать главу 🚀
                </button>
              </div>
            )}

            {status === 'loading' && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <Loader2 className="w-16 h-16 text-[#E8409A] animate-spin" />
                <h3 className="text-2xl font-bold">Пишем историю...</h3>
              </div>
            )}

            {status === 'result' && (
              <div className="space-y-6">
                <div className="prose prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed text-gray-200">{result}</p>
                </div>
                <button onClick={() => setStatus('idle')} className="w-full bg-white/5 py-4 rounded-xl font-bold">Создать ещё одну</button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
