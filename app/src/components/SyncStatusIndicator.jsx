/**
 * Sync Status Indicator Component
 * Mostra stato sincronizzazione e conflict dialog
 */

import React from "react";
import { useStorage } from "../contexts/StorageContext";

export function SyncStatusIndicator() {
  const { syncStatus, triggerManualSync, resolveConflict } = useStorage();

  const handleManualSync = async () => {
    const result = await triggerManualSync();
    if (result.success) {
      alert(`Sincronizzazione completata! Queue: ${result.queueSize} items`);
    } else {
      alert(`Errore sincronizzazione: ${result.error}`);
    }
  };

  return (
    <div className="sync-status-indicator">
      {/* Indicator badge */}
      <div className="sync-badge">
        {syncStatus.isSyncing ? (
          <span className="syncing">🔄 Sincronizzazione...</span>
        ) : syncStatus.queueSize > 0 ? (
          <span
            className="pending"
            title={`${syncStatus.queueSize} operazioni in coda`}
          >
            📤 {syncStatus.queueSize}
          </span>
        ) : (
          <span className="synced">✅ Sincronizzato</span>
        )}
      </div>

      {/* Last sync time */}
      {syncStatus.lastSync && (
        <small className="last-sync">
          Ultimo: {new Date(syncStatus.lastSync).toLocaleTimeString("it-IT")}
        </small>
      )}

      {/* Manual sync button */}
      <button
        onClick={handleManualSync}
        disabled={syncStatus.isSyncing || !navigator.onLine}
        className="btn-sync-manual"
        title="Forza sincronizzazione manuale"
      >
        🔄 Sync
      </button>

      {/* Conflict dialog */}
      {syncStatus.hasConflict && syncStatus.conflictData && (
        <div className="conflict-dialog-overlay">
          <div className="conflict-dialog">
            <h3>⚠️ Conflitto rilevato</h3>
            <p>
              L'audit <strong>{syncStatus.conflictData.auditNumber}</strong> è
              stato modificato sia localmente che sul server.
            </p>

            <div className="conflict-details">
              <div className="version">
                <h4>📱 Versione locale</h4>
                <p>
                  Modificato:{" "}
                  {new Date(
                    syncStatus.conflictData.localModified
                  ).toLocaleString("it-IT")}
                </p>
              </div>
              <div className="version">
                <h4>☁️ Versione server</h4>
                <p>
                  Modificato:{" "}
                  {new Date(
                    syncStatus.conflictData.serverModified
                  ).toLocaleString("it-IT")}
                </p>
              </div>
            </div>

            <div className="conflict-actions">
              <button
                onClick={() => resolveConflict("keep_local")}
                className="btn btn-primary"
              >
                Mantieni versione locale
              </button>
              <button
                onClick={() => resolveConflict("use_server")}
                className="btn btn-secondary"
              >
                Usa versione server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncStatusIndicator;
