/**
 * Standards Service - Gestione API per ISO Standards
 * 
 * Fornisce accesso agli standard ISO disponibili nel sistema
 * per selezione multi-standard negli audit.
 */

const API_BASE = '/api/v1';

/**
 * Recupera tutti gli standard ISO disponibili
 * @param {string} token - JWT token per autenticazione
 * @returns {Promise<Array>} Lista standard con id, code, name, category
 */
export async function fetchStandards(token) {
    try {
        const response = await fetch(`${API_BASE}/standards`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Errore nel recupero standard');
        }

        return result.data || [];
    } catch (error) {
        console.error('Error fetching standards:', error);
        throw error;
    }
}

/**
 * Recupera dettagli di un singolo standard
 * @param {string} token - JWT token per autenticazione
 * @param {number} standardId - ID dello standard
 * @returns {Promise<Object>} Dettagli standard con statistiche utilizzo
 */
export async function fetchStandardById(token, standardId) {
    try {
        const response = await fetch(`${API_BASE}/standards/${standardId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Standard non trovato');
        }

        return result.data;
    } catch (error) {
        console.error('Error fetching standard:', error);
        throw error;
    }
}

/**
 * Recupera statistiche utilizzo standard
 * @param {string} token - JWT token per autenticazione
 * @returns {Promise<Object>} Statistiche aggregate per tutti gli standard
 */
export async function fetchStandardsStatistics(token) {
    try {
        const response = await fetch(`${API_BASE}/standards/statistics/overview`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Errore statistiche standard');
        }

        return result.data;
    } catch (error) {
        console.error('Error fetching standards statistics:', error);
        throw error;
    }
}

export default {
    fetchStandards,
    fetchStandardById,
    fetchStandardsStatistics
};
