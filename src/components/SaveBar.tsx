'use client';
import { useState } from 'react';
import { useHouse } from '@/store/house';

export default function SaveBar() {
  const { saveState, shareCode, share, loadCode } = useHouse();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const status = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Save failed', offline: 'Offline, saved locally' }[saveState];

  return (
    <div className="text-right text-xs">
      <div className="flex items-center justify-end gap-2">
        <span className="muted">{status}</span>
        <button className="btn" onClick={() => setOpen((o) => !o)}>Share / load</button>
      </div>
      {open && (
        <div className="panel p-3 mt-2 text-left space-y-2 w-64 ml-auto">
          <button
            className="btn btn-primary w-full"
            onClick={async () => {
              const c = await share();
              setMsg(c ? `Code ${c}. Paste it on any device, or open breezevibe.site/h/${c}` : 'Could not create a code.');
            }}
          >
            {shareCode ? `Shared as ${shareCode}` : 'Get a share code'}
          </button>
          <div className="flex gap-2">
            <input placeholder="BV-XXX-XXX" value={code} onChange={(e) => setCode(e.target.value)} />
            <button
              className="btn"
              onClick={async () => {
                const ok = await loadCode(code);
                setMsg(ok ? 'Loaded.' : 'No house with that code.');
              }}
            >
              Load
            </button>
          </div>
          {msg && <p className="muted">{msg}</p>}
          <p className="muted">Your house also autosaves to this browser. Come back any time.</p>
        </div>
      )}
    </div>
  );
}
