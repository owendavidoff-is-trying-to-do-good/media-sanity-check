const fs = require('fs-extra');
const path = require('path');

async function analyzeResults() {
  const resultsPath = path.join(__dirname, 'results', 'results.json');
  const results = await fs.readJson(resultsPath);
  
  const successful = results.filter(r => r.status === 'success');
  const errors = results.filter(r => r.status === 'error');
  
  // Calculate statistics
  const stats = {
    total: results.length,
    successful: successful.length,
    errors: errors.length,
    avgCw: 0,
    avgSd: 0,
    avgDv: 0,
    highScoring: [],
    sourcePerformance: {},
    themes: {},
    topPerformers: []
  };
  
  // Calculate averages
  if (successful.length > 0) {
    stats.avgCw = successful.reduce((sum, r) => sum + (r.Cw || 0), 0) / successful.length;
    stats.avgSd = successful.reduce((sum, r) => sum + (r.Sd || 0), 0) / successful.length;
    stats.avgDv = successful.reduce((sum, r) => sum + (r.Dv || 0), 0) / successful.length;
  }
  
  // Find high-scoring content (Cw > 80, Sd > 75, Dv > 70)
  stats.highScoring = successful.filter(r => 
    (r.Cw || 0) > 80 && (r.Sd || 0) > 75 && (r.Dv || 0) > 70
  );
  
  // Analyze by source domain
  successful.forEach(result => {
    try {
      const url = new URL(result.url);
      const domain = url.hostname.replace('www.', '');
      if (!stats.sourcePerformance[domain]) {
        stats.sourcePerformance[domain] = {
          count: 0,
          totalCw: 0,
          totalSd: 0,
          totalDv: 0,
          avgCw: 0,
          avgSd: 0,
          avgDv: 0
        };
      }
      stats.sourcePerformance[domain].count++;
      stats.sourcePerformance[domain].totalCw += result.Cw || 0;
      stats.sourcePerformance[domain].totalSd += result.Sd || 0;
      stats.sourcePerformance[domain].totalDv += result.Dv || 0;
    } catch (e) {
      // Skip invalid URLs
    }
  });
  
  // Calculate averages per source
  Object.keys(stats.sourcePerformance).forEach(domain => {
    const perf = stats.sourcePerformance[domain];
    perf.avgCw = perf.totalCw / perf.count;
    perf.avgSd = perf.totalSd / perf.count;
    perf.avgDv = perf.totalDv / perf.count;
  });
  
  // Top performers (highest combined score)
  stats.topPerformers = successful
    .map(r => ({
      ...r,
      combinedScore: (r.Cw || 0) + (r.Sd || 0) + (r.Dv || 0)
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 10);
  
  // Extract themes from titles and reasoning
  const themeKeywords = {
    'philanthropy': ['philanthropy', 'donation', 'charity', 'giving', 'fundraising'],
    'environment': ['environment', 'climate', 'solar', 'conservation', 'sustainability'],
    'social_impact': ['social', 'community', 'impact', 'helping', 'support'],
    'technology': ['tech', 'innovation', 'startup', 'digital', 'AI'],
    'health': ['health', 'medical', 'healthcare', 'treatment', 'therapy'],
    'education': ['education', 'school', 'learning', 'student', 'teaching'],
    'animals': ['animal', 'wildlife', 'conservation', 'species', 'rescue']
  };
  
  successful.forEach(result => {
    const text = ((result.title || '') + ' ' + (result.reasoning || '')).toLowerCase();
    Object.keys(themeKeywords).forEach(theme => {
      if (themeKeywords[theme].some(keyword => text.includes(keyword))) {
        if (!stats.themes[theme]) {
          stats.themes[theme] = { count: 0, totalScore: 0, avgScore: 0 };
        }
        stats.themes[theme].count++;
        stats.themes[theme].totalScore += (result.Cw || 0) + (result.Sd || 0) + (result.Dv || 0);
      }
    });
  });
  
  // Calculate theme averages
  Object.keys(stats.themes).forEach(theme => {
    stats.themes[theme].avgScore = stats.themes[theme].totalScore / stats.themes[theme].count;
  });
  
  return stats;
}

// Generate markdown report
function generateReport(stats) {
  const report = `# Content Processing Analysis Report
Generated: ${new Date().toISOString()}

## Executive Summary

- **Total URLs Processed**: ${stats.total}
- **Successful**: ${stats.successful}
- **Errors**: ${stats.errors}
- **Success Rate**: ${((stats.successful / stats.total) * 100).toFixed(1)}%

## Average Scores

- **Content Worth (Cw)**: ${stats.avgCw.toFixed(2)}/100
- **Source Dependability (Sd)**: ${stats.avgSd.toFixed(2)}/100
- **Diversity (Dv)**: ${stats.avgDv.toFixed(2)}/100
- **Combined Average**: ${(stats.avgCw + stats.avgSd + stats.avgDv).toFixed(2)}/300

## High-Scoring Content

Found ${stats.highScoring.length} articles with exceptional scores (Cw > 80, Sd > 75, Dv > 70):

${stats.highScoring.slice(0, 10).map((r, i) => `
${i + 1}. **${r.title}**
   - URL: ${r.url}
   - Scores: Cw=${r.Cw}, Sd=${r.Sd}, Dv=${r.Dv}
   - Key Insight: ${(r.reasoning || '').substring(0, 200)}...
`).join('')}

## Source Performance

Top performing sources by average combined score:

${Object.entries(stats.sourcePerformance)
  .sort((a, b) => (b[1].avgCw + b[1].avgSd + b[1].avgDv) - (a[1].avgCw + a[1].avgSd + a[1].avgDv))
  .slice(0, 10)
  .map(([domain, perf], i) => `
${i + 1}. **${domain}** (${perf.count} articles)
   - Avg Cw: ${perf.avgCw.toFixed(2)}
   - Avg Sd: ${perf.avgSd.toFixed(2)}
   - Avg Dv: ${perf.avgDv.toFixed(2)}
   - Combined: ${(perf.avgCw + perf.avgSd + perf.avgDv).toFixed(2)}
`).join('')}

## Content Themes Analysis

${Object.entries(stats.themes)
  .sort((a, b) => b[1].avgScore - a[1].avgScore)
  .map(([theme, data]) => `
### ${theme.replace('_', ' ').toUpperCase()}
- **Count**: ${data.count} articles
- **Average Combined Score**: ${data.avgScore.toFixed(2)}
`).join('')}

## Top 10 Performing Articles

${stats.topPerformers.map((r, i) => `
${i + 1}. **${r.title}**
   - Combined Score: ${r.combinedScore}
   - Cw: ${r.Cw}, Sd: ${r.Sd}, Dv: ${r.Dv}
   - URL: ${r.url}
`).join('')}

## Key Insights

### What Makes Content Resonate?

1. **High Content Worth (Cw)**: Content that scores high typically:
   - Provides detailed, substantive information
   - Includes specific examples and concrete details
   - Offers actionable insights or solutions
   - Tells compelling human-interest stories

2. **Strong Source Dependability (Sd)**: Top sources share:
   - Established reputation and credibility
   - Multiple expert quotes and citations
   - Transparent editorial standards
   - Fact-based, well-researched reporting

3. **Good Diversity (Dv)**: High diversity scores indicate:
   - Multiple perspectives and viewpoints
   - Quotes from various stakeholders
   - International or cross-cultural perspectives
   - Balanced coverage of complex issues

### Effective Messaging Patterns

Based on the top-performing content, effective social good messaging:

1. **Concrete Impact**: Stories with specific numbers, outcomes, and measurable results
2. **Human Stories**: Personal narratives that connect emotionally
3. **Solution-Oriented**: Focus on positive actions and outcomes rather than just problems
4. **Expert Credibility**: Inclusion of expert quotes and research-backed claims
5. **Multiple Perspectives**: Diverse viewpoints that show comprehensive understanding

### Recommendations for Social Good Tool

1. **Content Curation**: Prioritize sources like:
   - ${Object.entries(stats.sourcePerformance).sort((a, b) => (b[1].avgCw + b[1].avgSd + b[1].avgDv) - (a[1].avgCw + a[1].avgSd + a[1].avgDv)).slice(0, 3).map(([d]) => d).join(', ')}

2. **Messaging Framework**: Focus on:
   - Concrete impact metrics
   - Personal narratives
   - Solution-oriented framing
   - Expert validation
   - Diverse perspectives

3. **Content Themes**: Prioritize themes that score well:
   - ${Object.entries(stats.themes).sort((a, b) => b[1].avgScore - a[1].avgScore).slice(0, 3).map(([t]) => t.replace('_', ' ')).join(', ')}

## Next Steps

1. Analyze top-performing content for specific messaging patterns
2. Develop content templates based on successful frameworks
3. Create a scoring system to identify high-value content
4. Build a curation pipeline using top-performing sources
5. Design gamification elements that reward engagement with high-scoring content
`;

  return report;
}

// Main execution
if (require.main === module) {
  analyzeResults()
    .then(stats => {
      const report = generateReport(stats);
      const reportPath = path.join(__dirname, 'results', 'analysis-report.md');
      fs.writeFileSync(reportPath, report, 'utf8');
      console.log('Analysis complete!');
      console.log(`Report saved to: ${reportPath}`);
      console.log('\n' + '='.repeat(60));
      console.log('KEY FINDINGS');
      console.log('='.repeat(60));
      console.log(`Average Scores: Cw=${stats.avgCw.toFixed(2)}, Sd=${stats.avgSd.toFixed(2)}, Dv=${stats.avgDv.toFixed(2)}`);
      console.log(`High-Scoring Articles: ${stats.highScoring.length}`);
      console.log(`Top Source: ${Object.entries(stats.sourcePerformance).sort((a, b) => (b[1].avgCw + b[1].avgSd + b[1].avgDv) - (a[1].avgCw + a[1].avgSd + a[1].avgDv))[0][0]}`);
    })
    .catch(error => {
      console.error('Analysis error:', error);
      process.exit(1);
    });
}

module.exports = { analyzeResults, generateReport };

