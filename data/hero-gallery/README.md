# Hero gallery (mosaïque intro)

Vignettes WebP (~400 px grand côté) pour la mosaïque de fond de la section hero, avec manifest JSON incluant la date de prise.

## Contenu

| Fichier | Rôle |
|---------|------|
| `manifest.json` | Index des 124 photos : chemins, dimensions, `captured_at`, `captured_date`, `date_source` |
| `thumb/epfl-NNN.webp` | Miniatures web |

## Régénération

Monter le volume backup, puis depuis la racine du dépôt :

```bash
python scripts/build_hero_gallery.py
```

Source par défaut : `/Volumes/PHOTO_BACKUP/EPFL shutterstock/jpg small`  
Override : `HERO_GALLERY_SRC=/chemin/vers/jpg python scripts/build_hero_gallery.py`

Options : `--dry-run`, `--max-side 400`, `--quality 82`

## Schéma manifest (extrait)

Chaque entrée dans `items` :

- `id`, `slug`, `thumb`, `width`, `height`, `source_file`
- `captured_at` — ISO 8601 (`2024-05-03T18:42:10`)
- `captured_date` — jour seul (`2024-05-03`)
- `date_source` — `exif` | `file_mtime` | `missing`

Les items sont triés par `captured_at` croissant.
