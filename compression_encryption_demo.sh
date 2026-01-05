#!/bin/bash
# Démonstration: Compression vs Chiffrement
# Compare les tailles avant/après compression et chiffrement

echo "============================================================"
echo "DÉMONSTRATION: COMPRESSION vs CHIFFREMENT"
echo "============================================================"

# Créer un texte aléatoire avec beaucoup de répétitions (bon pour la compression)
cat << 'TEXT' > original.txt
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute 
irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute 
irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute 
irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
deserunt mollit anim id est laborum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute 
irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla 
pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia 
deserunt mollit anim id est laborum.
TEXT

# Répliquer le texte pour avoir plus de données
cat original.txt original.txt original.txt > temp.txt && mv temp.txt original.txt

# Taille originale
TAILLE_ORIGINALE=$(wc -c < original.txt)
echo ""
echo "1. TEXTE ORIGINAL"
echo "   Taille: $TAILLE_ORIGINALE octets"

# Étape 2: Compression du texte
gzip -c original.txt > compressed.txt.gz
TAILLE_COMPRESSEE=$(wc -c < compressed.txt.gz)
RATIO=$((100 - (TAILLE_COMPRESSEE * 100 / TAILLE_ORIGINALE)))
echo ""
echo "2. TEXTE COMPRESSÉ (gzip)"
echo "   Taille: $TAILLE_COMPRESSEE octets"
echo "   Réduction: ${RATIO}%"

# Étape 3: Chiffrement AES-256 du texte compressé
# Générer une clé aléatoire
KEY=$(openssl rand -hex 32)
openssl enc -aes-256-cbc -salt -in compressed.txt.gz -out compressed_encrypted.bin -pass pass:$KEY 2>/dev/null
TAILLE_COMPRESSE_CHIFFRE=$(wc -c < compressed_encrypted.bin)
echo ""
echo "3. TEXTE COMPRESSÉ + CHIFFRÉ (AES-256)"
echo "   Taille: $TAILLE_COMPRESSE_CHIFFRE octets"
echo "   (légère augmentation due au salt et padding)"

# Étape 4: Tentative de compression du fichier chiffré
gzip -c compressed_encrypted.bin > compressed_encrypted.bin.gz
TAILLE_CHIFFRE_COMPRESSE=$(wc -c < compressed_encrypted.bin.gz)
RATIO_CHIFFRE=$((100 - (TAILLE_CHIFFRE_COMPRESSE * 100 / TAILLE_COMPRESSE_CHIFFRE)))
echo ""
echo "4. FICHIER CHIFFRÉ + TENTATIVE DE COMPRESSION"
echo "   Taille: $TAILLE_CHIFFRE_COMPRESSE octets"
echo "   Réduction: ${RATIO_CHIFFRE}%"

echo ""
echo "============================================================"
echo "COMPARAISON: CHIFFRER D'ABORD, COMPRESSER ENSUITE"
echo "============================================================"

# Chiffrer le texte original directement
openssl enc -aes-256-cbc -salt -in original.txt -out encrypted.bin -pass pass:$KEY 2>/dev/null
TAILLE_CHIFFRE=$(wc -c < encrypted.bin)
echo ""
echo "5. TEXTE ORIGINAL CHIFFRÉ (AES-256)"
echo "   Taille: $TAILLE_CHIFFRE octets"

# Tenter de compresser le texte chiffré
gzip -c encrypted.bin > encrypted.bin.gz
TAILLE_CHIFFRE_PUIS_COMPRESSE=$(wc -c < encrypted.bin.gz)
RATIO2=$((100 - (TAILLE_CHIFFRE_PUIS_COMPRESSE * 100 / TAILLE_CHIFFRE)))
echo ""
echo "6. FICHIER CHIFFRÉ + TENTATIVE DE COMPRESSION"
echo "   Taille: $TAILLE_CHIFFRE_PUIS_COMPRESSE octets"
echo "   Réduction: ${RATIO2}%"

echo ""
echo "============================================================"
echo "RÉSUMÉ DES TAILLES"
echo "============================================================"
echo ""
printf "   %-40s %6d octets\n" "Texte original:" $TAILLE_ORIGINALE
printf "   %-40s %6d octets  (↓ %d%%)\n" "Texte compressé:" $TAILLE_COMPRESSEE $RATIO
printf "   %-40s %6d octets\n" "Compressé puis chiffré:" $TAILLE_COMPRESSE_CHIFFRE
printf "   %-40s %6d octets\n" "Chiffré directement:" $TAILLE_CHIFFRE
printf "   %-40s %6d octets  (↓ %d%%)\n" "Chiffré puis compressé:" $TAILLE_CHIFFRE_PUIS_COMPRESSE $RATIO2
echo ""
echo "CONCLUSION:"
echo "   - Le texte se compresse très bien (↓ ${RATIO}%)"
echo "   - Les données chiffrées ne se compressent presque pas (↓ ${RATIO2}%)"
echo "   - Le chiffrement produit des données quasi-aléatoires sans motifs"
echo "   - Il faut TOUJOURS compresser AVANT de chiffrer !"
echo ""

# Nettoyage
rm -f original.txt compressed.txt.gz compressed_encrypted.bin compressed_encrypted.bin.gz encrypted.bin encrypted.bin.gz
