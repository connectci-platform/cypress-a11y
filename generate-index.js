#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findSummaryFiles(dir) {
  const results = [];

  function traverse(currentPath, depth = 0) {
    if (depth > 10) return; // Prevent infinite loops

    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          traverse(fullPath, depth + 1);
        } else if (entry.name === 'summary.html') {
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(dir, fullPath);
          results.push({
            path: 'reports/' + relativePath,  // Add reports prefix for correct path parsing
            mtime: stats.mtime,
            mtimeMs: stats.mtimeMs
          });
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${currentPath}:`, err.message);
    }
  }

  traverse(dir);
  return results;
}

function parseReportPath(reportPath) {
  // Expected format: reports/YYYYMMDD/{branch-or-ref}/{workflow-run-id}/summary.html
  const parts = reportPath.split(path.sep);

  if (parts.length >= 5 && parts[0] === 'reports' && parts[parts.length - 1] === 'summary.html') {
    const date = parts[1]; // YYYYMMDD
    const branchOrRef = parts.slice(2, -2).join('/'); // Everything between date and workflow-run-id
    const workflowRunId = parts[parts.length - 2];

    return {
      date,
      branchOrRef,
      workflowRunId,
      displayDate: formatDate(date),
      displayBranch: formatBranch(branchOrRef)
    };
  }

  return null;
}

function formatDate(dateStr) {
  // Convert YYYYMMDD to readable format
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${month}/${day}/${year}`;
  }
  return dateStr;
}

function formatBranch(branchOrRef) {
  // Simplify ref paths like "refs/pull/1677/merge" to "PR #1677"
  if (branchOrRef.startsWith('refs/pull/')) {
    const prNumber = branchOrRef.split('/')[2];
    return `PR #${prNumber}`;
  }
  return branchOrRef;
}

function generateHTML(reports) {
  const rows = reports.map(report => {
    const info = parseReportPath(report.path);
    if (!info) return '';

    return `            <tr>
                <td>${info.displayDate}</td>
                <td>${info.displayBranch}</td>
                <td>${info.workflowRunId}</td>
                <td><a href="${report.path}">View Report</a></td>
            </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Reports Index</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1 { margin-top: 20px; color: #333; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; position: sticky; top: 0; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #f1f1f1; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .last-updated { font-size: 0.9em; color: #666; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>Accessibility Test Reports Index</h1>

    <div class="last-updated">
        Last updated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })}
    </div>

    <div class="summary">
        <p><strong>Total Reports:</strong> ${reports.length}</p>
        <p>This page lists all accessibility test reports, with the most recent listed first.</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Branch/Ref</th>
                <th>Workflow Run ID</th>
                <th>Report</th>
            </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
    </table>
</body>
</html>`;
}

// Main execution
const reportsDir = path.join(__dirname, 'reports');

if (!fs.existsSync(reportsDir)) {
  console.error('Reports directory not found!');
  process.exit(1);
}

console.log('Scanning for summary.html files...');
const summaryFiles = findSummaryFiles(reportsDir);

console.log(`Found ${summaryFiles.length} summary files`);

// Sort by workflow run ID (descending) as primary sort
// This is more reliable than file modification time for determining recency
summaryFiles.sort((a, b) => {
  const aInfo = parseReportPath(a.path);
  const bInfo = parseReportPath(b.path);

  if (aInfo && bInfo) {
    // Primary sort: workflow run ID (higher = more recent)
    const aRunId = parseInt(aInfo.workflowRunId, 10);
    const bRunId = parseInt(bInfo.workflowRunId, 10);
    if (bRunId !== aRunId) {
      return bRunId - aRunId;
    }
  }

  // Secondary sort: file modification time
  return b.mtimeMs - a.mtimeMs;
});

// Generate HTML
const html = generateHTML(summaryFiles);

// Write to index.html
const indexPath = path.join(__dirname, 'index.html');
fs.writeFileSync(indexPath, html);

console.log(`Generated index.html with ${summaryFiles.length} reports`);
console.log(`Output: ${indexPath}`);
