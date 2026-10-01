import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { en, tr } from '../src/i18n/translations';
import { useI18nStore } from '../src/i18n/store';

// Helper to recursively check key parity and non-emptiness
function compareDictionaryKeys(obj1: Record<string, any>, obj2: Record<string, any>, prefix = '') {
  const keys1 = Object.keys(obj1).sort();
  const keys2 = Object.keys(obj2).sort();

  assert.deepEqual(
    keys1,
    keys2,
    `Key mismatch at "${prefix}": ${JSON.stringify(keys1)} vs ${JSON.stringify(keys2)}`
  );

  for (const key of keys1) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const val1 = obj1[key];
    const val2 = obj2[key];

    assert.equal(
      typeof val1,
      typeof val2,
      `Type mismatch at "${fullPath}": expected ${typeof val1}, got ${typeof val2}`
    );

    if (typeof val1 === 'object' && val1 !== null) {
      compareDictionaryKeys(val1, val2, fullPath);
    } else if (typeof val1 === 'string') {
      assert.ok(val1.trim().length > 0, `Empty string found at en.${fullPath}`);
      assert.ok(val2.trim().length > 0, `Empty string found at tr.${fullPath}`);
    }
  }
}

describe('i18n Translation Dictionaries', () => {
  it('should have 100% key and type parity between English and Turkish', () => {
    compareDictionaryKeys(en, tr);
  });

  it('should format sub-score details properly in English', () => {
    assert.equal(en.analysis.subScores.keywords.detail(85, 75), 'Tech: 85% • Hard: 75%');
    assert.equal(en.analysis.subScores.parseability.detail(5), '5 checks passed cleanly');
    assert.equal(en.analysis.subScores.experience.detail(4, 3), '~4 yrs vs 3 req.');
    assert.equal(
      en.analysis.gapClosing.bulletTemplate('Docker'),
      'Applied Docker in engineering high-reliability cloud services.'
    );
    assert.equal(en.export.downloadButton('pdf', 'en'), 'Download PDF (EN)');
  });

  it('should format sub-score details properly in Turkish', () => {
    assert.equal(tr.analysis.subScores.keywords.detail(85, 75), 'Teknik: %85 • Temel: %75');
    assert.equal(tr.analysis.subScores.parseability.detail(5), '5 denetim başarıyla geçti');
    assert.equal(tr.analysis.subScores.experience.detail(4, 3), '~4 yıl deneyim (istenen: 3)');
    assert.equal(
      tr.analysis.gapClosing.bulletTemplate('Docker'),
      'Yüksek güvenilirlikli bulut servislerinin geliştirilmesinde Docker teknolojisinden yararlanıldı.'
    );
    assert.equal(tr.export.downloadButton('pdf', 'tr'), 'İndir: PDF (TR)');
  });
});

describe('Zustand i18n Store', () => {
  it('should initialize with language en and English dictionary', () => {
    useI18nStore.getState().setLanguage('en');
    const state = useI18nStore.getState();
    assert.equal(state.language, 'en');
    assert.equal(state.t.header.title, en.header.title);
  });

  it('should change language to tr and switch dictionary', () => {
    useI18nStore.getState().setLanguage('tr');
    const state = useI18nStore.getState();
    assert.equal(state.language, 'tr');
    assert.equal(state.t.header.title, tr.header.title);
    assert.equal(state.t.header.title, 'ATS Özgeçmiş & İş Uyumu Analizörü');
  });

  it('should toggle language between en and tr', () => {
    useI18nStore.getState().setLanguage('en');
    assert.equal(useI18nStore.getState().language, 'en');

    useI18nStore.getState().toggleLanguage();
    assert.equal(useI18nStore.getState().language, 'tr');

    useI18nStore.getState().toggleLanguage();
    assert.equal(useI18nStore.getState().language, 'en');
  });
});
