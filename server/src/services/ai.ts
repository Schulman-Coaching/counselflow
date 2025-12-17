/**
 * AI Service - Hybrid Ollama + OpenAI Integration
 *
 * Supports multiple AI providers with automatic fallback:
 * - Ollama: Free, local/self-hosted LLM
 * - OpenAI: Cloud-based, high quality
 */

import { ENV } from '../_core/env';

// Types
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface CompletionResult {
  content: string;
  model: string;
  provider: 'ollama' | 'openai';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Configuration
const config = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
  openaiApiKey: process.env.OPENAI_API_KEY || ENV.openaiApiKey,
  openaiModel: 'gpt-4o-mini',
  provider: (process.env.AI_PROVIDER || 'ollama') as 'ollama' | 'openai' | 'ollama-only',
};

/**
 * Check if Ollama is available
 */
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Call Ollama API
 */
async function callOllama(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const model = options.model || config.ollamaModel;

  const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.message?.content || '',
    model,
    provider: 'ollama',
    usage: data.eval_count ? {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    } : undefined,
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const model = options.model || config.openaiModel;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    model,
    provider: 'openai',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Main completion function with automatic fallback
 */
export async function complete(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  // If OpenAI-only mode
  if (config.provider === 'openai') {
    return callOpenAI(messages, options);
  }

  // Try Ollama first
  if (config.provider === 'ollama' || config.provider === 'ollama-only') {
    const ollamaAvailable = await isOllamaAvailable();

    if (ollamaAvailable) {
      try {
        return await callOllama(messages, options);
      } catch (error) {
        console.warn('[AI] Ollama call failed:', error);
        if (config.provider === 'ollama-only') {
          throw error;
        }
        // Fall through to OpenAI
      }
    } else if (config.provider === 'ollama-only') {
      throw new Error('Ollama is not available and fallback is disabled');
    }
  }

  // Fallback to OpenAI
  if (config.openaiApiKey) {
    console.log('[AI] Falling back to OpenAI');
    return callOpenAI(messages, options);
  }

  throw new Error('No AI provider available');
}

/**
 * Simple text completion helper
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options?: CompletionOptions
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const result = await complete(messages, options);
  return result.content;
}

/**
 * Summarize text
 */
export async function summarize(
  text: string,
  maxLength: number = 500
): Promise<string> {
  return generateText(
    text,
    `You are a helpful assistant. Summarize the following text concisely in ${maxLength} characters or less. Focus on the key points.`
  );
}

/**
 * Analyze legal intake form
 */
export async function analyzeIntake(intakeData: {
  clientName: string;
  caseType: string;
  description: string;
  additionalInfo?: string;
}): Promise<{
  summary: string;
  keyIssues: string[];
  recommendedActions: string[];
  urgency: 'low' | 'medium' | 'high';
  potentialChallenges: string[];
}> {
  const prompt = `Analyze this legal intake form and provide structured insights:

Client: ${intakeData.clientName}
Case Type: ${intakeData.caseType}
Description: ${intakeData.description}
${intakeData.additionalInfo ? `Additional Info: ${intakeData.additionalInfo}` : ''}

Respond in JSON format with these fields:
- summary: Brief case summary (2-3 sentences)
- keyIssues: Array of key legal issues identified
- recommendedActions: Array of recommended next steps
- urgency: "low", "medium", or "high"
- potentialChallenges: Array of potential challenges or complications`;

  const result = await generateText(prompt,
    'You are a legal case analyst. Analyze intake forms and provide structured insights. Always respond with valid JSON.',
    { temperature: 0.3 }
  );

  try {
    // Try to parse JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[AI] Failed to parse intake analysis:', e);
  }

  // Fallback response
  return {
    summary: 'Unable to analyze intake form automatically.',
    keyIssues: [],
    recommendedActions: ['Review intake manually'],
    urgency: 'medium',
    potentialChallenges: [],
  };
}

/**
 * Generate legal narrative/memo
 */
export async function generateNarrative(
  matterType: string,
  facts: string,
  style: 'formal' | 'brief' | 'detailed' = 'formal'
): Promise<string> {
  const styleInstructions = {
    formal: 'Write in formal legal language suitable for court filings.',
    brief: 'Write concisely, focusing on essential points only.',
    detailed: 'Provide comprehensive analysis with supporting details.',
  };

  return generateText(
    `Generate a legal narrative for a ${matterType} matter.

Facts:
${facts}

${styleInstructions[style]}`,
    'You are an experienced legal writer. Generate professional legal narratives and memos.',
    { temperature: 0.5, maxTokens: 4096 }
  );
}

/**
 * Extract key dates and deadlines from text
 */
export async function extractDates(text: string): Promise<Array<{
  date: string;
  description: string;
  isDeadline: boolean;
}>> {
  const prompt = `Extract all dates and deadlines from the following text.
For each date, indicate if it's a deadline (filing deadline, statute of limitations, etc).

Text:
${text}

Respond in JSON format as an array with objects containing:
- date: The date in YYYY-MM-DD format
- description: What the date is for
- isDeadline: true if it's a deadline, false otherwise`;

  const result = await generateText(prompt,
    'You are a legal document analyzer. Extract dates and deadlines accurately. Always respond with valid JSON array.',
    { temperature: 0.1 }
  );

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[AI] Failed to parse dates:', e);
  }

  return [];
}

/**
 * Check AI service health
 */
export async function checkHealth(): Promise<{
  ollama: { available: boolean; models?: string[] };
  openai: { available: boolean };
  activeProvider: string;
}> {
  const ollamaAvailable = await isOllamaAvailable();
  let ollamaModels: string[] = [];

  if (ollamaAvailable) {
    try {
      const response = await fetch(`${config.ollamaBaseUrl}/api/tags`);
      const data = await response.json();
      ollamaModels = data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      // Ignore
    }
  }

  return {
    ollama: {
      available: ollamaAvailable,
      models: ollamaModels,
    },
    openai: {
      available: !!config.openaiApiKey,
    },
    activeProvider: config.provider,
  };
}

// Export types
export type { ChatMessage, CompletionOptions, CompletionResult };
