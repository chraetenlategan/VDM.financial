// AttorneysImporter.js — SecInfo import logic for Attorneys / Incorporated entities

class AttorneysImporter {
  static extract(cell, fmtAddr, setField, em) {
    const entityName = cell('H8') || '';
    setField('companyName', entityName);

    const regNo = cell('AA13') || '';
    setField('regNumber', regNo);

    const yearEndStr = cell('AA26') || '';
    setField('yearEnd', yearEndStr);
    if (yearEndStr) {
      const m = yearEndStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (m) setField('prevYearEnd', `${m[1]} ${m[2]} ${parseInt(m[3]) - 1}`);
    }

    setField('postalAddress', fmtAddr(cell('C21')));
    setField('regAddress', fmtAddr(cell('H21')));
    setField('businessAddress', fmtAddr(cell('W21')));

    AttorneysImporter._mapSigner(cell('AA10'), setField);

    const ecCard = document.getElementById('ec-attorneys');
    if (ecCard) em.selectEntity(ecCard, 'attorneys');

    // ── Directors / Partners ──
    document.getElementById('directors-list').innerHTML = '';
    em.directors = [];
    em.directorCount = 0;

    let headerRow = 0;
    for (let r = 40; r <= 70; r++) {
      const val = cell('D' + r);
      if (val && /^(DIRECTORS|PARTNERS)$/i.test(val.trim())) {
        headerRow = r;
        break;
      }
    }

    let dirsImported = 0;
    if (headerRow) {
      let dataRow = headerRow + 2;
      while (dataRow < headerRow + 20) {
        const name = cell('D' + dataRow);
        if (!name) break;
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

    const imported = [];
    if (entityName) imported.push('firm name');
    if (regNo) imported.push('reg number');
    if (yearEndStr) imported.push('year end');
    if (fmtAddr(cell('C21'))) imported.push('postal address');
    if (fmtAddr(cell('H21'))) imported.push('registered address');
    if (dirsImported > 0) imported.push(dirsImported + ' director(s)/partner(s)');
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
