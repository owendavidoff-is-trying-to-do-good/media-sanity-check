# Standalone Content Processing Application

A Node.js application for batch processing content using RFC 2025 SICTP protocol. Processes URLs, RSS feeds, and batch files, outputting results to JSON, CSV, and HTML reports. Can run autonomously on a schedule without user input.

## Features

- **Headless Browser Processing**: Uses Puppeteer to load and extract content from web pages
- **Content Scoring**: Scores content using Anthropic API (Cw, Sd, Dv metrics)
- **Multiple Input Sources**: Process single URLs, files with URL lists, or RSS feeds
- **Multiple Output Formats**: JSON (detailed), CSV (summary), HTML (visual report)
- **Autonomous Scheduling**: Run tasks automatically on a schedule using cron expressions

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set your Anthropic API key:
```bash
# Windows
set ANTHROPIC_API_KEY=your_api_key_here

# Linux/Mac
export ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

### Manual Processing

Process a single URL:
```bash
node index.js --url "https://example.com"
```

Process URLs from a file (one URL per line):
```bash
node index.js --file urls.txt
```

Process URLs from an RSS feed:
```bash
node index.js --rss "https://example.com/feed.xml"
```

Combine multiple sources:
```bash
node index.js --url "https://example.com" --file urls.txt --rss "https://example.com/feed.xml"
```

### Autonomous Scheduled Processing

1. Configure your tasks in `schedule-config.json`:
```json
{
  "tasks": [
    {
      "name": "Daily News Check",
      "schedule": "0 9 * * *",
      "urls": ["https://example.com/article1"]
    },
    {
      "name": "RSS Feed Monitor",
      "schedule": "0 */6 * * *",
      "rss": "https://example.com/feed.xml"
    }
  ]
}
```

2. Start the scheduler:
```bash
npm run schedule
# or
node scheduler.js
```

The scheduler will run continuously and execute tasks according to their cron schedules.

### Cron Schedule Format

The schedule uses standard cron syntax: `minute hour day month day-of-week`

Examples:
- `0 9 * * *` - Every day at 9:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Every Sunday at midnight
- `*/30 * * * *` - Every 30 minutes

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` (required): Your Anthropic API key
- `OUTPUT_DIR` (optional): Directory for output files (default: `./results`)
- `HEADLESS` (optional): Set to `false` to show browser (default: `true`)
- `TIMEOUT` (optional): Page load timeout in milliseconds (default: `30000`)

### Schedule Configuration

Edit `schedule-config.json` to configure autonomous tasks. Each task can have:
- `name`: Task identifier
- `schedule`: Cron expression for when to run
- `urls`: Array of URLs to process
- `file`: Path to file containing URLs (one per line)
- `rss`: RSS feed URL to process
- `description`: Optional description

## Output

Results are saved to the `results/` directory (or `OUTPUT_DIR` if set):

- `results.json` - Latest results in JSON format
- `results.csv` - Latest results in CSV format
- `report.html` - Latest visual HTML report
- Timestamped versions are also saved for historical tracking

## Project Structure

```
standalone/
├── index.js              # Main CLI entry point
├── scheduler.js          # Autonomous scheduler
├── processor.js          # Puppeteer page processing
├── scorer.js            # Anthropic API scoring
├── output.js             # File output (JSON, CSV, HTML)
├── config.js             # Configuration
├── schedule-config.json  # Scheduler task configuration
└── package.json          # Dependencies
```

## Requirements

- Node.js 16+ 
- Anthropic API key
- Internet connection for processing URLs

## Notes

- The application uses headless Chrome via Puppeteer
- Content is extracted using common article/content selectors
- Scoring uses Claude 3.5 Sonnet model via Anthropic API
- Results are saved in multiple formats for different use cases

