/* ==========================================================================
   Antwort-Bausteine für alle Fragetypen.
   Wird vom Marathon-Player UND vom Escape-Modus benutzt, damit eine Frage
   überall gleich aussieht und gleich ausgewertet wird. Texte: französisch.
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.Macaron;
  if (!M) throw new Error('core.js muss vor answers.js geladen werden.');

  var A = {};

  A.LABELS = {
    mcq: 'Choix multiple',
    vf: 'Vrai ou faux',
    text: 'Réponse libre',
    gap: 'Texte à trous',
    matching: 'Associations',
    order: 'Remets dans l’ordre'
  };

  /* Bei diesen Typen bestätigt man die Antwort mit einem Knopf. */
  A.needsValidate = function (q) {
    return q.type === 'text' || q.type === 'gap' || q.type === 'matching' || q.type === 'order';
  };

  /* ---------------------------------------------------------------- HTML */

  A.html = function (q) {
    if (q.type === 'mcq') return mcqHtml(q);
    if (q.type === 'vf') return vfHtml();
    if (q.type === 'text') return textHtml();
    if (q.type === 'gap') return gapHtml(q);
    if (q.type === 'matching') return matchingHtml(q);
    if (q.type === 'order') return orderHtml(q);
    return '';
  };

  function mcqHtml(q) {
    var options = q.options.map(function (opt, i) {
      return '<button type="button" class="option" data-choice="' + i + '">' +
        '<span class="option__key">' + (i + 1) + '</span>' +
        '<span class="option__text">' + M.esc(opt) + '</span>' +
        '</button>';
    }).join('');
    return '<div class="options">' + options + '</div>';
  }

  function vfHtml() {
    return '<div class="vf-row">' +
      '<button type="button" class="option" data-vf="vrai"><span class="option__key">1</span><span class="option__text">✔️ vrai</span></button>' +
      '<button type="button" class="option" data-vf="faux"><span class="option__key">2</span><span class="option__text">✖️ faux</span></button>' +
      '</div>';
  }

  function textHtml() {
    return '<div class="text-answer">' +
      '<input type="text" data-role="texte" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Écris ta réponse en français…">' +
      '<button type="button" class="btn" data-role="valider">Valider</button>' +
      '</div>';
  }

  function gapHtml(q) {
    var parts = M.splitGapText(q.gapText);
    var gapIndex = 0;
    var phrase = parts.map(function (part) {
      if (part.kind === 'text') return M.esc(part.value);
      var solutions = M.splitAnswers(q.gaps[gapIndex] || '');
      var plusLongue = solutions.reduce(function (max, mot) {
        return Math.max(max, mot.length);
      }, 0);
      var taille = Math.max(7, plusLongue + 3);
      var html = '<input type="text" class="gap-input" data-gap="' + gapIndex + '" ' +
        'data-base="' + taille + '" style="width:calc(' + taille + 'ch + 1.2rem)" ' +
        'autocomplete="off" spellcheck="false" ' +
        'aria-label="Trou ' + (gapIndex + 1) + '">';
      gapIndex++;
      return html;
    }).join('');
    return '<div class="gap-phrase">' + phrase + '</div>' +
      '<div class="row row--end"><button type="button" class="btn" data-role="valider">Valider</button></div>';
  }

  /* Zuordnung: links antippen, dann rechts – die Paare bekommen eine Nummer. */
  function matchingHtml(q) {
    var gauche = q.pairs.map(function (paire, i) {
      return '<button type="button" class="lien" data-left="' + i + '">' +
        '<span class="lien__puce"></span>' +
        '<span class="lien__texte">' + M.esc(paire.left) + '</span>' +
        '</button>';
    }).join('');

    var ordre = q.rightOrder || q.pairs.map(function (_, i) { return i; });
    var droite = ordre.map(function (i) {
      return '<button type="button" class="lien" data-right="' + i + '">' +
        '<span class="lien__puce"></span>' +
        '<span class="lien__texte">' + M.esc(q.pairs[i].right) + '</span>' +
        '</button>';
    }).join('');

    return '<p class="consigne">Touche un élément à gauche, puis son partenaire à droite.</p>' +
      '<div class="appariement">' +
        '<div class="appariement__col">' + gauche + '</div>' +
        '<div class="appariement__col">' + droite + '</div>' +
      '</div>' +
      '<div class="row row--end" style="margin-top:.7rem">' +
        '<button type="button" class="btn btn--doux btn--mini" data-role="vider">Tout effacer</button>' +
        '<button type="button" class="btn" data-role="valider">Valider</button>' +
      '</div>';
  }

  /* Reihenfolge: Pfeile für alle Geräte, Ziehen zusätzlich mit der Maus. */
  function orderHtml(q) {
    var ordre = q.itemOrder || q.items.map(function (_, i) { return i; });
    var lignes = ordre.map(function (i) {
      return '<li class="classement__item" data-item="' + i + '" draggable="true">' +
        '<span class="classement__rang"></span>' +
        '<span class="classement__texte">' + M.esc(q.items[i]) + '</span>' +
        '<span class="classement__fleches">' +
          '<button type="button" class="icon-btn" data-move="up" aria-label="Monter">↑</button>' +
          '<button type="button" class="icon-btn" data-move="down" aria-label="Descendre">↓</button>' +
        '</span>' +
      '</li>';
    }).join('');

    return '<p class="consigne">Mets les éléments dans le bon ordre avec les flèches.</p>' +
      '<ol class="classement">' + lignes + '</ol>' +
      '<div class="row row--end" style="margin-top:.7rem">' +
        '<button type="button" class="btn" data-role="valider">Valider</button>' +
      '</div>';
  }

  /* ------------------------------------------------------- Interaktionen */

  /* Verkabelt Zuordnung und Reihenfolge. mcq/vf laufen über die
     Klick-Delegation des jeweiligen Spielmodus. */
  A.activate = function (root, q) {
    if (q.type === 'matching') activerAppariement(root);
    if (q.type === 'order') activerClassement(root);
    if (q.type === 'gap') activerLacunes(root);
  };

  /* Eine Lücke ist so breit wie ihre längste Lösung – und wächst mit, wenn
     jemand eine längere Antwort eintippt, damit nichts abgeschnitten wirkt. */
  function activerLacunes(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.gap-input'), function (champ) {
      var base = parseInt(champ.getAttribute('data-base'), 10) || 7;
      function ajuster() {
        champ.style.width = 'calc(' + Math.max(base, champ.value.length + 2) + 'ch + 1.2rem)';
      }
      champ.addEventListener('input', ajuster);
      ajuster();
    });
  }

  function boutonsLien(root, cote) {
    return Array.prototype.slice.call(root.querySelectorAll('[data-' + cote + ']'));
  }

  function majPuces(root) {
    var gauches = boutonsLien(root, 'left');
    var numero = 0;
    var couleurs = {};
    gauches.forEach(function (bouton) {
      var lie = bouton.getAttribute('data-linked');
      if (lie === null || lie === '') {
        bouton.querySelector('.lien__puce').textContent = '';
        bouton.classList.remove('lien--lie');
        return;
      }
      numero++;
      couleurs[lie] = numero;
      bouton.querySelector('.lien__puce').textContent = String(numero);
      bouton.classList.add('lien--lie');
      bouton.style.setProperty('--teinte', teinte(numero));
    });
    boutonsLien(root, 'right').forEach(function (bouton) {
      var index = bouton.getAttribute('data-right');
      var numeroDroite = couleurs[index];
      if (numeroDroite) {
        bouton.querySelector('.lien__puce').textContent = String(numeroDroite);
        bouton.classList.add('lien--lie');
        bouton.style.setProperty('--teinte', teinte(numeroDroite));
      } else {
        bouton.querySelector('.lien__puce').textContent = '';
        bouton.classList.remove('lien--lie');
      }
    });
  }

  function teinte(numero) {
    var couleurs = ['var(--framboise)', 'var(--pistache)', 'var(--lavande)', 'var(--citron)', 'var(--myrtille)', 'var(--chocolat)'];
    return couleurs[(numero - 1) % couleurs.length];
  }

  function activerAppariement(root) {
    var zone = root.querySelector('.appariement');
    if (!zone) return;

    zone.addEventListener('click', function (event) {
      var bouton = event.target.closest('.lien');
      if (!bouton || bouton.disabled) return;

      var actif = zone.querySelector('.lien--actif');

      if (bouton.hasAttribute('data-left')) {
        /* Ein verbundenes Element antippen löst die Verbindung wieder. */
        if (bouton.getAttribute('data-linked')) {
          delierGauche(zone, bouton);
          majPuces(zone);
          return;
        }
        if (actif) actif.classList.remove('lien--actif');
        if (actif !== bouton) bouton.classList.add('lien--actif');
        return;
      }

      /* rechte Spalte */
      if (bouton.getAttribute('data-linked')) {
        delierDroite(zone, bouton);
        majPuces(zone);
        return;
      }
      if (!actif || !actif.hasAttribute('data-left')) return;

      actif.setAttribute('data-linked', bouton.getAttribute('data-right'));
      bouton.setAttribute('data-linked', actif.getAttribute('data-left'));
      actif.classList.remove('lien--actif');
      majPuces(zone);
    });

    var vider = root.querySelector('[data-role="vider"]');
    if (vider) {
      vider.addEventListener('click', function () {
        zone.querySelectorAll('.lien').forEach(function (bouton) {
          bouton.removeAttribute('data-linked');
          bouton.classList.remove('lien--actif', 'lien--lie');
        });
        majPuces(zone);
      });
    }
  }

  function delierGauche(zone, bouton) {
    var index = bouton.getAttribute('data-linked');
    var partenaire = zone.querySelector('[data-right="' + index + '"]');
    if (partenaire) partenaire.removeAttribute('data-linked');
    bouton.removeAttribute('data-linked');
  }

  function delierDroite(zone, bouton) {
    var index = bouton.getAttribute('data-linked');
    var partenaire = zone.querySelector('[data-left="' + index + '"]');
    if (partenaire) partenaire.removeAttribute('data-linked');
    bouton.removeAttribute('data-linked');
  }

  function activerClassement(root) {
    var liste = root.querySelector('.classement');
    if (!liste) return;

    function majRangs() {
      Array.prototype.forEach.call(liste.children, function (item, i) {
        var rang = item.querySelector('.classement__rang');
        if (rang) rang.textContent = String(i + 1);
      });
    }
    majRangs();

    liste.addEventListener('click', function (event) {
      var bouton = event.target.closest('[data-move]');
      if (!bouton) return;
      var item = bouton.closest('.classement__item');
      if (!item || item.classList.contains('fige')) return;
      if (bouton.getAttribute('data-move') === 'up') {
        if (item.previousElementSibling) liste.insertBefore(item, item.previousElementSibling);
      } else if (item.nextElementSibling) {
        liste.insertBefore(item.nextElementSibling, item);
      }
      majRangs();
      item.querySelector('[data-move="' + bouton.getAttribute('data-move') + '"]').focus();
    });

    var tire = null;
    liste.addEventListener('dragstart', function (event) {
      var item = event.target.closest('.classement__item');
      if (!item || item.classList.contains('fige')) return;
      tire = item;
      item.classList.add('glisse');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    liste.addEventListener('dragover', function (event) {
      if (!tire) return;
      event.preventDefault();
      var cible = event.target.closest('.classement__item');
      if (!cible || cible === tire) return;
      var rect = cible.getBoundingClientRect();
      var apres = (event.clientY - rect.top) > rect.height / 2;
      liste.insertBefore(tire, apres ? cible.nextElementSibling : cible);
      majRangs();
    });
    liste.addEventListener('drop', function (event) { event.preventDefault(); });
    liste.addEventListener('dragend', function () {
      if (tire) tire.classList.remove('glisse');
      tire = null;
      majRangs();
    });
  }

  /* -------------------------------------------------------- Auswertung */

  A.read = function (q, root) {
    if (q.type === 'text') {
      var champ = root.querySelector('[data-role="texte"]');
      return champ ? champ.value : '';
    }
    if (q.type === 'gap') {
      return Array.prototype.map.call(root.querySelectorAll('.gap-input'), function (input) {
        return input.value;
      });
    }
    if (q.type === 'matching') {
      var reponse = [];
      boutonsLien(root, 'left').forEach(function (bouton) {
        var gauche = parseInt(bouton.getAttribute('data-left'), 10);
        var lie = bouton.getAttribute('data-linked');
        reponse[gauche] = (lie === null || lie === '') ? -1 : parseInt(lie, 10);
      });
      return reponse;
    }
    if (q.type === 'order') {
      return Array.prototype.map.call(root.querySelectorAll('.classement__item'), function (item) {
        return parseInt(item.getAttribute('data-item'), 10);
      });
    }
    return null;
  };

  /* Fehlt noch etwas? Dann lieber nachfragen als falsch werten. */
  A.incomplete = function (q, response) {
    if (q.type === 'text') return !String(response || '').trim();
    if (q.type === 'gap') {
      return !(response || []).some(function (v) { return String(v).trim(); });
    }
    if (q.type === 'matching') {
      return (response || []).some(function (v) { return v === undefined || v < 0; });
    }
    return false;
  };

  A.INCOMPLETE_FR = {
    text: 'Écris d’abord ta réponse.',
    gap: 'Remplis au moins un trou.',
    matching: 'Il reste des éléments sans partenaire.'
  };

  /* --------------------------------------------------- Rückmeldung zeigen */

  A.mark = function (q, root, entry) {
    Array.prototype.forEach.call(root.querySelectorAll('.option'), function (btn) {
      btn.disabled = true;
      var valeur = btn.hasAttribute('data-choice')
        ? parseInt(btn.getAttribute('data-choice'), 10)
        : btn.getAttribute('data-vf');
      var estBonne = q.type === 'mcq' ? valeur === q.correctIndex : valeur === q.correctVF;
      var choisi = valeur === entry.response;
      if (estBonne) btn.classList.add('option--juste');
      else if (choisi) btn.classList.add('option--rate');
      else btn.classList.add('option--pale');
    });

    var champ = root.querySelector('[data-role="texte"]');
    if (champ) {
      champ.disabled = true;
      champ.classList.add(entry.correct ? 'gap-input--juste' : 'gap-input--rate');
    }

    if (q.type === 'gap' && entry.perGap) {
      Array.prototype.forEach.call(root.querySelectorAll('.gap-input'), function (input, i) {
        input.disabled = true;
        input.classList.add(entry.perGap[i] ? 'gap-input--juste' : 'gap-input--rate');
      });
    }

    if (q.type === 'matching' && entry.perPair) {
      boutonsLien(root, 'left').forEach(function (bouton) {
        var i = parseInt(bouton.getAttribute('data-left'), 10);
        bouton.disabled = true;
        bouton.classList.add(entry.perPair[i] ? 'lien--juste' : 'lien--rate');
        if (!entry.perPair[i]) {
          var solution = document.createElement('span');
          solution.className = 'lien__solution';
          solution.textContent = '→ ' + q.pairs[i].right;
          bouton.appendChild(solution);
        }
      });
      boutonsLien(root, 'right').forEach(function (bouton) { bouton.disabled = true; });
    }

    if (q.type === 'order' && entry.perItem) {
      Array.prototype.forEach.call(root.querySelectorAll('.classement__item'), function (item, position) {
        var index = parseInt(item.getAttribute('data-item'), 10);
        item.classList.add('fige');
        item.setAttribute('draggable', 'false');
        item.classList.add(index === position ? 'classement__item--juste' : 'classement__item--rate');
        var fleches = item.querySelector('.classement__fleches');
        if (fleches) fleches.remove();
      });
    }

    var valider = root.querySelector('[data-role="valider"]');
    if (valider) valider.remove();
    var vider = root.querySelector('[data-role="vider"]');
    if (vider) vider.remove();
  };

  /* Wie soll die Antwort der Schülerin im Rückblick dastehen? */
  A.responseText = function (q, response) {
    if (q.type === 'mcq') return String(q.options[response] || '');
    if (q.type === 'vf') return String(response || '');
    if (q.type === 'text') return String(response || '');
    if (q.type === 'gap') {
      return (response || []).map(function (v) { return String(v).trim() || '…'; }).join(' · ');
    }
    if (q.type === 'matching') {
      return q.pairs.map(function (paire, i) {
        var choisi = (response || [])[i];
        var droite = (choisi >= 0 && q.pairs[choisi]) ? q.pairs[choisi].right : '…';
        return paire.left + ' → ' + droite;
      }).join(' · ');
    }
    if (q.type === 'order') {
      return (response || []).map(function (i) { return q.items[i]; }).join(' → ');
    }
    return '';
  };

  M.answers = A;
})(window);
