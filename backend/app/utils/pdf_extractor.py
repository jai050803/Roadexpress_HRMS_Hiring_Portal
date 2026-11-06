import io
import logging
from typing import Optional
import pypdfium2

logger = logging.getLogger(__name__)


def _run_ocr(pdf: pypdfium2.PdfDocument, file_bytes: bytes) -> str:
    """
    Runs OCR on PDF pages when text layer is absent or insufficient (< 50 characters).
    Attempts PaddleOCR first, then pytesseract if available.
    """
    # 1. Try PaddleOCR
    try:
        from paddleocr import PaddleOCR
        import numpy as np

        logger.info("Running PaddleOCR extraction on scanned PDF...")
        ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        ocr_lines = []

        for page in pdf:
            # Render page to PIL image
            pil_image = page.render(scale=2).to_pil()
            img_np = np.array(pil_image)
            result = ocr.ocr(img_np, cls=True)
            if result and result[0]:
                for line in result[0]:
                    if line and len(line) >= 2 and line[1]:
                        text = line[1][0]
                        if text:
                            ocr_lines.append(text.strip())

        extracted = "\n".join(ocr_lines).strip()
        if extracted:
            return extracted
    except ImportError:
        logger.warning("PaddleOCR is not installed in the current environment.")
    except Exception as e:
        logger.warning(f"PaddleOCR execution failed: {e}")

    # 2. Try pytesseract as secondary OCR fallback if installed
    try:
        import pytesseract

        logger.info("Running pytesseract fallback OCR on PDF...")
        ocr_lines = []
        for page in pdf:
            pil_image = page.render(scale=2).to_pil()
            page_text = pytesseract.image_to_string(pil_image)
            if page_text:
                ocr_lines.append(page_text.strip())

        extracted = "\n\n".join(ocr_lines).strip()
        if extracted:
            return extracted
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"pytesseract fallback OCR failed: {e}")

    return ""


def extract_text(file_bytes: bytes) -> str:
    """
    Extracts text from PDF bytes.
    1. Tries direct pypdfium2 text-layer extraction.
    2. If text layer is absent or extracted text has under 50 characters, falls back to OCR (PaddleOCR).
    3. Raises ValueError if PDF is invalid, empty, or corrupted.
    """
    if not file_bytes:
        raise ValueError("Cannot extract text: PDF file bytes are empty.")

    try:
        pdf = pypdfium2.PdfDocument(file_bytes)
    except Exception as e:
        raise ValueError(f"Corrupted or invalid PDF file: {str(e)}")

    page_count = len(pdf)
    if page_count == 0:
        raise ValueError("Corrupted PDF file: Document contains 0 pages.")

    # 1. Direct text extraction using pypdfium2
    text_parts = []
    try:
        for page_idx in range(page_count):
            page = pdf[page_idx]
            textpage = page.get_textpage()
            page_text = textpage.get_text_range()
            if page_text:
                text_parts.append(page_text.strip())
    except Exception as e:
        logger.warning(f"Error reading PDF text layer: {e}")

    extracted_text = "\n\n".join([t for t in text_parts if t]).strip()

    # 2. Check if extracted text is sufficient (>= 50 chars)
    if len(extracted_text) >= 50:
        return extracted_text

    logger.info(
        f"PDF text layer yielded {len(extracted_text)} characters (< 50 chars). "
        "Proceeding to OCR extraction..."
    )

    # 3. Fall back to OCR for scanned / image PDFs
    ocr_text = _run_ocr(pdf, file_bytes)
    if ocr_text and len(ocr_text) >= 20:
        return ocr_text

    # If some minimal text was found (<50 chars) and OCR did not produce more, return what we have
    if extracted_text:
        return extracted_text

    raise ValueError(
        "PDF has no extractable text layer (<50 characters) and OCR could not detect any readable text."
    )
