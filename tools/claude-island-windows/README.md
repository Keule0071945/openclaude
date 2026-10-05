# Claude Island für Windows

**Clawd**, das Claude-Code-Maskottchen, sitzt in einer tiefschwarzen Dynamic Island oben mittig
über allen Fenstern und lässt die Beine heraushängen. Er spielt dir vor, was Claude Code gerade
macht, und rechts siehst du jederzeit dein Nutzungslimit. Fährst du mit der Maus darüber, öffnet
sich die Island: Dort kannst du eine PDF hineinziehen und Claude Fragen stellen oder Befehle für
deine Projekte geben.

## Clawd in Ruhe

| Clawd | Bedeutung |
| --- | --- |
| blinzelt, schaut sich um | **Bereit** – Claude wartet auf deinen nächsten Befehl |
| tippt mit den Ärmchen, trippelt, liest hin und her | **Arbeitet** (mit Laufzeit, Text schimmert) |
| winkt und hüpft, die Island wackelt | **Braucht dich** – z. B. eine Freigabe für Bash |
| Freudensprung mit ^ ^-Augen, grünes Leuchten | **Fertig** |
| Augen zu, dunkler, rotes Leuchten | **Fehler** (z. B. Rate-Limit) |
| schläft, kleine z steigen auf | keine Claude-Code-Sitzung offen |

Links steht der Status in Worten mit leuchtendem Punkt, rechts dein **5-Stunden-Limit** als Ring
(grün, ab 60 % gelb, ab 85 % rot). Clawd ist pixelgenau aus dem Logo nachgebaut, das Claude Code
beim Start zeigt.

## Was Clawd sonst noch kann

- **Kostüm je Werkzeug:** Brille beim Lesen und Suchen, Stift beim Bearbeiten, Tastatur bei
  Bash, Lupe bei der Websuche.
- **Augen folgen der Maus.**
- **Tageszeit:** morgens mit Kaffeetasse, nachts gähnt er, zwischen 1 und 5 Uhr steht
  „Bereit · geh schlafen“ da.
- **Langeweile:** Lässt du ihn lange allein, jongliert er, macht Liegestütze und schläft irgendwann ein.
- **Streicheln:** Fahr mit der Maus ein paarmal schnell über ihm hin und her, dann gibt es Herzchen
  und rote Bäckchen.
- **Feiertage:** Weihnachtsmütze bis zum 26.12., Partyhut an Silvester und Neujahr, Kürbis vor
  Halloween und Partyhut an deinem Geburtstag (Tray-Menü → „Geburtstag festlegen …“).
- **Limit-Warnung:** Ab 90 % schwitzt er, bei vollem Limit zeigt die Island einen Countdown bis
  zum Reset und feiert, sobald es wieder frei ist.
- **Kontext-Bauch:** Wird der Kontext einer Sitzung voll, rülpst er und erinnert an `/compact`.
- **Kosten:** In der geöffneten Island steht der API-Gegenwert des Tages. Bei einem Abo dient er
  nur zur Orientierung.
- **Mehrere Sitzungen:** Jede weitere Sitzung bekommt einen Mini-Clawd neben dem Status.
  Ein Klick auf eine Sitzung **springt in ihr Terminal**.
- **Subagenten:** Startet Claude Helfer-Agenten, laufen Baby-Clawds unter der Island herum.
- **Tagesstatistik:** Aufgaben, Arbeitszeit und meistbearbeitete Datei. Freitags bis sonntags
  kommt ein Wochenrückblick dazu.
- **Ergebnis-Vorschau:** Ist Claude fertig, zeigt eine Sprechblase kurz die letzte Antwort.
- **Windows-Benachrichtigungen,** wenn Claude fertig ist oder dich braucht.
- **Spielmodus:** Bei Vollbild-Spielen wird die Island zu einem kleinen Clawd ohne Text.
- **Mehrere Bildschirme:** Die Island wandert auf den Bildschirm, auf dem deine Maus ist.

## Freigaben direkt in der Island

Will Claude etwas tun, das deine Erlaubnis braucht (z. B. `git push`), erscheint in der Island
eine Karte mit **Erlauben**, **Ablehnen** und **Im Terminal entscheiden**. Antwortest du nicht
innerhalb von zwei Minuten, fragt Claude Code ganz normal im Terminal nach. Ist die Island nicht
gestartet, ändert sich nichts. Abschalten: Tray-Menü → „Freigaben in der Island“.

## Island öffnen (Maus drüber)

- **Nutzungslimit:** 5 Stunden und Woche, jeweils mit Reset-Zeit.
- **Sitzungen:** Projekt, Modell, aktuelle Tätigkeit („Bearbeitet · App.tsx“), Laufzeit und
  Kontext-Füllstand.
- **Datei verfüttern:** Zieh eine PDF (oder jede andere Datei) zu Clawd. Je näher sie kommt,
  desto weiter reißt er das Maul mit seinen Pixelzähnen auf. Lass los: Er beißt zu, kaut
  zweimal, schluckt mit einem Hüpfer, und die Island öffnet sich mit der Datei. Dann eine Frage tippen und
  **Enter** drücken (oder „Fragen“). Claude liest die Datei im gewählten Projektordner und
  antwortet direkt in der Island.
- **Befehle:** „Ausführen“ (oder **Strg+Enter**) erlaubt Claude, Dateien im Projekt zu
  bearbeiten. „Im Terminal weiter“ öffnet genau diese Sitzung in Claude Code.
  „Terminal“ startet Claude Code im Projektordner.
- **Schnellbefehle:** Chips wie „Tests laufen lassen“, „Änderungen committen“ oder „Projekt
  erklären“ starten mit einem Klick. Eigene Befehle trägst du in
  `%LOCALAPPDATA%\ClaudeIsland\settings.ini` ein, eine Zeile je Befehl:
  `quick=Beschriftung|Auftrag an Claude|edit`. Mit `|edit` am Ende darf Claude dabei Dateien ändern.
- **Zwischenablage:** Ein Klick verfüttert, was gerade kopiert ist (Text, Bild oder Dateien).
- **Bildschirmfoto:** **Strg+Alt+S** oder der Knopf in der Island. Bereich aufziehen, und Clawd
  frisst das Bild.
- **Sprechen:** Der Mikrofon-Knopf startet die Windows-Spracheingabe (**Win+H**).
- **Strg+Alt+C** öffnet die Island von überall und setzt den Cursor ins Eingabefeld.
- **Esc** oder „Schließen“ schließt die Island wieder.

Weitere Eigenschaften:

- **Stört nicht:** Solange die Island zu ist, gehen Klicks durch sie hindurch.
- **Auch beim Spielen sichtbar:** Clawd bleibt über Spielen und Vollbild-Videos. Das klappt bei
  Spielen im Modus **„Randloses Fenster“ / „Vollbild (Fenster)“**. Im exklusiven Vollbild
  zeichnet Windows nichts anderes über das Spiel, das ist eine Grenze von Windows. Wer ihn dort
  nicht sehen will: Tray-Menü → „Bei Vollbild (Spiele, Videos) ausblenden“.
- **Federphysik:** Größe und Form ändern sich mit einer echten gedämpften Feder.
- **Mehrere Sitzungen:** Jedes Claude-Code-Fenster meldet sich.
- **Esc-Abbruch wird erkannt**, obwohl Claude Code dafür keinen eigenen Hook auslöst.

## Installation (ein Befehl)

1. Drücke **Windows-Taste**, tippe `powershell` und drücke Enter.
2. Füge diese Zeile ein und drücke Enter:

   ```powershell
   iex ((irm "https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows/get.ps1?nocache=$(Get-Random)") -replace '^\uFEFF','')
   ```

3. Clawd erscheint oben mittig und spielt einmal alles vor, auch die geöffnete Island.
4. Starte offene Claude-Code-Sitzungen einmal neu, damit Hooks und Statuszeile greifen.

Alternativ kannst du den Ordner herunterladen (**Code → Download ZIP**) und `install.cmd`
doppelklicken.

Der Installer macht Folgendes:

- Er verwendet die fertige `ClaudeIsland.exe`. Mit `install.ps1 -Rebuild` baut er sie stattdessen
  aus den `*.cs`-Dateien mit dem C#-Compiler, der in Windows schon enthalten ist
  (.NET Framework 4.8). Du musst dafür nichts zusätzlich installieren.
- Er installiert nach `%USERPROFILE%\.claude\claude-island`. Die Daten liegen in
  `%LOCALAPPDATA%\ClaudeIsland`.
- Er trägt die Hooks in `%USERPROFILE%\.claude\settings.json` ein. **Deine vorhandenen
  Einstellungen und Hooks bleiben erhalten**, und vorher wird eine Sicherungskopie
  (`settings.json.bak-claude-island-…`) angelegt.
- Er richtet die **Statuszeile** von Claude Code ein, denn über sie kommt das Nutzungslimit.
  Hattest du schon eine eigene Statuszeile, wird sie weiter angezeigt.
- Er legt einen Autostart-Eintrag an (ohne Autostart: `install.ps1 -NoAutostart`).
- Er startet die Island, und sie führt einmal alle Zustände vor.

Du kannst `install.cmd` jederzeit erneut ausführen, zum Beispiel nach einem Update. Es entstehen
dabei keine doppelten Einträge.

## Bedienung

Das Symbol im Infobereich der Taskleiste bietet:

- **Linksklick:** Island öffnen
- **Island öffnen (Strg+Alt+C)** und **Bildschirmfoto verfüttern (Strg+Alt+S)**
- **Animation vorführen** und **Claude Code öffnen**
- Schalter: **Freigaben in der Island**, **Windows-Benachrichtigungen**, **Dem Bildschirm mit der
  Maus folgen**, **Bei Vollbild ausblenden**, **Ton bei Fertig / Freigabe**
- **Geburtstag festlegen …**
- **Datenordner öffnen**
- **Beenden**

## Deinstallation

Doppelklicke **`uninstall.cmd`** in `%USERPROFILE%\.claude\claude-island`. Damit werden die
Hooks (nur die eigenen), der Autostart und die Programmdateien entfernt, und deine vorherige
Statuszeile kommt zurück.

## So funktioniert es

Claude Code ruft bei jedem relevanten Ereignis `ClaudeIsland.exe hook` auf, und zwar
**asynchron**, sodass Claude dadurch nie langsamer wird. Relevant sind:

- `UserPromptSubmit`
- `PreToolUse` und `PostToolUse`
- `PermissionRequest`
- `Notification`
- `Stop` und `StopFailure`
- `SessionStart` und `SessionEnd`
- `SubagentStart` und `SubagentStop`

Nur für Freigaben gibt es zusätzlich einen **synchronen** `PermissionRequest`-Hook
(`ClaudeIsland.exe permission`). Er wartet höchstens zwei Minuten auf deine Antwort in der Island.
Ohne Antwort gibt er nichts zurück, und Claude Code fragt wie gewohnt im Terminal.

Der Hook schreibt den Zustand der Sitzung nach
`%LOCALAPPDATA%\ClaudeIsland\sessions\<sitzung>.json`. Die Island liest diesen Ordner viermal
pro Sekunde.

Voraussetzungen:

- Windows 10 oder 11
- eine aktuelle Claude-Code-Version, die Hooks in der „Exec-Form“ (`args`) und `async`
  unterstützt

Falls etwas nicht klappt, findest du ein Fehlerprotokoll unter
`%LOCALAPPDATA%\ClaudeIsland\island.log`.
