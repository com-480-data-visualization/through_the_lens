# README_histrgb128

## Ce fichier contient quoi ?

Le fichier `photos_metadatas_with_hist_rgb128.parquet` contient :

- les metadonnees photo (base `photos_metadatas.csv`) ;
- les histogrammes RGB en **128 bins/canal** :
  - `hist_before_r_000` ... `hist_before_b_127`
  - `hist_after_r_000` ... `hist_after_b_127`
- des colonnes de qualite :
  - `before_ok`, `after_ok`
  - `before_source`, `after_source`
  - `before_error`, `after_error` (si echec)

Le schema total est large (~1732 colonnes), donc ce fichier est surtout utile pour les analyses qui exploitent les histogrammes.

## Qualite / couverture

Run complet :

- lignes traitees : `56890`
- `before_ok` : `56748` (~99.75%)
- `after_ok` : `56647` (~99.57%)

Les erreurs sont tracees dans :

- `histogram_outputs_rgb128_full/errors.jsonl`

## Le lier avec `photos_metadatas_filtered.csv`

Tu peux garder les datasets separes et ne faire la jointure que quand necessaire.

### Cle recommandee

- **`DocumentID`** (present dans les 2 fichiers)

Attention : il y a 8 valeurs nulles sur `DocumentID`, donc prevoir un fallback si besoin.

### Exemple pandas (jointure simple)

```python
import pandas as pd

df_main = pd.read_csv("photos_metadatas_filtered.csv")
df_hist = pd.read_parquet("photos_metadatas_with_hist_rgb128.parquet")

# Colonnes histogrammes + flags utiles
hist_cols = [c for c in df_hist.columns if c.startswith("hist_before_") or c.startswith("hist_after_")]
keep_cols = ["DocumentID", "before_ok", "after_ok"] + hist_cols

df_hist_small = df_hist[keep_cols]
df_join = df_main.merge(df_hist_small, on="DocumentID", how="left")
```

### Fallback pour les `DocumentID` manquants

Dans le parquet fusionne, les colonnes chemin/nom peuvent exister en double (`Directory_x`, `FileName_x`, etc.).
Si tu veux traiter aussi les quelques lignes sans `DocumentID`, fais une jointure secondaire sur :

- `Directory` (CSV) <-> `Directory_x` (parquet)
- `FileName` (CSV) <-> `FileName_x` (parquet)

## Conseil d'usage

- analyses courantes : rester sur `photos_metadatas_filtered.csv`
- analyses histogrammes : charger le parquet et joindre a la demande
