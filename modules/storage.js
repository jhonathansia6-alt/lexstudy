// ═══════════════════════════════════════════════════
// modules/storage.js
// Gestion du stockage local (clé API, scores, historique)
// Utilise localStorage — zéro serveur, zéro coût
// ═══════════════════════════════════════════════════

const Storage = {

  // ── Clés utilisées dans localStorage ────────────
  KEYS: {
    API_KEY:      "lexstudy_api_key",
    QCM_SCORES:   "lexstudy_qcm_scores",
    CHAT_HISTORY: "lexstudy_chat_history",
  },

  // ════════════════════════════════════════════════
  // CLÉ API
  // ════════════════════════════════════════════════

  // Sauvegarde la clé API
  saveApiKey(key) {
    localStorage.setItem(this.KEYS.API_KEY, key.trim());
  },

  // Récupère la clé API
  getApiKey() {
    return localStorage.getItem(this.KEYS.API_KEY) || null;
  },

  // Vérifie si une clé API existe déjà
  hasApiKey() {
    const key = this.getApiKey();
    return key !== null && key.startsWith("sk-ant-");
  },

  // Supprime la clé API (pour la changer)
  removeApiKey() {
    localStorage.removeItem(this.KEYS.API_KEY);
  },

  // ════════════════════════════════════════════════
  // SCORES QCM
  // Sauvegarde les résultats de chaque QCM par module
  // ════════════════════════════════════════════════

  // Sauvegarde un score pour un module donné
  // moduleId : ex "intro-droit"
  // score    : ex { correct: 6, total: 8, date: "2025-10-15" }
  saveScore(moduleId, score) {
    const all = this.getAllScores();

    if (!all[moduleId]) {
      all[moduleId] = [];
    }

    all[moduleId].push({
      correct: score.correct,
      total:   score.total,
      pct:     Math.round((score.correct / score.total) * 100),
      date:    new Date().toLocaleDateString("fr-FR"),
    });

    // On garde les 20 derniers scores par module
    if (all[moduleId].length > 20) {
      all[moduleId] = all[moduleId].slice(-20);
    }

    localStorage.setItem(this.KEYS.QCM_SCORES, JSON.stringify(all));
  },

  // Récupère tous les scores de tous les modules
  getAllScores() {
    try {
      const raw = localStorage.getItem(this.KEYS.QCM_SCORES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  // Récupère les scores d'un module spécifique
  getModuleScores(moduleId) {
    const all = this.getAllScores();
    return all[moduleId] || [];
  },

  // Calcule la moyenne d'un module
  getModuleAverage(moduleId) {
    const scores = this.getModuleScores(moduleId);
    if (scores.length === 0) return null;
    const sum = scores.reduce((acc, s) => acc + s.pct, 0);
    return Math.round(sum / scores.length);
  },

  // ════════════════════════════════════════════════
  // HISTORIQUE DE CHAT
  // Sauvegarde les conversations par module
  // ════════════════════════════════════════════════

  // Sauvegarde l'historique d'un chat
  saveChatHistory(moduleId, messages) {
    const all = this.getAllChatHistories();
    // On garde les 30 derniers messages
    all[moduleId] = messages.slice(-30);
    localStorage.setItem(this.KEYS.CHAT_HISTORY, JSON.stringify(all));
  },

  // Récupère tous les historiques
  getAllChatHistories() {
    try {
      const raw = localStorage.getItem(this.KEYS.CHAT_HISTORY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  // Récupère l'historique d'un module
  getChatHistory(moduleId) {
    const all = this.getAllChatHistories();
    return all[moduleId] || [];
  },

  // Efface l'historique d'un module
  clearChatHistory(moduleId) {
    const all = this.getAllChatHistories();
    delete all[moduleId];
    localStorage.setItem(this.KEYS.CHAT_HISTORY, JSON.stringify(all));
  },

  // ════════════════════════════════════════════════
  // UTILITAIRES
  // ════════════════════════════════════════════════

  // Efface TOUTES les données (reset complet)
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  },

  // Calcule l'espace utilisé (en Ko)
  getStorageSize() {
    let total = 0;
    Object.values(this.KEYS).forEach(k => {
      const val = localStorage.getItem(k);
      if (val) total += val.length;
    });
    return (total / 1024).toFixed(1); // en Ko
  }

};

// Rend Storage accessible globalement
window.Storage = Storage;
        
