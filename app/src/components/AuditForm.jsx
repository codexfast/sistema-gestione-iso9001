import React, { useState, useEffect } from "react";
import { useData } from "../contexts/DataContext";
import { fetchStandards } from "../services/standardsService";
import "./AuditForm.css";

const AuditForm = () => {
  const { addAudit } = useData();
  const [showForm, setShowForm] = useState(false);
  const [standards, setStandards] = useState([]);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [formData, setFormData] = useState({
    dataAudit: "",
    tipo: "interno",
    area: "",
    selectedStandards: [], // Array di standard_id selezionati
    auditor: "",
    criteri: "",
    osservazioni: "",
    conformita: [],
    nonConformita: [],
    conclusioni: "",
  });

  // Carica standard ISO all'apertura del form
  useEffect(() => {
    if (showForm && standards.length === 0) {
      loadStandards();
    }
  }, [showForm]);

  const loadStandards = async () => {
    setLoadingStandards(true);
    try {
      const data = await fetchStandards();
      setStandards(data);
    } catch (error) {
      console.error("Errore caricamento standard:", error);
      // Fallback a standard predefiniti se API non disponibile
      setStandards([
        {
          standard_id: 1,
          standard_code: "ISO_9001_2015",
          standard_name: "ISO 9001:2015",
          category: "quality",
        },
        {
          standard_id: 2,
          standard_code: "ISO_14001_2015",
          standard_name: "ISO 14001:2015",
          category: "environment",
        },
        {
          standard_id: 3,
          standard_code: "ISO_45001_2018",
          standard_name: "ISO 45001:2018",
          category: "safety",
        },
      ]);
    } finally {
      setLoadingStandards(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Gestisce selezione/deselezione standard (multi-select con checkbox)
  const handleStandardToggle = (standardId) => {
    setFormData((prev) => {
      const current = prev.selectedStandards || [];
      if (current.includes(standardId)) {
        return {
          ...prev,
          selectedStandards: current.filter((id) => id !== standardId),
        };
      } else {
        return { ...prev, selectedStandards: [...current, standardId] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.dataAudit || !formData.area) {
      alert("Compilare almeno Data Audit e Area/Processo");
      return;
    }

    // Validazione: almeno uno standard selezionato
    if (
      !formData.selectedStandards ||
      formData.selectedStandards.length === 0
    ) {
      alert("Selezionare almeno uno standard ISO di riferimento");
      return;
    }

    const result = addAudit(formData);

    if (result) {
      alert(`✓ Audit ${result.id} creato con successo`);
      setFormData({
        dataAudit: "",
        tipo: "interno",
        area: "",
        selectedStandards: [],
        auditor: "",
        criteri: "",
        osservazioni: "",
        conformita: [],
        nonConformita: [],
        conclusioni: "",
      });
      setShowForm(false);
    }
  };

  return (
    <div className="form-container">
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-primary">
          ➕ Nuovo Audit Interno
        </button>
      ) : (
        <div className="card form-card">
          <div className="form-header">
            <h3>Nuovo Audit Interno (Punto 9.2)</h3>
            <button onClick={() => setShowForm(false)} className="btn-close">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Data Audit *</label>
                <input
                  type="date"
                  name="dataAudit"
                  value={formData.dataAudit}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo Audit</label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                >
                  <option value="interno">Interno</option>
                  <option value="esterno">Esterno</option>
                  <option value="sistema">Sistema</option>
                  <option value="processo">Processo</option>
                  <option value="prodotto">Prodotto</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Area/Processo Auditato *</label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="es. Gestione Commerciale, Produzione, Acquisti..."
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Standard ISO di Riferimento *</label>
                {loadingStandards ? (
                  <div className="loading-indicator">
                    Caricamento standard...
                  </div>
                ) : (
                  <div className="standards-multiselect">
                    {standards.map((std) => (
                      <label
                        key={std.standard_id}
                        className="standard-checkbox"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedStandards.includes(
                            std.standard_id
                          )}
                          onChange={() => handleStandardToggle(std.standard_id)}
                        />
                        <span
                          className={`standard-badge category-${std.category}`}
                        >
                          {std.standard_name}
                        </span>
                      </label>
                    ))}
                    {standards.length === 0 && (
                      <span className="no-standards">
                        Nessuno standard disponibile
                      </span>
                    )}
                  </div>
                )}
                {formData.selectedStandards.length === 0 && (
                  <small className="form-hint">
                    Seleziona almeno uno standard
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Auditor</label>
                <input
                  type="text"
                  name="auditor"
                  value={formData.auditor}
                  onChange={handleChange}
                  placeholder="Nome auditor"
                />
              </div>

              <div className="form-group full-width">
                <label>Criteri Audit</label>
                <textarea
                  name="criteri"
                  value={formData.criteri}
                  onChange={handleChange}
                  placeholder="Criteri di audit (requisiti ISO, procedure interne, normative applicabili...)"
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label>Osservazioni</label>
                <textarea
                  name="osservazioni"
                  value={formData.osservazioni}
                  onChange={handleChange}
                  placeholder="Osservazioni generali sull'audit"
                  rows="3"
                />
              </div>

              <div className="form-group full-width">
                <label>Conclusioni</label>
                <textarea
                  name="conclusioni"
                  value={formData.conclusioni}
                  onChange={handleChange}
                  placeholder="Conclusioni dell'audit"
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Annulla
              </button>
              <button type="submit" className="btn-primary">
                💾 Salva Audit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AuditForm;
