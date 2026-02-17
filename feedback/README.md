# Feedback Ingestion (No GitHub Account Needed)

This repo can collect user feedback from a public Google Form response sheet and sync it into:

- `feedback/feedback.json`

## Setup

1. Create a Google Form with fields matching your mapping (Category, Summary, Details, etc.).
2. Link the Form responses to a Google Sheet.
3. In Google Sheets, publish the response sheet as CSV:
   - `File` -> `Share` -> `Publish to web`
   - Publish the responses tab as CSV
4. Copy the CSV URL and paste it into:
   - `feedback/google-form.config.json` -> `csvUrl`
5. Commit and push.

## Automation

Workflow: `.github/workflows/sync-feedback-json.yml`

- Runs every 30 minutes and on manual dispatch.
- Fetches CSV and writes normalized data into `feedback/feedback.json`.
- Auto-commits only when changes are detected.

## Notes

- This is public data. Do not collect sensitive or personal information.
- If your form headers differ, update `fieldMap` in `feedback/google-form.config.json`.
