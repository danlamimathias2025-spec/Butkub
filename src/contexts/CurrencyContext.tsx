import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'THB' | 'USD' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convert: (amountTHB: number) => number;
  format: (amountTHB: number) => string;
  rates: { [key in Currency]: number };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Simulated dynamic rates (base THB)
const INITIAL_RATES = {
  THB: 1,
  USD: 0.028,
  EUR: 0.026
};

const CURRENCY_SYMBOLS = {
  THB: '฿',
  USD: '$',
  EUR: '€'
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('base_currency');
    return (saved as Currency) || 'THB';
  });

  const [rates, setRates] = useState(INITIAL_RATES);

  useEffect(() => {
    localStorage.setItem('base_currency', currency);
  }, [currency]);

  // Simulate dynamic rate updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRates(prev => ({
        ...prev,
        USD: prev.USD * (1 + (Math.random() - 0.5) * 0.001),
        EUR: prev.EUR * (1 + (Math.random() - 0.5) * 0.001),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const convert = (amountTHB: number) => {
    return amountTHB * rates[currency];
  };

  const format = (amountTHB: number) => {
    const converted = convert(amountTHB);
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};
