// ═══════════════════════════════════════════════════
// modules/chat.js
// Chat avec le cours PDF — prof virtuel 24h/24
// Conversation multi-tours avec mémoire du contexte
// ═══════════════════════════════════════════════════

const Chat = {

  state: {
    courseFile:  null,
    courseText:  "",       // texte extrait du PDF
    history:     [],       // historique de la conversation
    isLoading:   false,
    isReady:     false,    // true quand le cours est chargé
  },

  // ════════════════════════════════════════════════
  // INITIALISATION
  // ════════════════════════════════════════════════
  init(module) {
    // Récupère l'historique sauvegardé pour ce module
    const savedHistory = Storage.getChatHistory(module.id);

    this.state = {
      courseFile: null,
      courseText: "",
      history:    savedHistory,
      isLoading:  false,
      isReady:    false,
    };
    this.currentModule = module;

    const panel = document.getElementById("panel-chat");
    panel.innerHTML = `
      <p class="panel-title">💬 Chat avec ton cours</p>
      <p class="panel-hint">
        Charge ton cours PDF et pose toutes tes questions dessus.
        L'IA répond comme un professeur qui connaît ton cours par cœur.
      </p>

      <!-- Zone upload (visible si pas de cours chargé) -->
      <div id="chat-upload-section">
        <label class="chat-upload-zone" id="chat-upload-zone">
          <input type="file" id="chat-course-input" accept=".pdf" />
          <div>
            <div style="font-size:36px;margin-bottom:10px">📘</div>
            <p style="font-weight:600;color:var(--text-primary);margin-bottom:6px">
              Charge ton cours PDF
            </p>
            <p>Le cours sera analysé et l'IA pourra répondre<br/>à toutes tes questions dessus</p>
          </div>
        </label>

        <!-- Si historique existant, proposer de continuer sans cours -->
        ${savedHistory.length > 0 ? `
          <div style="text-align:center;margin-top:12px">
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">
              Tu as une conversation sauvegardée (${savedHistory.length} messages)
            </p>
            <button class="btn-secondary" id="chat-resume-btn">
              <i class="fa fa-history"></i> Reprendre sans cours
            </button>
          </div>
        ` : ""}
      </div>

      <!-- Interface de chat (cachée au départ) -->
      <div id="chat-interface" style="display:none">

        <!-- Barre d'info du cours chargé -->
        <div id="chat-course-bar" style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          background:var(--bg-element);
          border:1px solid var(--border-light);
          border-radius:8px;
          padding:10px 14px;
          margin-bottom:14px;
          gap:10px;
        ">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
            <i class="fa fa-file-pdf" style="color:var(--gold);flex-shrink:0"></i>
            <span id="chat-course-label" style="
              font-size:13px;color:var(--text-secondary);
              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            ">Cours chargé</span>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn-secondary" id="chat-clear-btn" title="Effacer la conversation" style="padding:6px 10px">
              <i class="fa fa-trash"></i>
            </button>
            <button class="btn-secondary" id="chat-change-btn" title="Changer de cours" style="padding:6px 10px">
              <i class="fa fa-rotate"></i>
            </button>
          </div>
        </div>

        <!-- Boîte de messages -->
        <div class="chat-box" id="chat-messages-box">
          <!-- Messages injectés ici -->
        </div>

        <!-- Questions suggérées (affiché au démarrage) -->
        <div id="chat-suggestions" style="margin-bottom:10px"></div>

        <!-- Barre de saisie -->
        <div class="chat-input-row">
          <input
            type="text"
            id="chat-input"
            placeholder="Pose ta question sur le cours..."
            autocomplete="off"
          />
          <button class="chat-send-btn" id="chat-send-btn">
            <i class="fa fa-paper-plane"></i>
          </button>
        </div>

        <!-- Compteur de messages -->
        <div style="
          text-align:right;
          font-size:11px;
          color:var(--text-muted);
          margin-top:6px;
        ">
          <span id="chat-msg-count">0</span> messages sauvegardés
        </div>

      </div>
    `;

    this._bindEvents();

    // Si historique existant → reprendre directement
    if (savedHistory.length > 0) {
      this._resumeWithHistory();
    }
  },

  // ════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ════════════════════════════════════════════════
  _bindEvents() {
    // Upload du cours
    document.getElementById("chat-course-input")
      .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) this._loadCourse(file);
      });

    // Reprendre sans cours (si historique)
    const resumeBtn = document.getElementById("chat-resume-btn");
    if (resumeBtn) {
      resumeBtn.addEventListener("click", () => this._resumeWithHistory());
    }

    // Bouton envoyer
    document.getElementById("chat-send-btn")
      .addEventListener("click", () => this._sendMessage());

    // Envoyer avec Entrée
    document.getElementById("chat-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) this._sendMessage();
      });

    // Effacer la conversation
    document.getElementById("chat-clear-btn")
      .addEventListener("click", () => this._clearHistory());

    // Changer de cours
    document.getElementById("chat-change-btn")
      .addEventListener("click", () => this._changeCourse());
  },

  // ════════════════════════════════════════════════
  // CHARGER UN COURS PDF
  // ════════════════════════════════════════════════
  async _loadCourse(file) {
    this.state.courseFile = file;

    // Afficher un spinner pendant l'extraction
    document.getElementById("chat-upload-section").innerHTML = `
      <div class="spinner-wrap">
        <div class="spinner"></div>
        <p>Lecture du cours en cours...</p>
      </div>
    `;

    try {
      const text = await this._extractTextFromPDF(file);
      this.state.courseText = text.slice(0, 10000); // limite raisonnable
      this.state.isReady    = true;

      // Afficher l'interface de chat
      this._showChatInterface(file.name);

      // Message de bienvenue de l'IA
      const welcome = this._buildWelcomeMessage(file.name, text.length);
      this._appendMessage("bot", welcome);

      // Suggestions de questions
      this._showSuggestions();

      App.showToast("✅ Cours chargé — pose ta première question !");

    } catch (err) {
      App.showToast("❌ Erreur de lecture : " + err.message);
      // Restaurer la zone d'upload
      this.init(this.currentModule);
    }
  },

  // ════════════════════════════════════════════════
  // REPRENDRE AVEC L'HISTORIQUE SAUVEGARDÉ
  // ════════════════════════════════════════════════
  _resumeWithHistory() {
    this.state.isReady = true;
    this._showChatInterface("Cours précédent (historique)");

    // Réafficher tous les messages sauvegardés
    this.state.history.forEach(msg => {
      if (msg.role === "user") {
        this._appendMessage("user", msg.content);
      } else if (msg.role === "assistant") {
        this._appendMessage("bot", msg.content);
      }
    });

    this._updateMsgCount();
    App.showToast("💬 Conversation restaurée");
  },

  // ════════════════════════════════════════════════
  // AFFICHER L'INTERFACE DE CHAT
  // ════════════════════════════════════════════════
  _showChatInterface(courseName) {
    document.getElementById("chat-upload-section").style.display = "none";
    document.getElementById("chat-interface").style.display      = "block";
    document.getElementById("chat-course-label").textContent     = courseName;

    // Focus sur l'input
    setTimeout(() => {
      document.getElementById("chat-input")?.focus();
    }, 300);
  },

  // ════════════════════════════════════════════════
  // MESSAGE DE BIENVENUE
  // ════════════════════════════════════════════════
  _buildWelcomeMessage(fileName, textLength) {
    const pages = Math.round(textLength / 2500);
    return `Bonjour ! J'ai bien lu ton cours "${fileName}" (environ ${pages} page${pages > 1 ? "s" : ""} analysée${pages > 1 ? "s" : ""}).

Je suis prêt à répondre à toutes tes questions sur ${this.currentModule.label}.

Tu peux me demander :
• D'expliquer une notion que tu n'as pas comprise
• De donner des exemples concrets
• De faire des liens entre différents chapitres
• De résumer un point clé
• De t'interroger sur une notion

Quelle est ta première question ?`;
  },

  // ════════════════════════════════════════════════
  // SUGGESTIONS DE QUESTIONS
  // ════════════════════════════════════════════════
  _showSuggestions() {
    const mod = this.currentModule;

    // Suggestions génériques adaptées à chaque module
    const suggestionsByModule = {
      "intro-droit":        ["C'est quoi la différence entre droit objectif et droits subjectifs ?", "Explique les sources du droit au Burkina Faso", "Comment la loi s'applique-t-elle dans le temps ?"],
      "droit-const-general":["Quelle est la différence entre régime parlementaire et présidentiel ?", "C'est quoi une Constitution rigide ?", "Explique la séparation des pouvoirs"],
      "droit-personnes":    ["C'est quoi la capacité juridique ?", "Explique le régime des incapacités du mineur", "Quels sont les droits de la personnalité ?"],
      "methodo":            ["Comment faire une introduction de dissertation ?", "Explique la méthode du cas pratique", "C'est quoi un syllogisme juridique ?"],
      "droit-oblig":        ["Quelles sont les conditions de validité du contrat ?", "C'est quoi la nullité relative et absolue ?", "Explique le consentement vicié"],
      "org-jud":            ["Quelle est la différence entre Cour de cassation et Conseil d'État ?", "Comment fonctionne l'appel ?", "C'est quoi la compétence territoriale ?"],
    };

    const suggestions = suggestionsByModule[mod.id] || [
      `Explique-moi les notions clés de ${mod.label}`,
      "Quels sont les points les plus importants à retenir ?",
      "Donne-moi un exemple concret",
    ];

    const zone = document.getElementById("chat-suggestions");
    if (!zone) return;

    zone.innerHTML = `
      <div style="margin-bottom:8px">
        <span style="font-size:12px;color:var(--text-muted)">
          <i class="fa fa-lightbulb"></i> Questions suggérées :
        </span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${suggestions.map(s => `
          <button class="chat-suggestion-btn" style="
            background:var(--bg-element);
            border:1px solid var(--border-light);
            border-radius:8px;
            padding:8px 12px;
            color:var(--text-secondary);
            font-size:13px;
            text-align:left;
            cursor:pointer;
            transition:all 0.15s;
            font-family:inherit;
          " data-q="${s.replace(/"/g, "&quot;")}">
            <i class="fa fa-arrow-right" style="color:var(--gold);margin-right:6px;font-size:11px"></i>${s}
          </button>
        `).join("")}
      </div>
    `;

    // Clic sur une suggestion → la met dans l'input et envoie
    zone.querySelectorAll(".chat-suggestion-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("chat-input").value = btn.dataset.q;
        this._sendMessage();
        zone.style.display = "none"; // cache les suggestions après usage
      });
    });
  },

  // ════════════════════════════════════════════════
  // ENVOYER UN MESSAGE
  // ════════════════════════════════════════════════
  async _sendMessage() {
    const input = document.getElementById("chat-input");
    const text  = input.value.trim();
    if (!text || this.state.isLoading) return;

    input.value = "";

    // Cacher les suggestions après le premier vrai message
    const sugg = document.getElementById("chat-suggestions");
    if (sugg) sugg.style.display = "none";

    // Afficher le message de l'utilisateur
    this._appendMessage("user", text);

    // Ajouter à l'historique
    this.state.history.push({ role: "user", content: text });

    // Afficher le spinner
    this._setLoading(true);
    const thinkingId = this._appendThinking();

    try {
      // Construire les messages pour l'API
      const apiMessages = this._buildApiMessages();

      const apiKey  = Storage.getApiKey();
      const response = await this._callClaude(apiMessages, apiKey);

      // Retirer le spinner
      this._removeThinking(thinkingId);

      // Afficher la réponse
      this._appendMessage("bot", response);
      this.state.history.push({ role: "assistant", content: response });

      // Sauvegarder l'historique
      Storage.saveChatHistory(this.currentModule.id, this.state.history);
      this._updateMsgCount();

    } catch (err) {
      this._removeThinking(thinkingId);
      this._appendMessage("bot", "❌ Erreur : " + err.message);
      App.showToast("❌ " + err.message);
    }

    this._setLoading(false);
    input.focus();
  },

  // ════════════════════════════════════════════════
  // CONSTRUIRE LES MESSAGES POUR L'API
  // Injecte le cours dans le premier message si disponible
  // ════════════════════════════════════════════════
  _buildApiMessages() {
    const { courseText, history } = this.state;
    const messages = [];

    // Si on a le texte du cours, on l'injecte au début
    if (courseText) {
      messages.push({
        role: "user",
        content: `Voici le cours de référence pour le module "${this.currentModule.label}" :\n\n${courseText}\n\nTu as bien pris connaissance de ce cours ?`,
      });
      messages.push({
        role: "assistant",
        content: "Oui, j'ai bien lu ce cours. Je suis prêt à répondre à toutes tes questions dessus.",
      });
    }

    // Ajouter l'historique de la conversation
    // On garde les 20 derniers échanges pour ne pas dépasser les limites
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory);

    return messages;
  },

  // ════════════════════════════════════════════════
  // AFFICHER UN MESSAGE DANS LA BOÎTE
  // ════════════════════════════════════════════════
  _appendMessage(who, text) {
    const box = document.getElementById("chat-messages-box");
    if (!box) return;

    const div = document.createElement("div");
    div.className = `msg msg-${who === "user" ? "user" : "bot"}`;
    div.textContent = text;

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    return div;
  },

  // Afficher le "..." pendant que l'IA réfléchit
  _appendThinking() {
    const box = document.getElementById("chat-messages-box");
    if (!box) return null;

    const id  = "thinking-" + Date.now();
    const div = document.createElement("div");
    div.className = "msg msg-bot";
    div.id        = id;
    div.innerHTML = `
      <span style="display:inline-flex;gap:4px;align-items:center">
        <span style="animation:pulse 1s infinite 0.0s">●</span>
        <span style="animation:pulse 1s infinite 0.2s">●</span>
        <span style="animation:pulse 1s infinite 0.4s">●</span>
      </span>
      <style>
        @keyframes pulse {
          0%,100% { opacity:0.3; }
          50%      { opacity:1;   }
        }
      </style>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
  },

  _removeThinking(id) {
    if (!id) return;
    document.getElementById(id)?.remove();
  },

  // ════════════════════════════════════════════════
  // APPEL API
  // ════════════════════════════════════════════════
  async _callClaude(messages, apiKey) {
    const sys = `Tu es un professeur de droit à l'Université Thomas Sankara (Burkina Faso), spécialiste du module "${this.currentModule.label}".
Contexte du module : ${this.currentModule.context}

Règles de comportement :
- Réponds en français, de manière claire et pédagogique
- Adapte le niveau à un étudiant de Licence 1
- Utilise des exemples concrets du contexte burkinabé quand c'est pertinent
- Si la question n'est pas dans le cours chargé, dis-le honnêtement et réponds quand même avec tes connaissances générales
- Garde des réponses concises (10-15 lignes max) sauf si on te demande plus de détails
- Si l'étudiant fait une erreur de compréhension, corrige-la gentiment`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 800,
        system:     sys,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Erreur API " + response.status);
    }

    const data = await response.json();
    return data.content.map(b => b.text || "").join("\n");
  },

  // ════════════════════════════════════════════════
  // UTILITAIRES
  // ════════════════════════════════════════════════

  // Effacer la conversation
  _clearHistory() {
    const ok = window.confirm("Effacer toute la conversation pour ce module ?");
    if (!ok) return;
    this.state.history = [];
    Storage.clearChatHistory(this.currentModule.id);
    document.getElementById("chat-messages-box").innerHTML = "";
    this._updateMsgCount();
    this._showSuggestions();
    App.showToast("🗑️ Conversation effacée");
  },

  // Changer de cours
  _changeCourse() {
    this.state.courseFile = null;
    this.state.courseText = "";
    this.state.isReady    = false;
    // Réinitialiser complètement le panneau
    this.init(this.currentModule);
  },

  // Mettre à jour le compteur de messages
  _updateMsgCount() {
    const counter = document.getElementById("chat-msg-count");
    if (counter) counter.textContent = this.state.history.length;
  },

  // Extraction PDF
  async _extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page    = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(" ") + "\n";
          }
          resolve(fullText.trim());
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  // État de chargement
  _setLoading(loading) {
    this.state.isLoading = loading;
    const btn   = document.getElementById("chat-send-btn");
    const input = document.getElementById("chat-input");
    if (!btn) return;
    btn.disabled   = loading;
    input.disabled = loading;
  },

};

window.Chat = Chat;
