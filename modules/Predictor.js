// ═══════════════════════════════════════════════════
// modules/predictor.js
// Prédiction des questions d'examen probables
// Analyse les cours + anciens examens avec l'IA
// ═══════════════════════════════════════════════════

const Predictor = {

  // Données temporaires du panneau
  state: {
    courseFile:  null,   // PDF du cours
    examFiles:   [],     // PDFs des anciens examens
    isLoading:   false,
  },

  // ════════════════════════════════════════════════
  // INITIALISATION DU PANNEAU
  // Injecte le HTML dans #panel-predictor
  // ════════════════════════════════════════════════
  init(module) {
    this.state = { courseFile: null, examFiles: [], isLoading: false };
    this.currentModule = module;

    const panel = document.getElementById("panel-predictor");
    panel.innerHTML = `
      <p class="panel-title">🎯 Prédiction d'examen</p>
      <p class="panel-hint">
        Charge ton cours et tes anciens examens (PDF).
        L'IA analyse les thèmes récurrents et prédit les questions
        les plus probables pour ta prochaine évaluation.
      </p>

      <!-- Upload cours -->
      <div class="form-group">
        <label>📘 Cours (PDF)</label>
        <label class="file-upload-zone" id="pred-course-zone">
          <input type="file" id="pred-course-input" accept=".pdf" />
          <i class="fa fa-file-pdf" style="color:#c9a84c;font-size:18px"></i>
          <span id="pred-course-label">Appuie pour choisir le cours PDF</span>
        </label>
        <div class="file-name" id="pred-course-name"></div>
      </div>

      <!-- Upload anciens examens -->
      <div class="form-group">
        <label>📄 Anciens examens (PDF — tu peux en mettre plusieurs)</label>
        <label class="file-upload-zone" id="pred-exams-zone">
          <input type="file" id="pred-exams-input" accept=".pdf" multiple />
          <i class="fa fa-folder-open" style="color:#c9a84c;font-size:18px"></i>
          <span id="pred-exams-label">Appuie pour choisir les examens PDF</span>
        </label>
        <div class="file-name" id="pred-exams-name"></div>
      </div>

      <!-- Contexte supplémentaire optionnel -->
      <div class="form-group">
        <label>✏️ Infos supplémentaires (optionnel)</label>
        <textarea
          id="pred-extra"
          placeholder="Ex : L'examen dure 2h, format dissertation uniquement. Le prof insiste sur les nullités du contrat..."
          rows="3"
        ></textarea>
      </div>

      <!-- Bouton lancer -->
      <button class="btn-primary" id="pred-btn" style="width:100%">
        <i class="fa fa-bullseye"></i> Analyser et prédire
      </button>

      <!-- Zone de résultat -->
      <div id="pred-result" style="display:none">
        <div class="result-box">
          <pre id="pred-result-text"></pre>
        </div>
        <button class="btn-secondary" id="pred-copy-btn" style="margin-top:10px;width:100%">
          <i class="fa fa-copy"></i> Copier les résultats
        </button>
      </div>
    `;

    // Branche les événements
    this._bindEvents();
  },

  // ════════════════════════════════════════════════
  // ÉVÉNEMENTS
  // ════════════════════════════════════════════════
  _bindEvents() {

    // Sélection du cours
    document.getElementById("pred-course-input")
      .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        this.state.courseFile = file;
        document.getElementById("pred-course-name").textContent = "✓ " + file.name;
        document.getElementById("pred-course-name").classList.add("visible");
      });

    // Sélection des examens
    document.getElementById("pred-exams-input")
      .addEventListener("change", (e) => {
        const files = [...e.target.files];
        if (!files.length) return;
        this.state.examFiles = files;
        const names = files.map(f => f.name).join(", ");
        document.getElementById("pred-exams-name").textContent =
          `✓ ${files.length} fichier(s) : ${names}`;
        document.getElementById("pred-exams-name").classList.add("visible");
      });

    // Bouton analyser
    document.getElementById("pred-btn")
      .addEventListener("click", () => this._runPrediction());

    // Bouton copier
    document.getElementById("pred-copy-btn")
      .addEventListener("click", () => this._copyResult());
  },

  // ════════════════════════════════════════════════
  // LECTURE DU PDF → TEXTE
  // pdf.js extrait le texte brut du PDF
  // ════════════════════════════════════════════════
  async _extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);

          // Charge pdf.js
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = "";

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(" ");
            fullText += `\n--- Page ${i} ---\n${pageText}`;
          }

          resolve(fullText.trim());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  // ════════════════════════════════════════════════
  // LANCER LA PRÉDICTION
  // ════════════════════════════════════════════════
  async _runPrediction() {
    const { courseFile, examFiles } = this.state;

    // Vérification : au moins un fichier
    if (!courseFile && examFiles.length === 0) {
      App.showToast("⚠️ Charge au moins un fichier PDF");
      return;
    }

    const apiKey = Storage.getApiKey();
    if (!apiKey) {
      App.showToast("❌ Clé API introuvable");
      return;
    }

    // Affiche le spinner
    this._setLoading(true);

    try {
      // 1. Extraire le texte de tous les PDFs
      let courseText = "";
      let examsText  = "";

      if (courseFile) {
        App.showToast("📖 Lecture du cours...");
        courseText = await this._extractTextFromPDF(courseFile);
      }

      if (examFiles.length > 0) {
        App.showToast("📄 Lecture des examens...");
        for (const f of examFiles) {
          const t = await this._extractTextFromPDF(f);
          examsText += `\n\n=== EXAMEN : ${f.name} ===\n${t}`;
        }
      }

      // 2. Infos supplémentaires
      const extra = document.getElementById("pred-extra").value.trim();

      // 3. Construire le prompt
      const prompt = this._buildPrompt(courseText, examsText, extra);

      // 4. Appel à l'API Claude
      App.showToast("🤖 L'IA analyse...");
      const result = await this._callClaude(prompt, apiKey);

      // 5. Afficher le résultat
      this._showResult(result);

    } catch (err) {
      App.showToast("❌ Erreur : " + err.message);
      console.error(err);
    }

    this._setLoading(false);
  },

  // ════════════════════════════════════════════════
  // CONSTRUCTION DU PROMPT
  // ════════════════════════════════════════════════
  _buildPrompt(courseText, examsText, extra) {
    const mod = this.currentModule;

    let prompt = `Tu es un expert en préparation aux examens de droit à l'Université Thomas Sankara (Burkina Faso), niveau Licence 1.

MODULE : "${mod.label}"
CONTEXTE DU COURS : ${mod.context}
`;

    if (courseText) {
      // On limite le texte pour ne pas dépasser les limites de l'API
      const truncated = courseText.slice(0, 8000);
      prompt += `
═══ CONTENU DU COURS ═══
${truncated}
${courseText.length > 8000 ? "\n[... cours tronqué pour la longueur ...]" : ""}
`;
    }

    if (examsText) {
      const truncated = examsText.slice(0, 6000);
      prompt += `
═══ ANCIENS EXAMENS ═══
${truncated}
${examsText.length > 6000 ? "\n[... examens tronqués pour la longueur ...]" : ""}
`;
    }

    if (extra) {
      prompt += `
═══ INFORMATIONS SUPPLÉMENTAIRES ═══
${extra}
`;
    }

    prompt += `
═══ TA MISSION ═══
Analyse ces documents et fournis une prédiction structurée en suivant EXACTEMENT ce format :

## 📊 ANALYSE DES THÈMES RÉCURRENTS
[Liste les 4-5 grands thèmes qui reviennent le plus dans les anciens examens et le cours]

## 🎯 QUESTIONS LES PLUS PROBABLES

### Question 1 (Probabilité : TRÈS HAUTE)
**Sujet probable :** [formule le sujet exact tel qu'il pourrait apparaître à l'examen]
**Type :** [Dissertation / Commentaire d'arrêt / Cas pratique / QCM]
**Pourquoi cette question ?** [explique en 2-3 phrases pourquoi cette question est probable]
**Points clés à maîtriser :** [liste 3-4 points essentiels à savoir]

### Question 2 (Probabilité : TRÈS HAUTE)
[même format]

### Question 3 (Probabilité : HAUTE)
[même format]

### Question 4 (Probabilité : HAUTE)
[même format]

### Question 5 (Probabilité : MOYENNE)
[même format]

## 💡 CONSEILS DE RÉVISION
[3-4 conseils pratiques spécifiques à ce module et au contexte burkinabé]

## ⚠️ POINTS À NE PAS NÉGLIGER
[2-3 sujets qui semblent secondaires mais qui peuvent surprendre à l'examen]
`;

    return prompt;
  },

  // ════════════════════════════════════════════════
  // APPEL À L'API CLAUDE
  // ════════════════════════════════════════════════
  async _callClaude(prompt, apiKey) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          { role: "user", content: prompt }
        ],
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
  // AFFICHAGE DU RÉSULTAT
  // ════════════════════════════════════════════════
  _showResult(text) {
    const zone = document.getElementById("pred-result");
    const pre  = document.getElementById("pred-result-text");
    pre.textContent = text;
    zone.style.display = "block";

    // Scroll vers le résultat
    zone.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  // Copie le résultat dans le presse-papier
  async _copyResult() {
    const text = document.getElementById("pred-result-text").textContent;
    try {
      await navigator.clipboard.writeText(text);
      App.showToast("✅ Copié dans le presse-papier !");
    } catch {
      App.showToast("⚠️ Copie manuelle : appuie longuement sur le texte");
    }
  },

  // ════════════════════════════════════════════════
  // ÉTAT DE CHARGEMENT
  // ════════════════════════════════════════════════
  _setLoading(loading) {
    this.state.isLoading = loading;
    const btn = document.getElementById("pred-btn");

    if (loading) {
      btn.disabled = true;
      btn.innerHTML = `
        <span class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></span>
        Analyse en cours...
      `;
    } else {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa fa-bullseye"></i> Analyser et prédire`;
    }
  },

};

window.Predictor = Predictor;
