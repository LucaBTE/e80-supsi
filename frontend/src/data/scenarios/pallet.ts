import type { Scenario } from '../../types'

const SPEC = 'Specifica_Funzionale_WMS_v3.2.pdf'
const LGV = 'Manuale_LGV_Serie_E.pdf'

// Requirement-centred query: no project entity, so the root is a synthetic "Overview".
export const pallet: Scenario = {
  id: 'pallet',
  label: 'Requirement impacts · Pallet handling',
  query: 'Who is affected if I change the pallet handling requirement?',
  keywords: ['pallet', 'req', 'requirement', 'lgv'],
  rootId: 'overview',
  overview: [
    {
      text: 'Changing requirement REQ-PAL-012 directly affects end-of-line palletizing and automated picking.',
      cites: ['req-pal-012', 'proc-pallet', 'proc-picking'],
    },
    {
      text: 'The affected systems are WMS location allocation and LGV mission control, which read pallet dimensions as a parameter.',
      cites: ['comp-wms', 'comp-lgv', 'doc-lgv'],
    },
  ],
  entities: [
    { id: 'req-pal-012', type: 'requirement', code: 'REQ-PAL-012', label: 'Pallet handling', subtitle: 'EUR / ISO formats, dimensional tolerances', sources: [{ doc: SPEC, page: 14 }] },
    { id: 'doc-spec', type: 'document', label: SPEC, subtitle: 'Ch. 4 · Load units', sources: [{ doc: SPEC, page: 1 }] },
    { id: 'doc-lgv', type: 'document', label: LGV, subtitle: 'Sec. 7.3 · Fork handling parameters', sources: [{ doc: LGV, page: 1 }] },
    { id: 'proc-pallet', type: 'process', label: 'End-of-line palletizing', subtitle: 'Palletizing robot, loading pattern', sources: [{ doc: SPEC, page: 22 }] },
    { id: 'proc-picking', type: 'process', label: 'Automated picking', subtitle: 'Shelf picking, dimensional check', sources: [{ doc: SPEC, page: 31 }] },
    { id: 'comp-wms', type: 'component', label: 'WMS · Location allocation', subtitle: 'Parameter pallet_dimensions', sources: [{ doc: SPEC, page: 40 }] },
    { id: 'comp-lgv', type: 'component', label: 'LGV · Mission control', subtitle: 'Fork handling and centering profile', sources: [{ doc: LGV, page: 118 }] },
    { id: 'team-sw', type: 'team', label: 'WMS Software Team', subtitle: 'Allocation module owner', sources: [] },
    { id: 'team-mecc', type: 'team', label: 'Mechanical Engineering Department', subtitle: 'Fork and loading station owner', sources: [] },
  ],
  relations: [
    { from: 'overview', to: 'req-pal-012', kind: 'impacts', scope: 'direct', confidence: 0.95, sources: [{ doc: SPEC, page: 14, passage: 'Il sistema gestisce i formati pallet EUR e ISO.' }] },
    { from: 'doc-spec', to: 'req-pal-012', kind: 'source', confidence: 1, sources: [{ doc: SPEC, page: 14 }] },
    { from: 'doc-lgv', to: 'comp-lgv', kind: 'source', confidence: 1, sources: [{ doc: LGV, page: 118 }] },
    { from: 'req-pal-012', to: 'proc-pallet', kind: 'impacts', scope: 'direct', confidence: 0.88, sources: [{ doc: SPEC, page: 22 }] },
    { from: 'req-pal-012', to: 'proc-picking', kind: 'impacts', scope: 'direct', confidence: 0.81, sources: [{ doc: SPEC, page: 31 }] },
    { from: 'req-pal-012', to: 'comp-wms', kind: 'impacts', scope: 'direct', confidence: 0.9, sources: [{ doc: SPEC, page: 40 }] },
    { from: 'req-pal-012', to: 'comp-lgv', kind: 'impacts', scope: 'indirect', confidence: 0.72, sources: [{ doc: LGV, page: 118, passage: 'La presa forche dipende dalle dimensioni nominali del pallet.' }] },
    { from: 'proc-pallet', to: 'team-mecc', kind: 'performed_by', confidence: 0.8, sources: [{ doc: 'Matrice_RACI.xlsx' }] },
    { from: 'proc-picking', to: 'team-sw', kind: 'performed_by', confidence: 0.78, sources: [{ doc: 'Matrice_RACI.xlsx' }] },
    { from: 'comp-wms', to: 'team-sw', kind: 'impacts', scope: 'indirect', confidence: 0.76, sources: [{ doc: 'Matrice_RACI.xlsx' }] },
    { from: 'comp-lgv', to: 'team-mecc', kind: 'impacts', scope: 'indirect', confidence: 0.6, sources: [] },
  ],
}
