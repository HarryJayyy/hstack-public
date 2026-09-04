import test from 'node:test';
import assert from 'node:assert/strict';
import { redactPublicHandoff } from '../lib/redaction.mjs';

test('public handoff redacts secrets and private absolute paths recursively', () => {
  const result = redactPublicHandoff({
    path: 'C:\\Users\\Private\\project\\notes.md',
    normalizedPath: 'C:/dev/private/project',
    auth: 'Bearer abcdefghijklmnopqrstuvwxyz',
    nested: ['token=super-secret-value'],
    sentence: 'credential Bearer abcdefghijklmnopqrstuvwxyz must not leak',
    url: 'https://user:password@example.com/owner/repo.git',
  });
  assert.equal(result.path, '<REDACTED_PATH>');
  assert.equal(result.normalizedPath, '<REDACTED_PATH>');
  assert.equal(result.auth, '<REDACTED_SECRET>');
  assert.equal(result.nested[0], 'token=<REDACTED_SECRET>');
  assert.equal(result.sentence, 'credential <REDACTED_SECRET> must not leak');
  assert.equal(result.url, 'https://<REDACTED_CREDENTIALS>@example.com/owner/repo.git');
});

test('structured secret fields fail closed across nested objects and arrays', () => {
  const result = redactPublicHandoff({
    password: 'short-secret',
    nested: {
      api_key: { value: 'not-pattern-shaped' },
      accessToken: ['short', 42],
      privateKey: null,
    },
    entries: [{ clientSecret: 1234 }, { refresh_token: false }],
  });
  assert.equal(result.password, '<REDACTED_SECRET>');
  assert.equal(result.nested.api_key, '<REDACTED_SECRET>');
  assert.equal(result.nested.accessToken, '<REDACTED_SECRET>');
  assert.equal(result.nested.privateKey, '<REDACTED_SECRET>');
  assert.equal(result.entries[0].clientSecret, '<REDACTED_SECRET>');
  assert.equal(result.entries[1].refresh_token, '<REDACTED_SECRET>');
});

test('structured redaction preserves ordinary similarly named metadata', () => {
  const result = redactPublicHandoff({
    tokenCount: 3,
    passwordPolicy: 'minimum length 16',
    secretScanningEnabled: true,
    authorizedCapabilities: ['read'],
  });
  assert.deepEqual(result, {
    tokenCount: 3,
    passwordPolicy: 'minimum length 16',
    secretScanningEnabled: true,
    authorizedCapabilities: ['read'],
  });
});

test('safe metadata exceptions require their expected value types', () => {
  const result = redactPublicHandoff({
    tokenCount: 'short-secret',
    passwordPolicy: 'short-secret',
    secretScanningEnabled: 'short-secret',
    authorizedCapabilities: 'short-secret',
  });
  assert.deepEqual(result, {
    tokenCount: '<REDACTED_SECRET>',
    passwordPolicy: '<REDACTED_SECRET>',
    secretScanningEnabled: '<REDACTED_SECRET>',
    authorizedCapabilities: '<REDACTED_SECRET>',
  });
});

test('structured redaction fails closed for compound secret value keys', () => {
  const result = redactPublicHandoff({
    accessTokenValue: 'short-token',
    authorizationHeader: 'short-header',
    apiKeyMaterial: 'short-key',
    oauthTokenPayload: 'short-payload',
    clientSecretBlob: 'short-blob',
    databaseUrlBytes: 'short-bytes',
    credentialsJson: 'short-json',
    privateKeyPem: 'short-pem',
    key: 'short-key',
    signingKey: 'short-signing-key',
    encryptionKey: 'short-encryption-key',
    passphrase: 'short-passphrase',
    signingkey: 'short-lower-signing-key',
    SIGNINGKEY: 'short-upper-signing-key',
    encryptionkey: 'short-lower-encryption-key',
    ENCRYPTIONKEY: 'short-upper-encryption-key',
    accesstoken: 'short-lower-access-token',
  });
  assert.deepEqual(result, {
    accessTokenValue: '<REDACTED_SECRET>',
    authorizationHeader: '<REDACTED_SECRET>',
    apiKeyMaterial: '<REDACTED_SECRET>',
    oauthTokenPayload: '<REDACTED_SECRET>',
    clientSecretBlob: '<REDACTED_SECRET>',
    databaseUrlBytes: '<REDACTED_SECRET>',
    credentialsJson: '<REDACTED_SECRET>',
    privateKeyPem: '<REDACTED_SECRET>',
    key: '<REDACTED_SECRET>',
    signingKey: '<REDACTED_SECRET>',
    encryptionKey: '<REDACTED_SECRET>',
    passphrase: '<REDACTED_SECRET>',
    signingkey: '<REDACTED_SECRET>',
    SIGNINGKEY: '<REDACTED_SECRET>',
    encryptionkey: '<REDACTED_SECRET>',
    ENCRYPTIONKEY: '<REDACTED_SECRET>',
    accesstoken: '<REDACTED_SECRET>',
  });
});

test('auth, JWT, cookie, and session containers fail closed', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.short.signature';
  const result = redactPublicHandoff({
    jwt,
    auth: 'opaque-short-secret',
    cookie: 'session=opaque-short-secret',
    nested: {
      JWT: jwt,
      auth_token: ['opaque', { value: 'nested' }],
      setCookie: null,
      cookieHeader: { sameSite: 'strict' },
      session: 42,
    },
    note: `observed ${jwt}`,
  });
  assert.deepEqual(result, {
    jwt: '<REDACTED_SECRET>',
    auth: '<REDACTED_SECRET>',
    cookie: '<REDACTED_SECRET>',
    nested: {
      JWT: '<REDACTED_SECRET>',
      auth_token: '<REDACTED_SECRET>',
      setCookie: '<REDACTED_SECRET>',
      cookieHeader: '<REDACTED_SECRET>',
      session: '<REDACTED_SECRET>',
    },
    note: 'observed <REDACTED_SECRET>',
  });
});

test('alternate JWT encodings and undelimited credential containers redact', () => {
  const jwt = 'eyAiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl';
  assert.deepEqual(redactPublicHandoff({
    note: `observed ${jwt}`,
    authheader: 'opaque-auth',
    authorizationheader: 'opaque-authorization',
    cookievalue: 'opaque-cookie',
    sessiondata: 'opaque-session',
  }), {
    note: 'observed <REDACTED_SECRET>',
    authheader: '<REDACTED_SECRET>',
    authorizationheader: '<REDACTED_SECRET>',
    cookievalue: '<REDACTED_SECRET>',
    sessiondata: '<REDACTED_SECRET>',
  });
});
