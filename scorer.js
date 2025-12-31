const Anthropic = require('@anthropic-ai/sdk');
const { config } = require('./config');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey
});

// Credit tracking
// Claude 3.5 Sonnet pricing: $3/1M input tokens, $15/1M output tokens
const PRICING = {
  inputPerMillion: 3.0,
  outputPerMillion: 15.0
};

let creditTracker = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  apiCalls: 0,
  errors: 0
};

/**
 * Estimate cost from token usage
 * @param {number} inputTokens - Input tokens used
 * @param {number} outputTokens - Output tokens used
 * @returns {number} Estimated cost in USD
 */
function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * PRICING.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * PRICING.outputPerMillion;
  return inputCost + outputCost;
}

/**
 * Get credit tracking statistics
 * @returns {Object} Credit tracking stats
 */
function getCreditStats() {
  return {
    ...creditTracker,
    estimatedCost: creditTracker.totalCost
  };
}

/**
 * Reset credit tracker
 */
function resetCreditTracker() {
  creditTracker = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    apiCalls: 0,
    errors: 0
  };
}

/**
 * Score content using RFC 2025 SICTP protocol
 * Returns scores for Cw (Content Worth), Sd (Source Dependability), and Dv (Diversity)
 * 
 * @param {string} text - The content text to score
 * @param {string} url - The URL of the content (for context)
 * @returns {Promise<Object>} Scores object with Cw, Sd, Dv, reasoning, and status
 */
async function scoreContent(text, url) {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  if (!text || text.trim().length === 0) {
    return {
      Cw: 0,
      Sd: 0,
      Dv: 0,
      status: 'error',
      reasoning: 'No content extracted from page',
      timestamp: new Date().toISOString()
    };
  }

  const prompt = `You are evaluating content using the RFC 2025 SICTP (Standardized Information Content Trust Protocol) scoring system.

URL: ${url}

Content to evaluate:
${text.substring(0, 10000)}${text.length > 10000 ? '...' : ''}

Please evaluate this content and provide scores for:
1. Cw (Content Worth): 0-100 score indicating the value and quality of the content
2. Sd (Source Dependability): 0-100 score indicating the reliability and trustworthiness of the source
3. Dv (Diversity): 0-100 score indicating the diversity of perspectives and information sources

Respond in JSON format with the following structure:
{
  "Cw": <number 0-100>,
  "Sd": <number 0-100>,
  "Dv": <number 0-100>,
  "reasoning": "<brief explanation of scores>"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Track credit usage
    creditTracker.apiCalls++;
    if (message.usage) {
      creditTracker.totalInputTokens += message.usage.input_tokens;
      creditTracker.totalOutputTokens += message.usage.output_tokens;
      const callCost = estimateCost(message.usage.input_tokens, message.usage.output_tokens);
      creditTracker.totalCost += callCost;
    }

    // Extract JSON from response
    const responseText = message.content[0].text;
    let scores;
    
    // Try to parse JSON from the response
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, responseText];
      scores = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (parseError) {
      // If JSON parsing fails, try to extract numbers from text
      const cwMatch = responseText.match(/Cw[:\s]+(\d+)/i);
      const sdMatch = responseText.match(/Sd[:\s]+(\d+)/i);
      const dvMatch = responseText.match(/Dv[:\s]+(\d+)/i);
      
      scores = {
        Cw: cwMatch ? parseInt(cwMatch[1], 10) : 50,
        Sd: sdMatch ? parseInt(sdMatch[1], 10) : 50,
        Dv: dvMatch ? parseInt(dvMatch[1], 10) : 50,
        reasoning: responseText.substring(0, 500)
      };
    }

    // Ensure scores are within valid range
    scores.Cw = Math.max(0, Math.min(100, scores.Cw || 50));
    scores.Sd = Math.max(0, Math.min(100, scores.Sd || 50));
    scores.Dv = Math.max(0, Math.min(100, scores.Dv || 50));

    return {
      ...scores,
      status: 'success',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    creditTracker.errors++;
    console.error('Error scoring content:', error.message);
    
    // Check if it's a credit/authentication error
    const isCreditError = error.message.includes('credit') || 
                         error.message.includes('billing') ||
                         error.message.includes('quota') ||
                         error.message.includes('401') ||
                         error.message.includes('403');
    
    return {
      Cw: 0,
      Sd: 0,
      Dv: 0,
      status: isCreditError ? 'credit_exhausted' : 'error',
      reasoning: `API Error: ${error.message}`,
      timestamp: new Date().toISOString(),
      creditExhausted: isCreditError
    };
  }
}

module.exports = { 
  scoreContent, 
  getCreditStats, 
  resetCreditTracker,
  estimateCost 
};

