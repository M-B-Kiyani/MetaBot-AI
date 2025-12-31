const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs").promises;
const path = require("path");
const { logApiCall, logError, logBusinessEvent } = require("../utils/logger");

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    this.knowledgeBase = new Map();
    this.conversationContexts = new Map();
    this.loadKnowledgeBase();
  }

  /**
   * Load knowledge base from metalogicsRAG folder
   */
  async loadKnowledgeBase() {
    try {
      const knowledgeDir = path.join(process.cwd(), "metalogicsRAG");
      const files = await fs.readdir(knowledgeDir);

      for (const file of files) {
        if (file.endsWith(".md")) {
          const filePath = path.join(knowledgeDir, file);
          const content = await fs.readFile(filePath, "utf-8");
          const topic = file.replace(".md", "").replace(/_/g, " ");
          this.knowledgeBase.set(topic.toLowerCase(), content);
        }
      }

      console.log(`Loaded ${this.knowledgeBase.size} knowledge base documents`);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    }
  }

  /**
   * Find relevant knowledge base content based on user query
   */
  findRelevantKnowledge(query) {
    const queryLower = query.toLowerCase();
    const relevantContent = [];

    // Keywords mapping for better content retrieval
    const keywordMap = {
      pricing: ["pricing faq"],
      price: ["pricing faq"],
      cost: ["pricing faq"],
      services: ["services faq", "about company"],
      company: ["about company"],
      about: ["about company", "mission vision"],
      contact: ["general inquiries"],
      support: ["support"],
      "web development": ["web development"],
      "app development": ["app development"],
      mobile: ["app development"],
      seo: ["seo", "seo strategies"],
      marketing: ["social media marketing", "content marketing"],
      design: ["graphic design", "landing page design"],
      blockchain: ["web3 development"],
      web3: ["web3 development"],
      process: ["process faq"],
      team: ["leadership", "sales team"],
      history: ["history"],
    };

    // Find direct matches
    for (const [topic, content] of this.knowledgeBase) {
      if (
        queryLower.includes(topic) ||
        topic.includes(queryLower.split(" ")[0])
      ) {
        relevantContent.push(content);
      }
    }

    // Find keyword-based matches
    for (const [keyword, topics] of Object.entries(keywordMap)) {
      if (queryLower.includes(keyword)) {
        for (const topic of topics) {
          const content = this.knowledgeBase.get(topic);
          if (content && !relevantContent.includes(content)) {
            relevantContent.push(content);
          }
        }
      }
    }

    // If no specific matches, include general company info
    if (relevantContent.length === 0) {
      const generalInfo = this.knowledgeBase.get("about company");
      if (generalInfo) {
        relevantContent.push(generalInfo);
      }
    }

    return relevantContent.slice(0, 3); // Limit to top 3 most relevant
  }

  /**
   * Generate AI response using Gemini API with knowledge base context
   */
  async generateResponse(message, sessionId = "default") {
    const startTime = Date.now();

    try {
      // Log the AI request
      logBusinessEvent("AI Request", {
        sessionId,
        messageLength: message.length,
        hasContext: this.conversationContexts.has(sessionId),
      });

      // Get or create conversation context
      let context = this.conversationContexts.get(sessionId) || [];

      // Find relevant knowledge base content
      const relevantKnowledge = this.findRelevantKnowledge(message);

      // Build system prompt with knowledge base context
      const systemPrompt = `You are an AI assistant for Metalogics.io, a UK-based digital development agency. 

IMPORTANT GUIDELINES:
- Only answer questions related to Metalogics.io services, pricing, company information, and general business inquiries
- Use the provided knowledge base content to give accurate, specific answers
- If asked about topics outside Metalogics.io scope, politely redirect to company-related topics
- Be helpful, professional, and concise
- If you detect booking intent, guide the user toward scheduling a consultation

KNOWLEDGE BASE CONTEXT:
${relevantKnowledge.join("\n\n---\n\n")}

CONVERSATION HISTORY:
${context.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

Current user message: ${message}

Respond as the Metalogics.io assistant:`;

      const result = await this.model.generateContent(systemPrompt);
      const response = result.response.text();

      const duration = Date.now() - startTime;

      // Log successful API call
      logApiCall("Gemini", "POST", "generateContent", duration, true);

      // Log business event
      logBusinessEvent("AI Response Generated", {
        sessionId,
        responseLength: response.length,
        duration,
        knowledgeSourcesUsed: relevantKnowledge.length,
      });

      // Update conversation context
      context.push({ role: "user", content: message, timestamp: new Date() });
      context.push({
        role: "assistant",
        content: response,
        timestamp: new Date(),
      });

      // Keep only last 10 messages to manage context size
      if (context.length > 10) {
        context = context.slice(-10);
      }

      this.conversationContexts.set(sessionId, context);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed API call
      logApiCall("Gemini", "POST", "generateContent", duration, false, error);

      // Log error with context
      logError(error, {
        operation: "generateResponse",
        sessionId,
        messageLength: message.length,
        duration,
      });

      return this.handleServiceFailure(message, sessionId);
    }
  }

  /**
   * Check if user message indicates booking intent
   */
  async isBookingIntent(message) {
    try {
      const bookingKeywords = [
        "book",
        "schedule",
        "appointment",
        "meeting",
        "consultation",
        "call",
        "discuss",
        "talk",
        "contact",
        "hire",
        "quote",
        "project",
        "work together",
        "get started",
        "interested in",
      ];

      const messageLower = message.toLowerCase();
      const hasBookingKeyword = bookingKeywords.some((keyword) =>
        messageLower.includes(keyword)
      );

      if (hasBookingKeyword) {
        return true;
      }

      // Use AI to detect more subtle booking intents
      const intentPrompt = `Analyze if this message indicates the user wants to book a service, schedule a meeting, or start a project with Metalogics.io:

Message: "${message}"

Respond with only "YES" or "NO":`;

      const result = await this.model.generateContent(intentPrompt);
      const response = result.response.text().trim().toUpperCase();

      return response === "YES";
    } catch (error) {
      console.error("Error detecting booking intent:", error);
      // Fallback to keyword detection
      const bookingKeywords = [
        "book",
        "schedule",
        "appointment",
        "meeting",
        "consultation",
      ];
      return bookingKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );
    }
  }

  /**
   * Extract booking information from user message
   */
  async extractBookingInfo(message, currentInfo = {}) {
    try {
      // Get the current booking state to understand what we're asking for
      const currentStep = this.getCurrentBookingStep(currentInfo);

      const extractionPrompt = `You are helping extract booking information from a conversational flow. 

Current booking step: ${currentStep}
Current booking info: ${JSON.stringify(currentInfo)}
User's latest message: "${message}"

Based on the current step and message, extract relevant information. If the user is responding to a specific question about ${currentStep}, treat their response as the answer to that field.

Return a JSON object with any available information:
{
  "name": "full name if provided or if this is a name response",
  "email": "email address if provided or if this is an email response", 
  "company": "company name if provided or if this is a company response",
  "inquiry": "what service/project they're interested in or if this describes their needs",
  "dateTime": "convert any time/date preferences to ISO format if possible",
  "duration": "meeting duration if specified (convert to number: 15, 30, 45, or 60)"
}

IMPORTANT: 
- If current step is "name" and message looks like a name, put it in "name" field
- If current step is "email" and message looks like an email, put it in "email" field  
- If current step is "company" and message is a company name, put it in "company" field
- If current step is "inquiry" and message describes a project/need, put it in "inquiry" field
- If current step is "dateTime" and message mentions time/date, convert to "dateTime" field
- If current step is "duration" and message mentions time length, convert to "duration" field

Return only the JSON object:`;

      const result = await this.model.generateContent(extractionPrompt);
      const response = result.response.text().trim();

      try {
        // Clean the response to extract JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedInfo = JSON.parse(jsonMatch[0]);

          // If we're in a specific step and got a simple response, map it directly
          if (
            currentStep &&
            message.trim() &&
            !message.includes("@") &&
            !message.includes(".com")
          ) {
            switch (currentStep) {
              case "name":
                if (
                  !extractedInfo.name &&
                  message.length < 100 &&
                  !message.toLowerCase().includes("book")
                ) {
                  extractedInfo.name = message.trim();
                }
                break;
              case "company":
                if (!extractedInfo.company && message.length < 100) {
                  extractedInfo.company = message.trim();
                }
                break;
              case "inquiry":
                if (!extractedInfo.inquiry) {
                  extractedInfo.inquiry = message.trim();
                }
                break;
            }
          }

          // Special handling for email detection
          if (currentStep === "email" && message.includes("@")) {
            const emailMatch = message.match(
              /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
            );
            if (emailMatch) {
              extractedInfo.email = emailMatch[0];
            }
          }

          // Special handling for duration
          if (currentStep === "duration") {
            const durationMatch = message.match(
              /(\d+)\s*(min|minute|minutes|hour|hours)?/i
            );
            if (durationMatch) {
              let duration = parseInt(durationMatch[1]);
              if (
                durationMatch[2] &&
                durationMatch[2].toLowerCase().includes("hour")
              ) {
                duration *= 60;
              }
              if ([15, 30, 45, 60].includes(duration)) {
                extractedInfo.duration = duration;
              }
            }
          }

          // Merge with current info, prioritizing new information
          return {
            ...currentInfo,
            ...Object.fromEntries(
              Object.entries(extractedInfo).filter(
                ([_, value]) => value && value.toString().trim() !== ""
              )
            ),
          };
        }
      } catch (parseError) {
        console.error("Error parsing extracted booking info:", parseError);
      }

      return currentInfo;
    } catch (error) {
      console.error("Error extracting booking info:", error);
      return currentInfo;
    }
  }

  /**
   * Determine current booking step based on available information
   */
  getCurrentBookingStep(currentInfo) {
    const requiredFields = [
      "name",
      "email",
      "company",
      "inquiry",
      "dateTime",
      "duration",
    ];

    for (const field of requiredFields) {
      if (
        !currentInfo[field] ||
        (typeof currentInfo[field] === "string" &&
          currentInfo[field].trim() === "")
      ) {
        return field;
      }
    }

    return "confirmation";
  }

  /**
   * Get fallback response when AI service fails
   */
  getFallbackResponse() {
    const fallbackResponses = [
      "I'm here to help you learn about Metalogics.io services. We offer web development, mobile apps, Web3 solutions, and digital marketing. How can I assist you today?",
      "Thanks for your interest in Metalogics.io! We're a UK-based development agency specializing in custom web solutions. What would you like to know about our services?",
      "I'd be happy to help you with information about Metalogics.io. We provide comprehensive digital solutions including web development, app development, and blockchain solutions. What specific service interests you?",
      "Welcome to Metalogics.io! We're here to help with your digital development needs. Whether you're looking for a website, mobile app, or Web3 solution, I can provide more information. What can I help you with?",
      "I apologize, but I'm currently experiencing some technical difficulties. However, I can still help you with basic information about Metalogics.io services. We specialize in web development, mobile apps, and digital marketing. Would you like to schedule a consultation to discuss your project?",
      "I'm having trouble processing your request right now, but I'm here to help with Metalogics.io inquiries. For immediate assistance, you can contact us at hello@metalogics.io or +44 7368 580133. What service are you interested in?",
    ];

    return fallbackResponses[
      Math.floor(Math.random() * fallbackResponses.length)
    ];
  }

  /**
   * Get booking-specific fallback response
   */
  getBookingFallbackResponse() {
    return "I'd love to help you get started with your project! To schedule a consultation with our team, please provide your name, email, company, and a brief description of what you're looking for. You can also contact us directly at hello@metalogics.io or +44 7368 580133.";
  }

  /**
   * Handle graceful fallback when AI services are unavailable
   */
  async handleServiceFailure(message, sessionId = "default") {
    try {
      // Try to detect booking intent with simple keyword matching
      const isBooking = await this.isBookingIntent(message).catch(() => {
        const bookingKeywords = [
          "book",
          "schedule",
          "appointment",
          "meeting",
          "consultation",
          "hire",
          "quote",
        ];
        return bookingKeywords.some((keyword) =>
          message.toLowerCase().includes(keyword)
        );
      });

      if (isBooking) {
        return this.getBookingFallbackResponse();
      }

      // Check if asking about specific services
      const serviceMentions = {
        "web development":
          "We offer custom web development services starting from £99. Our team creates responsive, modern websites tailored to your business needs.",
        "mobile app":
          "We develop user-friendly mobile applications for both iOS and Android platforms. Contact us to discuss your app idea!",
        seo: "Our SEO services help boost your website visibility and organic reach. We use proven strategies to improve your search rankings.",
        blockchain:
          "We specialize in Web3 and blockchain development, including decentralized applications and smart contracts.",
        pricing:
          "Our pricing starts from £99 for starter websites. We offer Basic (£349), Medium (£599), and custom e-commerce solutions. Contact us for a detailed quote!",
        contact:
          "You can reach us at hello@metalogics.io or call +44 7368 580133. We typically respond within 24-48 hours.",
      };

      const messageLower = message.toLowerCase();
      for (const [keyword, response] of Object.entries(serviceMentions)) {
        if (messageLower.includes(keyword)) {
          return response;
        }
      }

      return this.getFallbackResponse();
    } catch (error) {
      console.error("Error in service failure handler:", error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Clear conversation context for a session
   */
  clearContext(sessionId) {
    this.conversationContexts.delete(sessionId);
  }

  /**
   * Get conversation context for a session
   */
  getContext(sessionId) {
    return this.conversationContexts.get(sessionId) || [];
  }
}

module.exports = AIService;
