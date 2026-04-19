"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Loader2, BookOpen, Wand2,
  History, Book, AlertCircle, CheckCircle2, ChevronRight,
  UserPlus, Trash2, Users,
} from "lucide-react";
import { generateSchema, CustomCharacter } from "@/lib/validate";

interface SceneConstructorProps {
  animeId: number;
  animeName: string;
  endingContext: string;
  isOpen?: boolean;
  onClose?: () => void;
  initialContinuePrevious?: boolean;
}

type Status = 'idle' | 'loading' | 'streaming' | 'success' | 'error';
type GenerationStage = 'idle' | 'analyzing' | 'writing' | 'formatting' | 'done' | 'error';
type Mood = 'Экшн' | 'Драма' | 'Романтика' | 'Юмор';

const STAGES: { key: GenerationStage; label: string; icon: string }[] = [
  { key: 'analyzing',  label: 'Анализируем', icon: '🔍' },
  { key: 'writing',    label: 'Пишем',       icon: '✍️' },
  { key: 'formatting', label: 'Форматируем', icon: '✨' },
];

const STAGE_ORDER: GenerationStage[] = ['analyzing', 'writing', 'formatting', 'done'];

function stageIndex(stage: GenerationStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
}
function ssRemove(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

export default function SceneConstructor({
  animeId,
  animeName,
  endingContext: officialEndingContext,
  isOpen,
  onClose,
  initialContinuePrevious = false,
}: SceneConstructorProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firstChunkReceived = useRef(false);

  const [status, setStatus] = useState<Status>('idle');
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [streamedContent, setStreamedContent] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);

  const [formData, setFormData] = useState({
    mood: 'Экшн' as Mood,
    sceneType: 'continuation' as 'continuation' | 'alternative',
    endingContext: "",
    startingPoint: "",
    continuePrevious: initialContinuePrevious,
    isPublic: false,
  });

  const [customCharacters, setCustomCharacters] = useState<CustomCharacter[]>([]);
  const [newChar, setNewChar] = useState<CustomCharacter>({ name: "", role: "" });

  // Восстановление черновика при монтировании
  useEffect(() => {
    const saved = ssGet(`anicon_draft_${animeId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({
          ...prev,
          mood: parsed.mood ?? prev.mood,
          sceneType: parsed.sceneType ?? prev.sceneType,
          endingContext: parsed.endingContext ?? prev.endingContext,
          startingPoint: parsed.startingPoint ?? prev.startingPoint,
        }));
        if (parsed.customCharacters) setCustomCharacters(parsed.customCharacters);
      } catch { /* ignore corrupt data */ }
    }
  }, [animeId]);

  // Синхронизация continuePrevious при открытии
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, continuePrevious: initialContinuePrevious }));
    }
  }, [isOpen, initialContinuePrevious]);

  // Автосохранение
  useEffect(() => {
    ssSet(`anicon_draft_${animeId}`, JSON.stringify({
      mood: formData.mood,
      sceneType: formData.sceneType,
      endingContext: formData.endingContext,
      startingPoint: formData.startingPoint,
      customCharacters,
    }));
  }, [animeId, formData.mood, formData.sceneType, formData.endingContext, formData.startingPoint, customCharacters]);

  useEffect(() => {
    if (generationStage === 'done') ssRemove(`anicon_draft_${animeId}`);
  }, [generationStage, animeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streamedContent]);

  function clearStageTimers() {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  }

  function addCharacter() {
    if (!newChar.name.trim() || customCharacters.length >= 5) return;
    setCustomCharacters(prev => [...prev, { name: newChar.name.trim(), role: newChar.role.trim() }]);
    setNewChar({ name: "", role: "" });
  }

  function removeCharacter(idx: number) {
    setCustomCharacters(prev => prev.filter((_, i) => i !== idx));
  }

  const handleGenerate = async () => {
    setErrorMessage(null);
    setNeedsLogin(false);
    setStreamedContent("");
    setChapterTitle("");
    firstChunkReceived.current = false;

    const validation = generateSchema.safeParse({
      animeId,
      ...formData,
      endingContext: formData.endingContext || officialEndingContext,
      customCharacters,
    });

    if (!validation.success) {
      setErrorMessage("Пожалуйста, проверьте правильность заполнения полей.");
      return;
    }

    setStatus('loading');
    setGenerationStage('analyzing');
    clearStageTimers();

    const t1 = setTimeout(() => setGenerationStage('writing'),    3000);
    const t2 = setTimeout(() => setGenerationStage('formatting'), 6000);
    stageTimers.current = [t1, t2];

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        let msg = "Произошла ошибка при создании истории.";
        try {
          const errData = await response.json();
          msg = errData.message || errData.error || msg;
        } catch {
          const textErr = await response.text().catch(() => "");
          if (textErr) msg = textErr.slice(0, 100);
        }
        throw new Error(msg);
      }

      setStatus('streaming');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === 'title') setChapterTitle(data.payload);

            if (data.type === 'content') {
              if (!firstChunkReceived.current) {
                firstChunkReceived.current = true;
                clearStageTimers();
                setGenerationStage('writing');
              }
              setStreamedContent(prev => prev + data.payload);
            }

            if (data.type === 'done') {
              clearStageTimers();
              setGenerationStage('done');
              const chapterId = data.chapterId || data.payload;
              setGeneratedId(
                chapterId && chapterId !== 'guest' && chapterId !== 'undefined'
                  ? chapterId
                  : null
              );
              setStatus('success');
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err: any) {
      clearStageTimers();
      setGenerationStage('error');
      setStatus('error');
      if (err.message === 'LIMIT_REACHED') {
        setErrorMessage("Вы исчерпали лимит генераций. Поддержите проект чтобы получить больше.");
        setNeedsLogin(true);
      } else if (err.message === 'UNAUTHORIZED') {
        setErrorMessage("Войдите в аккаунт чтобы создавать главы.");
        setNeedsLogin(true);
      } else {
        setErrorMessage("Произошла ошибка при создании истории. Попробуйте позже.");
      }
    }
  };

  if (!isOpen) return null;

  const showPreview = status === 'streaming' || status === 'success';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={status === 'streaming' ? undefined : onClose}
          className="absolute inset-0 bg-[#0D0D1A]/95 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl bg-[#1A1A2E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {formData.continuePrevious
                  ? <History className="w-5 h-5 text-[#E8409A]" />
                  : <Sparkles className="w-5 h-5 text-[#E8409A]" />}
                {status === 'streaming' || status === 'success'
                  ? (chapterTitle || "Создание главы")
                  : "Настрой свою главу"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{animeName}</p>
            </div>
            {status !== 'streaming' && (
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8" ref={scrollRef}>

            {/* ── ФОРМА ── */}
            {status === 'idle' && (
              <div className="space-y-8">

                {/* Финал оригинала */}
                {officialEndingContext && (
                  <div className="p-5 rounded-2xl bg-[#E8409A]/5 border border-[#E8409A]/20 space-y-2">
                    <h4 className="text-xs font-bold text-[#E8409A] flex items-center gap-2 uppercase tracking-widest">
                      <Book className="w-3 h-3" /> Финал в аниме:
                    </h4>
                    <p className="text-sm text-gray-300 italic leading-relaxed">
                      &quot;{officialEndingContext}&quot;
                    </p>
                  </div>
                )}

                {/* Настроение */}
                <div className="space-y-4">
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Настроение истории</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      { mood: 'Экшн',     icon: '⚔️', desc: 'Конфликт и экшн' },
                      { mood: 'Драма',    icon: '🌧️', desc: 'Эмоции и переживания' },
                      { mood: 'Романтика',icon: '🌸', desc: 'Чувства и близость' },
                      { mood: 'Юмор',     icon: '😄', desc: 'Лёгкая комедия' },
                    ] as { mood: Mood; icon: string; desc: string }[]).map(({ mood: m, icon, desc }) => (
                      <button
                        key={m}
                        onClick={() => setFormData({ ...formData, mood: m })}
                        className={`py-3 px-2 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                          formData.mood === m
                            ? 'bg-[#E8409A] border-[#E8409A] shadow-lg shadow-[#E8409A]/20'
                            : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/8'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                        <span className="text-sm font-semibold">{m}</span>
                        <span className={`text-[10px] leading-tight text-center ${formData.mood === m ? 'text-white/80' : 'text-gray-500'}`}>{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Тип сцены */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, sceneType: 'continuation' })}
                    className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                      formData.sceneType === 'continuation'
                        ? 'bg-[#E8409A]/10 border-[#E8409A]'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <BookOpen className={`w-6 h-6 ${formData.sceneType === 'continuation' ? 'text-[#E8409A]' : 'text-gray-500'}`} />
                    <div>
                      <div className="text-sm font-bold text-gray-200">Продолжение</div>
                      <div className="text-xs text-gray-500 mt-1">Логическое развитие финала</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, sceneType: 'alternative' })}
                    className={`p-5 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                      formData.sceneType === 'alternative'
                        ? 'bg-[#E8409A]/10 border-[#E8409A]'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <Wand2 className={`w-6 h-6 ${formData.sceneType === 'alternative' ? 'text-[#E8409A]' : 'text-gray-500'}`} />
                    <div>
                      <div className="text-sm font-bold text-gray-200">Альт. концовка</div>
                      <div className="text-xs text-gray-500 mt-1">Всё могло быть иначе...</div>
                    </div>
                  </button>
                </div>

                {/* Текстовые поля */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      С чего начать главу? <span className="text-gray-600 normal-case font-normal">(необязательно)</span>
                    </label>
                    <textarea
                      value={formData.startingPoint}
                      onChange={(e) => setFormData({ ...formData, startingPoint: e.target.value })}
                      placeholder="Например: Спустя 5 лет после финала, Наруто стал Хокаге и..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 transition-all resize-none placeholder:text-gray-600"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Свой вариант финала / точка отправления <span className="text-gray-600 normal-case font-normal">(необязательно)</span>
                    </label>
                    <textarea
                      value={formData.endingContext}
                      onChange={(e) => setFormData({ ...formData, endingContext: e.target.value })}
                      placeholder="Если хочешь изменить как закончилось аниме — опиши здесь..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 transition-all resize-none placeholder:text-gray-600"
                    />
                  </div>
                </div>

                {/* ── ПЕРСОНАЖИ ── */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <button
                    onClick={() => setShowCharacters(v => !v)}
                    className="flex items-center gap-3 text-sm font-semibold text-gray-300 hover:text-white transition-colors group w-full"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Users className="w-4 h-4 text-[#E8409A]" />
                      Вписать себя или друга в историю
                      {customCharacters.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-[#E8409A]/20 text-[#E8409A] rounded-full text-xs font-bold">
                          {customCharacters.length}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-600 text-xs">{showCharacters ? "Скрыть ▲" : "Открыть ▼"}</span>
                  </button>

                  {showCharacters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Добавь до 5 персонажей — себя, друзей или любых новых героев. Они органично впишутся в сюжет рядом с оригинальными героями.
                      </p>

                      {/* Список добавленных */}
                      {customCharacters.length > 0 && (
                        <div className="space-y-2">
                          {customCharacters.map((c, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                              <div className="w-8 h-8 rounded-full bg-[#E8409A]/15 border border-[#E8409A]/30 flex items-center justify-center text-[#E8409A] flex-shrink-0 text-sm font-bold">
                                {c.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white">{c.name}</p>
                                {c.role && <p className="text-xs text-gray-400 mt-0.5">{c.role}</p>}
                              </div>
                              <button
                                onClick={() => removeCharacter(idx)}
                                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Форма добавления нового */}
                      {customCharacters.length < 5 && (
                        <div className="space-y-3 p-4 bg-white/3 rounded-2xl border border-dashed border-white/10">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Имя</label>
                              <input
                                type="text"
                                value={newChar.name}
                                onChange={e => setNewChar(p => ({ ...p, name: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addCharacter()}
                                placeholder="Например: Артём"
                                maxLength={50}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 placeholder:text-gray-700"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Роль / описание</label>
                              <input
                                type="text"
                                value={newChar.role}
                                onChange={e => setNewChar(p => ({ ...p, role: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && addCharacter()}
                                placeholder="Друг главного героя"
                                maxLength={200}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#E8409A]/30 placeholder:text-gray-700"
                              />
                            </div>
                          </div>
                          <button
                            onClick={addCharacter}
                            disabled={!newChar.name.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E8409A]/10 hover:bg-[#E8409A]/20 border border-[#E8409A]/30 text-[#E8409A] rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UserPlus className="w-4 h-4" />
                            Добавить персонажа
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ── ПРОГРЕСС ── */}
            {(status === 'loading' || status === 'streaming') && (
              <div className="space-y-8 py-6">
                <div className="flex items-center justify-center gap-0">
                  {STAGES.map((stage, idx) => {
                    const active = stageIndex(generationStage) >= stageIndex(stage.key);
                    const isCurrent = generationStage === stage.key;
                    const isLast = idx === STAGES.length - 1;

                    return (
                      <div key={stage.key} className="flex items-center">
                        <motion.div
                          animate={{ scale: isCurrent ? 1.1 : 1, opacity: active ? 1 : 0.4 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-colors duration-500 ${
                            active
                              ? 'border-[#E8409A] bg-[#E8409A]/15'
                              : 'border-[#555577] bg-[#555577]/10'
                          }`}>
                            {isCurrent
                              ? <Loader2 className="w-5 h-5 text-[#E8409A] animate-spin" />
                              : <span>{stage.icon}</span>
                            }
                          </div>
                          <span className={`text-xs font-medium transition-colors duration-500 ${
                            active ? 'text-[#F0F0FF]' : 'text-[#555577]'
                          }`}>
                            {stage.label}
                          </span>
                        </motion.div>

                        {!isLast && (
                          <div className="w-16 mx-2 mb-5">
                            <div className="h-0.5 bg-[#555577] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-[#E8409A] rounded-full"
                                animate={{ width: stageIndex(generationStage) > idx ? '100%' : '0%' }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ПРЕДПРОСМОТР ── */}
            {showPreview && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mt-4 p-4 bg-[#1A1A2E] rounded-lg border border-[#252540] max-h-60 overflow-y-auto">
                  {streamedContent ? (
                    <p className="text-white text-sm leading-[1.6] whitespace-pre-wrap" style={{ fontFamily: 'inherit' }}>
                      {streamedContent}
                      {status === 'streaming' && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="inline-block w-2 h-4 bg-[#E8409A] ml-1 align-middle"
                        />
                      )}
                    </p>
                  ) : (
                    <p className="text-[#555577] text-sm italic">✨ Ожидание ответа...</p>
                  )}
                </div>

                {status === 'success' && (
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">История готова!</span>
                    </div>
                    {generatedId ? (
                      <button
                        onClick={() => router.push(`/chapter/${generatedId}`)}
                        className="bg-[#E8409A] hover:bg-[#d13589] px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#E8409A]/20 transition-all flex items-center gap-3"
                      >
                        Читать главу <ChevronRight className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="bg-white/5 hover:bg-white/10 px-10 py-4 rounded-2xl font-bold text-lg transition-all"
                      >
                        Закрыть
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ОШИБКА ── */}
            {status === 'error' && (
              <div className="py-20 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Ошибка генерации</h3>
                  <p className="text-gray-400 text-sm">{errorMessage}</p>
                </div>
                {needsLogin ? (
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-[#E8409A] hover:bg-[#d13589] px-10 py-4 rounded-2xl font-bold shadow-lg shadow-[#E8409A]/20 transition-all"
                  >
                    Войти / Зарегистрироваться
                  </button>
                ) : (
                  <button
                    onClick={() => { setStatus('idle'); setGenerationStage('idle'); }}
                    className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-xl font-bold transition-all"
                  >
                    Попробовать снова
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {status === 'idle' && (
            <div className="p-4 md:p-6 border-t border-white/5 bg-white/5 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    formData.isPublic
                      ? 'bg-[#E8409A] border-[#E8409A]'
                      : 'border-[#555577] bg-transparent group-hover:border-[#E8409A]/50'
                  }`}
                >
                  {formData.isPublic && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                  className="text-sm text-gray-300 group-hover:text-white transition-colors"
                >
                  🌐 Опубликовать в ленте сообщества
                </span>
              </label>

              {errorMessage && (
                <div className="text-red-400 text-sm flex items-center gap-2 px-2">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </div>
              )}
              <button
                onClick={handleGenerate}
                className="w-full bg-[#E8409A] hover:bg-[#d13589] py-4 md:py-5 rounded-2xl font-bold text-base md:text-xl shadow-lg shadow-[#E8409A]/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
              >
                Создать главу 🚀
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
