from pathlib import Path

import pymupdf

source = Path("attached_assets/Empreinte_Économique_-_1680_Barbeau_(3)_1787625207343.pdf")
target = Path(".agents/outputs/empreinte-reference")
target.mkdir(parents=True, exist_ok=True)

document = pymupdf.open(source)
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    pixmap.save(target / f"page-{index + 1}.png")

print(f"Rendered {document.page_count} pages to {target}")