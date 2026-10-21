import type { Scenario } from '../../types'

const SPEC = 'Specifica_Funzionale_WMS_v3.2.pdf'
const LGV = 'Manuale_LGV_Serie_E.pdf'

// Requirement-centred query: no project entity, so the root is a synthetic "Overview".
export const pallet: Scenario = {
  id: 'pallet',
  label: 'Impatti di requisito · Gestione pallet',
  query: 'Se modifico il requisito della gestione pallet, chi è impattato?',
  keywords: ['pallet', 'req', 'requisito', 'lgv'],
  rootId: 'overview',
  overview: [
    {
      text: 'La modifica del requisito REQ-PAL-012 incide direttamente sulla palletizzazione di fine linea e sul picking automatico.',
      cites: ['req-pal-012', 'proc-pallet', 'proc-picking'],
    },
    {
      text: 'Lato sistema sono coinvolti l’allocazione ubicazioni del WMS e il controllo missione LGV, che leggono le dimensioni pallet come parametro.',
      cites: ['comp-wms', 'comp-lgv', 'doc-lgv'],
    },
  ],
  entities: [
    { id: 'req-pal-012', type: 'requisito', code: 'REQ-PAL-012', label: 'Gestione pallet', subtitle: 'Formati EUR / ISO, tolleranze di ingombro', sources: [{ doc: SPEC, page: 14 }] },
    { id: 'doc-spec', type: 'documento', label: SPEC, subtitle: 'Cap. 4 · Unità di carico', sources: [{ doc: SPEC, page: 1 }] },
    { id: 'doc-lgv', type: 'documento', label: LGV, subtitle: 'Sez. 7.3 · Parametri di presa', sources: [{ doc: LGV, page: 1 }] },
    { id: 'proc-pallet', type: 'processo', label: 'Palletizzazione fine linea', subtitle: 'Robot di palletizzazione, schema di carico', sources: [{ doc: SPEC, page: 22 }] },
    { id: 'proc-picking', type: 'processo', label: 'Picking automatico', subtitle: 'Prelievo da scaffale, verifica ingombro', sources: [{ doc: SPEC, page: 31 }] },
    { id: 'comp-wms', type: 'componente', label: 'WMS · Allocazione ubicazioni', subtitle: 'Parametro pallet_dimensions', sources: [{ doc: SPEC, page: 40 }] },
    { id: 'comp-lgv', type: 'componente', label: 'LGV · Controllo missione', subtitle: 'Profilo di presa e centraggio', sources: [{ doc: LGV, page: 118 }] },
    { id: 'team-sw', type: 'team', label: 'Team Software WMS', subtitle: 'Owner modulo allocazione', sources: [] },
    { id: 'team-mecc', type: 'team', label: 'Ufficio Tecnico Meccanico', subtitle: 'Owner forche e stazioni di carico', sources: [] },
  ],
  relations: [
    { from: 'overview', to: 'req-pal-012', kind: 'impatta', scope: 'diretto', confidence: 0.95, sources: [{ doc: SPEC, page: 14, passage: 'Il sistema gestisce i formati pallet EUR e ISO.' }] },
    { from: 'doc-spec', to: 'req-pal-012', kind: 'fonte', confidence: 1, sources: [{ doc: SPEC, page: 14 }] },
    { from: 'doc-lgv', to: 'comp-lgv', kind: 'fonte', confidence: 1, sources: [{ doc: LGV, page: 118 }] },
    { from: 'req-pal-012', to: 'proc-pallet', kind: 'impatta', scope: 'diretto', confidence: 0.88, sources: [{ doc: SPEC, page: 22 }] },
    { from: 'req-pal-012', to: 'proc-picking', kind: 'impatta', scope: 'diretto', confidence: 0.81, sources: [{ doc: SPEC, page: 31 }] },
    { from: 'req-pal-012', to: 'comp-wms', kind: 'impatta', scope: 'diretto', confidence: 0.9, sources: [{ doc: SPEC, page: 40 }] },
    { from: 'req-pal-012', to: 'comp-lgv', kind: 'impatta', scope: 'indiretto', confidence: 0.72, sources: [{ doc: LGV, page: 118, passage: 'La presa forche dipende dalle dimensioni nominali del pallet.' }] },
    { from: 'proc-pallet', to: 'team-mecc', kind: 'eseguita_da', confidence: 0.8, sources: [{ doc: 'Matrice_RACI.xlsx' }] },
    { from: 'proc-picking', to: 'team-sw', kind: 'eseguita_da', confidence: 0.78, sources: [{ doc: 'Matrice_RACI.xlsx' }] },
    { from: 'comp-wms', to: 'team-sw', kind: 'impatta', scope: 'indiretto', confidence: 0.76, sources: [{ doc: 'Matrice_RACI.xlsx' }] },
    { from: 'comp-lgv', to: 'team-mecc', kind: 'impatta', scope: 'indiretto', confidence: 0.6, sources: [] },
  ],
}
