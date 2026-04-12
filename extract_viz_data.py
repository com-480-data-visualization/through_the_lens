"""
Run: python extract_viz_data.py
Writes viz_data.js with real data for index.html.
"""
import json
import pandas as pd
import numpy as np

CSV = "shared_dataset/shared_dataset/metadata/photos_metadatas_filtered_v3.csv"
df = pd.read_csv(CSV, low_memory=False)
print(f"Loaded {len(df)} rows")

# ── Normalise camera model ──────────────────────────────────────────────────
model_map = {
    "ILCE-7M4":  "Sony A7 IV",
    "ILCE-7M5":  "Sony A7 V",
    "ILCE-7M3":  "Sony A7 III",
    "ILCE-7C":   "Sony A7C",
    "ILCE-7CM2": "Sony A7C II",
    "ILCE-7RM4": "Sony A7R IV",
    "X100VI":    "Fuji X100VI",
    "X-T30":     "Fuji X-T30",
    "DMC-LX100": "Panasonic LX100",
    "insta360 oners": "Insta360 OneRS",
    "Insta360 OneRS": "Insta360 OneRS",
    "iPhone 13 Pro Max": "iPhone 13 Pro",
    "iPhone 15": "iPhone 15",
}
df["Model_norm"] = df["Model"].replace(model_map)

# ── Parse date ──────────────────────────────────────────────────────────────
df["DateTime"] = pd.to_datetime(df["DateTimeOriginal"], errors="coerce", format="%Y:%m:%d %H:%M:%S")
df = df.dropna(subset=["DateTime"]).copy()
df["Year"]  = df["DateTime"].dt.year.astype(int)
df["Month"] = df["DateTime"].dt.month.astype(int)
df["Date"]  = df["DateTime"].dt.date

# ── Hero stats ──────────────────────────────────────────────────────────────
total_photos = len(df)
shooting_days = df["Date"].nunique()

# Lens column (use Lens if present, else model for fixed-lens cameras)
fixed_lens = {
    "Fuji X100VI":    "Fujinon 23mm f/2",
    "Panasonic LX100":"Leica 24-75mm f/1.7",
    "Insta360 OneRS": "Insta360 1-inch",
}
df["Lens_Recovered"] = df.apply(
    lambda r: fixed_lens.get(r["Model_norm"], r.get("Lens", None))
    if pd.isna(r.get("Lens")) else r.get("Lens"), axis=1
)
unique_lenses = df["Lens_Recovered"].dropna().nunique()

print(f"Hero: {total_photos} photos, {shooting_days} shooting days, {unique_lenses} lenses")

# Filter to 2021-2024 for viz
df4 = df[df["Year"].between(2021, 2024)].copy()
print(f"2021-2024: {len(df4)} rows")

# ══════════════════════════════════════════════════════════════════════════════
# 1. EXPOSURE EXPLORER
# ══════════════════════════════════════════════════════════════════════════════
def cam_label(m):
    if "Sony" in str(m):       return "Sony"
    if "Fuji" in str(m):       return "Fuji"
    if "iPhone" in str(m):     return "iPhone"
    if "Panasonic" in str(m):  return "Panasonic"
    return "Other"

exp = df4[["ISO", "ApertureValue", "ShutterSpeedValue", "FocalLength", "Model_norm", "Year"]].copy()
exp.columns = ["iso", "aperture", "shutter", "focal", "cam", "yr"]
exp["iso"]      = pd.to_numeric(exp["iso"],      errors="coerce")
exp["aperture"] = pd.to_numeric(exp["aperture"], errors="coerce")
exp["shutter"]  = pd.to_numeric(exp["shutter"],  errors="coerce")
exp["focal"]    = pd.to_numeric(exp["focal"],    errors="coerce")
exp = exp.dropna()
exp = exp[(exp["iso"] >= 50) & (exp["iso"] <= 204800)]
exp = exp[(exp["aperture"] >= 1.0) & (exp["aperture"] <= 22)]
exp = exp[(exp["shutter"] > 1/8000) & (exp["shutter"] <= 30)]
exp = exp[(exp["focal"] >= 1) & (exp["focal"] <= 800)]
exp["cam"] = exp["cam"].apply(cam_label)
exp["yr"]  = exp["yr"].astype(str)

print(f"Clean exposure rows: {len(exp)}")
print(exp["cam"].value_counts())

# Stratified sample: up to 400 per camera per year to balance cameras
parts = []
for (cam, yr), grp in exp.groupby(["cam", "yr"]):
    parts.append(grp.sample(min(len(grp), 400), random_state=42))
sample = pd.concat(parts).sample(min(2000, sum(len(p) for p in parts)), random_state=42).reset_index(drop=True)
print(f"Exposure sample: {len(sample)} points")

exp_points = [
    {
        "iso":      round(float(r["iso"]), 0),
        "aperture": round(float(r["aperture"]), 2),
        "shutter":  round(float(r["shutter"]), 6),
        "focal":    round(float(r["focal"]), 1),
        "cam":      r["cam"],
        "yr":       r["yr"],
    }
    for _, r in sample.iterrows()
]

# ══════════════════════════════════════════════════════════════════════════════
# 2. GEAR RACE — % share per month, top 6 cameras incl. Sony A7 IV
#    Timeline trimmed to first month any camera has data.
# ══════════════════════════════════════════════════════════════════════════════
top6 = df4["Model_norm"].value_counts().head(6).index.tolist()
print(f"\nTop 6 cameras: {top6}")

all_months = [(y, m) for y in range(2021, 2025) for m in range(1, 13)]
gear_df = df4[df4["Model_norm"].isin(top6)].copy()
gear_df["ym"] = list(zip(gear_df["Year"], gear_df["Month"]))
first_ym = min(gear_df["ym"])
trimmed_months = [(y, m) for (y, m) in all_months if (y, m) >= first_ym]
month_idx = {ym: i for i, ym in enumerate(trimmed_months)}
n_months = len(trimmed_months)
print(f"Timeline: {first_ym} → 2024-12 ({n_months} months)")

gear_df["month_i"] = gear_df["ym"].map(month_idx)
gear_df = gear_df.dropna(subset=["month_i"])
gear_df["month_i"] = gear_df["month_i"].astype(int)

monthly = {c: [0]*n_months for c in top6}
for (cam, mi), grp in gear_df.groupby(["Model_norm", "month_i"]):
    monthly[cam][int(mi)] = len(grp)

month_labels = [f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} {y}" for (y,m) in trimmed_months]

print("\nPeak monthly shots per camera:")
for cam in top6:
    print(f"  {cam}: max {max(monthly[cam])} shots/month")

# ══════════════════════════════════════════════════════════════════════════════
# 3. LENS RACE — top 5 interchangeable lenses, monthly shot count
#    Excludes fixed-lens cameras (Fuji X100VI, Panasonic LX100, Insta360).
#    Timeline trimmed to first month any lens has data.
# ══════════════════════════════════════════════════════════════════════════════
FIXED_LENS_MODELS = {"Fuji X100VI", "Panasonic LX100", "Insta360 OneRS", "Fuji X-T30",
                     "iPhone 13 Pro", "iPhone 15"}
lens_df = df4[~df4["Model_norm"].isin(FIXED_LENS_MODELS)].copy()
lens_df = lens_df.dropna(subset=["Lens"])

# Short display names
lens_name_map = {
    "FE 70-200mm F2.8 GM OSS II":         "70-200 GM II",
    "FE 24-70mm F2.8 GM II":              "24-70 GM II",
    "FE 50mm F1.4 GM":                    "50mm GM",
    "FE 14mm F1.8 GM":                    "14mm GM",
    "FE 28-70mm F3.5-5.6 OSS":            "28-70 OSS",
    "FE 70-200mm F2.8 GM OSS II + 2X Teleconverter": "70-200 + 2× TC",
    "28-70mm F2.8 DG DN | Contemporary 021": "Sigma 28-70 f/2.8",
    "24-70mm F2.8 DG DN | Art 019":        "Sigma 24-70 f/2.8",
    "FE 135mm F1.8 GM":                    "135mm GM",
    "Viltrox 16mm F1.8 FE":                "Viltrox 16mm",
}
lens_df["Lens_short"] = lens_df["Lens"].map(lens_name_map).fillna(lens_df["Lens"])

top5_lenses = lens_df["Lens_short"].value_counts().head(5).index.tolist()
print(f"\nTop 5 lenses: {top5_lenses}")

lens_df2 = lens_df[lens_df["Lens_short"].isin(top5_lenses)].copy()
lens_df2["ym"] = list(zip(lens_df2["Year"], lens_df2["Month"]))
lens_first_ym = min(lens_df2["ym"])
lens_months = [(y, m) for (y, m) in all_months if (y, m) >= lens_first_ym]
lens_month_idx = {ym: i for i, ym in enumerate(lens_months)}
n_lens_months = len(lens_months)
print(f"Lens timeline: {lens_first_ym} → 2024-12 ({n_lens_months} months)")

lens_df2["month_i"] = lens_df2["ym"].map(lens_month_idx)
lens_df2 = lens_df2.dropna(subset=["month_i"])
lens_df2["month_i"] = lens_df2["month_i"].astype(int)

lens_monthly = {l: [0]*n_lens_months for l in top5_lenses}
for (lens, mi), grp in lens_df2.groupby(["Lens_short", "month_i"]):
    lens_monthly[lens][int(mi)] = len(grp)

lens_month_labels = [f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} {y}" for (y,m) in lens_months]

print("\nPeak monthly shots per lens:")
for l in top5_lenses:
    print(f"  {l}: max {max(lens_monthly[l])} shots/month")

# ══════════════════════════════════════════════════════════════════════════════
# Write viz_data.js
# ══════════════════════════════════════════════════════════════════════════════
cameras_js = json.dumps(top6)
cam_cols_js = json.dumps({
    top6[0]: "#2563EB",
    top6[1]: "#0EA5E9",
    top6[2]: "#14B8A6",
    top6[3]: "#22C55E",
    top6[4]: "#F59E0B",
    top6[5]: "#8B5CF6",
} if len(top6) >= 6 else {})

lens_col_list = ["#2563EB", "#F97316", "#14B8A6", "#8B5CF6", "#22C55E"]
lens_cols_js = json.dumps({top5_lenses[i]: lens_col_list[i] for i in range(len(top5_lenses))})

out = f"""// AUTO-GENERATED by extract_viz_data.py — do not edit by hand.
// Re-run the script to refresh.

const HERO_STATS = {{
  photos: {total_photos},
  days:   {shooting_days},
  lenses: {unique_lenses}
}};

const EXP_DATA = {json.dumps(exp_points, separators=(',', ':'))};

const CAMERAS = {cameras_js};
const CAM_COLS = {cam_cols_js};
const GEAR_MONTHLY = {json.dumps(monthly, indent=2)};
const GEAR_MONTH_LABELS = {json.dumps(month_labels)};

const LENSES = {json.dumps(top5_lenses)};
const LENS_COLS = {lens_cols_js};
const LENS_MONTHLY = {json.dumps(lens_monthly, indent=2)};
const LENS_MONTH_LABELS = {json.dumps(lens_month_labels)};
"""

with open("viz_data.js", "w") as f:
    f.write(out)

print("\nWrote viz_data.js")
