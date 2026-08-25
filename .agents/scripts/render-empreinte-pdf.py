from pathlib import Path

import fitz

source = Path("attached_assets/Empreinte_Économique_-_1680_Barbeau_(1)_1787340143916.pdf")
target = Path(".agents/outputs/empreinte-1680-pages")
target.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixmap.save(target / f"page-{index + 1}.png")

print(f"Rendered {document.page_count} pages to {target}")