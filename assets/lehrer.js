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
    gap: 'Lückentext',
    matching: 'Zuordnung',
    order: 'Reihenfolge'
  };

  var PROBLEME = {
    'no-questions': 'Das Quiz hat noch keine Fragen.',
    'no-prompt': 'Der Fragetext fehlt.',
    'few-options': 'Es braucht mindestens zwei ausgefüllte Antwortoptionen.',
    'empty-correct-option': 'Die als richtig markierte Option ist leer.',
    'no-answers': 'Es ist keine akzeptierte Antwort hinterlegt.',
    'no-gap': 'Im Satz fehlt ___ – so entsteht keine Lücke.',
    'empty-gap': 'Für mindestens eine Lücke fehlt die Lösung.',
    'few-pairs': 'Es braucht mindestens zwei vollständige Paare.',
    'few-items': 'Es braucht mindestens zwei Elemente.',
    'no-code': 'Der Station fehlt ihr Code-Fragment.',
    'no-final-code': 'Der eigene Tresorcode ist leer.',
    'no-prize': 'Im Tresor liegt noch kein Preis.'
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
      Array.prototype.forEach.call(document.querySelectorAll('.tab[data-tab]'), function (tab) {
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
        if (e.target.name === 'mode') { self.changerMode(e.target.value); return; }
        self.reglageModifie(e);
      });
      document.querySelector('[data-panel="ablauf"]').addEventListener('input', function (e) {
        if (e.target.type === 'number') self.reglageModifie(e);
      });

      /* Tresor-Einstellungen */
      document.getElementById('blocEscape').addEventListener('change', function (e) { self.escapeModifie(e); });
      document.getElementById('blocEscape').addEventListener('input', function (e) {
        if (e.target.tagName === 'TEXTAREA' || e.target.type === 'text' || e.target.type === 'number') {
          self.escapeModifie(e);
        }
      });
      document.getElementById('btnCodes').addEventListener('click', function () {
        var quiz = self.courant();
        if (!quiz || !quiz.questions.length) {
          M.toast('Erst Fragen anlegen, dann Codes verteilen.', 'erreur');
          return;
        }
        M.generateCodes(quiz);
        self.touche();
        self.majApercuCode();
        self.rendreFragen();
        M.toast('Codes verteilt 🔐', 'ok');
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-prix]'), function (onglet) {
        onglet.addEventListener('click', function () {
          var quiz = self.courant();
          if (!quiz) return;
          quiz.escape.prize.type = onglet.getAttribute('data-prix');
          self.touche();
          self.rendrePrix();
        });
      });
      document.getElementById('prixImage').addEventListener('change', function (e) {
        var fichier = e.target.files && e.target.files[0];
        e.target.value = '';
        if (fichier) self.chargerImage(fichier);
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
      this.rendreEscape();
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
      Array.prototype.forEach.call(document.querySelectorAll('.tab[data-tab]'), function (tab) {
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
      else if (q.type === 'matching') html += this.champsMatching(q);
      else if (q.type === 'order') html += this.champsOrder(q);
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

      if (this.courant().mode === 'escape') html += this.champsStation(q, index);

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

    champsMatching: function (q) {
      var lignes = q.pairs.map(function (paire, i) {
        return '<div class="opt-row">' +
          '<span class="num-rond">' + (i + 1) + '</span>' +
          '<input type="text" name="pairLeft" data-pair="' + i + '" value="' + M.esc(paire.left) + '" placeholder="links">' +
          '<span aria-hidden="true">→</span>' +
          '<input type="text" name="pairRight" data-pair="' + i + '" value="' + M.esc(paire.right) + '" placeholder="rechts">' +
          (q.pairs.length > 2
            ? '<button type="button" class="icon-btn" data-act="pair-del" data-pair="' + i + '" title="Paar entfernen">✕</button>'
            : '') +
        '</div>';
      }).join('');

      return '<div class="field">' +
        '<label>Paare</label>' + lignes +
        (q.pairs.length < 8
          ? '<button type="button" class="btn btn--doux btn--mini" data-act="pair-add">+ Paar</button>'
          : '') +
        '<span class="hint">Im Spiel wird die rechte Spalte gemischt angezeigt.</span>' +
        '</div>';
    },

    champsOrder: function (q) {
      var lignes = q.items.map(function (item, i) {
        return '<div class="opt-row">' +
          '<span class="num-rond">' + (i + 1) + '</span>' +
          '<input type="text" name="item" data-item="' + i + '" value="' + M.esc(item) + '" placeholder="Element ' + (i + 1) + '">' +
          (q.items.length > 2
            ? '<button type="button" class="icon-btn" data-act="item-del" data-item="' + i + '" title="Entfernen">✕</button>'
            : '') +
        '</div>';
      }).join('');

      return '<div class="field">' +
        '<label>Elemente in der richtigen Reihenfolge</label>' + lignes +
        (q.items.length < 8
          ? '<button type="button" class="btn btn--doux btn--mini" data-act="item-add">+ Element</button>'
          : '') +
        '<span class="hint">Hier steht die Lösung – im Spiel werden die Elemente gemischt.</span>' +
        '</div>';
    },

    /* Zusatzfelder, die nur das Escape-Spiel braucht. */
    champsStation: function (q, index) {
      return '<div class="field" style="border-top:1px dashed var(--bord);padding-top:.8rem">' +
        '<label>Station ' + (index + 1) + ' im Tresor-Spiel</label>' +
        '<div class="code-champ">' +
          '<span class="small muted">Code-Fragment</span>' +
          '<input type="text" name="code" value="' + M.esc(q.code) + '" placeholder="z. B. MA" maxlength="12">' +
        '</div>' +
        '<label class="check" style="margin-top:.5rem"><input type="checkbox" name="manualSolve"' +
          (q.manualSolve ? ' checked' : '') +
          '><span>Freigabe durch die Lehrkraft (Sprechen, Hören, Aufgaben am Tisch)</span></label>' +
        '<span class="hint">Bei Freigabe durch die Lehrkraft gibt es keine Eingabe – ihr tippt vor Ort das Fragment ein.</span>' +
        '</div>';
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
      var question = M.newQuestion(type, quiz.questions.length);
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
      } else if (nom === 'pairLeft' || nom === 'pairRight') {
        var pi = parseInt(cible.getAttribute('data-pair'), 10);
        if (!isNaN(pi) && q.pairs[pi]) {
          q.pairs[pi][nom === 'pairLeft' ? 'left' : 'right'] = cible.value;
        }
      } else if (nom === 'item') {
        var ii = parseInt(cible.getAttribute('data-item'), 10);
        if (!isNaN(ii)) q.items[ii] = cible.value;
      } else if (nom === 'code') {
        q.code = M.normalizeCode(cible.value);
        this.majApercuCode();
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
      if (nom === 'manualSolve') { q.manualSolve = cible.checked; this.touche(); return; }
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
      } else if (act === 'pair-add') {
        if (q.pairs.length < 8) { q.pairs.push({ left: '', right: '' }); this.touche(); this.rendreFragen(); }
      } else if (act === 'pair-del') {
        var pi = parseInt(bouton.getAttribute('data-pair'), 10);
        if (q.pairs.length > 2 && !isNaN(pi)) { q.pairs.splice(pi, 1); this.touche(); this.rendreFragen(); }
      } else if (act === 'item-add') {
        if (q.items.length < 8) { q.items.push(''); this.touche(); this.rendreFragen(); }
      } else if (act === 'item-del') {
        var ii = parseInt(bouton.getAttribute('data-item'), 10);
        if (q.items.length > 2 && !isNaN(ii)) { q.items.splice(ii, 1); this.touche(); this.rendreFragen(); }
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

      this.rendreEscape();
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
      this.majApercuCode();
    },

    /* ---------- Spielart ---------- */

    changerMode: function (mode) {
      var quiz = this.courant();
      if (!quiz) return;
      quiz.mode = mode === 'escape' ? 'escape' : 'marathon';

      /* Beim ersten Wechsel in den Tresor-Modus gleich Codes vorschlagen,
         damit nicht sofort sechs Warnungen erscheinen. */
      if (quiz.mode === 'escape' && quiz.questions.length &&
          quiz.questions.every(function (q) { return !q.code; })) {
        M.generateCodes(quiz);
        M.toast('Code-Fragmente automatisch verteilt.', 'ok');
      }

      this.touche();
      this.rendre();
    },

    estEscape: function () {
      var quiz = this.courant();
      return !!quiz && quiz.mode === 'escape';
    },

    /* ---------- Tresor ---------- */

    rendreEscape: function () {
      var quiz = this.courant();
      if (!quiz) return;
      var e = quiz.escape;
      var escape = quiz.mode === 'escape';

      document.getElementById('pillModus').textContent = escape ? '🔐 Coffre à macarons' : '🍬 Marathon';
      document.getElementById('pillModus').className = 'pill ' + (escape ? 'pill--lavande' : 'pill--framboise');
      document.getElementById('blocEscape').classList.toggle('hidden', !escape);
      document.getElementById('reglesPoints').classList.toggle('hidden', escape);
      document.getElementById('titreDeroulement').textContent = escape
        ? 'Welche Stationen kommen ins Spiel?'
        : 'Wie läuft das Quiz für die Klasse ab?';
      document.getElementById('legendeOrdre').textContent = escape
        ? 'Reihenfolge der Stationen'
        : 'Reihenfolge der Fragen';
      document.getElementById('legendeAnzahl').textContent = escape
        ? 'Anzahl der Stationen'
        : 'Anzahl der Fragen';

      var panneau = document.querySelector('[data-panel="ablauf"]');
      var radioMode = panneau.querySelector('input[name="mode"][value="' + quiz.mode + '"]');
      if (radioMode) radioMode.checked = true;

      if (!escape) return;

      document.getElementById('escIntro').value = e.intro;
      document.getElementById('escTime').value = String(e.timeLimitMin);
      document.getElementById('escHint').value = String(e.hintCostMin);
      document.getElementById('escLock').checked = e.lockOrder;
      document.getElementById('escStyle').value = e.codeStyle;
      document.getElementById('escFinal').value = e.finalCode;
      var radio = document.querySelector('input[name="finalCodeMode"][value="' + e.finalCodeMode + '"]');
      if (radio) radio.checked = true;
      document.getElementById('escFinal').disabled = e.finalCodeMode !== 'manual';

      this.rendrePrix();
      this.majApercuCode();
    },

    majApercuCode: function () {
      var champ = document.getElementById('apercuCode');
      if (!champ) return;
      var quiz = this.courant();
      if (!quiz || quiz.mode !== 'escape') return;

      var sansCode = quiz.questions.filter(function (q) { return !q.code; }).length;
      var code = M.finalCode(quiz);
      var texte;

      if (quiz.escape.finalCodeMode === 'manual') {
        texte = code
          ? 'Die Klasse muss <b>' + M.esc(code) + '</b> eingeben. Sag den Code vorher an oder verteile ihn im Raum.'
          : 'Es ist noch kein eigener Tresorcode eingetragen.';
      } else if (!quiz.questions.length) {
        texte = 'Sobald Stationen angelegt sind, steht hier der Tresorcode.';
      } else if (sansCode) {
        texte = 'Noch ' + sansCode + ' Station(en) ohne Fragment – der Code ist erst dann vollständig.';
      } else if (quiz.settings.countMode === 'all') {
        texte = 'Der Tresorcode lautet <b>' + M.esc(code) + '</b>.';
      } else {
        /* Bei einer Teilmenge steht der Code erst im Durchgang fest. */
        texte = 'Weil nicht alle Stationen gespielt werden, entsteht der Code <b>bei jedem Durchgang neu</b> ' +
          'aus den gefundenen Fragmenten – von links nach rechts abgelesen.' +
          '<br><span class="muted small">Alle Fragmente in Reihenfolge: ' + M.esc(code) + '</span>';
      }
      champ.innerHTML = texte;
    },

    rendrePrix: function () {
      var quiz = this.courant();
      if (!quiz) return;
      var prix = quiz.escape.prize;

      Array.prototype.forEach.call(document.querySelectorAll('[data-prix]'), function (onglet) {
        onglet.setAttribute('aria-selected', String(onglet.getAttribute('data-prix') === prix.type));
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-prixbloc]'), function (bloc) {
        bloc.classList.toggle('hidden', bloc.getAttribute('data-prixbloc') !== prix.type);
      });

      document.getElementById('prixText').value = prix.text;
      document.getElementById('prixPhrase').value = prix.phrase;
      document.getElementById('prixAlt').value = prix.imageAlt;
      document.getElementById('prixApercu').innerHTML = prix.imageData
        ? '<img src="' + M.esc(prix.imageData) + '" alt="" style="max-width:100%;border-radius:12px">' +
          '<button type="button" class="btn btn--danger btn--mini" data-act-prix="del" style="margin-top:.4rem">Bild entfernen</button>'
        : '<p class="muted small">Noch kein Bild gewählt.</p>';

      var suppr = document.querySelector('[data-act-prix="del"]');
      if (suppr) {
        var self = this;
        suppr.addEventListener('click', function () {
          quiz.escape.prize.imageData = '';
          self.touche();
          self.rendrePrix();
        });
      }
    },

    chargerImage: function (fichier) {
      var self = this;
      if (fichier.size > 1500000) {
        M.toast('Das Bild ist größer als 1,5 MB – bitte ein kleineres wählen.', 'erreur');
        return;
      }
      var lecteur = new FileReader();
      lecteur.onload = function (event) {
        var quiz = self.courant();
        if (!quiz) return;
        quiz.escape.prize.imageData = String(event.target.result);
        quiz.escape.prize.type = 'image';
        self.touche();
        self.rendrePrix();
        M.toast('Bild übernommen.', 'ok');
      };
      lecteur.onerror = function () { M.toast('Das Bild konnte nicht gelesen werden.', 'erreur'); };
      lecteur.readAsDataURL(fichier);
    },

    escapeModifie: function (event) {
      var quiz = this.courant();
      if (!quiz) return;
      var e = quiz.escape;
      var cible = event.target;

      if (cible.id === 'escIntro') e.intro = cible.value;
      else if (cible.id === 'escTime') e.timeLimitMin = M.clamp(cible.value, 0, 180);
      else if (cible.id === 'escHint') e.hintCostMin = M.clamp(cible.value, 0, 30);
      else if (cible.id === 'escLock') e.lockOrder = cible.checked;
      else if (cible.id === 'escStyle') e.codeStyle = cible.value;
      else if (cible.id === 'escFinal') e.finalCode = M.normalizeCode(cible.value);
      else if (cible.name === 'finalCodeMode') {
        e.finalCodeMode = cible.value;
        document.getElementById('escFinal').disabled = e.finalCodeMode !== 'manual';
      } else if (cible.id === 'prixText') e.prize.text = cible.value;
      else if (cible.id === 'prixPhrase') e.prize.phrase = cible.value;
      else if (cible.id === 'prixAlt') e.prize.imageAlt = cible.value;

      this.touche();
      this.majApercuCode();
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
            '<div><strong>Vorschau</strong> <span class="muted small">– genau so spielt die Klasse.' +
              (quiz.mode === 'escape' ? ' Tresorcode: <b>' + M.esc(M.finalCode(quiz)) + '</b>' : '') +
            '</span></div>' +
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
        var reglages = {
          mount: fond.querySelector('[data-apercu]'),
          quiz: quiz,
          playerName: 'Madame la professeure',
          replayLabel: 'Neu auslosen',
          quitLabel: 'Vorschau schließen',
          onReplay: function () { lancer(); },
          onQuit: fermer
        };
        self.player = quiz.mode === 'escape'
          ? M.createEscape(reglages)
          : M.createPlayer(reglages);
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
