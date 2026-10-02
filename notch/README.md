# Claude Notch — Windows

Ein dünner Streifen ganz oben am Bildschirm, der **über allen Fenstern** liegt
und sagt, ob Claude gerade arbeitet oder auf dich wartet. Egal welche App
gerade vorn ist.

```
▐ ● WORKING  1:04 ▌     volle Pille, pulsierender Punkt, laufende Uhr
▐ ● NEEDS YOU ▌         blinkend — es wartet auf deine Antwort
▐ ● READY ▌             dünne Kontur, bewegungslos
```

**Bewegung ist das Signal.** Solange gearbeitet wird, läuft die Uhr und der
Punkt schlägt. Wenn fertig, blitzt es einmal grün auf und wird dann still und
dünn. Stillstand heißt fertig — das liest du aus dem Augenwinkel, ohne ein
Wort zu entziffern.

## Installieren

Du brauchst **nichts vorher zu installieren** — WinForms und PowerShell sind
auf jedem Windows 10/11 schon da.

**Eine Zeile in PowerShell:**

```powershell
irm https://raw.githubusercontent.com/Keule0071945/openclaude/claude/pixel-art-boss-game-ew4o9e/notch/bootstrap.ps1 | iex
```

Das lädt alle Teile direkt nach `%USERPROFILE%\.claude-notch`, trägt die
Hooks ein, schaltet den Autostart an, startet das Overlay und lässt zum
Schluss die Selbstprüfung laufen. Nichts landet im Downloads-Ordner, und
nichts kommt mit der Windows-Sperre an — die Dateien werden geschrieben,
nicht entpackt.

> Die Zeile führt ein Skript aus dem Netz aus. Es ist dein eigenes Repo und
> du kannst `bootstrap.ps1` vorher lesen — aber prüf das lieber einmal,
> statt es mir zu glauben.

**Oder von Hand:** Ordner auf den Windows-Rechner kopieren, `install.cmd`
doppelklicken.

Das war's. Der Installer

- legt die Dateien nach `%USERPROFILE%\.claude-notch`,
- **hebt die Windows-Sperre auf** (`Unblock-File`) — Dateien aus einem
  Download trägt Windows als „aus dem Internet" und führt sie dann
  wortlos nicht aus,
- trägt vier Hooks in `%USERPROFILE%\.claude\settings.json` ein,
- **schaltet den Autostart ein**,
- startet das Overlay,
- und lässt zum Schluss die Selbstprüfung laufen, damit du sofort siehst,
  ob es geklappt hat.

**Laufende Claude-Code-Sitzungen danach neu starten**, sonst kennen sie die
neuen Hooks noch nicht.

## Du siehst nichts?

```
%USERPROFILE%\.claude-notch\doctor.cmd
```

Das prüft der Reihe nach: Ist es installiert? Hat Windows die Dateien
gesperrt? Läuft der Prozess? Was steht im Log? Sind die Hooks eingetragen?
Meldet überhaupt jemand? Ist der Autostart an? Lädt WinForms?

Am Ende steht eine nummerierte Liste mit genau dem, was zu tun ist — keine
Vermutungen.

Wenn alles grün ist und du trotzdem nichts siehst, schick mir die Zeile
`window shown at …` aus dem Log. Dann weiß ich, wohin es zeichnet.

Einzeln starten mit sichtbarer Konsole, um Fehler direkt zu sehen:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\.claude-notch\notch.ps1" -Visible
```

## Wie es funktioniert

```
Claude Code  →  Hook ruft report.cmd  →  %USERPROFILE%\.claude-notch\status.txt
                                                    ↓
                                         notch.ps1 liest alle 200 ms
                                                    ↓
                                    Streifen oben am Bildschirm
```

Das Overlay spricht nie mit Claude. Es liest nur eine Datei. Dadurch
funktioniert es über mehrere Terminals, mehrere Sitzungen und Neustarts
hinweg — wer zuletzt gemeldet hat, bestimmt die Anzeige.

| Hook | schreibt | heißt |
|---|---|---|
| `UserPromptSubmit` | `busy` | du hast etwas abgeschickt |
| `Notification` | `waiting` | Claude braucht eine Antwort von dir |
| `Stop` | `idle` | der Zug ist durch |
| `SessionEnd` | `idle` | Sitzung beendet |

Alle vier laufen mit `"async": true` — sie blockieren deine Sitzung nicht.
`report.cmd` ist bewusst eine Batch-Datei und kein PowerShell-Skript: bei
jedem Prompt und jedem Stopp eine PowerShell-Laufzeit zu starten würde eine
spürbare Pause in die Sitzung legen.

## Bedienen

| | |
|---|---|
| Starten | `start-notch.vbs` |
| Beenden | `stop-notch.cmd` |
| Autostart ein | `autostart-on.cmd` (der Installer macht das schon) |
| Autostart aus | `autostart-off.cmd` |
| Selbstprüfung | `doctor.cmd` |

Alle im Ordner `%USERPROFILE%\.claude-notch`.

Der Autostart ist eine ganz normale Verknüpfung in deinem Autostart-Ordner
(`Win+R` → `shell:startup`) — kein Registry-Eintrag, keine geplante Aufgabe.
Du kannst sie dort sehen und von Hand löschen, ohne dass dir jemand erklären
muss, wo sie steckt.

Der Streifen ist **klickdurchlässig** (`WS_EX_TRANSPARENT`) und **nimmt nie
den Fokus** (`WS_EX_NOACTIVATE`). Du kannst durch ihn hindurch auf das klicken,
was darunter liegt, und er taucht nicht im Alt-Tab und nicht in der
Taskleiste auf.

## Was der Installer mit deiner settings.json macht

Er fasst eine Datei an, die dir gehört — deshalb:

- **Sicherung zuerst:** `settings.json.notch-backup` liegt daneben.
- **Fremde Hooks bleiben.** Deine eigenen Einträge werden übernommen, meine
  kommen daneben.
- **Zweimal ausführen ist unschädlich.** Meine Einträge werden an ihrem
  Pfad erkannt und ersetzt, nicht verdoppelt.
- **Kaputtes JSON wird nicht angefasst.** Ist die Datei kein gültiges JSON,
  bricht der Installer ab und sagt es dir, statt zu raten.

Wer es lieber von Hand einträgt: `hooks.snippet.json` zeigt die vier
Einträge; `%USERPROFILE%` darin durch den echten Pfad ersetzen.

## Dateien

| | |
|---|---|
| `frame.ps1` | die ganze Bildsprache als reine Funktionen — Zustände, Beschriftung, Puls, Farben |
| `notch.ps1` | das Fenster: immer oben, klickdurchlässig, zeichnet was `frame.ps1` sagt |
| `report.cmd` | was die Hooks aufrufen |
| `install-hooks.ps1` | der Eingriff in `settings.json` |
| `install.cmd` | alles zusammen |
| `bootstrap.ps1` | die Ein-Zeilen-Installation aus dem Netz |
| `start-notch.vbs` / `stop-notch.cmd` | starten ohne Konsolenfenster, beenden |
| `autostart.ps1` + die beiden `.cmd` | Verknüpfung im Autostart-Ordner an/aus |
| `doctor.ps1` / `doctor.cmd` | die Selbstprüfung |
| `frame.tests.ps1` | 19 Tests für `frame.ps1` |

Die Trennung ist Absicht: alles, was man testen kann, liegt in `frame.ps1`
und läuft überall; `notch.ps1` ist nur die Hülle drumherum.

## Testen

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File frame.tests.ps1
```

## Grenzen, ehrlich

- **Nur Windows.** macOS und Linux bräuchten je eine eigene Umsetzung.
- **Ein ZIP von GitHub bringt LF-Zeilenenden mit.** Git selbst macht beim
  Auschecken CRLF daraus (`.gitattributes`), ein ZIP-Download nicht — und
  eine `.cmd` mit LF verwirrt `cmd.exe`, eine `.vbs` mit LF scheitert ganz.
  `bootstrap.ps1` repariert das nach dem Laden; bei einem ZIP-Download musst
  du es selbst wissen. Nimm die eine Zeile.
- **Nur der Hauptbildschirm.** Bei mehreren Monitoren sitzt der Streifen oben
  auf dem primären.
- **Vollbild-Apps** (Spiele, manche Videoplayer) liegen über allem, auch über
  diesem Overlay. Das lässt sich von außen nicht ändern.
- **Das Fenster selbst wurde nicht auf echtem Windows geprüft** — ich habe
  es in einem Linux-Container gebaut. Getestet ist: die Bildsprache in
  `frame.ps1` (19/19), der Eingriff in `settings.json` gegen vier
  Ausgangslagen, und die Selbstprüfung gegen zwei (nichts installiert /
  alles installiert). Alle Skripte parsen sauber. Position,
  Klickdurchlässigkeit und Zeichnung konnte ich nur lesen, nicht laufen
  lassen — dafür gibt es `doctor.cmd` und das Log.
