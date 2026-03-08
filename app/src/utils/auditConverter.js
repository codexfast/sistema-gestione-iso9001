/**
 * Audit Converter - Backend ↔ Frontend Format
 * Sistema Gestione ISO 9001 - QS Studio
 * 
 * Converte tra formato backend (snake_case, flat) e frontend (camelCase, nested)
 */

/**
 * Converte audit dal formato backend a frontend
 * @param {Object} backendAudit - Audit dal server (snake_case)
 * @returns {Object} Audit formato frontend (camelCase + nested)
 */
export function backendToFrontend(backendAudit) {
    if (!backendAudit) return null;

    // Estrae i campi ricchi da audit_extra_data (JSON serializzato dal server)
    const extraData = backendAudit.audit_extra_data && typeof backendAudit.audit_extra_data === 'object'
        ? backendAudit.audit_extra_data
        : {};

    return {
        id: backendAudit.audit_uuid || `audit-${backendAudit.audit_id}`,
            metadata: {
            id: backendAudit.audit_uuid || `audit-${backendAudit.audit_id}`,
            auditId: backendAudit.audit_id, // Mantieni ID numerico server
            auditNumber: backendAudit.audit_number || '',
            clientName: backendAudit.client_name || '',
            companyId: backendAudit.company_id ?? null,
            projectYear: backendAudit.project_year || new Date().getFullYear().toString(),
            auditDate: backendAudit.audit_date || new Date().toISOString().split('T')[0],
            auditorName: backendAudit.auditor_name || '',
            auditType: backendAudit.audit_type || 'certification',
            status: backendAudit.status || 'draft',
            notes: backendAudit.notes || '',
            totalQuestions: backendAudit.total_questions || 0,
            answeredQuestions: backendAudit.answered_questions || 0,
            conformitiesCount: backendAudit.conformities_count || 0,
            nonConformitiesCount: backendAudit.non_conformities_count || 0,
            completionPercentage: backendAudit.completion_percentage || 0,
            // selectedStandards: formato canonico senza suffisso anno (es 'ISO_9001', non 'ISO_9001_2015')
            // Usa il campo 'standards' (comma-separated da audit_standards JOIN) se disponibile,
            // altrimenti cade su standard_id singolo per retrocompatibilità
            selectedStandards: (() => {
                const NORMALIZE = {
                    ISO_9001_2015: 'ISO_9001',   ISO_9001: 'ISO_9001',
                    ISO_14001_2015: 'ISO_14001', ISO_14001: 'ISO_14001',
                    ISO_45001_2018: 'ISO_45001', ISO_45001: 'ISO_45001',
                    ISO_3834_2: 'ISO_3834_2',    ISO_3834_2_2021: 'ISO_3834_2', ISO_3834: 'ISO_3834_2',
                };
                if (backendAudit.standards) {
                    // GET /audits/:id  → standards è un array di oggetti [{standard_code,...}]
                    // GET /audits      → standards è una stringa CSV "ISO_9001_2015,ISO_14001_2015"
                    const codes = Array.isArray(backendAudit.standards)
                        ? backendAudit.standards.map(s => s.standard_code || String(s))
                        : String(backendAudit.standards).split(',').map(s => s.trim());
                    return codes.map(s => NORMALIZE[s] || s).filter(Boolean);
                }
                const id = backendAudit.standard_id;
                if (id === 2) return ['ISO_14001'];
                if (id === 3) return ['ISO_45001'];
                if (id === 6) return ['ISO_3834_2'];
                return ['ISO_9001'];
            })(),
            createdAt: backendAudit.created_at,
            updatedAt: backendAudit.updated_at,
            // Campi ricchi: ripristinati da audit_extra_data dove Dashboard li aspetta
            ...(extraData.generalData    ? { generalData:    extraData.generalData    } : {}),
            ...(extraData.auditObjective ? { auditObjective: extraData.auditObjective } : {}),
            ...(extraData.auditOutcome   ? { auditOutcome:   extraData.auditOutcome   } : {}),
        },
        checklist: {
            ISO_9001: {} // Vuoto, verrà popolato al primo accesso
        },
        nonConformities: [],
        pendingIssues: [],       // Richiesto da schema validation (auditDataModel.js:446)
        reportChapters: [],      // Richiesto da schema validation (auditDataModel.js:447)
        exports: [],             // Richiesto da schema validation (auditDataModel.js:448)
        attachments: [],         // Lista allegati locali (preservata dal merge se presente)
        evidences: {
            documents: [],
            photos: [],
            notes: []
        },
        metrics: {
            totalQuestions: backendAudit.total_questions || 0,
            answeredQuestions: backendAudit.answered_questions || 0,
            conformitiesCount: backendAudit.conformities_count || 0,
            nonConformitiesCount: backendAudit.non_conformities_count || 0,
            completionPercentage: backendAudit.completion_percentage || 0
        }
    };
}

/**
 * Converte audit dal formato frontend a backend
 * @param {Object} frontendAudit - Audit dal frontend (camelCase + nested)
 * @returns {Object} Audit formato backend (snake_case)
 */
export function frontendToBackend(frontendAudit) {
    if (!frontendAudit || !frontendAudit.metadata) return null;

    const meta = frontendAudit.metadata;

    return {
        audit_uuid: frontendAudit.id || meta.id,
        audit_id: meta.auditId, // Se esiste (da server)
        audit_number: meta.auditNumber,
        client_name: meta.clientName,
        company_id: meta.companyId ?? null,
        project_year: meta.projectYear,
        audit_date: meta.auditDate,
        auditor_name: meta.auditorName || meta.auditors?.[0] || '',
        audit_type: meta.auditType,
        status: meta.status,
        notes: meta.notes,
        total_questions: frontendAudit.metrics?.totalQuestions || meta.totalQuestions || 0,
        answered_questions: frontendAudit.metrics?.answeredQuestions || meta.answeredQuestions || 0,
        conformities_count: frontendAudit.metrics?.conformitiesCount || meta.conformitiesCount || 0,
        non_conformities_count: frontendAudit.metrics?.nonConformitiesCount || meta.nonConformitiesCount || 0,
        completion_percentage: frontendAudit.metrics?.completionPercentage || meta.completionPercentage || 0,
        // Deriva standard_id da selectedStandards (primo standard selezionato)
        standard_id: (() => {
            const stds = meta.selectedStandards || [];
            if (stds.some(s => s === 'ISO_14001' || s === 'ISO_14001_2015')) return 2;
            if (stds.some(s => s === 'ISO_45001' || s === 'ISO_45001_2018')) return 3;
            if (stds.some(s => s === 'ISO_3834' || s === 'ISO_3834_2' || String(s).includes('3834'))) return 6;
            return 1; // ISO 9001 default
        })(),
        created_at: meta.createdAt,
        updated_at: meta.updatedAt || new Date().toISOString()
    };
}

/**
 * Converte array di audit backend → frontend
 */
export function convertAuditsFromBackend(backendAudits) {
    if (!Array.isArray(backendAudits)) return [];
    return backendAudits.map(backendToFrontend).filter(Boolean);
}

/**
 * Converte array di audit frontend → backend
 */
export function convertAuditsToBackend(frontendAudits) {
    if (!Array.isArray(frontendAudits)) return [];
    return frontendAudits.map(frontendToBackend).filter(Boolean);
}

export default {
    backendToFrontend,
    frontendToBackend,
    convertAuditsFromBackend,
    convertAuditsToBackend
};
