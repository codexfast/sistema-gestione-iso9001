/**
 * Custom Checklist Service
 * Phase 5 - Logica CRUD checklist personalizzate, sezioni, voci, risposte
 */

const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Lista checklist custom per organizzazione
 */
async function listChecklists(organizationId) {
  const result = await query(
    `SELECT id, name, description, is_active, default_report_template_id, custom_report_template_id, created_at, updated_at
     FROM custom_checklists
     WHERE organization_id = @organization_id
     ORDER BY name`,
    { organization_id: organizationId }
  );
  return result.recordset;
}

/**
 * Crea checklist custom
 */
async function createChecklist(organizationId, data) {
  const { name, description = null, is_active = true, default_report_template_id = null, custom_report_template_id = null } = data;
  const result = await query(
    `INSERT INTO custom_checklists (organization_id, name, description, is_active, default_report_template_id, custom_report_template_id, created_at, updated_at)
     OUTPUT INSERTED.id, INSERTED.name, INSERTED.description, INSERTED.is_active, INSERTED.created_at
     VALUES (@organization_id, @name, @description, @is_active, @default_report_template_id, @custom_report_template_id, GETDATE(), GETDATE())`,
    {
      organization_id: organizationId,
      name,
      description,
      is_active: is_active ? 1 : 0,
      default_report_template_id,
      custom_report_template_id,
    }
  );
  return result.recordset[0];
}

/**
 * Ottieni checklist per id (con verifica org)
 */
async function getChecklistById(id, organizationId) {
  const result = await query(
    `SELECT id, organization_id, name, description, is_active, default_report_template_id, custom_report_template_id, created_at, updated_at
     FROM custom_checklists
     WHERE id = @id AND organization_id = @organization_id`,
    { id: parseInt(id, 10), organization_id: organizationId }
  );
  return result.recordset[0] || null;
}

/**
 * Aggiorna checklist
 */
async function updateChecklist(id, organizationId, data) {
  const { name, description, is_active, default_report_template_id, custom_report_template_id } = data;
  const existing = await getChecklistById(id, organizationId);
  if (!existing) return null;

  await query(
    `UPDATE custom_checklists
     SET name = COALESCE(@name, name),
         description = COALESCE(@description, description),
         is_active = COALESCE(@is_active, is_active),
         default_report_template_id = COALESCE(@default_report_template_id, default_report_template_id),
         custom_report_template_id = COALESCE(@custom_report_template_id, custom_report_template_id),
         updated_at = GETDATE()
     WHERE id = @id`,
    {
      id: parseInt(id, 10),
      name: name ?? existing.name,
      description: description !== undefined ? description : existing.description,
      is_active: is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      default_report_template_id: default_report_template_id !== undefined ? default_report_template_id : existing.default_report_template_id,
      custom_report_template_id: custom_report_template_id !== undefined ? custom_report_template_id : existing.custom_report_template_id,
    }
  );
  return getChecklistById(id, organizationId);
}

/**
 * Elimina checklist (CASCADE su sections e items)
 */
async function deleteChecklist(id, organizationId) {
  const existing = await getChecklistById(id, organizationId);
  if (!existing) return false;

  await query(`DELETE FROM custom_checklists WHERE id = @id`, { id: parseInt(id, 10) });
  return true;
}

/**
 * Lista sezioni di una checklist
 */
async function listSections(customChecklistId, organizationId) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return null;

  const result = await query(
    `SELECT id, code, title, display_order
     FROM custom_checklist_sections
     WHERE custom_checklist_id = @custom_checklist_id
     ORDER BY display_order, code`,
    { custom_checklist_id: parseInt(customChecklistId, 10) }
  );
  return result.recordset;
}

/**
 * Crea sezione
 */
async function createSection(customChecklistId, organizationId, data) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return null;

  const { code, title, display_order = 0 } = data;
  const result = await query(
    `INSERT INTO custom_checklist_sections (custom_checklist_id, code, title, display_order)
     OUTPUT INSERTED.id, INSERTED.code, INSERTED.title, INSERTED.display_order
     VALUES (@custom_checklist_id, @code, @title, @display_order)`,
    {
      custom_checklist_id: parseInt(customChecklistId, 10),
      code,
      title,
      display_order: parseInt(display_order, 10) || 0,
    }
  );
  return result.recordset[0];
}

/**
 * Aggiorna ordine sezioni (bulk)
 */
async function updateSectionsOrder(customChecklistId, organizationId, sections) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return false;

  for (const { id, display_order } of sections) {
    await query(
      `UPDATE custom_checklist_sections SET display_order = @display_order WHERE id = @id AND custom_checklist_id = @custom_checklist_id`,
      { id: parseInt(id, 10), display_order: parseInt(display_order, 10) || 0, custom_checklist_id: parseInt(customChecklistId, 10) }
    );
  }
  return true;
}

/**
 * Elimina sezione
 */
async function deleteSection(sectionId, customChecklistId, organizationId) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return false;

  const result = await query(
    `DELETE FROM custom_checklist_sections WHERE id = @id AND custom_checklist_id = @custom_checklist_id`,
    { id: parseInt(sectionId, 10), custom_checklist_id: parseInt(customChecklistId, 10) }
  );
  return result.rowsAffected?.[0] > 0;
}

/**
 * Lista voci (items) di una checklist, opzionalmente per sezione
 */
async function listItems(customChecklistId, organizationId, sectionId = null) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return null;

  let sql = `SELECT cci.id, cci.section_id, cci.code, cci.title, cci.response_type, cci.display_order
             FROM custom_checklist_items cci
             INNER JOIN custom_checklist_sections ccs ON cci.section_id = ccs.id
             WHERE ccs.custom_checklist_id = @custom_checklist_id`;
  const params = { custom_checklist_id: parseInt(customChecklistId, 10) };

  if (sectionId) {
    sql += ` AND cci.section_id = @section_id`;
    params.section_id = parseInt(sectionId, 10);
  }

  sql += ` ORDER BY ccs.display_order, ccs.code, cci.display_order, cci.code`;

  const result = await query(sql, params);
  return result.recordset;
}

/**
 * Crea voce (item)
 */
async function createItem(customChecklistId, organizationId, data) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return null;

  const { section_id, code, title, response_type = 'verbale', display_order = 0 } = data;

  // Verifica che section_id appartenga alla checklist
  const sectionCheck = await query(
    `SELECT 1 FROM custom_checklist_sections WHERE id = @section_id AND custom_checklist_id = @custom_checklist_id`,
    { section_id: parseInt(section_id, 10), custom_checklist_id: parseInt(customChecklistId, 10) }
  );
  if (sectionCheck.recordset.length === 0) {
    throw new Error('Sezione non trovata o non appartiene a questa checklist');
  }

  const result = await query(
    `INSERT INTO custom_checklist_items (custom_checklist_id, section_id, code, title, response_type, display_order)
     OUTPUT INSERTED.id, INSERTED.section_id, INSERTED.code, INSERTED.title, INSERTED.response_type, INSERTED.display_order
     VALUES (@custom_checklist_id, @section_id, @code, @title, @response_type, @display_order)`,
    {
      custom_checklist_id: parseInt(customChecklistId, 10),
      section_id: parseInt(section_id, 10),
      code,
      title,
      response_type: response_type || 'verbale',
      display_order: parseInt(display_order, 10) || 0,
    }
  );
  return result.recordset[0];
}

/**
 * Elimina voce
 */
async function deleteItem(itemId, customChecklistId, organizationId) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return false;

  const result = await query(
    `DELETE cci FROM custom_checklist_items cci
     INNER JOIN custom_checklist_sections ccs ON cci.section_id = ccs.id
     WHERE cci.id = @id AND ccs.custom_checklist_id = @custom_checklist_id`,
    { id: parseInt(itemId, 10), custom_checklist_id: parseInt(customChecklistId, 10) }
  );
  return result.rowsAffected?.[0] > 0;
}

/**
 * Ottieni checklist completa (sezioni + voci) per audit
 */
async function getChecklistWithStructure(customChecklistId, organizationId) {
  const check = await getChecklistById(customChecklistId, organizationId);
  if (!check) return null;

  const sections = await listSections(customChecklistId, organizationId);
  const items = await listItems(customChecklistId, organizationId);

  const sectionsMap = {};
  for (const s of sections) {
    sectionsMap[s.id] = { ...s, items: [] };
  }
  for (const it of items) {
    if (sectionsMap[it.section_id]) {
      sectionsMap[it.section_id].items.push(it);
    }
  }

  return {
    ...check,
    sections: Object.values(sectionsMap),
  };
}

module.exports = {
  listChecklists,
  createChecklist,
  getChecklistById,
  updateChecklist,
  deleteChecklist,
  listSections,
  createSection,
  updateSectionsOrder,
  deleteSection,
  listItems,
  createItem,
  deleteItem,
  getChecklistWithStructure,
};
