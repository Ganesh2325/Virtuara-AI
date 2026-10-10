import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    const res = await fetch(`${API_URL}/api/v1/auth/reset-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "Reset failed" }, { status: res.status });
    }
    return NextResponse.json({ success: true, message: data.message });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
