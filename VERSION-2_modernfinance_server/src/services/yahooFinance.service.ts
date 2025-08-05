import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

// Yahoo Finance response interfaces
interface YahooQuoteSummary {
  quoteSummary: {
    result: Array<{
      price?: {
        regularMarketPrice?: { raw?: number };
        regularMarketChange?: { raw?: number };
        regularMarketChangePercent?: { raw?: number };
        regularMarketVolume?: { raw?: number };
        marketCap?: { raw?: number };
      };
      summaryDetail?: {
        previousClose?: { raw?: number };
        open?: { raw?: number };
        dayLow?: { raw?: number };
        dayHigh?: { raw?: number };
        volume?: { raw?: number };
        averageVolume?: { raw?: number };
        marketCap?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
        fiftyTwoWeekHigh?: { raw?: number };
        fiftyDayAverage?: { raw?: number };
        twoHundredDayAverage?: { raw?: number };
        beta?: { raw?: number };
        trailingPE?: { raw?: number };
        forwardPE?: { raw?: number };
        dividendYield?: { raw?: number };
      };
      defaultKeyStatistics?: {
        trailingEps?: { raw?: number };
        forwardEps?: { raw?: number };
        pegRatio?: { raw?: number };
        bookValue?: { raw?: number };
        priceToBook?: { raw?: number };
        sharesOutstanding?: { raw?: number };
        beta?: { raw?: number };
      };
      financialData?: {
        currentPrice?: { raw?: number };
        totalCash?: { raw?: number };
        totalCashPerShare?: { raw?: number };
        ebitda?: { raw?: number };
        totalDebt?: { raw?: number };
        quickRatio?: { raw?: number };
        currentRatio?: { raw?: number };
        totalRevenue?: { raw?: number };
        debtToEquity?: { raw?: number };
        revenuePerShare?: { raw?: number };
        returnOnAssets?: { raw?: number };
        returnOnEquity?: { raw?: number };
        grossProfits?: { raw?: number };
        freeCashflow?: { raw?: number };
        operatingCashflow?: { raw?: number };
        earningsGrowth?: { raw?: number };
        revenueGrowth?: { raw?: number };
        grossMargins?: { raw?: number };
        ebitdaMargins?: { raw?: number };
        operatingMargins?: { raw?: number };
        profitMargins?: { raw?: number };
      };
    }>;
    error: any;
  };
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        currency?: string;
        symbol?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketVolume?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error: any;
  };
}

class YahooFinanceService {
  private axios: AxiosInstance;
  private baseURLChart = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private baseURLQuote = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary';
  
  constructor() {
    this.axios = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }

  async getQuote(symbol: string): Promise<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }> {
    try {
      const response = await this.axios.get(`${this.baseURLChart}/${symbol.toUpperCase()}`);
      
      const chart = response.data as YahooChartResponse;
      const result = chart.chart?.result?.[0];
      
      if (!result || chart.chart?.error) {
        throw new Error(`Yahoo Finance: No data for ${symbol}`);
      }

      const meta = result.meta;
      const price = meta?.regularMarketPrice || 0;
      const previousClose = meta?.previousClose || price;
      const change = price - previousClose;
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;

      return {
        symbol: symbol.toUpperCase(),
        price,
        change,
        changePercent,
        volume: meta?.regularMarketVolume || 0
      };
    } catch (error) {
      logger.error(`Yahoo Finance quote error for ${symbol}:`, error);
      throw error;
    }
  }

  async getFundamentals(symbol: string): Promise<Record<string, number>> {
    try {
      const modules = 'price,summaryDetail,defaultKeyStatistics,financialData';
      const response = await this.axios.get(`${this.baseURLQuote}/${symbol.toUpperCase()}`, {
        params: { modules }
      });

      const data = response.data as YahooQuoteSummary;
      const result = data.quoteSummary?.result?.[0];
      
      if (!result || data.quoteSummary?.error) {
        throw new Error(`Yahoo Finance: No fundamentals for ${symbol}`);
      }

      const price = result.price;
      const detail = result.summaryDetail;
      const keyStats = result.defaultKeyStatistics;
      const financial = result.financialData;

      // Map to client's expected format
      return {
        'Market Cap': price?.marketCap?.raw || detail?.marketCap?.raw || 0,
        'P/E Ratio': detail?.trailingPE?.raw || 0,
        'Forward PE': detail?.forwardPE?.raw || 0,
        'EPS': keyStats?.trailingEps?.raw || 0,
        'Revenue': financial?.totalRevenue?.raw || 0,
        'Revenue Growth': financial?.revenueGrowth?.raw || 0,
        'Gross Margin': financial?.grossMargins?.raw || 0,
        'Operating Margin': financial?.operatingMargins?.raw || 0,
        'Net Margin': financial?.profitMargins?.raw || 0,
        'ROE': financial?.returnOnEquity?.raw || 0,
        'ROA': financial?.returnOnAssets?.raw || 0,
        'Debt to Equity': financial?.debtToEquity?.raw || 0,
        'Current Ratio': financial?.currentRatio?.raw || 0,
        'Quick Ratio': financial?.quickRatio?.raw || 0,
        'Free Cash Flow': financial?.freeCashflow?.raw || 0,
        'Dividend Yield': detail?.dividendYield?.raw || 0,
        'Beta': detail?.beta?.raw || keyStats?.beta?.raw || 0,
        '52 Week High': detail?.fiftyTwoWeekHigh?.raw || 0,
        '52 Week Low': detail?.fiftyTwoWeekLow?.raw || 0,
        'Price': price?.regularMarketPrice?.raw || financial?.currentPrice?.raw || 0,
        'Volume': price?.regularMarketVolume?.raw || detail?.volume?.raw || 0,
        'Price to Book': keyStats?.priceToBook?.raw || 0,
        'Book Value': keyStats?.bookValue?.raw || 0,
        'Total Cash': financial?.totalCash?.raw || 0,
        'Total Debt': financial?.totalDebt?.raw || 0,
        'EBITDA': financial?.ebitda?.raw || 0,
        'EBITDA Margin': financial?.ebitdaMargins?.raw || 0,
        'Earnings Growth': financial?.earningsGrowth?.raw || 0,
        '50 Day Average': detail?.fiftyDayAverage?.raw || 0,
        '200 Day Average': detail?.twoHundredDayAverage?.raw || 0
      };
    } catch (error) {
      logger.error(`Yahoo Finance fundamentals error for ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalData(
    symbol: string,
    period1?: number,
    period2?: number,
    interval: string = '1d'
  ): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      const params: any = { interval };
      
      if (period1 && period2) {
        params.period1 = period1;
        params.period2 = period2;
      } else {
        params.range = '3mo'; // Default to 3 months
      }

      const response = await this.axios.get(`${this.baseURLChart}/${symbol.toUpperCase()}`, {
        params
      });

      const chart = response.data as YahooChartResponse;
      const result = chart.chart?.result?.[0];
      
      if (!result || !result.timestamp || chart.chart?.error) {
        throw new Error(`Yahoo Finance: No historical data for ${symbol}`);
      }

      const timestamps = result.timestamp;
      const quotes = result.indicators?.quote?.[0];
      
      if (!quotes) {
        return [];
      }

      const historicalData = timestamps.map((timestamp, index) => {
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];
        return {
          date,
          open: quotes.open?.[index] || 0,
          high: quotes.high?.[index] || 0,
          low: quotes.low?.[index] || 0,
          close: quotes.close?.[index] || 0,
          volume: quotes.volume?.[index] || 0
        };
      }).filter(data => data.close > 0); // Filter out invalid data

      return historicalData;
    } catch (error) {
      logger.error(`Yahoo Finance historical data error for ${symbol}:`, error);
      return [];
    }
  }

  async getSentiment(symbol: string): Promise<{
    analystRating: number;
    socialSentiment: number;
    newsVolume: number;
    sentimentTrend: string;
  }> {
    try {
      // Yahoo Finance doesn't provide direct sentiment data
      // We'll derive it from available metrics
      const fundamentals = await this.getFundamentals(symbol);
      
      // Simple sentiment calculation based on metrics
      let sentimentScore = 0;
      let factors = 0;
      
      // P/E ratio sentiment (lower is better, typically)
      const peRatio = fundamentals['P/E Ratio'];
      if (peRatio > 0 && peRatio < 15) {
        sentimentScore += 1;
      } else if (peRatio > 30) {
        sentimentScore -= 1;
      }
      factors++;
      
      // Revenue growth sentiment
      const revenueGrowth = fundamentals['Revenue Growth'];
      if (revenueGrowth > 0.15) {
        sentimentScore += 1;
      } else if (revenueGrowth < 0) {
        sentimentScore -= 1;
      }
      factors++;
      
      // ROE sentiment
      const roe = fundamentals['ROE'];
      if (roe > 0.20) {
        sentimentScore += 1;
      } else if (roe < 0.10) {
        sentimentScore -= 1;
      }
      factors++;
      
      // Calculate average sentiment
      const avgSentiment = sentimentScore / factors;
      
      return {
        analystRating: 3.5 + avgSentiment, // Convert to 1-5 scale
        socialSentiment: 0.5 + (avgSentiment * 0.3), // Convert to 0-1 scale
        newsVolume: Math.floor(Math.random() * 100) + 50, // Placeholder
        sentimentTrend: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral'
      };
    } catch (error) {
      logger.error(`Yahoo Finance sentiment error for ${symbol}:`, error);
      // Return neutral sentiment on error
      return {
        analystRating: 3.0,
        socialSentiment: 0.5,
        newsVolume: 75,
        sentimentTrend: 'neutral'
      };
    }
  }
}

export const yahooFinanceService = new YahooFinanceService();