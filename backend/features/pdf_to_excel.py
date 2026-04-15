"""
Feature: PDF → Excel

Pipeline:
  1. extract_pdf_text  — pull raw text from the PDF (no LLM)
  2. clean_text        — normalise and de-noise the text (haiku)
  3. structure_data    — extract tabular data as JSON (sonnet)
  4. generate_excel    — write JSON rows to a .xlsx file (no LLM)
"""
from skills import extract_pdf_text, clean_text, structure_data, generate_excel

FEATURE = {
    "id": "pdf_to_excel",
    "name": "PDF → Excel",
    "description": "Extract structured data from a PDF and download it as an Excel file",
    "input_type": "file",
    "input_accept": ".pdf",
    "output_type": "file_download",
    "output_filename": "output.xlsx",
    "pipeline": [
        extract_pdf_text,
        clean_text,
        structure_data,
        generate_excel,
    ],
}
