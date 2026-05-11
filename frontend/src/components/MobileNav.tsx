import { useEffect } from "react";

export interface NavSection {
  id: string;
  label: string;
}

interface MobileNavProps {
  sections: readonly NavSection[];
  current: string;
  onSelect: (id: any) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

/**
 * Hamburger nav for ≤ 768px. Drawer slides in from the right with backdrop;
 * the desktop tab bar stays hidden via CSS at that breakpoint.
 */
export default function MobileNav({ sections, current, onSelect, open, setOpen }: MobileNavProps) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      <button
        className="nav-toggle"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={`nav-toggle__bar nav-toggle__bar--1 ${open ? "open" : ""}`} />
        <span className={`nav-toggle__bar nav-toggle__bar--2 ${open ? "open" : ""}`} />
        <span className={`nav-toggle__bar nav-toggle__bar--3 ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`mobile-nav-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="mobile-nav-drawer__head">
          <span className="mobile-nav-drawer__title">Secciones</span>
          <button
            className="mobile-nav-drawer__close"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >×</button>
        </div>
        <nav className="mobile-nav-drawer__list">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`mobile-nav-drawer__item ${current === s.id ? "active" : ""}`}
              onClick={() => { onSelect(s.id); setOpen(false); }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
