// Mock RAG response. Replace `fetchRagAnswer` with the real backend call;
// the UI only relies on the shape below.

export const ENTITY_TYPES = {
  requirement: 'Requisito',
  document: 'Documento',
  process: 'Processo',
  component: 'Componente',
  team: 'Team',
}

export const mockResponse = {
  query: 'Se modifico il requisito della gestione pallet, chi è impattato?',
  overview: [
    {
      text: 'La modifica del requisito REQ-PAL-012 (gestione pallet) ha impatto diretto su due processi: la palletizzazione di fine linea e il picking automatico.',
      cites: ['req-pal-012', 'proc-pallet', 'proc-picking'],
    },
    {
      text: 'Lato sistema, sono coinvolti il modulo WMS di allocazione ubicazioni e il controllo di missione degli LGV, che leggono le dimensioni pallet come parametro di configurazione.',
      cites: ['comp-wms', 'comp-lgv'],
    },
    {
      text: 'Si evidenzia la necessità di allineamento con il Team Software WMS e l’Ufficio Tecnico Meccanico prima del rilascio.',
      cites: ['team-sw', 'team-mecc'],
    },
  ],
  confidence: 0.86,
  entities: [
    {
      id: 'req-pal-012',
      type: 'requirement',
      label: 'REQ-PAL-012 · Gestione pallet',
      detail: 'Formati EUR / ISO, tolleranze di ingombro',
      source: 'Specifica_Funzionale_WMS_v3.2.pdf · p. 14',
    },
    {
      id: 'doc-spec',
      type: 'document',
      label: 'Specifica_Funzionale_WMS_v3.2.pdf',
      detail: 'Cap. 4 — Gestione unità di carico',
      source: 'Rev. 3.2 · 12/03/2026',
    },
    {
      id: 'doc-lgv',
      type: 'document',
      label: 'Manuale_LGV_Serie_E.pdf',
      detail: 'Sez. 7.3 — Parametri di presa forche',
      source: 'Rev. 1.8 · 04/11/2025',
    },
    {
      id: 'proc-pallet',
      type: 'process',
      label: 'Palletizzazione fine linea',
      detail: 'Robot di palletizzazione, schema di carico',
      source: 'Specifica_Funzionale_WMS_v3.2.pdf · p. 22',
    },
    {
      id: 'proc-picking',
      type: 'process',
      label: 'Picking automatico',
      detail: 'Prelievo da scaffale, verifica ingombro',
      source: 'Specifica_Funzionale_WMS_v3.2.pdf · p. 31',
    },
    {
      id: 'comp-wms',
      type: 'component',
      label: 'WMS · Allocazione ubicazioni',
      detail: 'Parametro pallet_dimensions',
      source: 'Specifica_Funzionale_WMS_v3.2.pdf · p. 40',
    },
    {
      id: 'comp-lgv',
      type: 'component',
      label: 'LGV · Controllo missione',
      detail: 'Profilo di presa e centraggio',
      source: 'Manuale_LGV_Serie_E.pdf · p. 118',
    },
    {
      id: 'team-sw',
      type: 'team',
      label: 'Team Software WMS',
      detail: 'Owner modulo allocazione',
      source: 'Matrice RACI progetto',
    },
    {
      id: 'team-mecc',
      type: 'team',
      label: 'Ufficio Tecnico Meccanico',
      detail: 'Owner forche e stazioni di carico',
      source: 'Matrice RACI progetto',
    },
  ],
  // Graph layout lives in a 640×420 viewBox. "answer" is the overview node.
  graph: {
    nodes: [
      { id: 'answer', label: 'Overview', x: 320, y: 210, kind: 'answer' },
      { id: 'req-pal-012', label: 'REQ-PAL-012', x: 320, y: 90 },
      { id: 'doc-spec', label: 'Spec. WMS v3.2', x: 120, y: 60 },
      { id: 'doc-lgv', label: 'Manuale LGV', x: 530, y: 60 },
      { id: 'proc-pallet', label: 'Palletizzazione', x: 110, y: 200 },
      { id: 'proc-picking', label: 'Picking', x: 150, y: 340 },
      { id: 'comp-wms', label: 'WMS Allocazione', x: 330, y: 360 },
      { id: 'comp-lgv', label: 'LGV Missione', x: 530, y: 200 },
      { id: 'team-sw', label: 'Team SW WMS', x: 510, y: 350 },
      { id: 'team-mecc', label: 'Uff. Tecnico Mecc.', x: 590, y: 280 },
    ],
    // kind: "impact" = propagation of the change, "source" = provenance
    edges: [
      { from: 'answer', to: 'req-pal-012', kind: 'source' },
      { from: 'doc-spec', to: 'req-pal-012', kind: 'source' },
      { from: 'doc-lgv', to: 'comp-lgv', kind: 'source' },
      { from: 'req-pal-012', to: 'proc-pallet', kind: 'impact' },
      { from: 'req-pal-012', to: 'proc-picking', kind: 'impact' },
      { from: 'req-pal-012', to: 'comp-wms', kind: 'impact' },
      { from: 'req-pal-012', to: 'comp-lgv', kind: 'impact' },
      { from: 'comp-wms', to: 'team-sw', kind: 'impact' },
      { from: 'comp-lgv', to: 'team-mecc', kind: 'impact' },
      { from: 'proc-pallet', to: 'team-mecc', kind: 'impact' },
    ],
  },
}

export function fetchRagAnswer(query) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ ...mockResponse, query }), 700),
  )
}
