/* ==========================================================================
   Marathon Macaron – Spiel-Engine der Oberflaeche
   Wird von der Schueler-App UND von der Vorschau im Lehrer-Editor benutzt,
   damit die Lehrkraft exakt das sieht, was die Klasse spaeter spielt.
   Alle sichtbaren Texte sind franzoesisch.
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.Macaron;
  if (!M) throw new Error('core.js muss vor player.js geladen werden.');

  var TYPE_LABEL_FR = M.answers.LABELS;

  var BRAVO = ['Bravo !', 'Excellent !', 'Parfait !', 'Super !', 'Magnifique !', 'Délicieux !'];
  var PRESQUE = ['Presque…', 'Pas tout à fait…', 'Dommage !', 'Encore un effort !'];

  function el(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  function secondes(ms) {
    return (Math.round(ms / 100) / 10).toFixed(1).replace('.', ',');
  }

  function dureeLongue(ms) {
    var total = Math.round(ms / 1000);
    var min = Math.floor(total / 60);
    var sec = total % 60;
    if (min <= 0) return sec + ' s';
    return min + ' min ' + (sec < 10 ? '0' : '') + sec + ' s';
  }

  /* --------------------------------------------------------------------- */

  M.createPlayer = function (opts) {
    var mount = opts.mount;
    var quiz = opts.quiz;
    var run = opts.run || M.buildRun(quiz, opts.overrides);
    var settings = run.settings;

    var state = {
      index: 0,
      entries: [],
      answered: false,
      usedHint: false,
      startedAt: 0,
      tick: null,
      finished: false
    };

    var api = {};

    /* ---------- Struktur ---------- */

    mount.innerHTML =
      '<div class="player">' +
        '<div class="player__head">' +
          '<div class="macaron-bar" data-zone="bar"></div>' +
          '<div class="player__meta">' +
            '<span data-zone="compteur"></span>' +
            '<span data-zone="chrono"></span>' +
            '<span class="player__score" data-zone="score"></span>' +
          '</div>' +
        '</div>' +
        '<div data-zone="scene"></div>' +
      '</div>';

    var zoneBar = mount.querySelector('[data-zone="bar"]');
    var zoneCompteur = mount.querySelector('[data-zone="compteur"]');
    var zoneChrono = mount.querySelector('[data-zone="chrono"]');
    var zoneScore = mount.querySelector('[data-zone="score"]');
    var zoneScene = mount.querySelector('[data-zone="scene"]');

    /* ---------- Fortschritt als Reihe von Macarons ---------- */

    function renderBar() {
      var html = '';
      run.questions.forEach(function (q, i) {
        var entry = state.entries[i];
        var cls = 'macaron--s';
        if (entry) cls += entry.correct ? '' : ' macaron--rate';
        else if (i === state.index && !state.finished) cls += ' macaron--actif';
        else cls += ' macaron--todo';
        html += M.macaronHtml(q.flavor, cls);
      });
      zoneBar.innerHTML = html;
    }

    function scoreActuel() {
      return M.summarize(state.entries, settings).score;
    }

    function renderMeta() {
      if (state.finished) {
        zoneCompteur.textContent = 'Terminé !';
        zoneChrono.innerHTML = '';
      } else {
        zoneCompteur.textContent = 'Question ' + (state.index + 1) + ' / ' + run.total;
      }
      zoneScore.textContent = scoreActuel() + ' pts';
    }

    /* ---------- Chrono mit Tempo-Bonus ---------- */

    function stopTick() {
      if (state.tick) {
        clearInterval(state.tick);
        state.tick = null;
      }
    }

    function renderChrono() {
      if (state.answered || state.finished) return;
      var passe = performance.now() - state.startedAt;
      var reste = Math.max(0, M.SCORE.speedWindowMs - passe);
      var part = reste / M.SCORE.speedWindowMs;
      if (settings.speedBonus) {
        zoneChrono.innerHTML =
          '<span class="chrono" title="Bonus de rapidité">⏱ ' + secondes(passe) + ' s' +
          '<span class="chrono__jauge"><i style="width:' + Math.round(part * 100) + '%"></i></span>' +
          '</span>';
      } else {
        zoneChrono.innerHTML = '<span class="chrono">⏱ ' + secondes(passe) + ' s</span>';
      }
    }

    function startTick() {
      stopTick();
      state.startedAt = performance.now();
      renderChrono();
      state.tick = setInterval(renderChrono, 200);
    }

    /* ---------- Frage anzeigen ---------- */

    function currentQuestion() {
      return run.questions[state.index];
    }

    function renderQuestion() {
      var q = currentQuestion();
      if (!q) { finish(); return; }

      state.answered = false;
      state.usedHint = false;

      var indiceHtml = '';
      if (settings.allowHints && q.hint) {
        indiceHtml = '<div class="row" style="margin-top:.8rem">' +
          '<button type="button" class="btn btn--doux btn--mini" data-role="indice">' +
          '💡 Un indice' + (settings.hintPenalty > 0 ? ' (−' + settings.hintPenalty + ' pts)' : '') +
          '</button></div>';
      }

      var consigne = q.type === 'gap'
        ? (q.prompt ? '<p class="question-prompt">' + M.esc(q.prompt) + '</p>' : '')
        : '<p class="question-prompt">' + M.esc(q.prompt) + '</p>';

      zoneScene.innerHTML =
        '<div class="card card--ganache question-card" data-zone="carte">' +
          '<div class="confetti" data-zone="confetti"></div>' +
          '<div class="row row--between" style="margin-bottom:.2rem">' +
            '<span class="pill pill--lavande">' + M.esc(q.discipline || TYPE_LABEL_FR[q.type]) + '</span>' +
            '<span class="pill">' + TYPE_LABEL_FR[q.type] + '</span>' +
          '</div>' +
          consigne +
          '<div data-zone="reponses">' + M.answers.html(q) + '</div>' +
          '<div data-zone="indice">' + indiceHtml + '</div>' +
          '<div data-zone="feedback"></div>' +
        '</div>';

      M.answers.activate(zoneScene, q);

      var premier = zoneScene.querySelector('[data-role="texte"], .gap-input');
      if (premier) premier.focus();

      renderBar();
      renderMeta();
      startTick();
    }

    /* ---------- Antwort auswerten ---------- */

    function repondre(reponse) {
      if (state.answered || state.finished) return;
      var q = currentQuestion();
      if (!q) return;

      if (M.answers.incomplete(q, reponse)) {
        M.toast(M.answers.INCOMPLETE_FR[q.type] || 'Il manque quelque chose.', 'erreur');
        return;
      }

      state.answered = true;
      stopTick();

      var timeMs = Math.max(0, performance.now() - state.startedAt);
      var verdict = M.checkAnswer(q, reponse);

      var entry = {
        questionId: q.id,
        index: state.index,
        type: q.type,
        prompt: q.prompt || q.gapText,
        discipline: q.discipline,
        flavor: q.flavor,
        correct: !!verdict.correct,
        perGap: verdict.perGap || null,
        perPair: verdict.perPair || null,
        perItem: verdict.perItem || null,
        response: reponse,
        responseText: M.answers.responseText(q, reponse),
        correctText: M.correctAnswerText(q),
        explanation: q.explanation || '',
        timeMs: timeMs,
        usedHint: state.usedHint
      };
      state.entries[state.index] = entry;

      var streak = 0;
      for (var i = 0; i <= state.index; i++) {
        streak = (state.entries[i] && state.entries[i].correct) ? streak + 1 : 0;
      }
      entry.points = M.scoreAnswer(entry, streak, settings);

      M.answers.mark(q, zoneScene, entry);
      var boutonIndice = zoneScene.querySelector('[data-role="indice"]');
      if (boutonIndice) boutonIndice.remove();
      if (entry.correct) effetJuste(q.flavor); else effetRate();
      renderFeedback(q, entry);
      renderBar();
      renderMeta();
    }

    function renderFeedback(q, entry) {
      var dernier = state.index >= run.total - 1;
      var p = entry.points;
      var detail = [];
      if (p.base) detail.push(p.base + ' de base');
      if (p.speed) detail.push('+' + p.speed + ' rapidité');
      if (p.combo) detail.push('+' + p.combo + ' série');
      if (p.penalty) detail.push('−' + p.penalty + ' indice');

      var lignes = '';
      if (!entry.correct && entry.correctText) {
        lignes += '<p class="feedback__line"><strong>Réponse correcte :</strong> ' + M.esc(entry.correctText) + '</p>';
      }
      if (entry.correct && q.type === 'gap' && entry.correctText) {
        lignes += '<p class="feedback__line muted">' + M.esc(entry.correctText) + '</p>';
      }
      if (settings.showExplanations && entry.explanation) {
        lignes += '<p class="feedback__line muted">💬 ' + M.esc(entry.explanation) + '</p>';
      }

      var zone = zoneScene.querySelector('[data-zone="feedback"]');
      zone.innerHTML =
        '<div class="feedback ' + (entry.correct ? 'feedback--juste' : 'feedback--rate') + '">' +
          '<div class="feedback__title">' +
            (entry.correct ? '🍬 ' + M.pickOne(BRAVO) : '🥐 ' + M.pickOne(PRESQUE)) +
            (entry.correct
              ? '<span class="feedback__points" title="' + M.esc(detail.join(' · ')) + '">+' + p.total + ' pts</span>'
              : '') +
          '</div>' +
          lignes +
          '<div class="row row--end" style="margin-top:.5rem">' +
            '<button type="button" class="btn" data-role="suivant">' +
            (dernier ? 'Voir le résultat 🏁' : 'Question suivante →') +
            '</button>' +
          '</div>' +
        '</div>';

      var suivant = zone.querySelector('[data-role="suivant"]');
      if (suivant) suivant.focus();
    }

    /* ---------- Effekte ---------- */

    function effetJuste(flavor) {
      var carte = zoneScene.querySelector('[data-zone="carte"]');
      var couche = zoneScene.querySelector('[data-zone="confetti"]');
      if (carte) {
        carte.classList.remove('fx-rate');
        void carte.offsetWidth;
        carte.classList.add('fx-juste');
      }
      if (!couche) return;
      var couleurs = ['#de4f70', '#6cb175', '#9b7fdb', '#e6b23c', '#5f77dd', '#f6a0b4'];
      var html = '';
      for (var i = 0; i < 24; i++) {
        var taille = 7 + Math.floor(Math.random() * 7);
        html += '<span style="left:' + (Math.random() * 100).toFixed(1) + '%;' +
          'width:' + taille + 'px;height:' + Math.round(taille * 0.8) + 'px;' +
          'background:' + couleurs[Math.floor(Math.random() * couleurs.length)] + ';' +
          'animation-delay:' + Math.floor(Math.random() * 180) + 'ms"></span>';
      }
      couche.innerHTML = html;
      setTimeout(function () { if (couche) couche.innerHTML = ''; }, 1250);
    }

    function effetRate() {
      var carte = zoneScene.querySelector('[data-zone="carte"]');
      if (!carte) return;
      carte.classList.remove('fx-juste');
      void carte.offsetWidth;
      carte.classList.add('fx-rate');
    }

    /* ---------- Ergebnis ---------- */

    function finish() {
      state.finished = true;
      stopTick();
      var bilan = M.summarize(state.entries, settings);

      var macarons = state.entries.map(function (entry) {
        return M.macaronHtml(entry.flavor, entry.correct ? '' : 'macaron--todo');
      }).join('');

      var recap = state.entries.map(function (entry, i) {
        var ligne = '<div class="recap__item ' + (entry.correct ? 'recap__item--juste' : 'recap__item--rate') + '">' +
          '<span class="recap__mark">' + (entry.correct ? '✅' : '❌') + '</span>' +
          '<div>' +
            '<div class="recap__q">' + (i + 1) + '. ' + M.esc(entry.prompt) + '</div>' +
            '<div class="muted small">Ta réponse : ' + M.esc(entry.responseText || '—') + '</div>' +
            (entry.correct ? '' : '<div class="small">Réponse correcte : <strong>' + M.esc(entry.correctText) + '</strong></div>') +
          '</div>' +
        '</div>';
        return ligne;
      }).join('');

      var pourcent = bilan.total ? Math.round((bilan.correct / bilan.total) * 100) : 0;
      var mot, titre;
      if (pourcent >= 90) {
        titre = 'Félicitations';
        mot = 'Chef pâtissier·ère de la langue française ! 🏆';
      } else if (pourcent >= 70) {
        titre = 'Bravo';
        mot = 'Très bon marathon ! Encore quelques macarons et c’est parfait.';
      } else if (pourcent >= 45) {
        titre = 'Bien joué';
        mot = 'Bon début — la pâte monte bien !';
      } else {
        titre = 'Courage';
        mot = 'Le four chauffe encore… reprends le marathon, tu vas y arriver !';
      }

      var boutons = '';
      if (opts.onReplay) {
        boutons += '<button type="button" class="btn" data-role="rejouer">🔁 ' +
          M.esc(opts.replayLabel || 'Rejouer') + '</button>';
      }
      if (opts.onQuit) {
        boutons += '<button type="button" class="btn btn--doux" data-role="quitter">' +
          M.esc(opts.quitLabel || 'Changer de quiz') + '</button>';
      }

      zoneScene.innerHTML =
        '<div class="card card--ganache center">' +
          '<h2>' + titre + ', ' + M.esc(opts.playerName || 'champion·ne') + ' !</h2>' +
          '<div class="boite">' + macarons + '</div>' +
          '<div class="result-score">' + bilan.score + '</div>' +
          '<p class="muted small">points au Marathon des Macarons</p>' +
          '<div class="stats-grid">' +
            '<div class="stat"><b>' + bilan.correct + ' / ' + bilan.total + '</b><span>bonnes réponses</span></div>' +
            '<div class="stat"><b>' + pourcent + ' %</b><span>de réussite</span></div>' +
            '<div class="stat"><b>' + bilan.bestStreak + '</b><span>meilleure série</span></div>' +
            '<div class="stat"><b>' + dureeLongue(bilan.timeMs) + '</b><span>temps total</span></div>' +
          '</div>' +
          '<p>' + mot + '</p>' +
          '<div class="row row--center">' + boutons + '</div>' +
        '</div>' +
        '<div class="card">' +
          '<h3>Correction</h3>' +
          '<div class="recap">' + recap + '</div>' +
        '</div>';

      renderBar();
      renderMeta();
      if (opts.onFinish) opts.onFinish(bilan, state.entries, run);
    }

    /* ---------- Ereignisse ---------- */

    function onClick(event) {
      var cible = event.target.closest('[data-choice], [data-vf], [data-role]');
      if (!cible || !mount.contains(cible)) return;

      if (cible.hasAttribute('data-choice')) {
        repondre(parseInt(cible.getAttribute('data-choice'), 10));
        return;
      }
      if (cible.hasAttribute('data-vf')) {
        repondre(cible.getAttribute('data-vf'));
        return;
      }
      var role = cible.getAttribute('data-role');
      if (role === 'valider') {
        repondre(M.answers.read(currentQuestion(), zoneScene));
      } else if (role === 'suivant') {
        suivante();
      } else if (role === 'indice') {
        montrerIndice();
      } else if (role === 'rejouer') {
        api.destroy();
        opts.onReplay();
      } else if (role === 'quitter') {
        api.destroy();
        opts.onQuit();
      }
    }

    function montrerIndice() {
      var q = currentQuestion();
      if (!q || state.answered) return;
      state.usedHint = true;
      var zone = zoneScene.querySelector('[data-zone="indice"]');
      if (zone) zone.innerHTML = '<div class="hint-box">💡 ' + M.esc(q.hint) + '</div>';
    }

    function suivante() {
      if (state.index >= run.total - 1) { finish(); return; }
      state.index++;
      renderQuestion();
    }

    function onKeydown(event) {
      if (state.finished) return;
      var actif = document.activeElement;
      var dansChamp = actif && (actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA');

      if (event.key === 'Enter') {
        if (state.answered) {
          event.preventDefault();
          suivante();
          return;
        }
        var q = currentQuestion();
        if (q && M.answers.needsValidate(q)) {
          event.preventDefault();
          repondre(M.answers.read(q, zoneScene));
        }
        return;
      }

      if (state.answered || dansChamp) return;

      var q2 = currentQuestion();
      if (!q2) return;
      if (q2.type === 'mcq' && /^[1-9]$/.test(event.key)) {
        var i = parseInt(event.key, 10) - 1;
        if (i < q2.options.length) { event.preventDefault(); repondre(i); }
      } else if (q2.type === 'vf') {
        if (event.key === '1' || event.key.toLowerCase() === 'v') { event.preventDefault(); repondre('vrai'); }
        else if (event.key === '2' || event.key.toLowerCase() === 'f') { event.preventDefault(); repondre('faux'); }
      }
    }

    mount.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeydown);

    api.destroy = function () {
      stopTick();
      mount.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeydown);
      mount.innerHTML = '';
    };
    api.run = run;

    renderQuestion();
    return api;
  };

  M.TYPE_LABEL_FR = TYPE_LABEL_FR;
})(window);
