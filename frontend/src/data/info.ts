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
    label: 'Perimetro tecnico · Document Automation',
    query: 'Quali sistemi rientrano nel perimetro di Document Automation?',
    keywords: ['sistem', 'perimetro', 'document', 'erp', 'sap'],
    confidence: 0.88,
    sentences: [
      { text: 'Il gestionale di riferimento è l’ERP aziendale, con cui la soluzione deve integrarsi senza duplicare le anagrafiche.', cites: [1] },
      { text: 'Per l’acquisizione dei documenti si valutano riconoscimento ottico e una piattaforma di document intelligence; l’uso di automazioni RPA è previsto solo come supporto.', cites: [1, 2] },
      { text: 'Il canale di ricezione delle fatture elettroniche non è ancora definito.', cites: [3] },
    ],
    citations: [
      { doc: 'Charter_DocAutomation.docx', page: 2, passage: 'La soluzione si integra con l’ERP esistente.', path: 'SharePoint › Progetti › Document Automation' },
      { doc: 'Charter_DocAutomation.docx', page: 3, passage: 'Tecnologie in valutazione: OCR, document intelligence, RPA di supporto.', path: 'SharePoint › Progetti › Document Automation' },
      { doc: 'Verbale_Kickoff_DA.pdf', page: 3, passage: 'Il canale SDI resta da approfondire con IT.', path: 'SharePoint › Progetti › Document Automation › Verbali' },
    ],
  },
  {
    id: 'info-pallet',
    label: 'Specifica · Formati pallet',
    query: 'Quali formati pallet gestisce il WMS?',
    keywords: ['pallet', 'formati', 'wms', 'eur', 'iso'],
    confidence: 0.93,
    sentences: [
      { text: 'Il WMS gestisce i formati EUR e ISO, con tolleranze di ingombro definite per ciascun formato.', cites: [1] },
      { text: 'Le dimensioni nominali del pallet sono un parametro di configurazione letto anche dal controllo missione LGV.', cites: [1, 2] },
    ],
    citations: [
      { doc: 'Specifica_Funzionale_WMS_v3.2.pdf', page: 14, passage: 'Il sistema gestisce i formati pallet EUR e ISO.', path: 'Documentazione tecnica › WMS' },
      { doc: 'Manuale_LGV_Serie_E.pdf', page: 118, passage: 'La presa forche dipende dalle dimensioni nominali del pallet.', path: 'Documentazione tecnica › LGV' },
    ],
  },
  {
    id: 'info-da-exclusions',
    label: 'Esclusioni · Document Automation',
    query: 'Cosa è escluso dal design sprint di Document Automation?',
    keywords: ['escluso', 'esclusion', 'fuori', 'sprint'],
    confidence: 0.9,
    sentences: [
      { text: 'Lo sprint si ferma al prototipo: sviluppo, messa in produzione e automazioni su ambienti reali sono fuori perimetro.', cites: [1] },
      { text: 'Non è prevista consulenza legale o fiscale.', cites: [1] },
    ],
    citations: [
      { doc: 'Charter_DocAutomation.docx', page: 3, passage: 'Esclusi: sviluppo, go-live, automazioni in produzione, consulenza legale e fiscale.', path: 'SharePoint › Progetti › Document Automation' },
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
