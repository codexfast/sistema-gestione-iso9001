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
        { questionId: 87,  clauseRef: "4.1", questionText: "Comprendere l'Organizzazione e il suo contesto", questionType: "conformity", isMandatory: true, displayOrder: 1 },
        { questionId: 88,  clauseRef: "4.2", questionText: "Esigenze e aspettative delle parti interessate", questionType: "conformity", isMandatory: true, displayOrder: 2 },
        { questionId: 89,  clauseRef: "4.3", questionText: "Campo di applicazione", questionType: "conformity", isMandatory: true, displayOrder: 3 },
        { questionId: 90,  clauseRef: "4.4", questionText: "Informazioni necessarie per supportare l'attuazione dei processi", questionType: "conformity", isMandatory: true, displayOrder: 4 }
      ]
    },
    {
      sectionCode: "clause5",
      sectionTitle: "Leadership",
      displayOrder: 2,
      questions: [
        { questionId: 91,  clauseRef: "5.1",   questionText: "Leadership e Impegno", questionType: "conformity", isMandatory: true, displayOrder: 5 },
        { questionId: 92,  clauseRef: "5.2.1", questionText: "Politica per la Qualità", questionType: "conformity", isMandatory: true, displayOrder: 6 },
        { questionId: 93,  clauseRef: "5.2.2", questionText: "Comunicazione della Politica per la Qualità", questionType: "conformity", isMandatory: true, displayOrder: 7 },
        { questionId: 94,  clauseRef: "5.3",   questionText: "Ruoli organizzativi, responsabilità e autorità", questionType: "conformity", isMandatory: true, displayOrder: 8 }
      ]
    },
    {
      sectionCode: "clause6",
      sectionTitle: "Pianificazione",
      displayOrder: 3,
      questions: [
        { questionId: 95, clauseRef: "6.1", questionText: "Azioni per affrontare rischi e opportunità", questionType: "conformity", isMandatory: true, displayOrder: 9 },
        { questionId: 96, clauseRef: "6.2", questionText: "Obiettivi per la Qualità", questionType: "conformity", isMandatory: true, displayOrder: 10 }
      ]
    },
    {
      sectionCode: "clause7",
      sectionTitle: "Supporto",
      displayOrder: 4,
      questions: [
        { questionId: 97,  clauseRef: "7.1.2",   questionText: "Persone", questionType: "conformity", isMandatory: true, displayOrder: 13 },
        { questionId: 98,  clauseRef: "7.1.3",   questionText: "Infrastruttura", questionType: "conformity", isMandatory: true, displayOrder: 14 },
        { questionId: 99,  clauseRef: "7.1.4",   questionText: "Ambiente", questionType: "conformity", isMandatory: true, displayOrder: 15 },
        { questionId: 100, clauseRef: "7.1.5.1", questionText: "Idoneità allo scopo delle risorse per il monitoraggio e la misurazione", questionType: "conformity", isMandatory: true, displayOrder: 16 },
        { questionId: 101, clauseRef: "7.1.5.2", questionText: "Riferibilità metrologica per la taratura/verifica delle apparecchiature di misura", questionType: "conformity", isMandatory: true, displayOrder: 17 },
        { questionId: 102, clauseRef: "7.2",     questionText: "Evidenza delle competenze del personale", questionType: "conformity", isMandatory: true, displayOrder: 19 },
        { questionId: 103, clauseRef: "7.3",     questionText: "Consapevolezza", questionType: "conformity", isMandatory: true, displayOrder: 20 },
        { questionId: 104, clauseRef: "7.4",     questionText: "Comunicazione", questionType: "conformity", isMandatory: true, displayOrder: 21 },
        { questionId: 105, clauseRef: "7.5",     questionText: "Informazioni Documentate", questionType: "conformity", isMandatory: true, displayOrder: 22 }
      ]
    },
    {
      sectionCode: "clause8",
      sectionTitle: "Attività Operative",
      displayOrder: 5,
      questions: [
        { questionId: 106, clauseRef: "8.2",   questionText: "Requisiti per prodotti e servizi", questionType: "conformity", isMandatory: true, displayOrder: 23 },
        { questionId: 107, clauseRef: "8.2.3", questionText: "Riesame dei requisiti", questionType: "conformity", isMandatory: true, displayOrder: 24 },
        { questionId: 108, clauseRef: "8.3",   questionText: "Progettazione", questionType: "conformity", isMandatory: true, displayOrder: 25 },
        { questionId: 109, clauseRef: "8.4.1", questionText: "Valutazione, selezione, monitoraggio delle prestazioni e rivalutazione dei fornitori esterni", questionType: "conformity", isMandatory: true, displayOrder: 26 },
        { questionId: 110, clauseRef: "8.5.2", questionText: "Rintracciabilità degli output", questionType: "conformity", isMandatory: true, displayOrder: 27 },
        { questionId: 111, clauseRef: "8.5.3", questionText: "Proprietà del cliente/fornitore", questionType: "conformity", isMandatory: true, displayOrder: 28 },
        { questionId: 112, clauseRef: "8.5.5", questionText: "Post vendita", questionType: "conformity", isMandatory: true, displayOrder: 29 },
        { questionId: 113, clauseRef: "8.5.6", questionText: "Controllo delle modifiche", questionType: "conformity", isMandatory: true, displayOrder: 30 },
        { questionId: 114, clauseRef: "8.6",   questionText: "Rilascio dei prodotti/servizi", questionType: "conformity", isMandatory: true, displayOrder: 31 },
        { questionId: 115, clauseRef: "8.7.2", questionText: "Descrizione delle Non Conformità, Azioni adottate, concessioni ottenute", questionType: "conformity", isMandatory: true, displayOrder: 32 }
      ]
    },
    {
      sectionCode: "clause9",
      sectionTitle: "Valutazione delle Prestazioni",
      displayOrder: 6,
      questions: [
        { questionId: 116, clauseRef: "9.1.1", questionText: "Valutazione delle prestazioni del SGQ (KPI)", questionType: "conformity", isMandatory: true, displayOrder: 33 },
        { questionId: 117, clauseRef: "9.1.2", questionText: "Customer Satisfaction", questionType: "conformity", isMandatory: true, displayOrder: 34 },
        { questionId: 118, clauseRef: "9.2.2", questionText: "Attuazione del programma di audit e risultati di audit", questionType: "conformity", isMandatory: true, displayOrder: 35 },
        { questionId: 119, clauseRef: "9.3.3", questionText: "Risultati dei Riesami di Direzione", questionType: "conformity", isMandatory: true, displayOrder: 36 }
      ]
    },
    {
      sectionCode: "clause10",
      sectionTitle: "Miglioramento",
      displayOrder: 7,
      questions: [
        { questionId: 120, clauseRef: "10.2", questionText: "Non conformità e Azioni Correttive", questionType: "conformity", isMandatory: true, displayOrder: 37 },
        { questionId: 121, clauseRef: "10.3", questionText: "Miglioramento continuo", questionType: "conformity", isMandatory: true, displayOrder: 38 }
      ]
    }
  ]
};

/**
 * Template ISO 14001:2015 – Checklist Legislativa Ambiente & Sicurezza
 * 2 sezioni normative — 46 domande
 * Fonte: CheckList\ChekList14001.txt (cliente)
 * questionId: null = domande non ancora nel DB (sync silenzioso; vedere migration 012)
 */
export const ISO_14001_TEMPLATE = {
  standardId: 2,
  standardCode: "ISO_14001_2015",
  standardName: "ISO 14001:2015",
  sections: [
    {
      sectionCode: "14001_s4",
      sectionTitle: "4 – AMBIENTE E SICUREZZA",
      displayOrder: 1,
      questions: [
        { questionId: 122, questionText: "EDILIZIA/AGIBILITA'", questionType: "conformity", isMandatory: true, displayOrder: 2 },
        { questionId: 123, questionText: "INDUSTRIE INSALUBRI", questionType: "conformity", isMandatory: true, displayOrder: 3 },
        { questionId: 124, questionText: "IMPIANTI TERMICI", questionType: "conformity", isMandatory: true, displayOrder: 4 },
        { questionId: 125, questionText: "INCIDENTI RILEVANTI", questionType: "conformity", isMandatory: true, displayOrder: 5 },
        { questionId: 126, questionText: "PREVENZIONE INCENDI / RISCHIO INCENDI", questionType: "conformity", isMandatory: true, displayOrder: 6 },
        { questionId: 127, questionText: "PIANO DI EMERGENZA", questionType: "conformity", isMandatory: true, displayOrder: 7 },
        { questionId: 128, questionText: "ADDETTI ALLE EMERGENZE", questionType: "conformity", isMandatory: true, displayOrder: 8 },
        { questionId: 129, questionText: "GAS TOSSICI", questionType: "conformity", isMandatory: true, displayOrder: 9 },
        { questionId: 130, questionText: "AMIANTO E RELATIVI RISCHI", questionType: "conformity", isMandatory: true, displayOrder: 10 },
        { questionId: 131, questionText: "TRASPORTO MATERIALI PERICOLOSI (ADR / RID)", questionType: "conformity", isMandatory: true, displayOrder: 11 },
        { questionId: 132, questionText: "SOSTANZE E PREPARATI PERICOLOSI / RISCHIO CHIMICO PER LA SALUTE E LA SICUREZZA", questionType: "conformity", isMandatory: true, displayOrder: 12 },
        { questionId: 133, questionText: "PCB / PCT", questionType: "conformity", isMandatory: true, displayOrder: 13 },
        { questionId: 134, questionText: "RADIAZIONI IONIZZANTI E RELATIVI RISCHI", questionType: "conformity", isMandatory: true, displayOrder: 14 }
      ]
    },
    {
      sectionCode: "14001_s5",
      sectionTitle: "5. AMBIENTE",
      displayOrder: 2,
      questions: [
        { questionId: 135, questionText: "VALUTAZIONE IMPATTO AMBIENTALE (VIA) e VALUTAZIONE AMBIENTALE STRATEGICA (VAS)", questionType: "conformity", isMandatory: true, displayOrder: 15 },
        { questionId: 136, questionText: "AUTORIZZAZIONE INTEGRATA AMBIENTALE (AIA) e IPPC", questionType: "conformity", isMandatory: true, displayOrder: 16 },
        { questionId: 137, questionText: "AUTORIZZAZIONE UNICA AMBIENTALE (AUA)", questionType: "conformity", isMandatory: true, displayOrder: 17 },
        { questionId: 138, questionText: "APPROVVIGIONAMENTO IDRICO", questionType: "conformity", isMandatory: true, displayOrder: 18 },
        { questionId: 139, questionText: "SCARICHI IDRICI", questionType: "conformity", isMandatory: true, displayOrder: 19 },
        { questionId: 140, questionText: "QUALITA' DELL'ARIA", questionType: "conformity", isMandatory: true, displayOrder: 20 },
        { questionId: 141, questionText: "EMISSIONI IN ATMOSFERA", questionType: "conformity", isMandatory: true, displayOrder: 21 },
        { questionId: 142, questionText: "EMISSIONI ODORIGENE", questionType: "conformity", isMandatory: true, displayOrder: 22 },
        { questionId: 143, questionText: "RIFIUTI", questionType: "conformity", isMandatory: true, displayOrder: 23 },
        { questionId: 144, questionText: "GESTIONE IMBALLAGGI (CONAI E CONSORZI DI FILIERA)", questionType: "conformity", isMandatory: true, displayOrder: 24 },
        { questionId: 145, questionText: "DISCARICHE E IMPIANTI DI INCENERIMENTO", questionType: "conformity", isMandatory: true, displayOrder: 25 },
        { questionId: 146, questionText: "TERRE E ROCCE DA SCAVO", questionType: "conformity", isMandatory: true, displayOrder: 26 },
        { questionId: 147, questionText: "BONIFICA SITI CONTAMINATI", questionType: "conformity", isMandatory: true, displayOrder: 27 },
        { questionId: 148, questionText: "CONTAMINAZIONE SUOLO E SOTTOSUOLO (Serbatoi Interrati)", questionType: "conformity", isMandatory: true, displayOrder: 28 },
        { questionId: 149, questionText: "GAS AD EFFETTO SERRA E LESIVI DELL'OZONO", questionType: "conformity", isMandatory: true, displayOrder: 29 },
        { questionId: 150, questionText: "INQUINAMENTO ACUSTICO", questionType: "conformity", isMandatory: true, displayOrder: 30 },
        { questionId: 151, questionText: "GESTIONE ENERGETICA ED ENERGY MANAGER", questionType: "conformity", isMandatory: true, displayOrder: 31 },
        { questionId: 152, questionText: "MOBILITY MANAGER", questionType: "conformity", isMandatory: true, displayOrder: 32 },
        { questionId: 153, questionText: "INQUINAMENTO ELETTROMAGNETICO", questionType: "conformity", isMandatory: true, displayOrder: 33 },
        { questionId: 154, questionText: "INQUINAMENTO LUMINOSO", questionType: "conformity", isMandatory: true, displayOrder: 34 },
        { questionId: 155, questionText: "SOSTENIBILITA' / CORPORATE SUSTAINABILITY REPORTING DIRECTIVE (CSRD)", questionType: "conformity", isMandatory: true, displayOrder: 35 },
        { questionId: 156, questionText: "MEDI IMPIANTI DI COMBUSTIONE", questionType: "conformity", isMandatory: true, displayOrder: 36 },
        { questionId: 157, questionText: "GRANDI IMPIANTI DI COMBUSTIONE", questionType: "conformity", isMandatory: true, displayOrder: 37 },
        { questionId: 158, questionText: "ATTIVITA' DI GESTIONE DEI RIFIUTI ED IMPIANTI DI RECUPERO (art. 208 e segg. D.Lgs. 152/06)", questionType: "conformity", isMandatory: true, displayOrder: 38 },
        { questionId: 159, questionText: "OLI USATI", questionType: "conformity", isMandatory: true, displayOrder: 39 },
        { questionId: 160, questionText: "RIFIUTI SANITARI/ORIGINE ANIMALE, SOTTOPRODOTTI DI ORIGINE ANIMALE", questionType: "conformity", isMandatory: true, displayOrder: 40 },
        { questionId: 161, questionText: "UTILIZZO FANGHI IN AGRICOLTURA", questionType: "conformity", isMandatory: true, displayOrder: 41 },
        { questionId: 162, questionText: "SOTTOPRODOTTI", questionType: "conformity", isMandatory: true, displayOrder: 42 },
        { questionId: 163, questionText: "ATTIVITA' DI AUTOSMALTIMENTO DI RIFIUTI PERICOLOSI", questionType: "conformity", isMandatory: true, displayOrder: 43 },
        { questionId: 164, questionText: "RISPARMIO ED EFFICIENZA ENERGETICA", questionType: "conformity", isMandatory: true, displayOrder: 44 },
        { questionId: 165, questionText: "EUDR, European Union Deforestation Regulation", questionType: "conformity", isMandatory: true, displayOrder: 45 },
        { questionId: 166, questionText: "PPWR (Packaging and Packaging Waste Regulation)", questionType: "conformity", isMandatory: true, displayOrder: 46 },
        { questionId: 167, questionText: "Prescrizioni AIA, AUA", questionType: "conformity", isMandatory: true, displayOrder: 47 }
      ]
    }
  ]
};

/**
 * Template ISO 45001:2018 (Sistema di Gestione per la Salute e Sicurezza sul Lavoro)
 * Clausole 4-10 — 35 domande di audit
 * questionId: null = domande non ancora nel DB (sync silenzioso)
 */
export const ISO_45001_TEMPLATE = {
  standardId: 3,
  standardCode: "ISO_45001_2018",
  standardName: "ISO 45001:2018",
  sections: [
    {
      sectionCode: "clause4",
      sectionTitle: "Contesto dell'Organizzazione",
      displayOrder: 1,
      questions: [
        { questionId: null, questionText: "Comprensione del contesto dell'organizzazione e fattori che influenzano la SSL (4.1)", questionType: "conformity", isMandatory: true, displayOrder: 1 },
        { questionId: null, questionText: "Identificazione delle parti interessate rilevanti e dei loro requisiti SSL (4.2)", questionType: "conformity", isMandatory: true, displayOrder: 2 },
        { questionId: null, questionText: "Campo di applicazione del SGSSL definito, confini e applicabilità documentati (4.3)", questionType: "conformity", isMandatory: true, displayOrder: 3 },
        { questionId: null, questionText: "Il SGSSL e le sue interazioni con i processi aziendali sono definiti (4.4)", questionType: "conformity", isMandatory: true, displayOrder: 4 }
      ]
    },
    {
      sectionCode: "clause5",
      sectionTitle: "Leadership e Partecipazione dei Lavoratori",
      displayOrder: 2,
      questions: [
        { questionId: null, questionText: "L'alta direzione dimostra leadership e impegno verso il SGSSL (5.1)", questionType: "conformity", isMandatory: true, displayOrder: 5 },
        { questionId: null, questionText: "Politica per la SSL stabilita, comunicata e accessibile (5.2)", questionType: "conformity", isMandatory: true, displayOrder: 6 },
        { questionId: null, questionText: "Ruoli, responsabilità e autorità per il SGSSL assegnati e comunicati (5.3)", questionType: "conformity", isMandatory: true, displayOrder: 7 },
        { questionId: null, questionText: "Consultazione e partecipazione dei lavoratori nei processi del SGSSL (5.4)", questionType: "conformity", isMandatory: true, displayOrder: 8 }
      ]
    },
    {
      sectionCode: "clause6",
      sectionTitle: "Pianificazione",
      displayOrder: 3,
      questions: [
        { questionId: null, questionText: "Identificazione dei pericoli e valutazione dei rischi per la SSL (6.1.2)", questionType: "conformity", isMandatory: true, displayOrder: 9 },
        { questionId: null, questionText: "Identificazione delle opportunità per il miglioramento della SSL (6.1.2.3)", questionType: "conformity", isMandatory: true, displayOrder: 10 },
        { questionId: null, questionText: "Determinazione e accesso ai requisiti legali e altri applicabili alla SSL (6.1.3)", questionType: "conformity", isMandatory: true, displayOrder: 11 },
        { questionId: null, questionText: "Pianificazione delle azioni per affrontare rischi e opportunità SSL (6.1.4)", questionType: "conformity", isMandatory: true, displayOrder: 12 },
        { questionId: null, questionText: "Obiettivi SSL stabiliti, misurabili, monitorati con piani d'azione (6.2)", questionType: "conformity", isMandatory: true, displayOrder: 13 }
      ]
    },
    {
      sectionCode: "clause7",
      sectionTitle: "Supporto",
      displayOrder: 4,
      questions: [
        { questionId: null, questionText: "Risorse necessarie per il SGSSL disponibili (7.1)", questionType: "conformity", isMandatory: true, displayOrder: 14 },
        { questionId: null, questionText: "Competenze del personale per le attività con impatto sulla SSL (7.2)", questionType: "conformity", isMandatory: true, displayOrder: 15 },
        { questionId: null, questionText: "Consapevolezza del personale su politica, pericoli, rischi e gestione emergenze (7.3)", questionType: "conformity", isMandatory: true, displayOrder: 16 },
        { questionId: null, questionText: "Comunicazione interna ed esterna sulle tematiche SSL (7.4)", questionType: "conformity", isMandatory: true, displayOrder: 17 },
        { questionId: null, questionText: "Informazioni documentate richieste dalla norma controllate e disponibili (7.5)", questionType: "conformity", isMandatory: true, displayOrder: 18 }
      ]
    },
    {
      sectionCode: "clause8",
      sectionTitle: "Attività Operative",
      displayOrder: 5,
      questions: [
        { questionId: null, questionText: "Pianificazione e controllo operativo dei rischi SSL (gerarchia dei controlli) (8.1.2)", questionType: "conformity", isMandatory: true, displayOrder: 19 },
        { questionId: null, questionText: "Gestione del cambiamento (modifiche temporanee e permanenti) (8.1.3)", questionType: "conformity", isMandatory: true, displayOrder: 20 },
        { questionId: null, questionText: "Controllo dei fornitori, appaltatori e lavoratori autonomi in area aziendale (8.1.4)", questionType: "conformity", isMandatory: true, displayOrder: 21 },
        { questionId: null, questionText: "Preparazione e risposta alle emergenze SSL (procedure, esercitazioni) (8.2)", questionType: "conformity", isMandatory: true, displayOrder: 22 }
      ]
    },
    {
      sectionCode: "clause9",
      sectionTitle: "Valutazione delle Prestazioni",
      displayOrder: 6,
      questions: [
        { questionId: null, questionText: "Monitoraggio, misurazione e analisi delle prestazioni del SGSSL (9.1.1)", questionType: "conformity", isMandatory: true, displayOrder: 23 },
        { questionId: null, questionText: "Valutazione della conformità ai requisiti legali SSL (9.1.2)", questionType: "conformity", isMandatory: true, displayOrder: 24 },
        { questionId: null, questionText: "Programma di audit interno SSL attuato con obiettività (9.2)", questionType: "conformity", isMandatory: true, displayOrder: 25 },
        { questionId: null, questionText: "Riesame della direzione SSL con input/output documentati e azioni definite (9.3)", questionType: "conformity", isMandatory: true, displayOrder: 26 }
      ]
    },
    {
      sectionCode: "clause10",
      sectionTitle: "Miglioramento",
      displayOrder: 7,
      questions: [
        { questionId: null, questionText: "Gestione di incidenti, non conformità e azioni correttive SSL (10.2)", questionType: "conformity", isMandatory: true, displayOrder: 27 },
        { questionId: null, questionText: "Miglioramento continuo del SGSSL con evidenze di progressi (10.3)", questionType: "conformity", isMandatory: true, displayOrder: 28 }
      ]
    }
  ]
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
