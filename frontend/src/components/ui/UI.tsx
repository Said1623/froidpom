import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import styles from './UI.module.css';

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className={styles.spinner} style={{ width: size, height: size }} />
  );
}

// ── Card ──────────────────────────────────────────────
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

// ── Button ────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...rest }: BtnProps) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export function Input({ label, error, className = '', ...rest }: InputProps) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={`${styles.input} ${error ? styles.inputError : ''} ${className}`} {...rest} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────
interface SelectProps {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
}
export function Select({ label, error, options, value, onChange, placeholder }: SelectProps) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      <select
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 9999, overflowY: 'auto', padding: '20px 16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f1628', border: '1px solid rgba(100,140,255,.22)',
          borderRadius: 16, width: '100%', maxWidth: 500,
          flexShrink: 0, marginBottom: 20
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid rgba(100,140,255,.12)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e8edf8', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: '#1f2a4a', border: 'none', color: '#8fa3cc',
            width: 28, height: 28, borderRadius: 6, fontSize: 13, cursor: 'pointer'
          }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
// ── StatCard ──────────────────────────────────────────
export function StatCard({
  label, value, sub, color = 'primary', icon
}: {
  label: string; value: string | number; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div className={styles.statCard} style={{ '--accent': `var(--c-${color})` } as any}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────
interface Column<T> { key: string; label: string; render?: (row: T) => ReactNode; width?: string }
export function Table<T extends { id: number }>({ columns, rows, onRowClick }: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  if (!rows.length) return <div className={styles.empty}>Aucune donnée</div>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} style={c.width ? { width: c.width } : {}}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} onClick={() => onRowClick?.(row)} className={onRowClick ? styles.clickable : ''}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : String((row as any)[c.key] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────
export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const col = pct > 85 ? 'var(--c-danger)' : pct > 60 ? 'var(--c-warning)' : color || 'var(--c-primary)';
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressBar} style={{ width: `${pct}%`, background: col }} />
      <span className={styles.progressLabel}>{pct}%</span>
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
