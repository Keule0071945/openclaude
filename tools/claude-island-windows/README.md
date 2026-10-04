# Claude Island für Windows

Eine Dynamic Island für **Claude Code**: Sie schwebt oben mittig über allen Fenstern und zeigt
dir jederzeit, ob Claude noch arbeitet, fertig ist oder auf dich wartet.

| Zustand | So sieht es aus |
| --- | --- |
| **Bereit** | Schmale schwarze Notch, grüner Punkt, der sanft atmet |
| **Arbeitet · 1:23** | Orangefarbener Ring dreht sich, ein Glanz läuft über den Text, Aktivitätsbalken tanzen, die Notch glüht orange |
| **Braucht dich** | Bernsteinfarbener Puls, die Island wackelt kurz und klappt auf: „Freigabe: Bash · git push“ |
| **Fertig · 2:13** | Ein grüner Kreis ploppt auf, ein Haken zeichnet sich, ein grüner Lichtblitz. Danach geht es zurück zu „Bereit“ |
| **Fehler** | Rotes Leuchten (z. B. bei einem Rate-Limit) |

Weitere Eigenschaften:

- **Federphysik wie beim iPhone:** Größe und Form ändern sich mit einer echten gedämpften Feder,
  der Inhalt blendet weich über.
- **Aufklappen:** Fährst du mit der Maus über die Island, klappt sie auf und zeigt alle
  Claude-Code-Sitzungen mit Projektname, aktueller Tätigkeit („Bearbeitet · App.tsx“) und Laufzeit.
- **Stört nie:** Klicks gehen durch die Island hindurch, sie bekommt nie den Fokus und taucht nicht
  in Alt+Tab auf. Bei Vollbild (Video, Spiel, Präsentation) blendet sie sich aus.
- **Mehrere Sitzungen:** Jedes Terminal mit Claude Code meldet sich. Die Island zeigt den
  wichtigsten Zustand und die Anzahl.
- **Esc-Abbruch wird erkannt**, obwohl Claude Code dafür keinen eigenen Hook auslöst.

## Installation (ein Befehl)

1. Drücke **Windows-Taste**, tippe `powershell` und drücke Enter.
2. Füge diese Zeile ein und drücke Enter:

   ```powershell
   irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/claude-island-windows/get.ps1 | iex
   ```

3. Die Island erscheint oben mittig und führt einmal alle Zustände vor.
4. Starte offene Claude-Code-Sitzungen einmal neu, damit die Hooks greifen.

Alternativ kannst du den Ordner herunterladen (**Code → Download ZIP**) und `install.cmd`
doppelklicken.

Der Installer macht Folgendes:

- Er verwendet die fertige `ClaudeIsland.exe`. Mit `install.ps1 -Rebuild` baut er sie stattdessen
  aus `ClaudeIsland.cs` mit dem C#-Compiler, der in Windows schon enthalten ist
  (.NET Framework 4.8). Du musst dafür nichts zusätzlich installieren.
- Er installiert nach `%LOCALAPPDATA%\ClaudeIsland`.
- Er trägt die Hooks in `%USERPROFILE%\.claude\settings.json` ein. **Deine vorhandenen
  Einstellungen und Hooks bleiben erhalten**, und vorher wird eine Sicherungskopie
  (`settings.json.bak-claude-island-…`) angelegt.
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

Doppelklicke **`uninstall.cmd`**. Damit werden die Hooks (nur die eigenen), der Autostart und
`%LOCALAPPDATA%\ClaudeIsland` entfernt.

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
