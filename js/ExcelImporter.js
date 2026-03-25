// ExcelImporter.js — importSecInfo (xlsx)
// Depends on: utils.js (toTitleCase), EntityManager

class ExcelImporter {
  constructor(entityManager) {
    this.em = entityManager;
  }

  // Internal helper: set an input value by element ID
  setField(id, val) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }

  importSecInfo(input) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('import-status');
    status.style.display = 'block';
    status.style.color = 'var(--ink-light)';
    status.textContent = 'Reading file\u2026';

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Helper: read a cell value as string
        function cell(ref) {
          const c = ws[ref];
          if (!c) return '';
          if (c.t === 'd' && c.v instanceof Date) {
            // Format date as "28 February 2022"
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            return `${c.v.getDate()} ${months[c.v.getMonth()]} ${c.v.getFullYear()}`;
          }
          return (c.v != null ? String(c.v) : '').trim();
        }

        // Helper: format multiline address to single line
        function fmtAddr(raw) {
          if (!raw) return '';
          return raw.replace(/\\n/g, '\n').split('\n').map(s => s.trim()).filter(Boolean).join(', ');
        }

        // ── Map fields ──
        this.setField('companyName', cell('I8'));
        this.setField('regNumber', cell('AB12'));

        // Year End (date cell)
        const yearEndStr = cell('AB25');
        this.setField('yearEnd', yearEndStr);
        // Trigger auto-fill of previous year end
        if (yearEndStr) {
          const m = yearEndStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
          if (m) {
            this.setField('prevYearEnd', `${m[1]} ${m[2]} ${parseInt(m[3]) - 1}`);
          }
        }

        // Nature of business from Main Object
        const mainObj = cell('E26');
        if (mainObj && mainObj !== 'NO RESTRICTION ON BUSINESS ACTIVITIES') {
          this.setField('natureBusiness', mainObj.toLowerCase());
        }

        // Addresses
        this.setField('postalAddress', fmtAddr(cell('E20')));
        this.setField('regAddress', fmtAddr(cell('I20')));
        this.setField('businessAddress', fmtAddr(cell('X20')));

        // Partner → VDM Signatory
        const partnerRaw = cell('AB9');
        if (partnerRaw) {
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
            document.getElementById('compilerSigner').value = signerVal;
          }
        }

        // ── Entity type detection ──
        const entityName = cell('I8').toUpperCase();
        let detectedType = 'company';
        if (/\bCC\b|\bBK\b/.test(entityName)) detectedType = 'cc';
        else if (/\bTRUST\b/.test(entityName)) detectedType = 'trust';
        else if (/\bNPC\b|\bNPO\b/.test(entityName)) detectedType = 'npo';
        else if (/\bINC\b|\bINCORPORATED\b/.test(entityName)) detectedType = 'attorneys';
        else if (/\bSCHOOL\b|\bSKOOL\b/.test(entityName)) detectedType = 'school';
        else if (/\bBODY\s*CORPORATE\b/.test(entityName)) detectedType = 'bc';
        else if (/\bCHURCH\b|\bKERK\b|\bGEMEENTE\b/.test(entityName)) detectedType = 'church';
        else if (/\bCLUB\b/.test(entityName)) detectedType = 'club';
        // Select the entity card
        const ecCard = document.getElementById('ec-' + detectedType);
        if (ecCard) this.em.selectEntity(ecCard, detectedType);

        // ── Directors ──
        // Clear existing directors
        document.getElementById('directors-list').innerHTML = '';
        this.em.directors = [];
        this.em.directorCount = 0;
        // Scan director rows starting at row 58
        let dirRow = 58;
        while (dirRow < 100) {
          const dirName = cell('F' + dirRow);
          if (!dirName) break;
          // Parse "MR FRANCOIS STREICHER" → initials from first-name chars, surname = last word
          const parts = dirName.replace(/^(MR|MRS|MS|MISS|DR|PROF|ADV|ME|MNR)\s+/i, '').trim().split(/\s+/);
          const surname = parts.pop() || '';
          // Build initials from remaining name parts
          const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
          const idNo = cell('S' + dirRow);

          this.em.addDirector();
          const idx = this.em.directorCount;
          this.setField(`dir-init-${idx}`, initials);
          this.setField(`dir-sur-${idx}`, surname);
          this.setField(`dir-id-${idx}`, idNo);
          dirRow++;
        }

        // ── Shareholders ──
        // Clear existing shareholders
        document.getElementById('shareholder-list').innerHTML = '';
        this.em.shareholderCount = 0;
        // Scan shareholder rows: headers at row 50, data starts at 51
        // Skip "ORDINARY SHARE ()" header rows, read actual names
        let shRow = 51;
        while (shRow < 100) {
          const shName = cell('C' + shRow);
          if (!shName) break;
          // Skip share class header rows like "ORDINARY SHARE ()"
          if (/^ORDINARY\s+SHARE/i.test(shName)) { shRow++; continue; }
          this.em.addShareholder();
          const idx = this.em.shareholderCount;
          this.setField(`sh-name-${idx}`, toTitleCase(shName));
          // Detect if shareholder is an entity (has reg number format or PTY/LTD etc)
          const shId = cell('R' + shRow);
          if (/\bPTY\b|\bLTD\b|\bCC\b|\bTRUST\b|\bINC\b/i.test(shName)) {
            const radio = document.querySelector(`input[name="sh-type-${idx}"][value="entity"]`);
            if (radio) { radio.checked = true; this.em.onShareholderTypeChange(idx); }
          }
          shRow++;
        }

        // ── Success ──
        const imported = [];
        if (cell('I8')) imported.push('company name');
        if (cell('AB12')) imported.push('reg number');
        if (cell('AB25')) imported.push('year end');
        if (cell('E20')) imported.push('postal address');
        if (cell('I20')) imported.push('registered address');
        if (dirRow > 58) imported.push((dirRow - 58) + ' director(s)');
        if (this.em.shareholderCount > 0) imported.push(this.em.shareholderCount + ' shareholder(s)');
        status.style.color = 'var(--success)';
        status.textContent = 'Imported: ' + imported.join(', ') + '.';

        this.em.liveUpdate();
      } catch (err) {
        status.style.color = '#c0392b';
        status.textContent = 'Error reading file: ' + err.message;
        console.error('Import error:', err);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset so the same file can be re-imported
    input.value = '';
  }
}
