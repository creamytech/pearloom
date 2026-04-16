'use client';

// ─────────────────────────────────────────────────────────────
// ResponsiveTable — table on desktop, stacked cards on mobile.
// Use this for any list with >3 columns (RSVP, vendor bookings,
// guest list, voice toasts, etc.) instead of horizontal scroll.
//
//   <ResponsiveTable
//     columns={[{ key: 'name', label: 'Name' }, ...]}
//     rows={data}
//     getRowKey={(row) => row.id}
//     mobileTitle={(row) => row.name}
//   />
// ─────────────────────────────────────────────────────────────

import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: ReactNode;
  /** Cell renderer. Receives the row. */
  render: (row: T) => ReactNode;
  /** Hide on mobile card view */
  hideMobile?: boolean;
  /** Numeric / right-aligned */
  align?: 'left' | 'right' | 'center';
  width?: string | number;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Title row used on mobile card layout (left-aligned, larger) */
  mobileTitle?: (row: T) => ReactNode;
  /** Subtitle used on mobile card layout */
  mobileSubtitle?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  loading?: boolean;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  getRowKey,
  mobileTitle,
  mobileSubtitle,
  onRowClick,
  empty,
  loading,
}: ResponsiveTableProps<T>) {
  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: 'var(--pl-muted)',
          textAlign: 'center',
          fontSize: '0.92rem',
        }}
      >
        Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="pl-rt-desktop" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{
                    padding: '12px 14px',
                    textAlign: col.align || 'left',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted)',
                    borderBottom: '1px solid var(--pl-divider)',
                    background: 'var(--pl-cream)',
                    width: col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--pl-olive-5)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '14px',
                      textAlign: col.align || 'left',
                      borderBottom: '1px solid var(--pl-divider-soft)',
                      color: 'var(--pl-ink)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div
        className="pl-rt-mobile"
        style={{ display: 'none', flexDirection: 'column', gap: 10 }}
      >
        {rows.map((row) => {
          const tit = mobileTitle ? mobileTitle(row) : null;
          const sub = mobileSubtitle ? mobileSubtitle(row) : null;
          return (
            <article
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                background: 'var(--pl-cream-card)',
                border: '1px solid var(--pl-divider)',
                borderRadius: 'var(--pl-radius-lg)',
                padding: 16,
                cursor: onRowClick ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {tit && (
                <div
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: '1.05rem',
                    fontWeight: 500,
                    color: 'var(--pl-ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tit}
                </div>
              )}
              {sub && (
                <div style={{ color: 'var(--pl-muted)', fontSize: '0.86rem' }}>{sub}</div>
              )}
              <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {columns
                  .filter((c) => !c.hideMobile)
                  .map((col) => (
                    <div
                      key={col.key}
                      style={{
                        display: 'flex',
                        gap: 12,
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderTop: '1px dashed var(--pl-divider-soft)',
                        paddingTop: 6,
                      }}
                    >
                      <dt
                        style={{
                          fontSize: '0.7rem',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--pl-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {col.label}
                      </dt>
                      <dd
                        style={{ margin: 0, color: 'var(--pl-ink)', fontSize: '0.9rem', textAlign: 'right' }}
                      >
                        {col.render(row)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </article>
          );
        })}
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          :global(.pl-rt-desktop) { display: none; }
          :global(.pl-rt-mobile)  { display: flex !important; }
        }
      `}</style>
    </>
  );
}
