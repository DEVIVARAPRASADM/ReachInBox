import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../../config/env.config';
import { Email, EmailCategory, AiCategorizationResult } from '../../types/email.types';
import { log } from '../../utils/logger';

/**
 * Gemini AI Categorizer with proper JSON Schema
 * As per Phase 3 requirements
 */
export class GeminiCategorizer {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private geminiDisabled: boolean = false;
  private retryCount: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second

  constructor() {
    if (config.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      
      // System instruction as per reference document
      const systemInstruction = "You are an expert email classifier. Your task is to analyze the provided email text and categorize it into one of the following labels: Interested, Meeting Booked, Not Interested, Spam, or Out of Office.";

      // Response schema to guarantee structured output
      const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
          category: {
            type: SchemaType.STRING,
            enum: ["Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office"]
          },
          confidence: {
            type: SchemaType.NUMBER,
            description: "Confidence score between 0 and 1"
          }
        },
        required: ["category", "confidence"]
      };

      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: systemInstruction,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.1, // Low temperature for consistent categorization
          topP: 0.8,
          topK: 10
        }
      });
      
      log.info('🤖 Gemini AI initialized with JSON schema');
    } else {
      log.warn('⚠️  No Gemini API key - using rule-based categorization');
      this.geminiDisabled = true;
    }
  }

  /**
   * Categorize a single email with retry logic
   */
  async categorize(email: Email): Promise<AiCategorizationResult> {
    // If Gemini disabled, use rules immediately
    if (this.geminiDisabled || !this.model) {
      return this.ruleBasedCategorization(email);
    }

    // Try Gemini with exponential backoff
    try {
      return await this.categorizeWithRetry(email);
    } catch (error: any) {
      // Check for quota errors
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        if (!this.geminiDisabled) {
          log.warn('⚠️  Gemini quota exceeded - switching to rule-based categorization');
          this.geminiDisabled = true;
        }
      } else {
        log.debug('Gemini error, using fallback');
      }
      
      return this.ruleBasedCategorization(email);
    }
  }

  /**
   * Categorize with exponential backoff retry
   */
  private async categorizeWithRetry(email: Email): Promise<AiCategorizationResult> {
    const emailKey = email.id;
    const retries = this.retryCount.get(emailKey) || 0;

    try {
      const result = await this.categorizeWithGemini(email);
      
      // Success - clear retry count
      this.retryCount.delete(emailKey);
      
      return result;
    } catch (error: any) {
      // If rate limit and retries left, wait and retry
      if ((error.message?.includes('429') || error.message?.includes('quota')) && retries < this.MAX_RETRIES) {
        const delay = this.BASE_DELAY * Math.pow(2, retries); // Exponential backoff
        
        log.debug(`Rate limited, retrying in ${delay}ms (attempt ${retries + 1}/${this.MAX_RETRIES})`);
        
        this.retryCount.set(emailKey, retries + 1);
        
        await this.sleep(delay);
        return this.categorizeWithRetry(email);
      }
      
      // Max retries reached or other error
      this.retryCount.delete(emailKey);
      throw error;
    }
  }

  /**
   * Categorize using Gemini API with JSON schema
   */
  private async categorizeWithGemini(email: Email): Promise<AiCategorizationResult> {
    const prompt = this.buildPrompt(email);
    
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response (guaranteed by schema)
    const parsed = JSON.parse(text);
    
    return {
      category: this.normalizeCategory(parsed.category),
      confidence: parsed.confidence || 0.8,
      reasoning: `AI classified with ${(parsed.confidence * 100).toFixed(1)}% confidence`
    };
  }

  /**
   * Build prompt for email categorization
   */
  private buildPrompt(email: Email): string {
    return `Analyze this email and categorize it:

From: ${email.from.name || 'Unknown'} <${email.from.address}>
Subject: ${email.subject}
Date: ${email.date.toISOString()}

Body:
${email.body.substring(0, 1000)}${email.body.length > 1000 ? '\n...(truncated)' : ''}

Categorize into: Interested, Meeting Booked, Not Interested, Spam, or Out of Office
Provide confidence score (0-1).`;
  }

  /**
   * Rule-based categorization fallback
   */
  private ruleBasedCategorization(email: Email): AiCategorizationResult {
    const text = `${email.subject} ${email.body}`.toLowerCase();

    // Out of Office - highest priority
    if (text.includes('out of office') || 
        text.includes('automatic reply') || 
        text.includes('away from my desk') ||
        text.includes('on vacation') ||
        text.includes('currently unavailable')) {
      return { category: EmailCategory.OUT_OF_OFFICE, confidence: 0.95 };
    }

    // Meeting Booked
    if (text.includes('meeting confirmed') || 
        text.includes('calendar invite') ||
        text.includes('scheduled for') ||
        text.includes('booked') ||
        text.includes('accepted your invitation') ||
        /\b(monday|tuesday|wednesday|thursday|friday)\b.*\b\d{1,2}:\d{2}\b/.test(text)) {
      return { category: EmailCategory.MEETING_BOOKED, confidence: 0.85 };
    }

    // Not Interested
    if (text.includes('not interested') || 
        text.includes('no thank') ||
        text.includes('unsubscribe') ||
        text.includes('remove me') ||
        text.includes('stop sending') ||
        text.includes('not a good fit')) {
      return { category: EmailCategory.NOT_INTERESTED, confidence: 0.85 };
    }

    // Interested - look for positive signals
    if (text.includes('interested') || 
        text.includes('tell me more') ||
        text.includes('sounds good') ||
        text.includes('love to learn') ||
        text.includes('schedule a call') ||
        text.includes('demo') ||
        text.includes('pricing') ||
        text.includes('more information')) {
      return { category: EmailCategory.INTERESTED, confidence: 0.75 };
    }

    // Spam indicators
    if (text.includes('click here now') || 
        text.includes('limited time offer') ||
        text.includes('act now') ||
        text.includes('congratulations you won') ||
        text.includes('claim your prize') ||
        email.from.address.includes('noreply')) {
      return { category: EmailCategory.SPAM, confidence: 0.7 };
    }

    // Default: Uncategorized
    return { category: EmailCategory.UNCATEGORIZED, confidence: 0.5 };
  }

  /**
   * Normalize category from AI response
   */
  private normalizeCategory(category: string): EmailCategory {
    const normalized = category.toLowerCase().replace(/[_\s-]/g, '');

    if (normalized.includes('interested') && !normalized.includes('not')) {
      return EmailCategory.INTERESTED;
    }
    if (normalized.includes('meeting') || normalized.includes('booked')) {
      return EmailCategory.MEETING_BOOKED;
    }
    if (normalized.includes('notinterested')) {
      return EmailCategory.NOT_INTERESTED;
    }
    if (normalized.includes('spam')) {
      return EmailCategory.SPAM;
    }
    if (normalized.includes('outofoffice') || normalized.includes('ooo')) {
      return EmailCategory.OUT_OF_OFFICE;
    }

    return EmailCategory.UNCATEGORIZED;
  }

  /**
   * Sleep utility for exponential backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch categorize multiple emails
   */
  async batchCategorize(emails: Email[]): Promise<Map<string, AiCategorizationResult>> {
    log.info(`🤖 Categorizing ${emails.length} emails...`);
    
    const results = new Map<string, AiCategorizationResult>();
    
    // Process in smaller batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        try {
          const result = await this.categorize(email);
          results.set(email.id, result);
        } catch (error) {
          log.error(`Failed to categorize ${email.id}`, error);
          // Use fallback
          results.set(email.id, this.ruleBasedCategorization(email));
        }
      });

      await Promise.all(promises);

      // Small delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await this.sleep(1000);
      }
    }

    log.info(`✅ Categorization complete`);
    return results;
  }
}