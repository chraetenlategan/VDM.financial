// NPOImporter.js — SecInfo import logic for NPO / NPC entities

class NPOImporter {
  static extract(cell, fmtAddr, setField, em) {
    const entityName = cell('I8') || '';
    setField('companyName', entityName);

    const regNo = cell('AB12') || '';
    setField('regNumber', regNo);

    const yearEndStr = cell('AB25') || '';
    setField('yearEnd', yearEndStr);
    if (yearEndStr) {
      const m = yearEndStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (m) setField('prevYearEnd', `${m[1]} ${m[2]} ${parseInt(m[3]) - 1}`);
    }

    const mainObj = cell('E26');
    if (mainObj && !/NO RESTRICTION/i.test(mainObj)) {
      setField('natureBusiness', mainObj.toLowerCase());
    }

    setField('postalAddress', fmtAddr(cell('E20')));
    setField('regAddress', fmtAddr(cell('I20')));
    setField('businessAddress', fmtAddr(cell('X20')));

    NPOImporter._mapSigner(cell('AB9'), setField);

    const ecCard = document.getElementById('ec-npo');
    if (ecCard) em.selectEntity(ecCard, 'npo');

    // ── Directors ──
    document.getElementById('directors-list').innerHTML = '';
    em.directors = [];
    em.directorCount = 0;

    let dirRow = 58;
    while (dirRow < 100) {
      const name = cell('F' + dirRow);
      if (!name) break;
      const parts = name.replace(/^(MR|MRS|MS|MISS|DR|PROF|ADV|ME|MNR)\s+/i, '').trim().split(/\s+/);
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

    const imported = [];
    if (entityName) imported.push('organisation name');
    if (regNo) imported.push('NPO number');
    if (yearEndStr) imported.push('year end');
    if (cell('E20')) imported.push('postal address');
    if (cell('I20')) imported.push('registered address');
    if (dirRow > 58) imported.push((dirRow - 58) + ' director(s)');
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
