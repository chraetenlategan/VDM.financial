// CompanyImporter.js — SecInfo import logic for Company (Pty) Ltd entities
// Depends on: ExcelImporter (base), utils.js (toTitleCase)

class CompanyImporter {
  /**
   * @param {Function} cell     - cell reader helper  cell('A1') → string
   * @param {Function} fmtAddr  - address formatter
   * @param {Function} setField - sets input value by id
   * @param {Object}   em       - EntityManager instance
   */
  static extract(cell, fmtAddr, setField, em) {
    // ── Entity name (row 8, col I) ──
    const entityName = cell('I8') || '';
    setField('companyName', entityName);

    // ── Registration number (row 12, col AB) ──
    const regNo = cell('AB12') || '';
    setField('regNumber', regNo);

    // ── Year end ──
    const yearEndStr = cell('AB25') || '';
    setField('yearEnd', yearEndStr);
    if (yearEndStr) {
      const m = yearEndStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (m) setField('prevYearEnd', `${m[1]} ${m[2]} ${parseInt(m[3]) - 1}`);
    }

    // ── Nature of business ──
    const mainObj = cell('E26');
    if (mainObj && !/NO RESTRICTION/i.test(mainObj)) {
      setField('natureBusiness', mainObj.toLowerCase());
    }

    // ── Addresses ──
    setField('postalAddress', fmtAddr(cell('E20')));
    setField('regAddress', fmtAddr(cell('I20')));
    setField('businessAddress', fmtAddr(cell('X20')));

    // ── Partner → VDM Signatory ──
    CompanyImporter._mapSigner(cell('AB9'), setField);

    // ── Select entity type ──
    const ecCard = document.getElementById('ec-company');
    if (ecCard) em.selectEntity(ecCard, 'company');

    // ── Directors ──
    document.getElementById('directors-list').innerHTML = '';
    em.directors = [];
    em.directorCount = 0;

    let dirRow = 58;
    while (dirRow < 100) {
      const dirName = cell('F' + dirRow);
      if (!dirName) break;
      const parts = dirName.replace(/^(MR|MRS|MS|MISS|DR|PROF|ADV|ME|MNR)\s+/i, '').trim().split(/\s+/);
      const surname = parts.pop() || '';
      const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
      const idNo = cell('S' + dirRow);

      em.addDirector();
      const idx = em.directorCount;
      setField(`dir-init-${idx}`, initials);
      setField(`dir-sur-${idx}`, surname);
      setField(`dir-id-${idx}`, idNo);
      dirRow++;
    }

    // ── Shareholders ──
    document.getElementById('shareholder-list').innerHTML = '';
    em.shareholderCount = 0;

    let shRow = 51;
    while (shRow < 100) {
      const shName = cell('C' + shRow);
      if (!shName) break;
      if (/^ORDINARY\s+SHARE/i.test(shName)) { shRow++; continue; }
      em.addShareholder();
      const idx = em.shareholderCount;
      setField(`sh-name-${idx}`, toTitleCase(shName));
      if (/\bPTY\b|\bLTD\b|\bCC\b|\bTRUST\b|\bINC\b/i.test(shName)) {
        const radio = document.querySelector(`input[name="sh-type-${idx}"][value="entity"]`);
        if (radio) { radio.checked = true; em.onShareholderTypeChange(idx); }
      }
      shRow++;
    }

    // ── Summary ──
    const imported = [];
    if (entityName) imported.push('company name');
    if (regNo) imported.push('reg number');
    if (yearEndStr) imported.push('year end');
    if (cell('E20')) imported.push('postal address');
    if (cell('I20')) imported.push('registered address');
    if (dirRow > 58) imported.push((dirRow - 58) + ' director(s)');
    if (em.shareholderCount > 0) imported.push(em.shareholderCount + ' shareholder(s)');
    return imported;
  }

  static _mapSigner(partnerRaw, setField) {
    if (!partnerRaw) return;
    const pName = partnerRaw.replace(/\s*\[.*\]/, '').trim().toUpperCase();
    const signerMap = {
      'LEON VAN DER MERWE': 'L VAN DER MERWE',
      'L VAN DER MERWE': 'L VAN DER MERWE',
      'HENDRIK LEON VAN DER MERWE': 'HL VAN DER MERWE',
      'HL VAN DER MERWE': 'HL VAN DER MERWE',
      'REINETTE DE BEER': 'R DE BEER',
      'R DE BEER': 'R DE BEER',
      'RIEKIE WOLMARANS': 'R WOLMARANS',
      'R WOLMARANS': 'R WOLMARANS',
    };
    const signerVal = signerMap[pName];
    if (signerVal) {
      const el = document.getElementById('compilerSigner');
      if (el) el.value = signerVal;
    }
  }
}
