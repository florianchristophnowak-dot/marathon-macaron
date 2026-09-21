/* ==========================================================================
   Le Marathon des Macarons – gemeinsamer Kern
   Datenmodell, Auswahl-Logik (Reihenfolge & Anzahl), Antwortpruefung, Punkte.
   Laeuft ohne Build-Schritt direkt per file:// im Browser.
   ========================================================================== */
(function (global) {
  'use strict';

  var M = {};

  M.FORMAT = 'marathon-macaron-quiz';
  M.VERSION = 1;
  M.MAX_QUESTIONS = 60;
  M.FLAVORS = ['framboise', 'pistache', 'lavande', 'citron', 'myrtille', 'chocolat'];

  /* Typisch franzoesische "Disziplinen" – geben jeder Frage etwas Farbe. */
  M.DISCIPLINES = [
    'Marathon de macarons',
    'Course de baguette',
    'Slalom de croissant',
    'Relais de la Tour Eiffel',
    'Sprint de camembert',
    'Duel de béret',
    'Danse du cancan',
    'Rallye du fromage',
    'Défi du café au lait',
    'Course de crêpes',
    'Concours de chocolat chaud',
    'Course des escargots',
    'Triathlon de la pâtisserie',
    'Tournoi de la madeleine',
    'Grand Prix du macaron pistache'
  ];

  M.PRENOMS = [
    'Camille', 'Louis', 'Chloé', 'Pierre', 'Léa', 'Hugo', 'Jeanne', 'Lucas', 'Inès', 'Thomas',
    'Manon', 'Baptiste', 'Zoé', 'Julien', 'Amélie', 'Emma', 'Jade', 'Lina', 'Noah', 'Adam',
    'Léo', 'Gabriel', 'Raphaël', 'Arthur', 'Maël', 'Nolan', 'Sacha', 'Yanis', 'Rayan', 'Enzo',
    'Mehdi', 'Sarah', 'Nora', 'Maya', 'Imane', 'Kenza', 'Omar', 'Youssef', 'Amina', 'Milan',
    'Louna', 'Nicolas', 'Clara', 'Paul', 'Julie', 'Anaïs', 'Salomé', 'Aya', 'Ibrahim', 'Nina',
    'Lily', 'Giulia', 'Sofiane', 'Bilal', 'Fatou', 'Aïcha', 'Meryem', 'Eden', 'Aaron', 'Anna',
    'Hana', 'Yara', 'Leïla', 'Rania', 'Khalil', 'Selma', 'Nassim', 'Farah', 'Sami', 'Léna',
    'Ilyes', 'Imran', 'Yasmine', 'Théo', 'Elsa', 'Oscar', 'Alice', 'Victor', 'Romane', 'Naïm'
  ];

  /* Spitznamen fuer die Schueler-App: "Camille Croissant" & Co. */
  M.SURNOMS = [
    'Croissant', 'Macaron', 'Baguette', 'Éclair', 'Praliné', 'Cannelle', 'Pistache',
    'Framboise', 'Caramel', 'Vanille', 'Myrtille', 'Citron', 'Chocolat', 'Brioche', 'Nougat'
  ];

  M.TYPES = ['mcq', 'vf', 'text', 'gap'];

  /* ---------- kleine Helfer ---------- */

  M.uid = function (prefix) {
    return (prefix || 'id') + '_' +
      Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 8);
  };

  M.clamp = function (value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) n = min;
    return Math.min(max, Math.max(min, n));
  };

  M.esc = function (value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /* Fisher-Yates – mischt eine Kopie, das Original bleibt unberuehrt. */
  M.shuffle = function (list) {
    var out = (list || []).slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  };

  M.randomInt = function (min, max) {
    if (max < min) max = min;
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  M.pickOne = function (list) {
    if (!list || !list.length) return '';
    return list[Math.floor(Math.random() * list.length)];
  };

  M.flavorFor = function (index) {
    return M.FLAVORS[index % M.FLAVORS.length];
  };

  /* Antworten vergleichbar machen: Kleinschreibung, Leerzeichen, Satzzeichen,
     auf Wunsch auch Akzente (é -> e), damit ein fehlendes Accent aigu nicht
     gleich die ganze Antwort kostet. Apostrophe werden vereinheitlicht. */
  M.normalizeAnswer = function (value, ignoreAccents) {
    var s = String(value === null || value === undefined ? '' : value);
    s = s.replace(/[‘’ʼ´`]/g, "'");
    s = s.toLowerCase().trim();
    if (ignoreAccents) {
      if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
      s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae');
    }
    s = s.replace(/[.,;:!?¡¿"»«]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  /* "vais|va" -> ["vais", "va"];  Zeilenumbrueche zaehlen ebenfalls als Trenner. */
  M.splitAnswers = function (value) {
    if (Array.isArray(value)) {
      return value.map(function (v) { return String(v).trim(); }).filter(Boolean);
    }
    return String(value || '')
      .split(/[|\n]/)
      .map(function (v) { return v.trim(); })
      .filter(Boolean);
  };

  M.GAP_TOKEN = /_{2,}/g;

  /* Zerlegt "Je ___ à l'école." in Text- und Luecken-Stuecke. */
  M.splitGapText = function (text) {
    var parts = [];
    var rest = String(text || '');
    var re = new RegExp(M.GAP_TOKEN.source, 'g');
    var last = 0;
    var match;
    while ((match = re.exec(rest)) !== null) {
      if (match.index > last) parts.push({ kind: 'text', value: rest.slice(last, match.index) });
      parts.push({ kind: 'gap' });
      last = match.index + match[0].length;
    }
    if (last < rest.length) parts.push({ kind: 'text', value: rest.slice(last) });
    return parts;
  };

  M.countGaps = function (text) {
    return M.splitGapText(text).filter(function (p) { return p.kind === 'gap'; }).length;
  };

  /* ---------- Datenmodell ---------- */

  M.defaultSettings = function () {
    return {
      order: 'sequential',        // 'sequential' | 'random'
      countMode: 'all',           // 'all' | 'fixed' | 'range'
      count: 10,                  // bei 'fixed'
      countMin: 5,                // bei 'range'
      countMax: 10,               // bei 'range'
      pick: 'start',              // bei 'sequential' + weniger Fragen: 'start' | 'random'
      shuffleOptions: true,       // Antwortoptionen mischen
      allowHints: true,
      hintPenalty: 30,
      speedBonus: true,
      comboBonus: true,
      showExplanations: true,
      ignoreAccents: true,        // Voreinstellung fuer neue Freitext-Fragen
      allowStudentSettings: false // duerfen Schueler Reihenfolge/Anzahl selbst waehlen?
    };
  };

  M.defaultQuestion = function (type, index) {
    var i = typeof index === 'number' ? index : 0;
    return {
      id: M.uid('q'),
      type: M.TYPES.indexOf(type) >= 0 ? type : 'mcq',
      discipline: M.DISCIPLINES[i % M.DISCIPLINES.length],
      prompt: '',
      hint: '',
      explanation: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      correctVF: 'vrai',
      answers: [],
      gapText: '',
      gaps: [],
      ignoreAccents: true
    };
  };

  M.createQuiz = function (title) {
    var now = new Date().toISOString();
    return {
      format: M.FORMAT,
      version: M.VERSION,
      id: M.uid('quiz'),
      title: title === undefined ? 'Nouveau quiz' : String(title),
      subtitle: '',
      author: '',
      createdAt: now,
      updatedAt: now,
      settings: M.defaultSettings(),
      questions: []
    };
  };

  /* Bringt beliebiges (auch aelteres oder fremdes) JSON in die kanonische Form.
     Akzeptiert bewusst auch das schlanke Format der Vorgaenger-App
     ({ title, questions: [{ questionText, correctText, ... }] }). */
  M.normalizeQuiz = function (raw) {
    if (!raw || typeof raw !== 'object') return null;
    var src = raw.quiz && Array.isArray(raw.quiz.questions) ? raw.quiz : raw;
    if (!Array.isArray(src.questions)) return null;

    var base = M.createQuiz(src.title || 'Quiz');
    var defaults = M.defaultSettings();
    var s = (src.settings && typeof src.settings === 'object') ? src.settings : {};

    var quiz = {
      format: M.FORMAT,
      version: M.VERSION,
      id: src.id || base.id,
      title: String(src.title === undefined || src.title === null ? '' : src.title),
      subtitle: String(src.subtitle || ''),
      author: String(src.author || ''),
      createdAt: src.createdAt || base.createdAt,
      updatedAt: src.updatedAt || base.updatedAt,
      settings: {
        order: s.order === 'random' ? 'random' : defaults.order,
        countMode: (s.countMode === 'fixed' || s.countMode === 'range') ? s.countMode : defaults.countMode,
        count: M.clamp(s.count === undefined ? defaults.count : s.count, 1, M.MAX_QUESTIONS),
        countMin: M.clamp(s.countMin === undefined ? defaults.countMin : s.countMin, 1, M.MAX_QUESTIONS),
        countMax: M.clamp(s.countMax === undefined ? defaults.countMax : s.countMax, 1, M.MAX_QUESTIONS),
        pick: s.pick === 'random' ? 'random' : defaults.pick,
        shuffleOptions: s.shuffleOptions !== false,
        allowHints: s.allowHints !== false,
        hintPenalty: M.clamp(s.hintPenalty === undefined ? defaults.hintPenalty : s.hintPenalty, 0, 200),
        speedBonus: s.speedBonus !== false,
        comboBonus: s.comboBonus !== false,
        showExplanations: s.showExplanations !== false,
        ignoreAccents: s.ignoreAccents !== false,
        allowStudentSettings: s.allowStudentSettings === true
      },
      questions: []
    };

    if (quiz.settings.countMax < quiz.settings.countMin) {
      quiz.settings.countMax = quiz.settings.countMin;
    }

    quiz.questions = src.questions.map(function (q, index) {
      return M.normalizeQuestion(q, index, quiz.settings.ignoreAccents);
    }).filter(Boolean).slice(0, M.MAX_QUESTIONS);

    return quiz;
  };

  M.normalizeQuestion = function (raw, index, ignoreAccentsDefault) {
    if (!raw || typeof raw !== 'object') return null;
    var type = raw.type;
    if (type === 'freetext' || type === 'texte') type = 'text';
    if (M.TYPES.indexOf(type) < 0) type = 'mcq';

    var q = M.defaultQuestion(type, index);
    q.id = raw.id ? String(raw.id) : q.id;
    q.discipline = String(raw.discipline || q.discipline);
    /* questionText: Feldname der Vorgaenger-App */
    q.prompt = String(raw.prompt || raw.questionText || '');
    q.hint = String(raw.hint || '');
    q.explanation = String(raw.explanation || '');
    q.ignoreAccents = raw.ignoreAccents === undefined
      ? (ignoreAccentsDefault !== false)
      : raw.ignoreAccents !== false;

    var options = Array.isArray(raw.options) ? raw.options.map(function (o) { return String(o === null || o === undefined ? '' : o); }) : [];
    while (options.length < 2) options.push('');
    q.options = options.slice(0, 6);
    q.correctIndex = M.clamp(raw.correctIndex === undefined ? 0 : raw.correctIndex, 0, q.options.length - 1);
    q.correctVF = raw.correctVF === 'faux' ? 'faux' : 'vrai';

    /* correctText: Feldname der Vorgaenger-App */
    q.answers = M.splitAnswers(raw.answers !== undefined ? raw.answers : raw.correctText);

    q.gapText = String(raw.gapText || '');
    var gapCount = M.countGaps(q.gapText);
    var gaps = Array.isArray(raw.gaps) ? raw.gaps.map(function (g) { return String(g === null || g === undefined ? '' : g); }) : [];
    while (gaps.length < gapCount) gaps.push('');
    q.gaps = gaps.slice(0, Math.max(gapCount, 0));

    return q;
  };

  /* Welche Angaben fehlen? Liefert Codes – die Texte stehen in der jeweiligen App. */
  M.questionIssues = function (q) {
    var issues = [];
    if (!q.prompt.trim() && !(q.type === 'gap' && q.gapText.trim())) issues.push('no-prompt');
    if (q.type === 'mcq') {
      var filled = q.options.filter(function (o) { return o.trim(); });
      if (filled.length < 2) issues.push('few-options');
      if (!String(q.options[q.correctIndex] || '').trim()) issues.push('empty-correct-option');
    }
    if (q.type === 'text' && !q.answers.length) issues.push('no-answers');
    if (q.type === 'gap') {
      var gapCount = M.countGaps(q.gapText);
      if (!gapCount) issues.push('no-gap');
      for (var i = 0; i < gapCount; i++) {
        if (!String(q.gaps[i] || '').trim()) { issues.push('empty-gap'); break; }
      }
    }
    return issues;
  };

  M.quizIssues = function (quiz) {
    var list = [];
    if (!quiz.questions.length) list.push({ index: -1, code: 'no-questions' });
    quiz.questions.forEach(function (q, index) {
      M.questionIssues(q).forEach(function (code) {
        list.push({ index: index, code: code });
      });
    });
    return list;
  };

  /* ---------- Reihenfolge & Anzahl ---------- */

  /* Wie viele Fragen werden gespielt? */
  M.resolveCount = function (settings, total) {
    if (!total) return 0;
    if (settings.countMode === 'fixed') {
      return M.clamp(settings.count, 1, total);
    }
    if (settings.countMode === 'range') {
      var lo = M.clamp(settings.countMin, 1, total);
      var hi = M.clamp(settings.countMax, lo, total);
      return M.randomInt(lo, hi);
    }
    return total;
  };

  /* Baut einen Durchgang: waehlt Fragen aus, sortiert sie und mischt bei Bedarf
     die Antwortoptionen (correctIndex wird dabei mitgezogen). */
  M.buildRun = function (quiz, overrides) {
    var settings = Object.assign({}, quiz.settings, overrides || {});
    var pool = quiz.questions.slice();
    var total = pool.length;
    var count = M.resolveCount(settings, total);

    var chosen;
    if (settings.order === 'random') {
      chosen = M.shuffle(pool).slice(0, count);
    } else if (count >= total) {
      chosen = pool;
    } else if (settings.pick === 'random') {
      /* Zufaellige Auswahl, aber in der vom Lehrer gesetzten Reihenfolge. */
      var indices = M.shuffle(pool.map(function (_, i) { return i; }))
        .slice(0, count)
        .sort(function (a, b) { return a - b; });
      chosen = indices.map(function (i) { return pool[i]; });
    } else {
      chosen = pool.slice(0, count);
    }

    var questions = chosen.map(function (q, position) {
      var copy = JSON.parse(JSON.stringify(q));
      copy.flavor = M.flavorFor(position);
      if (copy.type === 'mcq' && settings.shuffleOptions) {
        var pairs = copy.options.map(function (text, i) { return { text: text, i: i }; })
          .filter(function (p) { return String(p.text).trim() !== ''; });
        var mixed = M.shuffle(pairs);
        copy.options = mixed.map(function (p) { return p.text; });
        var newIndex = mixed.findIndex(function (p) { return p.i === q.correctIndex; });
        copy.correctIndex = newIndex >= 0 ? newIndex : 0;
      } else if (copy.type === 'mcq') {
        var kept = copy.options.map(function (text, i) { return { text: text, i: i }; })
          .filter(function (p) { return String(p.text).trim() !== ''; });
        copy.options = kept.map(function (p) { return p.text; });
        var keptIndex = kept.findIndex(function (p) { return p.i === q.correctIndex; });
        copy.correctIndex = keptIndex >= 0 ? keptIndex : 0;
      }
      return copy;
    });

    return { settings: settings, questions: questions, total: questions.length };
  };

  /* ---------- Antworten pruefen ---------- */

  M.checkAnswer = function (question, response) {
    if (question.type === 'mcq') {
      return { correct: response === question.correctIndex };
    }
    if (question.type === 'vf') {
      return { correct: response === question.correctVF };
    }
    if (question.type === 'text') {
      var given = M.normalizeAnswer(response, question.ignoreAccents);
      var ok = question.answers.some(function (a) {
        return given !== '' && M.normalizeAnswer(a, question.ignoreAccents) === given;
      });
      return { correct: ok };
    }
    if (question.type === 'gap') {
      var values = Array.isArray(response) ? response : [];
      var perGap = question.gaps.map(function (solution, i) {
        var accepted = M.splitAnswers(solution);
        var user = M.normalizeAnswer(values[i], question.ignoreAccents);
        return user !== '' && accepted.some(function (a) {
          return M.normalizeAnswer(a, question.ignoreAccents) === user;
        });
      });
      return {
        correct: perGap.length > 0 && perGap.every(Boolean),
        perGap: perGap
      };
    }
    return { correct: false };
  };

  /* Die sichtbare Musterloesung fuer das Feedback. */
  M.correctAnswerText = function (question) {
    if (question.type === 'mcq') return String(question.options[question.correctIndex] || '');
    if (question.type === 'vf') return question.correctVF;
    if (question.type === 'text') return question.answers.join(' / ');
    if (question.type === 'gap') {
      return question.gaps.map(function (g) { return M.splitAnswers(g)[0] || '…'; }).join(' · ');
    }
    return '';
  };

  /* ---------- Punkte ---------- */

  M.SCORE = {
    base: 100,
    speedMax: 50,
    speedWindowMs: 12000, /* Fremdsprache: etwas mehr Luft als bei reinem Reflex */
    combo: 40,
    comboFrom: 3
  };

  /* Punkte einer einzelnen Antwort – inklusive Aufschluesselung fuer die Anzeige. */
  M.scoreAnswer = function (entry, streak, settings) {
    if (!entry.correct) return { total: 0, base: 0, speed: 0, combo: 0, penalty: 0 };
    var base = M.SCORE.base;
    var speed = 0;
    if (settings.speedBonus) {
      var left = M.SCORE.speedWindowMs - Math.max(0, entry.timeMs);
      if (left > 0) speed = Math.round(M.SCORE.speedMax * (left / M.SCORE.speedWindowMs));
    }
    var combo = (settings.comboBonus && streak >= M.SCORE.comboFrom) ? M.SCORE.combo : 0;
    var penalty = entry.usedHint ? M.clamp(settings.hintPenalty, 0, 200) : 0;
    var total = Math.max(0, base + speed + combo - penalty);
    return { total: total, base: base, speed: speed, combo: combo, penalty: penalty };
  };

  M.summarize = function (entries, settings) {
    var streak = 0;
    var score = 0;
    var correct = 0;
    var hints = 0;
    var timeMs = 0;
    entries.forEach(function (entry) {
      streak = entry.correct ? streak + 1 : 0;
      if (entry.correct) correct++;
      if (entry.usedHint) hints++;
      timeMs += Math.max(0, entry.timeMs || 0);
      score += M.scoreAnswer(entry, streak, settings).total;
    });
    var best = 0;
    var current = 0;
    entries.forEach(function (entry) {
      current = entry.correct ? current + 1 : 0;
      if (current > best) best = current;
    });
    return {
      score: score,
      correct: correct,
      total: entries.length,
      hints: hints,
      timeMs: timeMs,
      bestStreak: best
    };
  };

  /* ---------- Speicher (faellt bei blockiertem localStorage still zurueck) ---------- */

  M.storage = {
    get: function (key, fallback) {
      try {
        var raw = global.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        global.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try { global.localStorage.removeItem(key); } catch (e) { /* egal */ }
    }
  };

  /* ---------- Dateien ---------- */

  M.slugify = function (value) {
    var s = String(value || '').toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'quiz-macaron';
  };

  M.downloadJson = function (data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  M.readQuizFile = function (file, onDone, onError) {
    var reader = new FileReader();
    reader.onload = function (event) {
      var quiz = null;
      try {
        quiz = M.normalizeQuiz(JSON.parse(event.target.result));
      } catch (e) {
        quiz = null;
      }
      if (quiz && quiz.questions.length) onDone(quiz);
      else if (onError) onError();
    };
    reader.onerror = function () { if (onError) onError(); };
    reader.readAsText(file, 'utf-8');
  };

  /* ---------- Farbschema ---------- */

  M.theme = {
    KEY: 'macaron.theme',
    apply: function (mode) {
      var root = document.documentElement;
      if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
      else root.removeAttribute('data-theme');
      return mode;
    },
    current: function () {
      return M.storage.get(M.theme.KEY, 'auto');
    },
    init: function () {
      return M.theme.apply(M.theme.current());
    },
    /* auto -> hell -> dunkel -> auto */
    cycle: function () {
      var order = ['auto', 'light', 'dark'];
      var next = order[(order.indexOf(M.theme.current()) + 1) % order.length];
      M.storage.set(M.theme.KEY, next);
      M.theme.apply(next);
      return next;
    },
    label: function (mode) {
      if (mode === 'light') return '☀️ Hell';
      if (mode === 'dark') return '🌙 Dunkel';
      return '🎨 Automatisch';
    },
    labelFr: function (mode) {
      if (mode === 'light') return '☀️ Clair';
      if (mode === 'dark') return '🌙 Sombre';
      return '🎨 Automatique';
    }
  };

  /* ---------- Bausteine fuer die Oberflaeche ---------- */

  M.macaronHtml = function (flavor, extraClass) {
    return '<span class="macaron ' + (extraClass || '') + '" data-flavor="' + M.esc(flavor || 'framboise') + '" aria-hidden="true">' +
      '<i class="coque-haut"></i><i class="ganache"></i><i class="coque-bas"></i></span>';
  };

  M.toast = function (message, kind) {
    var zone = document.querySelector('.toast-zone');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'toast-zone';
      document.body.appendChild(zone);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.setAttribute('role', 'status');
    el.textContent = message;
    zone.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s ease';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, 2600);
  };

  global.Macaron = M;
})(window);
