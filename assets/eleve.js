/* ==========================================================================
   Schueler-App – Ablauf: Quiz laden -> Name waehlen -> spielen -> Ergebnis
   Oberflaeche komplett auf Franzoesisch.
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.Macaron;
  var CLE_RECORDS = 'macaron.records';
  var CLE_NOM = 'macaron.nom';

  var App = {
    quiz: null,
    player: null,
    nom: '',

    init: function () {
      M.theme.init();
      this.brancher();
      this.nom = M.storage.get(CLE_NOM, '') || this.tirerNom();
      this.ecran('charger');
    },

    /* ---------- Schirme ---------- */

    ecran: function (nom) {
      ['charger', 'preparer', 'jeu'].forEach(function (cle) {
        var section = document.querySelector('[data-ecran="' + cle + '"]');
        if (section) section.classList.toggle('hidden', cle !== nom);
      });
      window.scrollTo(0, 0);
    },

    /* ---------- Ereignisse ---------- */

    brancher: function () {
      var self = this;

      document.getElementById('btnTheme').addEventListener('click', function () {
        var mode = M.theme.cycle();
        M.toast('Couleurs : ' + M.theme.labelFr(mode));
      });

      document.getElementById('fichierQuiz').addEventListener('change', function (event) {
        var fichier = event.target.files && event.target.files[0];
        if (fichier) self.lireFichier(fichier);
        event.target.value = '';
      });

      var zone = document.getElementById('zoneDepot');
      ['dragenter', 'dragover'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.add('survol');
        });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.remove('survol');
        });
      });
      zone.addEventListener('drop', function (event) {
        var fichier = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (fichier) self.lireFichier(fichier);
      });

      document.getElementById('btnDemo').addEventListener('click', function () {
        var demo = M.normalizeQuiz(global.MACARON_DEMO);
        if (demo) self.chargerQuiz(demo);
        else M.toast('Le quiz de démonstration est introuvable.', 'erreur');
      });

      document.getElementById('btnTirerNom').addEventListener('click', function () {
        self.nom = self.tirerNom();
        self.afficherNom();
      });

      document.getElementById('champNom').addEventListener('input', function (event) {
        self.nom = event.target.value;
        document.getElementById('nomActuel').textContent = self.nom || '…';
      });

      document.getElementById('btnCommencer').addEventListener('click', function () {
        self.commencer();
      });

      document.getElementById('btnAutreQuiz').addEventListener('click', function () {
        self.quiz = null;
        self.ecran('charger');
      });

      document.getElementById('btnAbandonner').addEventListener('click', function () {
        if (!confirm('Quitter le quiz en cours ?')) return;
        self.arreterPlayer();
        self.ecran('preparer');
      });

      /* Radios der Schueler-Einstellungen aktivieren die passenden Felder */
      document.getElementById('reglagesEleve').addEventListener('change', function () {
        self.majChampsNombre();
      });
    },

    /* ---------- Quiz laden ---------- */

    lireFichier: function (fichier) {
      var self = this;
      M.readQuizFile(fichier, function (quiz) {
        self.chargerQuiz(quiz);
      }, function () {
        M.toast('Ce fichier ne contient pas de quiz valide.', 'erreur');
      });
    },

    chargerQuiz: function (quiz) {
      this.quiz = quiz;
      var titre = quiz.title || 'Quiz de français';
      document.getElementById('titreQuiz').textContent = titre;
      document.getElementById('sousTitreQuiz').textContent = quiz.subtitle || '';
      document.title = titre + ' – Le Marathon des Macarons';
      this.afficherResume();
      this.afficherNom();
      this.preparerReglages();
      this.afficherRecord();
      this.ecran('preparer');
      M.toast(quiz.questions.length + ' questions chargées 🍬', 'ok');
    },

    /* ---------- Zusammenfassung der Lehrer-Einstellungen ---------- */

    texteNombre: function (settings, total) {
      if (settings.countMode === 'fixed') {
        return Math.min(settings.count, total) + ' sur ' + total;
      }
      if (settings.countMode === 'range') {
        var lo = Math.min(settings.countMin, total);
        var hi = Math.min(settings.countMax, total);
        if (lo === hi) return lo + ' sur ' + total;
        return 'entre ' + lo + ' et ' + hi + ' (tirage au sort)';
      }
      return 'toutes les ' + total + ' questions';
    },

    afficherResume: function () {
      var s = this.quiz.settings;
      var total = this.quiz.questions.length;
      var lignes = [
        ['🍬', 'Questions', this.texteNombre(s, total)],
        ['🔀', 'Ordre', s.order === 'random' ? 'au hasard' : 'dans l’ordre du quiz'],
        ['💡', 'Indices', s.allowHints ? 'disponibles (−' + s.hintPenalty + ' pts)' : 'désactivés'],
        ['⏱', 'Bonus de rapidité', s.speedBonus ? 'activé' : 'désactivé']
      ];
      document.getElementById('resumeQuiz').innerHTML = lignes.map(function (l) {
        return '<li><span aria-hidden="true">' + l[0] + '</span><b>' + l[1] + ' :</b> ' + M.esc(l[2]) + '</li>';
      }).join('');
    },

    /* ---------- Name ---------- */

    tirerNom: function () {
      var prenom = M.pickOne(M.PRENOMS);
      /* In etwa der Haelfte der Faelle gibt es einen Macaron-Spitznamen dazu. */
      return Math.random() < 0.5 ? prenom : prenom + ' ' + M.pickOne(M.SURNOMS);
    },

    afficherNom: function () {
      document.getElementById('nomActuel').textContent = this.nom || '…';
      document.getElementById('champNom').value = this.nom;
    },

    /* ---------- Einstellungen der Schueler ---------- */

    preparerReglages: function () {
      var bloc = document.getElementById('reglagesEleve');
      var s = this.quiz.settings;
      var total = this.quiz.questions.length;

      bloc.classList.toggle('hidden', !s.allowStudentSettings);
      if (!s.allowStudentSettings) return;

      document.getElementById('totalQuestions').textContent = String(total);

      var ordre = bloc.querySelector('input[name="ordre"][value="' + s.order + '"]');
      if (ordre) ordre.checked = true;
      var nombre = bloc.querySelector('input[name="nombre"][value="' + s.countMode + '"]');
      if (nombre) nombre.checked = true;

      var exact = document.getElementById('nombreExact');
      var min = document.getElementById('nombreMin');
      var max = document.getElementById('nombreMax');
      [exact, min, max].forEach(function (champ) { champ.max = String(total); });
      exact.value = String(M.clamp(s.count, 1, total));
      min.value = String(M.clamp(s.countMin, 1, total));
      max.value = String(M.clamp(s.countMax, 1, total));

      this.majChampsNombre();
    },

    majChampsNombre: function () {
      var bloc = document.getElementById('reglagesEleve');
      var choisi = bloc.querySelector('input[name="nombre"]:checked');
      var mode = choisi ? choisi.value : 'all';
      document.getElementById('nombreExact').disabled = mode !== 'fixed';
      document.getElementById('nombreMin').disabled = mode !== 'range';
      document.getElementById('nombreMax').disabled = mode !== 'range';
    },

    reglagesChoisis: function () {
      var s = this.quiz.settings;
      if (!s.allowStudentSettings) return null;

      var bloc = document.getElementById('reglagesEleve');
      var total = this.quiz.questions.length;
      var ordre = bloc.querySelector('input[name="ordre"]:checked');
      var nombre = bloc.querySelector('input[name="nombre"]:checked');
      var mode = nombre ? nombre.value : 'all';

      var min = M.clamp(document.getElementById('nombreMin').value, 1, total);
      var max = M.clamp(document.getElementById('nombreMax').value, 1, total);
      if (max < min) { var tmp = min; min = max; max = tmp; }

      return {
        order: ordre ? ordre.value : s.order,
        countMode: mode,
        count: M.clamp(document.getElementById('nombreExact').value, 1, total),
        countMin: min,
        countMax: max
      };
    },

    /* ---------- Spiel ---------- */

    arreterPlayer: function () {
      if (this.player) {
        this.player.destroy();
        this.player = null;
      }
    },

    commencer: function () {
      var self = this;
      if (!this.quiz) return;
      if (!this.nom.trim()) this.nom = this.tirerNom();
      M.storage.set(CLE_NOM, this.nom);

      this.arreterPlayer();
      document.getElementById('btnAbandonner').classList.remove('hidden');
      this.ecran('jeu');

      this.player = M.createPlayer({
        mount: document.getElementById('zoneJeu'),
        quiz: this.quiz,
        overrides: this.reglagesChoisis(),
        playerName: this.nom,
        replayLabel: 'Rejouer',
        quitLabel: 'Changer de réglages',
        onFinish: function (bilan) {
          document.getElementById('btnAbandonner').classList.add('hidden');
          self.enregistrerRecord(bilan);
        },
        onReplay: function () { self.commencer(); },
        onQuit: function () {
          self.player = null;
          self.afficherRecord();
          self.ecran('preparer');
        }
      });
    },

    /* ---------- Bestleistung ---------- */

    enregistrerRecord: function (bilan) {
      var records = M.storage.get(CLE_RECORDS, {}) || {};
      var ancien = records[this.quiz.id];
      if (!ancien || bilan.score > ancien.score) {
        records[this.quiz.id] = {
          score: bilan.score,
          nom: this.nom,
          correct: bilan.correct,
          total: bilan.total,
          date: new Date().toISOString()
        };
        M.storage.set(CLE_RECORDS, records);
        if (ancien) M.toast('🏆 Nouveau record : ' + bilan.score + ' points !', 'ok');
      }
      this.afficherRecord();
    },

    afficherRecord: function () {
      var champ = document.getElementById('meilleurScore');
      var records = M.storage.get(CLE_RECORDS, {}) || {};
      var record = this.quiz ? records[this.quiz.id] : null;
      if (!record) {
        champ.classList.add('hidden');
        return;
      }
      champ.classList.remove('hidden');
      champ.textContent = '🏆 Meilleur score sur cet appareil : ' + record.score +
        ' points (' + record.nom + ', ' + record.correct + '/' + record.total + ')';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

  global.AppEleve = App;
})(window);
