/**
 * AuditAccordionLayout - Mobile-First Accordion Navigation
 * Struttura ad albero verticale conforme al template Word
 */

import { useState, useEffect } from "react";
import { useStorage } from "../contexts/StorageContext";
import "./AuditAccordionLayout.css";

// Import sezioni
import GeneralDataSection from "./GeneralDataSection";
import AuditObjectiveSection from "./AuditObjectiveSection";
import PendingIssuesCascade from "./PendingIssuesCascade";
import ChecklistModule from "./ChecklistModule";
import AuditOutcomeSection from "./AuditOutcomeSection";
import ExportPanel from "./ExportPanel";

function AuditAccordionLayout({ currentAudit, onUpdate }) {
  const { initializeChecklist, fetchAndApplyServerResponses } = useStorage();

  // Stato per gestire quali sezioni sono aperte
  const [openSections, setOpenSections] = useState({
    "general-data": false, // Chiusa di default
    checklist: false,
    outcome: false,
    export: false, // NUOVO: sezione export
  });

  // Stato per gestire quali sotto-sezioni sono aperte
  const [openSubSections, setOpenSubSections] = useState({
    "general-data-form": false, // Chiusa di default
    objective: false,
    "pending-issues": false,
    "iso-9001": false,
    "iso-14001": false,
    "iso-45001": false,
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleSubSection = (subSectionId) => {
    setOpenSubSections((prev) => ({
      ...prev,
      [subSectionId]: !prev[subSectionId],
    }));
  };

  const handleGeneralDataUpdate = (updatedData) => {
    onUpdate("generalData", updatedData);
  };

  const handleAuditObjectiveUpdate = (updatedData) => {
    onUpdate("auditObjective", updatedData);
  };

  const handleAuditOutcomeUpdate = (updatedData) => {
    onUpdate("auditOutcome", updatedData);
  };

  // Auto-inizializza checklist al caricamento dell'audit (anche senza aprire il sotto-accordeon)
  useEffect(() => {
    if (!currentAudit) return;
    const standards = currentAudit.metadata?.selectedStandards || [];
    const hasISO9001 = standards.some(
      (s) => s === "ISO_9001" || s === "ISO_9001_2015"
    );
    const isoChecklist = currentAudit.checklist?.ISO_9001;
    const isChecklistEmpty =
      !isoChecklist || Object.keys(isoChecklist).length === 0;
    if (hasISO9001 && isChecklistEmpty) {
      console.log(
        "[AuditAccordionLayout] Auto-init checklist ISO_9001 per audit:",
        currentAudit.id
      );
      initializeChecklist("ISO_9001");
      // Idrata subito con risposte reali dal server (audit esistente)
      const numericId = currentAudit.metadata?.auditId;
      if (numericId) {
        fetchAndApplyServerResponses(numericId);
      }
    }
  }, [currentAudit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStandardsUpdate = (updatedStandards) => {
    const previousStandards = currentAudit.metadata.selectedStandards || [];

    // Trova standard aggiunti
    const addedStandards = updatedStandards.filter(
      (std) => !previousStandards.includes(std)
    );

    // Trova standard rimossi
    const removedStandards = previousStandards.filter(
      (std) => !updatedStandards.includes(std)
    );

    console.log(`[Accordion] Standard update: added=${addedStandards}, removed=${removedStandards}`);

    // Aggiorna metadata
    onUpdate("selectedStandards", updatedStandards);

    // Inizializza checklist per standard aggiunti (immediato, no setTimeout)
    addedStandards.forEach((standard) => {
      // Supporta sia "ISO_9001" (key interna) che "ISO_9001_2015" (code da API/fallback)
      if (standard === "ISO_9001" || standard === "ISO_9001_2015") {
        console.log(`[Accordion] Triggering initializeChecklist for ${standard}`);
        initializeChecklist("ISO_9001");
      }
      if (standard === "ISO_14001" || standard === "ISO_14001_2015") {
        console.log(`[Accordion] Triggering initializeChecklist for ${standard}`);
        initializeChecklist("ISO_14001");
      }
      if (standard === "ISO_45001" || standard === "ISO_45001_2018") {
        console.log(`[Accordion] Triggering initializeChecklist for ${standard}`);
        initializeChecklist("ISO_45001");
      }
    });

    // TODO: Rimuovere checklist per standard deselezionati
    // (per ora lasciamo la checklist anche se deselezionato, per evitare perdita dati)
  };

  // Guardia: se currentAudit è null, mostra messaggio
  if (!currentAudit) {
    return (
      <div className="audit-accordion-layout">
        <div className="no-audit-message">
          <h2>⚠️ Nessun audit selezionato</h2>
          <p>Seleziona un audit dalla lista o creane uno nuovo.</p>
        </div>
      </div>
    );
  }

  // Verifica quali standard sono selezionati
  const selectedStandards = currentAudit.metadata.selectedStandards || [];

  return (
    <div className="audit-accordion-layout">
      {/* Header con info audit */}
      <div className="audit-header">
        <div className="audit-title">
          <h1>{currentAudit.metadata.clientName}</h1>
          <span className="audit-number">
            Audit N. {currentAudit.metadata.auditNumber}
          </span>
        </div>
        <div className="audit-meta">
          <span
            className={`audit-status status-${currentAudit.metadata.status.toLowerCase()}`}
          >
            {currentAudit.metadata.status}
          </span>
          <span className="audit-date">
            {new Date(currentAudit.metadata.lastModified).toLocaleDateString(
              "it-IT"
            )}
          </span>
        </div>
      </div>

      {/* Accordion Content */}
      <div className="accordion-container">
        {/* ==================== SEZIONE 1: DATI GENERALI ==================== */}
        <div className="accordion-section">
          <button
            className={`accordion-header ${
              openSections["general-data"] ? "open" : ""
            }`}
            onClick={() => toggleSection("general-data")}
          >
            <span className="section-icon">📋</span>
            <span className="section-title">1 – DATI GENERALI</span>
            <span className="section-arrow">
              {openSections["general-data"] ? "▼" : "▶"}
            </span>
          </button>

          {openSections["general-data"] && (
            <div className="accordion-content">
              {/* Sub-Section: 1.1 Informazioni Audit */}
              <div className="accordion-subsection">
                <button
                  className={`accordion-subheader ${
                    openSubSections["general-data-form"] ? "open" : ""
                  }`}
                  onClick={() => toggleSubSection("general-data-form")}
                >
                  <span className="subsection-number">1.1</span>
                  <span className="subsection-title">Informazioni di base sull'audit: oggetto, campo di applicazione, riferimenti documentali</span>
                  <span className="subsection-arrow">
                    {openSubSections["general-data-form"] ? "▼" : "▶"}
                  </span>
                </button>

                {openSubSections["general-data-form"] && (
                  <div className="subsection-content">
                    <GeneralDataSection
                      generalData={currentAudit.metadata.generalData}
                      selectedStandards={selectedStandards}
                      onUpdate={handleGeneralDataUpdate}
                      onStandardsUpdate={handleStandardsUpdate}
                    />
                  </div>
                )}
              </div>

              {/* Sub-Section: 1.2 Obiettivo */}
              <div className="accordion-subsection">
                <button
                  className={`accordion-subheader ${
                    openSubSections["objective"] ? "open" : ""
                  }`}
                  onClick={() => toggleSubSection("objective")}
                >
                  <span className="subsection-number">1.2</span>
                  <span className="subsection-title">Obiettivo dell'Audit</span>
                  <span className="subsection-arrow">
                    {openSubSections["objective"] ? "▼" : "▶"}
                  </span>
                </button>

                {openSubSections["objective"] && (
                  <div className="subsection-content">
                    <AuditObjectiveSection
                      auditObjective={currentAudit.metadata.auditObjective}
                      onUpdate={handleAuditObjectiveUpdate}
                    />
                  </div>
                )}
              </div>

              {/* Sub-Section: 1.3 Rilievi Pendenti */}
              <div className="accordion-subsection">
                <button
                  className={`accordion-subheader ${
                    openSubSections["pending-issues"] ? "open" : ""
                  }`}
                  onClick={() => toggleSubSection("pending-issues")}
                >
                  <span className="subsection-number">1.3</span>
                  <span className="subsection-title">Rilievi Pendenti</span>
                  <span className="subsection-arrow">
                    {openSubSections["pending-issues"] ? "▼" : "▶"}
                  </span>
                </button>

                {openSubSections["pending-issues"] && (
                  <div className="subsection-content">
                    <PendingIssuesCascade />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== SEZIONE 2: CHECKLIST ==================== */}
        <div className="accordion-section">
          <button
            className={`accordion-header ${
              openSections["checklist"] ? "open" : ""
            }`}
            onClick={() => toggleSection("checklist")}
          >
            <span className="section-icon">✅</span>
            <span className="section-title">Checklist</span>
            <span className="section-arrow">
              {openSections["checklist"] ? "▼" : "▶"}
            </span>
          </button>

          {openSections["checklist"] && (
            <div className="accordion-content">
              {/* ISO 9001 - Solo se selezionato (accetta sia "ISO_9001" che "ISO_9001_2015") */}
              {selectedStandards.some(
                (s) => s === "ISO_9001" || s === "ISO_9001_2015"
              ) && (
                <div className="accordion-subsection standard-section">
                  <button
                    className={`accordion-subheader standard-header ${
                      openSubSections["iso-9001"] ? "open" : ""
                    }`}
                    onClick={() => toggleSubSection("iso-9001")}
                  >
                    <span className="standard-icon">📋</span>
                    <span className="subsection-title">
                      ISO 9001:2015 - Qualità
                    </span>
                    <span className="subsection-arrow">
                      {openSubSections["iso-9001"] ? "▼" : "▶"}
                    </span>
                  </button>

                  {openSubSections["iso-9001"] && (
                    <div className="subsection-content">
                      <ChecklistModule />
                    </div>
                  )}
                </div>
              )}

              {/* ISO 14001 - Solo se selezionato */}
              {selectedStandards.includes("ISO_14001") && (
                <div className="accordion-subsection standard-section">
                  <button
                    className={`accordion-subheader standard-header ${
                      openSubSections["iso-14001"] ? "open" : ""
                    }`}
                    onClick={() => toggleSubSection("iso-14001")}
                  >
                    <span className="standard-icon">🌱</span>
                    <span className="subsection-title">
                      ISO 14001:2015 - Ambiente
                    </span>
                    <span className="subsection-arrow">
                      {openSubSections["iso-14001"] ? "▼" : "▶"}
                    </span>
                  </button>

                  {openSubSections["iso-14001"] && (
                    <div className="subsection-content">
                      <ChecklistModule defaultNorm="ISO_14001" />
                    </div>
                  )}
                </div>
              )}

              {/* ISO 45001 - Solo se selezionato */}
              {selectedStandards.includes("ISO_45001") && (
                <div className="accordion-subsection standard-section">
                  <button
                    className={`accordion-subheader standard-header ${
                      openSubSections["iso-45001"] ? "open" : ""
                    }`}
                    onClick={() => toggleSubSection("iso-45001")}
                  >
                    <span className="standard-icon">🦺</span>
                    <span className="subsection-title">
                      ISO 45001:2018 - Sicurezza
                    </span>
                    <span className="subsection-arrow">
                      {openSubSections["iso-45001"] ? "▼" : "▶"}
                    </span>
                  </button>

                  {openSubSections["iso-45001"] && (
                    <div className="subsection-content">
                      <div className="checklist-placeholder">
                        <p>Checklist ISO 45001 - In sviluppo</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Messaggio se nessuno standard selezionato */}
              {selectedStandards.length === 0 && (
                <div className="no-standards-message">
                  <p>⚠️ Nessuno standard selezionato</p>
                  <p className="hint">
                    Vai su <strong>Dati Generali → 1.1 Dati Generali</strong>{" "}
                    per selezionare gli standard da auditare
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== SEZIONE 3: ESITO AUDIT ==================== */}
        <div className="accordion-section">
          <button
            className={`accordion-header ${
              openSections["outcome"] ? "open" : ""
            }`}
            onClick={() => toggleSection("outcome")}
          >
            <span className="section-icon">📊</span>
            <span className="section-title">Esito Audit</span>
            <span className="section-arrow">
              {openSections["outcome"] ? "▼" : "▶"}
            </span>
          </button>

          {openSections["outcome"] && (
            <div className="accordion-content">
              <AuditOutcomeSection
                auditOutcome={currentAudit.metadata.auditOutcome}
                onUpdate={handleAuditOutcomeUpdate}
              />
            </div>
          )}
        </div>

        {/* ==================== SEZIONE 4: EXPORT REPORT ==================== */}
        <div className="accordion-section">
          <button
            className={`accordion-header ${
              openSections["export"] ? "open" : ""
            }`}
            onClick={() => toggleSection("export")}
          >
            <span className="section-icon">📤</span>
            <span className="section-title">Export Report</span>
            <span className="section-arrow">
              {openSections["export"] ? "▼" : "▶"}
            </span>
          </button>

          {openSections["export"] && (
            <div className="accordion-content">
              <ExportPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuditAccordionLayout;
