import os
import re
from pathlib import Path
from typing import Optional

BASE = Path(os.getcwd())
UPLOADS = BASE / "uploads"
UPLOADS.mkdir(exist_ok=True)

def safe_path(p: str) -> Optional[Path]:
    resolved = (BASE / p).resolve()
    try:
        resolved.relative_to(BASE)
        return resolved
    except ValueError:
        return None

def extract_text(path: str) -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied: path outside workspace"}
    if not p.exists() or not p.is_file():
        return {"error": f"File not found: {path}"}
    try:
        import fitz
        doc = fitz.open(str(p))
        pages = []
        for i, page in enumerate(doc):
            text = page.get_text("text")
            pages.append({"page": i + 1, "text": text, "char_count": len(text)})
        doc.close()
        return {
            "path": str(p),
            "page_count": len(pages),
            "pages": pages,
            "total_chars": sum(pg["char_count"] for pg in pages),
        }
    except ImportError:
        return {"error": "PyMuPDF (fitz) not installed. Run: pip install pymupdf"}
    except Exception as e:
        return {"error": f"PDF extraction failed: {e}"}


def edit_pdf(
    path: str,
    operations: list[dict],
    output: Optional[str] = None,
) -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied: path outside workspace"}
    if not p.exists() or not p.is_file():
        return {"error": f"File not found: {path}"}
    try:
        import fitz
        doc = fitz.open(str(p))

        for op in operations:
            op_type = op.get("type")
            page_num = op.get("page", 0) - 1  # convert to 0-indexed

            if op_type == "add_text":
                if page_num < 0 or page_num >= len(doc):
                    continue
                page = doc[page_num]
                rect = fitz.Rect(
                    op.get("x", 50),
                    op.get("y", 50),
                    op.get("x", 50) + 400,
                    op.get("y", 50) + 50,
                )
                page.insert_textbox(
                    rect,
                    op.get("text", ""),
                    fontsize=op.get("fontsize", 11),
                    fontname=op.get("font", "helv"),
                    color=op.get("color", (0, 0, 0)),
                )

            elif op_type == "replace_text":
                if page_num < 0 or page_num >= len(doc):
                    continue
                page = doc[page_num]
                old = op.get("old", "")
                new = op.get("new", "")
                text_instances = page.search_for(old)
                for inst in text_instances:
                    annot = page.add_redact_annot(inst, fill=(1, 1, 1))
                page.apply_redactions()
                for inst in text_instances:
                    page.insert_textbox(
                        inst,
                        new,
                        fontsize=op.get("fontsize", 11),
                        fontname=op.get("font", "helv"),
                        color=op.get("color", (0, 0, 0)),
                    )

            elif op_type == "delete_page":
                if 0 <= page_num < len(doc):
                    doc.delete_page(page_num)

            elif op_type == "add_page":
                page = doc.new_page(
                    width=op.get("width", 595),
                    height=op.get("height", 842),
                )
                if op.get("text"):
                    rect = fitz.Rect(50, 50, 545, 800)
                    page.insert_textbox(
                        rect,
                        op["text"],
                        fontsize=op.get("fontsize", 11),
                        fontname=op.get("font", "helv"),
                    )

        output_path = p
        if output:
            out_p = safe_path(output)
            if out_p:
                output_path = out_p

        doc.save(str(output_path), incremental=output_path == p, deflate=True)
        doc.close()
        return {"path": str(output_path), "status": "saved", "operations": len(operations)}
    except ImportError:
        return {"error": "PyMuPDF (fitz) not installed. Run: pip install pymupdf"}
    except Exception as e:
        return {"error": f"PDF edit failed: {e}"}


def merge_pdfs(paths: list[str], output: str) -> dict:
    try:
        import fitz
        merged = fitz.open()
        for p in paths:
            resolved = safe_path(p)
            if not resolved or not resolved.exists():
                continue
            doc = fitz.open(str(resolved))
            merged.insert_pdf(doc)
            doc.close()
        out_p = safe_path(output)
        if not out_p:
            merged.close()
            return {"error": "Access denied: output path outside workspace"}
        merged.save(str(out_p), deflate=True)
        merged.close()
        return {"path": str(out_p), "status": "merged", "pages": merged.page_count}
    except ImportError:
        return {"error": "PyMuPDF (fitz) not installed. Run: pip install pymupdf"}
    except Exception as e:
        return {"error": f"PDF merge failed: {e}"}


def split_pdf(
    path: str,
    pages: Optional[list[int]] = None,
    output_dir: Optional[str] = None,
) -> dict:
    p = safe_path(path)
    if not p:
        return {"error": "Access denied: path outside workspace"}
    if not p.exists() or not p.is_file():
        return {"error": f"File not found: {path}"}
    try:
        import fitz
        doc = fitz.open(str(p))
        base_name = p.stem
        out_dir = BASE
        if output_dir:
            od = safe_path(output_dir)
            if od:
                out_dir = od
        out_dir = Path(out_dir) / f"{base_name}_split"
        out_dir.mkdir(exist_ok=True)

        results = []
        if pages:
            for pg in pages:
                if pg < 1 or pg > len(doc):
                    continue
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=pg - 1, to_page=pg - 1)
                out_path = out_dir / f"{base_name}_p{pg}.pdf"
                new_doc.save(str(out_path), deflate=True)
                new_doc.close()
                results.append(str(out_path))
        else:
            for i in range(len(doc)):
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=i, to_page=i)
                out_path = out_dir / f"{base_name}_p{i + 1}.pdf"
                new_doc.save(str(out_path), deflate=True)
                new_doc.close()
                results.append(str(out_path))

        doc.close()
        return {"output_dir": str(out_dir), "files": results, "count": len(results)}
    except ImportError:
        return {"error": "PyMuPDF (fitz) not installed. Run: pip install pymupdf"}
    except Exception as e:
        return {"error": f"PDF split failed: {e}"}
