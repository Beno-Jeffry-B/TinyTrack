const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = CHARS.length; // 62

/**
 * Generates a random Base62 string of the given length.
 * Default length 7 → 62^7 ≈ 3.5 trillion unique combinations.
 */
const generateShortCode = (length = 7) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * BASE)];
  }
  return code;
};

module.exports = { generateShortCode };
