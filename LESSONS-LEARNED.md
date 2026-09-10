# Lessons Learned – fs-businessforum.com

Laufendes Protokoll von Vorfällen auf der Website und was wir daraus gelernt haben.
Neueste Einträge oben. Bitte kurz und ehrlich halten: Symptom → Ursache → Fix → Lehre.

---

## 2026-09-10 – Smooth-Scroll global kaputt nach „Animations-Skripte selbst hosten"

**Symptom (live, direkt nach dem Deploy):**
Die Seite fühlte sich zäh an. Die Intro-/Ladeanimation wurde übersprungen, das Hero-Video
ruckelte, und das Scrollen ging „erst gar nicht, dann ruckig" – nur das Ziehen an der
nativen Scrollbar funktionierte.

**Auslöser:**
PR #6 stellte die Animations-Bibliotheken (GSAP, ScrollTrigger, split-type, Lenis) von
Dritt-CDNs auf Selbst-Hosting um (aus Datenschutzgründen: keine US-CDN-Übertragung mehr).
Dabei wurde **Lenis** (Smooth-Scroll) zum ersten Mal überhaupt korrekt geladen.

**Eigentliche Ursache (Root Cause):**
- Die ursprüngliche Lenis-CDN-URL
  `cdn.jsdelivr.net/gh/darkroomengineering/lenis@1.1.13/bundled/lenis.min.js`
  lieferte **404**. Lenis war also auf der Live-Seite nie aktiv; `script.js` fiel auf den
  eingebauten **Fallback = natives Scrollen** zurück. Genau das war das „flüssige
  Scrollen", das alle kannten und mochten.
- Im `script.js` steckt ein latenter Bug: `lenis.raf()` wird **doppelt** angetrieben –
  über eine eigene `requestAnimationFrame`-Schleife **und** zusätzlich über den
  GSAP-Ticker, mit zwei unterschiedlichen Zeitbasen (`time` vs. `time * 1000`). Außerdem
  sperrt der Intro-Code das Scrollen per `lenis.stop()` und gibt es erst nach sauberem
  Intro-Ende via `lenis.start()` wieder frei.
- Solange Lenis nicht lud, war **beides folgenlos**. Durch das (an sich korrekte)
  Self-Hosting wurde Lenis aktiviert → der kaputte Pfad ging scharf → global hakeliges
  bzw. gesperrtes Scrollen.

**Fix:**
Lenis-`<script>`-Tag aus `index.html` entfernt und `assets/js/lenis.min.js` gelöscht.
`script.js` nutzt dadurch wieder den bestehenden Fallback (natives Scrollen), exakt wie
vorher. Der Datenschutz-Vorteil bleibt erhalten, weil Lenis ohnehin nie von einem CDN kam.

**Lessons / Regeln für das nächste Mal:**
1. **„Selbst hosten" kann ruhende Bugs wecken.** War eine Ressource vorher 404, lief der
   Code faktisch *ohne* sie. Bevor man eine 404-Ressource „repariert", prüfen, was
   passiert, wenn sie plötzlich lädt.
2. **Nach jedem Deploy die Kern-Interaktion real testen** – nicht nur „lädt ohne
   Konsolenfehler", sondern tatsächlich **scrollen, Intro ansehen, Video prüfen**.
3. **Lokale Vorschau ≠ Live.** Lokal lädt alles sofort von der Platte; Streaming-, Timing-
   und Cache-Effekte zeigen sich erst live. Für realistische Tests DevTools-Netzwerk-
   Throttling nutzen (z. B. „Fast 4G").
4. **Browser-Cache** bei Tests immer per `Cmd + Shift + R` (Hard Reload) umgehen – sonst
   testet man die alte Version und wundert sich.
5. **Offener Folgepunkt:** Der Doppelantrieb (`lenis.raf` via rAF *und* GSAP-Ticker) und
   die Intro-Scroll-Sperre in `script.js` sind weiterhin latent im Code. Falls echtes
   Smooth-Scrolling gewünscht ist, zuerst diese beiden Punkte sauber beheben
   (nur EIN rAF-Treiber; robustes Intro-Ende garantieren), **dann** Lenis wieder aktivieren.

---
