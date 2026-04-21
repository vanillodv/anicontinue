"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, BookOpen, Wand2,
  AlertCircle, CheckCircle2, ChevronRight,
  UserPlus, Trash2, Users, Globe,
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

type Status = "idle" | "loading" | "streaming" | "success" | "error";
type GenerationStage = "idle" | "analyzing" | "writing" | "formatting" | "done" | "error";
type Mood = "Экшн" | "Драма" | "Романтика" | "Юмор";

const STAGES: { key: GenerationStage; label: string; kanji: string }[] = [
  { key: "analyzing",  label: "Анализ",   kanji: "析" },
  { key: "writing",    label: "Пишем",    kanji: "書" },
  { key: "formatting", label: "Финал",    kanji: "整" },
];

const STAGE_ORDER: GenerationStage[] = ["analyzing", "writing", "formatting", "done"];

const MOODS: { mood: Mood; kanji: string; desc: string }[] = [
  { mood: "Экшн",      kanji: "戦", desc: "Конфликт и экшн" },
  { mood: "Драма",     kanji: "涙", desc: "Эмоции и переживания" },
  { mood: "Романтика", kanji: "愛", desc: "Чувства и близость" },
  { mood: "Юмор",      kanji: "笑", desc: "Лёгкая комедия" },
];

function stageIndex(stage: GenerationStage): number {
  return STAGE_ORDER.indexOf(stage);
}

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch {}
}
function ssRemove(key: string): void {
  try { sessionStorage.removeItem(key); } catch {}
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

  const [status, setStatus] = useState<Status>("idle");
  const [generationStage, setGenerationStage] = useState<GenerationStage>("idle");
  const [streamedContent, setStreamedContent] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);

  const [formData, setFormData] = useState({
    mood: "Экшн" as Mood,
    sceneType: "continuation" as "continuation" | "alternative",
    endingContext: "",
    startingPoint: "",
    continuePrevious: initialContinuePrevious,
    isPublic: false,
  });

  const [customCharacters, setCustomCharacters] = useState<CustomCharacter[]>([]);
  const [newChar, setNewChar] = useState<CustomCharacter>({ name: "", role: "" });

  // Восстановление черновика
  useEffect(() => {
    const saved = ssGet(`anicon_draft_${animeId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({
          ...prev,
          mood: parsed.mood ?? prev.mood,
          sceneType: parsed.sceneType ?? prev.sceneType,
          endingContext: parsed.endingContext ?? prev.endingContext,
          startingPoint: parsed.startingPoint ?? prev.startingPoint,
        }));
        if (parsed.customCharacters) setCustomCharacters(parsed.customCharacters);
      } catch {}
    }
  }, [animeId]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({ ...prev, continuePrevious: initialContinuePrevious }));
    }
  }, [isOpen, initialContinuePrevious]);

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
    if (generationStage === "done") ssRemove(`anicon_draft_${animeId}`);
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
    setCustomCharacters((prev) => [...prev, { name: newChar.name.trim(), role: newChar.role.trim() }]);
    setNewChar({ name: "", role: "" });
  }

  function removeCharacter(idx: number) {
    setCustomCharacters((prev) => prev.filter((_, i) => i !== idx));
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

    setStatus("loading");
    setGenerationStage("analyzing");
    clearStageTimers();

    const t1 = setTimeout(() => setGenerationStage("writing"),    3000);
    const t2 = setTimeout(() => setGenerationStage("formatting"), 6000);
    stageTimers.current = [t1, t2];

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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

      setStatus("streaming");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter((l) => l.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === "title") setChapterTitle(data.payload);
            if (data.type === "content") {
              if (!firstChunkReceived.current) {
                firstChunkReceived.current = true;
                clearStageTimers();
                setGenerationStage("writing");
              }
              setStreamedContent((prev) => prev + data.payload);
            }
            if (data.type === "done") {
              clearStageTimers();
              setGenerationStage("done");
              const chapterId = data.chapterId || data.payload;
              setGeneratedId(
                chapterId && chapterId !== "guest" && chapterId !== "undefined" ? chapterId : null
              );
              setStatus("success");
            }
          } catch {}
        }
      }
    } catch (err: any) {
      clearStageTimers();
      setGenerationStage("error");
      setStatus("error");
      const raw = (err?.message || "").trim();
      // Специальные кейсы с CTA
      if (raw === "LIMIT_REACHED") {
        setErrorMessage("Вы исчерпали лимит генераций. Поддержите проект чтобы получить больше.");
        setNeedsLogin(true);
      } else if (raw === "UNAUTHORIZED") {
        setErrorMessage("Войдите в аккаунт чтобы создавать главы.");
        setNeedsLogin(true);
      } else if (raw === "BANNED") {
        setErrorMessage("Ваш аккаунт заблокирован. Обратитесь на support@anicontinue.ru.");
      } else if (raw === "RATE_LIMITED" || /слишком много запросов/i.test(raw)) {
        setErrorMessage("Слишком много запросов подряд. Подождите минуту и попробуйте снова.");
      } else if (raw === "ANIME_NOT_FOUND") {
        setErrorMessage("Аниме не найдено в каталоге. Обновите страницу.");
      } else if (/overloaded|529/i.test(raw)) {
        setErrorMessage("AI-сервис временно перегружен. Попробуйте через минуту.");
      } else if (/timeout|timed out/i.test(raw)) {
        setErrorMessage("Превышено время ожидания. Попробуйте ещё раз — обычно со второй попытки работает.");
      } else if (raw && raw !== "Failed to fetch") {
        // Показываем реальный текст ошибки с сервера — лучше чем generic «попробуйте позже»
        setErrorMessage(raw.length > 200 ? raw.slice(0, 200) + "…" : raw);
      } else {
        setErrorMessage("Не удалось создать главу. Проверьте соединение и попробуйте ещё раз.");
      }
    }
  };

  if (!isOpen) return null;

  const showPreview = status === "streaming" || status === "success";

  const textareaStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid var(--line-strong)",
    borderRadius: 2,
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
    fontSize: 14,
    lineHeight: 1.55,
    padding: "12px 14px",
    resize: "none",
    outline: "none",
    width: "100%",
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={status === "streaming" ? undefined : onClose}
          className="absolute inset-0 backdrop-blur-md"
          style={{ background: "rgba(13,11,10,0.88)" }}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 18 }}
          className="relative w-full max-w-3xl flex flex-col max-h-[92vh]"
          style={{
            background: "var(--paper-2)",
            border: "1px solid var(--line-strong)",
            boxShadow: "0 30px 80px -10px rgba(0,0,0,0.9)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 md:px-7 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--line-strong)" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{ background: "var(--cinnabar)", color: "#fff", fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 20, transform: "rotate(-4deg)", borderRadius: 2 }}
              >
                {formData.continuePrevious ? "続" : "新"}
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                  {status === "streaming" || status === "success" ? "執筆中 · Writing" : "創作 · Scene Constructor"}
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 900,
                    fontSize: 18,
                    letterSpacing: "-0.01em",
                    color: "var(--ink)",
                    marginTop: 2,
                  }}
                >
                  {status === "streaming" || status === "success"
                    ? (chapterTitle || "Создание главы…")
                    : animeName}
                </h2>
              </div>
            </div>
            {status !== "streaming" && (
              <button
                onClick={onClose}
                className="p-2 transition-colors"
                style={{ color: "var(--ash)", border: "1px solid var(--line-strong)" }}
                aria-label="Закрыть"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7" ref={scrollRef}>
            {status === "idle" && (
              <div className="space-y-8">

                {officialEndingContext && (
                  <div
                    className="p-4"
                    style={{
                      background: "rgba(232,93,79,0.06)",
                      border: "1px solid rgba(232,93,79,0.35)",
                      borderLeft: "3px solid var(--cinnabar)",
                    }}
                  >
                    <div
                      className="mb-2"
                      style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cinnabar)" }}
                    >
                      Финал в аниме
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)", opacity: 0.85, fontStyle: "italic" }}>
                      «{officialEndingContext}»
                    </p>
                  </div>
                )}

                {/* Mood */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                    Настроение · 雰囲気
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {MOODS.map(({ mood: m, kanji, desc }) => {
                      const active = formData.mood === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setFormData({ ...formData, mood: m })}
                          className="py-4 px-2 flex flex-col items-center gap-1.5 transition-all"
                          style={{
                            background: active ? "var(--cinnabar)" : "transparent",
                            border: `1px solid ${active ? "var(--cinnabar)" : "var(--line-strong)"}`,
                            color: active ? "#fff" : "var(--ink)",
                            borderRadius: 2,
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-jp)", fontWeight: 900, fontSize: 22 }}>{kanji}</span>
                          <span style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 14 }}>{m}</span>
                          <span style={{ fontSize: 10, opacity: 0.7, textAlign: "center", lineHeight: 1.2 }}>{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scene type */}
                <div>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                    Тип сцены · 場面
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    {[
                      { key: "continuation", Icon: BookOpen, title: "Продолжение", desc: "Логическое развитие финала" },
                      { key: "alternative",  Icon: Wand2,    title: "Альт. концовка", desc: "Всё могло быть иначе…" },
                    ].map(({ key, Icon, title, desc }) => {
                      const active = formData.sceneType === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setFormData({ ...formData, sceneType: key as "continuation" | "alternative" })}
                          className="p-4 text-left flex items-center gap-3 transition-all"
                          style={{
                            background: active ? "rgba(232,93,79,0.08)" : "transparent",
                            border: `1px solid ${active ? "var(--cinnabar)" : "var(--line-strong)"}`,
                            borderRadius: 2,
                          }}
                        >
                          <Icon className="w-5 h-5 shrink-0" style={{ color: active ? "var(--cinnabar)" : "var(--ash)" }} />
                          <div>
                            <div style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 15, color: "var(--ink)" }}>{title}</div>
                            <div style={{ fontSize: 12, color: "var(--ash)", marginTop: 2 }}>{desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Text fields */}
                <div className="pt-5" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="space-y-5">
                    <div>
                      <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                        С чего начать главу? <span style={{ textTransform: "none", letterSpacing: "normal", opacity: 0.7 }}>— необязательно</span>
                      </label>
                      <textarea
                        value={formData.startingPoint}
                        onChange={(e) => setFormData({ ...formData, startingPoint: e.target.value })}
                        placeholder="Например: Спустя 5 лет после финала, Наруто стал Хокаге и…"
                        rows={2}
                        className="mt-3"
                        style={textareaStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ash)" }}>
                        Свой финал / точка отправления <span style={{ textTransform: "none", letterSpacing: "normal", opacity: 0.7 }}>— необязательно</span>
                      </label>
                      <textarea
                        value={formData.endingContext}
                        onChange={(e) => setFormData({ ...formData, endingContext: e.target.value })}
                        placeholder="Если хочешь изменить как закончилось аниме — опиши здесь…"
                        rows={2}
                        className="mt-3"
                        style={textareaStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* Characters */}
                <div className="pt-5" style={{ borderTop: "1px solid var(--line)" }}>
                  <button
                    onClick={() => setShowCharacters((v) => !v)}
                    className="flex items-center gap-3 w-full"
                    style={{ color: "var(--ink)" }}
                  >
                    <Users className="w-4 h-4" style={{ color: "var(--cinnabar)" }} />
                    <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 15, flex: 1, textAlign: "left" }}>
                      Вписать себя или друга в историю
                    </span>
                    {customCharacters.length > 0 && (
                      <span
                        style={{
                          background: "rgba(232,93,79,0.15)",
                          border: "1px solid rgba(232,93,79,0.35)",
                          color: "var(--cinnabar)",
                          padding: "2px 8px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {customCharacters.length}
                      </span>
                    )}
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ash)" }}>
                      {showCharacters ? "Скрыть ▲" : "Открыть ▼"}
                    </span>
                  </button>

                  {showCharacters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 space-y-4"
                    >
                      <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ash)" }}>
                        До 5 персонажей — себя, друзей или новых героев. Они впишутся в сюжет рядом с оригинальными героями.
                      </p>

                      {customCharacters.length > 0 && (
                        <div className="space-y-2">
                          {customCharacters.map((c, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3"
                              style={{ background: "var(--paper)", border: "1px solid var(--line-strong)" }}
                            >
                              <div
                                className="w-8 h-8 flex items-center justify-center shrink-0"
                                style={{
                                  background: "rgba(232,93,79,0.15)",
                                  border: "1px solid rgba(232,93,79,0.35)",
                                  color: "var(--cinnabar)",
                                  fontFamily: "var(--font-serif)",
                                  fontWeight: 900,
                                  fontSize: 14,
                                }}
                              >
                                {c.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{c.name}</p>
                                {c.role && <p style={{ fontSize: 12, color: "var(--ash)", marginTop: 2 }}>{c.role}</p>}
                              </div>
                              <button
                                onClick={() => removeCharacter(idx)}
                                style={{ color: "var(--ash)" }}
                                className="shrink-0"
                                aria-label="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {customCharacters.length < 5 && (
                        <div
                          className="p-4 space-y-3"
                          style={{ background: "var(--paper)", border: "1px dashed var(--line-strong)" }}
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ash)" }}>
                                Имя
                              </label>
                              <input
                                type="text"
                                value={newChar.name}
                                onChange={(e) => setNewChar((p) => ({ ...p, name: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && addCharacter()}
                                placeholder="Например: Артём"
                                maxLength={50}
                                className="mt-2 w-full"
                                style={{ ...textareaStyle, padding: "8px 12px", fontSize: 13 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ash)" }}>
                                Роль / описание
                              </label>
                              <input
                                type="text"
                                value={newChar.role}
                                onChange={(e) => setNewChar((p) => ({ ...p, role: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && addCharacter()}
                                placeholder="Друг главного героя"
                                maxLength={200}
                                className="mt-2 w-full"
                                style={{ ...textareaStyle, padding: "8px 12px", fontSize: 13 }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={addCharacter}
                            disabled={!newChar.name.trim()}
                            className="ac-btn disabled:opacity-40"
                            style={{ padding: "9px 16px", fontSize: 11 }}
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Добавить персонажа
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Progress */}
            {(status === "loading" || status === "streaming") && (
              <div className="py-8">
                <div className="flex items-center justify-center gap-0">
                  {STAGES.map((stage, idx) => {
                    const active = stageIndex(generationStage) >= stageIndex(stage.key);
                    const isCurrent = generationStage === stage.key;
                    const isLast = idx === STAGES.length - 1;
                    return (
                      <div key={stage.key} className="flex items-center">
                        <motion.div
                          animate={{ scale: isCurrent ? 1.08 : 1, opacity: active ? 1 : 0.4 }}
                          transition={{ duration: 0.3 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <div
                            className="w-12 h-12 flex items-center justify-center transition-colors duration-500"
                            style={{
                              border: `2px solid ${active ? "var(--cinnabar)" : "var(--line-strong)"}`,
                              background: active ? "rgba(232,93,79,0.12)" : "transparent",
                              color: active ? "var(--cinnabar)" : "var(--ash)",
                              fontFamily: "var(--font-jp)",
                              fontWeight: 900,
                              fontSize: 22,
                            }}
                          >
                            {isCurrent ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>{stage.kanji}</span>}
                          </div>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              color: active ? "var(--ink)" : "var(--ash)",
                              opacity: active ? 1 : 0.5,
                            }}
                          >
                            {stage.label}
                          </span>
                        </motion.div>
                        {!isLast && (
                          <div className="w-14 mx-2 mb-5">
                            <div className="h-px relative" style={{ background: "var(--line-strong)" }}>
                              <motion.div
                                className="absolute inset-y-0 left-0"
                                style={{ background: "var(--cinnabar)" }}
                                animate={{ width: stageIndex(generationStage) > idx ? "100%" : "0%" }}
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

            {/* Preview */}
            {showPreview && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div
                  className="mt-4 p-5 max-h-72 overflow-y-auto"
                  style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
                >
                  {streamedContent ? (
                    <p
                      className="whitespace-pre-wrap"
                      style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.7, color: "var(--ink)" }}
                    >
                      {streamedContent}
                      {status === "streaming" && (
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="inline-block w-1.5 h-4 ml-1 align-middle"
                          style={{ background: "var(--cinnabar)" }}
                        />
                      )}
                    </p>
                  ) : (
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ash)" }}>
                      Ожидание ответа…
                    </p>
                  )}
                </div>

                {status === "success" && (
                  <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2" style={{ color: "#86EFAC" }}>
                      <CheckCircle2 className="w-5 h-5" />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                        История готова
                      </span>
                    </div>
                    {generatedId ? (
                      <button onClick={() => router.push(`/chapter/${generatedId}`)} className="ac-btn cinnabar">
                        Читать главу <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={onClose} className="ac-btn">Закрыть</button>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="py-16 flex flex-col items-center text-center space-y-5">
                <div
                  className="w-14 h-14 flex items-center justify-center"
                  style={{ background: "rgba(232,93,79,0.12)", border: "1px solid var(--cinnabar)", color: "var(--cinnabar)" }}
                >
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 900, fontSize: 20, color: "var(--ink)" }}>Ошибка генерации</h3>
                  <p className="mt-2" style={{ fontSize: 13.5, color: "var(--ash)" }}>{errorMessage}</p>
                </div>
                {needsLogin ? (
                  <button onClick={() => router.push("/login")} className="ac-btn cinnabar">
                    Войти / Зарегистрироваться <span className="arr">→</span>
                  </button>
                ) : (
                  <button onClick={() => { setStatus("idle"); setGenerationStage("idle"); }} className="ac-btn">
                    Попробовать снова
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {status === "idle" && (
            <div
              className="px-5 md:px-7 py-5 space-y-4"
              style={{ borderTop: "1px solid var(--line-strong)", background: "rgba(242,235,217,0.02)" }}
            >
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, isPublic: !prev.isPublic }))}
                  className="w-5 h-5 flex items-center justify-center transition-all shrink-0"
                  style={{
                    background: formData.isPublic ? "var(--cinnabar)" : "transparent",
                    border: `2px solid ${formData.isPublic ? "var(--cinnabar)" : "var(--line-strong)"}`,
                    borderRadius: 2,
                  }}
                >
                  {formData.isPublic && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => setFormData((prev) => ({ ...prev, isPublic: !prev.isPublic }))}
                  className="flex items-center gap-2"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink)" }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Опубликовать в ленте сообщества
                </span>
              </label>

              {errorMessage && (
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ border: "1px solid var(--cinnabar)", color: "var(--cinnabar)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em" }}
                >
                  <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
                </div>
              )}

              <button onClick={handleGenerate} className="ac-btn cinnabar w-full justify-center" style={{ padding: "14px", fontSize: 13 }}>
                Создать главу <span className="arr">→</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
