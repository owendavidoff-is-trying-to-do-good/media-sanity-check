const Parser = require('rss-parser');
const fs = require('fs-extra');
const path = require('path');

const parser = new Parser();

/**
 * Curated list of RSS feeds and URLs focused on social good, positive news, and social impact
 */
const CONTENT_SOURCES = {
  rssFeeds: [
    // Positive news and social good
    'https://www.goodnewsnetwork.org/feed/',
    'https://www.positive.news/feed/',
    'https://www.upworthy.com/rss.xml',
    'https://www.huffpost.com/section/good-news/feed',
    'https://www.today.com/news/good-news/rss.xml',
    
    // Social impact and nonprofit news
    'https://www.philanthropy.com/feed',
    'https://www.ssireview.org/feed/',
    'https://nonprofitquarterly.org/feed/',
    
    // Technology for good
    'https://techcrunch.com/tag/social-good/feed/',
    'https://www.fastcompany.com/tag/social-impact/feed',
    
    // General news (for comparison)
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.cnn.com/rss/edition.rss',
  ],
  
  urlLists: [
    // Social good organizations
    'https://www.gatesfoundation.org/ideas',
    'https://www.charitywater.org/blog',
    'https://www.kiva.org/about',
    'https://www.givedirectly.org/',
    'https://www.effectivealtruism.org/',
    
    // Positive impact stories
    'https://www.goodnewsnetwork.org/',
    'https://www.positive.news/',
    'https://www.upworthy.com/',
  ]
};

/**
 * Discover URLs from RSS feeds
 * @param {Array<string>} feedUrls - Array of RSS feed URLs
 * @param {number} maxUrlsPerFeed - Maximum URLs to extract per feed
 * @returns {Promise<Array<string>>} Array of discovered URLs
 */
async function discoverFromRssFeeds(feedUrls, maxUrlsPerFeed = 10) {
  const discoveredUrls = [];
  const errors = [];
  
  console.log(`Discovering URLs from ${feedUrls.length} RSS feed(s)...`);
  
  for (const feedUrl of feedUrls) {
    try {
      console.log(`  Parsing: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      const urls = feed.items
        .slice(0, maxUrlsPerFeed)
        .map(item => item.link)
        .filter(Boolean);
      
      discoveredUrls.push(...urls);
      console.log(`    Found ${urls.length} URLs`);
    } catch (error) {
      console.warn(`    Error parsing feed ${feedUrl}: ${error.message}`);
      errors.push({ feed: feedUrl, error: error.message });
    }
  }
  
  if (errors.length > 0) {
    console.warn(`\nWarning: ${errors.length} feed(s) failed to parse`);
  }
  
  return discoveredUrls;
}

/**
 * Discover URLs from a list of seed URLs (by scraping for links)
 * @param {Array<string>} seedUrls - Array of seed URLs to start from
 * @param {number} maxUrlsPerSeed - Maximum URLs to extract per seed
 * @returns {Promise<Array<string>>} Array of discovered URLs
 */
async function discoverFromUrlLists(seedUrls, maxUrlsPerSeed = 5) {
  // For now, just return the seed URLs themselves
  // In a more advanced version, we could scrape these pages for links
  console.log(`Using ${seedUrls.length} seed URL(s) directly`);
  return seedUrls;
}

/**
 * Main discovery function
 * @param {Object} options - Discovery options
 * @returns {Promise<Array<string>>} Array of all discovered URLs
 */
async function discoverContent(options = {}) {
  const {
    useRssFeeds = true,
    useUrlLists = true,
    maxUrlsPerFeed = 10,
    maxUrlsPerSeed = 5,
    maxTotalUrls = 100
  } = options;
  
  const allUrls = [];
  
  // Discover from RSS feeds
  if (useRssFeeds && CONTENT_SOURCES.rssFeeds.length > 0) {
    const rssUrls = await discoverFromRssFeeds(
      CONTENT_SOURCES.rssFeeds,
      maxUrlsPerFeed
    );
    allUrls.push(...rssUrls);
  }
  
  // Discover from URL lists
  if (useUrlLists && CONTENT_SOURCES.urlLists.length > 0) {
    const listUrls = await discoverFromUrlLists(
      CONTENT_SOURCES.urlLists,
      maxUrlsPerSeed
    );
    allUrls.push(...listUrls);
  }
  
  // Remove duplicates
  const uniqueUrls = [...new Set(allUrls)];
  
  // Limit total URLs
  const finalUrls = uniqueUrls.slice(0, maxTotalUrls);
  
  console.log(`\nTotal discovered: ${uniqueUrls.length} unique URLs`);
  console.log(`Using: ${finalUrls.length} URLs (limited by maxTotalUrls)`);
  
  return finalUrls;
}

/**
 * Save discovered URLs to a file
 * @param {Array<string>} urls - URLs to save
 * @param {string} filename - Output filename
 */
async function saveDiscoveredUrls(urls, filename = 'discovered-urls.txt') {
  const filePath = path.join(__dirname, filename);
  const content = urls.join('\n');
  await fs.writeFile(filePath, content, 'utf8');
  console.log(`\nSaved discovered URLs to: ${filePath}`);
  return filePath;
}

// CLI interface
if (require.main === module) {
  discoverContent({
    useRssFeeds: true,
    useUrlLists: true,
    maxUrlsPerFeed: 10,
    maxTotalUrls: 100
  })
    .then(async (urls) => {
      await saveDiscoveredUrls(urls);
      console.log(`\nDiscovery complete. Found ${urls.length} URLs.`);
    })
    .catch(error => {
      console.error('Discovery error:', error);
      process.exit(1);
    });
}

module.exports = { discoverContent, CONTENT_SOURCES };

