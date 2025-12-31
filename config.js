const fs = require('fs-extra');
const path = require('path');

// Load configuration from environment variables or config file
const config = {
  // Anthropic API key - load from environment variable
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  
  // Output directory for results
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, 'results'),
  
  // Processing options
  headless: process.env.HEADLESS !== 'false', // Default to headless
  timeout: parseInt(process.env.TIMEOUT || '30000', 10), // 30 seconds default
  
  // Content selectors (same as extension)
  contentSelectors: [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content'
  ],
  
  // Schedule configuration file
  scheduleConfigPath: path.join(__dirname, 'schedule-config.json')
};

// Ensure output directory exists
fs.ensureDirSync(config.outputDir);

// Load schedule configuration if it exists
let scheduleConfig = null;
if (fs.existsSync(config.scheduleConfigPath)) {
  try {
    scheduleConfig = fs.readJsonSync(config.scheduleConfigPath);
  } catch (error) {
    console.warn('Warning: Could not load schedule-config.json:', error.message);
  }
}

module.exports = {
  config,
  scheduleConfig
};

