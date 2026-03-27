// CCImporter.js — SecInfo import logic for Close Corporation entities
// Depends on: ExcelImporter (base), utils.js (toTitleCase)

class CCImporter {
  static extract(cell, fmtAddr, setField, em) {
    const entityName = cell('G8') || '';
    setField('companyName', entityName);

    const regNo = cell('R12') || '';
    setField('regNumber', regNo);

    const yearEndStr = cell('R25') || '';
    setField('yearEnd', yearEndStr);
    if (yearEndStr) {
      const m = yearEndStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (m) setField('prevYearEnd', `${m[1]} ${m[2]} ${parseInt(m[3]) - 1}`);
    }

    const mainObj = cell('D26');
    if (mainObj && !/NO RESTRICTION/i.test(mainObj)) {
      setField('natureBusiness', mainObj.toLowerCase());
    }

    setField('postalAddress', fmtAddr(cell('D20')));
    setField('regAddress', fmtAddr(cell('G20')));
    setField('businessAddress', fmtAddr(cell('O20')));

    CCImporter._mapSigner(cell('R9'), setField);

    const ecCard = document.getElementById('ec-cc');
    if (ecCard) em.selectEntity(ecCard, 'cc');

    // ── Members ──
    document.getElementById('directors-list').innerHTML = '';
    em.directors = [];
    em.directorCount = 0;

    let headerRow = 0;
    for (let r = 35; r <= 55; r++) {
      const val = cell('B' + r);
      if (val && /^MEMBERS$/i.test(val.trim())) {
        headerRow = r;
        break;
      }
    }

    let membersImported = 0;
    if (headerRow) {
      let dataRow = headerRow + 2;
      while (dataRow < headerRow + 20) {
        const name = cell('B' + dataRow);
        if (!name) break;
        // Strip "(Appointed ...)" suffix and title prefix
        const cleanName = name.replace(/\s*\(Appointed.*?\)/i, '');
        const parts = cleanName.replace(/^(MR|MRS|MS|MISS|DR|PROF|ADV|ME|MNR)\s+/i, '').trim().split(/\s+/);
        const surname = parts.pop() || '';
        const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
        const idNo = cell('K' + dataRow) || '';

        em.addDirector();
        const idx = em.directorCount;
        setField(`dir-init-${idx}`, initials);
        setField(`dir-sur-${idx}`, surname);
        setField(`dir-id-${idx}`, idNo);
        membersImported++;
        dataRow++;
      }
    }

    const imported = [];
    if (entityName) imported.push('CC name');
    if (regNo) imported.push('CK number');
    if (yearEndStr) imported.push('year end');
    if (fmtAddr(cell('D20'))) imported.push('postal address');
    if (fmtAddr(cell('G20'))) imported.push('registered address');
    if (membersImported > 0) imported.push(membersImported + ' member(s)');
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
