/**
 * Standards Service - Gestione API per ISO Standards
 * 
 * Fornisce accesso agli standard ISO disponibili nel sistema
 * per selezione multi-standard negli audit.
 * 
 * Usa apiService (URL assoluto configurato) per evitare errori
 * su Netlify con path relativi.
 */

import apiService from './apiService';

/**
 * Recupera tutti gli standard ISO disponibili
 * @returns {Promise<Array>} Lista standard con id, code, name, category
 */
export async function fetchStandards() {
    const response = await apiService.get('/standards');

    if (!response.success) {
        throw new Error(response.error || 'Errore nel recupero standard');
    }

    return response.data || [];
}

/**
 * Recupera dettagli di un singolo standard
 * @param {number} standardId - ID dello standard
 * @returns {Promise<Object>} Dettagli standard con statistiche utilizzo
 */
export async function fetchStandardById(standardId) {
    const response = await apiService.get(`/standards/${standardId}`);

    if (!response.success) {
        throw new Error(response.error || 'Standard non trovato');
    }

    return response.data;
}

/**
 * Recupera statistiche utilizzo standard
 * @returns {Promise<Object>} Statistiche aggregate per tutti gli standard
 */
export async function fetchStandardsStatistics() {
    const response = await apiService.get('/standards/statistics/overview');

    if (!response.success) {
        throw new Error(response.error || 'Errore statistiche standard');
    }

    return response.data;
}

export default {
    fetchStandards,
    fetchStandardById,
    fetchStandardsStatistics
};
