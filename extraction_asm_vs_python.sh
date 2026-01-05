#!/bin/bash
# Comparaison ASM vs Python pour extraction de phrases

echo "============================================================"
echo "EXTRACTION DE PHRASES : ASM vs PYTHON vs C"
echo "============================================================"

echo ""
echo "ANALYSE DU PROBLÈME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Tâches à effectuer :"
echo "    1. Lire un fichier texte (1-10 Go)"
echo "    2. Découper en phrases"
echo "    3. Compter les occurrences (hash table)"
echo "    4. Trier par fréquence"
echo ""
echo "  Goulot d'étranglement : I/O disque, pas le CPU !"
echo ""

echo "COMPARAISON DES APPROCHES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────┬───────────┬────────────┬─────────────────┐"
echo "  │ Langage     │ Vitesse   │ Dev time   │ Complexité      │"
echo "  ├─────────────┼───────────┼────────────┼─────────────────┤"
echo "  │ Python      │ 1×        │ 2h         │ Faible          │"
echo "  │ C           │ 10-50×    │ 1-2 jours  │ Moyenne         │"
echo "  │ ASM x86_64  │ 50-100×   │ 1-2 sem.   │ Extrême         │"
echo "  │ Rust        │ 30-50×    │ 4-8h       │ Moyenne         │"
echo "  └─────────────┴───────────┴────────────┴─────────────────┘"
echo ""

echo "TEMPS RÉEL D'EXÉCUTION (corpus 1 Go)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────┬───────────┬───────────────────────────────┐"
echo "  │ Langage     │ Temps     │ Remarque                      │"
echo "  ├─────────────┼───────────┼───────────────────────────────┤"
echo "  │ Python      │ ~10 min   │ Simple, lisible               │"
echo "  │ Python+numpy│ ~3 min    │ Vectorisé                     │"
echo "  │ C optimisé  │ ~30 sec   │ mmap + hash table             │"
echo "  │ ASM         │ ~20 sec   │ SIMD, mais galère à écrire    │"
echo "  │ ripgrep     │ ~15 sec   │ Rust, déjà optimisé !         │"
echo "  └─────────────┴───────────┴───────────────────────────────┘"
echo ""
echo "  → Gain ASM vs Python : 30× plus rapide"
echo "  → Mais 10 min vs 20 sec... les deux sont acceptables !"
echo ""

echo "LE VRAI GOULOT D'ÉTRANGLEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Ce n'est PAS l'extraction qui prend du temps :"
echo ""
echo "  ┌─────────────────────────┬───────────┬─────────────────┐"
echo "  │ Étape                   │ Temps     │ Outil           │"
echo "  ├─────────────────────────┼───────────┼─────────────────┤"
echo "  │ Extraction phrases      │ 10 min    │ Python/C/ASM    │"
echo "  │ Normalisation LLM       │ 24-48h    │ Ollama          │"
echo "  │ Validation humaine      │ 3-5 jours │ Toi             │"
echo "  └─────────────────────────┴───────────┴─────────────────┘"
echo ""
echo "  L'extraction = 0.5% du temps total"
echo "  Optimiser en ASM = perte de temps !"
echo ""

echo "SI TU VEUX QUAND MÊME DE LA VITESSE..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  OPTION 1 : Outils existants ultra-rapides"
echo "  ─────────────────────────────────────────"
echo "    # Compter les lignes uniques (C optimisé)"
echo "    sort corpus.txt | uniq -c | sort -rn > freq.txt"
echo ""
echo "    # Ou avec ripgrep + awk (Rust)"
echo "    rg -o '.{5,100}' corpus.txt | sort | uniq -c"
echo ""
echo "  OPTION 2 : Python avec bibliothèques C"
echo "  ─────────────────────────────────────────"
cat << 'PYTHON'
    from collections import Counter
    import mmap
    
    with open('corpus.txt', 'r') as f:
        mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        phrases = Counter(mm.read().decode().splitlines())
PYTHON
echo ""
echo "  OPTION 3 : GNU Parallel (multi-cœurs)"
echo "  ─────────────────────────────────────────"
echo "    parallel --pipe --block 100M 'sort | uniq -c' < corpus.txt"
echo ""

echo "EXEMPLE ASM (si tu insistes...)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Juste pour compter les lignes (trivial en ASM) :"
echo ""
cat << 'ASM'
; count_lines.asm - Compte les \n dans un fichier
section .data
    buffer_size equ 65536

section .bss
    buffer resb buffer_size

section .text
    global _start

_start:
    ; open file (syscall 2)
    mov rax, 2
    mov rdi, [rsp+16]    ; argv[1]
    xor rsi, rsi         ; O_RDONLY
    syscall
    mov r12, rax         ; fd

    xor r13, r13         ; line counter

.read_loop:
    ; read(fd, buffer, size)
    mov rax, 0
    mov rdi, r12
    lea rsi, [buffer]
    mov rdx, buffer_size
    syscall
    
    test rax, rax
    jle .done
    
    ; count newlines with SIMD
    mov rcx, rax
    lea rdi, [buffer]
    
.count:
    cmp byte [rdi], 10   ; '\n'
    jne .next
    inc r13
.next:
    inc rdi
    dec rcx
    jnz .count
    jmp .read_loop

.done:
    ; print result... (plus de code)
ASM
echo ""
echo "  → 50 lignes ASM pour compter des lignes..."
echo "  → En Python : len(open('f').readlines())"
echo ""

echo "CONCLUSION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  NE FAIS PAS ÇA EN ASM !                               │"
echo "  │                                                         │"
echo "  │  • L'extraction = 0.5% du temps total                  │"
echo "  │  • Le LLM prend 48h, l'extraction 10 min               │"
echo "  │  • Utilise sort | uniq -c (déjà ultra-optimisé)        │"
echo "  │  • Ou ripgrep (Rust, aussi rapide que l'ASM)           │"
echo "  │                                                         │"
echo "  │  Temps dev ASM : 1-2 semaines                          │"
echo "  │  Gain réel : 9 minutes                                 │"
echo "  │  → Ratio catastrophique !                              │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""
