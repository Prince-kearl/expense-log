export type CurrencyOption = {
  code: string;
  name: string;
  country: string;
  flag: string;
};

export const CURRENCIES: CurrencyOption[] = [
  { code: "GHS", name: "Ghanaian Cedi", country: "Ghana", flag: "🇬🇭" },
  { code: "USD", name: "US Dollar", country: "United States", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", country: "Eurozone", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", country: "United Kingdom", flag: "🇬🇧" },
  { code: "NGN", name: "Nigerian Naira", country: "Nigeria", flag: "🇳🇬" },
  { code: "XOF", name: "West African CFA Franc", country: "West Africa", flag: "🌍" },
  { code: "KES", name: "Kenyan Shilling", country: "Kenya", flag: "🇰🇪" },
  { code: "ZAR", name: "South African Rand", country: "South Africa", flag: "🇿🇦" },
  { code: "EGP", name: "Egyptian Pound", country: "Egypt", flag: "🇪🇬" },
  { code: "MAD", name: "Moroccan Dirham", country: "Morocco", flag: "🇲🇦" },
  { code: "INR", name: "Indian Rupee", country: "India", flag: "🇮🇳" },
  { code: "AED", name: "UAE Dirham", country: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "PKR", name: "Pakistani Rupee", country: "Pakistan", flag: "🇵🇰" },
  { code: "BDT", name: "Bangladeshi Taka", country: "Bangladesh", flag: "🇧🇩" },
  { code: "LKR", name: "Sri Lankan Rupee", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia", flag: "🇲🇾" },
  { code: "CNY", name: "Chinese Yuan", country: "China", flag: "🇨🇳" },
  { code: "JPY", name: "Japanese Yen", country: "Japan", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", country: "Canada", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", country: "Australia", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", country: "Switzerland", flag: "🇨🇭" },
];

export function findCurrency(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((c) => c.code === code);
}
