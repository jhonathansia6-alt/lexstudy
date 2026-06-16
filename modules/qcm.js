// ═══════════════════════════════════════════════════
// modules/qcm.js
// Générateur de QCM interactifs avec score et corrections
// ═══════════════════════════════════════════════════

const QCM = {

  state: {
    questions:   [],     // liste des questions générées
    answers:     {},     // réponses de l'utilisateur { index: choix }
    submitted:   false,  // true quand l'utilisateur a corrigé
    isLoading:   false,
    courseFile:  null,
  },

  // ════════════════════════════════════════════════
  // INITIALISATION
  // ════════════════════════════════════════════════
  init(module) {
    this.state = {
      questions: [], answers: {}, submitted: false,
      isLoading: false, courseFile: null,
    };
    this.currentModule = module;

    const panel = document.getElementById("panel-qcm");
    panel.innerHTML = `
      <p class="panel-title">📝 QCM Entraînement</p>
      <p class="panel-hint">
        Génère des questions à choix multiple sur n'importe quel thème
        du cours. Réponds, puis corrige pour voir tes erreurs expliquées.
      </p>

      <!-- Upload cours optionnel -->
      <div class="form-group">
        <label>📘 Cours source (optionnel mais recommandé)</label>
        <label class="file-upload-zone">
          <input type="file" id="qcm-course-input" accept=".pdf" />
          <i class="fa fa-file-pdf" style="color:#c9a84c;font-size:18px"></i>
          <span>Appuie pour choisir le cours PDF</span>
        </label>
        <div class="file-name" id="qcm-course-name"></div>
      </div>

      <!-- Thème spécifique -->
      <div class="form-group">
        <label>🎯 Thème spécifique (optionnel)</label>
        <input
          type="text"
          id="qcm-topic"
          placeholder="Ex : nullité du contrat, capacité juridique, régimes politiques..."
        />
      </div>

      <!-- Nombre de questions -->
      <div class="form-group">
        <label>🔢 Nombre de questions</label>
        <select id="qcm-count">
          <option value="5">5 questions (rapide)</option>
          <option value="8" selected>8 questions (standard)</option>
          <option value="10">10 questions (complet)</option>
          <option value="15">15 questions (examen blanc)</option>
        </select>
      </div>

      <!-- Difficulté -->
      <div class="form-group">
        <label>⚡ Niveau de difficulté</label>
        <select id="qcm-level">
          <option value="facile">Facile — révision rapide</option>
          <option value="moyen" selected>Moyen — niveau examen</option>
          <option value="difficile">Difficile — questions pièges</option>
        </select>
      </div>

      <!-- Bouton générer -->
      <button class="btn-primary" id="qcm-generate-btn" style="width:100%;margin-bottom:20px">
        <i class="fa fa-wand-magic-sparkles"></i> Générer les questions
      </button>

      <!-- Zone des questions (vide au départ) -->
      <div id="qcm-questions-zone"></div>
    `;

    this._bindEvents();
  },

  // ════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ════════════════════════════════════════════════
  _bindEvents() {
    document.getElementById("qcm-course-input")
      .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.state.courseFile = file;
        document.getElementById("qcm-course-name").textContent = "✓ " + file.name;
        document.getElementById("qcm-course-name").classList.add("visible");
      });

    document.getElementById("qcm-generate-btn")
      .addEventListener("click", () => this._generate());
  },

  // ════════════════════════════════════════════════
  // EXTRACTION TEXTE PDF (même logique que predictor)
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
  // GÉNÉRER LES QUESTIONS VIA L'API
  // ════════════════════════════════════════════════
  async _generate() {
    const apiKey = Storage.getApiKey();
    if (!apiKey) { App.showToast("❌ Clé API introuvable"); return; }

    this._setLoading(true);
    this.state.questions = [];
    this.state.answers   = {};
    this.state.submitted = false;

    try {
      // Lire le cours si fourni
      let courseText = "";
      if (this.state.courseFile) {
        App.showToast("📖 Lecture du cours...");
        courseText = await this._extractTextFromPDF(this.state.courseFile);
        courseText = courseText.slice(0, 6000);
      }

      const topic = document.getElementById("qcm-topic").value.trim();
      const count = document.getElementById("qcm-count").value;
      const level = document.getElementById("qcm-level").value;

      const prompt = this._buildPrompt(courseText, topic, count, level);

      App.showToast("🤖 Génération des questions...");
      const raw = await this._callClaude(prompt, apiKey);

      // Nettoyer et parser le JSON
      const clean = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(clean);
      this.state.questions = parsed.questions;

      // Afficher les questions
      this._renderQuestions();

    } catch (err) {
      App.showToast("❌ Erreur : " + err.message);
      console.error(err);
    }

    this._setLoading(false);
  },

  // ════════════════════════════════════════════════
  // CONSTRUCTION DU PROMPT QCM
  // ════════════════════════════════════════════════
  _buildPrompt(courseText, topic, count, level) {
    const mod = this.currentModule;

    const levelDesc = {
      facile:    "questions directes sur les définitions et notions de base",
      moyen:     "questions de niveau examen universitaire L1, mélangeant définitions et applications",
      difficile: "questions pièges avec des distinctions subtiles, des cas d'exception et des confusions fréquentes",
    };

    let prompt = `Tu es un professeur de droit à l'Université Thomas Sankara (Burkina Faso), niveau L1.

MODULE : "${mod.label}"
CONTEXTE : ${mod.context}
NOMBRE DE QUESTIONS : ${count}
NIVEAU : ${level} — ${levelDesc[level]}
`;

    if (topic) {
      prompt += `THÈME SPÉCIFIQUE : ${topic}\n`;
    }

    if (courseText) {
      prompt += `
EXTRAIT DU COURS :
${courseText}
`;
    }

    prompt += `
INSTRUCTIONS CRITIQUES :
- Génère exactement ${count} questions QCM
- Chaque question a exactement 4 options (A, B, C, D)
- Une seule bonne réponse par question
- L'explication doit être pédagogique et citer la règle de droit applicable
- Adapte les exemples au contexte burkinabé quand c'est pertinent
- Niveau de difficulté : ${level}

Réponds UNIQUEMENT avec ce JSON valide, sans texte avant ni après, sans backticks :

{
  "questions": [
    {
      "id": 1,
      "question": "texte de la question ?",
      "options": ["option A", "option B", "option C", "option D"],
      "correct": 0,
      "explanation": "Explication détaillée de la bonne réponse avec la règle de droit."
    }
  ]
}

Note : "correct" est l'index de la bonne réponse (0 pour A, 1 pour B, 2 pour C, 3 pour D).
`;

    return prompt;
  },

  // ════════════════════════════════════════════════
  // APPEL API
  // ════════════════════════════════════════════════
  async _callClaude(prompt, apiKey) {
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
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
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
  // AFFICHAGE DES QUESTIONS
  // ════════════════════════════════════════════════
  _renderQuestions() {
    const zone = document.getElementById("qcm-questions-zone");
    const { questions } = this.state;

    if (!questions || questions.length === 0) {
      zone.innerHTML = `<p style="color:var(--text-muted)">Aucune question générée.</p>`;
      return;
    }

    const letters = ["A", "B", "C", "D"];

    let html = `<div id="qcm-score-banner" style="display:none" class="score-banner"></div>`;

    questions.forEach((q, qi) => {
      html += `
        <div class="qcm-card" id="qcm-card-${qi}">
          <p class="qcm-question">${qi + 1}. ${q.question}</p>
          ${q.options.map((opt, oi) => `
            <button
              class="qcm-option"
              id="qcm-opt-${qi}-${oi}"
              data-qi="${qi}"
              data-oi="${oi}"
            >
              <strong>${letters[oi]}.</strong> ${opt}
            </button>
          `).join("")}
          <div class="qcm-explanation" id="qcm-exp-${qi}">
            💡 ${q.explanation}
          </div>
        </div>
      `;
    });

    html += `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">
        <button class="btn-primary" id="qcm-submit-btn" style="flex:1">
          <i class="fa fa-check"></i> Corriger
          (<span id="qcm-answered-count">0</span>/${questions.length})
        </button>
        <button class="btn-secondary" id="qcm-retry-btn" style="display:none">
          <i class="fa fa-rotate-right"></i> Nouveau QCM
        </button>
      </div>
    `;

    zone.innerHTML = html;

    // Branche les clics sur les options
    zone.querySelectorAll(".qcm-option").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const qi = parseInt(e.currentTarget.dataset.qi);
        const oi = parseInt(e.currentTarget.dataset.oi);
        this._selectOption(qi, oi);
      });
    });

    // Bouton corriger
    document.getElementById("qcm-submit-btn")
      .addEventListener("click", () => this._submit());

    // Bouton nouveau QCM
    document.getElementById("qcm-retry-btn")
      .addEventListener("click", () => this._retry());

    // Scroll vers les questions
    zone.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // ════════════════════════════════════════════════
  // SÉLECTIONNER UNE OPTION
  // ════════════════════════════════════════════════
  _selectOption(qi, oi) {
    if (this.state.submitted) return;

    // Désélectionner les autres options de cette question
    this.state.questions[qi].options.forEach((_, idx) => {
      const btn = document.getElementById(`qcm-opt-${qi}-${idx}`);
      btn.classList.remove("selected");
    });

    // Sélectionner celle-ci
    document.getElementById(`qcm-opt-${qi}-${oi}`).classList.add("selected");
    this.state.answers[qi] = oi;

    // Mettre à jour le compteur
    const count = Object.keys(this.state.answers).length;
    const counter = document.getElementById("qcm-answered-count");
    if (counter) counter.textContent = count;
  },

  // ════════════════════════════════════════════════
  // CORRIGER LE QCM
  // ════════════════════════════════════════════════
  _submit() {
    const { questions, answers } = this.state;
    const total    = questions.length;
    const answered = Object.keys(answers).length;

    // Avertir si toutes les questions ne sont pas répondues
    if (answered < total) {
      const confirm = window.confirm(
        `Tu n'as répondu qu'à ${answered}/${total} questions. Corriger quand même ?`
      );
      if (!confirm) return;
    }

    this.state.submitted = true;
    let correct = 0;

    questions.forEach((q, qi) => {
      const userAnswer    = answers[qi];
      const correctAnswer = q.correct;
      const isCorrect     = userAnswer === correctAnswer;

      if (isCorrect) correct++;

      // Colorier les options
      q.options.forEach((_, oi) => {
        const btn = document.getElementById(`qcm-opt-${qi}-${oi}`);
        btn.disabled = true;
        btn.classList.remove("selected");

        if (oi === correctAnswer) {
          btn.classList.add("correct");
        } else if (oi === userAnswer && !isCorrect) {
          btn.classList.add("wrong");
        }
      });

      // Afficher l'explication
      document.getElementById(`qcm-exp-${qi}`).classList.add("visible");
    });

    // Afficher le score
    this._showScore(correct, total);

    // Sauvegarder le score
    Storage.saveScore(this.currentModule.id, { correct, total });

    // Afficher le bouton "Nouveau QCM"
    document.getElementById("qcm-submit-btn").style.display = "none";
    document.getElementById("qcm-retry-btn").style.display  = "block";

    // Masquer le bouton Corriger
    document.getElementById("qcm-submit-btn").style.display = "none";
  },

  // ════════════════════════════════════════════════
  // AFFICHER LE SCORE
  // ════════════════════════════════════════════════
  _showScore(correct, total) {
    const pct    = Math.round((correct / total) * 100);
    const banner = document.getElementById("qcm-score-banner");
    banner.style.display = "block";

    let emoji, msg;
    if (pct >= 80) {
      emoji = "🎉"; msg = "Excellent !";
      banner.className = "score-banner good";
    } else if (pct >= 60) {
      emoji = "👍"; msg = "Bien !";
      banner.className = "score-banner ok";
    } else if (pct >= 40) {
      emoji = "💪"; msg = "Continue les révisions !";
      banner.className = "score-banner ok";
    } else {
      emoji = "📖"; msg = "Relis le cours et réessaie.";
      banner.className = "score-banner bad";
    }

    banner.innerHTML = `
      ${emoji} Score : ${correct}/${total} (${pct}%) — ${msg}
    `;

    banner.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // ════════════════════════════════════════════════
  // RÉESSAYER (vide la zone et relance)
  // ════════════════════════════════════════════════
  _retry() {
    this.state.questions = [];
    this.state.answers   = {};
    this.state.submitted = false;
    document.getElementById("qcm-questions-zone").innerHTML = "";
    document.getElementById("qcm-generate-btn").scrollIntoView({ behavior: "smooth" });
  },

  // ════════════════════════════════════════════════
  // ÉTAT DE CHARGEMENT
  // ════════════════════════════════════════════════
  _setLoading(loading) {
    const btn = document.getElementById("qcm-generate-btn");
    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>
        Génération en cours...
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa fa-wand-magic-sparkles"></i> Générer les questions`;
    }
  },

};

window.QCM = QCM;
    
