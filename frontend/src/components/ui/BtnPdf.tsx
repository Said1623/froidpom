import { useState } from 'react';

interface BtnPdfProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function BtnPdf({ onClick, label = '⬇ PDF', disabled = false }: BtnPdfProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try { await Promise.resolve(onClick()); }
    finally { setTimeout(() => setLoading(false), 800); }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        background: loading ? 'rgba(240,90,90,.1)' : 'rgba(240,90,90,.15)',
        border: '1px solid rgba(240,90,90,.35)',
        color: 'var(--c-danger)',
        borderRadius: 8,
        padding: '7px 14px',
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        transition: 'all .15s',
      }}
    >
      {loading ? (
        <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Génération...</>
      ) : (
        <>{label}</>
      )}
    </button>
  );
}
