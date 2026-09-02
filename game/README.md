# Terrabruch — Boss Rush

Ein Pixel-Art Bullet-Heaven im Stil von *Vampire Survivors* / *Terraclysm Survivors*:
Die Waffen feuern von allein, du bewegst dich nur — und wirst mit jedem Level-Up
stärker, bis du drei Bosse in Folge zerlegst.

## Starten

Keine Installation, kein Build, keine Abhängigkeiten:

```
game/index.html  im Browser öffnen  (Doppelklick genügt)
```

Alles steckt in dieser einen Datei — Sprites, Sound und Logik werden zur Laufzeit
erzeugt. Es gibt keine externen Assets.

## Steuerung

| Taste | Aktion |
|---|---|
| `WASD` / Pfeiltasten | Bewegen |
| `Leertaste` / `Shift` | Ausweichrolle (kurze Unverwundbarkeit) |
| `1` `2` `3` | Upgrade beim Level-Up wählen |
| `F` | Schmiede (vom Titel oder der Heldenauswahl) |
| `Enter` | Bestätigen / weiter |
| `P` / `Esc` | Pause |
| `M` | Ton an/aus |

Die Waffen zielen und feuern automatisch auf den nächstgelegenen Gegner.

## Helden

| Held | Leben | Tempo | Waffe | Evolution |
|---|---|---|---|---|
| **Gockel** — das magische Huhn | 100 | mittel | Feuerstab: explodierende Kugeln | **Infernostab** — Treffer entzünden brennenden Boden |
| **Ritter** — vergessene Wache | 145 | langsam | Kreuzklingen: Salve rundum | **Klingensturm** — Klingen kehren zurück, unbegrenzter Durchschlag |
| **Magierin** — Sturmruferin | 78 | schnell | Blitzlanze: schnelle Bolzen | **Sturmlanze** — Bolzen gabeln sich bei jedem Treffer |
| **Revenant** — der Wiederkehrer *(400 Gold)* | 112 | schnell | Sensenwelle: breite Sichel, durchschlägt Reihen | **Seelenernte** — Sicheln kehren zurück und ernten Extra-Splitter |

Eine Evolution zündet, sobald das passende Upgrade-Paar beisammen ist — etwa
Mehrfachschuss auf Maximum plus Schadenskern Stufe 3 beim Gockel. Sie kostet
keinen Zug, sondern belohnt einen konsequent gebauten Build.

## Bosse

1. **Gorgok, der Steinwächter** — Felssalven, angekündigter Sturmangriff, Fledermäuse.
   Ab 50 % Leben schneller und mit dichteren Salven.
2. **Seraphine, die Erzengelin** — rotierende Regenbogen-Laser, Federfächer,
   Teleports, Imps. Ab 50 % sechs Strahlen statt vier.
3. **Abaddon, die Apokalypse** — Dauerspiralen, Meteoreinschläge, Schädelbeschwörung.
   Drei Phasen: ab 66 % zweite Spirale und Schockwellen, ab 30 % alles gleichzeitig.

Level, Upgrades und Erfahrung werden über alle drei Arenen mitgenommen. Nach jedem
Boss gibt es Heilung und eine Gratis-Verstärkung. Jeder Boss fährt mit einer
Kamerafahrt ein, jeder Phasenwechsel schlägt als Druckwelle durch das Bild, und
der Todesstoß läuft in Zeitlupe.

## Der Boden

Kein leeres Kachelfeld mehr — er hat eine Mitte und er merkt sich, was passiert:

- **Kampfring.** Eine Ellipse mit abgesetztem Rand und Pflastersteinen liegt in
  der Bildmitte und gibt der Arena Maßstab. Sie ist in die Bodenebene gebacken
  und wandert daher mit deren Parallaxe mit.
- **Siegel.** Darüber pulsiert ein Runenkreis mit gegenläufigem Dreieck. Er
  wechselt beim Phasenwechsel von der Arenafarbe zu glühendem Rot.
- **Deko je Arena.** Mosaik, gestürzte Säulentrommeln, Knochen und Regenpfützen
  in den Ruinen; Marmoradern und Goldintarsien im Himmel; gesprungene
  Basaltplatten, Schädel und Obsidiansplitter in der Hölle.
- **Kampfspuren.** Explosionen brennen den Boden an, Meteore und Steinschlag
  schlagen Krater, Kills hinterlassen Spritzer in der Farbe des Gegners. Die
  Spuren bleiben bis zum Arenawechsel; die ältesten weichen bei 80 Stück.
- **Bewegter Untergrund.** Über die Pfützen wandert Glanz, über den Marmor
  ziehen Wolkenschatten, und durch die Glutadern der Hölle fließen Lichtpunkte.

## Die Arena kämpft mit

Jede Arena hat eine eigene Gefahr. Alle werden angekündigt, treffen nur während
ihrer aktiven Phase und lassen sich durch Bewegung vollständig vermeiden:

| Arena | Gefahr | Ansage |
|---|---|---|
| Ruinen | **Steinschlag** — Brocken schlägt ein, 15 Schaden im Umkreis | Schatten wächst am Boden, der Brocken fällt sichtbar |
| Himmel | **Lichtsäule** — wandert langsam quer, 11 Schaden alle 0,6 s | Gestrichelte Linie, bevor sie zündet |
| Hölle | **Glutgeysir** — Flammensäule aus dem Boden, 17 Schaden alle 0,5 s | Glühender Riss im Boden |

Beim Phasenwechsel kippt die Kulisse sichtbar: in den Ruinen stürzen die Türme
zu Stümpfen zusammen, die Fackeln erlöschen und es beginnt zu regnen; im Himmel
ziehen die Wolkenbänke zum Gewitter zu; in der Hölle glüht alles auf und es
regnet Asche. Danach kommen die Gefahren fast doppelt so oft.

Eine Vordergrund-Ebene aus Säulen, Schwaden und Knochenspitzen läuft vor den
Figuren durch — sie hält die Spielfläche frei und gibt der Arena Tiefe.

## Zwischen den Wellen

- **Eliten.** Alle 15–22 Sekunden erscheint ein deutlich größerer Gegner mit
  Goldring und siebenfachem Leben. Er lässt eine **Schatztruhe** fallen: eine
  Verstärkung, 40 % Heilung oder ein Goldfund.
- **Kette.** Kills kurz hintereinander bauen einen Zähler auf, der bei einem
  Treffer sofort reißt.

## Bleibender Fortschritt

Gold überlebt den Tod. In der **Schmiede** (`F` auf dem Titel) wird es dauerhaft
angelegt — die Kosten steigen mit jeder Stufe:

| Bonus | Stufen | Wirkung |
|---|---|---|
| Knochenbau | 5 | +12 Startleben |
| Zornrune | 5 | +6 % Schaden |
| Reisewind | 4 | +4 % Tempo |
| Gierauge | 4 | +20 % Goldfund |
| Erbstück | 3 | Start mit einer Verstärkung |
| Zweites Leben | 1 | Einmal pro Runde mit halbem Leben wieder aufstehen |

Der vierte Held, der **Revenant**, wird einmalig für 400 Gold freigeschaltet.

## New Game+

Nach dem Sieg über Abaddon geht es in die nächste Schleife: Bosse bekommen das
1,6-fache Leben pro Schleife, Gegner werden 45 % zäher, und die Obergrenze jedes
Upgrades steigt um eins. Level und Verstärkungen bleiben erhalten.

## Die zwölf Upgrades

`Mehrfachschuss` · `Schnellfeuer` · `Schadenskern` · `Windschuhe` · `Herzstein` ·
`Splitterspitze` · `Orbitkristall` · `Kettenblitz` · `Seelenmagnet` · `Flammenring` ·
`Glückstreffer` · `Regeneration`

Jedes lässt sich mehrfach stapeln (3–5 Stufen). Beim Level-Up stehen drei zufällige
noch nicht ausgereizte Upgrades zur Wahl.

## Grafik

Alles wird zur Laufzeit erzeugt, es gibt keine Bilddateien.

- **Sprites** entstehen aus Zeichenrastern mit Palette. `buildSprite()` legt vier
  Durchgänge darüber: Einfärben, Lichtkante (obere Ränder heller, untere
  dunkler), dunkle Kontur um die Silhouette und eine Emissiv-Maske.
- **Bloom.** Was als `glow` markiert ist — Augen, Glutkerne, Projektile, Laser —
  wird zusätzlich in eine zweite Ebene gemalt, zweifach heruntergerechnet und
  additiv über die Szene gelegt. Daher der Neon-Look.
- **Animation.** Helden haben vier Laufframes, Diener zwei, Bosse zwei
  (Flügelschlag bzw. Armbewegung) plus eine leichte Atembewegung über eine
  vertikale Stauchung.
- **Trefferfeedback.** Kritische Treffer und Phasenwechsel frieren die Simulation
  kurz ein (`hitStop`), Schaden am Spieler zieht die Farbkanäle auseinander
  (Rot- und Cyan-Auszug gegeneinander verschoben), und der Bosstod läuft mit
  `timeScale` 0,22 bei zugefahrener Kamera.
- **Kamera.** Wuchtige Bossangriffe geben einen kurzen Zoom-Stoß, Treffer kippen
  das Bild leicht, und bei vollem Bildschirm fährt die Kamera langsam heraus.
  Während Auftritt und Todesszene übernimmt die Inszenierung (`view.lock`).
- **Arenen** bestehen aus fünf Ebenen, die sich unterschiedlich schnell gegen
  eine weiche Kamera verschieben, die dem Spieler folgt. Dazu kommt bewegtes
  Beiwerk: Staub und Wetterleuchten in den Ruinen, ziehende Wolken und Federn im
  Himmel, aufsteigende Glut in der Hölle.

Die Raster für Helden, Bosse und Icons werden von `tools/emit.py` erzeugt und in
`index.html` eingesetzt — siehe [`tools/README.md`](tools/README.md).

## Aufbau der Datei

`index.html` ist in klar getrennte Abschnitte gegliedert:

- **Rasterdaten** — die generierten Sprite-Raster zwischen den `RASTERDATEN`-Markern.
- **Sprite-Pipeline** — `buildSprite()`, `drawSpr()` und die Paletten.
- **Charaktere / Upgrades** — reine Datentabellen. Ein neuer Held oder ein neues
  Upgrade ist ein weiterer Eintrag plus (beim Helden) ein Zweig in `fireWeapon()`.
- **Bosse** — je eine Fabrikfunktion mit eigener `ai(dt)`. Neue Arena = Eintrag in
  `STAGES` plus Fabrik in `BOSS_FACTORY`.
- **Arenen / Parallax** — Ebenenaufbau, Vordergrund, Kamera, Wetter,
  Verwandlung und die Arena-Gefahren.
- **Update / Render / Overlays** — feste Simulationsschritte mit 60 Hz, die
  Darstellung läuft davon entkoppelt.

- **Inszenierung / Meta** — Kamerafahrten, Schmiede, New Game+.

`localStorage` hält zwei Schlüssel: `terrabruch.best` (beste Runde) und
`terrabruch.meta` (Gold, gekaufte Boni, freigeschaltete Helden, beste Schleife).
