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
| `Enter` | Bestätigen / weiter |
| `P` / `Esc` | Pause |
| `M` | Ton an/aus |

Die Waffen zielen und feuern automatisch auf den nächstgelegenen Gegner.

## Helden

| Held | Leben | Tempo | Waffe |
|---|---|---|---|
| **Gockel** — das magische Huhn | 100 | mittel | Feuerstab: explodierende Kugeln mit Flächenschaden |
| **Ritter** — vergessene Wache | 145 | langsam | Kreuzklingen: Salve rundum, durchbohrt Gegner |
| **Magierin** — Sturmruferin | 78 | schnell | Blitzlanze: schnelle Bolzen, hoher Durchschlag |

## Bosse

1. **Gorgok, der Steinwächter** — Felssalven, angekündigter Sturmangriff, Fledermäuse.
   Ab 50 % Leben schneller und mit dichteren Salven.
2. **Seraphine, die Erzengelin** — rotierende Regenbogen-Laser, Federfächer,
   Teleports, Imps. Ab 50 % sechs Strahlen statt vier.
3. **Abaddon, die Apokalypse** — Dauerspiralen, Meteoreinschläge, Schädelbeschwörung.
   Drei Phasen: ab 66 % zweite Spirale und Schockwellen, ab 30 % alles gleichzeitig.

Level, Upgrades und Erfahrung werden über alle drei Arenen mitgenommen. Nach jedem
Boss gibt es Heilung und eine Gratis-Verstärkung.

## Die zwölf Upgrades

`Mehrfachschuss` · `Schnellfeuer` · `Schadenskern` · `Windschuhe` · `Herzstein` ·
`Splitterspitze` · `Orbitkristall` · `Kettenblitz` · `Seelenmagnet` · `Flammenring` ·
`Glückstreffer` · `Regeneration`

Jedes lässt sich mehrfach stapeln (3–5 Stufen). Beim Level-Up stehen drei zufällige
noch nicht ausgereizte Upgrades zur Wahl.

## Aufbau der Datei

`index.html` ist in klar getrennte Abschnitte gegliedert:

- **Sprite-System** — Sprites sind Zeichenraster mit Palette, die einmalig in ein
  Offscreen-Canvas gerendert werden. `mirror()` spiegelt eine linke Hälfte zur
  symmetrischen Ganzfigur, was die Boss-Sprites halbiert.
- **Charaktere / Upgrades** — reine Datentabellen. Ein neuer Held oder ein neues
  Upgrade ist ein weiterer Eintrag plus (beim Helden) ein Zweig in `fireWeapon()`.
- **Bosse** — je eine Fabrikfunktion mit eigener `ai(dt)`. Neue Arena = Eintrag in
  `STAGES` plus Fabrik in `BOSS_FACTORY`.
- **Update / Render / Overlays** — feste Simulationsschritte mit 60 Hz, die
  Darstellung läuft davon entkoppelt.

Der Bestwert wird in `localStorage` unter `terrabruch.best` abgelegt.
