'use client';

/**
 * Standalone page: upload files to Google Gemini File API.
 * CLIENT-SIDE upload to bypass server network restrictions.
 * Uses NEXT_PUBLIC_GEMINI_API_KEY directly from browser.
 */

import { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { storage } from '@/lib/utils/storage';

const SHADOW_SOURCE_FILE_KEY = 'speakSnapShadowSourceFile';

type FileResult = {
  name?: string;
  uri?: string;
  displayName?: string;
  mimeType?: string;
  state?: string;
  sizeBytes?: string;
  createTime?: string;
  expirationTime?: string;
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

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError('NEXT_PUBLIC_GEMINI_API_KEY is not set in environment.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      // Client-side upload using @google/genai SDK
      const ai = new GoogleGenAI({ apiKey });
      
      // Upload file
      const uploadedFile = await ai.files.upload({
        file: file,
        config: {
          displayName: file.name,
          mimeType: file.type || 'application/octet-stream',
        },
      });

      if (!uploadedFile?.name) {
        setError('Upload succeeded but no file name returned.');
        return;
      }

      // Poll for processing completion
      let fileInfo = uploadedFile;
      const start = Date.now();
      const maxWait = 120000; // 2 min
      
      while (fileInfo.state === 'PROCESSING' && Date.now() - start < maxWait) {
        await new Promise((r) => setTimeout(r, 2000));
        fileInfo = await ai.files.get({ name: uploadedFile.name });
      }

      if (fileInfo.state === 'FAILED') {
        setError('File processing failed on Google servers.');
        return;
      }

      setResult({
        name: fileInfo.name,
        uri: fileInfo.uri,
        displayName: fileInfo.displayName,
        mimeType: fileInfo.mimeType,
        state: fileInfo.state,
        sizeBytes: fileInfo.sizeBytes,
        createTime: fileInfo.createTime,
        expirationTime: fileInfo.expirationTime,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      const cause = err instanceof Error && 'cause' in err ? String(err.cause) : '';
      setError(`${msg}${cause ? '\n' + cause : ''}`);
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

  const setAsShadowSource = async () => {
    if (!result?.uri) return;
    await storage.setItem(SHADOW_SOURCE_FILE_KEY, {
      uri: result.uri,
      mimeType: result.mimeType,
      displayName: result.displayName,
    });
    alert('已设为 Shadow（雅思+中级）来源，下次进入跟读将从此文件提取 3 句。');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">
          Upload to Gemini File API
        </h1>
        <p className="text-sm text-neutral-600 mb-2">
          Upload PDF, text, or other documents. Files are stored for 48 hours.
        </p>
        <p className="text-xs text-amber-600 mb-6">
          ⚠️ Client-side upload: API key is used in browser. Ensure your network can access generativelanguage.googleapis.com.
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
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm whitespace-pre-wrap">
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
              {result.expirationTime && (
                <div>
                  <dt className="text-neutral-500">Expires</dt>
                  <dd>{result.expirationTime}</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              onClick={setAsShadowSource}
              className="mt-3 px-4 py-2 bg-primary-900 text-white rounded text-sm hover:bg-primary-800"
            >
              用作 Shadow 来源（雅思+中级）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
