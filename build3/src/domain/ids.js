import { randomUUID, randomBytes } from 'node:crypto';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Creates a unique identifier using Node's cryptographic UUID generator. */
export function newId() {
  return randomUUID();
}

/**
 * Creates a short booking reference that is reasonably easy to read aloud.
 * Ambiguous characters (I, O, 0 and 1) are excluded from the alphabet.
 */
export function newReference() {
  const bytes = randomBytes(8);
  let code = '';
  for (const byte of bytes) {
    code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
