const { parsePhoneNumberFromString } = require("libphonenumber-js");

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
const PIN_REGEX = /^\d{4,6}$/; // PIN numérique 4 à 6 chiffres

function isValidGmail(email) {
  return GMAIL_REGEX.test(String(email).trim());
}

function isValidPhone(phone, countryCode) {
  const parsed = parsePhoneNumberFromString(phone, countryCode);
  return parsed ? parsed.isValid() : false;
}

function isValidPin(pin) {
  return PIN_REGEX.test(pin);
}

function isSupportedCurrency(currency, supportedCurrencies) {
  return supportedCurrencies.includes(currency.toUpperCase());
}

module.exports = { isValidGmail, isValidPhone, isValidPin, isSupportedCurrency };
