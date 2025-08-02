// Collaboration models matching iOS CollaborationModels.swift

export enum ContributionType {
  INSIGHT = "insight",
  QUESTION = "question",
  CORRECTION = "correction",
  ADDITIONAL_CONTEXT = "additionalContext",
  COUNTER_ARGUMENT = "counterArgument"
}

export interface ContributionClassification {
  type: ContributionType;
  relevantAgents: string[]; // Array of AgentType values
  confidence: number;
  suggestedIntegration: string;
}

export interface AgentRelevance {
  agentType: string; // AgentType value
  relevanceScore: number;
  reason: string;
}

export interface AgentResponseTemplate {
  agentId: string;
  agentType: string; // AgentType value
  
  // Response to user contribution
  acknowledgment: string;
  integration: string;
  
  // Updated perspective
  updatedKeyPoints: string[];
  newEvidence: string[];
  
  // Impact assessment
  impactOnAnalysis: string;
  confidenceChange: number;
  
  // Related insights
  relatedQuestions: string[];
  additionalConsiderations: string[];
}