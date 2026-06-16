// ═══════════════════════════════════════════════════
// app.js — Chef d'orchestre de LexStudy
// Lance l'app, gère la navigation, connecte les modules
// ═══════════════════════════════════════════════════

const App = {

  // Module actuellement sélectionné
  currentModule: null,

  // Fonctionnalité active dans le module
  currentFeature: "predictor",

  // ════════════════════════════════════════════════
  // DÉMARRAGE DE L'APPLICATION
  // ════════════════════════════════════════════════
  init() {
    // Configurer pdf.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    // Vérifier si une clé API est déjà sauvegardée
    if (Storage.hasApiKey()) {
      this._showApp();
    } else {
      this._showSetup();
    }
  },

  // ════════════════════════════════════════════════
  // ÉCRAN DE CONFIGURATION (première fois)
  // ════════════════════════════════════════════════
  _showSetup() {
    document.getElementById("setup-screen").classList.remove("hidden");
    document.getElementById("app-screen").classList.add("hidden");

    document.getElementById("save-key-btn")
      .addEventListener("click", () => this._saveApiKey());

    // Permettre de valider avec Entrée
    document.getElementById("api-key-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._saveApiKey();
      });
  },

  _saveApiKey() {
    const input = document.getElementById("api-key-input");
    const key   = input.value.trim();

    if (!key) {
      this.showToast("⚠️ Saisis ta clé API");
      return;
    }
    if (!key.startsWith("sk-ant-")) {
      this.showToast("❌ Clé invalide — elle doit commencer par sk-ant-");
      return;
    }

    Storage.saveApiKey(key);
    this.showToast("✅ Clé sauvegardée !");

    setTimeout(() => this._showApp(), 600);
  },

  // ════════════════════════════════════════════════
  // APPLICATION PRINCIPALE
  // ════════════════════════════════════════════════
  _showApp() {
    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");

    this._buildModuleList();
    this._bindAppEvents();
  },

  // ════════════════════════════════════════════════
  // CONSTRUIRE LA LISTE DES MODULES (sidebar)
  // ════════════════════════════════════════════════
  _buildModuleList(semFilter = 0) {
    const nav = document.getElementById("module-list");
    nav.innerHTML = "";

    const filtered = semFilter === 0
      ? window.MODULES
      : window.MODULES.filter(m => m.sem === semFilter);

    filtered.forEach(module => {
      const btn = document.createElement("button");
      btn.className   = "module-item";
      btn.dataset.id  = module.id;
      btn.innerHTML   = `
        <span class="sem-badge">S${module.sem}</span>
        <span>${module.label}</span>
      `;

      btn.addEventListener("click", () => {
        this._selectModule(module);
        // Fermer la sidebar sur mobile après sélection
        this._closeSidebar();
      });

      nav.appendChild(btn);
    });
  },

  // ════════════════════════════════════════════════
  // ÉVÉNEMENTS GLOBAUX DE L'APP
  // ════════════════════════════════════════════════
  _bindAppEvents() {

    // ── Bouton menu (sidebar mobile) ──────────────
    document.getElementById("menu-toggle")
      .addEventListener("click", () => this._toggleSidebar());

    // ── Overlay ferme la sidebar ──────────────────
    document.getElementById("sidebar-overlay")
      .addEventListener("click", () => this._closeSidebar());

    // ── Filtres par semestre ──────────────────────
    document.querySelectorAll(".sem-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".sem-btn")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this._buildModuleList(parseInt(btn.dataset.sem));
      });
    });

    // ── Onglets de fonctionnalités ────────────────
    document.querySelectorAll(".ftab").forEach(tab => {
      tab.addEventListener("click", () => {
        const feature = tab.dataset.feature;
        this._switchFeature(feature);
      });
    });

    // ── Bouton changer la clé API ─────────────────
    document.getElementById("change-key-btn")
      .addEventListener("click", () => this._promptChangeKey());
  },

  // ════════════════════════════════════════════════
  // SÉLECTIONNER UN MODULE
  // ════════════════════════════════════════════════
  _selectModule(module) {
    this.currentModule  = module;
    this.currentFeature = "predictor";

    // Mettre à jour l'état actif dans la sidebar
    document.querySelectorAll(".module-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.id === module.id);
    });

    // Mettre à jour le header
    document.getElementById("header-module-name").textContent = module.label;

    // Afficher la page du module, cacher l'accueil
    document.getElementById("home-page").classList.add("hidden");
    document.getElementById("module-page").classList.remove("hidden");

    // Mettre à jour le titre et les tags du module
    document.getElementById("module-title").textContent = module.label;

    const tagsEl = document.getElementById("module-ec-tags");
    tagsEl.innerHTML = module.ec
      .map(e => `<span class="ec-tag">${e}</span>`)
      .join("");

    // Réinitialiser les onglets — "Prédiction" actif par défaut
    document.querySelectorAll(".ftab").forEach(t => {
      t.classList.toggle("active", t.dataset.feature === "predictor");
    });

    // Afficher le panneau prédiction, cacher les autres
    document.querySelectorAll(".panel").forEach(p => {
      p.classList.toggle("hidden", p.id !== "panel-predictor");
      p.classList.toggle("active", p.id === "panel-predictor");
    });

    // Initialiser la fonctionnalité active avec le module
    Predictor.init(module);

    // Scroll vers le haut du contenu
    document.getElementById("main-content").scrollTop = 0;
  },

  // ════════════════════════════════════════════════
  // CHANGER DE FONCTIONNALITÉ (onglets)
  // ════════════════════════════════════════════════
  _switchFeature(feature) {
    if (!this.currentModule) return;
    this.currentFeature = feature;

    // Mettre à jour les onglets
    document.querySelectorAll(".ftab").forEach(t => {
      t.classList.toggle("active", t.dataset.feature === feature);
    });

    // Afficher le bon panneau
    document.querySelectorAll(".panel").forEach(p => {
      const isActive = p.id === `panel-${feature}`;
      p.classList.toggle("hidden", !isActive);
      p.classList.toggle("active", isActive);
    });

    // Initialiser le module de la fonctionnalité
    switch (feature) {
      case "predictor": Predictor.init(this.currentModule); break;
      case "qcm":       QCM.init(this.currentModule);       break;
      case "exercices": Exercices.init(this.currentModule); break;
      case "chat":      Chat.init(this.currentModule);      break;
    }

    // Scroll vers le haut
    document.getElementById("main-content").scrollTop = 0;
  },

  // ════════════════════════════════════════════════
  // GESTION DE LA SIDEBAR (mobile)
  // ════════════════════════════════════════════════
  _toggleSidebar() {
    const sidebar  = document.getElementById("sidebar");
    const overlay  = document.getElementById("sidebar-overlay");
    const isOpen   = sidebar.classList.contains("open");

    if (isOpen) {
      this._closeSidebar();
    } else {
      sidebar.classList.add("open");
      overlay.classList.add("visible");
    }
  },

  _closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("visible");
  },

  // ════════════════════════════════════════════════
  // CHANGER LA CLÉ API
  // ════════════════════════════════════════════════
  _promptChangeKey() {
    const current = Storage.getApiKey();
    const masked  = current
      ? current.slice(0, 12) + "..." + current.slice(-4)
      : "aucune";

    const ok = window.confirm(
      `Clé actuelle : ${masked}\n\nVeux-tu la remplacer ?`
    );

    if (!ok) return;

    Storage.removeApiKey();
    this.showToast("🔑 Clé supprimée — entre la nouvelle");

    setTimeout(() => {
      document.getElementById("setup-screen").classList.remove("hidden");
      document.getElementById("app-screen").classList.add("hidden");

      // Réinitialiser l'écran de setup
      const input = document.getElementById("api-key-input");
      if (input) input.value = "";

      // Re-brancher le bouton
      const btn = document.getElementById("save-key-btn");
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", () => this._saveApiKey());
    }, 400);
  },

  // ════════════════════════════════════════════════
  // TOAST — NOTIFICATION RAPIDE
  // Utilisé par tous les modules : App.showToast("message")
  // ════════════════════════════════════════════════
  showToast(message, duration = 2500) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  },

};

// ════════════════════════════════════════════════
// LANCEMENT AU CHARGEMENT DE LA PAGE
// ════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
