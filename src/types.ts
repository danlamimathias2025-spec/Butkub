export interface MarketPair {
  symbol: string;
  name: string;
  price: number;
  change: number;
  data: { value: number }[];
  isNeutral?: boolean;
}

export interface PortfolioData {
  totalBalanceTHB: number;
  totalBalanceUSD: number;
  change24h: number;
}
