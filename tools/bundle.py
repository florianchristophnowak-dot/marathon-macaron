#!/usr/bin/env python3
"""Baut aus den Quelldateien drei eigenstaendige HTML-Dateien in dist/.

Die Apps laufen auch so schon offline (einfach index.html im Browser oeffnen).
Dieses Skript ist fuer den Fall gedacht, dass eine EINZELNE Datei weitergegeben
werden soll – zum Beispiel die Schueler-App per Mail oder Lernplattform.
CSS und JavaScript werden dafuer direkt in die HTML-Datei eingebettet.

    python3 tools/bundle.py

Es werden keine Pakete gebraucht, nur die Python-Standardbibliothek.
"""

from pathlib import Path
import re
import sys

WURZEL = Path(__file__).resolve().parent.parent
ZIEL = WURZEL / "dist"
SEITEN = ["index.html", "lehrer.html", "eleve.html"]

LINK = re.compile(r'[ \t]*<link rel="stylesheet" href="(?P<pfad>[^"]+)">\n?')
SKRIPT = re.compile(r'[ \t]*<script src="(?P<pfad>[^"]+)"></script>\n?')


def lies(pfad: Path) -> str:
    if not pfad.exists():
        sys.exit(f"Fehlt: {pfad.relative_to(WURZEL)}")
    return pfad.read_text(encoding="utf-8")


def einbetten(seite: str) -> str:
    quelle = lies(WURZEL / seite)

    def css(treffer: re.Match) -> str:
        inhalt = lies(WURZEL / treffer.group("pfad"))
        return f"  <style>\n{inhalt}\n  </style>\n"

    def js(treffer: re.Match) -> str:
        inhalt = lies(WURZEL / treffer.group("pfad"))
        # Ein </script> im Code wuerde das Skript vorzeitig beenden.
        inhalt = inhalt.replace("</script", "<\\/script")
        return f"  <script>\n{inhalt}\n  </script>\n"

    fertig = LINK.sub(css, quelle)
    fertig = SKRIPT.sub(js, fertig)
    return fertig


def main() -> None:
    ZIEL.mkdir(exist_ok=True)
    for seite in SEITEN:
        ergebnis = einbetten(seite)
        ausgabe = ZIEL / seite
        ausgabe.write_text(ergebnis, encoding="utf-8")
        groesse = round(len(ergebnis.encode("utf-8")) / 1024)
        print(f"{ausgabe.relative_to(WURZEL)} – {groesse} KB")
    print("\nFertig. Die Dateien in dist/ laufen einzeln, ohne den Ordner assets/.")


if __name__ == "__main__":
    main()
