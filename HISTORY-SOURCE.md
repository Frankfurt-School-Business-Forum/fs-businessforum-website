# Material fuer die spaetere Historie-Seite (nicht veroeffentlicht)

Die 2026er-Website enthaelt bewusst keine Relikte der Ausgabe 2025 mehr (Entscheidung Team, 28.09.2026).
Fuer eine spaetere Seite ueber die gesamte Historie des FS Business Forum bleibt das Material hier im Repo erhalten,
wird aber **nicht deployt** (siehe Ausschlussliste im Deploy-Skript):

- `2025/` – komplette Seite der Ausgabe 2025 (Speaker mit Titeln, Formate, Galerie, Team, Kennzahlen, Partner 2025).
  Lokal weiter aufrufbar unter http://127.0.0.1:8765/2025/ (nutzt ../styles.css, ../script.js und assets/).
- `previous-speakers.html` – Liste frueherer Speaker (alle Ausgaben, wie auf der alten Produktivseite).
- Zugehoerige Bilder bleiben in `assets/` (u. a. `assets/speaker/`, `assets/img/speakers2025/`, `assets/picturesdecoration/`,
  `assets/corporates/`, `assets/teamlead/`, `assets/picturesdecoration/intro.mp4`, `assets/og/fsbf-2025-recap-og.jpg`).

Hinweis: Die alte Produktiv-URL `/previous-speakers.html` liefert nach dem Relaunch die 404-Seite (mit Links zu Startseite und Tickets),
bis die Historie-Seite sie wieder uebernimmt.
