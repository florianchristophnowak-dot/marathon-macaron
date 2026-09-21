/* ==========================================================================
   L'Atelier des Macarons – Lehrkraft-Editor
   Bibliothek im Browser-Speicher, Fragen per Drag & Drop, Vorschau mit
   derselben Engine wie die Schueler-App, Export als JSON-Datei.
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.Macaron;
  var CLE = 'macaron.atelier';

  var TYP = {
    mcq: 'Multiple Choice',
    vf: 'vrai / faux',
    text: 'Freitext',
    gap: 'Lückentext'
  };

  var PROBLEME = {
    'no-questions': 'Das Quiz hat noch keine Fragen.',
    'no-prompt': 'Der Fragetext fehlt.',
    'few-options': 'Es braucht mindestens zwei ausgefüllte Antwortoptionen.',
    'empty-correct-option': 'Die als richtig markierte Option ist leer.',
    'no-answers': 'Es ist keine akzeptierte Antwort hinterlegt.',
    'no-gap': 'Im Satz fehlt ___ – so entsteht keine Lücke.',
    'empty-gap': 'Für mindestens eine Lücke fehlt die Lösung.'
  };

  var App = {
    state: {
      quizzes: [],
      currentId: null,
      tab: 'fragen',
      search: '',
      ouverts: {}
    },
    player: null,
    glisse: null,

    /* ------------------------------------------------------------------ */

    init: function () {
      M.theme.init();
      this.charger();

      if (!this.state.quizzes.length) {
        this.state.quizzes.push(M.createQuiz(''));
      }
      if (!this.courant()) this.state.currentId = this.state.quizzes[0].id;

      this.datalist();
      this.brancher();
      this.rendre();
    },

    charger: function () {
      var enregistre = M.storage.get(CLE, null);
      if (!enregistre || !Array.isArray(enregistre.quizzes)) return;
      var self = this;
      this.state.currentId = enregistre.currentId || null;
      this.state.quizzes = enregistre.quizzes
        .map(function (q) { return M.normalizeQuiz(q); })
        .filter(Boolean);
      if (!this.state.quizzes.some(function (q) { return q.id === self.state.currentId; })) {
        this.state.currentId = this.state.quizzes.length ? this.state.quizzes[0].id : null;
      }
    },

    sauver: function () {
      var ok = M.storage.set(CLE, {
        quizzes: this.state.quizzes,
        currentId: this.state.currentId
      });
      if (!ok) M.toast('Speichern im Browser nicht möglich – bitte per JSON sichern.', 'erreur');
    },

    courant: function () {
      var id = this.state.currentId;
      return this.state.quizzes.filter(function (q) { return q.id === id; })[0] || null;
    },

    touche: function () {
      var quiz = this.courant();
      if (quiz) quiz.updatedAt = new Date().toISOString();
      this.sauver();
    },

    datalist: function () {
      var liste = document.createElement('datalist');
      liste.id = 'disciplines';
      liste.innerHTML = M.DISCIPLINES.map(function (d) {
        return '<option value="' + M.esc(d) + '"></option>';
      }).join('');
      document.body.appendChild(liste);
    },

    /* ---------- Ereignisse ---------- */

    brancher: function () {
      var self = this;

      document.getElementById('btnTheme').addEventListener('click', function () {
        M.toast('Farbschema: ' + M.theme.label(M.theme.cycle()));
      });

      document.getElementById('btnNeu').addEventListener('click', function () {
        var quiz = M.createQuiz('');
        self.state.quizzes.unshift(quiz);
        self.state.currentId = quiz.id;
        self.touche();
        self.rendre();
      });

      document.getElementById('btnBeispiel').addEventListener('click', function () {
        var demo = M.normalizeQuiz(global.MACARON_DEMO);
        if (!demo) { M.toast('Beispiel nicht gefunden.', 'erreur'); return; }
        demo.id = M.uid('quiz');
        self.state.quizzes.unshift(demo);
        self.state.currentId = demo.id;
        self.touche();
        self.rendre();
        M.toast('Beispiel-Quiz geladen 🍬', 'ok');
      });

      document.getElementById('btnImport').addEventListener('click', function () {
        document.getElementById('dateiImport').click();
      });

      document.getElementById('dateiImport').addEventListener('change', function (event) {
        var fichier = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!fichier) return;
        M.readQuizFile(fichier, function (quiz) {
          var existe = self.state.quizzes.some(function (q) { return q.id === quiz.id; });
          if (existe) {
            quiz.id = M.uid('quiz');
            quiz.title += ' (Kopie)';
          }
          self.state.quizzes.unshift(quiz);
          self.state.currentId = quiz.id;
          self.touche();
          self.rendre();
          M.toast('Quiz importiert: ' + quiz.questions.length + ' Fragen', 'ok');
        }, function () {
          M.toast('Diese Datei enthält kein gültiges Quiz.', 'erreur');
        });
      });

      document.getElementById('suche').addEventListener('input', function (event) {
        self.state.search = event.target.value;
        self.rendreBiblio();
      });

      document.getElementById('biblio').addEventListener('click', function (event) {
        var bouton = event.target.closest('[data-quiz-id]');
        if (!bouton) return;
        self.state.currentId = bouton.getAttribute('data-quiz-id');
        self.state.ouverts = {};
        self.sauver();
        self.rendre();
      });

      /* Kopfdaten: ohne Neuaufbau, damit der Fokus im Feld bleibt */
      document.getElementById('titre').addEventListener('input', function (event) {
        var quiz = self.courant();
        if (!quiz) return;
        quiz.title = event.target.value;
        self.touche();
        self.rendreBiblio();
      });
      document.getElementById('sousTitre').addEventListener('input', function (event) {
        var quiz = self.courant();
        if (!quiz) return;
        quiz.subtitle = event.target.value;
        self.touche();
      });

      /* Reiter */
      Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
        tab.addEventListener('click', function () {
          self.state.tab = tab.getAttribute('data-tab');
          self.rendreOnglets();
        });
      });

      /* Fragen hinzufuegen */
      Array.prototype.forEach.call(document.querySelectorAll('[data-ajouter]'), function (bouton) {
        bouton.addEventListener('click', function () {
          self.ajouterQuestion(bouton.getAttribute('data-ajouter'));
        });
      });

      document.getElementById('btnAlleAuf').addEventListener('click', function () {
        var quiz = self.courant();
        if (!quiz) return;
        quiz.questions.forEach(function (q) { self.state.ouverts[q.id] = true; });
        self.rendreFragen();
      });
      document.getElementById('btnAlleZu').addEventListener('click', function () {
        self.state.ouverts = {};
        self.rendreFragen();
      });

      var liste = document.getElementById('listeFragen');
      liste.addEventListener('input', function (e) { self.champModifie(e); });
      liste.addEventListener('change', function (e) { self.champChange(e); });
      liste.addEventListener('click', function (e) { self.clicListe(e); });
      liste.addEventListener('mousedown', function (e) {
        var poignee = e.target.closest('.handle');
        if (!poignee) return;
        var carte = poignee.closest('.q-card');
        if (carte) carte.setAttribute('draggable', 'true');
      });
      liste.addEventListener('dragstart', function (e) { self.dragStart(e); });
      liste.addEventListener('dragover', function (e) { self.dragOver(e); });
      liste.addEventListener('drop', function (e) { self.drop(e); });
      liste.addEventListener('dragend', function (e) { self.dragEnd(e); });

      /* Spielablauf */
      document.querySelector('[data-panel="ablauf"]').addEventListener('change', function (e) {
        self.reglageModifie(e);
      });
      document.querySelector('[data-panel="ablauf"]').addEventListener('input', function (e) {
        if (e.target.type === 'number') self.reglageModifie(e);
      });

      /* Export / Vorschau */
      document.getElementById('btnApercu').addEventListener('click', function () { self.apercu(); });
      document.getElementById('btnExport').addEventListener('click', function () { self.exporter(); });
      document.getElementById('btnExport2').addEventListener('click', function () { self.exporter(); });
      document.getElementById('btnKopieren').addEventListener('click', function () { self.copier(); });
      document.getElementById('btnLoeschen').addEventListener('click', function () { self.supprimer(); });
    },

    /* ---------- Rendern ---------- */

    rendre: function () {
      var quiz = this.courant();
      document.getElementById('titre').value = quiz ? quiz.title : '';
      document.getElementById('sousTitre').value = quiz ? quiz.subtitle : '';
      this.rendreBiblio();
      this.rendreOnglets();
    },

    rendreBiblio: function () {
      var self = this;
      var recherche = this.state.search.trim().toLowerCase();
      var quiz = this.courant();

      document.getElementById('etatQuiz').textContent = quiz
        ? quiz.questions.length + (quiz.questions.length === 1 ? ' Frage' : ' Fragen')
        : 'Kein Quiz';

      var visibles = this.state.quizzes.filter(function (q) {
        return !recherche || q.title.toLowerCase().indexOf(recherche) >= 0;
      });

      document.getElementById('biblio').innerHTML = visibles.length
        ? visibles.map(function (q, i) {
            var actif = q.id === self.state.currentId;
            return '<button type="button" class="biblio__item" data-quiz-id="' + M.esc(q.id) + '" aria-current="' + actif + '">' +
              M.macaronHtml(M.flavorFor(i), 'macaron--s') +
              '<span style="min-width:0">' +
                '<span class="biblio__titre">' + M.esc(q.title || 'Ohne Titel') + '</span>' +
                '<span class="biblio__meta">' + q.questions.length + ' Fragen · ' + self.dateCourte(q.updatedAt) + '</span>' +
              '</span></button>';
          }).join('')
        : '<p class="muted small">Kein Quiz gefunden.</p>';
    },

    dateCourte: function (iso) {
      try {
        return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      } catch (e) {
        return '';
      }
    },

    rendreOnglets: function () {
      var self = this;
      Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
        tab.setAttribute('aria-selected', String(tab.getAttribute('data-tab') === self.state.tab));
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (panel) {
        panel.classList.toggle('hidden', panel.getAttribute('data-panel') !== self.state.tab);
      });
      if (this.state.tab === 'fragen') this.rendreFragen();
      if (this.state.tab === 'ablauf') this.rendreAblauf();
      if (this.state.tab === 'teilen') this.rendreTeilen();
    },

    /* ---------- Fragenliste ---------- */

    rendreFragen: function () {
      var self = this;
      var quiz = this.courant();
      var cible = document.getElementById('listeFragen');
      if (!quiz) { cible.innerHTML = ''; return; }

      if (!quiz.questions.length) {
        cible.innerHTML = '<p class="muted">Noch keine Fragen. Wähle oben einen Fragetyp, um zu beginnen – ' +
          'oder lade links das Beispiel-Quiz.</p>';
        this.rendreBiblio();
        return;
      }

      cible.innerHTML = quiz.questions.map(function (q, index) {
        return self.carteQuestion(q, index);
      }).join('');
      this.rendreBiblio();
    },

    carteQuestion: function (q, index) {
      var ouvert = !!this.state.ouverts[q.id];
      var problemes = M.questionIssues(q);
      var apercu = (q.prompt || q.gapText || '').trim() || 'ohne Text';

      var tete =
        '<div class="q-card__head">' +
          '<span class="handle" title="Zum Verschieben ziehen">⋮⋮</span>' +
          '<span class="num-rond">' + (index + 1) + '</span>' +
          '<span class="pill pill--lavande">' + TYP[q.type] + '</span>' +
          '<span class="q-card__titre">' + M.esc(apercu) + '</span>' +
          '<span class="pill pill--citron' + (problemes.length ? '' : ' hidden') + '" data-warn title="Unvollständig">⚠</span>' +
          '<button type="button" class="icon-btn" data-act="up" title="Nach oben">↑</button>' +
          '<button type="button" class="icon-btn" data-act="down" title="Nach unten">↓</button>' +
          '<button type="button" class="icon-btn" data-act="dup" title="Duplizieren">⧉</button>' +
          '<button type="button" class="icon-btn" data-act="del" title="Löschen">✕</button>' +
          '<button type="button" class="icon-btn" data-act="toggle" title="Auf-/Zuklappen">' + (ouvert ? '▾' : '▸') + '</button>' +
        '</div>';

      var corps = ouvert ? '<div class="q-card__body">' + this.corpsQuestion(q, index) + '</div>' : '';

      return '<div class="q-card' + (problemes.length ? ' q-card--probleme' : '') + '" data-index="' + index + '">' +
        tete + corps + '</div>';
    },

    corpsQuestion: function (q, index) {
      var html =
        '<div class="grid-2">' +
          '<div class="field">' +
            '<label>Disziplin</label>' +
            '<input type="text" name="discipline" list="disciplines" value="' + M.esc(q.discipline) + '">' +
            '<span class="hint">Erscheint als Etikett über der Frage.</span>' +
          '</div>' +
          '<div class="field">' +
            '<label>Fragetyp</label>' +
            '<select name="type">' +
              Object.keys(TYP).map(function (cle) {
                return '<option value="' + cle + '"' + (q.type === cle ? ' selected' : '') + '>' + TYP[cle] + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label>' + (q.type === 'gap' ? 'Arbeitsanweisung (optional)' : 'Frage / Aufgabe') + '</label>' +
          '<textarea name="prompt" placeholder="' +
            (q.type === 'gap' ? 'z. B. Setze das Verb „avoir“ ein.' : 'z. B. Je ___ au cinéma. – Welche Form passt?') +
            '">' + M.esc(q.prompt) + '</textarea>' +
        '</div>';

      if (q.type === 'mcq') html += this.champsMcq(q);
      else if (q.type === 'vf') html += this.champsVf(q);
      else if (q.type === 'text') html += this.champsText(q);
      else html += this.champsGap(q);

      html +=
        '<div class="grid-2">' +
          '<div class="field">' +
            '<label>Tipp (optional)</label>' +
            '<input type="text" name="hint" value="' + M.esc(q.hint) + '" placeholder="Hilfe, die Punkte kostet">' +
          '</div>' +
          '<div class="field">' +
            '<label>Erklärung (optional)</label>' +
            '<input type="text" name="explanation" value="' + M.esc(q.explanation) + '" placeholder="Erscheint nach dem Antworten">' +
          '</div>' +
        '</div>';

      html += '<div data-avert>' + this.texteAvertissement(q) + '</div>';
      return html;
    },

    champsMcq: function (q) {
      var lignes = q.options.map(function (option, i) {
        return '<div class="opt-row">' +
          '<input type="radio" name="correct-' + q.id + '" data-opt="' + i + '"' +
            (q.correctIndex === i ? ' checked' : '') + ' aria-label="Option ' + (i + 1) + ' ist richtig">' +
          '<input type="text" name="option" data-opt="' + i + '" value="' + M.esc(option) + '" placeholder="Antwort ' + (i + 1) + '">' +
          (q.options.length > 2
            ? '<button type="button" class="icon-btn" data-act="opt-del" data-opt="' + i + '" title="Option entfernen">✕</button>'
            : '') +
        '</div>';
      }).join('');

      return '<div class="field">' +
        '<label>Antwortoptionen</label>' + lignes +
        (q.options.length < 6
          ? '<button type="button" class="btn btn--doux btn--mini" data-act="opt-add">+ Option</button>'
          : '') +
        '<span class="hint">Der Punkt links markiert die richtige Antwort.</span>' +
        '</div>';
    },

    champsVf: function (q) {
      return '<div class="field">' +
        '<label>Richtige Lösung</label>' +
        '<label class="check"><input type="radio" name="vf" value="vrai"' + (q.correctVF === 'vrai' ? ' checked' : '') + '><span>vrai (wahr)</span></label>' +
        '<label class="check"><input type="radio" name="vf" value="faux"' + (q.correctVF === 'faux' ? ' checked' : '') + '><span>faux (falsch)</span></label>' +
        '</div>';
    },

    champsText: function (q) {
      return '<div class="field">' +
        '<label>Akzeptierte Antworten</label>' +
        '<textarea name="answers" placeholder="Eine Antwort pro Zeile">' + M.esc(q.answers.join('\n')) + '</textarea>' +
        '<span class="hint">Eine Antwort pro Zeile. Groß-/Kleinschreibung und Satzzeichen sind egal.</span>' +
        '<label class="check" style="margin-top:.5rem"><input type="checkbox" name="ignoreAccents"' +
          (q.ignoreAccents ? ' checked' : '') + '><span>Akzente ignorieren (café = cafe)</span></label>' +
        '</div>';
    },

    champsGap: function (q) {
      return '<div class="field">' +
        '<label>Satz mit Lücken</label>' +
        '<textarea name="gapText" placeholder="Nous ___ trois macarons.">' + M.esc(q.gapText) + '</textarea>' +
        '<span class="hint">Schreibe <code>___</code> (drei Unterstriche) für jede Lücke.</span>' +
        '</div>' +
        '<div class="field" data-gap-solutions>' + this.champsGapSolutions(q) + '</div>' +
        '<label class="check"><input type="checkbox" name="ignoreAccents"' +
          (q.ignoreAccents ? ' checked' : '') + '><span>Akzente ignorieren (café = cafe)</span></label>';
    },

    champsGapSolutions: function (q) {
      var nombre = M.countGaps(q.gapText);
      if (!nombre) return '<span class="hint">Sobald der Satz ein ___ enthält, erscheint hier ein Lösungsfeld.</span>';
      var champs = '';
      for (var i = 0; i < nombre; i++) {
        champs += '<div class="opt-row">' +
          '<span class="num-rond">' + (i + 1) + '</span>' +
          '<input type="text" name="gap" data-gap="' + i + '" value="' + M.esc(q.gaps[i] || '') + '" placeholder="Lösung für Lücke ' + (i + 1) + '">' +
        '</div>';
      }
      return '<label>Lösungen</label>' + champs +
        '<span class="hint">Mehrere gültige Formen mit <code>|</code> trennen, z. B. <code>vais|je vais</code>.</span>';
    },

    texteAvertissement: function (q) {
      var problemes = M.questionIssues(q);
      if (!problemes.length) return '';
      return '<div class="avertissement"><span aria-hidden="true">⚠️</span><span>' +
        problemes.map(function (code) { return PROBLEME[code]; }).join(' ') +
        '</span></div>';
    },

    /* Haelt Warnhinweise beim Tippen aktuell, ohne die Karte neu zu bauen. */
    majAvertissement: function (contexte) {
      var q = contexte.question;
      var problemes = M.questionIssues(q);
      contexte.carte.classList.toggle('q-card--probleme', problemes.length > 0);
      var pastille = contexte.carte.querySelector('[data-warn]');
      if (pastille) pastille.classList.toggle('hidden', problemes.length === 0);
      var bloc = contexte.carte.querySelector('[data-avert]');
      if (bloc) bloc.innerHTML = this.texteAvertissement(q);
    },

    /* ---------- Fragen bearbeiten ---------- */

    ajouterQuestion: function (type) {
      var quiz = this.courant();
      if (!quiz) return;
      if (quiz.questions.length >= M.MAX_QUESTIONS) {
        M.toast('Mehr als ' + M.MAX_QUESTIONS + ' Fragen sind nicht vorgesehen.', 'erreur');
        return;
      }
      var question = M.defaultQuestion(type, quiz.questions.length);
      question.ignoreAccents = quiz.settings.ignoreAccents;
      if (type === 'gap') question.gapText = '';
      quiz.questions.push(question);
      this.state.ouverts[question.id] = true;
      this.touche();
      this.state.tab = 'fragen';
      this.rendreOnglets();
      var carte = document.querySelector('.q-card[data-index="' + (quiz.questions.length - 1) + '"]');
      if (carte) carte.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },

    questionDe: function (element) {
      var carte = element.closest('.q-card');
      if (!carte) return null;
      var quiz = this.courant();
      var index = parseInt(carte.getAttribute('data-index'), 10);
      if (!quiz || isNaN(index) || !quiz.questions[index]) return null;
      return { quiz: quiz, index: index, question: quiz.questions[index], carte: carte };
    },

    /* Tippen: Zustand still aktualisieren, damit der Cursor nicht springt. */
    champModifie: function (event) {
      var cible = event.target;
      var contexte = this.questionDe(cible);
      if (!contexte) return;
      var q = contexte.question;
      var nom = cible.getAttribute('name');

      if (nom === 'discipline') q.discipline = cible.value;
      else if (nom === 'prompt') q.prompt = cible.value;
      else if (nom === 'hint') q.hint = cible.value;
      else if (nom === 'explanation') q.explanation = cible.value;
      else if (nom === 'answers') q.answers = M.splitAnswers(cible.value);
      else if (nom === 'option') {
        var i = parseInt(cible.getAttribute('data-opt'), 10);
        if (!isNaN(i)) q.options[i] = cible.value;
      } else if (nom === 'gap') {
        var g = parseInt(cible.getAttribute('data-gap'), 10);
        if (!isNaN(g)) q.gaps[g] = cible.value;
      } else if (nom === 'gapText') {
        q.gapText = cible.value;
        var nombre = M.countGaps(q.gapText);
        while (q.gaps.length < nombre) q.gaps.push('');
        q.gaps = q.gaps.slice(0, nombre);
        /* Nur den Loesungsblock neu zeichnen – die Textarea behaelt den Fokus. */
        var bloc = contexte.carte.querySelector('[data-gap-solutions]');
        if (bloc) bloc.innerHTML = this.champsGapSolutions(q);
      }

      var titre = contexte.carte.querySelector('.q-card__titre');
      if (titre && (nom === 'prompt' || nom === 'gapText')) {
        titre.textContent = (q.prompt || q.gapText || '').trim() || 'ohne Text';
      }
      this.majAvertissement(contexte);
      this.touche();
    },

    champChange: function (event) {
      var cible = event.target;
      var contexte = this.questionDe(cible);
      if (!contexte) return;
      var q = contexte.question;
      var nom = cible.getAttribute('name');

      if (nom === 'type') {
        q.type = cible.value;
        this.touche();
        this.rendreFragen();
        return;
      }
      if (nom === 'vf') { q.correctVF = cible.value; this.touche(); return; }
      if (nom === 'ignoreAccents') { q.ignoreAccents = cible.checked; this.touche(); return; }
      if (cible.type === 'radio' && cible.hasAttribute('data-opt')) {
        q.correctIndex = parseInt(cible.getAttribute('data-opt'), 10) || 0;
        this.touche();
        this.rendreFragen();
      }
    },

    clicListe: function (event) {
      var bouton = event.target.closest('[data-act]');
      if (!bouton) return;
      var contexte = this.questionDe(bouton);
      if (!contexte) return;
      var quiz = contexte.quiz;
      var index = contexte.index;
      var q = contexte.question;
      var act = bouton.getAttribute('data-act');

      if (act === 'toggle') {
        this.state.ouverts[q.id] = !this.state.ouverts[q.id];
        this.rendreFragen();
      } else if (act === 'del') {
        if (!confirm('Frage ' + (index + 1) + ' wirklich löschen?')) return;
        quiz.questions.splice(index, 1);
        delete this.state.ouverts[q.id];
        this.touche();
        this.rendreFragen();
      } else if (act === 'dup') {
        var copie = JSON.parse(JSON.stringify(q));
        copie.id = M.uid('q');
        quiz.questions.splice(index + 1, 0, copie);
        this.state.ouverts[copie.id] = true;
        this.touche();
        this.rendreFragen();
      } else if (act === 'up' && index > 0) {
        this.deplacer(index, index - 1);
      } else if (act === 'down' && index < quiz.questions.length - 1) {
        this.deplacer(index, index + 1);
      } else if (act === 'opt-add') {
        if (q.options.length < 6) { q.options.push(''); this.touche(); this.rendreFragen(); }
      } else if (act === 'opt-del') {
        var i = parseInt(bouton.getAttribute('data-opt'), 10);
        if (q.options.length > 2 && !isNaN(i)) {
          q.options.splice(i, 1);
          if (q.correctIndex >= q.options.length) q.correctIndex = q.options.length - 1;
          else if (q.correctIndex > i) q.correctIndex--;
          this.touche();
          this.rendreFragen();
        }
      }
    },

    deplacer: function (de, vers) {
      var quiz = this.courant();
      if (!quiz) return;
      var question = quiz.questions.splice(de, 1)[0];
      quiz.questions.splice(vers, 0, question);
      this.touche();
      this.rendreFragen();
    },

    /* ---------- Drag & Drop ---------- */

    dragStart: function (event) {
      var carte = event.target.closest('.q-card');
      if (!carte || carte.getAttribute('draggable') !== 'true') return;
      this.glisse = parseInt(carte.getAttribute('data-index'), 10);
      carte.classList.add('glisse');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try { event.dataTransfer.setData('text/plain', String(this.glisse)); } catch (e) { /* egal */ }
      }
    },

    dragOver: function (event) {
      if (this.glisse === null) return;
      event.preventDefault();
      var carte = event.target.closest('.q-card');
      Array.prototype.forEach.call(document.querySelectorAll('.q-card.cible'), function (el) {
        el.classList.remove('cible');
      });
      if (carte && parseInt(carte.getAttribute('data-index'), 10) !== this.glisse) {
        carte.classList.add('cible');
      }
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    },

    drop: function (event) {
      if (this.glisse === null) return;
      event.preventDefault();
      var carte = event.target.closest('.q-card');
      var de = this.glisse;
      this.glisse = null;
      if (!carte) { this.rendreFragen(); return; }
      var vers = parseInt(carte.getAttribute('data-index'), 10);
      if (isNaN(vers) || vers === de) { this.rendreFragen(); return; }
      this.deplacer(de, vers);
    },

    dragEnd: function () {
      this.glisse = null;
      Array.prototype.forEach.call(document.querySelectorAll('.q-card'), function (el) {
        el.classList.remove('glisse', 'cible');
        el.setAttribute('draggable', 'false');
      });
    },

    /* ---------- Spielablauf ---------- */

    rendreAblauf: function () {
      var quiz = this.courant();
      if (!quiz) return;
      var s = quiz.settings;
      var total = quiz.questions.length;

      var panneau = document.querySelector('[data-panel="ablauf"]');
      panneau.querySelector('input[name="order"][value="' + s.order + '"]').checked = true;
      panneau.querySelector('input[name="countMode"][value="' + s.countMode + '"]').checked = true;
      panneau.querySelector('input[name="pick"][value="' + s.pick + '"]').checked = true;

      document.getElementById('anzahlGesamt').textContent = String(total);
      var maxi = Math.max(1, total);
      ['countFixed', 'countMin', 'countMax'].forEach(function (id) {
        document.getElementById(id).max = String(maxi);
      });
      document.getElementById('countFixed').value = String(M.clamp(s.count, 1, maxi));
      document.getElementById('countMin').value = String(M.clamp(s.countMin, 1, maxi));
      document.getElementById('countMax').value = String(M.clamp(s.countMax, 1, maxi));

      [['shuffleOptions', s.shuffleOptions], ['allowHints', s.allowHints], ['speedBonus', s.speedBonus],
       ['comboBonus', s.comboBonus], ['showExplanations', s.showExplanations],
       ['ignoreAccents', s.ignoreAccents], ['allowStudentSettings', s.allowStudentSettings]
      ].forEach(function (paire) {
        document.getElementById(paire[0]).checked = !!paire[1];
      });
      document.getElementById('hintPenalty').value = String(s.hintPenalty);

      this.majEtatsAblauf();
    },

    majEtatsAblauf: function () {
      var quiz = this.courant();
      if (!quiz) return;
      var s = quiz.settings;

      document.getElementById('countFixed').disabled = s.countMode !== 'fixed';
      document.getElementById('countMin').disabled = s.countMode !== 'range';
      document.getElementById('countMax').disabled = s.countMode !== 'range';
      document.getElementById('hintPenalty').disabled = !s.allowHints;

      /* Die Auswahlfrage stellt sich nur, wenn nicht alle Fragen gespielt werden. */
      document.getElementById('blocAuswahl').classList.toggle(
        'hidden', !(s.order === 'sequential' && s.countMode !== 'all')
      );

      document.getElementById('recette').innerHTML = this.texteRecette();
    },

    texteRecette: function () {
      var quiz = this.courant();
      var s = quiz.settings;
      var total = quiz.questions.length;
      if (!total) return 'Sobald Fragen angelegt sind, steht hier, wie der Durchgang aussieht.';

      var nombre;
      if (s.countMode === 'fixed') nombre = '<b>' + Math.min(s.count, total) + ' von ' + total + '</b> Fragen';
      else if (s.countMode === 'range') {
        var lo = Math.min(s.countMin, total);
        var hi = Math.min(Math.max(s.countMax, lo), total);
        nombre = lo === hi
          ? '<b>' + lo + ' von ' + total + '</b> Fragen'
          : '<b>' + lo + ' bis ' + hi + '</b> von ' + total + ' Fragen (jedes Mal neu ausgelost)';
      } else nombre = '<b>alle ' + total + '</b> Fragen';

      var ordre = s.order === 'random'
        ? 'in <b>zufälliger Reihenfolge</b>'
        : 'in der <b>Reihenfolge dieser Liste</b>';

      var choix = '';
      if (s.order === 'sequential' && s.countMode !== 'all') {
        choix = s.pick === 'random'
          ? ' Ausgewählt wird zufällig aus der ganzen Liste.'
          : ' Gespielt werden die Fragen von oben.';
      }

      var extras = [];
      if (s.shuffleOptions) extras.push('Antwortoptionen werden gemischt');
      if (s.allowHints) extras.push('Tipps kosten ' + s.hintPenalty + ' Punkte');
      if (s.speedBonus) extras.push('Tempo-Bonus aktiv');
      if (s.comboBonus) extras.push('Serien-Bonus aktiv');
      if (s.allowStudentSettings) extras.push('die Klasse darf selbst wählen');

      return 'Gespielt werden ' + nombre + ' ' + ordre + '.' + choix +
        (extras.length ? '<br><span class="muted small">' + extras.join(' · ') + '.</span>' : '');
    },

    reglageModifie: function (event) {
      var quiz = this.courant();
      if (!quiz) return;
      var s = quiz.settings;
      var cible = event.target;
      var total = Math.max(1, quiz.questions.length);

      if (cible.name === 'order') s.order = cible.value;
      else if (cible.name === 'countMode') s.countMode = cible.value;
      else if (cible.name === 'pick') s.pick = cible.value;
      else if (cible.id === 'countFixed') s.count = M.clamp(cible.value, 1, total);
      else if (cible.id === 'countMin') s.countMin = M.clamp(cible.value, 1, total);
      else if (cible.id === 'countMax') s.countMax = M.clamp(cible.value, 1, total);
      else if (cible.id === 'hintPenalty') s.hintPenalty = M.clamp(cible.value, 0, 200);
      else if (cible.type === 'checkbox') s[cible.id] = cible.checked;

      if (s.countMax < s.countMin) {
        if (cible.id === 'countMin') s.countMax = s.countMin;
        else s.countMin = s.countMax;
        document.getElementById('countMin').value = String(s.countMin);
        document.getElementById('countMax').value = String(s.countMax);
      }

      this.touche();
      this.majEtatsAblauf();
    },

    /* ---------- Teilen ---------- */

    rendreTeilen: function () {
      var quiz = this.courant();
      if (!quiz) return;
      document.getElementById('jsonBrut').value = JSON.stringify(quiz, null, 2);

      var problemes = M.quizIssues(quiz);
      var zone = document.getElementById('controle');
      if (!problemes.length) {
        zone.innerHTML = '<p class="pill pill--pistache">✓ Alles bereit – das Quiz kann gespeichert werden.</p>';
        return;
      }
      zone.innerHTML = '<ul class="stack" style="padding-left:1.1rem">' +
        problemes.map(function (p) {
          var ou = p.index >= 0 ? 'Frage ' + (p.index + 1) + ': ' : '';
          return '<li class="small">' + M.esc(ou + (PROBLEME[p.code] || p.code)) + '</li>';
        }).join('') + '</ul>';
    },

    exporter: function () {
      var quiz = this.courant();
      if (!quiz) return;
      if (!quiz.questions.length) {
        M.toast('Das Quiz braucht mindestens eine Frage.', 'erreur');
        return;
      }
      var problemes = M.quizIssues(quiz);
      if (problemes.length && !confirm(
        problemes.length + ' Stelle(n) sind noch unvollständig (siehe Reiter „Teilen").\nTrotzdem speichern?')) {
        return;
      }
      quiz.updatedAt = new Date().toISOString();
      this.sauver();
      M.downloadJson(quiz, M.slugify(quiz.title) + '.json');
      M.toast('JSON-Datei gespeichert 💾', 'ok');
    },

    copier: function () {
      var champ = document.getElementById('jsonBrut');
      champ.value = JSON.stringify(this.courant(), null, 2);
      champ.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (!ok && navigator.clipboard) {
        navigator.clipboard.writeText(champ.value).then(function () {
          M.toast('JSON kopiert 📋', 'ok');
        }, function () {
          M.toast('Kopieren nicht möglich – bitte den Text markieren.', 'erreur');
        });
        return;
      }
      M.toast(ok ? 'JSON kopiert 📋' : 'Kopieren nicht möglich – bitte den Text markieren.', ok ? 'ok' : 'erreur');
    },

    supprimer: function () {
      var quiz = this.courant();
      if (!quiz) return;
      if (!confirm('„' + (quiz.title || 'Ohne Titel') + '" endgültig aus der Bibliothek löschen?')) return;
      this.state.quizzes = this.state.quizzes.filter(function (q) { return q.id !== quiz.id; });
      if (!this.state.quizzes.length) this.state.quizzes.push(M.createQuiz(''));
      this.state.currentId = this.state.quizzes[0].id;
      this.state.ouverts = {};
      this.sauver();
      this.rendre();
      M.toast('Quiz gelöscht.');
    },

    /* ---------- Vorschau ---------- */

    apercu: function () {
      var self = this;
      var quiz = this.courant();
      if (!quiz || !quiz.questions.length) {
        M.toast('Für die Vorschau braucht es mindestens eine Frage.', 'erreur');
        return;
      }

      var fond = document.createElement('div');
      fond.className = 'modal-backdrop';
      fond.innerHTML =
        '<div class="modal modal--large" role="dialog" aria-modal="true" aria-label="Vorschau">' +
          '<div class="row row--between" style="margin-bottom:.8rem">' +
            '<div><strong>Vorschau</strong> <span class="muted small">– genau so spielt die Klasse.</span></div>' +
            '<button type="button" class="icon-btn" data-fermer title="Schließen">✕</button>' +
          '</div>' +
          '<div data-apercu></div>' +
        '</div>';
      document.body.appendChild(fond);

      function fermer() {
        if (self.player) { self.player.destroy(); self.player = null; }
        document.removeEventListener('keydown', surEchap);
        if (fond.parentNode) fond.parentNode.removeChild(fond);
      }
      function surEchap(event) {
        if (event.key === 'Escape') fermer();
      }
      function lancer() {
        self.player = M.createPlayer({
          mount: fond.querySelector('[data-apercu]'),
          quiz: quiz,
          playerName: 'Madame la professeure',
          replayLabel: 'Neu auslosen',
          quitLabel: 'Vorschau schließen',
          onReplay: function () { lancer(); },
          onQuit: fermer
        });
      }

      fond.addEventListener('click', function (event) {
        if (event.target === fond || event.target.closest('[data-fermer]')) fermer();
      });
      document.addEventListener('keydown', surEchap);
      lancer();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

  global.AppLehrer = App;
})(window);
