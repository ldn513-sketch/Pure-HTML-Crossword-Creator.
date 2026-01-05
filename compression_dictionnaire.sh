#!/bin/bash
# Démonstration: Compression par dictionnaire pour SMS

echo "============================================================"
echo "COMPRESSION PAR DICTIONNAIRE - SMS"
echo "============================================================"

echo ""
echo "CALCUL THÉORIQUE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  2 octets = 16 bits → 2^16 = 65 536 phrases max"
echo "  3 octets = 24 bits → 2^24 = 16 777 216 phrases max"
echo ""
echo "  ❌ 1 million de phrases sur 2 octets : IMPOSSIBLE"
echo "  ✓  1 million de phrases sur 3 octets : OK"
echo ""

echo "SIMULATION AVEC UN MINI-DICTIONNAIRE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Dictionnaire de phrases courantes (simulé)
declare -A DICT
DICT["00"]="Salut, ça va?"
DICT["01"]="On se voit demain?"
DICT["02"]="Je suis en retard"
DICT["03"]="J'arrive dans 5 min"
DICT["04"]="Merci beaucoup!"
DICT["05"]="À plus tard"
DICT["06"]="Bonne journée!"
DICT["07"]="Tu fais quoi ce soir?"
DICT["08"]="RDV confirmé"
DICT["09"]="Appelle-moi quand tu peux"
DICT["0A"]="Je t'aime"
DICT["0B"]="Bon anniversaire!"

echo "Dictionnaire exemple (codes hexadécimaux sur 1 octet) :"
echo ""
for code in "00" "01" "02" "03" "04" "05" "06" "07" "08" "09" "0A" "0B"; do
    printf "  0x%s → \"%s\"\n" "$code" "${DICT[$code]}"
done

echo ""
echo "COMPARAISON DES TAILLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

compare() {
    local CODE="$1"
    local PHRASE="${DICT[$CODE]}"
    local TAILLE_TEXTE=${#PHRASE}
    local TAILLE_CODE=1  # 1 octet pour le code
    local RATIO=$((100 - (TAILLE_CODE * 100 / TAILLE_TEXTE)))
    
    printf "  \"%s\"\n" "$PHRASE"
    printf "    Texte: %2d octets → Code: %d octet (0x%s) → ↓ %d%%\n\n" $TAILLE_TEXTE $TAILLE_CODE "$CODE" $RATIO
}

for code in "00" "02" "07" "09" "0B"; do
    compare "$code"
done

echo "ANALYSE AVEC DIFFÉRENTES TAILLES DE DICTIONNAIRE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────────┬───────────────┬─────────────────────┐"
echo "  │ Taille code     │ Nb phrases    │ Utilisation         │"
echo "  ├─────────────────┼───────────────┼─────────────────────┤"
echo "  │ 1 octet (8 b)   │ 256           │ Phrases très freq.  │"
echo "  │ 2 octets (16 b) │ 65 536        │ Vocabulaire riche   │"
echo "  │ 3 octets (24 b) │ 16 millions   │ Toutes situations   │"
echo "  └─────────────────┴───────────────┴─────────────────────┘"
echo ""

echo "EXEMPLE CONCRET : SMS ENCODÉ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Message composé : \"Salut, ça va? On se voit demain? À plus tard\""
echo "  Taille texte    : 47 octets"
echo ""
echo "  Encodage dict.  : 0x00 0x01 0x05"
echo "  Taille encodée  : 3 octets"
echo ""
echo "  Compression     : ↓ 94%"
echo ""

echo "LIMITES DE L'APPROCHE DICTIONNAIRE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ✓ Avantages :"
echo "    • Compression excellente pour phrases connues"
echo "    • Pas de CPU : simple lookup"
echo "    • Taille fixe et prévisible"
echo ""
echo "  ✗ Inconvénients :"
echo "    • Dictionnaire partagé requis (émetteur + récepteur)"
echo "    • Phrases hors dictionnaire = pas de compression"
echo "    • Mise à jour du dictionnaire complexe"
echo "    • Pas de phrases personnalisées/créatives"
echo ""
echo "  → C'est le principe utilisé par les anciens protocoles SMS"
echo "    (ex: protocoles opérateurs avec templates prédéfinis)"
echo ""
