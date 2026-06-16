// ═══════════════════════════════════════════════════
// modules/exercices.js
// Dissertation, Commentaire d'arrêt, Cas pratique
// Guidés pas à pas par l'IA
// ═══════════════════════════════════════════════════

const Exercices = {

  state: {
    type:       "dissertation", // type d'exercice actif
    courseFile: null,
    isLoading:  false,
    // Conversation multi-tours pour le mode guidé
    history:    [],
    step:       0,              // étape du guidage
  },

  // Types d'exercices disponibles
  TYPES: [
    {
      id:    "dissertation",
      label: "📜 Dissertation",
      icon:  "📜",
      desc:  "Plan en 2 parties 2 sous-parties, introduction, transitions",
    },
    {
      id:    "arret",
      label: "⚖️ Commentaire d'arrêt",
      icon:  "⚖️",
      desc:  "Fiche d'arrêt + commentaire structuré",
    },
    {
      id:    "cas",
      label: "🔍 Cas pratique",
      icon:  "🔍",
      desc:  "Méthode IRAC : faits → qualification → règle → application → solution",
    },
  ],

  // ════════════════════════════════════════════════
  // INITIALISATION
  // ════════════════════════════════════════════════
  init(module) {
    this.state = {
      type: "dissertation", courseFile: null,
      isLoading: false, history: [], step: 0,
    };
    this.currentModule = module;

    const panel = document.getElementById("panel-exercices");
    panel.innerHTML = `
      <p class="panel-title">⚖️ Exercices Juridiques</p>
      <p class="panel-hint">
        Choisis le type d'exercice. L'IA te guide avec la méthode
        exacte attendue en L1, adaptée au droit burkinabé.
      </p>

      <!-- Onglets type d'exercice -->
      <div class="ex-type-tabs" id="ex-type-tabs">
        ${this.TYPES.map(t => `
          <button
            class="ex-tab ${t.id === "dissertation" ? "active" : ""}"
            data-type="${t.id}"
          >
            ${t.label}
          </button>
        `).join("")}
      </div>

      <!-- Description du type sélectionné -->
      <div id="ex-type-desc" class="panel-hint" style="
        background:var(--bg-element);
        padding:10px 14px;
        border-radius:6px;
        margin-bottom:16px;
        border-left:3px solid var(--gold);
      ">
        📜 Plan en 2 parties 2 sous-parties, introduction, transitions
      </div>

      <!-- Upload cours optionnel -->
      <div class="form-group">
        <label>📘 Cours source (optionnel)</label>
        <label class="file-upload-zone">
          <input type="file" id="ex-course-input" accept=".pdf" />
          <i class="fa fa-file-pdf" style="color:#c9a84c;font-size:18px"></i>
          <span>Appuie pour choisir le cours PDF</span>
        </label>
        <div class="file-name" id="ex-course-name"></div>
      </div>

      <!-- Sujet / Texte à traiter -->
      <div class="form-group">
        <label id="ex-subject-label">✏️ Sujet de dissertation</label>
        <textarea
          id="ex-subject"
          rows="4"
          placeholder="Ex : La nullité du contrat en droit burkinabé"
        ></textarea>
      </div>

      <!-- Mode : Correction complète ou Guidage étape par étape -->
      <div class="form-group">
        <label>🎓 Mode d'assistance</label>
        <select id="ex-mode">
          <option value="complet">
            Correction complète — L'IA produit le plan/corrigé entier
          </option>
          <option value="guide">
            Guidage étape par étape — L'IA te pose des questions et t'aide à construire
          </option>
        </select>
      </div>

      <!-- Bouton lancer -->
      <button class="btn-primary" id="ex-launch-btn" style="width:100%;margin-bottom:20px">
        <i class="fa fa-scale-balanced"></i> Lancer l'exercice
      </button>

      <!-- Zone de travail (résultat ou chat guidé) -->
      <div id="ex-workspace" style="display:none"></div>
    `;

    this._bindEvents();
  },

  // ════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ════════════════════════════════════════════════
  _bindEvents() {
    // Onglets type d'exercice
    document.getElementById("ex-type-tabs")
      .addEventListener("click", (e) => {
        const btn = e.target.closest(".ex-tab");
        if (!btn) return;
        const type = btn.dataset.type;
        this._switchType(type);
      });

    // Upload cours
    document.getElementById("ex-course-input")
      .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.state.courseFile = file;
        document.getElementById("ex-course-name").textContent = "✓ " + file.name;
        document.getElementById("ex-course-name").classList.add("visible");
      });

    // Bouton lancer
    document.getElementById("ex-launch-btn")
      .addEventListener("click", () => this._launch());
  },

  // ════════════════════════════════════════════════
  // CHANGER DE TYPE D'EXERCICE
  // ════════════════════════════════════════════════
  _switchType(type) {
    this.state.type = type;

    // Mettre à jour les onglets
    document.querySelectorAll(".ex-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });

    // Mettre à jour la description
    const typeObj = this.TYPES.find(t => t.id === type);
    document.getElementById("ex-type-desc").textContent = typeObj.desc;

    // Mettre à jour le label du sujet
    const labels = {
      dissertation: "✏️ Sujet de dissertation",
      arret:        "✏️ Texte de l'arrêt ou faits de la décision",
      cas:          "✏️ Énoncé du cas pratique",
    };
    const placeholders = {
      dissertation: "Ex : La nullité du contrat en droit burkinabé",
      arret:        "Colle le texte de l'arrêt ici, ou décris la décision : juridiction, date, faits, solution retenue...",
      cas:          "Ex : Kofi, 16 ans, a signé un contrat de vente avec un commerçant sans l'accord de ses parents...",
    };
    document.getElementById("ex-subject-label").textContent  = labels[type];
    document.getElementById("ex-subject").placeholder        = placeholders[type];

    // Réinitialiser la zone de travail
    document.getElementById("ex-workspace").style.display = "none";
    document.getElementById("ex-workspace").innerHTML     = "";
    this.state.history = [];
    this.state.step    = 0;
  },

  // ════════════════════════════════════════════════
  // LANCER L'EXERCICE
  // ════════════════════════════════════════════════
  async _launch() {
    const subject = document.getElementById("ex-subject").value.trim();
    if (!subject) {
      App.showToast("⚠️ Saisis le sujet ou l'énoncé d'abord");
      return;
    }

    const apiKey = Storage.getApiKey();
    if (!apiKey) { App.showToast("❌ Clé API introuvable"); return; }

    const mode = document.getElementById("ex-mode").value;

    if (mode === "complet") {
      await this._runComplet(subject, apiKey);
    } else {
      await this._runGuide(subject, apiKey);
    }
  },

  // ════════════════════════════════════════════════
  // MODE CORRECTION COMPLÈTE
  // ════════════════════════════════════════════════
  async _runComplet(subject, apiKey) {
    this._setLoading(true);

    try {
      let courseText = "";
      if (this.state.courseFile) {
        App.showToast("📖 Lecture du cours...");
        courseText = await this._extractTextFromPDF(this.state.courseFile);
        courseText = courseText.slice(0, 6000);
      }

      const prompt = this._buildCompletPrompt(subject, courseText);
      App.showToast("🤖 L'IA rédige le corrigé...");
      const result = await this._callClaude([
        { role: "user", content: prompt }
      ], apiKey, 2000);

      // Afficher le résultat
      const ws = document.getElementById("ex-workspace");
      ws.style.display = "block";
      ws.innerHTML = `
        <div class="result-box">
          <pre id="ex-result-text" style="white-space:pre-wrap;font-family:inherit;font-size:14px;color:var(--text-secondary);line-height:1.8">${result}</pre>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn-secondary" id="ex-copy-btn" style="flex:1">
            <i class="fa fa-copy"></i> Copier
          </button>
          <button class="btn-secondary" id="ex-reset-btn" style="flex:1">
            <i class="fa fa-rotate-right"></i> Nouvel exercice
          </button>
        </div>
      `;

      document.getElementById("ex-copy-btn").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(result);
          App.showToast("✅ Copié !");
        } catch { App.showToast("Appuie longuement pour copier"); }
      });

      document.getElementById("ex-reset-btn").addEventListener("click", () => {
        ws.style.display = "none";
        ws.innerHTML = "";
        document.getElementById("ex-subject").value = "";
      });

      ws.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (err) {
      App.showToast("❌ " + err.message);
      console.error(err);
    }

    this._setLoading(false);
  },

  // ════════════════════════════════════════════════
  // PROMPTS MODE COMPLET
  // ════════════════════════════════════════════════
  _buildCompletPrompt(subject, courseText) {
    const mod = this.currentModule;
    const type = this.state.type;

    const instructions = {
      dissertation: `
Tu dois produire un corrigé complet de dissertation juridique avec :

## 🎯 ANALYSE DU SUJET
- Définition des termes clés
- Délimitation du sujet
- Intérêt du sujet

## ❓ PROBLÉMATIQUE
[Une question centrale précise et bien formulée]

## 📋 PLAN DÉTAILLÉ

**I. [Titre de la première partie]**
  **A. [Titre de la première sous-partie]**
  → Arguments et développements
  → Exemples et références juridiques burkinabés si pertinent

  **B. [Titre de la deuxième sous-partie]**
  → Arguments et développements
  → Exemples et références juridiques

*Transition : [phrase de transition vers la II]*

**II. [Titre de la deuxième partie]**
  **A. [Titre de la première sous-partie]**
  → Arguments et développements

  **B. [Titre de la deuxième sous-partie]**
  → Arguments et développements

## ✍️ INTRODUCTION RÉDIGÉE
[Rédige une introduction complète : accroche → définitions → délimitation → intérêt → problématique → annonce du plan]

## 💡 CONCLUSION
[Synthèse et ouverture]
`,
      arret: `
Tu dois produire une analyse structurée avec :

## 📋 FICHE D'ARRÊT
- **Juridiction et date :**
- **Faits :** (résumé objectif)
- **Procédure :** (historique des juridictions saisies)
- **Prétentions des parties :**
- **Question de droit :** (formulée comme une question)
- **Solution retenue :** (réponse de la juridiction)
- **Fondement juridique :** (textes et principes appliqués)

## 💬 COMMENTAIRE

**I. [Premier axe d'analyse]**
  **A.** [Première idée]
  **B.** [Deuxième idée]

**II. [Deuxième axe d'analyse]**
  **A.** [Première idée]
  **B.** [Deuxième idée]

## 🔍 PORTÉE DE LA DÉCISION
[Importance, originalité, critiques éventuelles]
`,
      cas: `
Tu dois résoudre le cas pratique avec la méthode IRAC :

## 📌 IDENTIFICATION DES FAITS JURIDIQUEMENT PERTINENTS
[Sélectionne uniquement les faits utiles à la qualification]

## 🏷️ QUALIFICATION JURIDIQUE
[Qualifie chaque fait : qui sont les parties ? Quelle relation juridique ?]

## 📖 RÈGLES DE DROIT APPLICABLES
[Cite les règles précises : articles de loi, principes, jurisprudence]
[Adapte au droit burkinabé et au droit OHADA si pertinent]

## ⚙️ APPLICATION AU CAS
[Applique chaque règle aux faits de manière logique et détaillée]

## ✅ SOLUTION
[Conclus clairement sur les droits et obligations de chaque partie]

## 💡 CONSEILS PRATIQUES
[Ce que chaque partie devrait faire concrètement]
`,
    };

    return `Tu es un maître de conférences en droit à l'Université Thomas Sankara (Burkina Faso).
MODULE : "${mod.label}"
CONTEXTE : ${mod.context}
TYPE D'EXERCICE : ${type}
NIVEAU : Licence 1

${courseText ? `COURS DE RÉFÉRENCE :\n${courseText}\n` : ""}

SUJET / ÉNONCÉ :
"${subject}"

${instructions[type]}

Réponds en français. Sois rigoureux, pédagogique et adapte au contexte juridique burkinabé.`;
  },

  // ════════════════════════════════════════════════
  // MODE GUIDÉ (conversation étape par étape)
  // ════════════════════════════════════════════════
  async _runGuide(subject, apiKey) {
    this.state.history = [];
    this.state.step    = 0;

    // Afficher l'interface de chat guidé
    const ws = document.getElementById("ex-workspace");
    ws.style.display = "block";
    ws.innerHTML = `
      <div style="
        background:var(--gold-dim);
        border:1px solid var(--gold);
        border-radius:8px;
        padding:12px 14px;
        margin-bottom:14px;
        font-size:13px;
        color:var(--gold);
      ">
        <strong>Mode guidé activé</strong> — L'IA va te poser des questions
        et construire l'exercice avec toi étape par étape.
      </div>

      <div id="ex-chat-box" style="
        background:var(--bg-deep);
        border:1px solid var(--border-light);
        border-radius:10px;
        padding:14px;
        height:380px;
        overflow-y:auto;
        display:flex;
        flex-direction:column;
        gap:10px;
        margin-bottom:10px;
      "></div>

      <div style="display:flex;gap:8px">
        <input
          type="text"
          id="ex-guide-input"
          placeholder="Ta réponse..."
          style="flex:1"
        />
        <button class="btn-primary" id="ex-guide-send" style="padding:10px 16px">
          <i class="fa fa-paper-plane"></i>
        </button>
      </div>
      <button class="btn-secondary" id="ex-guide-reset" style="width:100%;margin-top:8px">
        <i class="fa fa-rotate-right"></i> Recommencer
      </button>
    `;

    // Événements du mode guidé
    document.getElementById("ex-guide-send")
      .addEventListener("click", () => this._guideSend(apiKey));

    document.getElementById("ex-guide-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._guideSend(apiKey);
      });

    document.getElementById("ex-guide-reset")
      .addEventListener("click", () => {
        ws.style.display = "none";
        ws.innerHTML = "";
        this.state.history = [];
        this.state.step    = 0;
      });

    // Premier message de l'IA
    const firstPrompt = this._buildGuideFirstPrompt(subject);
    this._setLoading(true);
    try {
      const response = await this._callClaude(
        [{ role: "user", content: firstPrompt }],
        apiKey, 600
      );
      this.state.history.push(
        { role: "user",      content: firstPrompt },
        { role: "assistant", content: response     },
      );
      this._appendGuideMsg("bot", response);
    } catch (err) {
      App.showToast("❌ " + err.message);
    }
    this._setLoading(false);

    ws.scrollIntoView({ behavior: "smooth" });
  },

  // Envoyer une réponse dans le mode guidé
  async _guideSend(apiKey) {
    const input = document.getElementById("ex-guide-input");
    const text  = input.value.trim();
    if (!text) return;

    input.value = "";
    this._appendGuideMsg("user", text);

    // Ajouter à l'historique
    this.state.history.push({ role: "user", content: text });

    // Construire les messages complets avec le système
    const messages = [...this.state.history];

    this._setGuideLoading(true);
    try {
      const response = await this._callClaude(messages, apiKey, 600);
      this.state.history.push({ role: "assistant", content: response });
      this._appendGuideMsg("bot", response);
    } catch (err) {
      App.showToast("❌ " + err.message);
    }
    this._setGuideLoading(false);
  },

  // Ajouter un message dans la boîte de chat guidé
  _appendGuideMsg(who, text) {
    const box = document.getElementById("ex-chat-box");
    if (!box) return;
    const div = document.createElement("div");
    div.className = `msg msg-${who === "user" ? "user" : "bot"}`;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  // Prompt initial du mode guidé
  _buildGuideFirstPrompt(subject) {
    const mod  = this.currentModule;
    const type = this.state.type;

    const typeNames = {
      dissertation: "dissertation juridique",
      arret:        "commentaire d'arrêt",
      cas:          "cas pratique",
    };

    return `Tu es un professeur de droit à l'Université Thomas Sankara (Burkina Faso), niveau L1.
Tu vas guider un étudiant pour réaliser une ${typeNames[type]} en mode Socratique :
tu poses des questions, tu valides ses réponses, tu corriges ses erreurs, et tu construis l'exercice avec lui étape par étape.

MODULE : "${mod.label}"
CONTEXTE : ${mod.context}
SUJET : "${subject}"

Commence par accueillir l'étudiant, rappeler le sujet, puis poser la PREMIÈRE question pour démarrer :
Pour une dissertation → demande d'analyser les termes du sujet
Pour un commentaire d'arrêt → demande d'identifier les faits
Pour un cas pratique → demande de lister les faits juridiquement pertinents

Garde des réponses courtes (5-8 lignes max) pour maintenir le dialogue.`;
  },

  // ════════════════════════════════════════════════
  // EXTRACTION PDF (même que predictor)
  // ════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════
  // APPEL API
  // ════════════════════════════════════════════════
  async _callClaude(messages, apiKey, maxTokens = 1500) {
    const sys = `Tu es un maître de conférences en droit à l'Université Thomas Sankara (Burkina Faso). Tu guides les étudiants de Licence 1 avec rigueur et pédagogie. Adapte tes réponses au droit burkinabé et au système OHADA. Réponds toujours en français.`;

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
        max_tokens: maxTokens,
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
  // ÉTATS DE CHARGEMENT
  // ════════════════════════════════════════════════
  _setLoading(loading) {
    const btn = document.getElementById("ex-launch-btn");
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>
        En cours...
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa fa-scale-balanced"></i> Lancer l'exercice`;
    }
  },

  _setGuideLoading(loading) {
    const btn   = document.getElementById("ex-guide-send");
    const input = document.getElementById("ex-guide-input");
    if (!btn) return;
    btn.disabled   = loading;
    input.disabled = loading;
    btn.innerHTML  = loading
      ? `<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle"></span>`
      : `<i class="fa fa-paper-plane"></i>`;
  },

};

window.Exercices = Exercices;
