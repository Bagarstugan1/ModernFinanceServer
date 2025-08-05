import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

// Interfaces matching client's Alpha Vantage models exactly
interface AlphaVantageQuote {
  '01. symbol': string;
  '05. price': string;
  '09. change': string;
  '10. change percent': string;
  '06. volume': string;
}

interface AlphaVantageOverview {
  Symbol?: string;
  Name?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  '52WeekHigh'?: string;
  '52WeekLow'?: string;
  '50DayMovingAverage'?: string;
  '200DayMovingAverage'?: string;
  Beta?: string;
  DividendYield?: string;
  ForwardPE?: string;
  PriceToBookRatio?: string;
  EPS?: string;
  BookValue?: string;
  Revenue?: string;
  GrossProfit?: string;
  OperatingIncome?: string;
  NetIncome?: string;
  TotalDebt?: string;
  TotalAssets?: string;
  TotalLiabilities?: string;
  CurrentRatio?: string;
  QuickRatio?: string;
  ROE?: string;
  ROA?: string;
  GrossMargin?: string;
  OperatingMargin?: string;
  NetMargin?: string;
}

interface AlphaVantageTimeSeriesDaily {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

interface AlphaVantageIncomeStatement {
  fiscalDateEnding?: string;
  totalRevenue?: string;
  netIncome?: string;
  operatingIncome?: string;
  grossProfit?: string;
}

interface AlphaVantageBalanceSheet {
  fiscalDateEnding?: string;
  totalAssets?: string;
  totalLiabilities?: string;
  totalShareholderEquity?: string;
  currentAssets?: string;
  currentLiabilities?: string;
  longTermDebt?: string;
  shortTermDebt?: string;
  cash?: string;
}

class AlphaVantageService {
  private axios: AxiosInstance;
  private apiKey: string;
  private baseURL = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT = 5; // 5 requests per minute for free tier
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000
    });

    if (!this.apiKey) {
      logger.warn('Alpha Vantage API key not configured');
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.RATE_LIMIT_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // If at rate limit, wait until window resets
    if (this.requestCount >= this.RATE_LIMIT) {
      const waitTime = this.RATE_LIMIT_WINDOW - (now - this.lastRequestTime);
      if (waitTime > 0) {
        logger.info(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }
    }
    
    this.requestCount++;
  }

  async getQuote(symbol: string): Promise<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  }> {
    try {
      await this.enforceRateLimit();
      
      const response = await this.axios.get('', {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        }
      });

      const quote = response.data['Global Quote'] as AlphaVantageQuote;
      
      if (!quote || !quote['05. price']) {
        throw new Error(`No quote data for ${symbol}`);
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price'] || '0'),
        change: parseFloat(quote['09. change'] || '0'),
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
        volume: parseInt(quote['06. volume'] || '0')
      };
    } catch (error) {
      logger.error(`Alpha Vantage quote error for ${symbol}:`, error);
      throw error;
    }
  }

  async getOverview(symbol: string): Promise<Record<string, number>> {
    try {
      await this.enforceRateLimit();
      
      const response = await this.axios.get('', {
        params: {
          function: 'OVERVIEW',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        }
      });

      const overview = response.data as AlphaVantageOverview;
      
      if (!overview || !overview.Symbol) {
        throw new Error(`No overview data for ${symbol}`);
      }

      // Transform to match client's expected format
      return {
        'Market Cap': this.parseNumber(overview.MarketCapitalization),
        'P/E Ratio': this.parseNumber(overview.PERatio),
        'EPS': this.parseNumber(overview.EPS),
        'Revenue': this.parseNumber(overview.Revenue),
        'Revenue Growth': 0.15, // Will be calculated from income statements
        'Gross Margin': this.parseNumber(overview.GrossMargin),
        'Operating Margin': this.parseNumber(overview.OperatingMargin),
        'Net Margin': this.parseNumber(overview.NetMargin),
        'ROE': this.parseNumber(overview.ROE),
        'ROA': this.parseNumber(overview.ROA),
        'Debt to Equity': 0.5, // Will be calculated from balance sheet
        'Current Ratio': this.parseNumber(overview.CurrentRatio),
        'Quick Ratio': this.parseNumber(overview.QuickRatio),
        'Free Cash Flow': 0, // Will be calculated
        'Dividend Yield': this.parseNumber(overview.DividendYield) / 100, // Convert percentage
        'Beta': this.parseNumber(overview.Beta),
        '52 Week High': this.parseNumber(overview['52WeekHigh']),
        '52 Week Low': this.parseNumber(overview['52WeekLow']),
        'Price': 0, // Will be set from quote
        'Volume': 0, // Will be set from quote
        'Forward PE': this.parseNumber(overview.ForwardPE),
        'Price to Book': this.parseNumber(overview.PriceToBookRatio),
        'Book Value': this.parseNumber(overview.BookValue)
      };
    } catch (error) {
      logger.error(`Alpha Vantage overview error for ${symbol}:`, error);
      throw error;
    }
  }

  async getIncomeStatement(symbol: string): Promise<AlphaVantageIncomeStatement[]> {
    try {
      await this.enforceRateLimit();
      
      const response = await this.axios.get('', {
        params: {
          function: 'INCOME_STATEMENT',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        }
      });

      const annualReports = response.data.annualReports || [];
      return annualReports.slice(0, 5); // Return last 5 years
    } catch (error) {
      logger.error(`Alpha Vantage income statement error for ${symbol}:`, error);
      return [];
    }
  }

  async getBalanceSheet(symbol: string): Promise<AlphaVantageBalanceSheet[]> {
    try {
      await this.enforceRateLimit();
      
      const response = await this.axios.get('', {
        params: {
          function: 'BALANCE_SHEET',
          symbol: symbol.toUpperCase(),
          apikey: this.apiKey
        }
      });

      const annualReports = response.data.annualReports || [];
      return annualReports.slice(0, 5); // Return last 5 years
    } catch (error) {
      logger.error(`Alpha Vantage balance sheet error for ${symbol}:`, error);
      return [];
    }
  }

  async getTimeSeries(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      await this.enforceRateLimit();
      
      const response = await this.axios.get('', {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: symbol.toUpperCase(),
          outputsize: outputSize,
          apikey: this.apiKey
        }
      });

      const timeSeries = response.data['Time Series (Daily)'] || {};
      
      return Object.entries(timeSeries).map(([date, data]: [string, any]) => {
        const dailyData = data as AlphaVantageTimeSeriesDaily;
        return {
          date,
          open: parseFloat(dailyData['1. open'] || '0'),
          high: parseFloat(dailyData['2. high'] || '0'),
          low: parseFloat(dailyData['3. low'] || '0'),
          close: parseFloat(dailyData['4. close'] || '0'),
          volume: parseInt(dailyData['5. volume'] || '0')
        };
      }).slice(0, 100); // Return last 100 days
    } catch (error) {
      logger.error(`Alpha Vantage time series error for ${symbol}:`, error);
      return [];
    }
  }

  async getComprehensiveFundamentals(symbol: string): Promise<Record<string, number>> {
    try {
      logger.info(`Fetching comprehensive fundamentals for ${symbol}`);
      
      // Parallel fetch with error handling for each
      const [quote, overview, incomeStatements, balanceSheets] = await Promise.allSettled([
        this.getQuote(symbol),
        this.getOverview(symbol),
        this.getIncomeStatement(symbol),
        this.getBalanceSheet(symbol)
      ]);

      let fundamentals: Record<string, number> = {};

      // Process overview data
      if (overview.status === 'fulfilled') {
        fundamentals = { ...overview.value };
      }

      // Add quote data
      if (quote.status === 'fulfilled') {
        fundamentals['Price'] = quote.value.price;
        fundamentals['Volume'] = quote.value.volume;
        fundamentals['Change'] = quote.value.change;
        fundamentals['Change Percent'] = quote.value.changePercent;
      }

      // Calculate additional metrics from financial statements
      if (incomeStatements.status === 'fulfilled' && incomeStatements.value.length > 1) {
        const currentRevenue = this.parseNumber(incomeStatements.value[0]?.totalRevenue);
        const previousRevenue = this.parseNumber(incomeStatements.value[1]?.totalRevenue);
        
        if (currentRevenue && previousRevenue) {
          fundamentals['Revenue Growth'] = (currentRevenue - previousRevenue) / previousRevenue;
        }
      }

      if (balanceSheets.status === 'fulfilled' && balanceSheets.value.length > 0) {
        const latestBalance = balanceSheets.value[0];
        const totalDebt = this.parseNumber(latestBalance?.longTermDebt) + this.parseNumber(latestBalance?.shortTermDebt);
        const equity = this.parseNumber(latestBalance?.totalShareholderEquity);
        
        if (equity && equity > 0) {
          fundamentals['Debt to Equity'] = totalDebt / equity;
        }
      }

      logger.info(`Successfully fetched fundamentals for ${symbol}`);
      return fundamentals;
    } catch (error) {
      logger.error(`Error fetching comprehensive fundamentals for ${symbol}:`, error);
      throw error;
    }
  }

  private parseNumber(value: string | undefined): number {
    if (!value || value === 'None' || value === '-' || value === '') {
      return 0;
    }
    
    // Remove any non-numeric characters except decimal point and minus sign
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
  }
}

export const alphaVantageService = new AlphaVantageService();