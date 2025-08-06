import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface AppConfig {
  env: string;
  port: number;
  apiVersion: string;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  logging: {
    level: string;
    format: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
  api: {
    openai: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
    };
    anthropic: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
    };
    google: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
    };
  };
}

const config: AppConfig = {
  env: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '8080', 10),
  apiVersion: process.env['API_VERSION'] || 'v1',
  
  cors: {
    // Support * for allowing all origins during development/testing
    origins: process.env['CORS_ORIGINS'] === '*' 
      ? ['*']  // Allow all origins
      : process.env['CORS_ORIGINS']?.split(',').map(origin => origin.trim()) || ['http://localhost:3000'],
    credentials: true,
  },
  
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
    format: process.env['LOG_FORMAT'] || 'json',
  },
  
  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests, please try again later.',
  },
  
  api: {
    openai: {
      apiKey: process.env['OPENAI_API_KEY'] || '',
      model: process.env['OPENAI_MODEL'] || 'gpt-4o',
      maxTokens: parseInt(process.env['OPENAI_MAX_TOKENS'] || '2000', 10),
      temperature: parseFloat(process.env['OPENAI_TEMPERATURE'] || '0.7'),
    },
    anthropic: {
      apiKey: process.env['ANTHROPIC_API_KEY'] || '',
      model: process.env['ANTHROPIC_MODEL'] || 'claude-3-opus-20240229',
      maxTokens: parseInt(process.env['ANTHROPIC_MAX_TOKENS'] || '2000', 10),
      temperature: parseFloat(process.env['ANTHROPIC_TEMPERATURE'] || '0.7'),
    },
    google: {
      apiKey: process.env['GOOGLE_API_KEY'] || '',
      model: process.env['GOOGLE_MODEL'] || 'gemini-pro',
      maxTokens: parseInt(process.env['GOOGLE_MAX_TOKENS'] || '2000', 10),
      temperature: parseFloat(process.env['GOOGLE_TEMPERATURE'] || '0.7'),
    },
  },
};

// Validate required configurations
const validateConfig = () => {

  // Just warn about missing API keys, don't fail
  if (!config.api.openai.apiKey && !config.api.anthropic.apiKey && !config.api.google.apiKey) {
    console.warn('⚠️ Warning: No LLM API keys configured. AI features will use fallback responses.');
  }
  
  if (!process.env['ALPHA_VANTAGE_API_KEY']) {
    console.warn('⚠️ Warning: No Alpha Vantage API key configured. Market data will use Yahoo Finance or mock data.');
  }

  // Don't throw errors - let the app run with fallbacks
};

// Always validate but don't fail
validateConfig();

export default config;