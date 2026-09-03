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
| `H` | Anleitung (vom Titel, der Auswahl oder aus der Pause) |
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

Jede Arena steht auf einem eigenen Material — kein durchgehendes Pflaster mehr:

| Arena | Untergrund |
|---|---|
| Ruinen | Überwucherter Erdboden. Vom alten Pflaster sind nur noch Inseln übrig, dazwischen Moos, Grasbüschel, Wurzeln und Regenpfützen. |
| Himmel | Eine Wolkendecke, auf der schwebende Marmorinseln mit Goldkante liegen. Der Kampfring ist die größte davon. |
| Hölle | Aufgebrochene Krustenplatten. Nur wo sie zerbrochen sind, scheint der glühende Grund durch. |

- **Bruchsteinpflaster statt Raster.** Wo gepflastert ist, liegen verschieden
  große Steine in versetzten Reihen, jeder mit eigener Färbung, Lichtkante und
  Absplitterungen. Ein Teil der Steine ragt über die Reihe hinaus und wird von
  der nächsten teilweise überzeichnet — dadurch entsteht kein Mauerwerksmuster.
- **Der alte Weg.** Ein gepflastertes Band mit Bordsteinen zieht sich quer durch
  jede Arena und teilt den Boden sichtbar: Straße in den Ruinen, Marmorsteg im
  Himmel, Basaltweg in der Hölle.
- **Kampfring.** Eine Ellipse mit abgesetztem Rand und Pflastersteinen in der
  Bildmitte. Sie ist in die Bodenebene gebacken und wandert mit deren Parallaxe.
- **Siegel.** Darüber pulsiert ein Runenkreis mit gegenläufigem Dreieck, der beim
  Phasenwechsel von der Arenafarbe zu glühendem Rot wechselt.
- **Kampfspuren.** Explosionen brennen den Boden an, Meteore und Steinschlag
  schlagen Krater, Kills hinterlassen Spritzer in der Farbe des Gegners. Die
  Spuren bleiben bis zum Arenawechsel; die ältesten weichen bei 80 Stück.
- **Bewegter Untergrund.** Über die Pfützen wandert Glanz, über die Wolkendecke
  ziehen Schatten, und durch die Glutadern der Hölle fließen Lichtpunkte.

Alle Bodentöne liegen bewusst dunkel: Figuren und Projektile bleiben die
hellsten Dinge im Bild.

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

## Der Bosskampf

Es gibt keine Gegnerwellen. Jede Arena ist ein einzelner, langer Zweikampf von
zwei bis drei Minuten, in dem nur der Boss den Takt vorgibt:

- **Phasen.** Gorgok hat drei, Seraphine drei, Abaddon vier. Jeder Wechsel
  schlägt als Druckwelle durch das Bild, verwandelt die Arena und gibt dir 18 %
  deines Lebens zurück.
- **Erschöpfung.** Nach schweren Angriffen — Sturmangriff, Steinregen,
  Strahlenkranz, Meteorhagel, Untergang — sackt der Boss zusammen. Er greift
  nicht an, nimmt **70 % mehr Schaden** und wirft Seelensplitter ab. Das ist das
  Zeitfenster, in dem der Kampf entschieden wird.
- **Erfahrung kommt vom Boss.** An Lebensschwellen bricht er auf, jeder Treffer
  kann einen Splitter absprengen. Wer Druck macht, steigt schneller auf.
- **Beschwörung.** Alle 20–25 Sekunden ruft der Boss eine kleine Gruppe. Kreise
  am Boden zeigen vorher, wo sie aufsteigt; höchstens sechs stehen gleichzeitig,
  und im zweiten Ruf ist eine Elite mit Schatztruhe dabei.

### Angriffsmuster

| Boss | Muster |
|---|---|
| **Gorgok** | Felssalve, angekündigter Sturmangriff (ab Phase 3 dreifach), Steinregen über die ganze Arena, Erdwelle mit Lücke |
| **Seraphine** | Rotierende Regenbogen-Laser, Federfächer, Teleport, Lichtkreuz aus vier schwenkenden Strahlen, Gericht auf deine Position, Federsturm als Spirale |
| **Abaddon** | Dauerspiralen, Meteorhagel, Schockwellen, Feuerkreuz aus der Bildmitte, Untergang mit drei Ringen, durch deren Lücke man muss |

## Gegnerarten

Die gerufenen Diener kommen in fünf Sorten, je Arena anders gemischt:

| Art | Verhalten |
|---|---|
| **Verfolger** (Fledermaus, Imp, Schädel) | Läuft direkt auf dich zu. Grundlast jeder Welle. |
| **Schwarm** (Motten) | Erscheint zu fünft, schnell und schwach, fliegt unruhig. |
| **Schütze** (Auge) | Hält rund 74 Pixel Abstand und feuert gezielt. Man muss zu ihm hin oder ausweichen. |
| **Wächter** | Träge und zäh, sein Schild zeigt immer zu dir: von vorn kommen nur 20 % des Schadens an, also umlaufen. |
| **Teiler** (Knolle) | Zerfällt beim Tod in zwei kleinere, schnellere Ableger. |

## Zwischen den Wellen

- **Eliten.** Alle 15–22 Sekunden erscheint ein deutlich größerer Gegner mit
  Goldring und siebenfachem Leben. Er lässt eine **Schatztruhe** fallen: eine
  Verstärkung, 40 % Heilung oder ein Goldfund.
- **Kette.** Kills kurz hintereinander bauen einen Zähler auf, der bei einem
  Treffer sofort reißt.

## Der Einstieg

Beim allerersten Durchlauf führt eine Zeile über dem Lebensbalken durch die
Grundlagen — Bewegen, automatisches Feuern, Splitter sammeln, Ausweichrolle,
Bossleiste, Bodengefahren. Jeder Schritt wartet auf die passende Handlung statt
auf einen Zeitgeber, damit niemand überholt wird; nach dem ersten Sieg oder Tod
bleibt die Führung aus.

`H` öffnet jederzeit die **Anleitung** mit Steuerung, Kampfregeln und Aufbau.
Die **Pause** zeigt zusätzlich den aktuellen Stand: alle genommenen
Verstärkungen mit Stufe und wie weit die Waffen-Evolution noch entfernt ist.

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

## Balance

Die Werte sind nicht gesetzt, sondern gemessen. Ein Bot, der wie ein
aufmerksamer Spieler agiert — Abstand zu Gegnern, Geschossen und Gefahren
halten, Splitter einsammeln, bei Bedrängnis wegrollen — spielt je Held
vierzehn vollständige Durchläufe. Zielband ist eine Siegquote um die Hälfte:
was ein Bot knapp schafft, gewinnt ein aufmerksamer Mensch meistens.

Der erste Durchgang ergab **0 Siege aus 20 Läufen**. Die Messung zeigte warum:
der Schadenszufluss überstieg den Lebenspool um das Zwei- bis Dreifache
(Arena 1: 126 Schaden/Minute gegen 100 Leben, Arena 2: 236 gegen 125,
Arena 3: 326 gegen 100), und zwischen den Arenen wurden nur 30 % geheilt.
Nach voller Heilung zwischen den Arenen, längerer Unverwundbarkeit und
gesenktem Schaden liegen alle vier Helden bei rund der Hälfte.

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
- **Ton.** Jeder Effekt ist geschichtet statt ein einzelner Piepton: Tonquellen
  mit Hüllkurve und Gleiten, dazu gefiltertes Rauschen aus einem einmal
  erzeugten Rauschpuffer. Ein Treffer ist ein Rauschimpuls durch ein Bandfilter
  plus tiefer Ton, ein Block zwei verstimmte Metalltöne, eine Explosion ein
  Sinus-Abfall unter einem Tiefpassrauschen, Belohnungen sind Tonfolgen.
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
