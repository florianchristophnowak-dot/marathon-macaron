# Le Marathon des Macarons 🍬

Ein Französisch-Quiz für den Unterricht – als **lokale App**: drei HTML-Dateien, kein
Server, kein Konto, keine Internetverbindung. Doppelklick auf `index.html` genügt.

Es gibt zwei Ansichten:

| | Datei | Sprache | Wofür |
|---|---|---|---|
| **L'Atelier** | `lehrer.html` | Deutsch | Quiz bauen, Spielablauf festlegen, als JSON speichern |
| **Le Marathon** | `eleve.html` | Französisch | Quiz laden und spielen |
| Startseite | `index.html` | Deutsch | Wegweiser zu beiden |

Der Weg dazwischen ist eine kleine **JSON-Datei**: Die Lehrkraft exportiert sie,
die Klasse lädt sie in die Schüler-App. Mehr braucht es nicht.

---

## Sofort loslegen

1. Ordner herunterladen (oder `git clone`).
2. `index.html` im Browser öffnen.
3. Im Atelier auf **„Beispiel laden"** klicken – oder in der Schüler-App auf
   **„Essayer le quiz de démonstration"**.

Getestet mit aktuellen Versionen von Firefox, Chrome, Edge und Safari.

---

## Fragetypen

| Typ | Beschreibung |
|---|---|
| **Multiple Choice** | 2 bis 6 Antwortoptionen, eine davon richtig. Die Reihenfolge der Optionen kann gemischt werden. |
| **vrai / faux** | Eine Aussage, wahr oder falsch. |
| **Freitext** | Die Klasse tippt die Antwort. Mehrere Lösungen erlaubt (eine pro Zeile), Groß-/Kleinschreibung und Satzzeichen sind egal, Akzente auf Wunsch auch. |
| **Lückentext** | Satz mit `___` für jede Lücke – ideal für Konjugationen: `Nous ___ trois macarons.` Für jede Lücke gibt es ein eigenes Lösungsfeld, Alternativen mit `\|` trennen (`vais\|je vais`). |

Zu jeder Frage gehören außerdem eine **Disziplin** (das französische Etikett über der
Frage, z. B. *Marathon de macarons*), ein optionaler **Tipp** und eine optionale
**Erklärung**, die nach dem Antworten erscheint.

---

## Spielablauf festlegen

Im Reiter **„2 · Spielablauf"** entscheidet die Lehrkraft, wie ein Durchgang aussieht.
Die Einstellungen wandern mit in die JSON-Datei.

**Reihenfolge der Fragen**

* *In der Reihenfolge des Editors* – die Liste wird von oben nach unten gespielt.
* *Zufällig mischen* – jede Runde eine neue Reihenfolge.

**Anzahl der Fragen**

* *Alle Fragen*
* *Genau N Fragen* – zum Beispiel 8 aus einem Pool von 30.
* *Zufällig zwischen N und M* – die Anzahl wird bei jedem Start neu ausgelost.

Werden **nicht alle** Fragen gespielt und ist die Reihenfolge *nicht* zufällig, kommt
eine dritte Entscheidung dazu: Sollen es die **ersten** Fragen der Liste sein oder eine
**zufällige Auswahl**, die die Reihenfolge der Liste beibehält? So lässt sich aus einem
großen Fragenpool jedes Mal ein anderes, aber didaktisch sortiertes Quiz ziehen.

Ein Kasten unter den Einstellungen fasst in einem Satz zusammen, was passieren wird:

> Gespielt werden **4 bis 8** von 30 Fragen (jedes Mal neu ausgelost) in **zufälliger Reihenfolge**.

**Weitere Spielregeln:** Antwortoptionen mischen, Tipps erlauben (mit Punktabzug),
Erklärungen zeigen, Tempo-Bonus, Serien-Bonus, Akzente ignorieren – und die Option
**„Schüler\*innen dürfen Reihenfolge und Anzahl selbst wählen"**. Ist sie aktiv,
erscheint in der Schüler-App vor dem Start ein eigenes kleines Einstellungsfeld
(auf Französisch); ist sie aus, gilt allein, was die Lehrkraft gesetzt hat.

Mit **„Vorschau spielen"** lässt sich das Ergebnis sofort ausprobieren – die Vorschau
benutzt dieselbe Engine wie die Schüler-App, es gibt also keine Überraschungen.

---

## Punkte

| | |
|---|---|
| Richtige Antwort | 100 Punkte |
| Tempo-Bonus | bis +50, linear fallend über die ersten 12 Sekunden |
| Serien-Bonus | +40 ab der dritten richtigen Antwort in Folge |
| Tipp benutzt | −30 (im Atelier einstellbar) |

Am Ende zeigt die Schüler-App Punktzahl, Trefferquote, längste Serie, Gesamtzeit und
eine vollständige Korrektur. Der beste Wert pro Quiz wird lokal im Browser gemerkt.

---

## Quiz an die Klasse geben

1. Im Atelier auf **„Als JSON speichern"** – es entsteht z. B. `les-verbes-au-present.json`.
2. Datei verteilen: Lernplattform, Mail, USB-Stick, gemeinsamer Ordner.
3. Die Klasse öffnet `eleve.html` und lädt die Datei (Auswahl oder Drag & Drop).

Die Schüler-App braucht dafür den Ordner `assets/`. Wer **eine einzige Datei**
weitergeben möchte, baut sich Einzeldatei-Versionen:

```bash
python3 tools/bundle.py      # schreibt dist/index.html, dist/lehrer.html, dist/eleve.html
```

Diese Dateien enthalten CSS und JavaScript direkt im HTML und laufen allein.
`dist/` wird nicht versioniert – das Skript erzeugt den Ordner bei Bedarf neu.

---

## Aufbau

```
index.html            Startseite
lehrer.html           Editor (deutsch)
eleve.html            Schüler-App (französisch)
assets/
  macaron.css         Design-System: Farben, Karten, Buttons, das Macaron-Motiv
  player.css          Oberfläche während des Spiels
  atelier.css         Oberfläche des Editors
  core.js             Datenmodell, Auswahl-Logik, Antwortprüfung, Punkte
  player.js           Spiel-Engine (wird von Schüler-App UND Vorschau benutzt)
  lehrer.js           Editor
  eleve.js            Ablauf der Schüler-App
  demo.js             Beispiel-Quiz zum Ausprobieren
exemples/
  marathon-des-macarons.json   dasselbe Quiz als Beispiel-Datei
tools/
  test.js             Selbsttest der Logik (node tools/test.js)
  bundle.py           baut Einzeldatei-Versionen nach dist/
```

Kein Build-Schritt, keine Abhängigkeiten – die Apps laufen direkt per `file://`.

### Design

Alles dreht sich um das Macaron: zwei Schalen (*coques*) mit einer Füllung
(*ganache*) dazwischen. Das Motiv steckt im Logo, im farbigen Streifen am oberen
Kartenrand und vor allem im Fortschrittsbalken – dort steht ein Macaron pro Frage,
blass für offene Fragen, farbig für richtige, angeknabbert für falsche. Die Palette
kommt aus der Pâtisserie: framboise, pistache, lavande, citron, myrtille, chocolat.
Ein helles und ein dunkles Farbschema sind eingebaut (Knopf 🎨, folgt sonst dem
System).

---

## Entwicklung

```bash
node tools/test.js     # 54 Prüfungen: Auswahl, Reihenfolge, Antworten, Punkte, Import
```

Das Dateiformat ist bewusst schlicht und verträgt auch Quiz-Dateien der Vorgänger-App
(`questionText`/`correctText` werden beim Laden übersetzt). Fehlende Felder werden
beim Import mit sinnvollen Standardwerten ergänzt, kaputte Dateien höflich abgelehnt.

```jsonc
{
  "format": "marathon-macaron-quiz",
  "title": "Les verbes au présent",
  "settings": {
    "order": "sequential",      // oder "random"
    "countMode": "range",       // "all" | "fixed" | "range"
    "count": 8,
    "countMin": 4, "countMax": 8,
    "pick": "random",           // bei "sequential": "start" | "random"
    "allowStudentSettings": false
  },
  "questions": [
    { "type": "mcq", "prompt": "Je ___ au cinéma.",
      "options": ["vais", "vas", "va", "allons"], "correctIndex": 0 }
  ]
}
```

---

## Daten

Alles bleibt auf dem Gerät. Quiz-Bibliothek, Farbschema und Bestleistungen liegen im
`localStorage` des jeweiligen Browsers, Ergebnisse werden nirgendwohin geschickt.
Wichtige Quizze also bitte per **„Als JSON speichern"** sichern – wer den
Browser-Speicher leert, leert auch die Bibliothek.
