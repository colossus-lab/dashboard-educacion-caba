import { useMemo, useState } from "react";
import { useEstablecimientos } from "../dataLoader";

export default function Directorio() {
  const { data, loading } = useEstablecimientos();
  const [search, setSearch] = useState("");
  const [comuna, setComuna] = useState<string>("todas");
  const [sector, setSector] = useState<string>("todos");
  const [pageSize] = useState(50);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((s) => {
      if (comuna !== "todas" && String(s.comuna) !== comuna) return false;
      if (sector !== "todos" && s.ges !== sector) return false;
      if (q && !(
        s.nombre?.toLowerCase().includes(q) ||
        s.direccion?.toLowerCase().includes(q) ||
        s.barrio?.toLowerCase().includes(q) ||
        String(s.cue ?? "").includes(q)
      )) return false;
      return true;
    });
  }, [data, search, comuna, sector]);

  const pageData = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  if (loading) return <div className="loading">Cargando directorio…</div>;

  return (
    <div>
      <h2 className="section-title">Directorio de escuelas</h2>
      <p className="section-desc">
        2.767 establecimientos educativos georreferenciados. Búsqueda por nombre, CUE, dirección o barrio.
      </p>

      <div className="filters">
        <label>
          Buscar
          <input
            type="search"
            placeholder="nombre, dirección, barrio, CUE..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </label>
        <label>
          Comuna
          <select value={comuna} onChange={(e) => { setComuna(e.target.value); setPage(0); }}>
            <option value="todas">Todas</option>
            {Array.from({ length: 15 }, (_, i) => i + 1).map((c) => (
              <option key={c} value={String(c)}>Comuna {c}</option>
            ))}
          </select>
        </label>
        <label>
          Sector
          <select value={sector} onChange={(e) => { setSector(e.target.value); setPage(0); }}>
            <option value="todos">Todos</option>
            <option value="Estatal">Estatal</option>
            <option value="Privada">Privada</option>
          </select>
        </label>
        <div style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 13 }}>
          <b style={{ color: "var(--ink)" }}>{filtered.length.toLocaleString("es-AR")}</b> resultados
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Sector</th>
              <th>Nivel / Tipo</th>
              <th>Dirección</th>
              <th>Comuna</th>
              <th>CUE</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((s, i) => (
              <tr key={s.id ?? i}>
                <td>{s.nombre}</td>
                <td>
                  <span className={`tag tag-${s.ges?.toLowerCase()}`}>{s.ges ?? "—"}</span>
                </td>
                <td style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {s.nivel}<br/>
                  <span style={{ fontSize: 11 }}>{s.tipo}</span>
                </td>
                <td>{s.direccion} <span style={{ color: "var(--ink-3)", fontSize: 11 }}>· {s.barrio}</span></td>
                <td className="num">{s.comuna ?? "—"}</td>
                <td className="num" style={{ fontSize: 11 }}>{s.cue ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18, alignItems: "center" }}>
        <button onClick={() => setPage(0)} disabled={page === 0}>«</button>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
        <span style={{ color: "var(--ink-3)", fontSize: 13, padding: "0 12px" }}>
          Página {page + 1} / {totalPages}
        </span>
        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
        <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
      </div>
    </div>
  );
}
