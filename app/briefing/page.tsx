'use client';

import { useState } from 'react';

export default function BriefingPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/briefing', { method: 'POST' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json() as { content: string };
      setContent(json.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-[#0E4774] mb-1">L&D Goals Tracker Briefing Generator</h1>
      <p className="text-sm text-[#404D5B] mb-5">
        Generates a paste-ready status update for all L&D objectives based on current task data.
      </p>

      <button
        onClick={generate}
        disabled={loading}
        className="px-5 py-2.5 text-sm font-semibold text-white rounded transition-colors"
        style={{ backgroundColor: loading ? '#305F8E' : '#0E4774' }}
      >
        {loading ? 'Generating…' : 'Generate Status Update'}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {content && (
        <div className="mt-5">
          <textarea
            readOnly
            value={content}
            rows={20}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-[#2C3E50] bg-white resize-none focus:outline-none"
          />
          <button
            onClick={copy}
            className="mt-2 px-4 py-2 text-sm font-medium rounded border transition-colors"
            style={{
              borderColor: '#E8941A',
              color: copied ? '#ffffff' : '#E8941A',
              backgroundColor: copied ? '#E8941A' : 'transparent',
            }}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      )}
    </div>
  );
}
