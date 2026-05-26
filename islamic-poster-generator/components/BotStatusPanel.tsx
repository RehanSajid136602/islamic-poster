'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Power, PowerOff, RefreshCw, Bot, Wifi, WifiOff, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const BOT_URL = 'http://127.0.0.1:3001';

interface BotStatus {
  state: string;
  cronEnabled: boolean;
  city: string;
  country: string;
  scheduledJobs: number;
}

export default function BotStatusPanel() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BOT_URL}/api/control`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Bot offline');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleCron = async () => {
    const action = status?.cronEnabled ? 'stop' : 'start';
    setToggling(true);
    try {
      const res = await fetch(`${BOT_URL}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(prev => prev ? { ...prev, cronEnabled: data.cronEnabled } : prev);
      }
    } catch {
      setError('Failed to toggle bot');
    } finally {
      setToggling(false);
    }
  };

  const fetchQr = async () => {
    try {
      const res = await fetch(`${BOT_URL}/api/status`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      if (data.state === 'qr' && data.qr) {
        setQrData(data.qr);
        setShowQr(true);
      } else {
        setError('No QR available — bot is already connected');
      }
    } catch {
      setError('Cannot reach bot to get QR');
    }
  };

  const badge = () => {
    if (!status) return { color: 'bg-gray-400', text: 'Unknown' };
    const map: Record<string, { color: string; text: string }> = {
      ready: { color: 'bg-emerald-500', text: 'Connected' },
      qr: { color: 'bg-amber-500', text: 'QR Needed' },
      authenticated: { color: 'bg-blue-500', text: 'Authenticated' },
      initializing: { color: 'bg-yellow-500', text: 'Initializing' },
      disconnected: { color: 'bg-red-500', text: 'Disconnected' },
    };
    return map[status.state] || { color: 'bg-gray-400', text: status.state };
  };

  const b = badge();

  return (
    <div className="rounded-2xl shadow-xl border border-green-100 overflow-hidden bg-white">
      <div className="px-6 py-4" style={{ background: 'linear-gradient(90deg, #1a4a2e, #245c38)' }}>
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <Bot className="w-5 h-5" style={{ color: '#d4af37' }} />
          WhatsApp Bot
        </h2>
        <p className="text-green-200 text-sm mt-0.5">Manage auto-poster &amp; status</p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {error ? (
              <WifiOff className="w-5 h-5 text-red-500" />
            ) : (
              <Wifi className={`w-5 h-5 ${b.color === 'bg-emerald-500' ? 'text-emerald-500' : 'text-amber-500'}`} />
            )}
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${b.color} ${loading ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium text-gray-700">
              {error || b.text}
            </span>
          </div>
          <button
            onClick={fetchQr}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex items-center gap-1.5"
            title="Show QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            QR
          </button>
        </div>

        {status && (
          <div className="text-xs text-gray-500">
            📍 {status.city}, {status.country} · {status.scheduledJobs} jobs scheduled
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={toggleCron}
            disabled={toggling || !!error || !status}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              status?.cronEnabled
                ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {toggling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : status?.cronEnabled ? (
              <PowerOff className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            {status?.cronEnabled ? 'Stop Auto-Poster' : 'Start Auto-Poster'}
          </button>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex items-center justify-center disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span className="flex-1">{error}</span>
          </div>
        )}
      </div>

      {showQr && qrData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Scan QR Code</h3>
            <p className="text-sm text-gray-500 mb-4">
              Open WhatsApp → Linked Devices → Link a Device
            </p>
            <div className="bg-white p-4 rounded-xl flex justify-center">
              <QRCodeCanvas value={qrData} size={220} />
            </div>
            <button
              onClick={() => setShowQr(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
