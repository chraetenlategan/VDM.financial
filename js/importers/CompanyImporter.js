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
    // ── Entity name (row 8, col H) ──
    const entityName = cell('H8') || '';
    setField('companyName', entityName);

    // ── Registration number (row 13, col AA) ──
    const regNo = cell('AA13') || '';
    setField('regNumber', regNo);

    // ── Year end (row 26, col AA) ──
    const yearEndStr = cell('AA26') || '';
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

    // ── Addresses (row 21 = data, row 20 = headers) ──
    setField('postalAddress', fmtAddr(cell('C21')));
    setField('regAddress', fmtAddr(cell('H21')));
    setField('businessAddress', fmtAddr(cell('W21')));

    // ── Partner → VDM Signatory (row 10, col AA) ──
    CompanyImporter._mapSigner(cell('AA10'), setField);

    // ── Select entity type ──
    const ecCard = document.getElementById('ec-company');
    if (ecCard) em.selectEntity(ecCard, 'company');

    // ── Directors ──
    document.getElementById('directors-list').innerHTML = '';
    em.directors = [];
    em.directorCount = 0;

    // Find DIRECTORS header row dynamically
    let dirHeaderRow = 0;
    for (let r = 40; r <= 70; r++) {
      const val = cell('D' + r);
      if (val && /^DIRECTORS$/i.test(val.trim())) {
        dirHeaderRow = r;
        break;
      }
    }

    let dirsImported = 0;
    if (dirHeaderRow) {
      let dataRow = dirHeaderRow + 2; // skip column headers
      while (dataRow < dirHeaderRow + 20) {
        const name = cell('D' + dataRow);
        if (!name || /^SHAREHOLDERS$/i.test(name.trim())) break;
        const parts = name.replace(/^(MR|MRS|MS|MISS|DR|PROF|ADV|ME|MNR)\s+/i, '').trim().split(/\s+/);
        const surname = parts.pop() || '';
        const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
        const idNo = cell('L' + dataRow) || '';

        em.addDirector();
        const idx = em.directorCount;
        setField(`dir-init-${idx}`, initials);
        setField(`dir-sur-${idx}`, surname);
        setField(`dir-id-${idx}`, idNo);
        dirsImported++;
        dataRow++;
      }
    }

    // ── Shareholders ──
    document.getElementById('shareholder-list').innerHTML = '';
    em.shareholderCount = 0;

    // Find SHAREHOLDERS header row dynamically
    let shHeaderRow = 0;
    for (let r = 40; r <= 80; r++) {
      const val = cell('C' + r) || cell('D' + r);
      if (val && /^(ORDINARY\s+)?SHARE\s*HOLDERS?$/i.test(val.trim())) {
        shHeaderRow = r;
        break;
      }
    }

    if (shHeaderRow) {
      let shRow = shHeaderRow + 2;
      while (shRow < shHeaderRow + 20) {
        const shName = cell('C' + shRow) || cell('D' + shRow);
        if (!shName) break;
        em.addShareholder();
        const idx = em.shareholderCount;
        setField(`sh-name-${idx}`, toTitleCase(shName));
        if (/\bPTY\b|\bLTD\b|\bCC\b|\bTRUST\b|\bINC\b/i.test(shName)) {
          const radio = document.querySelector(`input[name="sh-type-${idx}"][value="entity"]`);
          if (radio) { radio.checked = true; em.onShareholderTypeChange(idx); }
        }
        shRow++;
      }
    }

    // ── Summary ──
    const imported = [];
    if (entityName) imported.push('company name');
    if (regNo) imported.push('reg number');
    if (yearEndStr) imported.push('year end');
    if (fmtAddr(cell('C21'))) imported.push('postal address');
    if (fmtAddr(cell('H21'))) imported.push('registered address');
    if (dirsImported > 0) imported.push(dirsImported + ' director(s)');
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
