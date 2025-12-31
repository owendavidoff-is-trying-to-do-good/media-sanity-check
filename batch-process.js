const { discoverContent } = require('./discover');
const { processUrls } = require('./processor');
const { saveAll } = require('./output');
const { getCreditStats, resetCreditTracker } = require('./scorer');
const { config } = require('./config');
const fs = require('fs-extra');
const path = require('path');

/**
 * Batch process discovered content until credits are exhausted
 */
async function batchProcess() {
  console.log('='.repeat(60));
  console.log('Starting Batch Content Processing');
  console.log('='.repeat(60));
  console.log('');
  
  // Reset credit tracker
  resetCreditTracker();
  
  // Discover content
  console.log('Phase 1: Discovering content sources...\n');
  const urls = await discoverContent({
    useRssFeeds: true,
    useUrlLists: true,
    maxUrlsPerFeed: 10,
    maxTotalUrls: 200 // Start with more URLs than we can process
  });
  
  if (urls.length === 0) {
    console.error('No URLs discovered. Exiting.');
    process.exit(1);
  }
  
  console.log(`\nDiscovered ${urls.length} URLs to process\n`);
  console.log('Phase 2: Processing content (will stop when credits exhausted)...\n');
  console.log('='.repeat(60));
  
  const allResults = [];
  const batchSize = 5; // Process in small batches
  let processedCount = 0;
  let creditExhausted = false;
  
  // Process URLs in batches
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`\nBatch ${batchNumber} (URLs ${i + 1}-${Math.min(i + batchSize, urls.length)} of ${urls.length})`);
    
    try {
      const batchResults = await processUrls(batch);
      allResults.push(...batchResults);
      processedCount += batch.length;
      
      // Check for credit exhaustion
      const creditErrors = batchResults.filter(r => r.creditExhausted);
      if (creditErrors.length > 0) {
        creditExhausted = true;
        console.log('\n⚠️  Credit exhaustion detected. Stopping processing.');
        break;
      }
      
      // Show progress and credit stats
      const stats = getCreditStats();
      console.log(`  Processed: ${processedCount}/${urls.length}`);
      console.log(`  API Calls: ${stats.apiCalls}`);
      console.log(`  Estimated Cost: $${stats.estimatedCost.toFixed(4)}`);
      console.log(`  Input Tokens: ${stats.totalInputTokens.toLocaleString()}`);
      console.log(`  Output Tokens: ${stats.totalOutputTokens.toLocaleString()}`);
      
      // Check for $10 credit limit
      const CREDIT_LIMIT = 10.0;
      if (stats.estimatedCost >= CREDIT_LIMIT) {
        creditExhausted = true;
        console.log(`\n⚠️  Credit limit reached: $${stats.estimatedCost.toFixed(4)} >= $${CREDIT_LIMIT}. Stopping processing.`);
        break;
      }
      
      // Save incrementally (don't lose data if process stops)
      if (allResults.length > 0 && allResults.length % 10 === 0) {
        const incrementalPath = path.join(config.outputDir, `results-incremental-${Date.now()}.json`);
        await fs.writeJson(incrementalPath, allResults, { spaces: 2 });
        console.log(`  💾 Incremental save: ${incrementalPath}`);
      }
      
    } catch (error) {
      console.error(`\nError processing batch ${batchNumber}:`, error.message);
      
      // Check if it's a credit-related error
      if (error.message.includes('credit') || 
          error.message.includes('billing') ||
          error.message.includes('quota') ||
          error.message.includes('401') ||
          error.message.includes('403')) {
        creditExhausted = true;
        console.log('\n⚠️  Credit exhaustion detected from error. Stopping processing.');
        break;
      }
      
      // Continue with next batch on other errors
      continue;
    }
  }
  
  // Final save
  console.log('\n' + '='.repeat(60));
  console.log('Processing Complete');
  console.log('='.repeat(60));
  
  if (allResults.length > 0) {
    console.log('\nSaving final results...');
    const outputPaths = await saveAll(allResults, 'batch-final');
    console.log(`\n✓ Results saved:`);
    console.log(`  JSON: ${outputPaths.jsonPath}`);
    console.log(`  CSV:  ${outputPaths.csvPath}`);
    console.log(`  HTML: ${outputPaths.htmlPath}`);
  }
  
  // Final credit stats
  const finalStats = getCreditStats();
  console.log('\n' + '='.repeat(60));
  console.log('Credit Usage Summary');
  console.log('='.repeat(60));
  console.log(`Total URLs Processed: ${processedCount}`);
  console.log(`Successful: ${allResults.filter(r => r.status === 'success').length}`);
  console.log(`Errors: ${allResults.filter(r => r.status === 'error').length}`);
  console.log(`API Calls: ${finalStats.apiCalls}`);
  console.log(`Input Tokens: ${finalStats.totalInputTokens.toLocaleString()}`);
  console.log(`Output Tokens: ${finalStats.totalOutputTokens.toLocaleString()}`);
  console.log(`Estimated Cost: $${finalStats.estimatedCost.toFixed(4)}`);
  console.log(`Credit Exhausted: ${creditExhausted ? 'Yes' : 'No'}`);
  console.log('='.repeat(60));
  
  return {
    results: allResults,
    stats: finalStats,
    creditExhausted
  };
}

// Run if called directly
if (require.main === module) {
  batchProcess()
    .then(({ results, stats, creditExhausted }) => {
      console.log(`\n✓ Batch processing complete. Processed ${results.length} URLs.`);
      if (creditExhausted) {
        console.log('⚠️  Processing stopped due to credit exhaustion.');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('\n✗ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { batchProcess };

