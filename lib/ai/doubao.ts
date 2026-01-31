/**
 * Doubao AI Provider (豆包 AI - 字节跳动)
 * Uses native fetch API for API calls
 */

export interface DoubaoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DoubaoResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const DEFAULT_VISION_TIMEOUT_MS = 60000;

export class DoubaoProvider {
  private apiKey: string;
  private endpoint: string;
  private model: string;
  private visionModel: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(config: {
    apiKey: string;
    endpoint: string;
    model: string;
    visionModel?: string;
    maxRetries?: number;
    retryDelay?: number;
  }) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.model = config.model;
    this.visionModel = config.visionModel ?? config.model;
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
    if (config.retryDelay !== undefined) this.retryDelay = config.retryDelay;
  }

  /**
   * Chat completion with retry logic
   */
  async chat(
    messages: DoubaoMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<DoubaoResponse> {
    const payload = {
      model: this.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    };

    console.log('🔥 Doubao API Request:', {
      url: this.endpoint,
      model: this.model,
      messageCount: messages.length,
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Doubao API Error:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            attempt: attempt + 1,
          });

          throw new Error(
            `Doubao API error (${response.status} ${response.statusText}): ${errorText}`
          );
        }

        const data: DoubaoResponse = await response.json();

        console.log('✅ Doubao API Success:', {
          hasContent: !!data.choices?.[0]?.message?.content,
          contentLength: data.choices?.[0]?.message?.content?.length || 0,
          usage: data.usage,
        });

        return data;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `⚠️ Doubao attempt ${attempt + 1}/${this.maxRetries} failed:`,
          error.message
        );

        // Don't retry on auth errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Doubao API call failed after retries');
  }

  /**
   * Vision: chat with image (VisualQuestionAnswering).
   * Uses vision model and content array with image_url + text. Supports data URL for base64.
   */
  async chatWithImage(
    prompt: string,
    imageBase64: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
      timeoutMs?: number;
    }
  ): Promise<DoubaoResponse> {
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    const payload = {
      model: this.visionModel,
      max_completion_tokens: options?.maxTokens ?? 4096,
      reasoning_effort: options?.reasoningEffort ?? 'medium',
      temperature: options?.temperature ?? 0.7,
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'image_url' as const, image_url: { url: imageUrl } },
            { type: 'text' as const, text: prompt },
          ],
        },
      ],
    };

    const timeoutMs = options?.timeoutMs ?? DEFAULT_VISION_TIMEOUT_MS;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      console.log('🔥 Doubao Vision Request:', {
        url: this.endpoint,
        model: this.visionModel,
        promptLength: prompt.length,
      });
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Doubao Vision API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.slice(0, 200),
        });
        throw new Error(
          `Doubao Vision error (${response.status} ${response.statusText}): ${errorText}`
        );
      }
      const data: DoubaoResponse = await response.json();
      console.log('✅ Doubao Vision Success:', {
        hasContent: !!data.choices?.[0]?.message?.content,
        contentLength: data.choices?.[0]?.message?.content?.length ?? 0,
      });
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('Doubao Vision request timeout');
      }
      throw err;
    }
  }

  /**
   * Parse JSON from response text (handles markdown code blocks and incomplete JSON)
   */
  static parseJSONResponse(text: string): any {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    const trimmed = text.trim();
    
    // Log first 200 chars for debugging
    console.log('🔍 Parsing JSON response (first 200 chars):', trimmed.substring(0, 200));

    // Try direct parse first
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (directError) {
      console.log('⚠️ Direct JSON parse failed, trying markdown removal...');
      
      // Remove markdown code blocks (more comprehensive)
      let withoutMarkdown = trimmed
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^json\s*/i, '')
        .trim();

      try {
        return JSON.parse(withoutMarkdown);
      } catch (markdownError) {
        console.log('⚠️ Markdown removal parse failed, trying regex extraction...');
        
        // Try to find JSON object in text (more robust regex)
        const jsonMatch = withoutMarkdown.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          
          try {
            return JSON.parse(jsonStr);
          } catch (regexError) {
            // Check if JSON is incomplete (common issue with long responses)
            const openBraces = (jsonStr.match(/\{/g) || []).length;
            const closeBraces = (jsonStr.match(/\}/g) || []).length;
            const openBrackets = (jsonStr.match(/\[/g) || []).length;
            const closeBrackets = (jsonStr.match(/\]/g) || []).length;
            
            // If braces/brackets are unbalanced, try to fix
            if (openBraces > closeBraces || openBrackets > closeBrackets) {
              console.log('⚠️ Detected incomplete JSON, attempting to fix...');
              
              // Try to close unclosed structures
              let fixed = jsonStr;
              const missingBraces = openBraces - closeBraces;
              const missingBrackets = openBrackets - closeBrackets;
              
              // Find the last complete structure before truncation
              // Look for the last complete key-value pair or array element
              let lastValidPos = fixed.length;
              
              // Try to find where the JSON was truncated
              // Look for incomplete string values
              const incompleteStringMatch = fixed.match(/("|')([^"']*)$/);
              if (incompleteStringMatch) {
                // Find the start of this string
                const beforeString = fixed.substring(0, fixed.length - incompleteStringMatch[0].length);
                // Find the last complete structure
                const lastQuote = beforeString.lastIndexOf('"');
                if (lastQuote > 0) {
                  // Check if this is a key or value
                  const beforeLastQuote = beforeString.substring(0, lastQuote);
                  const keyMatch = beforeLastQuote.match(/":\s*"([^"]*)$/);
                  if (keyMatch) {
                    // This is an incomplete value, remove it
                    lastValidPos = beforeLastQuote.lastIndexOf('":');
                    if (lastValidPos > 0) {
                      fixed = fixed.substring(0, lastValidPos + 2) + '""';
                    }
                  }
                }
              }
              
              // Remove incomplete trailing content
              if (lastValidPos < fixed.length) {
                fixed = fixed.substring(0, lastValidPos);
                // Remove trailing comma
                fixed = fixed.replace(/,\s*$/, '');
              }
              
              // Close unclosed strings
              const unclosedStringMatch = fixed.match(/("|')([^"']*)$/);
              if (unclosedStringMatch) {
                fixed = fixed.replace(/(["'])([^"']*)$/, '$1$2"');
              }
              
              // Close arrays
              for (let i = 0; i < missingBrackets; i++) {
                fixed = fixed.replace(/,\s*$/, '');
                fixed += ']';
              }
              
              // Close objects
              for (let i = 0; i < missingBraces; i++) {
                fixed = fixed.replace(/,\s*$/, '');
                fixed += '}';
              }
              
              try {
                const parsed = JSON.parse(fixed);
                console.log('✅ Successfully fixed incomplete JSON');
                return parsed;
              } catch (fixError) {
                console.error('❌ Failed to fix incomplete JSON');
                // Try to extract partial data
                try {
                  // Extract what we can from the beginning
                  const partialMatch = jsonStr.match(/^\s*\{[\s\S]{0,5000}/);
                  if (partialMatch) {
                    // Try to find the last complete object/array
                    let partial = partialMatch[0];
                    // Remove incomplete trailing content
                    partial = partial.replace(/,\s*$/, '');
                    // Try to close it minimally
                    if (partial.includes('"overallScore"')) {
                      // At least we have the basic structure
                      const scoreMatch = partial.match(/"overallScore"\s*:\s*(\d+)/);
                      const levelMatch = partial.match(/"overallLevel"\s*:\s*"([^"]+)"/);
                      const summaryMatch = partial.match(/"summary"\s*:\s*"([^"]+)"/);
                      
                      if (scoreMatch && levelMatch && summaryMatch) {
                        console.log('⚠️ Extracted partial data from incomplete JSON');
                        // Return minimal valid structure
                        return {
                          overallScore: parseInt(scoreMatch[1]),
                          overallLevel: levelMatch[1],
                          summary: summaryMatch[1],
                          sentenceAnalysis: [],
                          optimized: '',
                          upgradedVersion: '',
                          patterns: [],
                          flashcards: [],
                        };
                      }
                    }
                  }
                } catch (partialError) {
                  // Give up
                }
              }
            }
            
            // Try to extract nested JSON
            const nestedMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (nestedMatch && nestedMatch[0] !== jsonStr) {
              try {
                return JSON.parse(nestedMatch[0]);
              } catch (nestedError) {
                // Continue to last resort
              }
            }
          }
        }
        
        // Last resort: try to fix common JSON issues
        try {
          // Remove trailing commas before closing braces/brackets
          const fixed = withoutMarkdown
            .replace(/,(\s*[}\]])/g, '$1')
            .replace(/([^\\])(['"])/g, '$1\\$2') // Escape unescaped quotes (basic attempt)
            .replace(/\\'\\'/g, "''"); // Fix double-escaped quotes
          
          return JSON.parse(fixed);
        } catch (fixError) {
          console.error('❌ All JSON parsing strategies failed');
          console.error('Original text length:', text.length);
          console.error('Response preview:', trimmed.substring(0, 500));
          throw new Error(`No valid JSON found in response. Response may be incomplete. Length: ${text.length} chars`);
        }
      }
    }
  }
}
