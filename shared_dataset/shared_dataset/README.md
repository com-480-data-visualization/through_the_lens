# Shared dataset (DataViz)

Paquet prêt à partager : métadonnées, histogrammes RGB 128 bins (avant / après), embeddings CLIP Immich (sous-ensemble matché).

## Contenu

| Élément | Fichier / dossier | Rôle |
|--------|-------------------|------|
| Métadonnées | `metadata/photos_metadatas_filtered_v3.csv` | Chemins (`Directory`, `FileName`), EXIF, Lightroom, etc. — **une ligne par photo**, ordre stable. |
| Histogrammes | `histograms/rgb128_before_after_merged.parquet` | Même tableau + colonnes `hist_before_*`, `hist_after_*`, `before_ok`, `after_ok`, etc. + `row_index`. |
| Qualité histo | `histograms/manifest.json`, `histograms/errors.jsonl` | Paramètres du run (128 bins) et lignes en erreur. |
| Immich | `immich_embeddings/immich_clip_alignment.csv` | Pour chaque ligne du CSV : `row_index`, chemin, méthode de match, `matched`, ids Immich. |
| Immich | `immich_embeddings/immich_clip_embeddings.npz` | `row_index` (51220) + `embedding` (512 flottants) — **uniquement les photos matchées**. |
| Immich | `immich_embeddings/immich_clip_summary.json` | Statistiques de jointure. |
| Doc histo | `docs/README_histrgb128.md` | Détail des colonnes histogrammes (schéma d’origine ; le Parquet fusionné suit la même logique). |

## Clés de jointure (recommandé)

1. **`row_index`** : entier `0 … 56889`, identique entre le CSV, le Parquet fusionné, et `immich_clip_alignment.csv`. C’est la clé la plus simple.
2. **`DocumentID`** : identifiant XMP (quelques valeurs vides dans le CSV — voir `docs/README_histrgb128.md`).

### Exemple Python

```python
import numpy as np
import pandas as pd

meta = pd.read_csv("metadata/photos_metadatas_filtered_v3.csv", low_memory=False)
meta.insert(0, "row_index", range(len(meta)))

hist = pd.read_parquet("histograms/rgb128_before_after_merged.parquet")
# hist contient déjà row_index après fusion

align = pd.read_csv("immich_embeddings/immich_clip_alignment.csv")
z = np.load("immich_embeddings/immich_clip_embeddings.npz", allow_pickle=True)
emb_rows = z["row_index"]
emb = z["embedding"]  # (51220, 512)

m = meta.merge(align[["row_index", "matched", "match_method", "immich_asset_id"]], on="row_index", how="left")
emb_df = pd.DataFrame({"row_index": emb_rows, **{f"clip_{i}": emb[:, i] for i in range(emb.shape[1])}}})
# ou indexer emb par row_index via un dict / xarray selon besoin
```

Pour ne charger que `row_index` et les colonnes d’histogramme : ouvrir le Parquet avec `pandas` ou `pyarrow`, filtrer `df.columns` par préfixe `hist_before_` / `hist_after_`, puis `read_parquet(..., columns=[...])`.

## Ce qui n’est pas inclus (volontairement ou optionnel)

- **Pixels / miniatures** : chemins absolus vers le disque ; pas de copie des fichiers RAW/JPEG.
- **Export brut Immich** (`smart_search_export.csv`) : très lourd ; les embeddings livrés suffisent pour la plupart des usages si la jointure via `alignment.csv` convient.
- **Chunks Parquet intermédiaires** : le fichier fusionné remplace les ~190 chunks du dossier de travail.

### Idées d’extensions utiles pour le groupe (à ajouter plus tard si besoin)

- Taxonomie / règles de tags : copies dans `docs/tag_taxonomy_v1.json` et `docs/album_tag_rules_v1.json` (alignées sur le dépôt principal).
- Sorties **vision multilabel** ou tags fusionnés, si vous en générez.
- **Manifest miniatures** (`thumbs256_*`) si une analyse image se fait sur JPEG 256 plutôt que sur RAW.
- Petit **schéma** (JSON/YAML) listant les groupes de colonnes du CSV pour navigation dans Observable / Vega.

## Reproductibilité

- Histogrammes : script `scripts/build_rgb_histograms.py`, run `histogram_outputs_rgb128_full` (voir `manifest.json`).
- Immich : `scripts/immich_embedding_join.py` sur l’export smart search.
