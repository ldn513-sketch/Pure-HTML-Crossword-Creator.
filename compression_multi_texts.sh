#!/bin/bash
# Démonstration: Compression vs Chiffrement avec différentes tailles de texte

echo "============================================================"
echo "COMPRESSION vs CHIFFREMENT - TEXTES DE TAILLES VARIÉES"
echo "============================================================"

# Clé AES pour tous les tests
KEY=$(openssl rand -hex 32)

test_text() {
    local NAME="$1"
    local TEXT="$2"
    
    echo "$TEXT" > /tmp/test_original.txt
    TAILLE_ORIG=$(wc -c < /tmp/test_original.txt)
    
    # Compression
    gzip -c /tmp/test_original.txt > /tmp/test_compressed.gz
    TAILLE_COMP=$(wc -c < /tmp/test_compressed.gz)
    
    # Chiffrement du texte original
    openssl enc -aes-256-cbc -salt -in /tmp/test_original.txt -out /tmp/test_encrypted.bin -pass pass:$KEY 2>/dev/null
    TAILLE_CHIFFRE=$(wc -c < /tmp/test_encrypted.bin)
    
    # Compression puis chiffrement
    openssl enc -aes-256-cbc -salt -in /tmp/test_compressed.gz -out /tmp/test_comp_enc.bin -pass pass:$KEY 2>/dev/null
    TAILLE_COMP_CHIFFRE=$(wc -c < /tmp/test_comp_enc.bin)
    
    # Calcul des ratios
    if [ $TAILLE_ORIG -gt 0 ]; then
        RATIO_COMP=$((100 - (TAILLE_COMP * 100 / TAILLE_ORIG)))
    else
        RATIO_COMP=0
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 $NAME"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Contenu: \"$TEXT\""
    echo ""
    printf "   %-30s %6d octets\n" "Original:" $TAILLE_ORIG
    printf "   %-30s %6d octets  (↓ %d%%)\n" "Compressé (gzip):" $TAILLE_COMP $RATIO_COMP
    printf "   %-30s %6d octets\n" "Chiffré (AES-256):" $TAILLE_CHIFFRE
    printf "   %-30s %6d octets\n" "Compressé+Chiffré:" $TAILLE_COMP_CHIFFRE
    
    # Nettoyage
    rm -f /tmp/test_original.txt /tmp/test_compressed.gz /tmp/test_encrypted.bin /tmp/test_comp_enc.bin
}

# SMS 1: Très court (langage SMS)
test_text "SMS 1 - Très court" "Slt cv? On se voit 2m1?"

# SMS 2: Court avec emojis/abréviations
test_text "SMS 2 - Court" "Cc! T ou? Jsuis o resto, tu viens? Biz"

# SMS 3: Message standard
test_text "SMS 3 - Standard" "Salut! Tu fais quoi ce soir? On pourrait aller au ciné si t'es dispo. Dis moi!"

# SMS 4: Message complet
test_text "SMS 4 - Complet" "Hey! Jte rappelle ke la fete c samedi a 20h chez Max. Ramene des boissons stp. A+ et oublie pas!"

# SMS 5: Message limite 160 caractères
test_text "SMS 5 - Limite 160 car" "Bjr! RDV confirmé pr dm 14h au bureau. Apporte les docs pr le projet XYZ. Si pb appelle moi sur mon 06. Merci bcp et a dm! Passe une bonne fin de journée ;)"

# Texte moyen
TEXTE_MOYEN="Bonjour à tous! Je vous écris pour vous informer que la réunion de demain est reportée à jeudi. Merci de confirmer votre présence par retour de mail. Cordialement, Pierre."
test_text "Email court" "$TEXTE_MOYEN"

# Texte long avec répétitions
TEXTE_LONG="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit."
test_text "Texte avec répétitions" "$TEXTE_LONG"

# Résumé
echo ""
echo "============================================================"
echo "OBSERVATIONS"
echo "============================================================"
echo ""
echo "• Les petits textes (SMS) ont un ratio de compression NÉGATIF"
echo "  → gzip ajoute des headers qui dépassent le gain"
echo ""
echo "• Le chiffrement AES ajoute ~16-32 octets (IV + padding + salt)"
echo "  → Impact majeur sur les petits messages"
echo ""  
echo "• La compression devient efficace à partir de ~200+ octets"
echo "  → Surtout si le texte contient des répétitions"
echo ""
echo "• Pour les SMS: le chiffrement seul est plus adapté"
echo "  → Compresser avant n'apporte rien sur si peu de données"
echo ""
