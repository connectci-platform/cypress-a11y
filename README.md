# A11y Reports

This repository contains accessibility reports.

## Index

The [index.html](index.html) file provides a central listing of all accessibility test reports, sorted by most recent first.

## Reports Structure

Reports are organized in the following directory structure:
```
reports/YYYYMMDD/{branch-or-ref}/{workflow-run-id}/summary.html
```

For example:
- `reports/20251010/d8-2561/18414646258/summary.html` - Report from branch `d8-2561`, run ID `18414646258`, on 10/10/2025
- `reports/20251010/refs/pull/1677/merge/18413091883/summary.html` - Report from PR #1677, run ID `18413091883`, on 10/10/2025

## Automated Index Generation

The index is automatically regenerated when new reports are added to the repository through a GitHub Action workflow. You can also manually regenerate it by running:

```bash
node generate-index.js
```
