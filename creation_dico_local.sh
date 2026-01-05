#!/bin/bash
# Création de dictionnaire 100% LOCAL et GRATUIT

echo "============================================================"
echo "CRÉATION DE DICTIONNAIRE - 100% LOCAL"
echo "============================================================"

echo ""
echo "OUTILS GRATUITS NÉCESSAIRES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. OLLAMA (LLM local)"
echo "     curl -fsSL https://ollama.ai/install.sh | sh"
echo "     ollama pull llama3.1:8b      # 4.7 Go"
echo "     ollama pull mistral          # 4.1 Go"
echo ""
echo "  2. PYTHON + LIBS"
echo "     pip install pandas spacy tqdm"
echo "     python -m spacy download fr_core_news_md"
echo ""
echo "  3. CORPUS GRATUITS"
echo "     • Leipzig Corpora (SMS français)"
echo "     • OPUS (sous-titres multilingues)"
echo "     • Wikipedia dumps"
echo ""

echo "CONFIGURATION MINIMALE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────────────┬─────────────────────────────────┐"
echo "  │ Composant           │ Minimum requis                  │"
echo "  ├─────────────────────┼─────────────────────────────────┤"
echo "  │ RAM                 │ 8 Go (16 Go recommandé)         │"
echo "  │ GPU                 │ Optionnel (CPU OK, plus lent)   │"
echo "  │ Stockage            │ 10 Go pour modèles + corpus     │"
echo "  │ Temps               │ 1-3 jours (selon machine)       │"
echo "  └─────────────────────┴─────────────────────────────────┘"
echo ""

echo "SCRIPT PYTHON - EXTRACTION DE PHRASES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
cat << 'PYTHON'
#!/usr/bin/env python3
"""
extract_phrases.py - Extraction locale de phrases pour dictionnaire
"""

import json
import subprocess
from collections import Counter
from tqdm import tqdm

def ask_ollama(prompt, model="llama3.1:8b"):
    """Appelle Ollama en local"""
    result = subprocess.run(
        ["ollama", "run", model, prompt],
        capture_output=True, text=True
    )
    return result.stdout.strip()

def extract_phrases_from_corpus(corpus_file):
    """Extrait les phrases d'un corpus texte"""
    phrases = Counter()
    
    with open(corpus_file, 'r') as f:
        for line in tqdm(f, desc="Lecture corpus"):
            line = line.strip()
            if 5 < len(line) < 100:  # Filtrer taille
                phrases[line] += 1
    
    return phrases

def normalize_with_llm(phrases_batch):
    """Normalise un batch de phrases avec LLM local"""
    prompt = f"""Normalise ces phrases SMS en français correct.
Garde le même sens. Une phrase par ligne.

{chr(10).join(phrases_batch)}

Réponses (même ordre):"""
    
    return ask_ollama(prompt)

def generate_domain_phrases(domain, count=100):
    """Génère des phrases types pour un domaine"""
    prompt = f"""Génère {count} phrases courtes et courantes 
pour le domaine {domain} (communication professionnelle).
Une phrase par ligne, format SMS/notification.
Phrases réalistes et variées."""

    return ask_ollama(prompt)

# === MAIN ===
if __name__ == "__main__":
    # 1. Générer phrases médicales
    print("Génération phrases médicales...")
    medical = generate_domain_phrases("médical", 50)
    print(medical)
    
    # 2. Sauvegarder
    with open("dico_medical.txt", "w") as f:
        f.write(medical)
PYTHON
echo ""

echo "PIPELINE COMPLET LOCAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ÉTAPE 1 : Télécharger corpus"
echo "  ─────────────────────────────"
echo "    wget https://wortschatz.uni-leipzig.de/\\"
echo "         fr_web_2019_1M-sentences.txt.gz"
echo "    gunzip fr_web_2019_1M-sentences.txt.gz"
echo ""
echo "  ÉTAPE 2 : Extraire phrases fréquentes"
echo "  ─────────────────────────────────────"
echo "    python extract_phrases.py --input corpus.txt \\"
echo "                              --output phrases_raw.json"
echo ""
echo "  ÉTAPE 3 : Normaliser avec LLM local"
echo "  ────────────────────────────────────"
echo "    python normalize.py --input phrases_raw.json \\"
echo "                        --model llama3.1:8b \\"
echo "                        --output phrases_clean.json"
echo ""
echo "  ÉTAPE 4 : Ranking et sélection"
echo "  ────────────────────────────────"
echo "    python rank_phrases.py --input phrases_clean.json \\"
echo "                           --tier1 254 \\"
echo "                           --tier2 65536 \\"
echo "                           --output dictionnaire.json"
echo ""

echo "COÛTS : 0€"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌────────────────────────┬─────────────┬──────────────────┐"
echo "  │ Poste                  │ Coût        │ Alternative      │"
echo "  ├────────────────────────┼─────────────┼──────────────────┤"
echo "  │ Corpus                 │ 0€          │ Leipzig/OPUS     │"
echo "  │ LLM                    │ 0€          │ Ollama local     │"
echo "  │ Extraction             │ 0€          │ Python/spaCy     │"
echo "  │ Validation             │ 0€          │ Toi-même !       │"
echo "  │ Électricité            │ ~5€         │ 24-72h de calcul │"
echo "  ├────────────────────────┼─────────────┼──────────────────┤"
echo "  │ TOTAL                  │ ~5€         │                  │"
echo "  └────────────────────────┴─────────────┴──────────────────┘"
echo ""

echo "COMPARAISON LOCAL vs CLOUD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────────┬─────────────┬─────────────┬──────────┐"
echo "  │ Aspect          │ Local       │ Cloud (API) │ Gagnant  │"
echo "  ├─────────────────┼─────────────┼─────────────┼──────────┤"
echo "  │ Coût            │ ~5€         │ ~1000€      │ Local    │"
echo "  │ Temps           │ 2-3 jours   │ 4-8 heures  │ Cloud    │"
echo "  │ Qualité LLM     │ 85%         │ 95%         │ Cloud    │"
echo "  │ Confidentialité │ 100%        │ Variable    │ Local    │"
echo "  │ Offline         │ Oui         │ Non         │ Local    │"
echo "  └─────────────────┴─────────────┴─────────────┴──────────┘"
echo ""
echo "  → Local = 200× moins cher, un peu plus lent"
echo ""

echo "MODÈLES LOCAUX RECOMMANDÉS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────────┬─────────┬───────────┬────────────────┐"
echo "  │ Modèle          │ Taille  │ RAM min.  │ Qualité FR     │"
echo "  ├─────────────────┼─────────┼───────────┼────────────────┤"
echo "  │ llama3.1:8b     │ 4.7 Go  │ 8 Go      │ ★★★★☆ Très bon│"
echo "  │ mistral:7b      │ 4.1 Go  │ 8 Go      │ ★★★★★ Excellent│"
echo "  │ mixtral:8x7b    │ 26 Go   │ 32 Go     │ ★★★★★ Excellent│"
echo "  │ phi3:mini       │ 2.2 Go  │ 4 Go      │ ★★★☆☆ Correct │"
echo "  │ gemma2:9b       │ 5.4 Go  │ 10 Go     │ ★★★★☆ Très bon│"
echo "  └─────────────────┴─────────┴───────────┴────────────────┘"
echo ""
echo "  Recommandation : mistral:7b (meilleur rapport qualité/taille)"
echo ""

echo "RÉSUMÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  CRÉATION 100% LOCALE                                  │"
echo "  │                                                         │"
echo "  │  ✓ Coût total : ~5€ (électricité)                      │"
echo "  │  ✓ Temps : 2-3 jours                                   │"
echo "  │  ✓ Confidentialité : totale                            │"
echo "  │  ✓ Outils : Ollama + Python + corpus gratuits          │"
echo "  │                                                         │"
echo "  │  Config minimale : 8 Go RAM, pas de GPU obligatoire    │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
