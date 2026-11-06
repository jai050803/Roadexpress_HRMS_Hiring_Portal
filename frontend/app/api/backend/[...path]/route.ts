import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/v1";

async function proxyRequest(request: NextRequest, { params }: { params: { path: string[] } }) {
  const token = request.cookies.get("hrms_token")?.value;
  const path = (params.path || []).join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/${path}${search}`;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const contentType = request.headers.get("content-type");
  let body: any = undefined;

  if (["POST", "PATCH", "PUT"].includes(request.method)) {
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = formData;
      // Fetch will automatically generate multipart boundary header
    } else {
      if (contentType) {
        headers["Content-Type"] = contentType;
      }
      body = await request.text();
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // @ts-ignore
      duplex: body ? "half" : undefined,
    });

    const resContentType = backendRes.headers.get("content-type") || "";
    if (resContentType.includes("application/json")) {
      const data = await backendRes.json();
      const response = NextResponse.json(data, { status: backendRes.status });
      if (backendRes.status === 401) {
        response.cookies.delete("hrms_token");
      }
      return response;
    } else {
      const rawText = await backendRes.text();
      const resHeaders: Record<string, string> = {
        "Content-Type": resContentType || "text/plain",
      };
      const contentDisp = backendRes.headers.get("content-disposition");
      if (contentDisp) {
        resHeaders["Content-Disposition"] = contentDisp;
      }
      const response = new NextResponse(rawText, {
        status: backendRes.status,
        headers: resHeaders,
      });
      if (backendRes.status === 401) {
        response.cookies.delete("hrms_token");
      }
      return response;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "proxy_error", message: err.message || "Failed to reach backend" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}
