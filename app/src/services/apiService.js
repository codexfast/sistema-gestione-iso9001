/**
 * API Service - Client HTTP centralizzato
 * Sistema Gestione ISO 9001 - QS Studio
 * 
 * Features:
 * - Configurazione automatica ambiente (dev/prod)
 * - Gestione token JWT con refresh automatico
 * - Interceptor per errori e retry
 * - Supporto offline con fallback
 */

// Configurazione ambiente
const API_CONFIG = {
    development: {
        baseUrl: 'http://localhost:10443/api/v1',
        timeout: 10000
    },
    production: {
        baseUrl: 'https://www.fr-busato.it:10443/api/v1',
        timeout: 15000
    }
};

// Rileva ambiente
const ENV = import.meta.env.MODE || 'development';
const config = API_CONFIG[ENV] || API_CONFIG.development;

// Storage keys
const TOKEN_KEY = 'sgq_auth_token';
const REFRESH_TOKEN_KEY = 'sgq_refresh_token';
const USER_KEY = 'sgq_user';

/**
 * Classe API Client
 */
class ApiService {
    constructor() {
        this.baseUrl = config.baseUrl;
        this.timeout = config.timeout;
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    /**
     * Ottieni token dal localStorage
     */
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Salva token
     */
    setToken(token, refreshToken = null) {
        localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
    }

    /**
     * Rimuovi token (logout)
     */
    clearToken() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    /**
     * Ottieni user salvato
     */
    getStoredUser() {
        const user = localStorage.getItem(USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    /**
     * Salva user
     */
    setStoredUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    /**
     * Headers comuni per le richieste
     */
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Esegue richiesta HTTP con gestione errori
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const { includeAuth = true, timeout = this.timeout } = options;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const fetchOptions = {
                method,
                headers: this.getHeaders(includeAuth),
                signal: controller.signal
            };

            if (data && method !== 'GET') {
                fetchOptions.body = JSON.stringify(data);
            }

            console.log(`🌐 [API] ${method} ${endpoint}`);
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // Gestione errori HTTP
            if (!response.ok) {
                // Token scaduto → tenta refresh
                if (response.status === 401 && includeAuth) {
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Riprova la richiesta originale
                        return this.request(method, endpoint, data, options);
                    } else {
                        // Refresh fallito → logout
                        this.clearToken();
                        window.dispatchEvent(new CustomEvent('auth:logout'));
                        throw new ApiError('Sessione scaduta', 401, 'SESSION_EXPIRED');
                    }
                }

                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.error || `HTTP ${response.status}`,
                    response.status,
                    errorData.code || 'API_ERROR'
                );
            }

            const result = await response.json();
            console.log(`✅ [API] ${method} ${endpoint} OK`);
            return result;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new ApiError('Richiesta timeout', 408, 'TIMEOUT');
            }

            if (error instanceof ApiError) {
                throw error;
            }

            // Errore di rete (offline)
            if (!navigator.onLine) {
                throw new ApiError('Connessione assente', 0, 'OFFLINE');
            }

            throw new ApiError(error.message, 0, 'NETWORK_ERROR');
        }
    }

    /**
     * Tenta refresh token
     */
    async refreshToken() {
        if (this.isRefreshing) {
            // Attendi refresh in corso
            return new Promise((resolve) => {
                this.refreshSubscribers.push(resolve);
            });
        }

        this.isRefreshing = true;
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
            this.isRefreshing = false;
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Refresh failed');
            }

            const data = await response.json();
            this.setToken(data.token, data.refreshToken);

            // Notifica tutti i subscribers
            this.refreshSubscribers.forEach(callback => callback(true));
            this.refreshSubscribers = [];

            console.log('🔄 [API] Token refreshed');
            return true;

        } catch (error) {
            console.error('❌ [API] Token refresh failed:', error);
            this.refreshSubscribers.forEach(callback => callback(false));
            this.refreshSubscribers = [];
            return false;

        } finally {
            this.isRefreshing = false;
        }
    }

    // ==========================================
    // METODI HTTP
    // ==========================================

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    // ==========================================
    // AUTH ENDPOINTS
    // ==========================================

    /**
     * Login con email e password
     */
    async login(email, password) {
        const response = await this.post('/auth/login', { email, password }, { includeAuth: false });

        if (response.success && response.token) {
            this.setToken(response.token, response.refreshToken);
            this.setStoredUser(response.user);
            return response;
        }

        throw new ApiError(response.error || 'Login fallito', 401, 'LOGIN_FAILED');
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await this.post('/auth/logout', {});
        } catch (error) {
            console.warn('Logout API error (ignored):', error);
        } finally {
            this.clearToken();
        }
    }

    /**
     * Verifica sessione corrente
     */
    async checkSession() {
        try {
            const response = await this.get('/auth/me');
            return response.user || null;
        } catch (error) {
            if (error.code === 'SESSION_EXPIRED' || error.status === 401) {
                this.clearToken();
            }
            return null;
        }
    }

    // ==========================================
    // AUDIT ENDPOINTS
    // ==========================================

    async getAudits(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/audits${query ? '?' + query : ''}`);
    }

    async getAudit(id) {
        return this.get(`/audits/${id}`);
    }

    async createAudit(data) {
        return this.post('/audits', data);
    }

    async updateAudit(id, data) {
        return this.put(`/audits/${id}`, data);
    }

    async deleteAudit(id) {
        return this.delete(`/audits/${id}`);
    }

    // ==========================================
    // CHECKLIST ENDPOINTS
    // ==========================================

    async getChecklist(auditId) {
        return this.get(`/checklists/audit/${auditId}`);
    }

    async updateChecklistItem(auditId, sectionId, itemId, data) {
        return this.put(`/checklists/audit/${auditId}/section/${sectionId}/item/${itemId}`, data);
    }

    async saveChecklist(auditId, data) {
        return this.put(`/checklists/audit/${auditId}`, data);
    }

    // ==========================================
    // AUDIT RESPONSES ENDPOINTS (Checklist Answers)
    // ==========================================

    /**
     * Recupera tutte le risposte per un audit
     */
    async getAuditResponses(auditId) {
        return this.get(`/audits/${auditId}/responses`);
    }

    /**
     * Salva singola risposta
     * @param {number} auditId 
     * @param {Object} response - { question_id, conformity_status, notes, evidence, client_updated_at }
     */
    async saveAuditResponse(auditId, response) {
        return this.post(`/audits/${auditId}/responses`, response);
    }

    /**
     * Salva multiple risposte in batch (per sync offline)
     * @param {number} auditId 
     * @param {Array} responses - Array di risposte
     */
    async bulkSaveResponses(auditId, responses) {
        return this.post(`/audits/${auditId}/responses/bulk`, { responses });
    }

    /**
     * Elimina risposta
     */
    async deleteAuditResponse(auditId, questionId) {
        return this.delete(`/audits/${auditId}/responses/${questionId}`);
    }

    // ==========================================
    // SYNC ENDPOINTS
    // ==========================================

    /**
     * Sincronizza audit offline → online
     * @param {Array} audits - Array di audit da sincronizzare
     * @param {number} lastSyncTimestamp - Timestamp ultima sync
     */
    async syncAudits(audits, lastSyncTimestamp = null) {
        return this.post('/sync/audits', { audits, lastSyncTimestamp });
    }

    /**
     * Aggiorna sync metadata
     */
    async updateSyncMetadata(entityType, entityId, entityUuid, syncVersion) {
        return this.post('/sync/metadata', { entityType, entityId, entityUuid, syncVersion });
    }

    // ==========================================
    // NON-CONFORMITY ENDPOINTS
    // ==========================================

    async getNonConformities(auditId = null) {
        const endpoint = auditId ? `/nc?audit_id=${auditId}` : '/nc';
        return this.get(endpoint);
    }

    async getNonConformity(id) {
        return this.get(`/nc/${id}`);
    }

    async createNonConformity(data) {
        return this.post('/nc', data);
    }

    async updateNonConformity(id, data) {
        return this.put(`/nc/${id}`, data);
    }

    async deleteNonConformity(id) {
        return this.delete(`/nc/${id}`);
    }

    // ==========================================
    // STANDARDS ENDPOINTS
    // ==========================================

    async getStandards() {
        return this.get('/standards');
    }

    async getStandard(id) {
        return this.get(`/standards/${id}`);
    }

    async getStandardSections(standardId) {
        return this.get(`/standards/${standardId}/sections`);
    }

    async getChecklistQuestions(standardId, sectionCode) {
        return this.get(`/checklist/questions?standard_id=${standardId}&section_code=${sectionCode}`);
    }

    // ==========================================
    // ATTACHMENT ENDPOINTS
    // ==========================================

    /**
     * Lista allegati per audit
     */
    async getAttachments(auditId = null, ncId = null) {
        const params = new URLSearchParams();
        if (auditId) params.append('audit_id', auditId);
        if (ncId) params.append('nc_id', ncId);
        return this.get(`/attachments${params.toString() ? '?' + params.toString() : ''}`);
    }

    /**
     * Upload allegato (usa FormData, non JSON)
     */
    async uploadAttachment(file, options = {}) {
        const { auditId, ncId, category = 'evidence', description } = options;

        const formData = new FormData();
        formData.append('file', file);
        if (auditId) formData.append('audit_id', auditId);
        if (ncId) formData.append('nc_id', ncId);
        formData.append('category', category);
        if (description) formData.append('description', description);

        const token = this.getToken();
        const response = await fetch(`${this.baseUrl}/attachments/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Non includere Content-Type per FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
                errorData.error || 'Upload fallito',
                response.status,
                errorData.code || 'UPLOAD_ERROR'
            );
        }

        return response.json();
    }

    /**
     * Download allegato (ritorna URL per download)
     */
    getAttachmentDownloadUrl(attachmentId) {
        const token = this.getToken();
        return `${this.baseUrl}/attachments/${attachmentId}/download?token=${token}`;
    }

    /**
     * Elimina allegato
     */
    async deleteAttachment(attachmentId) {
        return this.delete(`/attachments/${attachmentId}`);
    }

    // ==========================================
    // HEALTH CHECK
    // ==========================================

    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

/**
 * Classe errore API personalizzata
 */
class ApiError extends Error {
    constructor(message, status, code) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

// Singleton export
const apiService = new ApiService();
export { apiService, ApiError, config as apiConfig };
export default apiService;
