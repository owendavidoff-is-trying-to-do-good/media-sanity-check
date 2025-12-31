const fs = require('fs-extra');
const path = require('path');
const Parser = require('rss-parser');
const { processUrls } = require('./processor');
const { saveAll } = require('./output');
const { config } = require('./config');

const parser = new Parser();

/**
 * Parse RSS feed and extract URLs
 * @param {string} feedUrl - RSS feed URL
 * @returns {Promise<Array<string>>} Array of URLs from the feed
 */
async function parseRssFeed(feedUrl) {
  try {
    console.log(`Parsing RSS feed: ${feedUrl}`);
    const feed = await parser.parseURL(feedUrl);
    const urls = feed.items.map(item => item.link).filter(Boolean);
    console.log(`Found ${urls.length} URLs in RSS feed`);
    return urls;
  } catch (error) {
    console.error(`Error parsing RSS feed: ${error.message}`);
    throw error;
  }
}

/**
 * Read URLs from a file (one URL per line)
 * @param {string} filePath - Path to file containing URLs
 * @returns {Promise<Array<string>>} Array of URLs
 */
async function readUrlsFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://')));
    console.log(`Read ${urls.length} URLs from file: ${filePath}`);
    return urls;
  } catch (error) {
    console.error(`Error reading URL file: ${error.message}`);
    throw error;
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let urls = [];
  let outputPrefix = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--url' && args[i + 1]) {
      urls.push(args[i + 1]);
      i++;
    } else if (arg === '--file' && args[i + 1]) {
      const fileUrls = await readUrlsFromFile(args[i + 1]);
      urls.push(...fileUrls);
      i++;
    } else if (arg === '--rss' && args[i + 1]) {
      const feedUrls = await parseRssFeed(args[i + 1]);
      urls.push(...feedUrls);
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      // Output directory is handled by config, but we can set prefix
      outputPrefix = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node index.js [options]

Options:
  --url <url>           Process a single URL
  --file <path>         Process URLs from a file (one per line)
  --rss <url>           Process URLs from an RSS feed
  --output <prefix>     Output file prefix (optional)
  --help, -h            Show this help message

Examples:
  node index.js --url "https://example.com"
  node index.js --file urls.txt
  node index.js --rss "https://example.com/feed.xml"
  node index.js --url "https://example.com" --output "batch1"

Environment Variables:
  ANTHROPIC_API_KEY     Required: Your Anthropic API key
  OUTPUT_DIR            Optional: Output directory (default: ./results)
  HEADLESS              Optional: Set to 'false' to show browser (default: true)
  TIMEOUT               Optional: Page load timeout in ms (default: 30000)
      `);
      process.exit(0);
    }
  }
  
  // Validate inputs
  if (urls.length === 0) {
    console.error('Error: No URLs provided. Use --url, --file, or --rss options.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }
  
  // Check for API key
  if (!config.anthropicApiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Please set it before running:');
    console.error('  Windows: set ANTHROPIC_API_KEY=your_key_here');
    console.error('  Linux/Mac: export ANTHROPIC_API_KEY=your_key_here');
    process.exit(1);
  }
  
  console.log(`\nStarting processing of ${urls.length} URL(s)...\n`);
  
  try {
    // Process URLs
    const results = await processUrls(urls);
    
    // Save results
    console.log('\nSaving results...');
    const outputPaths = await saveAll(results, outputPrefix);
    
    console.log('\n✓ Processing complete!');
    console.log(`  JSON: ${outputPaths.jsonPath}`);
    console.log(`  CSV:  ${outputPaths.csvPath}`);
    console.log(`  HTML: ${outputPaths.htmlPath}`);
    
    // Print summary
    const successful = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;
    console.log(`\nSummary: ${successful} successful, ${errors} errors`);
    
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main, parseRssFeed, readUrlsFromFile };

