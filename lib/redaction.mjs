const SECRET_PATTERNS = [
  { pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, preservePrefix: false },
  { pattern: /\b(?:sk|pk)_[A-Za-z0-9_-]{20,}\b/g, preservePrefix: false },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, preservePrefix: false },
  { pattern: /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{8,}\b/g, preservePrefix: false },
  { pattern: /([?&](?:token|key|secret|password|api_key)=)[^&\s]+/gi, preservePrefix: true },
  {
    pattern: /((?:token|secret|password|api[_-]?key|jwt|auth|cookie|session)\s*[:=]\s*)[^\s,;]+/gi,
    preservePrefix: true,
  },
];

const WINDOWS_ABSOLUTE_PATH = /\b[A-Za-z]:[\\/](?:[^\r\n<>:"|?*]+[\\/])*[^\r\n<>:"|?*]*/g;
const PRIVATE_POSIX_PATH = /\/(?:Users|home|private|tmp|var\/folders)\/[A-Za-z0-9._~/-]+/g;
const CREDENTIAL_URL = /(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi;

const SENSITIVE_KEY_TERMS = Object.freeze([
  'key',
  'password',
  'passwordhash',
  'passwd',
  'pwd',
  'passphrase',
  'token',
  'secret',
  'authorization',
  'credential',
  'credentials',
  'apikey',
  'privatekey',
  'clientsecret',
  'connectionstring',
  'databaseurl',
  'dburl',
  'jwt',
  'auth',
  'authentication',
  'cookie',
  'cookies',
  'session',
  'sessionid',
  'csrf',
  'xsrf',
]);
const UND_DELIMITED_SECRET_FRAGMENTS = Object.freeze([
  'accesstoken',
  'refreshtoken',
  'oauthtoken',
  'sessiontoken',
  'authtoken',
  'bearertoken',
  'secretkey',
  'signingkey',
  'encryptionkey',
  'privatekey',
  'clientsecret',
  'apikey',
  'connectionstring',
  'databaseurl',
  'authtoken',
  'cookieheader',
  'setcookie',
  'sessioncookie',
]);
const AMBIGUOUS_CONTAINER_ROOTS = Object.freeze([
  'auth', 'authentication', 'authorization', 'cookie', 'session', 'jwt', 'csrf', 'xsrf',
]);
const AMBIGUOUS_CONTAINER_DESCRIPTORS = Object.freeze([
  'header', 'value', 'data', 'material', 'payload', 'blob', 'json', 'bytes', 'pem', 'cookie', 'token',
]);
const PUBLIC_CAPABILITY_NAMES = new Set([
  'read', 'edit', 'push', 'merge', 'deploy', 'delete', 'public-disclose',
]);
const SAFE_METADATA_KEY_NAMES = new Set([
  'tokencount', 'passwordpolicy', 'secretscanningenabled', 'authorizedcapabilities',
]);

function isSafeMetadataValue(normalizedKey, value) {
  if (normalizedKey === 'tokencount') return Number.isInteger(value) && value >= 0;
  if (normalizedKey === 'secretscanningenabled') return typeof value === 'boolean';
  if (normalizedKey === 'authorizedcapabilities') {
    return Array.isArray(value) && value.every((item) => PUBLIC_CAPABILITY_NAMES.has(item));
  }
  if (normalizedKey === 'passwordpolicy') {
    return typeof value === 'string' &&
      /\b(?:minimum|maximum|min|max|length|character|rotation|expiry|expire|reuse|complexity|required?)\b/i.test(value);
  }
  return false;
}

function isSensitiveKey(key, value) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (isSafeMetadataValue(normalized, value)) return false;
  if (SAFE_METADATA_KEY_NAMES.has(normalized)) return true;
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const components = new Set(words);
  for (let index = 0; index < words.length - 1; index += 1) {
    components.add(`${words[index]}${words[index + 1]}`);
  }
  return SENSITIVE_KEY_TERMS.some((term) => components.has(term)) ||
    UND_DELIMITED_SECRET_FRAGMENTS.some((fragment) => normalized.includes(fragment)) ||
    AMBIGUOUS_CONTAINER_ROOTS.some((root) =>
      AMBIGUOUS_CONTAINER_DESCRIPTORS.some(
        (descriptor) => normalized.includes(`${root}${descriptor}`),
      )) ||
    ['token', 'secret', 'password', 'passphrase', 'credential', 'credentials', 'authorization']
      .some((suffix) => normalized.endsWith(suffix));
}

export function redactString(value, { sensitiveValues = [] } = {}) {
  let redacted = value;
  for (const { pattern, preservePrefix } of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (...parts) =>
      preservePrefix ? `${parts[1]}<REDACTED_SECRET>` : '<REDACTED_SECRET>',
    );
  }
  redacted = redacted.replace(CREDENTIAL_URL, '$1<REDACTED_CREDENTIALS>@');
  redacted = redacted.replace(WINDOWS_ABSOLUTE_PATH, '<REDACTED_PATH>');
  redacted = redacted.replace(PRIVATE_POSIX_PATH, '<REDACTED_PATH>');
  for (const sensitive of sensitiveValues.filter(Boolean).sort((a, b) => b.length - a.length)) {
    redacted = redacted.split(sensitive).join('<REDACTED>');
  }
  return redacted;
}

export function redactPublicHandoff(value, options = {}) {
  if (typeof value === 'string') return redactString(value, options);
  if (Array.isArray(value)) return value.map((item) => redactPublicHandoff(item, options));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        const redactedKey = redactString(key, options);
        return [
          redactedKey,
          isSensitiveKey(key, item) ? '<REDACTED_SECRET>' : redactPublicHandoff(item, options),
        ];
      }),
    );
  }
  return value;
}
