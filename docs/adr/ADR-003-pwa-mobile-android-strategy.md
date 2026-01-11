# ADR-003: PWA Mobile Android Strategy per Audit sul Campo

---

**Stato**: ✅ Accettato  
**Data**: 11 gennaio 2026  
**Autore**: System Architect  
**Revisore**: Marco Camellini (QS Studio)  
**Tag**: mobile, android, pwa, offline, ux  
**Relates to**: ADR-002 (Offline-First Sync)

---

## Contesto e Problema

**Scenario d'uso principale**: Auditor usa **tablet Android** in stabilimento cliente per:

1. Compilare checklist ISO 9001 (86+ domande)
2. Fotografare evidenze documentali
3. Registrare non conformità sul posto
4. Lavorare **senza connessione** (rete industriale spesso assente)
5. Sincronizzare dati al rientro in ufficio

**Problema**: L'app attuale è sviluppata per **desktop browser**, con gap critici per mobile:

| Problema                              | Impatto | Esempio Concreto                                     |
| ------------------------------------- | ------- | ---------------------------------------------------- |
| ❌ **Touch target piccoli**           | Alto    | Pulsanti status 32x32px → difficile click preciso    |
| ❌ **Viewport non ottimizzato**       | Alto    | Checklist richiede scroll orizzontale su tablet 10"  |
| ❌ **Keyboard mobile copre UI**       | Medio   | Campo note coperto da tastiera virtuale Android      |
| ❌ **No gesture native**              | Medio   | Swipe per passare domanda successiva assente         |
| ❌ **File System API non supportata** | Critico | Export report fallisce su Android (API solo desktop) |
| ❌ **Installazione PWA unclear**      | Alto    | Auditor non sa come installare app su home screen    |
| ❌ **Storage quota limitata**         | Critico | IndexedDB Android max 50MB → 20-30 audit → overflow  |

**Riferimenti ISO 9001:2015**:

- **Punto 9.2**: Audit interno - l'organizzazione deve condurre audit programmati
- **Punto 7.1.5**: Risorse per il monitoraggio - includono strumenti software
- **Punto 7.5**: Informazioni documentate - devono essere disponibili dove necessarie

---

## Decisione

**Implementare architettura PWA ottimizzata per tablet Android 10-12 pollici** con:

### 1️⃣ **PWA Manifest Configurato per Installazione**

**File**: `app/public/manifest.json`

```json
{
  "name": "Sistema Gestione ISO 9001",
  "short_name": "SGQ ISO 9001",
  "description": "App mobile per audit ISO 9001 sul campo",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#667eea",
  "background_color": "#ffffff",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/audit-checklist.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "categories": ["business", "productivity"],
  "shortcuts": [
    {
      "name": "Nuovo Audit",
      "short_name": "Nuovo",
      "description": "Crea nuovo audit ISO 9001",
      "url": "/new-audit",
      "icons": [{ "src": "/icons/new-audit.png", "sizes": "96x96" }]
    },
    {
      "name": "Audit in Corso",
      "short_name": "In Corso",
      "url": "/audits?status=in_progress",
      "icons": [{ "src": "/icons/in-progress.png", "sizes": "96x96" }]
    }
  ],
  "prefer_related_applications": false
}
```

**Requisiti Installabilità PWA**:

- ✅ HTTPS obbligatorio (Netlify/produzione)
- ✅ Service Worker registrato
- ✅ Manifest linkato in `index.html`
- ✅ Icons 192x192 e 512x512 presenti
- ✅ `display: standalone`

**Verifica**: Chrome DevTools → Application → Manifest → "Add to Home Screen" disponibile

---

### 2️⃣ **Service Worker per Offline-First**

**File**: `app/public/sw.js`

```javascript
const CACHE_NAME = "sgq-iso9001-v1.0.0";
const RUNTIME_CACHE = "sgq-runtime-v1";

// Assets statici da cachare all'installazione
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/static/js/main.js",
  "/static/css/main.css",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Installazione: pre-cache assets statici
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Attiva subito nuovo SW
});

// Attivazione: pulisci vecchie cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim(); // Controlla subito tutte le pagine
});

// Fetch: strategia cache-first per assets, network-first per API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network-first (dati freschi priorità)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva in runtime cache
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback a cache se offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log(
                "[SW] Serving API from cache (offline):",
                url.pathname
              );
              return cachedResponse;
            }
            // Nessuna cache → errore
            return new Response(
              JSON.stringify({ error: "Offline - nessun dato in cache" }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
    return;
  }

  // Assets statici: cache-first (performance)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // Non in cache → fetch e salva
      return fetch(request).then((response) => {
        return caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      });
    })
  );
});

// Background Sync: sync queue quando torna online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-audit-data") {
    event.waitUntil(
      // Delega a syncService.js via postMessage
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "BACKGROUND_SYNC_TRIGGER" });
        });
      })
    );
  }
});
```

**Registrazione SW** in `app/src/index.jsx`:

```javascript
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker registered:", registration.scope);

        // Background Sync API (se supportata)
        if ("sync" in registration) {
          registration.sync.register("sync-audit-data");
        }
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error);
      });
  });
}
```

---

### 3️⃣ **UI/UX Ottimizzata per Tablet Android**

#### **A. Viewport Configuration**

**File**: `app/public/index.html`

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
/>
<meta name="theme-color" content="#667eea" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
```

**Rationale**:

- `user-scalable=no`: Previene zoom accidentale durante editing
- `viewport-fit=cover`: Supporto notch/safe-area Android
- `theme-color`: Colora status bar Android con brand color

#### **B. Touch Targets (min 48x48px)**

**File**: `app/src/components/ChecklistModule.css`

```css
/* Touch target WCAG AAA (48x48px minimum) */
.checklist-status-button {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
  margin: 4px;
  border-radius: 8px;
  font-size: 16px; /* Evita zoom automatico iOS/Android */
  touch-action: manipulation; /* Disabilita doppio-tap zoom */
}

/* Feedback tattile visivo */
.checklist-status-button:active {
  transform: scale(0.95);
  transition: transform 100ms;
}

/* Spacing tra elementi cliccabili */
.checklist-question-item {
  margin-bottom: 24px; /* Evita click accidentali */
}
```

**Verifica**: DevTools → Toggle Device Toolbar → Test su "Galaxy Tab S4" (768x1024)

#### **C. Keyboard Management**

**File**: `app/src/components/ChecklistModule.jsx`

```jsx
import React, { useRef, useEffect } from "react";

function ChecklistModule() {
  const notesInputRef = useRef(null);

  // Scroll input in viewport quando keyboard aperta
  const handleNotesFocus = (event) => {
    setTimeout(() => {
      event.target.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300); // Delay per apertura keyboard Android
  };

  return (
    <div className="checklist-module">
      {questions.map((q) => (
        <div key={q.id} className="question-item">
          <p>{q.text}</p>

          {/* Textarea con auto-scroll */}
          <textarea
            ref={notesInputRef}
            placeholder="Note (minimo 10 caratteri per NC/OSS)"
            onFocus={handleNotesFocus}
            style={{ fontSize: "16px" }} // Evita zoom iOS
            inputMode="text"
            autoComplete="off"
          />
        </div>
      ))}
    </div>
  );
}
```

#### **D. Gesture Support**

**File**: `app/src/hooks/useSwipeGesture.js`

```javascript
import { useEffect } from "react";

export function useSwipeGesture(elementRef, onSwipeLeft, onSwipeRight) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50; // pixel
      if (touchEndX < touchStartX - swipeThreshold) {
        onSwipeLeft?.(); // Swipe left → domanda successiva
      }
      if (touchEndX > touchStartX + swipeThreshold) {
        onSwipeRight?.(); // Swipe right → domanda precedente
      }
    };

    element.addEventListener("touchstart", handleTouchStart);
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [elementRef, onSwipeLeft, onSwipeRight]);
}
```

**Uso**:

```jsx
const checklistRef = useRef(null);
useSwipeGesture(checklistRef, goToNextQuestion, goToPreviousQuestion);

return (
  <div ref={checklistRef} className="checklist-container">
    ...
  </div>
);
```

---

### 4️⃣ **File Export Fallback per Android**

**Problema**: File System Access API **non supportata** su Android Chrome.

**Soluzione**: Download via Blob + fallback Share API.

**File**: `app/src/utils/mobileExport.js`

```javascript
/**
 * Export report Word per mobile Android
 * Usa Download blob (salva in Downloads/) + Share API
 */
export async function exportReportMobile(auditData, reportBlob) {
  // Verifica supporto File System Access API (solo desktop)
  const supportsFileSystem = "showSaveFilePicker" in window;

  if (supportsFileSystem) {
    // Desktop: mostra dialog salvataggio
    const handle = await window.showSaveFilePicker({
      suggestedName: `Audit_${auditData.auditNumber}_Report.docx`,
      types: [
        {
          description: "Word Document",
          accept: {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
              [".docx"],
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(reportBlob);
    await writable.close();
    return { success: true, method: "file-system-api" };
  }

  // Mobile Android: Download blob
  const url = URL.createObjectURL(reportBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Audit_${auditData.auditNumber}_Report.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Bonus: Share API (Android nativo)
  if (navigator.share && navigator.canShare) {
    const file = new File(
      [reportBlob],
      `Audit_${auditData.auditNumber}_Report.docx`,
      {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }
    );

    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Report Audit ISO 9001",
          text: `Report audit ${auditData.clientName}`,
          files: [file],
        });
        return { success: true, method: "share-api" };
      } catch (err) {
        console.warn("Share cancelled:", err);
      }
    }
  }

  return { success: true, method: "download-blob" };
}
```

---

### 5️⃣ **Storage Quota Management Android**

**Problema**: IndexedDB su Android Chrome ha quota **~50MB** (vs 10GB+ desktop).

**Soluzione**: Monitoring + cleanup automatico.

**File**: `app/src/services/storageQuotaService.js`

```javascript
export class StorageQuotaService {
  async getStorageEstimate() {
    if (!navigator.storage?.estimate) {
      return { usage: 0, quota: 50 * 1024 * 1024, percentage: 0 }; // Fallback 50MB
    }

    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 50 * 1024 * 1024,
      percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2),
    };
  }

  async checkQuotaWarning() {
    const { percentage, usage, quota } = await this.getStorageEstimate();

    if (percentage >= 80) {
      return {
        warning: true,
        message: `Storage ${percentage}% pieno (${(usage / 1024 / 1024).toFixed(
          1
        )}MB / ${(quota / 1024 / 1024).toFixed(
          1
        )}MB). Sincronizza e archivia audit vecchi.`,
        severity: "high",
      };
    }

    if (percentage >= 60) {
      return {
        warning: true,
        message: `Storage ${percentage}% pieno. Considera sincronizzazione dati.`,
        severity: "medium",
      };
    }

    return { warning: false };
  }

  async cleanupOldAudits(retentionDays = 30) {
    const db = await openDB("SGQ_ISO9001");
    const tx = db.transaction("audits", "readwrite");
    const store = tx.objectStore("audits");

    const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const audits = await store.getAll();

    let deletedCount = 0;
    for (const audit of audits) {
      const lastModified = new Date(audit.metadata.lastModified).getTime();
      const isSynced = audit.sync_status === "synced"; // Solo audits già sincronizzati
      const isCompleted = audit.metadata.status === "completed";

      if (isSynced && isCompleted && lastModified < cutoffDate) {
        await store.delete(audit.id);
        deletedCount++;
      }
    }

    return {
      deletedCount,
      message: `Rimossi ${deletedCount} audit sincronizzati più vecchi di ${retentionDays} giorni`,
    };
  }
}

export default new StorageQuotaService();
```

**Integrazione UI**:

```jsx
import storageQuotaService from "../services/storageQuotaService";

function Dashboard() {
  const [storageWarning, setStorageWarning] = useState(null);

  useEffect(() => {
    async function checkStorage() {
      const warning = await storageQuotaService.checkQuotaWarning();
      if (warning.warning) {
        setStorageWarning(warning);
      }
    }
    checkStorage();
  }, []);

  return (
    <div>
      {storageWarning && (
        <div className={`alert alert-${storageWarning.severity}`}>
          ⚠️ {storageWarning.message}
          <button onClick={handleCleanup}>Pulisci Audit Vecchi</button>
        </div>
      )}
      {/* ...resto dashboard */}
    </div>
  );
}
```

---

### 6️⃣ **Camera Integration per Evidenze**

**File**: `app/src/components/EvidenceCapture.jsx`

```jsx
import React, { useRef } from "react";

export function EvidenceCapture({ onPhotoTaken }) {
  const inputRef = useRef(null);

  const handleCapture = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Ridimensiona foto per risparmiare storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Resize a max 1920x1080 (HD)
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            onPhotoTaken({
              blob,
              name: file.name,
              size: blob.size,
              timestamp: new Date().toISOString(),
            });
          },
          "image/jpeg",
          0.85
        ); // Compressione JPEG 85%
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="evidence-capture">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment" // Fotocamera posteriore Android
        onChange={handleCapture}
        style={{ display: "none" }}
      />
      <button
        className="btn-capture-photo"
        onClick={() => inputRef.current?.click()}
      >
        📷 Scatta Foto Evidenza
      </button>
    </div>
  );
}
```

---

## Conseguenze

### **Impatti Positivi ✅**

1. **Usabilità Campo**: Auditor compila checklist su tablet senza difficoltà UX
2. **Offline Resilience**: Funziona in stabilimenti senza Wi-Fi
3. **Performance**: Cache assets → load 3s → 500ms dopo installazione PWA
4. **Storage Efficiente**: Cleanup automatico evita overflow quota 50MB
5. **Installabilità**: "Aggiungi a Home Screen" → app nativa-like
6. **Evidenze Fotografiche**: Camera integration diretta, no app terze

### **Impatti Negativi ⚠️**

1. **Complessità Testing**: Necessari test su device fisici (emulatore Android non affidabile per PWA)
2. **Manutenzione SW**: Service Worker richiede versioning cache attento
3. **Storage Limits**: 50MB = ~30 audit con foto → richiede sync frequente
4. **Browser Dependency**: PWA avanzate solo Chrome/Edge Android (no Firefox/Samsung Internet)

### **Conformità ISO 9001:2015**

- **Punto 9.2.2**: Audit deve essere condotto con strumenti idonei → PWA mobile adeguato
- **Punto 7.5.3**: Informazioni documentate disponibili dove servono → offline-first garantisce accesso
- **Punto 7.1.5**: Risorse di monitoraggio → tablet + PWA configurati come risorsa audit

---

## Rischi e Mitigazioni

| Rischio                              | Probabilità | Impatto | Mitigazione                                                   |
| ------------------------------------ | ----------- | ------- | ------------------------------------------------------------- |
| Quota storage esaurita durante audit | Media       | Alto    | Warning UI 60%, auto-cleanup 80%, sync obbligatorio pre-audit |
| Service Worker non si aggiorna       | Bassa       | Medio   | Versioning cache esplicito + force refresh UI                 |
| Foto occupano troppo spazio          | Alta        | Medio   | Resize 1920x1080 + compressione JPEG 85%                      |
| Android WebView incompatibilità      | Bassa       | Alto    | Test su Chrome 90+, Samsung Internet 14+                      |
| Keyboard copre form                  | Media       | Medio   | `scrollIntoView` automatico su focus                          |

---

## Acceptance Criteria

1. **PWA Installabile**:

   - ✅ Lighthouse PWA score ≥ 90
   - ✅ "Add to Home Screen" prompt visibile
   - ✅ App funziona standalone (no browser UI)

2. **Offline Funzionale**:

   - ✅ Audit completabile 100% offline
   - ✅ Dati salvati in IndexedDB persistono dopo reboot tablet
   - ✅ Sync automatico quando torna online

3. **UX Mobile**:

   - ✅ Tutti touch target ≥ 48x48px
   - ✅ No scroll orizzontale su tablet 10" (1280x800)
   - ✅ Keyboard non copre input attivo (auto-scroll)
   - ✅ Swipe gesture funzionante tra domande

4. **Storage Management**:

   - ✅ Warning visibile a 60% quota
   - ✅ Cleanup automatico a 80% quota
   - ✅ Foto compresse < 500KB ciascuna

5. **Camera Integration**:
   - ✅ Fotocamera si apre da pulsante evidenza
   - ✅ Foto ridimensionate automaticamente
   - ✅ Preview foto prima di salvare

---

## Implementazione

### **Checklist Attuazione**

- [ ] 1. Crea/verifica `manifest.json` con icons 192x192, 512x512
- [ ] 2. Genera icons PWA (usa [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator))
- [ ] 3. Implementa Service Worker (`sw.js`) con cache strategy
- [ ] 4. Registra SW in `index.jsx`
- [ ] 5. Aggiungi viewport meta tag in `index.html`
- [ ] 6. Audit CSS: touch target min 48px, font-size ≥ 16px
- [ ] 7. Implementa `useSwipeGesture` hook
- [ ] 8. Crea `mobileExport.js` con fallback Share API
- [ ] 9. Implementa `StorageQuotaService`
- [ ] 10. Aggiungi `EvidenceCapture` component
- [ ] 11. Test Lighthouse PWA (target score 90+)
- [ ] 12. Test su device fisico (Galaxy Tab A8, iPad 10.2")
- [ ] 13. Test offline completo (Airplane mode)
- [ ] 14. Test storage overflow (crea 40 audit finti)
- [ ] 15. Documenta procedure installazione PWA per auditor

### **Timeline Execution**

| Step                   | Effort | Owner        | Deadline   |
| ---------------------- | ------ | ------------ | ---------- |
| Icons + Manifest       | 2h     | Frontend Dev | Giorno 1   |
| Service Worker         | 4h     | Frontend Dev | Giorno 1-2 |
| CSS Touch Optimization | 3h     | Frontend Dev | Giorno 2   |
| Mobile Export          | 2h     | Frontend Dev | Giorno 2   |
| Storage Quota Service  | 3h     | Frontend Dev | Giorno 3   |
| Camera Integration     | 2h     | Frontend Dev | Giorno 3   |
| Testing Device Fisico  | 4h     | QA           | Giorno 4   |

**Totale**: ~20h (2.5 giorni lavorativi)

---

## Test Plan

### **Test 1: Installazione PWA**

```
1. Apri Chrome Android → https://app.qsstudio.it
2. Verifica banner "Installa app" compare
3. Click "Installa"
4. Verifica icona appare su home screen
5. Apri app da home screen
6. Verifica NO barra URL (standalone mode)
```

**Expected**: App installata, funziona standalone

### **Test 2: Offline Resilience**

```
1. Installa app
2. Crea nuovo audit, compila 10 domande
3. Attiva Airplane mode
4. Continua compilazione altre 10 domande
5. Aggiungi nota, scatta foto
6. Chiudi app
7. Riapri app (ancora offline)
8. Verifica dati salvati
9. Disattiva Airplane mode
10. Aspetta 30s (auto-sync)
11. Verifica sync completata
```

**Expected**: Nessun dato perso, sync automatico

### **Test 3: Storage Quota**

```
1. Crea script genera 40 audit con 10 foto ciascuno
2. Monitora storage quota
3. Verifica warning compare a 60%
4. Verifica cleanup automatico a 80%
5. Verifica app non crasha a quota piena
```

**Expected**: Warning, cleanup, no crash

### **Test 4: Touch UX**

```
1. Usa stylus/dito per click pulsanti status
2. Verifica click preciso (no miss)
3. Swipe left/right tra domande
4. Tap textarea note → keyboard apre
5. Verifica textarea visibile sopra keyboard
6. Zoom gesture → verifica disabled su form
```

**Expected**: UX fluida, no frustrazione

---

## Note Aggiuntive

### **Browser Support Matrix**

| Browser          | Versione Min | PWA Install | Service Worker | Share API | Note               |
| ---------------- | ------------ | ----------- | -------------- | --------- | ------------------ |
| Chrome Android   | 90+          | ✅          | ✅             | ✅        | **Raccomandato**   |
| Edge Android     | 90+          | ✅          | ✅             | ✅        | OK                 |
| Samsung Internet | 14+          | ✅          | ✅             | ⚠️        | Share API limitata |
| Firefox Android  | 100+         | ❌          | ✅             | ❌        | **No PWA install** |

**Raccomandazione**: Configurare tablet auditor con **Chrome Android** pre-installato.

### **Device Testing Targets**

- **Primary**: Samsung Galaxy Tab A8 10.5" (Android 12, Chrome 110)
- **Secondary**: Lenovo Tab M10 Plus (Android 11, Chrome 105)
- **Fallback**: iPad 10.2" (Safari 16) - per test cross-platform

### **Performance Benchmarks**

| Metrica                | Target  | Misurato | Status |
| ---------------------- | ------- | -------- | ------ |
| First Contentful Paint | < 1.5s  | TBD      | ⏳     |
| Time to Interactive    | < 3s    | TBD      | ⏳     |
| Lighthouse PWA Score   | ≥ 90    | TBD      | ⏳     |
| Offline Load Time      | < 500ms | TBD      | ⏳     |
| Storage per Audit      | < 2MB   | TBD      | ⏳     |

---

## Changelog

| Data       | Modifica          | Autore           |
| ---------- | ----------------- | ---------------- |
| 2026-01-11 | Creazione ADR-003 | System Architect |

---

**Approvazione**:

- ✅ System Architect: 2026-01-11
- ⏳ Tech Lead: _da firmare_
- ⏳ Product Owner (Marco Camellini): _da firmare_
- ⏳ Auditor Test User: _da validare su campo_
