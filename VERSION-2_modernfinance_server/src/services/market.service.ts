import { MarketSentiment } from '../models/server.models';
import { logger } from '../utils/logger';
import { alphaVantageService } from './alphaVantage.service';
import { yahooFinanceService } from './yahooFinance.service';
import { cacheService } from './cache.service';

class MarketService {
  async getFundamentals(symbol: string): Promise<Record<string, number>> {
    try {
      logger.info(`Fetching real fundamentals for ${symbol}`);
      
      // Check cache first
      const cacheKey = `fundamentals:${symbol}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for fundamentals: ${symbol}`);
        return JSON.parse(cached);
      }
      
      let fundamentals: Record<string, number> | null = null;
      
      // Try Alpha Vantage first (primary source)
      try {
        if (process.env.ALPHA_VANTAGE_API_KEY) {
          fundamentals = await alphaVantageService.getComprehensiveFundamentals(symbol);
          logger.info(`Successfully fetched Alpha Vantage data for ${symbol}`);
        }
      } catch (avError) {
        logger.warn(`Alpha Vantage failed for ${symbol}, trying Yahoo Finance`, avError);
      }
      
      // Fallback to Yahoo Finance
      if (!fundamentals || Object.keys(fundamentals).length === 0) {
        try {
          fundamentals = await yahooFinanceService.getFundamentals(symbol);
          logger.info(`Successfully fetched Yahoo Finance data for ${symbol}`);
        } catch (yfError) {
          logger.warn(`Yahoo Finance also failed for ${symbol}, using fallback`, yfError);
        }
      }
      
      // Last resort: use mock data with warning
      if (!fundamentals || Object.keys(fundamentals).length === 0) {
        logger.warn(`All data sources failed for ${symbol}, using mock data as last resort`);
        fundamentals = this.generateMockFundamentals(symbol);
      }
      
      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, JSON.stringify(fundamentals), 300);
      
      return fundamentals;
    } catch (error) {
      logger.error(`Error fetching fundamentals for ${symbol}:`, error);
      // Return mock data on complete failure
      return this.generateMockFundamentals(symbol);
    }
  }
  
  async getSentiment(symbol: string): Promise<MarketSentiment> {
    try {
      logger.info(`Fetching sentiment for ${symbol}`);
      
      // Check cache first
      const cacheKey = `sentiment:${symbol}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for sentiment: ${symbol}`);
        return JSON.parse(cached);
      }
      
      let sentiment: MarketSentiment | null = null;
      
      // Try Yahoo Finance for sentiment
      try {
        const yfSentiment = await yahooFinanceService.getSentiment(symbol);
        sentiment = {
          analystRating: yfSentiment.analystRating,
          socialSentiment: yfSentiment.socialSentiment,
          newsVolume: yfSentiment.newsVolume,
          sentimentTrend: yfSentiment.sentimentTrend
        };
        logger.info(`Successfully fetched sentiment data for ${symbol}`);
      } catch (error) {
        logger.warn(`Failed to fetch real sentiment for ${symbol}, using mock`, error);
        sentiment = this.generateMockSentiment(symbol);
      }
      
      // Cache the result for 10 minutes
      await cacheService.set(cacheKey, JSON.stringify(sentiment), 600);
      
      return sentiment;
    } catch (error) {
      logger.error(`Error fetching sentiment for ${symbol}:`, error);
      return this.generateMockSentiment(symbol);
    }
  }
  
  private generateMockFundamentals(symbol: string): Record<string, number> {
    // Generate realistic fundamentals based on symbol
    switch (symbol.toUpperCase()) {
      case 'AAPL':
        return {
          'Market Cap': 3_000_000_000_000,
          'P/E Ratio': 32.5,
          'EPS': 6.05,
          'Revenue': 383_285_000_000,
          'Revenue Growth': 0.08,
          'Gross Margin': 0.434,
          'Operating Margin': 0.302,
          'Net Margin': 0.253,
          'ROE': 1.478,
          'ROA': 0.289,
          'Debt to Equity': 1.95,
          'Current Ratio': 0.94,
          'Quick Ratio': 0.91,
          'Free Cash Flow': 99_800_000_000,
          'Dividend Yield': 0.0044,
          'Beta': 1.25,
          '52 Week High': 199.62,
          '52 Week Low': 164.08,
          'Price': 196.50,
          'Volume': 53_423_100
        };
        
      case 'GOOGL':
      case 'GOOG':
        return {
          'Market Cap': 2_000_000_000_000,
          'P/E Ratio': 27.8,
          'EPS': 5.80,
          'Revenue': 307_394_000_000,
          'Revenue Growth': 0.13,
          'Gross Margin': 0.573,
          'Operating Margin': 0.278,
          'Net Margin': 0.213,
          'ROE': 0.295,
          'ROA': 0.188,
          'Debt to Equity': 0.12,
          'Current Ratio': 2.35,
          'Quick Ratio': 2.35,
          'Free Cash Flow': 69_495_000_000,
          'Dividend Yield': 0,
          'Beta': 1.06,
          '52 Week High': 179.49,
          '52 Week Low': 120.21,
          'Price': 161.30,
          'Volume': 22_154_800
        };
        
      case 'TSLA':
        return {
          'Market Cap': 800_000_000_000,
          'P/E Ratio': 75.2,
          'EPS': 3.40,
          'Revenue': 96_773_000_000,
          'Revenue Growth': 0.19,
          'Gross Margin': 0.273,
          'Operating Margin': 0.097,
          'Net Margin': 0.103,
          'ROE': 0.241,
          'ROA': 0.089,
          'Debt to Equity': 0.28,
          'Current Ratio': 1.69,
          'Quick Ratio': 1.08,
          'Free Cash Flow': 7_500_000_000,
          'Dividend Yield': 0,
          'Beta': 2.02,
          '52 Week High': 299.29,
          '52 Week Low': 152.37,
          'Price': 255.80,
          'Volume': 97_456_300
        };
        
      default:
        // Generic tech stock fundamentals
        return {
          'Market Cap': 50_000_000_000,
          'P/E Ratio': 25.0,
          'EPS': 4.20,
          'Revenue': 10_000_000_000,
          'Revenue Growth': 0.15,
          'Gross Margin': 0.45,
          'Operating Margin': 0.20,
          'Net Margin': 0.15,
          'ROE': 0.22,
          'ROA': 0.12,
          'Debt to Equity': 0.5,
          'Current Ratio': 1.8,
          'Quick Ratio': 1.5,
          'Free Cash Flow': 1_500_000_000,
          'Dividend Yield': 0.015,
          'Beta': 1.3,
          '52 Week High': 120.0,
          '52 Week Low': 80.0,
          'Price': 105.0,
          'Volume': 5_000_000
        };
    }
  }
  
  private generateMockSentiment(symbol: string): MarketSentiment {
    switch (symbol.toUpperCase()) {
      case 'AAPL':
        return {
          analystRating: 4.3,
          socialSentiment: 0.82,
          newsVolume: 245,
          sentimentTrend: 'positive'
        };
        
      case 'GOOGL':
      case 'GOOG':
        return {
          analystRating: 4.1,
          socialSentiment: 0.75,
          newsVolume: 189,
          sentimentTrend: 'stable'
        };
        
      case 'TSLA':
        return {
          analystRating: 3.5,
          socialSentiment: 0.68,
          newsVolume: 412,
          sentimentTrend: 'volatile'
        };
        
      default:
        return {
          analystRating: 3.8,
          socialSentiment: 0.7,
          newsVolume: 75,
          sentimentTrend: 'neutral'
        };
    }
  }
}

export const marketService = new MarketService();