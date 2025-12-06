/**
 * Backend Controller: Sync
 * Gestisce sincronizzazione dati offline → online con conflict resolution
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * POST /api/v1/sync/audits
 * Sincronizza audit creati/modificati offline
 * 
 * Body: {
 *   audits: [{ id, data, lastModified, ... }],
 *   lastSyncTimestamp: 1234567890
 * }
 */
async function syncAudits(req, res) {
    try {
        const { audits, lastSyncTimestamp } = req.body;
        const userId = req.user.user_id;
        const organizationId = req.user.organization_id;

        if (!audits || !Array.isArray(audits)) {
            return res.status(400).json({
                success: false,
                error: 'Campo audits obbligatorio (array)'
            });
        }

        const results = {
            created: [],
            updated: [],
            conflicts: [],
            errors: []
        };

        // Processa ogni audit
        for (const clientAudit of audits) {
            try {
                // Verifica se audit esiste su server
                const existing = await query(`
          SELECT audit_id, audit_uuid, updated_at
          FROM audits
          WHERE audit_uuid = @audit_uuid
            AND organization_id = @organization_id
        `, {
                    audit_uuid: clientAudit.id,
                    organization_id: organizationId
                });

                if (existing.recordset.length === 0) {
                    // Nuovo audit → CREATE
                    const created = await createAuditFromSync(clientAudit, userId, organizationId);
                    results.created.push(created);
                } else {
                    // Audit esistente → CHECK CONFLICT
                    const serverAudit = existing.recordset[0];
                    const serverTime = new Date(serverAudit.updated_at).getTime();
                    const clientTime = new Date(clientAudit.lastModified).getTime();

                    if (clientTime > serverTime) {
                        // Client più recente → UPDATE
                        const updated = await updateAuditFromSync(serverAudit.audit_id, clientAudit);
                        results.updated.push(updated);
                    } else if (clientTime < serverTime) {
                        // Server più recente → CONFLICT
                        const serverData = await getAuditById(serverAudit.audit_id);
                        results.conflicts.push({
                            clientAudit,
                            serverAudit: serverData,
                            resolution: 'server_wins'
                        });
                    } else {
                        // Stesso timestamp → SKIP (già sincronizzato)
                        results.updated.push({ audit_id: serverAudit.audit_id, skipped: true });
                    }
                }
            } catch (error) {
                logger.error(`Errore sync audit ${clientAudit.id}:`, error);
                results.errors.push({
                    auditId: clientAudit.id,
                    error: error.message
                });
            }
        }

        // Ottieni audit modificati sul server dopo lastSyncTimestamp
        let serverChanges = [];
        if (lastSyncTimestamp) {
            const changesResult = await query(`
        SELECT 
          audit_id, audit_uuid, audit_number, client_name,
          audit_date, status, updated_at
        FROM audits
        WHERE organization_id = @organization_id
          AND updated_at > @last_sync
          AND is_deleted = 0
        ORDER BY updated_at DESC
      `, {
                organization_id: organizationId,
                last_sync: new Date(lastSyncTimestamp)
            });

            serverChanges = changesResult.recordset;
        }

        res.json({
            success: true,
            results,
            serverChanges,
            syncTimestamp: Date.now()
        });

    } catch (error) {
        logger.error('Errore sync audits:', error);
        res.status(500).json({
            success: false,
            error: 'Errore sincronizzazione audit'
        });
    }
}

/**
 * POST /api/v1/sync/metadata
 * Aggiorna sync_metadata per tracking sincronizzazione
 */
async function updateSyncMetadata(req, res) {
    try {
        const { entityType, entityId, entityUuid, syncVersion } = req.body;
        const userId = req.user.user_id;

        await query(`
      MERGE INTO sync_metadata AS target
      USING (SELECT @entity_type AS entity_type, @entity_id AS entity_id) AS source
      ON target.entity_type = source.entity_type AND target.entity_id = source.entity_id
      WHEN MATCHED THEN
        UPDATE SET 
          last_sync_at = GETDATE(),
          sync_version = @sync_version,
          entity_uuid = @entity_uuid
      WHEN NOT MATCHED THEN
        INSERT (entity_type, entity_id, entity_uuid, last_sync_at, sync_version)
        VALUES (@entity_type, @entity_id, @entity_uuid, GETDATE(), @sync_version);
    `, {
            entity_type: entityType,
            entity_id: entityId,
            entity_uuid: entityUuid,
            sync_version: syncVersion || 1
        });

        res.json({
            success: true,
            message: 'Sync metadata aggiornato'
        });

    } catch (error) {
        logger.error('Errore update sync metadata:', error);
        res.status(500).json({
            success: false,
            error: 'Errore aggiornamento metadata'
        });
    }
}

/**
 * Helper: Crea audit da sync
 */
async function createAuditFromSync(clientAudit, userId, organizationId) {
    const result = await query(`
    INSERT INTO audits (
      audit_uuid, audit_number, client_name, project_year,
      audit_date, auditor_name, audit_type, status,
      organization_id, standard_id, created_by
    )
    VALUES (
      @audit_uuid, @audit_number, @client_name, @project_year,
      @audit_date, @auditor_name, @audit_type, @status,
      @organization_id, @standard_id, @created_by
    );
    SELECT SCOPE_IDENTITY() AS audit_id;
  `, {
        audit_uuid: clientAudit.id,
        audit_number: clientAudit.auditNumber,
        client_name: clientAudit.clientName,
        project_year: clientAudit.projectYear,
        audit_date: clientAudit.auditDate,
        auditor_name: clientAudit.auditorName,
        audit_type: clientAudit.auditType,
        status: clientAudit.status || 'draft',
        organization_id: organizationId,
        standard_id: clientAudit.standardId || 1, // Default ISO 9001
        created_by: userId
    });

    return {
        audit_id: result.recordset[0].audit_id,
        audit_uuid: clientAudit.id
    };
}

/**
 * Helper: Aggiorna audit da sync
 */
async function updateAuditFromSync(auditId, clientAudit) {
    await query(`
    UPDATE audits
    SET
      client_name = @client_name,
      audit_date = @audit_date,
      auditor_name = @auditor_name,
      status = @status,
      notes = @notes,
      updated_at = GETDATE()
    WHERE audit_id = @audit_id
  `, {
        audit_id: auditId,
        client_name: clientAudit.clientName,
        audit_date: clientAudit.auditDate,
        auditor_name: clientAudit.auditorName,
        status: clientAudit.status,
        notes: clientAudit.notes
    });

    return { audit_id: auditId, updated: true };
}

/**
 * Helper: Ottieni audit by ID
 */
async function getAuditById(auditId) {
    const result = await query(`
    SELECT * FROM vw_audit_dashboard
    WHERE audit_id = @audit_id
  `, { audit_id: auditId });

    return result.recordset[0];
}

module.exports = {
    syncAudits,
    updateSyncMetadata
};
