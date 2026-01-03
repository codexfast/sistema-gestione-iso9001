/**
 * Test Android Fallback - Export Word
 *
 * Verifica che export Word funzioni su Android quando File System Access API
 * non è disponibile (fallback blob download)
 *
 * Standard: ISO 9001:2015 punto 6.1 (risk mitigation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exportAuditToFileSystem,
  exportAuditToWorkspace,
} from "../utils/wordExport";
import * as fileSaver from "file-saver";

// Mock file-saver
vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

// Mock audit data
const mockAudit = {
  metadata: {
    auditNumber: "AUDIT-001",
    clientName: "Test Cliente",
    projectYear: 2025,
    generalData: {
      organization: "Test Org",
      address: "Via Test 123",
    },
    auditObjective: {
      purpose: "Verifica conformità",
      scope: "Tutti i processi",
    },
    auditOutcome: {
      overallOutcome: "compliant",
      findings: [],
    },
  },
  checklist: [
    {
      section: "4.1",
      sectionTitle: "Contesto organizzazione",
      questions: [
        {
          clause_ref: "4.1",
          question_text: "Test question",
          status: "compliant",
          response_notes: "Test note",
        },
      ],
    },
  ],
  attachments: [],
};

describe("Android Export Word Fallback", () => {
  let originalShowDirectoryPicker;

  beforeEach(() => {
    // Salva originale
    originalShowDirectoryPicker = window.showDirectoryPicker;

    // Reset mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Ripristina originale
    if (originalShowDirectoryPicker) {
      window.showDirectoryPicker = originalShowDirectoryPicker;
    } else {
      delete window.showDirectoryPicker;
    }
  });

  describe("exportAuditToFileSystem()", () => {
    it("dovrebbe usare blob download quando File System API non disponibile (Android)", async () => {
      // Simula Android: rimuovi File System API
      delete window.showDirectoryPicker;

      const result = await exportAuditToFileSystem(mockAudit);

      // Verifica fallback attivato
      expect(result.fallback).toBe(true);
      expect(result.fileName).toContain("Audit_AUDIT_001_Test_Cliente"); // Note: - replaced with _
      expect(result.path).toContain("Download/");

      // Verifica che saveAs sia stato chiamato (blob download)
      expect(fileSaver.saveAs).toHaveBeenCalledOnce();
    });

    it("dovrebbe usare File System API quando disponibile (Desktop)", async () => {
      // Simula Desktop: mock File System API
      const mockDirectoryHandle = {
        getDirectoryHandle: vi.fn().mockImplementation((name, opts) => ({
          getDirectoryHandle: vi.fn().mockResolvedValue({
            getFileHandle: vi.fn().mockResolvedValue({
              createWritable: vi.fn().mockResolvedValue({
                write: vi.fn(),
                close: vi.fn(),
              }),
            }),
          }),
        })),
      };

      window.showDirectoryPicker = vi
        .fn()
        .mockResolvedValue(mockDirectoryHandle);

      const result = await exportAuditToFileSystem(mockAudit);

      // Verifica NO fallback
      expect(result.fallback).toBeUndefined();
      expect(result.fileName).toContain("Audit_AUDIT_001_Test_Cliente"); // Note: - replaced with _
      expect(result.path).toContain("Audit/");

      // Verifica che File System API sia stato usato
      expect(window.showDirectoryPicker).toHaveBeenCalledOnce();
      expect(fileSaver.saveAs).not.toHaveBeenCalled();
    });
  });

  describe("exportAuditToWorkspace()", () => {
    it("dovrebbe usare blob download quando File System API non disponibile", async () => {
      // Simula Android
      delete window.showDirectoryPicker;

      const mockFsProvider = {
        ready: vi.fn().mockReturnValue(true),
      };

      const result = await exportAuditToWorkspace(mockAudit, mockFsProvider);

      // Verifica fallback
      expect(result.fallback).toBe(true);
      expect(result.path).toContain("Download/");
      expect(fileSaver.saveAs).toHaveBeenCalledOnce();
    });

    it("dovrebbe usare blob download quando workspace non configurato", async () => {
      // Simula Desktop MA workspace non ready
      window.showDirectoryPicker = vi.fn();

      const mockFsProvider = {
        ready: vi.fn().mockReturnValue(false),
      };

      const result = await exportAuditToWorkspace(mockAudit, mockFsProvider);

      // Verifica fallback (anche su desktop se workspace non ready)
      expect(result.fallback).toBe(true);
      expect(fileSaver.saveAs).toHaveBeenCalledOnce();
    });

    it("dovrebbe validare audit prima di export", async () => {
      delete window.showDirectoryPicker;

      // Audit invalido (no metadata)
      await expect(exportAuditToFileSystem({})).rejects.toThrow(
        "metadata mancante"
      );
      await expect(
        exportAuditToWorkspace({ metadata: null }, {})
      ).rejects.toThrow("metadata mancante");
    });
  });

  describe("Console Warnings", () => {
    it("dovrebbe loggare warning quando usa fallback Android", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      delete window.showDirectoryPicker;

      await exportAuditToFileSystem(mockAudit);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ANDROID]")
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("fallback blob download")
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
