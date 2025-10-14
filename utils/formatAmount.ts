// utils/formatAmount.ts
export const formatamount = (
    amount: number,
    currencySymbol?: string
  ): string => {
    if (isNaN(amount)) return `${currencySymbol || ""}0`;
  
    let formatted: string;
  
    if (amount >= 1_000_000_000) {
      formatted = (amount / 1_000_000_000).toFixed(3) + "B";
    } else if (amount >= 1_000_000) {
      formatted = (amount / 1_000_000).toFixed(1) + "M";
   
    } else {
      formatted = amount.toLocaleString();
    }
  
    return `${currencySymbol || ""}${formatted}`;
  };
  