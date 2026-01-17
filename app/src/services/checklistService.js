/**
 * Checklist Service
 * Gestisce il caricamento dinamico delle checklist da backend
 */

import apiService from './apiService';

/**
 * Carica le domande della checklist per uno standard specifico
 * 
 * @param {number} standardId - ID standard (1 = ISO 9001, 2 = ISO 14001, etc.)
 * @returns {Promise<Array>} Array di domande con section_code, question_text, etc.
 */
export async function fetchChecklistQuestions(standardId) {
    try {
        console.log(`[ChecklistService] Caricamento domande per standard ${standardId}...`);

        const response = await apiService.get(`/standards/${standardId}/questions`);

        if (response.success && response.data && response.data.questions) {
            const questions = response.data.questions;
            console.log(`✅ [ChecklistService] ${questions.length} domande caricate per ${response.data.standard.name}`);
            return questions;
        }

        console.warn('⚠️ [ChecklistService] Risposta API non valida:', response);
        return [];

    } catch (error) {
        console.error('❌ [ChecklistService] Errore caricamento domande:', error);

        // Fallback: ritorna array vuoto invece di crashare
        return [];
    }
}

/**
 * Trasforma le domande API in struttura checklist frontend
 * Raggruppa domande per clausola (section_code principale)
 * 
 * @param {Array} questions - Domande da API
 * @returns {Array} Checklist strutturata per clausole
 */
export function buildChecklistStructure(questions) {
    if (!questions || questions.length === 0) {
        console.warn('⚠️ [ChecklistService] Nessuna domanda da strutturare');
        return [];
    }

    // Raggruppa per clausola principale (es: 4.1, 4.2, 5.1, etc.)
    const grouped = {};

    questions.forEach(q => {
        const mainClause = q.section_code.split('.')[0]; // '4.1.2' -> '4'

        if (!grouped[mainClause]) {
            grouped[mainClause] = {
                clauseId: `clause${mainClause}`,
                clauseTitle: `${mainClause}. ${getClauseTitle(mainClause)}`,
                questions: []
            };
        }

        grouped[mainClause].questions.push({
            id: `q${q.question_id}`,
            questionId: q.question_id,
            clauseRef: q.section_code,
            title: `${q.section_code} - ${q.section_title || ''}`,
            text: q.question_text,
            type: q.question_type || 'conformity',
            isMandatory: q.is_mandatory !== 0,
            displayOrder: q.display_order
        });
    });

    // Converti oggetto in array e ordina per clausola
    const structured = Object.values(grouped).sort((a, b) => {
        const numA = parseInt(a.clauseId.replace('clause', ''));
        const numB = parseInt(b.clauseId.replace('clause', ''));
        return numA - numB;
    });

    console.log(`✅ [ChecklistService] Checklist strutturata: ${structured.length} clausole, ${questions.length} domande totali`);

    return structured;
}

/**
 * Ottiene il titolo della clausola principale ISO 9001
 * (mapping hardcoded per titoli standard)
 */
function getClauseTitle(clauseNumber) {
    const titles = {
        '4': 'Contesto dell\'organizzazione',
        '5': 'Leadership',
        '6': 'Pianificazione',
        '7': 'Supporto',
        '8': 'Attività operative',
        '9': 'Valutazione delle prestazioni',
        '10': 'Miglioramento'
    };

    return titles[clauseNumber] || 'Requisiti';
}

/**
 * Verifica disponibilità checklist per standard
 * 
 * @param {number} standardId - ID standard
 * @returns {Promise<boolean>} True se checklist disponibile
 */
export async function checkChecklistAvailability(standardId) {
    try {
        const questions = await fetchChecklistQuestions(standardId);
        return questions.length > 0;
    } catch (error) {
        console.error('❌ [ChecklistService] Errore verifica disponibilità:', error);
        return false;
    }
}

export default {
    fetchChecklistQuestions,
    buildChecklistStructure,
    checkChecklistAvailability
};
