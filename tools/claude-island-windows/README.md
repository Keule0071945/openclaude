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
   irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows/get.ps1 | iex
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

- **Linksklick:** Animation vorführen
- **Ton bei Fertig / Freigabe:** Systemton an oder aus
- **Sitzungsordner öffnen**
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

Der Hook schreibt den Zustand der Sitzung nach
`%LOCALAPPDATA%\ClaudeIsland\sessions\<sitzung>.json`. Die Island liest diesen Ordner viermal
pro Sekunde.

Voraussetzungen:

- Windows 10 oder 11
- eine aktuelle Claude-Code-Version, die Hooks in der „Exec-Form“ (`args`) und `async`
  unterstützt

Falls etwas nicht klappt, findest du ein Fehlerprotokoll unter
`%LOCALAPPDATA%\ClaudeIsland\island.log`.
