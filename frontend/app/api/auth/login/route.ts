import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "validation_error", message: "Email and password are required" },
        { status: 400 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          error: data.detail?.error || "auth_failed",
          message: data.detail?.message || "Invalid email or password",
        },
        { status: backendRes.status }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged in successfully",
    });

    const cookieMaxAge = data.expires_in ? Number(data.expires_in) : 28800; // 8 hours default

    response.cookies.set({
      name: "hrms_token",
      value: data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: cookieMaxAge,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: err.message || "Failed to reach backend service" },
      { status: 500 }
    );
  }
}
