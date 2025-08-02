import Vapor
import Foundation

final class MarketDataService {
    let app: Application
    private let apiKey: String
    
    init(_ app: Application) {
        self.app = app
        self.apiKey = Environment.get("MARKET_DATA_API_KEY") ?? ""
    }
    
    // Fetch fundamental data
    func getFundamentals(symbol: String, on req: Request) async throws -> [String: Double] {
        // In production, this would call real market data APIs
        // For now, returning realistic mock data based on symbol
        
        req.logger.info("Fetching fundamentals for \(symbol)")
        
        // Simulate API delay
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        
        return generateMockFundamentals(for: symbol)
    }
    
    // Fetch market sentiment
    func getSentiment(symbol: String, on req: Request) async throws -> MarketSentiment {
        req.logger.info("Fetching sentiment for \(symbol)")
        
        // Simulate API delay
        try await Task.sleep(nanoseconds: 50_000_000) // 0.05 seconds
        
        return generateMockSentiment(for: symbol)
    }
    
    // MARK: - Mock Data Generation
    
    private func generateMockFundamentals(for symbol: String) -> [String: Double] {
        switch symbol.uppercased() {
        case "AAPL":
            return [
                "Market Cap": 3_000_000_000_000,
                "P/E Ratio": 32.5,
                "EPS": 6.05,
                "Revenue": 383_285_000_000,
                "Revenue Growth": 0.08,
                "Gross Margin": 0.434,
                "Operating Margin": 0.302,
                "Net Margin": 0.253,
                "ROE": 1.478,
                "ROA": 0.289,
                "Debt to Equity": 1.95,
                "Current Ratio": 0.94,
                "Quick Ratio": 0.91,
                "Free Cash Flow": 99_800_000_000,
                "Dividend Yield": 0.0044,
                "Beta": 1.25,
                "52 Week High": 199.62,
                "52 Week Low": 164.08,
                "Price": 196.50,
                "Volume": 53_423_100
            ]
        case "GOOGL", "GOOG":
            return [
                "Market Cap": 2_000_000_000_000,
                "P/E Ratio": 27.8,
                "EPS": 5.80,
                "Revenue": 307_394_000_000,
                "Revenue Growth": 0.13,
                "Gross Margin": 0.573,
                "Operating Margin": 0.278,
                "Net Margin": 0.213,
                "ROE": 0.295,
                "ROA": 0.188,
                "Debt to Equity": 0.12,
                "Current Ratio": 2.35,
                "Quick Ratio": 2.35,
                "Free Cash Flow": 69_495_000_000,
                "Dividend Yield": 0,
                "Beta": 1.06,
                "52 Week High": 179.49,
                "52 Week Low": 120.21,
                "Price": 161.30,
                "Volume": 22_154_800
            ]
        case "TSLA":
            return [
                "Market Cap": 800_000_000_000,
                "P/E Ratio": 75.2,
                "EPS": 3.40,
                "Revenue": 96_773_000_000,
                "Revenue Growth": 0.19,
                "Gross Margin": 0.273,
                "Operating Margin": 0.097,
                "Net Margin": 0.103,
                "ROE": 0.241,
                "ROA": 0.089,
                "Debt to Equity": 0.28,
                "Current Ratio": 1.69,
                "Quick Ratio": 1.08,
                "Free Cash Flow": 7_500_000_000,
                "Dividend Yield": 0,
                "Beta": 2.02,
                "52 Week High": 299.29,
                "52 Week Low": 152.37,
                "Price": 255.80,
                "Volume": 97_456_300
            ]
        default:
            // Generic tech stock fundamentals
            return [
                "Market Cap": 50_000_000_000,
                "P/E Ratio": 25.0,
                "EPS": 4.20,
                "Revenue": 10_000_000_000,
                "Revenue Growth": 0.15,
                "Gross Margin": 0.45,
                "Operating Margin": 0.20,
                "Net Margin": 0.15,
                "ROE": 0.22,
                "ROA": 0.12,
                "Debt to Equity": 0.5,
                "Current Ratio": 1.8,
                "Quick Ratio": 1.5,
                "Free Cash Flow": 1_500_000_000,
                "Dividend Yield": 0.015,
                "Beta": 1.3,
                "52 Week High": 120.0,
                "52 Week Low": 80.0,
                "Price": 105.0,
                "Volume": 5_000_000
            ]
        }
    }
    
    private func generateMockSentiment(for symbol: String) -> MarketSentiment {
        switch symbol.uppercased() {
        case "AAPL":
            return MarketSentiment(
                analystRating: 4.3,
                socialSentiment: 0.82,
                newsVolume: 245,
                sentimentTrend: "positive"
            )
        case "GOOGL", "GOOG":
            return MarketSentiment(
                analystRating: 4.1,
                socialSentiment: 0.75,
                newsVolume: 189,
                sentimentTrend: "stable"
            )
        case "TSLA":
            return MarketSentiment(
                analystRating: 3.5,
                socialSentiment: 0.68,
                newsVolume: 412,
                sentimentTrend: "volatile"
            )
        default:
            return MarketSentiment(
                analystRating: 3.8,
                socialSentiment: 0.7,
                newsVolume: 75,
                sentimentTrend: "neutral"
            )
        }
    }
}

// MARK: - Application Extension

extension Application {
    func make(_ service: MarketDataService.Type) -> MarketDataService {
        return MarketDataService(self)
    }
}