import { 
  ContributionType, 
  ContributionClassification, 
  AgentRelevance, 
  AgentResponseTemplate 
} from '../models/collaboration.models';
import { AgentType } from '../models/server.models';
import { logger } from '../utils/logger';
import { llmService } from './llm.service';

export class CollaborationService {
  /**
   * Classifies user contribution and determines relevant agents
   */
  async classifyContribution(
    text: string, 
    symbol?: string, 
    context?: any
  ): Promise<ContributionClassification> {
    let classification: { type: ContributionType; confidence: number };
    let relevantAgents: string[];
    
    // Try LLM classification first if available
    const hasLLM = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (hasLLM) {
      try {
        const llmResult = await llmService.classifyContribution(text, { symbol, ...context });
        
        // Map the string type to enum
        const typeMap: Record<string, ContributionType> = {
          'INSIGHT': ContributionType.INSIGHT,
          'QUESTION': ContributionType.QUESTION,
          'CORRECTION': ContributionType.CORRECTION,
          'COUNTER_ARGUMENT': ContributionType.COUNTER_ARGUMENT,
          'ADDITIONAL_CONTEXT': ContributionType.ADDITIONAL_CONTEXT
        };
        
        classification = {
          type: typeMap[llmResult.type] || ContributionType.INSIGHT,
          confidence: llmResult.confidence
        };
        relevantAgents = llmResult.relevantAgents;
        
        logger.info('AI classified contribution', { 
          type: classification.type, 
          confidence: classification.confidence,
          relevantAgents 
        });
      } catch (error) {
        logger.warn('LLM classification failed, using keyword matching:', error);
        // Fallback to keyword matching
        classification = this.performKeywordMatching(text);
        relevantAgents = this.getSuggestedAgents(classification.type);
      }
    } else {
      // No LLM available, use keyword matching
      classification = this.performKeywordMatching(text);
      relevantAgents = this.getSuggestedAgents(classification.type);
    }
    
    return {
      type: classification.type,
      relevantAgents,
      confidence: classification.confidence,
      suggestedIntegration: this.getSuggestedIntegration(classification.type)
    };
  }

  /**
   * Gets response templates for specific agent and contribution type
   */
  async getResponseTemplates(
    agentType: string, 
    contributionType: ContributionType
  ): Promise<AgentResponseTemplate> {
    const template = this.generateTemplate(agentType, contributionType);
    
    logger.info('Generated response template', { 
      agentType, 
      contributionType,
      templateId: template.agentId 
    });
    
    return template;
  }

  /**
   * Calculates agent relevance scores for a given contribution
   */
  async calculateAgentRelevance(
    contributionType: ContributionType,
    _symbol?: string,
    _sentiment?: string
  ): Promise<AgentRelevance[]> {
    const scores = this.computeRelevanceScoresForType(contributionType);
    
    logger.info('Calculated agent relevance', { 
      contributionType,
      topAgent: scores[0]?.agentType,
      topScore: scores[0]?.relevanceScore 
    });
    
    return scores;
  }

  /**
   * Performs keyword matching to classify contribution type
   */
  private performKeywordMatching(text: string): { type: ContributionType; confidence: number } {
    const lowerText = text.toLowerCase();
    
    // Question patterns
    if (this.containsQuestionPatterns(lowerText)) {
      return { type: ContributionType.QUESTION, confidence: 0.9 };
    }
    
    // Correction patterns
    if (this.containsCorrectionPatterns(lowerText)) {
      return { type: ContributionType.CORRECTION, confidence: 0.85 };
    }
    
    // Counter-argument patterns
    if (this.containsCounterArgumentPatterns(lowerText)) {
      return { type: ContributionType.COUNTER_ARGUMENT, confidence: 0.8 };
    }
    
    // Additional context patterns
    if (this.containsContextPatterns(lowerText)) {
      return { type: ContributionType.ADDITIONAL_CONTEXT, confidence: 0.75 };
    }
    
    // Default to insight
    return { type: ContributionType.INSIGHT, confidence: 0.7 };
  }

  private containsQuestionPatterns(text: string): boolean {
    const patterns = [
      /\?$/,
      /^(what|why|how|when|where|who|which|could|would|should|can|will)/,
      /\b(explain|clarify|elaborate)\b/
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private containsCorrectionPatterns(text: string): boolean {
    const patterns = [
      /\b(actually|incorrect|wrong|mistake|error|not accurate|false)\b/,
      /\b(should be|must be|needs to be|has to be)\b/,
      /\b(correction|fix|correct)\b/
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private containsCounterArgumentPatterns(text: string): boolean {
    const patterns = [
      /\b(however|but|although|despite|nevertheless|on the other hand)\b/,
      /\b(disagree|dispute|challenge|contest|contradict)\b/,
      /\b(alternative|different view|opposing)\b/
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  private containsContextPatterns(text: string): boolean {
    const patterns = [
      /\b(also|additionally|furthermore|moreover|plus)\b/,
      /\b(context|background|information|detail|data)\b/,
      /\b(consider|note|remember|keep in mind)\b/
    ];
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Gets suggested agents based on contribution type
   */
  private getSuggestedAgents(type: ContributionType): string[] {
    switch (type) {
      case ContributionType.INSIGHT:
        return [
          AgentType.consensus,
          AgentType.fundamental,
          AgentType.optimist
        ];
      
      case ContributionType.QUESTION:
        return [
          AgentType.consensus,
          AgentType.fundamental,
          AgentType.technical
        ];
      
      case ContributionType.CORRECTION:
        return [
          AgentType.fundamental,
          AgentType.technical,
          AgentType.risk
        ];
      
      case ContributionType.ADDITIONAL_CONTEXT:
        return [
          AgentType.fundamental,
          AgentType.optimist,
          AgentType.consensus
        ];
      
      case ContributionType.COUNTER_ARGUMENT:
        return [
          AgentType.risk,
          AgentType.skeptical,
          AgentType.consensus
        ];
      
      default:
        return [AgentType.consensus];
    }
  }

  /**
   * Gets suggested integration message for contribution type
   */
  private getSuggestedIntegration(type: ContributionType): string {
    switch (type) {
      case ContributionType.INSIGHT:
        return "I'll incorporate this insight into our analysis and update our key findings.";
      
      case ContributionType.QUESTION:
        return "Let me address your question with additional analysis and data.";
      
      case ContributionType.CORRECTION:
        return "Thank you for the correction. I'll update our analysis accordingly.";
      
      case ContributionType.ADDITIONAL_CONTEXT:
        return "I'll integrate this additional context to provide a more comprehensive view.";
      
      case ContributionType.COUNTER_ARGUMENT:
        return "I'll analyze this counter-perspective and present a balanced assessment.";
      
      default:
        return "I'll incorporate your contribution into our analysis.";
    }
  }

  /**
   * Generates response template for agent and contribution type
   */
  private generateTemplate(agentType: string, contributionType: ContributionType): AgentResponseTemplate {
    const templates = this.getTemplateMap();
    const key = `${agentType}_${contributionType}`;
    const template = templates[key] || this.getDefaultTemplate(agentType);
    
    return {
      ...template,
      agentId: `${agentType}_${Date.now()}`,
      agentType
    };
  }

  /**
   * Returns template map for all agent/contribution combinations
   */
  private getTemplateMap(): Record<string, Omit<AgentResponseTemplate, 'agentId' | 'agentType'>> {
    return {
      // Fundamental Analyst Templates
      [`${AgentType.fundamental}_${ContributionType.INSIGHT}`]: {
        acknowledgment: "Excellent market observation! This aligns with emerging trends I've been tracking.",
        integration: "I'll incorporate this into my sector rotation analysis and competitive positioning assessment.",
        updatedKeyPoints: [
          "Market dynamics shift with your insight on competitive landscape",
          "Sector performance indicators need recalibration",
          "Industry trends confirm your observation"
        ],
        newEvidence: [
          "Recent M&A activity supports this view",
          "Institutional positioning data corroborates",
          "Supply chain indicators align with your insight"
        ],
        impactOnAnalysis: "Your insight strengthens the bull case for sector outperformance",
        confidenceChange: 0.15,
        relatedQuestions: [
          "How might regulatory changes affect this dynamic?",
          "What catalysts could accelerate this trend?"
        ],
        additionalConsiderations: [
          "Monitor competitor responses",
          "Track market share shifts",
          "Assess pricing power implications"
        ]
      },

      [`${AgentType.fundamental}_${ContributionType.QUESTION}`]: {
        acknowledgment: "Great question about market dynamics. Let me provide comprehensive context.",
        integration: "I'll expand my analysis to address your specific concerns about market positioning.",
        updatedKeyPoints: [
          "Market structure analysis reveals key dependencies",
          "Competitive dynamics show interesting patterns",
          "Industry consolidation trends are accelerating"
        ],
        newEvidence: [
          "Recent earnings calls highlight this theme",
          "Analyst consensus shifting on this topic",
          "Market data supports emerging trend"
        ],
        impactOnAnalysis: "Your question highlights a critical factor I'll monitor closely",
        confidenceChange: 0.0,
        relatedQuestions: [
          "Would you like me to analyze specific competitors?",
          "Should I expand on regulatory implications?"
        ],
        additionalConsiderations: [
          "International market comparisons",
          "Historical precedents analysis",
          "Forward-looking indicators"
        ]
      },

      // Technical Analyst Templates
      [`${AgentType.technical}_${ContributionType.CORRECTION}`]: {
        acknowledgment: "You're absolutely right. Thank you for catching that discrepancy in the financial data.",
        integration: "I'm recalculating all dependent metrics with the corrected figures.",
        updatedKeyPoints: [
          "Revised valuation metrics with corrected data",
          "Updated financial ratios and peer comparisons",
          "Adjusted growth projections based on accurate baseline"
        ],
        newEvidence: [
          "Corrected EBITDA margins align with industry norms",
          "Revised FCF yield changes investment thesis",
          "Updated multiples suggest different valuation"
        ],
        impactOnAnalysis: "The correction materially impacts valuation, adjusting price target by ~10%",
        confidenceChange: -0.1,
        relatedQuestions: [
          "Are there other financial metrics you'd like me to verify?",
          "Should I re-run the DCF with these corrections?"
        ],
        additionalConsiderations: [
          "Audit trail for all corrections",
          "Sensitivity analysis with new baseline",
          "Peer group revalidation needed"
        ]
      },

      // Technical Analyst Templates
      [`${AgentType.technical}_${ContributionType.ADDITIONAL_CONTEXT}`]: {
        acknowledgment: "This context about trading patterns adds crucial depth to my technical analysis.",
        integration: "I'll overlay this information on my chart patterns and volume analysis.",
        updatedKeyPoints: [
          "Hidden divergences now visible with your context",
          "Volume patterns confirm institutional activity",
          "Support/resistance levels gain new significance"
        ],
        newEvidence: [
          "Order flow data supports your observation",
          "Dark pool activity aligns with pattern",
          "Options flow confirms technical setup"
        ],
        impactOnAnalysis: "Your context reveals a stronger technical setup than initially identified",
        confidenceChange: 0.2,
        relatedQuestions: [
          "Have you noticed similar patterns in related securities?",
          "What timeframe do you typically analyze?"
        ],
        additionalConsiderations: [
          "Multi-timeframe confirmation needed",
          "Volume profile analysis",
          "Relative strength comparisons"
        ]
      },

      // Optimist Analyst Templates
      [`${AgentType.optimist}_${ContributionType.COUNTER_ARGUMENT}`]: {
        acknowledgment: "Your counter-perspective on market sentiment is thought-provoking and warrants deeper analysis.",
        integration: "I'll contrast this view with my sentiment indicators and social media analytics.",
        updatedKeyPoints: [
          "Sentiment divergence between retail and institutional",
          "Social media buzz doesn't reflect your concerns",
          "News flow analysis shows mixed signals"
        ],
        newEvidence: [
          "Options put/call ratios support caution",
          "Insider trading patterns are mixed",
          "Analyst revisions trending cautiously"
        ],
        impactOnAnalysis: "Your counter-argument introduces healthy skepticism to an overly bullish narrative",
        confidenceChange: -0.15,
        relatedQuestions: [
          "What specific sentiment indicators concern you?",
          "Have you seen this pattern before?"
        ],
        additionalConsiderations: [
          "Contrarian indicators review",
          "Sentiment extremes analysis",
          "Behavioral finance factors"
        ]
      },

      // Risk Analyst Templates
      [`${AgentType.risk}_${ContributionType.CORRECTION}`]: {
        acknowledgment: "Critical catch on the risk calculation. This materially changes our risk assessment.",
        integration: "I'm recalibrating all risk metrics and updating our risk management framework.",
        updatedKeyPoints: [
          "Corrected VaR calculations show higher tail risk",
          "Stress test scenarios need adjustment",
          "Portfolio risk contribution recalculated"
        ],
        newEvidence: [
          "Historical drawdown analysis confirms higher risk",
          "Correlation matrices show hidden exposures",
          "Factor analysis reveals concentrated bets"
        ],
        impactOnAnalysis: "Risk-adjusted returns are less attractive; position sizing recommendations reduced by 25%",
        confidenceChange: -0.2,
        relatedQuestions: [
          "Are there other risk factors I should examine?",
          "What risk tolerance is appropriate here?"
        ],
        additionalConsiderations: [
          "Liquidity risk reassessment",
          "Concentration risk analysis",
          "Hedging strategy review"
        ]
      },

      // Consensus Builder Templates
      [`${AgentType.consensus}_${ContributionType.INSIGHT}`]: {
        acknowledgment: "Your insight brilliantly connects multiple aspects of our analysis. This is exactly the holistic thinking we need.",
        integration: "I'll weave this perspective throughout our integrated analysis, updating all key recommendations.",
        updatedKeyPoints: [
          "Unified investment thesis strengthened by your insight",
          "Cross-functional analysis validates your perspective",
          "Strategic implications are more profound than initially assessed"
        ],
        newEvidence: [
          "Multiple data sources converge on your thesis",
          "Independent analyses support this view",
          "Long-term trends align with your insight"
        ],
        impactOnAnalysis: "Your contribution elevates our analysis from good to exceptional, clarifying the investment case",
        confidenceChange: 0.25,
        relatedQuestions: [
          "How do you see this playing out over different time horizons?",
          "What would change your view on this?"
        ],
        additionalConsiderations: [
          "Scenario planning around your insight",
          "Implementation strategy development",
          "Risk/reward optimization"
        ]
      }
    };
  }

  /**
   * Gets default template for agent type
   */
  private getDefaultTemplate(_agentType: string): Omit<AgentResponseTemplate, 'agentId' | 'agentType'> {
    return {
      acknowledgment: "Thank you for your valuable contribution to our analysis.",
      integration: "I'll incorporate this perspective into my assessment.",
      updatedKeyPoints: [
        "Analysis updated with your input",
        "New perspective integrated into findings",
        "Conclusions refined based on your contribution"
      ],
      newEvidence: [
        "Supporting data aligns with your view",
        "Additional research confirms perspective",
        "Market indicators support this angle"
      ],
      impactOnAnalysis: "Your input enhances our overall analysis quality",
      confidenceChange: 0.05,
      relatedQuestions: [
        "Would you like me to explore this further?",
        "Are there other aspects to consider?"
      ],
      additionalConsiderations: [
        "Continue monitoring this factor",
        "Further research recommended",
        "Track developments closely"
      ]
    };
  }

  /**
   * Computes relevance scores for contribution type
   */
  private computeRelevanceScoresForType(contributionType: ContributionType): AgentRelevance[] {
    const relevanceMap: Record<ContributionType, AgentRelevance[]> = {
      [ContributionType.INSIGHT]: [
        { agentType: AgentType.fundamental, relevanceScore: 0.9, reason: "Deep fundamental analysis for insights" },
        { agentType: AgentType.consensus, relevanceScore: 0.8, reason: "Integration of insights across perspectives" },
        { agentType: AgentType.optimist, relevanceScore: 0.7, reason: "Growth opportunities from insights" }
      ],
      [ContributionType.QUESTION]: [
        { agentType: AgentType.consensus, relevanceScore: 0.9, reason: "Comprehensive answers to questions" },
        { agentType: AgentType.fundamental, relevanceScore: 0.8, reason: "Data-driven responses" },
        { agentType: AgentType.technical, relevanceScore: 0.7, reason: "Technical perspective on questions" }
      ],
      [ContributionType.CORRECTION]: [
        { agentType: AgentType.fundamental, relevanceScore: 0.95, reason: "Accuracy in financial data" },
        { agentType: AgentType.technical, relevanceScore: 0.85, reason: "Precision in technical analysis" },
        { agentType: AgentType.risk, relevanceScore: 0.8, reason: "Risk metric corrections" }
      ],
      [ContributionType.ADDITIONAL_CONTEXT]: [
        { agentType: AgentType.fundamental, relevanceScore: 0.85, reason: "Context enriches fundamental analysis" },
        { agentType: AgentType.optimist, relevanceScore: 0.8, reason: "Additional growth catalysts" },
        { agentType: AgentType.consensus, relevanceScore: 0.75, reason: "Broader perspective integration" }
      ],
      [ContributionType.COUNTER_ARGUMENT]: [
        { agentType: AgentType.risk, relevanceScore: 0.95, reason: "Risk assessment of counter views" },
        { agentType: AgentType.skeptical, relevanceScore: 0.9, reason: "Critical analysis specialist" },
        { agentType: AgentType.consensus, relevanceScore: 0.7, reason: "Balanced view integration" }
      ]
    };

    return relevanceMap[contributionType] || [
      { agentType: AgentType.consensus, relevanceScore: 0.8, reason: "General analysis coordination" }
    ];
  }

  /**
   * Computes relevance scores for all agents
   * @deprecated - Using computeRelevanceScoresForType instead
   */
  /*
  private _computeRelevanceScores(text: string): AgentRelevance[] {
    const scores: AgentRelevance[] = [];
    const lowerText = text.toLowerCase();

    // Market Analyst relevance
    scores.push({
      agentType: AgentType.fundamental,
      relevanceScore: this.calculateMarketAnalystScore(lowerText),
      reason: "Market dynamics, competition, and industry trends"
    });

    // Fundamental Analyst relevance
    scores.push({
      agentType: AgentType.fundamental,
      relevanceScore: this.calculateFundamentalAnalystScore(lowerText),
      reason: "Financial metrics, valuation, and company fundamentals"
    });

    // Technical Analyst relevance
    scores.push({
      agentType: AgentType.technical,
      relevanceScore: this.calculateTechnicalAnalystScore(lowerText),
      reason: "Price patterns, charts, and trading indicators"
    });

    // Sentiment Analyst relevance
    scores.push({
      agentType: AgentType.optimist,
      relevanceScore: this.calculateSentimentAnalystScore(lowerText),
      reason: "Market sentiment, social media, and investor psychology"
    });

    // Risk Analyst relevance
    scores.push({
      agentType: AgentType.risk,
      relevanceScore: this.calculateRiskAnalystScore(lowerText),
      reason: "Risk factors, volatility, and downside protection"
    });

    // Synthesis Agent relevance
    scores.push({
      agentType: AgentType.consensus,
      relevanceScore: this.calculateSynthesisAgentScore(lowerText),
      reason: "Overall strategy, integration, and holistic view"
    });

    // Sort by relevance score descending
    return scores.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private calculateMarketAnalystScore(text: string): number {
    const keywords = [
      'market', 'competition', 'competitor', 'industry', 'sector',
      'trend', 'share', 'position', 'landscape', 'growth'
    ];
    return this.calculateKeywordScore(text, keywords);
  }

  private calculateFundamentalAnalystScore(text: string): number {
    const keywords = [
      'revenue', 'earnings', 'profit', 'margin', 'cash flow',
      'debt', 'assets', 'valuation', 'pe', 'ratio', 'financial'
    ];
    return this.calculateKeywordScore(text, keywords);
  }

  private calculateTechnicalAnalystScore(text: string): number {
    const keywords = [
      'chart', 'pattern', 'support', 'resistance', 'trend',
      'volume', 'momentum', 'rsi', 'macd', 'technical'
    ];
    return this.calculateKeywordScore(text, keywords);
  }

  private calculateSentimentAnalystScore(text: string): number {
    const keywords = [
      'sentiment', 'social', 'media', 'opinion', 'buzz',
      'perception', 'analyst', 'rating', 'investor', 'confidence'
    ];
    return this.calculateKeywordScore(text, keywords);
  }

  private calculateRiskAnalystScore(text: string): number {
    const keywords = [
      'risk', 'volatility', 'downside', 'exposure', 'hedge',
      'protection', 'uncertainty', 'threat', 'concern', 'safety'
    ];
    return this.calculateKeywordScore(text, keywords);
  }

  private calculateSynthesisAgentScore(text: string): number {
    const keywords = [
      'overall', 'strategy', 'comprehensive', 'holistic', 'integrate',
      'combine', 'summary', 'conclusion', 'recommendation', 'synthesis'
    ];
    return this.calculateKeywordScore(text, keywords);
  }

  private calculateKeywordScore(text: string, keywords: string[]): number {
    let score = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 1;
      }
    });
    // Normalize to 0-1 range
    return Math.min(score / 3, 1);
  }
  */
}

// Export singleton instance
export const collaborationService = new CollaborationService();