const puppeteer = require('puppeteer');
const { scoreContent } = require('./scorer');
const { config } = require('./config');

/**
 * Extract text content from a page using content selectors
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<string>} Extracted text content
 */
async function extractContent(page) {
  try {
    // Try each selector until we find content
    for (const selector of config.contentSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate((el) => el.innerText, element);
          if (text && text.trim().length > 100) {
            return text.trim();
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Fallback: get body text
    const bodyText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    return bodyText ? bodyText.trim() : '';
  } catch (error) {
    console.error('Error extracting content:', error.message);
    return '';
  }
}

/**
 * Process a single URL: load page, extract content, and score it
 * @param {string} url - URL to process
 * @returns {Promise<Object>} Processing result with scores and metadata
 */
async function processUrl(url) {
  let browser = null;
  
  try {
    console.log(`Processing: ${url}`);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to URL with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);
    
    // Extract content
    const content = await extractContent(page);
    
    // Get page title
    const title = await page.title();
    
    // Score content
    const scores = await scoreContent(content, url);
    
    // Close browser
    await browser.close();
    browser = null;
    
    return {
      url,
      title,
      contentLength: content.length,
      contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      ...scores,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    console.error(`Error processing ${url}:`, error.message);
    
    return {
      url,
      title: '',
      contentLength: 0,
      contentPreview: '',
      Cw: 0,
      Sd: 0,
      Dv: 0,
      status: 'error',
      reasoning: `Processing error: ${error.message}`,
      processedAt: new Date().toISOString()
    };
  }
}

/**
 * Process multiple URLs in sequence
 * @param {Array<string>} urls - Array of URLs to process
 * @returns {Promise<Array<Object>>} Array of processing results
 */
async function processUrls(urls) {
  const results = [];
  
  for (const url of urls) {
    const result = await processUrl(url);
    results.push(result);
    
    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

module.exports = { processUrl, processUrls };

