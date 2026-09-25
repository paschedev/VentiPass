import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Joins the country prefix and the number typed by the user into the E.164
 * format the backend expects (+5491123456789). Returns null if it is not a
 * valid phone number.
 */
export function toE164Phone(prefix: string, number: string): string | null {
  const phone = parsePhoneNumberFromString(`${prefix}${number}`);
  return phone?.isValid() ? phone.number : null;
}
