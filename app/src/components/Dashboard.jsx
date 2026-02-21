import React from "react";
import AuditSelector from "./AuditSelector";
import AuditAccordionLayout from "./AuditAccordionLayout";
import { useStorage } from "../contexts/StorageContext";
import "./Dashboard.css";

/**
 * Dashboard - UI semplificata (solo Accordion Layout)
 * Tab legacy e debug rimossi per evitare confusione
 */
const Dashboard = () => {
  const { currentAudit, updateCurrentAudit } = useStorage();

  const handleMetadataUpdate = (field, value) => {
    updateCurrentAudit((audit) => ({
      ...audit,
      metadata: {
        ...audit.metadata,
        [field]: value,
        lastModified: new Date().toISOString(),
      },
    }));
  };

  return (
    <div className="dashboard">
      <AuditSelector />
      <AuditAccordionLayout
        currentAudit={currentAudit}
        onUpdate={handleMetadataUpdate}
      />
    </div>
  );
};

export default Dashboard;
