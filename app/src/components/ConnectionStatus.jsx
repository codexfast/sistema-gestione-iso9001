/**
 * Connection Status Component
 * Indicatore visuale stato connessione (Online/Offline)
 * Sistema Gestione ISO 9001 - QS Studio
 */

import { useState, useEffect } from 'react';
import './ConnectionStatus.css';

function ConnectionStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastSync, setLastSync] = useState(null);
    const [showIndicator, setShowIndicator] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowIndicator(true);
            console.log('🟢 Connessione ripristinata');
            
            // Nascondi dopo 3 secondi quando torna online
            setTimeout(() => setShowIndicator(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowIndicator(true);
            console.warn('🔴 Connessione persa - Modalità offline attiva');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Verifica periodica backend (ogni 30s)
        const pingInterval = setInterval(async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

                const response = await fetch('/api/v1/health', {
                    method: 'GET',
                    cache: 'no-cache',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    if (!isOnline) {
                        setIsOnline(true);
                        setShowIndicator(true);
                        setTimeout(() => setShowIndicator(false), 3000);
                    }
                    setLastSync(new Date());
                } else {
                    setIsOnline(false);
                    setShowIndicator(true);
                }
            } catch (error) {
                // Timeout o network error
                if (!isOnline) {
                    // Già offline, non mostrare nuovamente
                } else {
                    setIsOnline(false);
                    setShowIndicator(true);
                }
            }
        }, 30000); // 30 secondi

        // Mostra inizialmente solo se offline
        if (!navigator.onLine) {
            setShowIndicator(true);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(pingInterval);
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
                    <span className="offline-hint">Modifiche salvate localmente</span>
                </>
            )}
        </div>
    );
}

export default ConnectionStatus;
