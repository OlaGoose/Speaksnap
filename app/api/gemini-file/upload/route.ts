/**
 * Gemini File API upload route.
 * Accepts a single file via multipart/form-data and uploads it to Google's File API.
 * Supports direct upload from same origin (e.g. localhost:3000/gemini-files).
 * Uses env: NEXT_PUBLIC_GEMINI_API_KEY or GEMINI_API_KEY.
 */

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import path from 'path';

const GEMINI_API_KEY =
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

// Official doc uses 5s between polls; 2s is acceptable for faster feedback
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_WAIT_MS = 120000; // 2 min

function getMimeFromName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Missing GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY' },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'No file provided. Send a single file in form field "file".' },
      { status: 400 }
    );
  }

  const displayName = file.name;
  const mimeType = file.type || getMimeFromName(displayName);

  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to read file' },
      { status: 400 }
    );
  }

  // Use Blob so SDK works in Node/Next without temp file path issues
  const blob = new Blob([bytes], { type: mimeType });

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let uploaded: { name?: string; state?: string; uri?: string; displayName?: string; mimeType?: string; sizeBytes?: string; createTime?: string; expireTime?: string };

  try {
    uploaded = await ai.files.upload({
      file: blob,
      config: {
        displayName,
        mimeType,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const cause = e instanceof Error && e.cause != null ? e.cause : null;
    const detail = cause != null ? String(cause) : undefined;
    const code = cause && typeof cause === 'object' && 'code' in cause ? (cause as { code: string }).code : undefined;
    const stack = process.env.NODE_ENV === 'development' && e instanceof Error ? e.stack : undefined;
    const isNetwork =
      /fetch failed|sending request|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|socket/i.test(msg + (detail ?? ''));
    const hint = isNetwork
      ? 'Server cannot reach Google (generativelanguage.googleapis.com). Check network, VPN, proxy, or firewall; or run from a region where Google APIs are accessible.'
      : undefined;
    return NextResponse.json(
      { error: msg, detail, code, hint, ...(stack && { stack }) },
      { status: 500 }
    );
  }

  if (!uploaded?.name) {
    return NextResponse.json(
      { error: 'Upload succeeded but no file name returned from API.', detail: String(uploaded) },
      { status: 500 }
    );
  }

  // Wait for processing (per official docs: https://ai.google.dev/gemini-api/docs/document-processing#large-pdfs)
  let fileInfo = uploaded;
  const start = Date.now();
  try {
    while (fileInfo.state === 'PROCESSING' && Date.now() - start < POLL_MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      fileInfo = await ai.files.get({ name: uploaded.name });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to poll file status';
    const detail = e instanceof Error && e.cause != null ? String(e.cause) : undefined;
    return NextResponse.json(
      { error: msg, detail, name: uploaded.name },
      { status: 500 }
    );
  }

  if (fileInfo.state === 'FAILED') {
    return NextResponse.json(
      { error: 'File processing failed.', name: fileInfo.name },
      { status: 500 }
    );
  }

  return NextResponse.json({
    name: fileInfo.name,
    uri: fileInfo.uri,
    displayName: fileInfo.displayName,
    mimeType: fileInfo.mimeType,
    state: fileInfo.state,
    sizeBytes: fileInfo.sizeBytes,
    createTime: fileInfo.createTime,
    expireTime: fileInfo.expireTime,
  });
}
