'use client';

/**
 * Standalone page: upload files to Google Gemini File API.
 * Decoupled from the main app; uses the same env key (NEXT_PUBLIC_GEMINI_API_KEY / GEMINI_API_KEY).
 * Supports PDF, TXT, MD, HTML, JSON, and other document types (per Gemini docs).
 */

import { useState, useRef } from 'react';

type FileResult = {
  name?: string;
  uri?: string;
  displayName?: string;
  mimeType?: string;
  state?: string;
  sizeBytes?: string;
  createTime?: string;
  expireTime?: string;
};

const ACCEPT =
  '.pdf,.txt,.md,.html,.htm,.json,.xml,.csv,application/pdf,text/plain,text/markdown,text/html,application/json,application/xml,text/csv';

export default function GeminiFilesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<FileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file.');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/gemini-file/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const parts = [data.error || `Upload failed (${res.status})`];
        if (data.hint) parts.push(data.hint);
        if (data.detail) parts.push(data.detail);
        if (data.stack && process.env.NODE_ENV === 'development') parts.push(data.stack);
        setError(parts.join('\n'));
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">
          Upload to Gemini File API
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Upload PDF, text, or other documents. Files are stored for 48 hours.
          Uses your project&apos;s Gemini API key from env.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="file">
              File
            </label>
            <input
              ref={inputRef}
              id="file"
              type="file"
              accept={ACCEPT}
              onChange={handleFileChange}
              className="block w-full text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-neutral-200 file:text-neutral-800"
            />
            {file && (
              <p className="mt-1 text-sm text-neutral-500">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 bg-neutral-800 text-white rounded disabled:opacity-50 disabled:pointer-events-none"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-neutral-300 rounded"
            >
              Clear
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-neutral-50 border border-neutral-200 rounded space-y-2">
            <h2 className="font-medium">Uploaded file</h2>
            <dl className="text-sm space-y-1">
              {result.displayName && (
                <div>
                  <dt className="text-neutral-500">Display name</dt>
                  <dd className="font-mono">{result.displayName}</dd>
                </div>
              )}
              {result.name && (
                <div>
                  <dt className="text-neutral-500">Name (ID)</dt>
                  <dd className="font-mono break-all">{result.name}</dd>
                </div>
              )}
              {result.uri && (
                <div>
                  <dt className="text-neutral-500">URI</dt>
                  <dd className="font-mono break-all text-xs">{result.uri}</dd>
                </div>
              )}
              {result.mimeType && (
                <div>
                  <dt className="text-neutral-500">MIME type</dt>
                  <dd>{result.mimeType}</dd>
                </div>
              )}
              {result.state && (
                <div>
                  <dt className="text-neutral-500">State</dt>
                  <dd>{result.state}</dd>
                </div>
              )}
              {result.sizeBytes && (
                <div>
                  <dt className="text-neutral-500">Size</dt>
                  <dd>{result.sizeBytes} bytes</dd>
                </div>
              )}
              {result.expireTime && (
                <div>
                  <dt className="text-neutral-500">Expires</dt>
                  <dd>{result.expireTime}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
