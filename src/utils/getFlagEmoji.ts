const countryCodeMap: Record<string, string> = {
  India: "IN",
  Spain: "ES",
  "United States": "US",
  Germany: "DE",
  France: "FR",
  Canada: "CA",
  Australia: "AU",
  China: "CN",
  Japan: "JP",
  Brazil: "BR",
  "United Kingdom": "GB",
};

export const getFlagEmoji = (country: string): string => {
  if (!country) return "🏳️";

  const code = countryCodeMap[country];

  if (!code) return "🏳️";

  return code
    .toUpperCase()
    .replace(/./g, char =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
};
