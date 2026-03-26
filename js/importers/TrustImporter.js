// TrustImporter.js — SecInfo import logic for Trust entities
// Depends on: ExcelImporter (base), utils.js (toTitleCase)

class TrustImporter {
  /**
   * @param {Function} cell   - cell reader helper  cell('A1') → string
   * @param {Function} fmtAddr - address formatter
   * @param {Function} setField - sets input value by id
   * @param {Object}   em      - EntityManager instance
   */
  static extract(cell, fmtAddr, setField, em) {
    // ── Entity name (row 4, col H = column 8) ──
    const entityName = cell('H4') || '';
    setField('companyName', entityName);

    // ── Registration / Trust number (row 9, col AA = column 27) ──
    const regNo = cell('AA9') || '';
    setField('regNumber', regNo);

    // ── Year end (row 25, col AA) ──
    const yearEndStr = cell('AA25') || '';
    setField('yearEnd', yearEndStr);
    if (yearEndStr) {
      const m = yearEndStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (m) setField('prevYearEnd', `${m[1]} ${m[2]} ${parseInt(m[3]) - 1}`);
    }

    // ── Addresses ──
    // Postal address (row 20, col C–E area)
    setField('postalAddress', fmtAddr(cell('C20')));
    // Registered office (row 20, col H–J area)
    setField('regAddress', fmtAddr(cell('H20')));
    // Business address (row 20, col W–Y area)
    setField('businessAddress', fmtAddr(cell('W20')));

    // ── Partner → VDM Signatory ──
    const partnerRaw = cell('AA6') || '';
    TrustImporter._mapSigner(partnerRaw, setField);

    // ── Select entity type ──
    const ecCard = document.getElementById('ec-trust');
    if (ecCard) em.selectEntity(ecCard, 'trust');

    // ── Trustees ──
    // Clear existing
    document.getElementById('directors-list').innerHTML = '';
    em.directors = [];
    em.directorCount = 0;

    // Trustees section: header row has "TRUSTEES" in col D (column 4)
    // Data rows follow with: Name(D), Representative(G), ID/Reg(L), Appointed(Q)
    // Find the TRUSTEES header row first
    let trusteeHeaderRow = 0;
    for (let r = 40; r <= 70; r++) {
      const val = cell('D' + r);
      if (val && /^TRUSTEES$/i.test(val.trim())) {
        trusteeHeaderRow = r;
        break;
      }
    }

    let trusteesImported = 0;
    if (trusteeHeaderRow) {
      // Skip the column-header row (Name, Representative, ID, etc.)
      let dataRow = trusteeHeaderRow + 2;
      while (dataRow < trusteeHeaderRow + 20) {
        const name = cell('D' + dataRow);
        if (!name || /^BENEFICIARIES$/i.test(name.trim())) break;

        // Parse "MR LEON VAN DER MERWE" → initials + surname
        const parts = name.replace(/^(MR|MRS|MS|MISS|DR|PROF|ADV|ME|MNR)\s+/i, '').trim().split(/\s+/);
        const surname = parts.pop() || '';
        const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
        const idNo = cell('L' + dataRow) || '';

        em.addDirector();
        const idx = em.directorCount;
        setField(`dir-init-${idx}`, initials);
        setField(`dir-sur-${idx}`, surname);
        setField(`dir-id-${idx}`, idNo);
        trusteesImported++;
        dataRow++;
      }
    }

    // ── Build summary ──
    const imported = [];
    if (entityName) imported.push('trust name');
    if (regNo) imported.push('trust number');
    if (yearEndStr) imported.push('year end');
    if (cell('C20')) imported.push('postal address');
    if (cell('H20')) imported.push('registered address');
    if (trusteesImported > 0) imported.push(trusteesImported + ' trustee(s)');
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
