/**
 * A dialable tel: URL from a phone number as people write it.
 *
 * `tel:+1 (416) 555-0148` is what the pages produced, and Android's dialer
 * rejects the spaces and brackets. Keep the formatted text for the eye; the
 * href gets digits and a leading plus only.
 */
export const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;
