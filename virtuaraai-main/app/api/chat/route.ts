import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export async function POST(req: Request) {
  try {
    const { messages, subject, level, mode = "chat" } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const systemPrompt =
      mode === "quiz"
        ? `You are Aria, an AI quiz master for ${subject ?? "General Learning"} at ${level ?? "intermediate"} level.

Rules:
- Ask ONE clear question per turn (multiple choice preferred: A B C D)
- After the student answers, start with "✅ Correct!" or "❌ Incorrect."
- Give the right answer if wrong, with a brief explanation
- Then immediately ask the NEXT question
- After exactly 5 questions, output a final line: QUIZ_COMPLETE:X/5 (replace X with score)
- Keep each response under 120 words

Start by asking question 1.`
        : `You are Aria, an elite AI mentor on Virtuara AI.
Subject: ${subject ?? "General Learning"} | Level: ${level ?? "intermediate"}

Rules:
- Be concise, warm, and encouraging
- Ask ONE follow-up question or give ONE small challenge per response
- Use markdown for code/formulas/lists
- Keep responses under 150 words unless explaining something complex
- Adapt to the student — simple for beginners, rigorous for advanced`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: chatMessages,
      max_tokens: 512,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content ?? "";

    // Detect quiz completion
    const quizMatch = text.match(/QUIZ_COMPLETE:(\d+)\/(\d+)/);
    const quizScore = quizMatch ? parseInt(quizMatch[1]) : null;
    const quizTotal = quizMatch ? parseInt(quizMatch[2]) : null;

    return NextResponse.json({
      response: text.replace(/QUIZ_COMPLETE:\d+\/\d+/, "").trim(),
      quizScore,
      quizTotal,
    });
  } catch (err: any) {
    console.error("[Groq] Error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "AI service error" }, { status: 500 });
  }
}
