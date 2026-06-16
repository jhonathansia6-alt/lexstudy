// ═══════════════════════════════════════════════════
// data/modules.js
// Liste complète des modules L1 Droit — UTS 2025-2026
// ═══════════════════════════════════════════════════

const MODULES = [

  // ─── SEMESTRE 1 ────────────────────────────────

  {
    id: "intro-droit",
    label: "Introduction générale au Droit",
    sem: 1,
    credits: 6,
    ec: [
      "Introduction à l'étude du droit",
      "TD IED"
    ],
    // Contexte envoyé à l'IA pour personnaliser les réponses
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso). 
Couvre les fondements du droit : définition, sources, classification, 
application de la loi dans le temps et dans l'espace, 
hiérarchie des normes, droit objectif et droits subjectifs.`
  },

  {
    id: "droit-const-general",
    label: "Droit constitutionnel général",
    sem: 1,
    credits: 4,
    ec: [
      "État et Constitution",
      "Régimes politiques et démocratie"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : notion d'État, éléments constitutifs, formes d'État, 
Constitution (définition, élaboration, révision), régimes politiques 
(parlementaire, présidentiel, semi-présidentiel), démocratie.`
  },

  {
    id: "histoire-droit",
    label: "Histoire du Droit et des Institutions",
    sem: 1,
    credits: 4,
    ec: [
      "Introduction historique au Droit",
      "Histoire des institutions de l'Afrique"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre l'évolution historique du droit : droit romain, droit coutumier, 
colonisation et réception du droit français en Afrique, 
histoire des institutions africaines précoloniales et postcoloniales, 
spécificités du droit en Afrique de l'Ouest.`
  },

  {
    id: "droit-personnes",
    label: "Droit des personnes",
    sem: 1,
    credits: 4,
    ec: [
      "Identification et droits de la personne",
      "Le régime des incapacités"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : personnalité juridique, personnes physiques et morales, 
identification (nom, domicile, état civil), droits de la personnalité, 
capacité juridique, régime des incapacités (mineur, majeur protégé), 
droit burkinabé de la famille et de l'état des personnes.`
  },

  {
    id: "micro-eco",
    label: "Économie politique / Microéconomie",
    sem: 1,
    credits: 3,
    ec: [
      "Microéconomie"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre les bases de la microéconomie : offre, demande, équilibre du marché, 
élasticité, théorie du consommateur, théorie de la firme, 
structures de marché (concurrence parfaite, monopole, oligopole).`
  },

  {
    id: "inst-intl",
    label: "Institutions Internationales",
    sem: 1,
    credits: 3,
    ec: [
      "Institutions Internationales"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : ONU et ses organes, organisations régionales africaines 
(UA, CEDEAO), organisations spécialisées, droit international public, 
sujets du droit international, sources du droit international.`
  },

  {
    id: "methodo",
    label: "Méthodologie juridique",
    sem: 1,
    credits: 6,
    ec: [
      "Exercices juridiques",
      "Technique du raisonnement juridique"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre la méthodologie des exercices juridiques : dissertation juridique 
(introduction, plan en 2 parties 2 sous-parties), commentaire d'arrêt, 
cas pratique, fiche d'arrêt, technique du syllogisme juridique, 
raisonnement par analogie, interprétation des textes juridiques.`
  },

  // ─── SEMESTRE 2 ────────────────────────────────

  {
    id: "org-jud",
    label: "Organisation judiciaire du Burkina Faso",
    sem: 2,
    credits: 3,
    ec: [
      "Institutions juridictionnelles"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre l'organisation des juridictions au Burkina Faso : 
Conseil constitutionnel, Cour de cassation, Conseil d'État, 
tribunaux de grande instance, tribunaux de commerce, 
Haute Cour de Justice, compétence des juridictions, 
voies de recours (appel, cassation, opposition).`
  },

  {
    id: "droit-const-bf",
    label: "Droit constitutionnel burkinabé",
    sem: 2,
    credits: 6,
    ec: [
      "Institutions politiques burkinabé",
      "Travaux dirigés (Droit constitutionnel 1 et 2)"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre la Constitution burkinabé : histoire constitutionnelle du Burkina Faso, 
les différentes républiques, institutions de la IVe République, 
Président du Faso, Assemblée nationale, Gouvernement, 
Conseil constitutionnel, droits fondamentaux garantis par la Constitution.`
  },

  {
    id: "macro-eco",
    label: "Économie politique / Macroéconomie",
    sem: 2,
    credits: 3,
    ec: [
      "Macroéconomie"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : comptabilité nationale, PIB, croissance économique, 
inflation, chômage, politiques économiques (budgétaire, monétaire), 
économie ouverte, balance des paiements, zone UEMOA et CEDEAO.`
  },

  {
    id: "droit-oblig",
    label: "Droit des obligations / Les actes juridiques",
    sem: 2,
    credits: 4,
    ec: [
      "Les actes juridiques bilatéraux",
      "Les actes juridiques unilatéraux"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : théorie générale des obligations, classification, 
actes juridiques bilatéraux (contrats : formation, conditions de validité, 
consentement, capacité, objet, cause, nullité, effets), 
actes juridiques unilatéraux (testament, offre, promesse), 
droit OHADA des contrats.`
  },

  {
    id: "sci-pol",
    label: "Science politique",
    sem: 2,
    credits: 3,
    ec: [
      "Introduction à la science politique"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : objet et méthodes de la science politique, pouvoir politique, 
État et légitimité, partis politiques, systèmes électoraux, 
comportements politiques, démocratie et autoritarisme, 
contexte politique africain et burkinabé.`
  },

  {
    id: "socio",
    label: "Sociologie",
    sem: 2,
    credits: 3,
    ec: [
      "Sociologie générale"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : fondateurs de la sociologie (Durkheim, Weber, Marx), 
méthodes sociologiques, socialisation, stratification sociale, 
institutions sociales, déviance et contrôle social, 
sociologie africaine et burkinabé.`
  },

  {
    id: "droit-compare",
    label: "Droit comparé",
    sem: 2,
    credits: 5,
    ec: [
      "Anglais juridique",
      "Les grands systèmes de droit étrangers"
    ],
    context: `Module de L1 Droit à l'Université Thomas Sankara (Burkina Faso).
Couvre : méthode comparative en droit, famille romano-germanique, 
Common Law (système anglais et américain), droit musulman, 
droit coutumier africain, terminologie juridique en anglais, 
lecture de documents juridiques anglophones.`
  }

];

// Rend MODULES accessible globalement
window.MODULES = MODULES;
