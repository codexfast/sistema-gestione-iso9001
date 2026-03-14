/**
 * Connection Status Component
 * Indicatore visuale stato connessione (Online/Offline).
 * Usa l'URL del backend reale (stesso di apiService) per non confondere
 * "rete locale attiva" con "server raggiungibile" (importante da mobile e su Netlify).
 * Sistema Gestione ISO 9001 - QS Studio
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';
import { syncService } from '../services/syncService';
import './ConnectionStatus.css';

// Timeout health check: più lungo da mobile (connessioni spesso lente/instabili)
const HEALTH_TIMEOUT_MS = typeof window !== 'undefined' && window.innerWidth < 768 ? 8000 : 5000;
const PING_INTERVAL_MS = 30000;

function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastSync, setLastSync] = useState(null);
    const [showIndicator, setShowIndicator] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    const checkHealth = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
            const url = `${apiService.baseUrl.replace(/\/$/, '')}/health`;
            const response = await fetch(url, {
                method: 'GET',
                cache: 'no-cache',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowIndicator(true);
            console.log('🟢 Connessione ripristinata');
            setTimeout(() => setShowIndicator(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowIndicator(true);
            console.warn('🔴 Connessione persa - Modalità offline attiva');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const pingInterval = setInterval(async () => {
            const ok = await checkHealth();
            if (ok) {
                setLastSync(new Date());
                if (!isOnline) {
                    setIsOnline(true);
                    setShowIndicator(true);
                    setTimeout(() => setShowIndicator(false), 3000);
                }
            } else {
                setIsOnline(false);
                setShowIndicator(true);
            }
        }, PING_INTERVAL_MS);

        if (!navigator.onLine) setShowIndicator(true);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(pingInterval);
        };
    }, [isOnline, checkHealth]);

    // Quando siamo offline, aggiorna il numero di operazioni in coda per la sync
    useEffect(() => {
        if (isOnline) {
            setPendingCount(0);
            return;
        }
        let cancelled = false;
        const refresh = async () => {
            try {
                const n = await syncService.getQueueSize();
                if (!cancelled) setPendingCount(n);
            } catch {
                if (!cancelled) setPendingCount(0);
            }
        };
        refresh();
        const t = setInterval(refresh, 5000);
        return () => {
            cancelled = true;
            clearInterval(t);
        };
    }, [isOnline]);

    // Non renderizzare se online e nascosto
    if (isOnline && !showIndicator) {
        return null;
    }

    return (
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? (
                <>
                    <span className="status-icon">🟢</span>
                    <span className="status-text">Online</span>
                    {lastSync && (
                        <span className="last-sync">
                            {lastSync.toLocaleTimeString('it-IT', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </span>
                    )}
                </>
            ) : (
                <>
                    <span className="status-icon">🔴</span>
                    <span className="status-text">Offline</span>
                    {pendingCount > 0 ? (
                        <span className="offline-hint">{pendingCount} in attesa di sync</span>
                    ) : (
                        <span className="offline-hint">Modifiche salvate localmente</span>
                    )}
                </>
            )}
        </div>
    );
}

export default ConnectionStatus;
