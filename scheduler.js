const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const { config, scheduleConfig } = require('./config');
const { main } = require('./index');
const { parseRssFeed, readUrlsFromFile } = require('./index');

/**
 * Execute a scheduled task
 * @param {Object} task - Task configuration from schedule-config.json
 */
async function executeTask(task) {
  console.log(`\n[${new Date().toISOString()}] Executing task: ${task.name || 'Unnamed Task'}`);
  
  try {
    const urls = [];
    
    // Collect URLs from all sources
    if (task.urls && Array.isArray(task.urls)) {
      urls.push(...task.urls);
    }
    
    if (task.file) {
      const fileUrls = await readUrlsFromFile(task.file);
      urls.push(...fileUrls);
    }
    
    if (task.rss) {
      const feedUrls = await parseRssFeed(task.rss);
      urls.push(...feedUrls);
    }
    
    if (urls.length === 0) {
      console.warn(`  Warning: No URLs found for task: ${task.name || 'Unnamed Task'}`);
      return;
    }
    
    console.log(`  Processing ${urls.length} URL(s)...`);
    
    // Import processor and output modules
    const { processUrls } = require('./processor');
    const { saveAll } = require('./output');
    
    // Process URLs
    const results = await processUrls(urls);
    
    // Save results with task name as prefix
    const prefix = task.name ? task.name.replace(/[^a-zA-Z0-9]/g, '-') : 'scheduled';
    const outputPaths = await saveAll(results, prefix);
    
    console.log(`  ✓ Task completed successfully`);
    console.log(`    Results saved with prefix: ${prefix}`);
    
    // Log summary
    const successful = results.filter(r => r.status === 'success').length;
    const errors = results.filter(r => r.status === 'error').length;
    console.log(`    Summary: ${successful} successful, ${errors} errors`);
    
  } catch (error) {
    console.error(`  ✗ Error executing task: ${error.message}`);
    console.error(error.stack);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  if (!scheduleConfig) {
    console.error('Error: schedule-config.json not found or invalid.');
    console.error('Please create schedule-config.json with your task configurations.');
    console.error('See schedule-config.example.json for an example.');
    process.exit(1);
  }
  
  if (!config.anthropicApiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    process.exit(1);
  }
  
  console.log('Starting autonomous scheduler...');
  console.log(`Loaded ${scheduleConfig.tasks?.length || 0} task(s) from schedule-config.json\n`);
  
  if (!scheduleConfig.tasks || scheduleConfig.tasks.length === 0) {
    console.warn('Warning: No tasks configured. Add tasks to schedule-config.json');
    return;
  }
  
  // Schedule each task
  scheduleConfig.tasks.forEach((task, index) => {
    if (!task.schedule) {
      console.warn(`Task ${index + 1} (${task.name || 'Unnamed'}) has no schedule, skipping...`);
      return;
    }
    
    if (!task.urls && !task.file && !task.rss) {
      console.warn(`Task ${index + 1} (${task.name || 'Unnamed'}) has no URL sources, skipping...`);
      return;
    }
    
    // Validate cron expression
    if (!cron.validate(task.schedule)) {
      console.error(`Invalid cron expression for task ${index + 1} (${task.name || 'Unnamed'}): ${task.schedule}`);
      return;
    }
    
    // Schedule the task
    cron.schedule(task.schedule, () => {
      executeTask(task);
    });
    
    console.log(`✓ Scheduled task: ${task.name || `Task ${index + 1}`}`);
    console.log(`  Schedule: ${task.schedule}`);
    console.log(`  Next run: ${getNextRunTime(task.schedule)}`);
    console.log('');
  });
  
  console.log('Scheduler is running. Press Ctrl+C to stop.\n');
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\nShutting down scheduler...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\nShutting down scheduler...');
    process.exit(0);
  });
}

/**
 * Get next run time for a cron expression (approximate)
 * @param {string} cronExpression - Cron expression
 * @returns {string} Next run time description
 */
function getNextRunTime(cronExpression) {
  // This is a simplified version - for accurate next run times, 
  // you'd need a proper cron parser library
  const parts = cronExpression.split(' ');
  
  if (parts.length >= 5) {
    // Try to provide a helpful description
    if (parts[0] === '*' && parts[1] === '*' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
      return 'Every minute';
    }
    if (parts[1] === '0' && parts[2] === '0') {
      return `Daily at ${parts[1]}:${parts[2]}`;
    }
  }
  
  return 'See cron expression';
}

// Run if called directly
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler, executeTask };

