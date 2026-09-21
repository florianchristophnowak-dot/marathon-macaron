/* Selbsttest der Quiz-Logik – ohne Abhaengigkeiten:  node tools/test.js
   Geprueft werden Auswahl (Reihenfolge & Anzahl), Antwortpruefung und Punkte. */

const path = require('path');
const fs = require('fs');

/* core.js erwartet ein window-Objekt. */
global.window = global;
global.document = { createElement: () => ({ style: {} }), querySelector: () => null, body: null };
require(path.join(__dirname, '..', 'assets', 'core.js'));
const M = global.Macaron;

let ok = 0;
let fehler = 0;

function pruefe(name, bedingung, detail) {
  if (bedingung) { ok++; return; }
  fehler++;
  console.error('  ✗ ' + name + (detail ? '  → ' + detail : ''));
}

function quizMit(anzahl) {
  const quiz = M.createQuiz('Test');
  for (let i = 0; i < anzahl; i++) {
    const q = M.defaultQuestion('mcq', i);
    q.prompt = 'Frage ' + i;
    q.options = ['a' + i, 'b' + i, 'c' + i, 'd' + i];
    q.correctIndex = 1;
    quiz.questions.push(q);
  }
  return quiz;
}

function positionen(quiz, run) {
  return run.questions.map(q => quiz.questions.findIndex(o => o.id === q.id));
}

/* ---------- Anzahl ---------- */
console.log('Anzahl der Fragen');
{
  const quiz = quizMit(12);
  quiz.settings.countMode = 'all';
  pruefe('alle Fragen', M.buildRun(quiz).total === 12);

  quiz.settings.countMode = 'fixed';
  quiz.settings.count = 5;
  pruefe('genau 5', M.buildRun(quiz).total === 5);

  quiz.settings.count = 99;
  pruefe('mehr als vorhanden wird gedeckelt', M.buildRun(quiz).total === 12);

  quiz.settings.countMode = 'range';
  quiz.settings.countMin = 3;
  quiz.settings.countMax = 6;
  const groessen = new Set();
  for (let i = 0; i < 200; i++) groessen.add(M.buildRun(quiz).total);
  const alleImRahmen = [...groessen].every(n => n >= 3 && n <= 6);
  pruefe('Zufallsbereich haelt 3..6 ein', alleImRahmen, [...groessen].join(','));
  pruefe('Zufallsbereich nutzt mehrere Werte', groessen.size > 1, [...groessen].join(','));
}

/* ---------- Reihenfolge ---------- */
console.log('Reihenfolge');
{
  const quiz = quizMit(10);
  quiz.settings.countMode = 'all';
  quiz.settings.order = 'sequential';
  const folge = positionen(quiz, M.buildRun(quiz));
  pruefe('sequentiell = Originalreihenfolge', folge.join(',') === '0,1,2,3,4,5,6,7,8,9', folge.join(','));

  quiz.settings.order = 'random';
  let verschieden = false;
  for (let i = 0; i < 50; i++) {
    if (positionen(quiz, M.buildRun(quiz)).join(',') !== '0,1,2,3,4,5,6,7,8,9') verschieden = true;
  }
  pruefe('zufaellig mischt wirklich', verschieden);

  quiz.settings.order = 'sequential';
  quiz.settings.countMode = 'fixed';
  quiz.settings.count = 4;
  quiz.settings.pick = 'start';
  pruefe('Auswahl „von vorne"', positionen(quiz, M.buildRun(quiz)).join(',') === '0,1,2,3');

  quiz.settings.pick = 'random';
  let immerAufsteigend = true;
  let malAndersAlsVorne = false;
  for (let i = 0; i < 100; i++) {
    const p = positionen(quiz, M.buildRun(quiz));
    if (p.some((v, k) => k > 0 && v <= p[k - 1])) immerAufsteigend = false;
    if (p.join(',') !== '0,1,2,3') malAndersAlsVorne = true;
    if (new Set(p).size !== p.length) immerAufsteigend = false;
  }
  pruefe('Auswahl „zufaellig" behaelt die Reihenfolge bei', immerAufsteigend);
  pruefe('Auswahl „zufaellig" nimmt nicht immer die ersten', malAndersAlsVorne);

  quiz.settings.order = 'random';
  let ohneDoppelte = true;
  for (let i = 0; i < 100; i++) {
    const p = positionen(quiz, M.buildRun(quiz));
    if (p.length !== 4 || new Set(p).size !== 4) ohneDoppelte = false;
  }
  pruefe('zufaellige Auswahl ohne Dopplungen', ohneDoppelte);
}

/* ---------- Optionen mischen ---------- */
console.log('Antwortoptionen');
{
  const quiz = quizMit(1);
  quiz.settings.shuffleOptions = true;
  let immerRichtigMitgezogen = true;
  let malGemischt = false;
  for (let i = 0; i < 100; i++) {
    const run = M.buildRun(quiz);
    const q = run.questions[0];
    if (q.options[q.correctIndex] !== 'b0') immerRichtigMitgezogen = false;
    if (q.correctIndex !== 1) malGemischt = true;
  }
  pruefe('richtige Antwort bleibt nach dem Mischen richtig', immerRichtigMitgezogen);
  pruefe('Optionen werden tatsaechlich gemischt', malGemischt);

  const leer = quizMit(1);
  leer.questions[0].options = ['a', 'b', '', ''];
  leer.questions[0].correctIndex = 1;
  leer.settings.shuffleOptions = false;
  const run = M.buildRun(leer);
  pruefe('leere Optionen fallen weg', run.questions[0].options.length === 2);
  pruefe('richtige Antwort ueberlebt das Entfernen', run.questions[0].options[run.questions[0].correctIndex] === 'b');
}

/* ---------- Antworten pruefen ---------- */
console.log('Antwortpruefung');
{
  const mcq = M.defaultQuestion('mcq', 0);
  mcq.correctIndex = 2;
  pruefe('MCQ richtig', M.checkAnswer(mcq, 2).correct);
  pruefe('MCQ falsch', !M.checkAnswer(mcq, 0).correct);

  const vf = M.defaultQuestion('vf', 0);
  vf.correctVF = 'faux';
  pruefe('vrai/faux richtig', M.checkAnswer(vf, 'faux').correct);
  pruefe('vrai/faux falsch', !M.checkAnswer(vf, 'vrai').correct);

  const text = M.defaultQuestion('text', 0);
  text.answers = ['Bonjour', 'Salut'];
  text.ignoreAccents = true;
  pruefe('Freitext: Grossschreibung egal', M.checkAnswer(text, 'bonjour').correct);
  pruefe('Freitext: Leerzeichen und Punkt egal', M.checkAnswer(text, '  Salut. ').correct);
  pruefe('Freitext: zweite Loesung zaehlt', M.checkAnswer(text, 'SALUT').correct);
  pruefe('Freitext: leere Antwort ist falsch', !M.checkAnswer(text, '   ').correct);
  pruefe('Freitext: falsche Antwort bleibt falsch', !M.checkAnswer(text, 'ciao').correct);

  const accents = M.defaultQuestion('text', 0);
  accents.answers = ['café'];
  accents.ignoreAccents = true;
  pruefe('Akzente ignorieren an', M.checkAnswer(accents, 'cafe').correct);
  accents.ignoreAccents = false;
  pruefe('Akzente ignorieren aus', !M.checkAnswer(accents, 'cafe').correct);
  pruefe('mit Akzent bleibt richtig', M.checkAnswer(accents, 'café').correct);

  const typo = M.defaultQuestion('text', 0);
  typo.answers = ["je m'appelle Marie"];
  pruefe('typografischer Apostroph zaehlt', M.checkAnswer(typo, 'je m’appelle marie').correct);

  const gap = M.defaultQuestion('gap', 0);
  gap.gapText = 'Nous ___ trois macarons et tu ___ un croissant.';
  gap.gaps = ['avons', 'as|a'];
  pruefe('Luecken: zwei erkannt', M.countGaps(gap.gapText) === 2);
  pruefe('Luecken: beide richtig', M.checkAnswer(gap, ['avons', 'as']).correct);
  pruefe('Luecken: Alternative mit | zaehlt', M.checkAnswer(gap, ['avons', 'a']).correct);
  const halb = M.checkAnswer(gap, ['avons', 'ont']);
  pruefe('Luecken: eine falsch = Frage falsch', !halb.correct);
  pruefe('Luecken: Einzelrueckmeldung stimmt', halb.perGap[0] === true && halb.perGap[1] === false);
}

/* ---------- Punkte ---------- */
console.log('Punkte');
{
  const s = M.defaultSettings();
  const sofort = M.scoreAnswer({ correct: true, timeMs: 0, usedHint: false }, 1, s);
  pruefe('Grundpunkte + voller Tempobonus', sofort.total === 150, JSON.stringify(sofort));

  const langsam = M.scoreAnswer({ correct: true, timeMs: 60000, usedHint: false }, 1, s);
  pruefe('kein Tempobonus nach langer Zeit', langsam.total === 100);

  const serie = M.scoreAnswer({ correct: true, timeMs: 60000, usedHint: false }, 3, s);
  pruefe('Serienbonus ab der dritten richtigen', serie.total === 140);

  const tipp = M.scoreAnswer({ correct: true, timeMs: 60000, usedHint: true }, 1, s);
  pruefe('Tipp kostet Punkte', tipp.total === 70);

  const falsch = M.scoreAnswer({ correct: false, timeMs: 0, usedHint: false }, 0, s);
  pruefe('falsche Antwort gibt nichts', falsch.total === 0);

  const ohneBonus = Object.assign({}, s, { speedBonus: false, comboBonus: false });
  pruefe('Boni abschaltbar',
    M.scoreAnswer({ correct: true, timeMs: 0, usedHint: false }, 5, ohneBonus).total === 100);

  const bilan = M.summarize([
    { correct: true, timeMs: 60000, usedHint: false },
    { correct: false, timeMs: 1000, usedHint: false },
    { correct: true, timeMs: 60000, usedHint: false }
  ], s);
  pruefe('Bilanz: richtige Antworten', bilan.correct === 2);
  pruefe('Bilanz: Serie wird unterbrochen', bilan.bestStreak === 1);
  pruefe('Bilanz: Summe', bilan.score === 200, String(bilan.score));
}

/* ---------- Datei einlesen ---------- */
console.log('Import');
{
  const altesFormat = {
    title: 'Altes Quiz',
    questions: [
      { type: 'mcq', questionText: 'Frage?', options: ['a', 'b', 'c', 'd'], correctIndex: 2, discipline: 'Course' },
      { type: 'text', questionText: 'Wie?', correctText: 'so' },
      { type: 'vf', questionText: 'Wahr?', correctVF: 'faux' }
    ]
  };
  const quiz = M.normalizeQuiz(altesFormat);
  pruefe('altes Format wird gelesen', quiz && quiz.questions.length === 3);
  pruefe('questionText wird uebernommen', quiz.questions[0].prompt === 'Frage?');
  pruefe('correctText wird zu answers', quiz.questions[1].answers[0] === 'so');
  pruefe('Standardeinstellungen ergaenzt', quiz.settings.order === 'sequential');
  pruefe('Muell wird abgelehnt', M.normalizeQuiz({ foo: 1 }) === null);
  pruefe('null wird abgelehnt', M.normalizeQuiz(null) === null);

  const echt = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'exemples', 'marathon-macaron-demo.json'), 'utf8'));
  const beispiel = M.normalizeQuiz(echt);
  pruefe('Beispiel-Quiz ist gueltig', beispiel && beispiel.questions.length === echt.questions.length);
  pruefe('Beispiel-Quiz nutzt alle Fragetypen',
    M.TYPES.every(t => beispiel.questions.some(q => q.type === t)),
    M.TYPES.filter(t => !beispiel.questions.some(q => q.type === t)).join(','));
  pruefe('Beispiel-Quiz ist vollstaendig', M.quizIssues(beispiel).length === 0,
    JSON.stringify(M.quizIssues(beispiel)));
}

/* ---------- Pruefung der Vollstaendigkeit ---------- */
console.log('Warnhinweise');
{
  const leer = M.defaultQuestion('mcq', 0);
  pruefe('leere MCQ wird bemaengelt', M.questionIssues(leer).indexOf('no-prompt') >= 0);
  pruefe('fehlende Optionen werden bemaengelt', M.questionIssues(leer).indexOf('few-options') >= 0);

  const gut = M.defaultQuestion('mcq', 0);
  gut.prompt = 'Frage';
  gut.options = ['a', 'b', '', ''];
  gut.correctIndex = 0;
  pruefe('vollstaendige MCQ ist sauber', M.questionIssues(gut).length === 0, JSON.stringify(M.questionIssues(gut)));

  const luecke = M.defaultQuestion('gap', 0);
  luecke.prompt = 'Setze ein';
  luecke.gapText = 'Ohne Luecke.';
  pruefe('fehlendes ___ wird bemaengelt', M.questionIssues(luecke).indexOf('no-gap') >= 0);
}

/* ---------- Zuordnung und Reihenfolge ---------- */
console.log('Zuordnung & Reihenfolge');
{
  const m = M.defaultQuestion('matching', 0);
  m.prompt = 'Associe';
  m.pairs = [
    { left: 'la plage', right: 'on nage' },
    { left: 'le musée', right: 'on regarde' },
    { left: 'la bibliothèque', right: 'on lit' }
  ];
  pruefe('Zuordnung richtig', M.checkAnswer(m, [0, 1, 2]).correct);
  pruefe('Zuordnung vertauscht = falsch', !M.checkAnswer(m, [1, 0, 2]).correct);
  const teil = M.checkAnswer(m, [0, 2, 1]);
  pruefe('Zuordnung: Einzelrueckmeldung', teil.perPair[0] === true && teil.perPair[1] === false);
  pruefe('Zuordnung: ohne Antwort falsch', !M.checkAnswer(m, []).correct);
  pruefe('Zuordnung: Loesungstext', M.correctAnswerText(m).indexOf('la plage → on nage') === 0, M.correctAnswerText(m));
  pruefe('Zuordnung: vollstaendig', M.questionIssues(m).length === 0, JSON.stringify(M.questionIssues(m)));

  const leer = M.defaultQuestion('matching', 0);
  leer.prompt = 'Associe';
  leer.pairs = [{ left: 'a', right: 'b' }, { left: '', right: '' }];
  pruefe('Zuordnung: zu wenige Paare wird bemaengelt', M.questionIssues(leer).indexOf('few-pairs') >= 0);

  const o = M.defaultQuestion('order', 0);
  o.prompt = 'Ordne';
  o.items = ['Je me lève.', 'Je mange.', 'Je pars.'];
  pruefe('Reihenfolge richtig', M.checkAnswer(o, [0, 1, 2]).correct);
  pruefe('Reihenfolge falsch', !M.checkAnswer(o, [1, 0, 2]).correct);
  pruefe('Reihenfolge unvollstaendig = falsch', !M.checkAnswer(o, [0, 1]).correct);
  pruefe('Reihenfolge: Loesungstext', M.correctAnswerText(o) === 'Je me lève. → Je mange. → Je pars.');
  const kurz = M.defaultQuestion('order', 0);
  kurz.prompt = 'Ordne';
  kurz.items = ['nur eins'];
  pruefe('Reihenfolge: zu wenige Elemente wird bemaengelt', M.questionIssues(kurz).indexOf('few-items') >= 0);

  /* Jede Musterloesung muss Text sein – nicht versehentlich ein Objekt. */
  pruefe('Loesungstext ist immer eine Zeichenkette',
    M.TYPES.every(t => typeof M.correctAnswerText(M.defaultQuestion(t, 0)) === 'string'),
    M.TYPES.map(t => t + ':' + typeof M.correctAnswerText(M.defaultQuestion(t, 0))).join(' '));
}

/* ---------- Anzeige-Mischung ---------- */
console.log('Mischung der Anzeige');
{
  const quiz = M.createQuiz('Test');
  const m = M.defaultQuestion('matching', 0);
  m.prompt = 'x';
  m.pairs = [{ left: 'a', right: '1' }, { left: 'b', right: '2' }, { left: 'c', right: '3' }, { left: '', right: '' }];
  const o = M.defaultQuestion('order', 1);
  o.prompt = 'y';
  o.items = ['a', 'b', 'c', 'd', ''];
  quiz.questions.push(m, o);

  const run = M.buildRun(quiz);
  const mq = run.questions[0];
  const oq = run.questions[1];
  pruefe('leeres Paar faellt weg', mq.pairs.length === 3);
  pruefe('rightOrder ist eine Permutation',
    mq.rightOrder.slice().sort().join(',') === '0,1,2', mq.rightOrder.join(','));
  pruefe('leeres Element faellt weg', oq.items.length === 4);
  pruefe('itemOrder ist eine Permutation',
    oq.itemOrder.slice().sort().join(',') === '0,1,2,3', oq.itemOrder.join(','));

  let nieIdentisch = true;
  for (let i = 0; i < 100; i++) {
    const r = M.buildRun(quiz);
    if (r.questions[1].itemOrder.join(',') === '0,1,2,3') nieIdentisch = false;
  }
  pruefe('Reihenfolge startet nie fertig sortiert', nieIdentisch);
}

/* ---------- Escape-Modus ---------- */
console.log('Escape-Modus');
{
  const quiz = M.createQuiz('Coffre');
  quiz.mode = 'escape';
  for (let i = 0; i < 4; i++) {
    const q = M.defaultQuestion('vf', i);
    q.prompt = 'Frage ' + i;
    quiz.questions.push(q);
  }
  pruefe('Escape-Standardwerte', quiz.escape.timeLimitMin === 20 && quiz.escape.lockOrder === true);
  pruefe('fehlende Codes werden bemaengelt',
    M.quizIssues(quiz).filter(p => p.code === 'no-code').length === 4);

  M.generateCodes(quiz);
  const codes = quiz.questions.map(q => q.code);
  pruefe('Codes werden vergeben', codes.every(c => c && c.length > 0), codes.join(','));
  pruefe('Codes sind verschieden', new Set(codes).size === 4, codes.join(','));
  pruefe('Tresorcode = Fragmente', M.finalCode(quiz) === codes.join(''));

  quiz.escape.finalCodeMode = 'manual';
  quiz.escape.finalCode = 'ma ca-ron';
  pruefe('fester Tresorcode wird vereinheitlicht', M.finalCode(quiz) === 'MACARON');
  pruefe('Code-Vergleich ignoriert Schreibweise', M.normalizeCode(' ma-ca ron ') === 'MACARON');

  quiz.escape.finalCodeMode = 'auto';
  quiz.escape.prize.text = 'Bravo !';
  pruefe('gesetzter Preis zaehlt', M.prizeIsSet(quiz.escape.prize));
  pruefe('leerer Preis wird bemaengelt', !M.prizeIsSet(M.defaultEscape().prize));
  pruefe('vollstaendiges Escape-Quiz ist sauber', M.quizIssues(quiz).length === 0,
    JSON.stringify(M.quizIssues(quiz)));

  /* Bei zufaelliger Auswahl muss der Code zum Durchgang passen. */
  quiz.settings.countMode = 'fixed';
  quiz.settings.count = 2;
  quiz.settings.order = 'random';
  const run = M.buildRun(quiz);
  pruefe('Tresorcode folgt dem Durchgang',
    M.finalCode(quiz, run) === run.questions.map(q => q.code).join(''));

  /* Speichern und Laden darf nichts verlieren. */
  const kopie = M.normalizeQuiz(JSON.parse(JSON.stringify(quiz)));
  pruefe('Modus ueberlebt das Speichern', kopie.mode === 'escape');
  pruefe('Escape-Block ueberlebt das Speichern',
    kopie.escape.prize.text === 'Bravo !' && kopie.escape.timeLimitMin === 20);
  pruefe('Codes ueberleben das Speichern', kopie.questions.map(q => q.code).join('') === codes.join(''));

  const alt = M.normalizeQuiz({ title: 'Alt', questions: [{ type: 'vf', questionText: 'x' }] });
  pruefe('alte Dateien sind weiterhin Marathon', alt.mode === 'marathon');
  pruefe('alte Dateien bekommen Escape-Standardwerte', alt.escape.finalCodeMode === 'auto');
}

console.log('\n' + ok + ' Prüfungen bestanden, ' + fehler + ' fehlgeschlagen.');
process.exit(fehler ? 1 : 0);
