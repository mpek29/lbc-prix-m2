<div align="center">
  <img src="docs/assets/icon.png" alt="Logo Prix au m²" width="128" height="128">
  <h1>Prix au m² pour leboncoin</h1>
  <p><strong>Le prix au mètre carré, là où leboncoin ne l’affiche pas.</strong></p>
  <p>
    Extension Chrome et Firefox qui calcule le prix au m² de chaque annonce
    immobilière et l’affiche à côté du prix. Elle ajoute aussi deux options de
    tri par prix au m², que leboncoin ne propose pas.
  </p>
</div>

<p align="center">
  <a href="https://github.com/mpek29/lbc-prix-m2/releases/latest"><img alt="Dernière version" src="https://img.shields.io/github/v/release/mpek29/lbc-prix-m2?style=flat-square&label=version&color=ff6e14"></a>
  <a href="https://github.com/mpek29/lbc-prix-m2/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/mpek29/lbc-prix-m2/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="LICENSE"><img alt="Licence" src="https://img.shields.io/github/license/mpek29/lbc-prix-m2?style=flat-square&color=6b7280"></a>
  <img alt="Navigateurs" src="https://img.shields.io/badge/Firefox%20%7C%20Chrome-MV3-5865F2?style=flat-square">
  <img alt="Données collectées" src="https://img.shields.io/badge/donn%C3%A9es%20collect%C3%A9es-aucune-10a37f?style=flat-square">
</p>

<p align="center">
  <a href="https://github.com/mpek29/lbc-prix-m2/releases/latest"><strong>Télécharger</strong></a>
  ·
  <a href="#installation">Installer</a>
  ·
  <a href="docs/architecture.md">Architecture</a>
  ·
  <a href="docs/adr/">Décisions</a>
  ·
  <a href="CONTRIBUTING.md">Contribuer</a>
  ·
  <a href="https://github.com/mpek29/lbc-prix-m2/issues">Signaler un problème</a>
</p>

<p align="center">
  <img src="docs/assets/badge.png" alt="Une annonce avec son prix au m²" width="620">
</p>

## Ce que l’extension ajoute

| leboncoin affiche                | L’extension ajoute                           |
| -------------------------------- | -------------------------------------------- |
| Le prix d’une annonce            | Le prix au m², à côté du prix                |
| Tri par pertinence, date et prix | Tri par prix au m², croissant et décroissant |
| Une page de résultats à la fois  | Toutes les pages, collectées puis triées     |
| Rien sur la fiabilité du tri     | Ce qui a été trié, et ce qui manque          |

## Aperçu

<p align="center">
  <img src="docs/assets/sort-menu.png" alt="Les deux options de tri ajoutées au menu de leboncoin" width="760">
</p>

Les deux options s’ajoutent au menu de tri de leboncoin. Elles sont construites
en clonant leurs propres composants, donc elles suivent leur design.

## Installation

Aucune version signée n’est publiée pour l’instant. Deux façons de l’installer.

**Temporaire, le temps d’un essai**

| Navigateur | Étapes                                                                               |
| ---------- | ------------------------------------------------------------------------------------ |
| Firefox    | `about:debugging#/runtime/this-firefox` → _Charger un module temporaire_ → le `.zip` |
| Chrome     | `chrome://extensions` → mode développeur → _Charger l’extension non empaquetée_      |

Firefox oublie les modules temporaires au redémarrage.

**Permanente**

Firefox refuse les extensions non signées. Mozilla signe gratuitement une
extension à distribution privée, sans page publique et en moins d’une minute :
`npm run sign:firefox`. La procédure est dans
[CONTRIBUTING.md](CONTRIBUTING.md#a-permanent-firefox-install).

Chaque page de version contient aussi les étapes d’installation, pour ne pas
avoir à revenir ici.

## Fonctionnement

leboncoin construit ses pages côté client et publie des noms de classe qui
contiennent une empreinte de build. Les deux moitiés de l’approche évidente sont
donc des pièges : il n’y a rien dans le DOM quand le script démarre, et la
classe repérée hier a disparu aujourd’hui.

L’extension procède autrement. Elle observe les mutations de la page et relance
une passe sans état à chaque changement. Et elle lit la page par sa couche
d’accessibilité : les attributs `data-qa-id`, les `aria-label`, les phrases
`.sr-only` écrites pour les lecteurs d’écran. Rien de tout cela ne peut être
renommé sans casser quelque chose dont leboncoin dépend.

Chaque passe compare ce qu’une annonce affiche à ce qu’elle devrait afficher, et
n’écrit que si les deux diffèrent.

| Sujet                    | Détail                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| Sélecteurs               | Aucun nom de classe. Hooks de test, ARIA, puis forme des URL       |
| Passes                   | Sans état, rejouées à chaque mutation, donc auto-correctrices      |
| Annonces sans surface    | Ignorées plutôt que mal calculées                                  |
| Valeurs invraisemblables | Refusées : un chiffre faux et confiant est pire que pas de chiffre |

Le détail est dans [docs/architecture.md](docs/architecture.md).

## Le tri par prix au m²

leboncoin trie côté serveur, et son paramètre de tri propose la pertinence, la
date et le prix. Rien ne divise l’un par l’autre. Le tri doit donc se faire dans
le navigateur, ce qui suppose d’avoir les annonces à trier : l’extension parcourt
les pages de la recherche, une requête à la fois.

Un plafond n’est pas le nôtre : leboncoin refuse de paginer au-delà de 100
pages. Une recherche de 217 762 résultats ne peut être triée entièrement par
personne. Le bandeau au-dessus des résultats dit dans quel cas vous êtes.

| Recherche                   | Résultats | Requêtes | Couverture |
| --------------------------- | --------- | -------- | ---------- |
| `category=10` sans filtre   | 217 762   | 100      | 1,6 %      |
| `category=10` + une commune | 74        | 3        | 100 %      |

Une recherche filtrée, ce qui est la façon dont on se sert du site, tient en
trois requêtes et donne une réponse complète. Les requêtes sont séquentielles,
espacées de 350 ms, interruptibles, et s’arrêtent au premier refus.

Le raisonnement complet est dans
[ADR 0007](docs/adr/0007-collect-pages-to-sort-by-price-per-area.md).

## Vie privée

Rien de vous ne quitte votre navigateur. Pas de statistiques, pas de rapport
d’erreur, pas de configuration distante, aucun serveur à nous. Le manifeste
Firefox déclare `data_collection_permissions: none`.

La seule exception est visible et volontaire : choisir un tri par prix au m²
récupère les pages suivantes de la recherche que vous consultez déjà, depuis
leboncoin, avec votre session. Ce sont les pages que vous obtiendriez en
cliquant vous-même.

La seule chose enregistrée est l’état du bouton dans la fenêtre de l’extension,
dans `storage.local`, sur votre machine.

## Développement

```bash
npm ci
npm run dev            # Chrome, rechargement à chaud
npm run dev:firefox    # Firefox
npm run harness        # les annonces capturées, sans installer l’extension
npm run verify         # format, prose, lint, types, tests : ce que fait la CI
```

| Commande              | Rôle                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `npm run build`       | Construit pour Chrome dans `.output/chrome-mv3`                    |
| `npm run zip:firefox` | Construit et empaquette, avec l’archive des sources exigée par AMO |
| `npm run harness`     | Sert les annonces capturées avec le vrai code                      |
| `npm run test:watch`  | Tests en continu                                                   |
| `npm run lint:prose`  | Refuse les tirets cadratins et les mots de remplissage             |

`npm run harness` sert les captures de vraies annonces avec le code réel, sans
leboncoin ni extension installée. happy-dom confirme qu’un badge est dans le
DOM ; il ne dit pas qu’il est illisible.

## Quand ça casse

leboncoin finira par changer quelque chose. L’extension s’en aperçoit : si
toutes les annonces d’une page échouent de la même façon, elle écrit un
avertissement dans la console au lieu de se taire.

Dans ce cas,
[ouvrez un ticket](https://github.com/mpek29/lbc-prix-m2/issues/new?template=selector-drift.yml)
avec le HTML d’une annonce. Cette capture devient une fixture, donc un test, ce
qui est le chemin le plus court entre « c’est cassé » et « ça ne peut plus
casser comme ça ».

## Licence

MIT, voir [LICENSE](LICENSE).

Projet indépendant, sans lien avec leboncoin.
