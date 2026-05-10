"""Descarga datasets de educación de data.buenosaires.gob.ar (CKAN API).

Apunta a los datasets que el scraper general no había podido bajar.
Salida: C:\\Users\\dante\\Documents\\dashboard-educacion-caba\\data\\raw\\caba\\<dataset>\\
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

API = "https://data.buenosaires.gob.ar/api/3/action/package_show?id={}"
OUT = Path(__file__).resolve().parent.parent / "data" / "raw" / "caba"
DATASETS = [
    "matricula-escolar",
    "establecimientos-educativos",
    "unidades-educativas",
    "universidades",
    "asistencia-escolar",
    "boleto-estudiantil",
    "educacion-sexual-integral",
    "jurisdiccionales-de-educacion-sexual-integral",
]


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "dashboard-edu-caba/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def download(url: str, dest: Path) -> tuple[bool, str]:
    if dest.exists() and dest.stat().st_size > 0:
        return True, f"skip ({dest.stat().st_size} B)"
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "dashboard-edu-caba/1.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
            while chunk := r.read(8192):
                f.write(chunk)
        return True, f"ok ({dest.stat().st_size} B)"
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
        return False, f"error: {e}"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    summary = []
    for ds in DATASETS:
        print(f"\n=== {ds} ===")
        try:
            meta = fetch_json(API.format(ds))
        except Exception as e:
            print(f"  meta error: {e}")
            summary.append({"dataset": ds, "status": "meta_error", "error": str(e)})
            continue
        if not meta.get("success"):
            print(f"  not found")
            summary.append({"dataset": ds, "status": "not_found"})
            continue
        result = meta["result"]
        ds_dir = OUT / ds
        ds_dir.mkdir(exist_ok=True)
        (ds_dir / "_metadata.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        resources = result.get("resources", [])
        print(f"  recursos: {len(resources)}")
        for res in resources:
            url = res.get("url")
            if not url:
                continue
            fname = res.get("fileName") or url.rsplit("/", 1)[-1]
            ok, msg = download(url, ds_dir / fname)
            print(f"    [{'OK' if ok else 'FAIL'}] {fname}: {msg}")
            summary.append({"dataset": ds, "file": fname, "ok": ok, "msg": msg})
            time.sleep(0.3)
    (OUT / "_download_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    ok_count = sum(1 for s in summary if s.get("ok"))
    print(f"\n=== Total recursos OK: {ok_count}/{len(summary)} ===")


if __name__ == "__main__":
    main()
