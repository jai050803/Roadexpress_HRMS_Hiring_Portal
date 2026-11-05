import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/v1";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("hrms_token")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "unauthenticated", message: "No active session" },
      { status: 401 }
    );
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      const response = NextResponse.json(
        { error: "unauthorized", message: "Session expired or invalid" },
        { status: 401 }
      );
      response.cookies.delete("hrms_token");
      return response;
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: err.message || "Failed to contact auth server" },
      { status: 500 }
    );
  }
}
