/**
 * wordfind - Outil de suggestion de mots pour mots croisés
 *
 * Recherche des mots dans un dictionnaire en fonction de contraintes
 * sur les lettres à certaines positions.
 *
 * Usage: wordfind PATTERN [OPTIONS]
 */

#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <algorithm>
#include <random>
#include <cstring>
#include <getopt.h>
#include <unordered_map>
#include <unordered_set>

// Dictionnaires par défaut selon la langue
const std::unordered_map<std::string, std::vector<std::string>> DEFAULT_DICTS = {
    {"fr", {"/usr/share/dict/french", "/usr/share/dict/francais", "/usr/share/hunspell/fr_FR.dic"}},
    {"en", {"/usr/share/dict/american-english", "/usr/share/dict/british-english", "/usr/share/dict/words"}},
    {"de", {"/usr/share/dict/german", "/usr/share/dict/ngerman", "/usr/share/hunspell/de_DE.dic"}}
};

/**
 * Normalise un caractère : supprime les accents et convertit en majuscule
 */
char normalize_char(unsigned char c) {
    // Table de conversion pour les caractères accentués courants (Latin-1)
    static const char accent_map[256] = {
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 0-15
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 16-31
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 32-47
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 48-63
        0,'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O', // 64-79
        'P','Q','R','S','T','U','V','W','X','Y','Z',0,0,0,0,0, // 80-95
        0,'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O', // 96-111
        'P','Q','R','S','T','U','V','W','X','Y','Z',0,0,0,0,0, // 112-127
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 128-143
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 144-159
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 160-175
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 176-191
        'A','A','A','A','A','A','A','C','E','E','E','E','I','I','I','I', // 192-207 (À-Ï)
        'D','N','O','O','O','O','O',0,'O','U','U','U','U','Y','T','S', // 208-223 (Ð-ß)
        'A','A','A','A','A','A','A','C','E','E','E','E','I','I','I','I', // 224-239 (à-ï)
        'D','N','O','O','O','O','O',0,'O','U','U','U','U','Y','T','Y'  // 240-255 (ð-ÿ)
    };

    if (c < 128) {
        if (c >= 'a' && c <= 'z') return c - 'a' + 'A';
        if (c >= 'A' && c <= 'Z') return c;
        return 0;
    }
    return accent_map[c];
}

/**
 * Normalise une chaîne UTF-8 : supprime accents, convertit en majuscules
 * Retourne une chaîne vide si le mot contient des caractères non-alphabétiques
 */
std::string normalize_word(const std::string& word) {
    std::string result;
    result.reserve(word.size());

    size_t i = 0;
    while (i < word.size()) {
        unsigned char c = word[i];

        // Gestion UTF-8
        if ((c & 0x80) == 0) {
            // ASCII
            char norm = normalize_char(c);
            if (norm == 0) return ""; // Caractère non alphabétique
            result += norm;
            i++;
        } else if ((c & 0xE0) == 0xC0 && i + 1 < word.size()) {
            // UTF-8 sur 2 octets (accents courants)
            unsigned char c2 = word[i + 1];
            // Conversion UTF-8 vers Latin-1 pour les caractères courants
            unsigned int code = ((c & 0x1F) << 6) | (c2 & 0x3F);

            char norm = 0;
            if (code >= 0xC0 && code <= 0xFF) {
                norm = normalize_char(code);
            } else if (code == 0x152 || code == 0x153) {
                // Œ œ -> OE (on prend juste O pour simplifier)
                result += 'O';
                result += 'E';
                i += 2;
                continue;
            } else if (code == 0x178) {
                norm = 'Y'; // Ÿ
            }

            if (norm == 0) return "";
            result += norm;
            i += 2;
        } else if ((c & 0xF0) == 0xE0 && i + 2 < word.size()) {
            // UTF-8 sur 3 octets
            i += 3;
            return ""; // Caractères exotiques ignorés
        } else if ((c & 0xF8) == 0xF0 && i + 3 < word.size()) {
            // UTF-8 sur 4 octets
            i += 4;
            return ""; // Caractères exotiques ignorés
        } else {
            i++;
            return "";
        }
    }

    return result;
}

/**
 * Vérifie si un caractère est un joker (lettre inconnue)
 */
bool is_wildcard(char c) {
    return c == '.' || c == '?' || c == '_';
}

/**
 * Parse un pattern et extrait les contraintes
 * Supporte les classes de caractères [ABC]
 */
struct PatternConstraint {
    size_t position;
    std::unordered_set<char> allowed_chars;
    bool is_wildcard;
};

std::vector<PatternConstraint> parse_pattern(const std::string& pattern) {
    std::vector<PatternConstraint> constraints;
    size_t pos = 0;

    for (size_t i = 0; i < pattern.size(); i++) {
        PatternConstraint constraint;
        constraint.position = pos;
        constraint.is_wildcard = false;

        if (pattern[i] == '[') {
            // Classe de caractères
            i++;
            while (i < pattern.size() && pattern[i] != ']') {
                char c = std::toupper(pattern[i]);
                if (c >= 'A' && c <= 'Z') {
                    constraint.allowed_chars.insert(c);
                }
                i++;
            }
            if (constraint.allowed_chars.empty()) {
                constraint.is_wildcard = true;
            }
        } else if (is_wildcard(pattern[i])) {
            constraint.is_wildcard = true;
        } else {
            char c = std::toupper(pattern[i]);
            if (c >= 'A' && c <= 'Z') {
                constraint.allowed_chars.insert(c);
            } else {
                constraint.is_wildcard = true;
            }
        }

        constraints.push_back(constraint);
        pos++;
    }

    return constraints;
}

/**
 * Vérifie si un mot correspond au pattern
 */
bool matches_pattern(const std::string& word, const std::vector<PatternConstraint>& constraints) {
    if (word.size() != constraints.size()) return false;

    for (const auto& constraint : constraints) {
        if (constraint.is_wildcard) continue;

        char c = word[constraint.position];
        if (constraint.allowed_chars.find(c) == constraint.allowed_chars.end()) {
            return false;
        }
    }

    return true;
}

/**
 * Vérifie si un mot contient toutes les lettres requises
 */
bool contains_all(const std::string& word, const std::string& required) {
    std::string normalized_required;
    for (char c : required) {
        char norm = std::toupper(c);
        if (norm >= 'A' && norm <= 'Z') {
            normalized_required += norm;
        }
    }

    std::string word_copy = word;
    for (char c : normalized_required) {
        auto pos = word_copy.find(c);
        if (pos == std::string::npos) return false;
        word_copy.erase(pos, 1);
    }
    return true;
}

/**
 * Vérifie si un mot ne contient aucune des lettres exclues
 */
bool excludes_all(const std::string& word, const std::unordered_set<char>& excluded) {
    for (char c : word) {
        if (excluded.find(c) != excluded.end()) {
            return false;
        }
    }
    return true;
}

/**
 * Charge le dictionnaire depuis un fichier
 */
std::vector<std::string> load_dictionary(const std::string& filepath) {
    std::vector<std::string> words;
    std::ifstream file(filepath);

    if (!file.is_open()) {
        return words;
    }

    std::string line;
    while (std::getline(file, line)) {
        // Supprimer les espaces et retours chariot
        while (!line.empty() && (line.back() == '\r' || line.back() == '\n' || line.back() == ' ')) {
            line.pop_back();
        }

        // Ignorer les lignes vides et les commentaires
        if (line.empty() || line[0] == '#') continue;

        // Pour les fichiers .dic de Hunspell, ignorer les suffixes après /
        auto slash_pos = line.find('/');
        if (slash_pos != std::string::npos) {
            line = line.substr(0, slash_pos);
        }

        // Normaliser le mot
        std::string normalized = normalize_word(line);
        if (!normalized.empty() && normalized.size() >= 2) {
            words.push_back(normalized);
        }
    }

    return words;
}

/**
 * Trouve le premier dictionnaire disponible pour une langue
 */
std::string find_dictionary(const std::string& lang) {
    auto it = DEFAULT_DICTS.find(lang);
    if (it == DEFAULT_DICTS.end()) {
        return "";
    }

    for (const auto& path : it->second) {
        std::ifstream test(path);
        if (test.good()) {
            return path;
        }
    }

    return "";
}

void print_usage(const char* prog) {
    std::cout << "Usage: " << prog << " PATTERN [OPTIONS]\n\n"
              << "Recherche des mots correspondant au pattern dans un dictionnaire.\n\n"
              << "PATTERN:\n"
              << "  .  ou  ?  ou  _    lettre inconnue\n"
              << "  A-Z                lettre imposée (insensible casse/accents)\n"
              << "  [ABC]              une des lettres A, B ou C\n\n"
              << "OPTIONS:\n"
              << "  -d, --dict FILE    dictionnaire personnalisé\n"
              << "  -l, --lang LANG    langue (fr, en, de) [défaut: fr]\n"
              << "  -e, --exclude STR  lettres interdites\n"
              << "  -c, --contains STR lettres obligatoires (position libre)\n"
              << "  -n, --limit N      maximum N résultats\n"
              << "  -r, --random       afficher un résultat aléatoire\n"
              << "  -i, --interactive  mode interactif\n"
              << "  -q, --quiet        afficher uniquement les mots (sans stats)\n"
              << "  -h, --help         afficher cette aide\n\n"
              << "EXEMPLES:\n"
              << "  " << prog << " .A....X        # 7 lettres, A en 2e, X en 7e\n"
              << "  " << prog << " \"[AE]...\"      # 4 lettres commençant par A ou E\n"
              << "  " << prog << " ...... -c XYZ  # 6 lettres contenant X, Y et Z\n"
              << "  " << prog << " .A.... -e EIOU # sans les voyelles E, I, O, U\n";
}

/**
 * Effectue une recherche avec les paramètres donnés
 */
std::vector<std::string> search(
    const std::vector<std::string>& dictionary,
    const std::string& pattern,
    const std::string& contains,
    const std::unordered_set<char>& excludes,
    int limit
) {
    std::vector<std::string> results;
    auto constraints = parse_pattern(pattern);
    size_t target_length = constraints.size();

    for (const auto& word : dictionary) {
        if (word.size() != target_length) continue;
        if (!matches_pattern(word, constraints)) continue;
        if (!contains.empty() && !contains_all(word, contains)) continue;
        if (!excludes.empty() && !excludes_all(word, excludes)) continue;

        results.push_back(word);

        if (limit > 0 && static_cast<int>(results.size()) >= limit) {
            break;
        }
    }

    return results;
}

/**
 * Mode interactif
 */
void interactive_mode(
    const std::vector<std::string>& dictionary,
    const std::string& default_contains,
    const std::unordered_set<char>& default_excludes,
    int limit,
    bool quiet
) {
    std::cout << "Mode interactif. Tapez 'q' pour quitter, 'h' pour l'aide.\n";
    std::cout << "Entrez un pattern (ex: .A....X) :\n";

    std::string line;
    while (std::cout << "> " && std::getline(std::cin, line)) {
        // Supprimer les espaces
        while (!line.empty() && line.back() == ' ') line.pop_back();
        while (!line.empty() && line.front() == ' ') line.erase(0, 1);

        if (line.empty()) continue;
        if (line == "q" || line == "quit" || line == "exit") break;
        if (line == "h" || line == "help") {
            std::cout << "Commandes:\n"
                      << "  PATTERN          rechercher avec ce pattern\n"
                      << "  q, quit, exit    quitter\n"
                      << "  h, help          cette aide\n";
            continue;
        }

        auto results = search(dictionary, line, default_contains, default_excludes, limit);

        if (results.empty()) {
            std::cout << "Aucun résultat.\n";
        } else {
            for (const auto& word : results) {
                std::cout << word << "\n";
            }
            if (!quiet) {
                std::cout << "-- " << results.size() << " résultat(s) --\n";
            }
        }
    }
}

int main(int argc, char* argv[]) {
    // Options
    std::string dict_path;
    std::string lang = "fr";
    std::string contains;
    std::unordered_set<char> excludes;
    int limit = 0;
    bool random_mode = false;
    bool interactive = false;
    bool quiet = false;

    static struct option long_options[] = {
        {"dict",        required_argument, 0, 'd'},
        {"lang",        required_argument, 0, 'l'},
        {"exclude",     required_argument, 0, 'e'},
        {"contains",    required_argument, 0, 'c'},
        {"limit",       required_argument, 0, 'n'},
        {"random",      no_argument,       0, 'r'},
        {"interactive", no_argument,       0, 'i'},
        {"quiet",       no_argument,       0, 'q'},
        {"help",        no_argument,       0, 'h'},
        {0, 0, 0, 0}
    };

    int opt;
    while ((opt = getopt_long(argc, argv, "d:l:e:c:n:riqh", long_options, nullptr)) != -1) {
        switch (opt) {
            case 'd':
                dict_path = optarg;
                break;
            case 'l':
                lang = optarg;
                break;
            case 'e':
                for (char c : std::string(optarg)) {
                    char norm = std::toupper(c);
                    if (norm >= 'A' && norm <= 'Z') {
                        excludes.insert(norm);
                    }
                }
                break;
            case 'c':
                contains = optarg;
                break;
            case 'n':
                limit = std::atoi(optarg);
                break;
            case 'r':
                random_mode = true;
                break;
            case 'i':
                interactive = true;
                break;
            case 'q':
                quiet = true;
                break;
            case 'h':
                print_usage(argv[0]);
                return 0;
            default:
                print_usage(argv[0]);
                return 1;
        }
    }

    // Pattern (argument positionnel)
    std::string pattern;
    if (optind < argc) {
        pattern = argv[optind];
    } else if (!interactive) {
        std::cerr << "Erreur: pattern requis (ou utilisez -i pour le mode interactif)\n";
        print_usage(argv[0]);
        return 1;
    }

    // Trouver le dictionnaire
    if (dict_path.empty()) {
        dict_path = find_dictionary(lang);
        if (dict_path.empty()) {
            std::cerr << "Erreur: aucun dictionnaire trouvé pour la langue '" << lang << "'\n";
            std::cerr << "Utilisez -d pour spécifier un fichier dictionnaire.\n";
            return 1;
        }
    }

    // Charger le dictionnaire
    if (!quiet) {
        std::cerr << "Chargement de " << dict_path << "...\n";
    }

    auto dictionary = load_dictionary(dict_path);

    if (dictionary.empty()) {
        std::cerr << "Erreur: impossible de charger le dictionnaire depuis " << dict_path << "\n";
        return 1;
    }

    if (!quiet) {
        std::cerr << dictionary.size() << " mots chargés.\n";
    }

    // Mode interactif
    if (interactive) {
        interactive_mode(dictionary, contains, excludes, limit, quiet);
        return 0;
    }

    // Recherche
    auto results = search(dictionary, pattern, contains, excludes, limit);

    if (results.empty()) {
        if (!quiet) {
            std::cout << "Aucun résultat.\n";
        }
        return 0;
    }

    // Mode aléatoire
    if (random_mode) {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(0, results.size() - 1);
        std::cout << results[dis(gen)] << "\n";
    } else {
        // Trier les résultats alphabétiquement
        std::sort(results.begin(), results.end());

        for (const auto& word : results) {
            std::cout << word << "\n";
        }

        if (!quiet) {
            std::cerr << "-- " << results.size() << " résultat(s) --\n";
        }
    }

    return 0;
}
