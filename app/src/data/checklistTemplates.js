/**
 * Checklist Templates - Fallback Statico
 * Sistema Gestione ISO 9001 - QS Studio
 * 
 * Template checklist utilizzato come fallback quando backend API non disponibile.
 * Dati estratti da: database/migrations/010_update_iso9001_35questions.sql
 * 
 * TODO: Sostituire con caricamento dinamico da GET /api/v1/standards/questions
 */

/**
 * Template ISO 9001:2015 (35 domande)
 * Fonte: CheckList\ChekList9001.txt (cliente)
 */
export const ISO_9001_TEMPLATE = {
  standardId: 1,
  standardCode: "ISO_9001_2015",
  standardName: "ISO 9001:2015",
  sections: [
    {
      sectionCode: "clause4",
      sectionTitle: "Contesto dell'Organizzazione",
      displayOrder: 1,
      questions: [
        { questionId: 1, questionText: "Comprendere l'Organizzazione e il suo contesto", questionType: "conformity", isMandatory: true, displayOrder: 1 },
        { questionId: 2, questionText: "Esigenze e aspettative delle parti interessate", questionType: "conformity", isMandatory: true, displayOrder: 2 },
        { questionId: 3, questionText: "Campo di applicazione", questionType: "conformity", isMandatory: true, displayOrder: 3 },
        { questionId: 4, questionText: "Informazioni necessarie per supportare l'attuazione dei processi", questionType: "conformity", isMandatory: true, displayOrder: 4 }
      ]
    },
    {
      sectionCode: "clause5",
      sectionTitle: "Leadership",
      displayOrder: 2,
      questions: [
        { questionId: 5, questionText: "Leadership E Impegno", questionType: "conformity", isMandatory: true, displayOrder: 5 },
        { questionId: 6, questionText: "Politica per la Qualità", questionType: "conformity", isMandatory: true, displayOrder: 6 },
        { questionId: 7, questionText: "Comunicazione della Politica per la Qualità", questionType: "conformity", isMandatory: true, displayOrder: 7 },
        { questionId: 8, questionText: "Ruoli organizzativi, responsabilità e autorità", questionType: "conformity", isMandatory: true, displayOrder: 8 }
      ]
    },
    {
      sectionCode: "clause6",
      sectionTitle: "Pianificazione",
      displayOrder: 3,
      questions: [
        { questionId: 9, questionText: "Azioni per affrontare rischi e opportunita", questionType: "conformity", isMandatory: true, displayOrder: 9 },
        { questionId: 10, questionText: "Obiettivi per la Qualità", questionType: "conformity", isMandatory: true, displayOrder: 10 }
      ]
    },
    {
      sectionCode: "clause7",
      sectionTitle: "Supporto",
      displayOrder: 4,
      questions: [
        { questionId: 11, questionText: "Persone", questionType: "conformity", isMandatory: true, displayOrder: 11 },
        { questionId: 12, questionText: "Infrastruttura", questionType: "conformity", isMandatory: true, displayOrder: 12 },
        { questionId: 13, questionText: "Ambiente", questionType: "conformity", isMandatory: true, displayOrder: 13 },
        { questionId: 14, questionText: "Idoneità allo scopo delle risorse per il monitoraggio e la misurazione", questionType: "conformity", isMandatory: true, displayOrder: 14 },
        { questionId: 15, questionText: "Riferibilità metrologica per la taratura/verifica delle apparecchiature di misura", questionType: "conformity", isMandatory: true, displayOrder: 15 },
        { questionId: 16, questionText: "Evidenza delle competenze del personale", questionType: "conformity", isMandatory: true, displayOrder: 16 },
        { questionId: 17, questionText: "Consapevolezza", questionType: "conformity", isMandatory: true, displayOrder: 17 },
        { questionId: 18, questionText: "Comunicazione", questionType: "conformity", isMandatory: true, displayOrder: 18 },
        { questionId: 19, questionText: "Informazioni Documentate", questionType: "conformity", isMandatory: true, displayOrder: 19 }
      ]
    },
    {
      sectionCode: "clause8",
      sectionTitle: "Attività Operative",
      displayOrder: 5,
      questions: [
        { questionId: 20, questionText: "Requisiti per prodotti e servizi", questionType: "conformity", isMandatory: true, displayOrder: 20 },
        { questionId: 21, questionText: "Riesame dei requisiti", questionType: "conformity", isMandatory: true, displayOrder: 21 },
        { questionId: 22, questionText: "Progettazione", questionType: "conformity", isMandatory: true, displayOrder: 22 },
        { questionId: 23, questionText: "Valutazione, selezione, monitoraggio delle prestazioni e rivalutazione dei fornitori esterni", questionType: "conformity", isMandatory: true, displayOrder: 23 },
        { questionId: 24, questionText: "Rintracciabilità degli output", questionType: "conformity", isMandatory: true, displayOrder: 24 },
        { questionId: 25, questionText: "Proprietà del cliente/fornitore", questionType: "conformity", isMandatory: true, displayOrder: 25 },
        { questionId: 26, questionText: "Post vendita", questionType: "conformity", isMandatory: true, displayOrder: 26 },
        { questionId: 27, questionText: "Controllo delle modifiche", questionType: "conformity", isMandatory: true, displayOrder: 27 },
        { questionId: 28, questionText: "Rilascio dei prodotti/servizi", questionType: "conformity", isMandatory: true, displayOrder: 28 },
        { questionId: 29, questionText: "Descrizione delle Non Conformità, Azioni adottate, concessioni ottenute", questionType: "conformity", isMandatory: true, displayOrder: 29 }
      ]
    },
    {
      sectionCode: "clause9",
      sectionTitle: "Valutazione delle Prestazioni",
      displayOrder: 6,
      questions: [
        { questionId: 30, questionText: "Valutazione delle prestazioni del SGQ (KPI)", questionType: "conformity", isMandatory: true, displayOrder: 30 },
        { questionId: 31, questionText: "Customer Satisfaction", questionType: "conformity", isMandatory: true, displayOrder: 31 },
        { questionId: 32, questionText: "Attuazione del programma di audit e risultati di audit", questionType: "conformity", isMandatory: true, displayOrder: 32 },
        { questionId: 33, questionText: "Risultati dei Riesami di Direzione", questionType: "conformity", isMandatory: true, displayOrder: 33 }
      ]
    },
    {
      sectionCode: "clause10",
      sectionTitle: "Miglioramento",
      displayOrder: 7,
      questions: [
        { questionId: 34, questionText: "Non conformità e Azioni Correttive", questionType: "conformity", isMandatory: true, displayOrder: 34 },
        { questionId: 35, questionText: "Miglioramento continuo", questionType: "conformity", isMandatory: true, displayOrder: 35 }
      ]
    }
  ]
};

/**
 * Template ISO 14001:2015 (Placeholder)
 * TODO: Popolare quando cliente fornisce checklist
 */
export const ISO_14001_TEMPLATE = {
  standardId: 2,
  standardCode: "ISO_14001_2015",
  standardName: "ISO 14001:2015",
  sections: []
};

/**
 * Template ISO 45001:2018 (Placeholder)
 * TODO: Popolare quando cliente fornisce checklist
 */
export const ISO_45001_TEMPLATE = {
  standardId: 3,
  standardCode: "ISO_45001_2018",
  standardName: "ISO 45001:2018",
  sections: []
};

/**
 * Registry di tutti i templates disponibili
 */
export const CHECKLIST_TEMPLATES = {
  1: ISO_9001_TEMPLATE,
  2: ISO_14001_TEMPLATE,
  3: ISO_45001_TEMPLATE
};

/**
 * Ottiene template checklist per standard_id
 * @param {number} standardId 
 * @returns {Object|null} Template oppure null
 */
export function getChecklistTemplate(standardId) {
  return CHECKLIST_TEMPLATES[standardId] || null;
}

/**
 * Verifica se template è disponibile
 * @param {number} standardId 
 * @returns {boolean}
 */
export function hasChecklistTemplate(standardId) {
  const template = CHECKLIST_TEMPLATES[standardId];
  return template && template.sections && template.sections.length > 0;
}
