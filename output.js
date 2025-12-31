const fs = require('fs-extra');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { config } = require('./config');

/**
 * Save results to JSON file
 * @param {Array<Object>} results - Array of processing results
 * @param {string} filename - Output filename (default: results.json)
 */
async function saveJson(results, filename = 'results.json') {
  const filePath = path.join(config.outputDir, filename);
  await fs.writeJson(filePath, results, { spaces: 2 });
  console.log(`Saved JSON results to: ${filePath}`);
  return filePath;
}

/**
 * Save results to CSV file
 * @param {Array<Object>} results - Array of processing results
 * @param {string} filename - Output filename (default: results.csv)
 */
async function saveCsv(results, filename = 'results.csv') {
  const filePath = path.join(config.outputDir, filename);
  
  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'url', title: 'URL' },
      { id: 'title', title: 'Title' },
      { id: 'Cw', title: 'Content Worth (Cw)' },
      { id: 'Sd', title: 'Source Dependability (Sd)' },
      { id: 'Dv', title: 'Diversity (Dv)' },
      { id: 'status', title: 'Status' },
      { id: 'processedAt', title: 'Processed At' },
      { id: 'reasoning', title: 'Reasoning' }
    ]
  });
  
  await csvWriter.writeRecords(results);
  console.log(`Saved CSV results to: ${filePath}`);
  return filePath;
}

/**
 * Generate HTML report from results
 * @param {Array<Object>} results - Array of processing results
 * @param {string} filename - Output filename (default: report.html)
 */
async function saveHtml(results, filename = 'report.html') {
  const filePath = path.join(config.outputDir, filename);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Processing Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #333;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .result {
      background: white;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #4CAF50;
    }
    .result.error {
      border-left-color: #f44336;
    }
    .result h3 {
      margin-top: 0;
      color: #333;
    }
    .result a {
      color: #2196F3;
      text-decoration: none;
      word-break: break-all;
    }
    .result a:hover {
      text-decoration: underline;
    }
    .scores {
      display: flex;
      gap: 20px;
      margin: 15px 0;
      flex-wrap: wrap;
    }
    .score {
      flex: 1;
      min-width: 150px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    .score-label {
      font-weight: bold;
      color: #666;
      font-size: 0.9em;
      margin-bottom: 5px;
    }
    .score-value {
      font-size: 2em;
      font-weight: bold;
      color: #4CAF50;
    }
    .score-value.low {
      color: #f44336;
    }
    .score-value.medium {
      color: #ff9800;
    }
    .reasoning {
      margin-top: 15px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 0.9em;
      color: #666;
    }
    .meta {
      font-size: 0.85em;
      color: #999;
      margin-top: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
    }
    .status-badge.success {
      background: #4CAF50;
      color: white;
    }
    .status-badge.error {
      background: #f44336;
      color: white;
    }
  </style>
</head>
<body>
  <h1>Content Processing Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total URLs Processed:</strong> ${results.length}</p>
    <p><strong>Successful:</strong> ${results.filter(r => r.status === 'success').length}</p>
    <p><strong>Errors:</strong> ${results.filter(r => r.status === 'error').length}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  ${results.map(result => {
    const avgScore = (result.Cw + result.Sd + result.Dv) / 3;
    const scoreClass = avgScore >= 70 ? '' : avgScore >= 40 ? 'medium' : 'low';
    
    return `
    <div class="result ${result.status === 'error' ? 'error' : ''}">
      <h3><a href="${result.url}" target="_blank">${result.title || result.url}</a></h3>
      <div class="meta">
        <span class="status-badge ${result.status === 'success' ? 'success' : 'error'}">${result.status}</span>
        <span style="margin-left: 10px;">Processed: ${new Date(result.processedAt).toLocaleString()}</span>
      </div>
      ${result.status === 'success' ? `
      <div class="scores">
        <div class="score">
          <div class="score-label">Content Worth (Cw)</div>
          <div class="score-value ${result.Cw >= 70 ? '' : result.Cw >= 40 ? 'medium' : 'low'}">${result.Cw}</div>
        </div>
        <div class="score">
          <div class="score-label">Source Dependability (Sd)</div>
          <div class="score-value ${result.Sd >= 70 ? '' : result.Sd >= 40 ? 'medium' : 'low'}">${result.Sd}</div>
        </div>
        <div class="score">
          <div class="score-label">Diversity (Dv)</div>
          <div class="score-value ${result.Dv >= 70 ? '' : result.Dv >= 40 ? 'medium' : 'low'}">${result.Dv}</div>
        </div>
      </div>
      <div class="reasoning">
        <strong>Reasoning:</strong> ${result.reasoning || 'No reasoning provided'}
      </div>
      ` : `
      <div class="reasoning">
        <strong>Error:</strong> ${result.reasoning || 'Unknown error'}
      </div>
      `}
    </div>
    `;
  }).join('')}
</body>
</html>`;
  
  await fs.writeFile(filePath, html, 'utf8');
  console.log(`Saved HTML report to: ${filePath}`);
  return filePath;
}

/**
 * Save results in all formats (JSON, CSV, HTML)
 * @param {Array<Object>} results - Array of processing results
 * @param {string} prefix - Optional prefix for filenames (e.g., timestamp)
 */
async function saveAll(results, prefix = '') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const suffix = prefix ? `-${prefix}` : `-${timestamp}`;
  
  const jsonPath = await saveJson(results, `results${suffix}.json`);
  const csvPath = await saveCsv(results, `results${suffix}.csv`);
  const htmlPath = await saveHtml(results, `report${suffix}.html`);
  
  // Also save latest versions
  await saveJson(results, 'results.json');
  await saveCsv(results, 'results.csv');
  await saveHtml(results, 'report.html');
  
  return { jsonPath, csvPath, htmlPath };
}

module.exports = { saveJson, saveCsv, saveHtml, saveAll };

