"""Apply Alembic migrations + seed admin/demo baseline against DATABASE_URL."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    print("Running alembic upgrade head…")
    upgrade = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT,
        check=False,
    )
    if upgrade.returncode != 0:
        return upgrade.returncode

    print("Seeding baseline roles/admin…")
    seed = subprocess.run([sys.executable, "-m", "app.seed"], cwd=ROOT, check=False)
    return seed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
