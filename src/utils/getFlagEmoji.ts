const countryCodeMap: Record<string, string> = {
  India: "🇮🇳",
  Spain: "🇪🇸",
  "United States": "🇺🇸",
  Germany: "🇩🇪",
  France: "🇫🇷",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  China: "🇨🇳",
  Japan: "🇯🇵",
  Brazil: "🇧🇷",
  "United Kingdom": "🇬🇧",
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
