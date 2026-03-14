# plot_twisters

A data visualization project exploring photo metadata.

## Setup

### Prerequisites
- [Conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html) installed

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd plot_twisters
```

2. Create the conda environment:
```bash
conda env create -f environment.yml
```

3. Activate the environment:
```bash
conda activate data-viz
```

### Running the Project

Launch Jupyter to explore the data:
```bash
jupyter notebook data_exploration.ipynb
```

Or in VS Code, open `data_exploration.ipynb` and select the `data-viz` kernel from the kernel picker.

### Data

The `data/` directory contains CSV and Parquet files with photo metadata. These files are not tracked in git due to their size.

## Requirements

The project uses:
- pandas - data manipulation
- numpy - numerical computing
- matplotlib - data visualization
- seaborn - statistical visualization
- jupyter - interactive notebooks