import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_STREAM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 });
  }

  const { title, description, mood, vibeString, occasion } = await req.json();

  const prompt = `Rewrite the following ${occasion || 'wedding'} chapter description as flowing prose (3-4 sentences). Write in first person plural using "we", "our", and "us". Return ONLY the rewritten description — no JSON, no quotes, no labels, no preamble.

Chapter title: "${title || ''}"
Current description: "${description || ''}"
Mood: ${mood || 'romantic'}
Style/vibe: ${vibeString || ''}

Avoid these words entirely: journey, adventure, soulmate, fairy tale, magical, storybook.

Write something intimate, specific, and cinematic.`;

  const geminiRes = await fetch(`${GEMINI_STREAM_URL}?alt=sse&key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 512 },
    }),
  });

  if (!geminiRes.ok || !geminiRes.body) {
    return new Response(JSON.stringify({ error: 'Gemini request failed' }), { status: 502 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = geminiRes.body!.getReader();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice('data: '.length).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const event = `data: ${JSON.stringify({ type: 'chunk', text })}\n\n`;
              await writer.write(encoder.encode(event));
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Flush any remaining buffer content
      if (buffer.trim().startsWith('data: ')) {
        const jsonStr = buffer.trim().slice('data: '.length).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const event = `data: ${JSON.stringify({ type: 'chunk', text })}\n\n`;
              await writer.write(encoder.encode(event));
            }
          } catch {}
        }
      }

      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
    } catch (err) {
      console.error('Streaming error:', err);
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`));
      } catch {}
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
