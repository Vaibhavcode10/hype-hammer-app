/**
 * Currency Utilities - Indian Number System Formatting
 * 
 * This file provides utilities for formatting currency values
 * using the Indian number system (Lakhs, Crores)
 */

/**
 * Format amount using Indian number system (₹)
 * @param amount - The numeric amount to format
 * @returns Formatted string with ₹ symbol (e.g., "₹1,00,00,000")
 */
export const formatIndianCurrency = (amount: number): string => {
  if (amount === 0) return '₹0';
  
  // Round to whole rupees
  const roundedAmount = Math.round(amount);
  
  // Convert to string and handle negative numbers
  const isNegative = roundedAmount < 0;
  const absAmount = Math.abs(roundedAmount);
  const amountStr = absAmount.toString();
  
  // Split into integer and decimal parts (though we only use integers)
  const len = amountStr.length;
  
  // For amounts less than 1000, no special formatting needed
  if (len <= 3) {
    return `${isNegative ? '-' : ''}₹${amountStr}`;
  }
  
  // Indian system: first 3 digits from right, then pairs
  // e.g., 12,34,567 for 1234567
  let result = amountStr.slice(-3); // Last 3 digits
  let remaining = amountStr.slice(0, -3);
  
  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    result = chunk + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  
  return `${isNegative ? '-' : ''}₹${result}`;
};

/**
 * Format amount in short form using Indian units (L for Lakhs, Cr for Crores)
 * @param amount - The numeric amount to format
 * @returns Short formatted string (e.g., "₹1.5Cr", "₹50L")
 */
export const formatIndianCurrencyShort = (amount: number): string => {
  if (amount === 0) return '₹0';
  
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const sign = isNegative ? '-' : '';
  
  // Crores (1 Cr = 10,000,000)
  if (absAmount >= 10000000) {
    const crores = absAmount / 10000000;
    return `${sign}₹${crores.toFixed(crores % 1 === 0 ? 0 : 2)}Cr`;
  }
  
  // Lakhs (1 L = 100,000)
  if (absAmount >= 100000) {
    const lakhs = absAmount / 100000;
    return `${sign}₹${lakhs.toFixed(lakhs % 1 === 0 ? 0 : 1)}L`;
  }
  
  // Thousands (1 K = 1,000)
  if (absAmount >= 1000) {
    const thousands = absAmount / 1000;
    return `${sign}₹${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)}K`;
  }
  
  return `${sign}₹${Math.round(absAmount)}`;
};

// ========================
// UNIT-BASED FORMATTING
// ========================

import type { CurrencyUnit } from '../types';

/**
 * Divisor values for each currency unit
 */
const CURRENCY_DIVISORS: Record<CurrencyUnit, number> = {
  'K': 1000,      // Thousands
  'L': 100000,    // Lakhs
  'Cr': 10000000  // Crores
};

/**
 * Format amount using a specific currency unit
 * Always displays in the selected unit regardless of magnitude
 * 
 * @param amount - Raw numeric amount
 * @param unit - Currency unit (K, L, Cr)
 * @param includeSymbol - Whether to include ₹ symbol (default: true)
 * @returns Formatted string (e.g., "₹1.5L", "100K", "0.01Cr")
 */
export const formatWithUnit = (
  amount: number,
  unit: CurrencyUnit = 'L',
  includeSymbol: boolean = true
): string => {
  if (amount === 0) return includeSymbol ? '₹0' : '0';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const divisor = CURRENCY_DIVISORS[unit];
  const value = absAmount / divisor;
  
  // Determine decimal places based on value
  let decimals: number;
  if (value >= 100) {
    decimals = 0; // Large values: no decimals
  } else if (value >= 10) {
    decimals = 1; // Medium values: 1 decimal
  } else if (value >= 1) {
    decimals = 2; // Small values: 2 decimals
  } else {
    decimals = 3; // Very small values: 3 decimals
  }
  
  // Format with appropriate precision, trim trailing zeros
  let formatted = value.toFixed(decimals);
  // Remove trailing zeros after decimal point
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }
  
  const sign = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹' : '';
  
  return `${sign}${symbol}${formatted}${unit}`;
};

/**
 * Format amount for bid buttons (compact, with + prefix for increments)
 * 
 * @param amount - Raw numeric amount
 * @param unit - Currency unit (K, L, Cr)
 * @returns Formatted string for button label (e.g., "+1L", "+25K")
 */
export const formatBidButtonLabel = (
  amount: number,
  unit: CurrencyUnit = 'L'
): string => {
  const divisor = CURRENCY_DIVISORS[unit];
  const value = amount / divisor;
  
  // Format compactly for buttons
  let formatted: string;
  if (value % 1 === 0) {
    formatted = value.toFixed(0);
  } else if (value >= 1) {
    formatted = value.toFixed(1).replace(/\.0$/, '');
  } else {
    formatted = value.toFixed(2).replace(/\.?0+$/, '');
  }
  
  return `+${formatted}${unit}`;
};

/**
 * Get the default currency unit based on typical match budgets
 * Can be used when no unit is configured
 */
export const getDefaultCurrencyUnit = (): CurrencyUnit => 'L';

/**
 * Format amount with full units in words
 * @param amount - The numeric amount to format  
 * @returns Human-readable string (e.g., "₹1.5 Crore", "₹50 Lakh")
 */
export const formatIndianCurrencyWords = (amount: number): string => {
  if (amount === 0) return '₹0';
  
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const sign = isNegative ? '-' : '';
  
  // Crores
  if (absAmount >= 10000000) {
    const crores = absAmount / 10000000;
    const unit = crores === 1 ? 'Crore' : 'Crores';
    return `${sign}₹${crores.toFixed(crores % 1 === 0 ? 0 : 2)} ${unit}`;
  }
  
  // Lakhs
  if (absAmount >= 100000) {
    const lakhs = absAmount / 100000;
    const unit = lakhs === 1 ? 'Lakh' : 'Lakhs';
    return `${sign}₹${lakhs.toFixed(lakhs % 1 === 0 ? 0 : 1)} ${unit}`;
  }
  
  // Thousands
  if (absAmount >= 1000) {
    const thousands = absAmount / 1000;
    const unit = thousands === 1 ? 'Thousand' : 'Thousand';
    return `${sign}₹${thousands.toFixed(thousands % 1 === 0 ? 0 : 1)} ${unit}`;
  }
  
  return `${sign}₹${Math.round(absAmount)}`;
};

/**
 * Parse Indian currency string to number
 * Handles formats like "₹1,00,000", "1L", "1.5Cr", etc.
 * @param value - The string value to parse
 * @returns Numeric value or NaN if invalid
 */
export const parseIndianCurrency = (value: string): number => {
  if (!value || typeof value !== 'string') return NaN;
  
  // Remove ₹, Rs, commas, spaces
  let cleaned = value.replace(/[₹Rs,.₹\s]/gi, '').trim();
  
  // Handle short forms
  const lowerValue = cleaned.toLowerCase();
  
  if (lowerValue.endsWith('cr') || lowerValue.endsWith('crore') || lowerValue.endsWith('crores')) {
    const num = parseFloat(cleaned.replace(/cr(ore)?s?/i, ''));
    return num * 10000000;
  }
  
  if (lowerValue.endsWith('l') || lowerValue.endsWith('lakh') || lowerValue.endsWith('lakhs')) {
    const num = parseFloat(cleaned.replace(/l(akh)?s?/i, ''));
    return num * 100000;
  }
  
  if (lowerValue.endsWith('k') || lowerValue.endsWith('thousand') || lowerValue.endsWith('thousands')) {
    const num = parseFloat(cleaned.replace(/k|(thousand)?s?/i, ''));
    return num * 1000;
  }
  
  return parseFloat(cleaned) || NaN;
};

/**
 * Format currency input in real-time (for form inputs)
 * @param value - The input value (may have partial formatting)
 * @returns Cleaned numeric value as string
 */
export const formatCurrencyInput = (value: string): string => {
  // Remove everything except digits
  const digits = value.replace(/\D/g, '');
  return digits;
};

/**
 * Format displayed currency value for input field
 * @param value - The numeric string or number
 * @returns Formatted display value with Indian formatting
 */
export const formatCurrencyDisplay = (value: string | number): string => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num === 0) return '';
  return formatIndianCurrency(num).replace('₹', '');
};

/**
 * Get base price validation result
 * @param basePrice - Player's base price
 * @param maxBasePrice - Maximum allowed base price from matchSettings
 * @param avgPlayerValue - Average player value from matchSettings
 * @returns Validation result with warnings and errors
 */
export interface BasePriceValidation {
  isValid: boolean;
  hasWarning: boolean;
  hasError: boolean;
  warningMessage: string | null;
  errorMessage: string | null;
}

export const validateBasePrice = (
  basePrice: number,
  maxBasePrice: number,
  avgPlayerValue: number
): BasePriceValidation => {
  const result: BasePriceValidation = {
    isValid: true,
    hasWarning: false,
    hasError: false,
    warningMessage: null,
    errorMessage: null,
  };

  // HARD BLOCK: Base price exceeds max
  if (basePrice > maxBasePrice) {
    result.isValid = false;
    result.hasError = true;
    result.errorMessage = `Base price is too high for the given team purse and squad size. Please enter a value below ${formatIndianCurrency(maxBasePrice)}.`;
    return result;
  }

  // SOFT WARNING: Base price higher than average
  if (basePrice > avgPlayerValue) {
    result.hasWarning = true;
    result.warningMessage = "This base price is higher than the average team budget per player.";
  }

  return result;
};
