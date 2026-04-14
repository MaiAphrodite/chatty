import { NextRequest } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:4000";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.text();
  const cookie = req.headers.get("cookie") || "";

  const response = await fetch(
    `${API_URL}/chat/conversations/${id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body,
    },
  );

  if (!response.ok || !response.body) {
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
