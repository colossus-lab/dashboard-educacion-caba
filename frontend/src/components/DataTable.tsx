import { type CSSProperties, type ReactNode } from "react";

export interface DataTableColumn<T> {
  /** Unique key, matched against `row[key]` if `render` is not provided. */
  key: string;
  label: string;
  /** Custom renderer. Receives the row. */
  render?: (row: T) => ReactNode;
  /** Numeric (right-aligned, tabular-nums). Default false. */
  numeric?: boolean;
  /** Hide this column on mobile cards. Default false. */
  hideOnMobile?: boolean;
  /** Used as the visible "header" inside the mobile card if `cardHeader` is true. */
  cardHeader?: boolean;
  /** Used as a secondary line under the card header. */
  cardSubheader?: boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T, i: number) => string | number;
  /** Optional style applied to <tr> / <article> for highlighted rows. */
  rowStyle?: (row: T) => CSSProperties | undefined;
  /** Optional caption for the table. Renders as a leading element. */
  caption?: ReactNode;
}

/**
 * Renders a classic `<table>` on desktop (≥ 769px) and a stack of `<article>`
 * cards on mobile (≤ 768px). The breakpoint is implemented with display rules
 * in `App.css` — only one of the two trees is visible at any viewport.
 *
 * For each row on mobile: the column flagged `cardHeader: true` is shown as
 * the card's `<h4>`, `cardSubheader: true` as a subtitle, and the rest
 * render as label/value pairs.
 */
export default function DataTable<T>({ rows, columns, rowKey, rowStyle, caption }: DataTableProps<T>) {
  const mobileCols = columns.filter((c) => !c.hideOnMobile);
  const headerCol = mobileCols.find((c) => c.cardHeader);
  const subheaderCol = mobileCols.find((c) => c.cardSubheader);
  const detailCols = mobileCols.filter((c) => !c.cardHeader && !c.cardSubheader);

  const cell = (col: DataTableColumn<T>, row: T): ReactNode => {
    if (col.render) return col.render(row);
    return (row as any)[col.key];
  };

  return (
    <div className="data-table">
      {caption && <div className="data-table__caption">{caption}</div>}

      {/* Desktop table */}
      <div className="data-table__desktop">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.numeric ? "num" : undefined}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey(row, i)} style={rowStyle?.(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? "num" : undefined}>
                    {cell(c, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="data-table__mobile">
        {rows.map((row, i) => (
          <article key={rowKey(row, i)} className="data-table__card" style={rowStyle?.(row)}>
            {headerCol && (
              <div className="data-table__card-head">{cell(headerCol, row)}</div>
            )}
            {subheaderCol && (
              <div className="data-table__card-sub">{cell(subheaderCol, row)}</div>
            )}
            <dl className="data-table__card-list">
              {detailCols.map((c) => (
                <div key={c.key} className="data-table__card-row">
                  <dt>{c.label}</dt>
                  <dd className={c.numeric ? "num" : undefined}>{cell(c, row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
