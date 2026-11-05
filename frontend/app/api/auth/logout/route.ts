import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/v1";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("hrms_token")?.value;

  if (token) {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Best-effort logout with backend
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.cookies.delete("hrms_token");

  return response;
}
