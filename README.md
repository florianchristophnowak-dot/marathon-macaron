# Marathon Macaron 🍬

Französisch üben im Unterricht – als **lokale App**: drei HTML-Dateien, kein Server,
kein Konto, keine Internetverbindung. Doppelklick auf `index.html` genügt.

Zwei Ansichten:

| | Datei | Sprache | Wofür |
|---|---|---|---|
| **L'Atelier** | `lehrer.html` | Deutsch | Quiz bauen, Spielart festlegen, als JSON speichern |
| **Marathon Macaron** | `eleve.html` | Französisch | Quiz laden und spielen |
| Startseite | `index.html` | Deutsch | Wegweiser zu beiden |

Dazwischen liegt eine kleine **JSON-Datei**: Die Lehrkraft exportiert sie, die Klasse
lädt sie in die Schüler-App. Mehr braucht es nicht.

---

## Sofort loslegen

1. Ordner herunterladen (oder `git clone`).
2. `index.html` im Browser öffnen.
3. Im Atelier auf **„Beispiel laden"** klicken – oder in der Schüler-App auf
   **„Essayer le quiz de démonstration"**.

Getestet mit aktuellen Versionen von Firefox, Chrome, Edge und Safari.

---

## Zwei Spielarten, dieselben Fragen

Umgeschaltet wird im Atelier unter **„2 · Spielablauf"**. Die Fragen bleiben dabei
unverändert – nur der Rahmen ändert sich.

### 🍬 Le Marathon

Frage für Frage, sofortige Rückmeldung, Punkte für Tempo und richtige Serien. Am Ende
Score, Trefferquote, längste Serie und die vollständige Korrektur. Gut für eine
schnelle Übungsrunde.

| | |
|---|---|
| Richtige Antwort | 100 Punkte |
| Tempo-Bonus | bis +50, linear fallend über die ersten 12 Sekunden |
| Serien-Bonus | +40 ab der dritten richtigen Antwort in Folge |
| Tipp benutzt | −30 (im Atelier einstellbar) |

### 🔐 Le Coffre à Macarons

Das Escape-Spiel. Jede Frage wird zur **Station** mit einem **Code-Fragment**. Wer die
Station löst, bekommt das Fragment; zusammen ergeben sie den **Tresorcode**. Dazu:

* **Countdown** über das ganze Spiel (oder ohne Zeitdruck, wenn 0 Minuten eingestellt sind)
* **Tipps kosten Minuten** statt Punkte
* Stationen **nacheinander** freischalten oder frei wählbar lassen
* **Falsche Antworten sperren nicht** – die Station bleibt zu, es darf weiter probiert werden
* **Freigabe durch die Lehrkraft** für Aufgaben, die der Computer nicht prüfen kann
  (Sprechen, Hören, etwas am Tisch bauen): Die Klasse ruft die Lehrkraft, die vor Ort
  das Fragment eintippt
* **Preis im Tresor**: eine Nachricht, ein Satz zum Vorlesen oder ein Bild
* Läuft die Zeit ab, bietet das Spiel „Continuer sans chrono" an – niemand sitzt fest

Der Tresorcode entsteht entweder automatisch aus den Fragmenten oder wird als fester
eigener Code hinterlegt (dann sagt ihn die Lehrkraft an). Codes lassen sich per Knopf
verteilen – als Buchstaben, Ziffern, Farben, Symbole oder Macaron-Sorten.

---

## Fragetypen

| Typ | Beschreibung |
|---|---|
| **Multiple Choice** | 2 bis 6 Antwortoptionen, eine davon richtig. Die Reihenfolge der Optionen kann gemischt werden. |
| **vrai / faux** | Eine Aussage, wahr oder falsch. |
| **Freitext** | Die Klasse tippt die Antwort. Mehrere Lösungen erlaubt (eine pro Zeile), Groß-/Kleinschreibung und Satzzeichen sind egal, Akzente auf Wunsch auch. |
| **Lückentext** | Satz mit `___` für jede Lücke – ideal für Konjugationen: `Nous ___ trois macarons.` Für jede Lücke ein Lösungsfeld, Alternativen mit `\|` trennen (`vais\|je vais`). Das Eingabefeld ist so breit wie die längste gültige Lösung und wächst beim Tippen mit. |
| **Zuordnung** | Paare verbinden (Ort → Aktivität, Wort → Übersetzung). Die rechte Spalte wird gemischt; im Spiel tippt man links an, dann rechts – die Paare bekommen Nummern und Farben. |
| **Reihenfolge** | Elemente in die richtige Ordnung bringen (Tagesablauf, Satzbau). Im Editor steht die Lösung, im Spiel wird gemischt – sortiert wird mit Pfeiltasten oder per Ziehen. |

Zu jeder Frage gehören außerdem eine **Disziplin** (das französische Etikett über der
Frage, z. B. *Marathon de macarons*), ein optionaler **Tipp** und eine optionale
**Erklärung**, die nach dem Antworten erscheint. Im Escape-Modus kommen **Code-Fragment**
und **Freigabe durch die Lehrkraft** dazu.

---

## Reihenfolge und Anzahl

Gilt in beiden Spielarten (im Escape-Modus heißen die Fragen dort „Stationen"):

**Reihenfolge**

* *In der Reihenfolge des Editors* – die Liste wird von oben nach unten gespielt.
* *Zufällig mischen* – jede Runde eine neue Reihenfolge.

**Anzahl**

* *Alle Fragen*
* *Genau N Fragen* – zum Beispiel 8 aus einem Pool von 30.
* *Zufällig zwischen N und M* – die Anzahl wird bei jedem Start neu ausgelost.

Werden **nicht alle** Fragen gespielt und ist die Reihenfolge *nicht* zufällig, kommt
eine dritte Entscheidung dazu: die **ersten** Fragen der Liste oder eine **zufällige
Auswahl**, die die Reihenfolge beibehält. So lässt sich aus einem großen Fragenpool
jedes Mal ein anderes, aber didaktisch sortiertes Quiz ziehen.

Ein Kasten unter den Einstellungen fasst zusammen, was passieren wird:

> Gespielt werden **4 bis 8** von 30 Fragen (jedes Mal neu ausgelost) in **zufälliger Reihenfolge**.

Im Escape-Modus gilt das auch für den Tresorcode: Werden nur einige Stationen gespielt,
entsteht der Code bei jedem Durchgang neu aus den gefundenen Fragmenten. Das Atelier
weist darauf hin.

**Weitere Spielregeln:** Antwortoptionen mischen, Erklärungen zeigen, Akzente
ignorieren – und die Option **„Schüler\*innen dürfen Reihenfolge und Anzahl selbst
wählen"**. Ist sie aktiv, erscheint vor dem Start ein kleines Einstellungsfeld auf
Französisch; ist sie aus, gilt allein, was die Lehrkraft gesetzt hat.

Mit **„Vorschau spielen"** lässt sich das Ergebnis sofort ausprobieren – die Vorschau
benutzt dieselbe Engine wie die Schüler-App, es gibt also keine Überraschungen. Im
Escape-Modus steht der Tresorcode zur Kontrolle im Kopf der Vorschau.

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
  escape.css          Oberfläche des Escape-Modus
  atelier.css         Oberfläche des Editors
  core.js             Datenmodell, Auswahl-Logik, Antwortprüfung, Punkte, Codes
  answers.js          Antwort-Bausteine aller sechs Fragetypen
  player.js           Marathon-Modus
  escape.js           Escape-Modus
  lehrer.js           Editor
  eleve.js            Ablauf der Schüler-App
  demo.js             Beispiel-Quiz zum Ausprobieren
exemples/
  marathon-macaron-demo.json   dasselbe Quiz als Beispiel-Datei
tools/
  test.js             Selbsttest der Logik (node tools/test.js)
  bundle.py           baut Einzeldatei-Versionen nach dist/
```

Kein Build-Schritt, keine Abhängigkeiten – die Apps laufen direkt per `file://`.
`answers.js` ist die gemeinsame Mitte: Beide Spielarten und die Vorschau zeichnen und
werten Antworten über dasselbe Modul, damit eine Frage überall gleich funktioniert.

### Design

Alles dreht sich um das Macaron: zwei Schalen (*coques*) mit einer Füllung
(*ganache*) dazwischen. Das Motiv steckt im Logo, im farbigen Streifen am oberen
Kartenrand und im Fortschrittsbalken – dort steht ein Macaron pro Frage, blass für
offene, farbig für richtige, angeknabbert für falsche. Die Palette kommt aus der
Pâtisserie: framboise, pistache, lavande, citron, myrtille, chocolat.

Es gibt ein **helles und ein dunkles Farbschema**. Ohne Zutun folgt die App der
Einstellung des Betriebssystems; der kleine Knopf in der Fußzeile schaltet zwischen den
beiden um und merkt sich die Wahl.

### 🥚 Easter Egg

Die Macarons können ihr **Parfum** wechseln – sechs Farbwelten von *classique* über
*néon* bis *nuit à Paris*. Zwei Wege führen hin, auf jeder Seite:

* das Wort **`macaron`** tippen (außerhalb eines Eingabefelds)
* **fünfmal hintereinander auf ein Macaron klicken** – Logo, Fortschrittsbalken, egal welches

Jeder Auslöser schaltet eine Farbwelt weiter, eine kurze Meldung nennt das neue Parfum,
und nach einer Runde ist man wieder bei *classique*. Die Wahl bleibt im Browser
gespeichert. Für den Unterricht ist das harmlos: Es ändert nur die Farben der Macarons,
nicht die Fragen.

---

## Entwicklung

```bash
node tools/test.js     # 111 Prüfungen: Auswahl, Reihenfolge, Antworten, Punkte, Codes, Farben, Import
```

Das Dateiformat ist bewusst schlicht und verträgt auch Quiz-Dateien der Vorgänger-App
(`questionText`/`correctText` werden beim Laden übersetzt). Fehlende Felder werden
beim Import mit sinnvollen Standardwerten ergänzt, kaputte Dateien höflich abgelehnt.

```jsonc
{
  "format": "marathon-macaron-quiz",
  "title": "Les verbes au présent",
  "mode": "escape",             // oder "marathon"
  "settings": {
    "order": "sequential",      // oder "random"
    "countMode": "range",       // "all" | "fixed" | "range"
    "count": 8,
    "countMin": 4, "countMax": 8,
    "pick": "random",           // bei "sequential": "start" | "random"
    "allowStudentSettings": false
  },
  "escape": {
    "intro": "Le chef pâtissier a enfermé sa recette…",
    "timeLimitMin": 20,         // 0 = ohne Zeitdruck
    "hintCostMin": 2,
    "lockOrder": true,
    "finalCodeMode": "auto",    // oder "manual" mit "finalCode"
    "prize": { "type": "phrase", "phrase": "Nous sommes les champions !" }
  },
  "questions": [
    { "type": "mcq", "prompt": "Je ___ au cinéma.",
      "options": ["vais", "vas", "va", "allons"], "correctIndex": 0,
      "code": "MA" },
    { "type": "matching", "prompt": "Associe les lieux.",
      "pairs": [{ "left": "la plage", "right": "on nage" }] },
    { "type": "order", "prompt": "Remets dans l'ordre.",
      "items": ["Je me lève.", "Je prends le bus."] }
  ]
}
```

---

## Daten

Alles bleibt auf dem Gerät. Quiz-Bibliothek, Farbschema und Bestleistungen liegen im
`localStorage` des jeweiligen Browsers, Ergebnisse werden nirgendwohin geschickt.
Wichtige Quizze also bitte per **„Als JSON speichern"** sichern – wer den
Browser-Speicher leert, leert auch die Bibliothek.
