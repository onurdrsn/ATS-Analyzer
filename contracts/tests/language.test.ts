import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LanguageSchema,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '../src/schemas/language.schema.js';

describe('LanguageSchema & Constants', () => {
  it('TC-LANG-01: accepts valid language "en"', () => {
    const result = LanguageSchema.parse('en');
    assert.equal(result, 'en');
  });

  it('TC-LANG-02: accepts valid language "tr"', () => {
    const result = LanguageSchema.parse('tr');
    assert.equal(result, 'tr');
  });

  it('TC-LANG-03: rejects unsupported language "fr"', () => {
    assert.throws(() => LanguageSchema.parse('fr'), /Invalid enum value/);
  });

  it('TC-LANG-04: rejects unsupported language "de"', () => {
    assert.throws(() => LanguageSchema.parse('de'), /Invalid enum value/);
  });

  it('TC-LANG-05: rejects empty string', () => {
    assert.throws(() => LanguageSchema.parse(''), /Invalid enum value/);
  });

  it('TC-LANG-06: rejects uppercase language "EN" and "TR" (strict lowercase)', () => {
    assert.throws(() => LanguageSchema.parse('EN'), /Invalid enum value/);
    assert.throws(() => LanguageSchema.parse('TR'), /Invalid enum value/);
  });

  it('TC-LANG-07: rejects non-string types (null, undefined, number, object)', () => {
    assert.throws(() => LanguageSchema.parse(null));
    assert.throws(() => LanguageSchema.parse(undefined));
    assert.throws(() => LanguageSchema.parse(123));
    assert.throws(() => LanguageSchema.parse({ lang: 'en' }));
  });

  it('TC-LANG-08: exports correct constants', () => {
    assert.deepEqual(SUPPORTED_LANGUAGES, ['en', 'tr']);
    assert.equal(DEFAULT_LANGUAGE, 'en');
  });
});
