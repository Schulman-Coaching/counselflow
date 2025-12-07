import { ENV } from "./env";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMOptions {
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    index: number;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function invokeLLM(options: LLMOptions): Promise<LLMResponse> {
  const { messages, maxTokens = 1000, temperature = 0.7 } = options;

  if (!ENV.openaiApiKey) {
    // Return mock response for development without API key
    console.warn("[LLM] No OpenAI API key configured, returning mock response");
    const lastUserMessage = messages.find(m => m.role === "user")?.content || "";
    return {
      choices: [{
        message: {
          content: generateMockResponse(lastUserMessage),
          role: "assistant",
        },
        index: 0,
        finish_reason: "stop",
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data as LLMResponse;
  } catch (error) {
    console.error("[LLM] Error invoking OpenAI:", error);
    throw error;
  }
}

function generateMockResponse(prompt: string): string {
  const promptLower = prompt.toLowerCase();

  if (promptLower.includes("billing") || promptLower.includes("narrative")) {
    return "Reviewed case materials and drafted initial correspondence regarding ongoing litigation matters. Conducted legal research on applicable statutes and precedents.";
  }

  if (promptLower.includes("intake") || promptLower.includes("analyze")) {
    return JSON.stringify({
      caseType: "Civil Litigation",
      urgency: false,
      estimatedValue: "medium",
      keyConcerns: ["Statute of limitations consideration", "Evidence preservation"],
      recommendedNextSteps: ["Schedule initial consultation", "Request relevant documentation"],
    });
  }

  if (promptLower.includes("conflict") || promptLower.includes("check")) {
    return JSON.stringify({
      hasConflict: false,
      potentialMatches: [],
      recommendation: "No conflicts detected. Safe to proceed with intake.",
    });
  }

  if (promptLower.includes("document") || promptLower.includes("draft") || promptLower.includes("template")) {
    return "This document has been drafted based on the provided template and variables. Please review all sections carefully before finalizing.";
  }

  return "AI analysis complete. Please review the results and make any necessary adjustments.";
}
