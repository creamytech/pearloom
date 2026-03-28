'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/CoupleQuiz.tsx
// "How We Met" quiz — interactive trivia widget for wedding guests.
// Questions are generated from chapter data (locally or via API).
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { Chapter } from '@/types';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  emoji: string;
}

export interface CoupleQuizProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
  chapters: Chapter[];
}

// ── Local fallback: derive questions from chapter data without an API call ──
function generateQuestionsFromChapters(
  chapters: Chapter[],
  names: [string, string]
): QuizQuestion[] {
  const pool = chapters.slice(0, 8);
  const questions: QuizQuestion[] = [];

  const moodOptions = ['golden hour', 'summer haze', 'quiet storm', 'cozy winter', 'electric night', 'soft morning'];

  pool.forEach((c, i) => {
    if (questions.length >= 5) return;

    if (i === 0) {
      // First chapter → "how did the story begin" question
      questions.push({
        question: `How does ${names[0]} & ${names[1]}'s story begin?`,
        options: shuffleWithCorrect(
          `"${c.title}"`,
          ['A chance encounter', 'A mutual friend introduced them', 'At a work event']
        ),
        correctIndex: 0,
        emoji: '💑',
      });
    } else if (c.mood) {
      // Mood question
      const distractors = moodOptions.filter((m) => m !== c.mood).slice(0, 3);
      const opts = shuffleWithCorrect(c.mood, distractors);
      questions.push({
        question: `What was the mood of the chapter "${c.title}"?`,
        options: opts,
        correctIndex: opts.indexOf(c.mood),
        emoji: '💫',
      });
    } else if (c.location?.label) {
      // Location question
      const locDistractors = ['Paris, France', 'New York City', 'Tokyo, Japan', 'London, UK'].filter(
        (l) => l !== c.location?.label
      ).slice(0, 3);
      const opts = shuffleWithCorrect(c.location.label, locDistractors);
      questions.push({
        question: `Where did the "${c.title}" chapter take place?`,
        options: opts,
        correctIndex: opts.indexOf(c.location.label),
        emoji: '📍',
      });
    } else {
      // Generic chapter title recognition question
      const otherTitles = pool
        .filter((_, j) => j !== i)
        .map((ch) => `"${ch.title}"`)
        .slice(0, 3);
      const correctOpt = `"${c.title}"`;
      const opts = shuffleWithCorrect(correctOpt, otherTitles);
      questions.push({
        question: `Which chapter came ${i === 1 ? 'second' : `${i + 1}th`} in their story?`,
        options: opts,
        correctIndex: opts.indexOf(correctOpt),
        emoji: '📖',
      });
    }
  });

  return questions.slice(0, 5);
}

function shuffleWithCorrect(correct: string, distractors: string[]): string[] {
  const all = [correct, ...distractors.slice(0, 3)];
  // Fisher-Yates — deterministic enough for display purposes
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 4);
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export function CoupleQuiz({ coupleNames, vibeSkin, chapters }: CoupleQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [copied, setCopied] = useState(false);

  const { palette, fonts, accentSymbol } = vibeSkin;
  const [name1, name2] = coupleNames;

  const loadQuestions = useCallback(() => {
    setLoading(true);
    try {
      const generated = generateQuestionsFromChapters(chapters, coupleNames);
      setQuestions(generated);
    } finally {
      setLoading(false);
    }
  }, [chapters, coupleNames]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQuestion = questions[currentIndex];
  const total = questions.length;

  const handleAnswer = (optionIndex: number) => {
    if (answerState !== 'unanswered') return;
    setSelectedOption(optionIndex);
    const isCorrect = optionIndex === currentQuestion.correctIndex;
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswerState('unanswered');
    }
  };

  const handleShare = async () => {
    const text = `I scored ${score}/${total} on the ${name1} & ${name2} wedding quiz! 💑`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: do nothing silently
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswerState('unanswered');
    setScore(0);
    setFinished(false);
    loadQuestions();
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: `${fonts.heading}, Georgia, serif`,
    color: palette.ink,
    fontWeight: 400,
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
  };

  const cardStyle: React.CSSProperties = {
    background: palette.card,
    borderRadius: '1.5rem',
    border: `1px solid ${palette.accent}22`,
    boxShadow: `0 8px 40px ${palette.accent}14`,
    padding: '2.5rem',
    maxWidth: '640px',
    margin: '0 auto',
  };

  if (loading) {
    return (
      <section
        id="quiz"
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)',
          background: vibeSkin.sectionGradient || palette.subtle,
          textAlign: 'center',
        }}
      >
        <div style={{ color: palette.muted, fontFamily: `${fonts.body}, Inter, sans-serif` }}>
          Loading quiz…
        </div>
      </section>
    );
  }

  if (questions.length === 0) return null;

  return (
    <section
      id="quiz"
      style={{
        padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)',
        background: vibeSkin.sectionGradient || palette.subtle,
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              color: palette.accent,
            }}
          >
            <div
              style={{
                width: '60px',
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${palette.accent})`,
              }}
            />
            <span style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>{accentSymbol}</span>
            <div
              style={{
                width: '60px',
                height: '1px',
                background: `linear-gradient(270deg, transparent, ${palette.accent})`,
              }}
            />
          </div>
          <h2
            style={{
              ...headingStyle,
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              marginBottom: '0.75rem',
            }}
          >
            How Well Do You Know Us?
          </h2>
          <p
            style={{
              fontFamily: `${fonts.body}, Inter, sans-serif`,
              color: palette.muted,
              fontSize: '1rem',
              fontStyle: 'italic',
            }}
          >
            Test your knowledge of {name1} &amp; {name2}&apos;s love story
          </p>
        </motion.div>

        {/* Quiz card */}
        <AnimatePresence mode="wait">
          {finished ? (
            /* Final score screen */
            <motion.div
              key="score"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ ...cardStyle, textAlign: 'center' }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                {score === total ? '🎉' : score >= total / 2 ? '💫' : '💝'}
              </div>
              <h3
                style={{
                  ...headingStyle,
                  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                  marginBottom: '0.75rem',
                }}
              >
                You got {score}/{total}!
              </h3>
              <p
                style={{
                  fontFamily: `${fonts.body}, Inter, sans-serif`,
                  color: palette.muted,
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  marginBottom: '2rem',
                }}
              >
                {score === total
                  ? `Perfect score! You really know ${name1} & ${name2}!`
                  : score >= Math.ceil(total / 2)
                  ? `Nice! You know ${name1} & ${name2} pretty well!`
                  : `Keep getting to know ${name1} & ${name2} — their story is beautiful!`}
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleShare}
                  style={{
                    padding: '0.8rem 1.75rem',
                    borderRadius: '100px',
                    background: palette.accent,
                    color: '#fff',
                    border: 'none',
                    fontFamily: `${fonts.body}, Inter, sans-serif`,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                >
                  {copied ? '✓ Copied!' : `Share Score 💑`}
                </button>
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '0.8rem 1.75rem',
                    borderRadius: '100px',
                    background: 'transparent',
                    color: palette.accent,
                    border: `1.5px solid ${palette.accent}`,
                    fontFamily: `${fonts.body}, Inter, sans-serif`,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = `${palette.accent}10`; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          ) : (
            /* Question card */
            <motion.div
              key={`question-${currentIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              style={cardStyle}
            >
              {/* Progress bar */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: `${fonts.body}, Inter, sans-serif`,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: palette.muted,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Question {currentIndex + 1} of {total}
                  </span>
                  <span style={{ fontSize: '1rem' }}>{currentQuestion.emoji}</span>
                </div>
                <div
                  style={{
                    height: '4px',
                    borderRadius: '100px',
                    background: `${palette.accent}22`,
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: palette.accent,
                      borderRadius: '100px',
                    }}
                  />
                </div>
              </div>

              {/* Question */}
              <h3
                style={{
                  ...headingStyle,
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                  marginBottom: '1.75rem',
                  lineHeight: 1.4,
                }}
              >
                {currentQuestion.question}
              </h3>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {currentQuestion.options.map((option, i) => {
                  const isSelected = selectedOption === i;
                  const isCorrect = i === currentQuestion.correctIndex;
                  const revealed = answerState !== 'unanswered';

                  let bg = palette.subtle;
                  let borderColor = `${palette.accent}30`;
                  let textColor = palette.foreground;

                  if (revealed) {
                    if (isCorrect) {
                      bg = '#d1fae5';
                      borderColor = '#34d399';
                      textColor = '#065f46';
                    } else if (isSelected && !isCorrect) {
                      bg = '#fee2e2';
                      borderColor = '#f87171';
                      textColor = '#991b1b';
                    } else {
                      bg = palette.subtle;
                      borderColor = `${palette.accent}20`;
                      textColor = palette.muted;
                    }
                  } else if (isSelected) {
                    bg = `${palette.accent}18`;
                    borderColor = palette.accent;
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      whileHover={!revealed ? { scale: 1.015 } : {}}
                      whileTap={!revealed ? { scale: 0.98 } : {}}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.85rem 1.25rem',
                        borderRadius: '0.875rem',
                        border: `1.5px solid ${borderColor}`,
                        background: bg,
                        color: textColor,
                        fontFamily: `${fonts.body}, Inter, sans-serif`,
                        fontSize: '0.95rem',
                        fontWeight: isSelected || (revealed && isCorrect) ? 600 : 400,
                        textAlign: 'left',
                        cursor: revealed ? 'default' : 'pointer',
                        transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                        width: '100%',
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: revealed && isCorrect
                            ? '#34d399'
                            : revealed && isSelected && !isCorrect
                            ? '#f87171'
                            : `${palette.accent}18`,
                          color: revealed && (isCorrect || (isSelected && !isCorrect)) ? '#fff' : palette.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          transition: 'background 0.2s, color 0.2s',
                        }}
                      >
                        {revealed && isCorrect ? '✓' : revealed && isSelected && !isCorrect ? '✗' : String.fromCharCode(65 + i)}
                      </span>
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              {/* Answer feedback + Next button */}
              <AnimatePresence>
                {answerState !== 'unanswered' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: `${fonts.body}, Inter, sans-serif`,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: answerState === 'correct' ? '#059669' : '#dc2626',
                      }}
                    >
                      {answerState === 'correct'
                        ? `✓ That's right!`
                        : `The correct answer was: ${currentQuestion.options[currentQuestion.correctIndex]}`}
                    </span>
                    <button
                      onClick={handleNext}
                      style={{
                        padding: '0.7rem 1.5rem',
                        borderRadius: '100px',
                        background: palette.accent,
                        color: '#fff',
                        border: 'none',
                        fontFamily: `${fonts.body}, Inter, sans-serif`,
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                    >
                      {currentIndex + 1 >= total ? 'See My Score →' : 'Next Question →'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
