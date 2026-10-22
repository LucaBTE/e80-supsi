import type { Citation } from '../types'

/** Mock factual answers (no impact analysis): text + numbered citations. */
export type InfoAnswer = {
  id: string
  label: string
  query: string
  keywords: string[]
  confidence: number
  sentences: { text: string; cites: number[] }[]
  citations: (Citation & { path?: string })[]
}

export const INFO_ANSWERS: InfoAnswer[] = [
  {
    id: 'info-da-systems',
    label: 'Technical scope · Document Automation',
    query: 'Which systems are within the scope of Document Automation?',
    keywords: ['system', 'scope', 'document', 'erp', 'sap'],
    confidence: 0.88,
    sentences: [
      { text: 'The solution must integrate with the corporate ERP without duplicating master data.', cites: [1] },
      { text: 'OCR and a document intelligence platform are being evaluated for document capture; RPA is planned only as a supporting tool.', cites: [1, 2] },
      { text: 'The channel for receiving electronic invoices has not yet been defined.', cites: [3] },
    ],
    citations: [
      { doc: 'Charter_DocAutomation.docx', page: 2, passage: 'La soluzione si integra con l’ERP esistente.', path: 'SharePoint › Projects › Document Automation' },
      { doc: 'Charter_DocAutomation.docx', page: 3, passage: 'Tecnologie in valutazione: OCR, document intelligence, RPA di supporto.', path: 'SharePoint › Projects › Document Automation' },
      { doc: 'Verbale_Kickoff_DA.pdf', page: 3, passage: 'Il canale SDI resta da approfondire con IT.', path: 'SharePoint › Projects › Document Automation › Verbali' },
    ],
  },
  {
    id: 'info-pallet',
    label: 'Specification · Pallet formats',
    query: 'Which pallet formats does the WMS support?',
    keywords: ['pallet', 'format', 'wms', 'eur', 'iso'],
    confidence: 0.93,
    sentences: [
      { text: 'The WMS supports EUR and ISO formats, with dimensional tolerances defined for each format.', cites: [1] },
      { text: 'Nominal pallet dimensions are a configuration parameter also read by LGV mission control.', cites: [1, 2] },
    ],
    citations: [
      { doc: 'Specifica_Funzionale_WMS_v3.2.pdf', page: 14, passage: 'Il sistema gestisce i formati pallet EUR e ISO.', path: 'Documentazione tecnica › WMS' },
      { doc: 'Manuale_LGV_Serie_E.pdf', page: 118, passage: 'La presa forche dipende dalle dimensioni nominali del pallet.', path: 'Documentazione tecnica › LGV' },
    ],
  },
  {
    id: 'info-da-exclusions',
    label: 'Exclusions · Document Automation',
    query: 'What is excluded from the Document Automation design sprint?',
    keywords: ['excluded', 'exclusion', 'out of scope', 'sprint'],
    confidence: 0.9,
    sentences: [
      { text: 'The sprint ends with the prototype: development, deployment and automation in live environments are out of scope.', cites: [1] },
      { text: 'Legal and tax advice is not included.', cites: [1] },
    ],
    citations: [
      { doc: 'Charter_DocAutomation.docx', page: 3, passage: 'Esclusi: sviluppo, go-live, automazioni in produzione, consulenza legale e fiscale.', path: 'SharePoint › Projects › Document Automation' },
    ],
  },
]

export function fetchInfoAnswer(query: string, id?: string): Promise<InfoAnswer | null> {
  const q = query.toLowerCase()
  const score = (a: InfoAnswer) => a.keywords.filter((k) => q.includes(k)).length
  const best = INFO_ANSWERS.find((a) => a.id === id) ?? [...INFO_ANSWERS].sort((a, b) => score(b) - score(a))[0]
  const found = id || score(best) > 0 ? { ...best, query } : null
  return new Promise((ok) => setTimeout(() => ok(found), 500))
}
