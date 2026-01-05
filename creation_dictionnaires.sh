#!/bin/bash
# Méthodologie de création des dictionnaires

echo "============================================================"
echo "CRÉATION DES DICTIONNAIRES - MÉTHODOLOGIE"
echo "============================================================"

echo ""
echo "PHASE 1 : COLLECTE DE DONNÉES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  A. SOURCES POUR LE DICTIONNAIRE GÉNÉRAL"
echo "  ─────────────────────────────────────────"
echo "    • Corpus SMS anonymisés (opérateurs télécom)"
echo "    • Messages WhatsApp/Telegram (datasets publics)"
echo "    • Sous-titres de films/séries (langage courant)"
echo "    • Forums et réseaux sociaux"
echo "    • Enquêtes linguistiques existantes"
echo ""
echo "  B. SOURCES POUR LES DICTIONNAIRES SPÉCIALISÉS"
echo "  ─────────────────────────────────────────────"
echo "    MÉDICAL :"
echo "      • Dossiers patients anonymisés (avec accord)"
echo "      • Communications médecin-patient types"
echo "      • Terminologie SNOMED, CIM-10"
echo "      • Protocoles de communication hospitalière"
echo ""
echo "    JURIDIQUE :"
echo "      • Correspondances avocat-client types"
echo "      • Formulaires juridiques standardisés"
echo "      • Lexique juridique officiel"
echo ""
echo "    FINANCE :"
echo "      • Notifications bancaires existantes"
echo "      • Messages de confirmation de transactions"
echo "      • Communications réglementaires"
echo ""

echo "PHASE 2 : EXTRACTION ET CLASSEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  PIPELINE D'EXTRACTION (avec IA) :"
echo ""
echo "  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐"
echo "  │  Corpus     │───▶│    LLM      │───▶│  Phrases    │"
echo "  │  brut       │    │ extraction  │    │ candidates  │"
echo "  └─────────────┘    └─────────────┘    └─────────────┘"
echo "                            │"
echo "                     Prompt :"
echo "              \"Extrais les phrases"
echo "               complètes et autonomes,"
echo "               normalise l'orthographe\""
echo ""
echo "  EXEMPLE DE PROMPT POUR L'IA :"
echo "  ─────────────────────────────"
cat << 'PROMPT'
  """
  Analyse ce corpus de SMS médicaux et extrais :
  1. Les phrases complètes les plus fréquentes
  2. Normalise l'orthographe et la grammaire
  3. Groupe les variantes sémantiquement identiques
  4. Classe par fréquence décroissante
  
  Format de sortie :
  [fréquence] | [phrase normalisée] | [variantes originales]
  """
PROMPT
echo ""

echo "PHASE 3 : RANKING PAR FRÉQUENCE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ALGORITHME DE SCORING :"
echo ""
echo "    Score = Fréquence × Longueur × Facteur_Domaine"
echo ""
echo "    • Fréquence : combien de fois la phrase apparaît"
echo "    • Longueur : plus c'est long, plus on compresse"
echo "    • Facteur_Domaine : boost pour phrases critiques"
echo ""
echo "  RÉPARTITION DANS LES TIERS :"
echo ""
echo "    ┌─────────┬──────────────────────────────────────────┐"
echo "    │ Tier 1  │ Top 254 phrases (score le plus élevé)   │"
echo "    │ (1 oct) │ Ex: \"Bonjour\", \"Merci\", \"OK\", \"RDV\"    │"
echo "    ├─────────┼──────────────────────────────────────────┤"
echo "    │ Tier 2  │ Phrases 255 à 65 789                    │"
echo "    │ (3 oct) │ Ex: \"Je serai en retard de 10 min\"     │"
echo "    └─────────┴──────────────────────────────────────────┘"
echo ""

echo "PHASE 4 : TRADUCTION MULTILINGUE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  WORKFLOW DE TRADUCTION :"
echo ""
echo "  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐"
echo "  │  Phrase FR  │───▶│  IA Trad    │───▶│  Candidats  │"
echo "  │  (source)   │    │  (GPT-4)    │    │  EN/ES/DE.. │"
echo "  └─────────────┘    └─────────────┘    └─────────────┘"
echo "                                               │"
echo "                                               ▼"
echo "                                        ┌─────────────┐"
echo "                                        │  Validation │"
echo "                                        │  humaine    │"
echo "                                        └─────────────┘"
echo ""
echo "  IMPORTANT : Validation par des traducteurs natifs !"
echo "  L'IA propose, l'humain valide."
echo ""
echo "  Pour les domaines spécialisés :"
echo "    • Médical : traducteurs + médecins"
echo "    • Juridique : traducteurs + juristes"
echo "    • Finance : traducteurs + experts conformité"
echo ""

echo "PHASE 5 : VALIDATION ET TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  A. TESTS DE COUVERTURE"
echo "  ─────────────────────────"
echo "    • Prendre 10 000 messages réels"
echo "    • Mesurer le % encodable (non-fallback)"
echo "    • Objectif : >90% de couverture"
echo ""
echo "  B. TESTS DE QUALITÉ TRADUCTION"
echo "  ─────────────────────────────────"
echo "    • Back-translation (FR→EN→FR)"
echo "    • Validation par locuteurs natifs"
echo "    • Tests A/B avec traduction IA"
echo ""
echo "  C. TESTS D'AMBIGUÏTÉ"
echo "  ─────────────────────────"
echo "    • Vérifier qu'aucune phrase n'est ambiguë"
echo "    • Contexte médical : risque vital si malentendu !"
echo ""

echo "OUTILS ET TECHNOLOGIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  EXTRACTION :"
echo "    • Python + spaCy (NLP)"
echo "    • GPT-4 / Claude (extraction intelligente)"
echo "    • pandas (manipulation données)"
echo ""
echo "  STOCKAGE :"
echo "    • Format : JSON ou MessagePack (compact)"
echo "    • Index : hash table pour lookup O(1)"
echo ""
echo "  TRADUCTION :"
echo "    • DeepL API (première passe)"
echo "    • GPT-4 (phrases complexes)"
echo "    • Plateforme de crowdsourcing (validation)"
echo ""
echo "  VALIDATION :"
echo "    • Interface web pour traducteurs"
echo "    • Système de vote/consensus"
echo "    • Tests automatisés de régression"
echo ""

echo "EXEMPLE : CRÉATION D'UN MINI-DICTIONNAIRE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Prompt pour GPT-4 :"
echo "  ───────────────────"
cat << 'PROMPT2'
  """
  Génère les 50 phrases les plus courantes dans les SMS
  médicaux (médecin → patient). Pour chaque phrase :
  
  1. Version française normalisée
  2. Traduction anglaise
  3. Traduction espagnole
  4. Traduction allemande
  
  Format JSON :
  {
    "id": 1,
    "fr": "Vos résultats sont normaux",
    "en": "Your results are normal",
    "es": "Sus resultados son normales",
    "de": "Ihre Ergebnisse sind normal"
  }
  """
PROMPT2
echo ""

echo "  Résultat (extrait) :"
echo "  ────────────────────"
echo '  [
    {"id": 0, "fr": "Bonjour", "en": "Hello", "es": "Hola", "de": "Guten Tag"},
    {"id": 1, "fr": "Vos résultats sont normaux", "en": "Your results are normal", ...},
    {"id": 2, "fr": "Prenez rendez-vous", "en": "Make an appointment", ...},
    {"id": 3, "fr": "Continuez le traitement", "en": "Continue the treatment", ...},
    ...
  ]'
echo ""

echo "ESTIMATION DES COÛTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌────────────────────────┬─────────────┬────────────────┐"
echo "  │ Poste                  │ Coût        │ Remarque       │"
echo "  ├────────────────────────┼─────────────┼────────────────┤"
echo "  │ Extraction IA (GPT-4)  │ ~500€       │ 65K phrases    │"
echo "  │ Traduction IA          │ ~2000€      │ 10 langues     │"
echo "  │ Validation humaine     │ ~5000€      │ 10 traducteurs │"
echo "  │ Experts domaine        │ ~3000€      │ Méd/Jur/Fin    │"
echo "  ├────────────────────────┼─────────────┼────────────────┤"
echo "  │ TOTAL (1 domaine)      │ ~10 500€    │ One-time       │"
echo "  │ TOTAL (5 domaines)     │ ~40 000€    │ One-time       │"
echo "  └────────────────────────┴─────────────┴────────────────┘"
echo ""
echo "  → Investissement unique, économies récurrentes massives !"
echo ""

echo "MAINTENANCE ET ÉVOLUTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  • Analyse des fallbacks : quelles phrases manquent ?"
echo "  • Ajout progressif de nouvelles phrases"
echo "  • Versioning des dictionnaires (v1.0, v1.1...)"
echo "  • Mise à jour OTA sur les appareils"
echo ""
echo "  Les 254 phrases Tier 1 = stables (rarement modifiées)"
echo "  Le Tier 2 = évolutif (nouvelles expressions)"
echo ""
