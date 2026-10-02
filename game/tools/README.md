# Sprite-Generator

Die Pixelraster für Helden, Diener, Bosse und Upgrade-Icons entstehen hier und
werden von `emit.py` direkt in `../index.html` geschrieben — zwischen die beiden
Marker `RASTERDATEN`.

```
cd game/tools && python3 emit.py
```

Keine Abhängigkeiten außer Python 3.

| Datei | Inhalt |
|---|---|
| `art.py` | Rasterklasse `G`, `mirror()`, `swap()`, `shift()` und die Längenprüfung |
| `heroes.py` | Helden (16×16, vier Laufframes) und Diener (12×12, zwei Frames) als getippte Raster |
| `bosses.py` | Bosse als linke Hälfte, per Zeilenspannen gemalt und gespiegelt |
| `icons.py` | Upgrade-Icons 12×12, neutral in `A`/`B`/`C` — die Farbe kommt zur Laufzeit |

## Warum Python und nicht direkt JavaScript

Ein Boss ist ein Raster von bis zu 38 Zeilen à 52 Zeichen. Von Hand getippt
verzählt man sich, und ein einzelnes fehlendes Zeichen kippt die ganze Figur.
`art.py` prüft jede Zeile auf gleiche Länge und baut die großen Figuren aus
Zeilenspannen statt aus getippten Zeichenketten.

`mirror()` spiegelt eine linke Hälfte zur symmetrischen Ganzfigur — die Mitte
ist dabei die **rechte** Randspalte. Wichtig: jede Spanne, die die Mittelachse
berühren soll, muss bis zur letzten Spalte laufen, sonst entsteht beim Spiegeln
eine sichtbare Naht in der Figurmitte.

## Was JavaScript daraus macht

`buildSprite()` in `index.html` nimmt das Raster und legt vier Durchgänge
darüber: Palette einfärben, Lichtkante (oben heller, unten dunkler), dunkle
Kontur um die Silhouette und eine Emissiv-Maske aus den als `glow` markierten
Zeichen. Nur diese Maske landet in der Leuchtebene und wird geblurrt — deshalb
sollten dort nur kleine Teile stehen (Augen, Kerne), keine großen Flächen.
