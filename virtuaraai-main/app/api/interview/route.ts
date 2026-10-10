import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export async function POST(req: Request) {
  try {
    const { messages, resumeText } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const systemPrompt = `You are Aria, a senior technical interviewer at a top tech company. You are adaptive, warm, encouraging, and thorough.

${resumeText ? `Candidate's resume:\n${resumeText}\n\n` : "No resume provided — conduct a general software engineering interview.\n\n"}

INTERVIEW FLOW — follow this sequence strictly:
1. Ask 2 warm-up questions (background, motivation, experience). ONE at a time, wait for each answer.
2. Ask 3–4 technical questions tailored to their background. Vary topics — never repeat a question already asked. Adjust difficulty based on their answers (if strong → harder; if struggling → supportive hints).
3. Give exactly ONE coding challenge using the marker format below. Pick a DIFFERENT problem every time — rotate topics: array manipulation, string parsing, hash maps, two pointers, sliding window, binary search, recursion, tree traversal, dynamic programming, sorting, linked lists, etc.

   CODE_CHALLENGE
   [Full problem statement with a concrete example: input, expected output, constraints]

4. When the candidate submits code, evaluate it using this EXACT format:

   Test Cases:
   ✓ Input: [...] → Expected: [...] → Got: [...] (PASS)
   ✗ Input: [...] → Expected: [...] → Got: [...] (FAIL — explain the bug)
   [Show 3–4 test cases: at least one happy path, one edge case, and one that exposes a bug if code is wrong]

   Complexity: Time O(...) | Space O(...)
   Feedback: [2–3 sentences on correctness, code quality, and one concrete improvement]

5. If the candidate says they don't know coding, can't solve it, or gives up:
   - Respond warmly: "That's completely okay! Let's work through it together step by step."
   - Give one progressive hint at a time — start with approach, then data structure, then algorithm sketch.
   - If they still can't write code, ask: "Can you explain your thinking or a brute-force approach?" and evaluate their reasoning.
   - Do NOT show another CODE_CHALLENGE.

6. After code evaluation AND at least 8 total candidate responses, close the interview warmly, then output:
   INTERVIEW_COMPLETE
   {"overallScore": <0-100>, "strengths": ["...", "...", "..."], "improvements": ["...", "...", "..."], "verdict": "..."}

STRICT RULES:
- ONE question per response — never combine multiple questions.
- Never repeat a topic or question already covered in this conversation.
- Keep responses under 150 words (except code evaluation, up to 300 words).
- Never output INTERVIEW_COMPLETE before the coding challenge has been given and the candidate has responded to it.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: (m.role === "ai" ? "assistant" : "user") as "assistant" | "user",
          content: m.content,
        })),
      ],
      max_tokens: 900,
      temperature: 0.82,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    const isCodeChallenge = raw.includes("CODE_CHALLENGE");
    const isComplete = raw.includes("INTERVIEW_COMPLETE");

    let response = raw;
    let challenge: string | null = null;
    let report = null;

    if (isCodeChallenge) {
      const idx = raw.indexOf("CODE_CHALLENGE");
      const before = raw.slice(0, idx).trim();
      challenge = raw.slice(idx).replace(/^CODE_CHALLENGE\s*/i, "").trim();
      response = before || "Here's a coding challenge for you. Take your time — and if you're unsure where to start, just ask!";
    }

    if (isComplete) {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { report = JSON.parse(jsonMatch[0]); } catch {}
      }
      response = raw.replace(/INTERVIEW_COMPLETE[\s\S]*/, "").trim();
    }

    return NextResponse.json({ response, isCodeChallenge, challenge, isComplete, report });
  } catch (err: any) {
    console.error("[Interview API]", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "AI service error" }, { status: 500 });
  }
}
