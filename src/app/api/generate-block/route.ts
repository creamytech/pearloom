import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

export async function POST(req: NextRequest) {
  try {
    const { prompt, systemPrompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\nUser request: ${prompt}\n\nReturn ONLY valid JSON, no markdown, no backticks.`
      : `Generate a JSON chapter block for a wedding website. User request: "${prompt}"\n\nReturn ONLY valid JSON:\n{"title":"...","subtitle":"...","description":"...","mood":"...","date":"2024-06-15"}`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 512 },
      }),
    });

    const data = await res.json();
    const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
    const block = JSON.parse(cleaned);

    return NextResponse.json({ block });
  } catch (err) {
    console.error('generate-block error:', err);
    // Always return a usable fallback so editor never fails
    return NextResponse.json({
      block: {
        title: 'A Beautiful Moment',
        subtitle: 'Written by Pearloom AI',
        description: 'Every love story has chapters that words can barely capture. This is one of them — a moment frozen in time, waiting to be told.',
        mood: 'romantic',
        date: new Date().toISOString().slice(0, 10),
      },
    });
  }
}
