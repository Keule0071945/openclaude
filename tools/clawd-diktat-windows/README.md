# Clawd Diktat – Sprache zu Text für Claude (Windows)

Taste halten, sprechen, loslassen – der Text landet dort, wo dein Cursor ist: in **Claude Desktop**, in **Claude Code** im Terminal, im Browser oder in jedem Editor. Mit Sprachbefehlen schickst du die Nachricht gleich ab oder tippst Slash-Befehle wie `/compact`.

Die Erkennung läuft komplett **offline** auf deinem PC (whisper.cpp). Nichts, was du sagst, verlässt den Computer.

## Installation

PowerShell öffnen und einfügen:

```powershell
irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/flat-notch-status-indicator-x3h3ds/tools/clawd-diktat-windows/get.ps1 | iex
```

Der Installer:

1. kopiert `ClawdDiktat.exe` nach `%LOCALAPPDATA%\ClawdDiktat` und legt eine Startmenü-Verknüpfung an,
2. lädt die Spracherkennung **whisper.cpp** (aktuelle Version von GitHub),
3. fragt, welches **Sprachmodell** du willst (siehe unten) und lädt es,
4. startet Clawd Diktat und trägt es in den Autostart ein.

Fehlt die *Microsoft Visual C++ Laufzeit*, installiert der Installer sie mit (Windows fragt dann nach Erlaubnis).

## Benutzen

| Was | Wie |
|---|---|
| Diktieren | **F9 gedrückt halten**, sprechen, loslassen |
| Freihändig | F9 **kurz antippen**, sprechen, nochmal antippen |
| Abbrechen | **Esc** während der Aufnahme |
| Einstellungen | Rechtsklick auf das Clawd-Symbol neben der Uhr |

Unten am Bildschirm erscheint eine kleine Leiste mit Clawd, einem Pegel-Balken und danach dem erkannten Text. Sie nimmt deinem Fenster nie den Fokus weg.

### Sprachbefehle

| Du sagst | Es passiert |
|---|---|
| „… **absenden**“ / „… **abschicken**“ am Ende | Text einfügen **und Enter drücken** – Claude bekommt die Nachricht sofort |
| „**neue Zeile**“ / „**neuer Absatz**“ | Zeilenumbruch (sendet nicht ab) |
| „**Slash compact**“, „Slash clear“, „Slash review …“ | `/compact`, `/clear`, `/review …` für Claude Code |
| nur „**abbrechen**“ | drückt **Esc** – stoppt Claude mitten in der Antwort |

Beispiel: *„Schreib mir eine Funktion, die prüft, ob ein Passwort sicher ist. Absenden.“*

Deutsche Wörter für Slash-Befehle gehen auch: „Slash Hilfe“ → `/help`, „Slash Kosten“ → `/cost`, „Slash Modell“ → `/model`.

### Einstellungen (Rechtsklick aufs Symbol)

- **Diktier-Taste:** F8, F9, F10, F12, Rollen, Pause, Strg rechts oder Menütaste
- **Sprachmodell:** zwischen installierten Modellen wechseln oder ein weiteres herunterladen
- **Sprache:** Deutsch, Englisch oder automatisch
- **Mikrofon:** automatisch (echte Mikrofone vor virtuellen wie Steam/Oculus) oder ein bestimmtes
- **Nach jedem Diktat absenden:** drückt immer Enter
- **Tippen statt Einfügen:** für Programme, in denen Strg+V nicht geht
- **Verlauf:** die letzten Diktate, ein Klick kopiert sie wieder
- **Ersetzungen:** Liste „falsch erkannt => richtig“, z. B. `Cloud Code => Claude Code`
- **Fachwörter:** Namen und Begriffe, die Whisper richtig schreiben soll (Projektnamen, Bibliotheken …)

## Sprachmodelle

| Modell | Größe | Für wen |
|---|---|---|
| base | ca. 150 MB | ältere PCs, schnell, etwas ungenauer |
| **small** | ca. 490 MB | **empfohlen** – gute Erkennung, je nach PC wenige Sekunden |
| large-v3-turbo (q5) | ca. 550 MB | beste Erkennung, braucht einen schnellen Prozessor |

Ein weiteres Modell holst du jederzeit über *Rechtsklick → Sprachmodell → Modell herunterladen*.

## Tipps für Claude

- **Claude Code im Terminal:** Klick ins Terminal, F9 halten, Aufgabe sagen, „absenden“. Lange Aufträge mit „neue Zeile“ gliedern – der Zeilenumbruch schickt nichts ab.
- **Claude Desktop / claude.ai:** Klick ins Eingabefeld und diktieren. Ohne „absenden“ kannst du den Text vor dem Senden noch korrigieren.
- **Fachbegriffe:** Trag Projekt- und Dateinamen unter *Fachwörter* ein – das verbessert die Erkennung deutlich.
- Wechselst du während der Erkennung das Fenster, landet der Text sicherheitshalber nur in der Zwischenablage.

## Wenn etwas nicht klappt

`Win + R` → einfügen → Enter:

```
%LOCALAPPDATA%\ClawdDiktat\ClawdDiktat.exe check
```

Das schreibt `%APPDATA%\ClawdDiktat\check.txt` mit Engine-Status, Modellen, Mikrofonen und einem 3-Sekunden-Aufnahmetest (währenddessen etwas sagen). Außerdem stehen alle Diktate mit Rohtext in `%APPDATA%\ClawdDiktat\diktat.log`.

| Problem | Lösung |
|---|---|
| „Nichts gehört“ | anderes Mikrofon im Menü wählen; Windows-Einstellungen → Datenschutz → Mikrofon → Desktop-Apps erlauben |
| „Visual C++ Laufzeit fehlt“ | *Rechtsklick → Spracherkennung installieren / reparieren* |
| Erkennung zu langsam | kleineres Modell wählen (base) |
| Erkennung zu ungenau | größeres Modell, Fachwörter eintragen, näher ans Mikrofon |
| F9 wird von einem Spiel/Programm gebraucht | andere Diktier-Taste wählen |

## Deinstallieren

`%LOCALAPPDATA%\ClawdDiktat\uninstall.cmd` ausführen.

## Aufbau

| Datei | Inhalt |
|---|---|
| `App.cs` | Tray-App, globale Taste (Low-Level-Hook), Einblendung, Einfügen per Strg+V / SendInput |
| `Engine.cs` | Aufruf von `whisper-cli.exe` mit Modell, Sprache und Fachwörtern |
| `Text.cs` | Nachbearbeitung: Whisper-Halluzinationen filtern, Ersetzungen, Sprachbefehle; WAV- und Stille-Helfer; Einstellungen |
| `Mic.cs` | Mikrofon-Aufnahme per waveIn mit Formatwahl und Umrechnung auf 16 kHz mono (gemeinsam mit Claude Island) |
| `install.ps1` / `get.ps1` / `uninstall.ps1` | Installation, Ein-Zeilen-Download, Deinstallation |

Gebaut für .NET Framework 4.8 (auf jedem Windows 10/11 vorhanden), C# 5, ohne zusätzliche Abhängigkeiten.
