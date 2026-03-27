// ExcelImporter.js — Dispatcher that detects entity type and delegates to entity-specific importers
// Depends on: utils.js (toTitleCase), EntityManager, and js/importers/*.js

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

        // ── Detect entity type from the entity name ──
        // Try multiple common name cell locations
        const entityName = (cell('H8') || cell('H4') || cell('I8') || '').toUpperCase();

        let detectedType = 'company'; // default
        if (/\bTRUST\b/.test(entityName)) detectedType = 'trust';
        else if (/\bCC\b|\bBK\b/.test(entityName)) detectedType = 'cc';
        else if (/\bNPC\b|\bNPO\b/.test(entityName)) detectedType = 'npo';
        else if (/\bINC\b|\bINCORPORATED\b/.test(entityName)) detectedType = 'attorneys';
        else if (/\bSCHOOL\b|\bSKOOL\b/.test(entityName)) detectedType = 'school';
        else if (/\bBODY\s*CORPORATE\b/.test(entityName)) detectedType = 'bc';
        else if (/\bCHURCH\b|\bKERK\b|\bGEMEENTE\b/.test(entityName)) detectedType = 'church';
        else if (/\bCLUB\b/.test(entityName)) detectedType = 'club';

        // ── Delegate to entity-specific importer ──
        const setField = this.setField.bind(this);
        const em = this.em;
        let imported = [];

        const importerMap = {
          'trust':     typeof TrustImporter !== 'undefined'          ? TrustImporter : null,
          'company':   typeof CompanyImporter !== 'undefined'        ? CompanyImporter : null,
          'cc':        typeof CCImporter !== 'undefined'             ? CCImporter : null,
          'npo':       typeof NPOImporter !== 'undefined'            ? NPOImporter : null,
          'attorneys': typeof AttorneysImporter !== 'undefined'      ? AttorneysImporter : null,
          'school':    typeof SchoolImporter !== 'undefined'         ? SchoolImporter : null,
          'church':    typeof ChurchImporter !== 'undefined'         ? ChurchImporter : null,
          'club':      typeof ClubImporter !== 'undefined'           ? ClubImporter : null,
          'bc':        typeof BodyCorporateImporter !== 'undefined'  ? BodyCorporateImporter : null,
        };

        const Importer = importerMap[detectedType];
        if (Importer) {
          imported = Importer.extract(cell, fmtAddr, setField, em);
        } else {
          // Fallback: use CompanyImporter as default
          imported = CompanyImporter.extract(cell, fmtAddr, setField, em);
        }

        // ── Success ──
        status.style.color = 'var(--success)';
        status.textContent = `Imported (${detectedType}): ${imported.join(', ')}.`;

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
