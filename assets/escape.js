/* ==========================================================================
   Le Coffre à Macarons – Escape-Modus
   Jede gelöste Station gibt ein Code-Fragment frei; zusammen öffnen sie den
   Tresor. Mit Countdown, Tipps gegen Zeit und Freigabe durch die Lehrkraft.
   Wird von der Schüler-App und von der Vorschau im Atelier benutzt.
   Alle sichtbaren Texte sind französisch.
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.Macaron;
  if (!M) throw new Error('core.js muss vor escape.js geladen werden.');

  function mmss(ms) {
    var total = Math.max(0, Math.round(ms / 1000));
    var min = Math.floor(total / 60);
    var sec = total % 60;
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function dureeLongue(ms) {
    var total = Math.max(0, Math.round(ms / 1000));
    var min = Math.floor(total / 60);
    var sec = total % 60;
    if (!min) return sec + ' s';
    return min + ' min ' + (sec < 10 ? '0' : '') + sec + ' s';
  }

  M.createEscape = function (opts) {
    var mount = opts.mount;
    var quiz = opts.quiz;
    var run = opts.run || M.buildRun(quiz, opts.overrides);
    var esc = quiz.escape;
    var stations = run.questions;
    var codeAttendu = M.finalCode(quiz, run);

    var etat = {
      resolues: {},        /* index -> true */
      indices: {},         /* index -> true */
      essais: {},          /* index -> Anzahl */
      ouverte: null,       /* gerade geöffnete Station */
      debut: Date.now(),
      resteMs: (esc.timeLimitMin || 0) * 60000,
      sansChrono: !esc.timeLimitMin,
      enPause: false,
      pauseDebut: 0,
      fini: false,
      reussi: false,
      tempsEcoule: false,
      tick: null
    };

    var api = {};

    mount.innerHTML = '<div class="coffre"><div data-zone="scene"></div></div>';
    var scene = mount.querySelector('[data-zone="scene"]');

    /* ------------------------------------------------------------ Chrono */

    function stopTick() {
      if (etat.tick) { clearInterval(etat.tick); etat.tick = null; }
    }

    function startTick() {
      stopTick();
      etat.tick = setInterval(function () {
        if (etat.fini || etat.enPause) return;
        if (!etat.sansChrono) {
          etat.resteMs -= 250;
          if (etat.resteMs <= 0) {
            etat.resteMs = 0;
            tempsEcoule();
            return;
          }
        }
        majChrono();
      }, 250);
    }

    function tempsEcoule() {
      etat.tempsEcoule = true;
      etat.fini = true;
      stopTick();
      renderFin(false);
    }

    function tempsUtilise() {
      return Date.now() - etat.debut;
    }

    function chronoHtml() {
      if (etat.sansChrono) {
        return '<span class="chrono-grand">⏱ ' + mmss(tempsUtilise()) + '</span>';
      }
      var presse = etat.resteMs <= 60000;
      return '<span class="chrono-grand' + (presse ? ' chrono-grand--presse' : '') + '">⏱ ' +
        mmss(etat.resteMs) + '</span>';
    }

    function majChrono() {
      var zone = scene.querySelector('[data-zone="chrono"]');
      if (zone) zone.innerHTML = chronoHtml();
    }

    /* ------------------------------------------------------------- Plan */

    function nbResolues() {
      return Object.keys(etat.resolues).length;
    }

    function stationAccessible(index) {
      if (etat.resolues[index]) return true;
      if (!esc.lockOrder) return true;
      for (var i = 0; i < index; i++) {
        if (!etat.resolues[i]) return false;
      }
      return true;
    }

    function barreHtml() {
      return '<div class="coffre__barre">' +
        '<span data-zone="chrono">' + chronoHtml() + '</span>' +
        '<span class="pill pill--pistache">' + nbResolues() + ' / ' + stations.length + ' salles</span>' +
        (etat.sansChrono ? '' :
          '<button type="button" class="btn btn--doux btn--mini" data-role="pause">' +
          (etat.enPause ? '▶ Reprendre' : '⏸ Pause') + '</button>') +
      '</div>';
    }

    function bandeCodeHtml() {
      return '<div class="code-bande">' + stations.map(function (q, i) {
        var trouve = etat.resolues[i];
        return '<span class="code-case' + (trouve ? ' code-case--trouve' : '') + '">' +
          (trouve ? M.esc(M.normalizeCode(q.code)) : '?') + '</span>';
      }).join('') + '</div>';
    }

    function renderPlan() {
      etat.ouverte = null;

      var salles = stations.map(function (q, i) {
        var resolue = etat.resolues[i];
        var accessible = stationAccessible(i);
        var classe = 'salle' + (resolue ? ' salle--resolue' : (accessible ? ' salle--ouverte' : ''));
        return '<button type="button" class="' + classe + '" data-station="' + i + '"' +
            (accessible ? '' : ' disabled') + '>' +
          '<span class="salle__tete">' +
            '<span class="salle__num">' + (resolue ? '✓' : (accessible ? (i + 1) : '🔒')) + '</span>' +
            '<span class="salle__titre">' + M.esc(q.discipline || ('Salle ' + (i + 1))) + '</span>' +
          '</span>' +
          '<span class="salle__type">' + M.esc(M.answers.LABELS[q.type] || '') +
            (q.manualSolve ? ' · 👩‍🏫' : '') + '</span>' +
          (resolue
            ? '<span class="salle__gain">' + M.esc(M.normalizeCode(q.code)) + '</span>'
            : '') +
        '</button>';
      }).join('');

      var toutesResolues = nbResolues() === stations.length;
      var consigneCode = esc.finalCodeMode === 'manual'
        ? 'Entre le code que ton professeur a annoncé.'
        : 'Assemble les fragments trouvés pour former le code.';

      scene.innerHTML =
        barreHtml() +
        (etat.enPause
          ? '<div class="card center"><h3>⏸ Pause</h3><p class="muted">Le chrono est arrêté.</p></div>'
          : bandeCodeHtml() +
            '<div class="salles">' + salles + '</div>' +
            '<div class="card card--ganache tresor" data-zone="tresor">' +
              '<div class="tresor__porte" aria-hidden="true">🔐</div>' +
              '<h3>Le coffre à macarons</h3>' +
              '<p class="muted small">' + consigneCode +
                (toutesResolues ? '' : ' Il reste des salles à ouvrir.') + '</p>' +
              '<div class="code-entree">' +
                '<input type="text" data-role="code" autocomplete="off" spellcheck="false" ' +
                  'placeholder="CODE" aria-label="Code du coffre">' +
                '<button type="button" class="btn" data-role="ouvrir">Ouvrir le coffre</button>' +
              '</div>' +
              '<p class="small" data-zone="refus"></p>' +
            '</div>');

      if (etat.enPause) return;
      if (toutesResolues) {
        var champ = scene.querySelector('[data-role="code"]');
        if (champ) champ.focus();
      }
    }

    /* ---------------------------------------------------------- Station */

    function renderStation(index) {
      var q = stations[index];
      if (!q) return;
      etat.ouverte = index;

      if (etat.resolues[index]) { renderStationResolue(index); return; }

      var indiceHtml = '';
      if (q.hint && !etat.indices[index]) {
        indiceHtml = '<button type="button" class="btn btn--doux btn--mini" data-role="indice">💡 Un indice' +
          (esc.hintCostMin > 0 ? ' (−' + esc.hintCostMin + ' min)' : '') + '</button>';
      } else if (q.hint) {
        indiceHtml = '<div class="hint-box">💡 ' + M.esc(q.hint) + '</div>';
      }

      var corps;
      if (q.manualSolve) {
        corps = '<div class="prof-panneau">' +
          '<p class="small">Cette épreuve se fait à l’oral. Montre à ton professeur que tu l’as réussie – ' +
          'il entrera le code de la salle pour la déverrouiller.</p>' +
          '<div class="code-entree">' +
            '<input type="password" data-role="codeProf" autocomplete="off" placeholder="Code du professeur" aria-label="Code du professeur">' +
            '<button type="button" class="btn btn--lavande" data-role="deverrouiller">Déverrouiller</button>' +
          '</div>' +
          '<p class="small" data-zone="refusProf"></p>' +
        '</div>';
      } else {
        corps = '<div data-zone="reponses">' + M.answers.html(q) + '</div>';
      }

      scene.innerHTML =
        barreHtml() +
        '<div class="card card--ganache question-card" data-zone="carte">' +
          '<div class="confetti" data-zone="confetti"></div>' +
          '<div class="row row--between" style="margin-bottom:.2rem">' +
            '<span class="pill pill--lavande">' + M.esc(q.discipline || ('Salle ' + (index + 1))) + '</span>' +
            '<span class="pill">Salle ' + (index + 1) + ' / ' + stations.length + '</span>' +
          '</div>' +
          (q.prompt ? '<p class="question-prompt">' + M.esc(q.prompt) + '</p>' : '') +
          corps +
          '<div data-zone="indice" style="margin-top:.8rem">' + indiceHtml + '</div>' +
          '<div data-zone="feedback"></div>' +
          '<div class="row" style="margin-top:.9rem">' +
            '<button type="button" class="btn btn--doux btn--mini" data-role="plan">← Retour au plan</button>' +
          '</div>' +
        '</div>';

      if (!q.manualSolve) M.answers.activate(scene, q);
      var premier = scene.querySelector('[data-role="texte"], .gap-input, [data-role="codeProf"]');
      if (premier) premier.focus();
    }

    /* Eine offene Salle kann man wieder aufschlagen – dann steht dort die
       Lösung und das Fragment, aber nichts lässt sich erneut beantworten. */
    function renderStationResolue(index) {
      var q = stations[index];
      scene.innerHTML =
        barreHtml() +
        '<div class="card card--ganache" data-zone="carte">' +
          '<div class="row row--between" style="margin-bottom:.2rem">' +
            '<span class="pill pill--pistache">✓ ' + M.esc(q.discipline || ('Salle ' + (index + 1))) + '</span>' +
            '<span class="pill">Salle ' + (index + 1) + ' / ' + stations.length + '</span>' +
          '</div>' +
          (q.prompt ? '<p class="question-prompt">' + M.esc(q.prompt) + '</p>' : '') +
          '<p class="feedback__line">Solution : <strong>' + M.esc(M.correctAnswerText(q)) + '</strong></p>' +
          (q.explanation ? '<p class="feedback__line muted">💬 ' + M.esc(q.explanation) + '</p>' : '') +
          '<div class="station__gain">Fragment du code<b>' + M.esc(M.normalizeCode(q.code)) + '</b></div>' +
          '<div class="row" style="margin-top:.9rem">' +
            '<button type="button" class="btn btn--doux btn--mini" data-role="plan">← Retour au plan</button>' +
          '</div>' +
        '</div>';
    }

    function reinitialiserStation() {
      if (etat.ouverte === null) return;
      renderStation(etat.ouverte);
    }

    /* --------------------------------------------------------- Antworten */

    function repondre(reponse) {
      var index = etat.ouverte;
      if (index === null || etat.resolues[index] || etat.fini) return;
      var q = stations[index];

      if (M.answers.incomplete(q, reponse)) {
        M.toast(M.answers.INCOMPLETE_FR[q.type] || 'Il manque quelque chose.', 'erreur');
        return;
      }

      etat.essais[index] = (etat.essais[index] || 0) + 1;
      var verdict = M.checkAnswer(q, reponse);

      if (verdict.correct) {
        resoudre(index, {
          correct: true,
          perGap: verdict.perGap || null,
          perPair: verdict.perPair || null,
          perItem: verdict.perItem || null,
          response: reponse
        });
        return;
      }

      /* Falsch: Station bleibt offen, es darf weiter probiert werden. */
      effetRate();
      var zone = scene.querySelector('[data-zone="feedback"]');
      if (zone) {
        zone.innerHTML =
          '<div class="feedback feedback--rate">' +
            '<div class="feedback__title">🥐 Ce n’est pas encore ça…</div>' +
            '<p class="feedback__line small">Essai ' + etat.essais[index] + '. La salle reste fermée – réessaie !</p>' +
            '<div class="row row--end"><button type="button" class="btn" data-role="reessayer">Réessayer</button></div>' +
          '</div>';
      }
      var widget = scene.querySelector('[data-zone="reponses"]');
      if (widget) {
        Array.prototype.forEach.call(widget.querySelectorAll('button, input'), function (el) {
          el.disabled = true;
        });
      }
    }

    function resoudre(index, entry) {
      var q = stations[index];
      etat.resolues[index] = true;

      if (entry && !q.manualSolve) {
        M.answers.mark(q, scene, entry);
      }
      effetJuste(q.flavor);

      var zone = scene.querySelector('[data-zone="feedback"]');
      var dernier = nbResolues() === stations.length;
      if (zone) {
        zone.innerHTML =
          '<div class="feedback feedback--juste">' +
            '<div class="feedback__title">🍬 Salle ouverte !</div>' +
            (q.explanation ? '<p class="feedback__line muted">💬 ' + M.esc(q.explanation) + '</p>' : '') +
            '<div class="station__gain">Fragment du code<b>' + M.esc(M.normalizeCode(q.code)) + '</b></div>' +
            '<div class="row row--end" style="margin-top:.6rem">' +
              '<button type="button" class="btn" data-role="plan">' +
                (dernier ? 'Au coffre ! 🔐' : 'Retour au plan →') +
              '</button>' +
            '</div>' +
          '</div>';
        var suivant = zone.querySelector('[data-role="plan"]');
        if (suivant) suivant.focus();
      }
      var indice = scene.querySelector('[data-role="indice"]');
      if (indice) indice.remove();
    }

    function demanderIndice() {
      var index = etat.ouverte;
      if (index === null) return;
      var q = stations[index];
      if (!q.hint || etat.indices[index]) return;
      etat.indices[index] = true;
      if (!etat.sansChrono && esc.hintCostMin > 0) {
        etat.resteMs = Math.max(0, etat.resteMs - esc.hintCostMin * 60000);
        majChrono();
        M.toast('−' + esc.hintCostMin + ' min ⏱', 'erreur');
        if (etat.resteMs === 0) { tempsEcoule(); return; }
      }
      var zone = scene.querySelector('[data-zone="indice"]');
      if (zone) zone.innerHTML = '<div class="hint-box">💡 ' + M.esc(q.hint) + '</div>';
    }

    function deverrouillerParProf() {
      var index = etat.ouverte;
      if (index === null) return;
      var q = stations[index];
      var champ = scene.querySelector('[data-role="codeProf"]');
      var refus = scene.querySelector('[data-zone="refusProf"]');
      var saisi = M.normalizeCode(champ ? champ.value : '');
      if (saisi && saisi === M.normalizeCode(q.code)) {
        etat.essais[index] = etat.essais[index] || 1;
        resoudre(index, null);
        return;
      }
      if (champ) champ.value = '';
      if (refus) refus.textContent = 'Code incorrect.';
    }

    /* ------------------------------------------------------------ Tresor */

    function tenterCode() {
      var champ = scene.querySelector('[data-role="code"]');
      var refus = scene.querySelector('[data-zone="refus"]');
      var saisi = M.normalizeCode(champ ? champ.value : '');
      if (!saisi) return;

      if (saisi === codeAttendu) {
        etat.fini = true;
        etat.reussi = true;
        stopTick();
        renderFin(true);
        return;
      }

      var tresor = scene.querySelector('[data-zone="tresor"]');
      if (tresor) {
        tresor.classList.remove('tresor--refus');
        void tresor.offsetWidth;
        tresor.classList.add('tresor--refus');
      }
      if (refus) {
        refus.textContent = nbResolues() === stations.length
          ? 'Le coffre reste fermé. Vérifie l’ordre des fragments.'
          : 'Le coffre reste fermé. Il manque encore des salles.';
      }
      if (champ) { champ.value = ''; champ.focus(); }
    }

    function gainHtml() {
      var prix = esc.prize || {};
      if (prix.type === 'image' && prix.imageData) {
        return '<div class="gain"><img src="' + M.esc(prix.imageData) + '" alt="' +
          M.esc(prix.imageAlt || 'Récompense') + '"></div>';
      }
      if (prix.type === 'phrase' && String(prix.phrase).trim()) {
        return '<div class="gain"><p class="gain__phrase">« ' + M.esc(prix.phrase) + ' »</p>' +
          '<p class="small muted">Lisez la phrase à voix haute – en français !</p></div>';
      }
      if (String(prix.text).trim()) {
        return '<div class="gain"><p style="margin:0;font-size:1.1rem;font-weight:700">' +
          M.esc(prix.text) + '</p></div>';
      }
      return '<div class="gain"><p style="margin:0">🍬 Bravo, le coffre est ouvert !</p></div>';
    }

    function renderFin(reussi) {
      stopTick();
      var utilise = tempsUtilise();
      var essais = Object.keys(etat.essais).reduce(function (somme, cle) {
        return somme + etat.essais[cle];
      }, 0);
      var indices = Object.keys(etat.indices).length;

      var boutons = '';
      if (!reussi && etat.tempsEcoule) {
        boutons += '<button type="button" class="btn btn--doux" data-role="continuer">Continuer sans chrono</button>';
      }
      if (opts.onReplay) {
        boutons += '<button type="button" class="btn" data-role="rejouer">🔁 ' +
          M.esc(opts.replayLabel || 'Recommencer') + '</button>';
      }
      if (opts.onQuit) {
        boutons += '<button type="button" class="btn btn--doux" data-role="quitter">' +
          M.esc(opts.quitLabel || 'Changer de quiz') + '</button>';
      }

      var solutions = stations.map(function (q, i) {
        return '<div class="recap__item ' + (etat.resolues[i] ? 'recap__item--juste' : 'recap__item--rate') + '">' +
          '<span class="recap__mark">' + (etat.resolues[i] ? '✅' : '🔒') + '</span>' +
          '<div><div class="recap__q">' + (i + 1) + '. ' + M.esc(q.prompt || q.gapText || q.discipline) + '</div>' +
          '<div class="small">Solution : <strong>' + M.esc(M.correctAnswerText(q)) + '</strong></div></div>' +
        '</div>';
      }).join('');

      scene.innerHTML =
        '<div class="card card--ganache center">' +
          '<div class="tresor__porte" aria-hidden="true">' + (reussi ? '🎉' : '⏰') + '</div>' +
          '<h2>' + (reussi
            ? 'Coffre ouvert, ' + M.esc(opts.playerName || 'champion·ne') + ' !'
            : 'Le temps est écoulé…') + '</h2>' +
          (reussi ? gainHtml() : '<p class="muted">Le coffre reste fermé cette fois – mais rien n’est perdu !</p>') +
          '<div class="stats-grid">' +
            '<div class="stat"><b>' + nbResolues() + ' / ' + stations.length + '</b><span>salles ouvertes</span></div>' +
            '<div class="stat"><b>' + dureeLongue(utilise) + '</b><span>temps passé</span></div>' +
            '<div class="stat"><b>' + essais + '</b><span>essais</span></div>' +
            '<div class="stat"><b>' + indices + '</b><span>indices utilisés</span></div>' +
          '</div>' +
          '<div class="row row--center">' + boutons + '</div>' +
        '</div>' +
        '<div class="card"><h3>Les salles</h3><div class="recap">' + solutions + '</div></div>';

      if (reussi) effetJuste('citron');

      if (opts.onFinish) {
        opts.onFinish({
          mode: 'escape',
          reussi: reussi,
          timeMs: utilise,
          resolues: nbResolues(),
          total: stations.length,
          essais: essais,
          indices: indices
        });
      }
    }

    /* ----------------------------------------------------------- Effekte */

    function effetJuste(flavor) {
      var carte = scene.querySelector('[data-zone="carte"]') || scene.querySelector('.card');
      var couche = scene.querySelector('[data-zone="confetti"]');
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
      var carte = scene.querySelector('[data-zone="carte"]');
      if (!carte) return;
      carte.classList.remove('fx-juste');
      void carte.offsetWidth;
      carte.classList.add('fx-rate');
    }

    /* ---------------------------------------------------------- Klicks */

    function onClick(event) {
      var cible = event.target.closest('[data-station], [data-choice], [data-vf], [data-role]');
      if (!cible || !mount.contains(cible)) return;

      if (cible.hasAttribute('data-station')) {
        var index = parseInt(cible.getAttribute('data-station'), 10);
        if (!isNaN(index) && stationAccessible(index)) renderStation(index);
        return;
      }
      if (cible.hasAttribute('data-choice')) {
        repondre(parseInt(cible.getAttribute('data-choice'), 10));
        return;
      }
      if (cible.hasAttribute('data-vf')) {
        repondre(cible.getAttribute('data-vf'));
        return;
      }

      var role = cible.getAttribute('data-role');
      if (role === 'valider') repondre(M.answers.read(stations[etat.ouverte], scene));
      else if (role === 'reessayer') reinitialiserStation();
      else if (role === 'indice') demanderIndice();
      else if (role === 'plan') renderPlan();
      else if (role === 'deverrouiller') deverrouillerParProf();
      else if (role === 'ouvrir') tenterCode();
      else if (role === 'pause') {
        etat.enPause = !etat.enPause;
        if (!etat.enPause) etat.debut = etat.debut; /* Pause hält nur den Countdown an */
        renderPlan();
      } else if (role === 'continuer') {
        etat.sansChrono = true;
        etat.fini = false;
        etat.tempsEcoule = false;
        startTick();
        renderPlan();
      } else if (role === 'rejouer') {
        api.destroy();
        opts.onReplay();
      } else if (role === 'quitter') {
        api.destroy();
        opts.onQuit();
      }
    }

    function onKeydown(event) {
      if (event.key !== 'Enter' || etat.fini) return;
      var actif = document.activeElement;
      if (!actif) return;
      if (actif.getAttribute('data-role') === 'code') { event.preventDefault(); tenterCode(); }
      else if (actif.getAttribute('data-role') === 'codeProf') { event.preventDefault(); deverrouillerParProf(); }
      else if (etat.ouverte !== null && M.answers.needsValidate(stations[etat.ouverte])) {
        event.preventDefault();
        repondre(M.answers.read(stations[etat.ouverte], scene));
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
    api.code = codeAttendu;

    renderPlan();
    startTick();
    return api;
  };
})(window);
