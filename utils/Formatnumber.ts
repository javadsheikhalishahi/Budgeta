// utils/formatAmount.ts
export const formatnumber = (
    amount: number,
    currencySymbol?: string
  ): string => {
    if (isNaN(amount)) return `${currencySymbol || ""}0`;
  
    const sign = amount < 0 ? "-" : "";
    const absAmount = Math.abs(amount);
  
    let formatted: string;
  
    if (absAmount >= 1_000_000_000) {
      formatted = (absAmount / 1_000_000_000).toFixed(3) + "B";
    } else if (absAmount >= 1_000_000) {
      formatted = (absAmount / 1_000_000).toFixed(1) + "M";
    } else {
      formatted = absAmount.toLocaleString();
    }
  
    return `${sign}${currencySymbol || ""}${formatted}`;
  };
  