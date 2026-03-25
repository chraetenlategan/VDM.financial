// app.js — Initialisation: creates instances, wires up globals
// Depends on: config.js, utils.js, EntityManager.js, CalendarPicker.js,
//             DocumentGenerator.js, PreviewManager.js, ExcelImporter.js

// ── Live update stub (triggers on generate) ──
function liveUpdate() { /* update on generate */ }

// ── Create instances ──
const entityManager = new EntityManager(liveUpdate);

const CAL_CONFIG = createCalConfig({
  autoFillPrevYear: () => entityManager.autoFillPrevYear(),
  liveUpdate: liveUpdate
});
const calendarPicker = new CalendarPicker(CAL_CONFIG);

const documentGenerator = new DocumentGenerator(entityManager);

const previewManager = new PreviewManager({
  appContainer:   document.getElementById('app-container'),
  toggleBar:      document.getElementById('mode-toggle-bar'),
  toggleLabel:    document.getElementById('toggle-label'),
  modeLabel:      document.getElementById('mode-label'),
  documentOutput: document.getElementById('document-output'),
  previewPanel:   document.querySelector('.preview-panel')
}, generateDoc);

const excelImporter = new ExcelImporter(entityManager);

// ── Generate & preview ──
function generateAndPreview() {
  generateDoc();
  previewManager.previewVisible = true;
  previewManager._applyPreviewMode();
}

function generateDoc() {
  const html = documentGenerator.generate();
  const output = document.getElementById('document-output');
  const placeholder = document.getElementById('placeholder');
  if (output) {
    output.innerHTML = html;
    output.classList.add('visible');
  }
  if (placeholder) placeholder.style.display = 'none';
  document.getElementById('btn-print')?.classList.add('visible');
}

// ── Initialise on load ──
entityManager.onReportTypeChange();
entityManager.addDirector();
entityManager.addDirector();
entityManager.buildPolicyChecklist();

// Wire bank "Other" live input
document.addEventListener('input', function (e) {
  if (e.target.id === 'bankOther') {
    document.getElementById('bankName').value = e.target.value;
    liveUpdate();
  }
});

// Init calendar close-on-click-outside
calendarPicker.init();
