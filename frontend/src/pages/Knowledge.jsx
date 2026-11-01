import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  FileText,
  Tag,
  CheckCircle,
  AlertCircle,
  Database,
  ExternalLink,
  ChevronRight,
  Sparkles,
  UploadCloud,
  Languages,
  FileCheck,
  Trash2,
} from "lucide-react";
import { api } from "../api/client";
import { useModal } from "../context/ModalContext";

/**
 * Knowledge Collections & Semantic Retrieval Center.
 * Allows teams to inspect indexed company policy manuals, seed official rules,
 * test semantic query retrieval, and upload reference documents used by AI workflow nodes.
 */
export default function Knowledge() {
  const modal = useModal();
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // New Document Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await api.listKnowledgeCollections();
      setCollections(data);
      if (data.length > 0) {
        handleSelectCollection(data[0]);
      } else {
        setSelectedCollection(null);
        setDocuments([]);
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load knowledge collections." });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollection = async (coll) => {
    setSelectedCollection(coll);
    setDocsLoading(true);
    setSearchResults(null);
    try {
      const docs = await api.getCollectionDocuments(coll.id);
      setDocuments(docs);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setStatusMessage(null);
    try {
      await api.seedKnowledge();
      setStatusMessage({ type: "success", text: "Successfully seeded official customer support policies & SLA guidelines!" });
      await loadCollections();
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Failed to seed knowledge collection." });
    } finally {
      setSeeding(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedCollection) return;
    setSearching(true);
    try {
      const res = await api.searchKnowledge({
        collection_name: selectedCollection.name,
        query: searchQuery.trim(),
        top_k: 3,
      });
      setSearchResults(res);
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message || "Search query failed." });
    } finally {
      setSearching(false);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!selectedCollection || !newDocTitle.trim() || !newDocContent.trim()) return;
    setAddingDoc(true);
    try {
      await api.addDocument(selectedCollection.id, {
        title: newDocTitle.trim(),
        content: newDocContent.trim(),
        metadata: { source: "manual_upload", added_at: new Date().toISOString() },
      });
      setNewDocTitle("");
      setNewDocContent("");
      setShowAddModal(false);
      setStatusMessage({ type: "success", text: "Reference policy document indexed successfully." });
      await handleSelectCollection(selectedCollection);
    } catch (err) {
      await modal.alert({ title: "Failed to Add Document", message: err.message || "Document creation error.", variant: "danger" });
    } finally {
      setAddingDoc(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress("Analyzing & extracting document text via AI OCR...");
    setUploadedFileInfo(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedCollection) {
        formData.append("collection_id", selectedCollection.id);
      }
      formData.append("auto_translate", "true");

      const res = await api.uploadDocument(formData);
      setNewDocTitle(res.title || "");
      setNewDocContent(res.content || "");
      setUploadedFileInfo(`Extracted & translated from "${res.original_filename}" (${res.detected_type.toUpperCase()})`);
      setStatusMessage({
        type: "success",
        text: `Successfully transcribed and translated "${res.original_filename}" to English!`,
      });
    } catch (err) {
      await modal.alert({
        title: "Document Extraction Failed",
        message: err.message || "Could not extract text from document.",
        variant: "danger",
      });
    } finally {
      setUploadingFile(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async (docId, docTitle) => {
    if (!selectedCollection) return;
    const confirmed = await modal.confirm({
      title: "Delete Reference Document",
      message: `Are you sure you want to delete "${docTitle}" from this collection?`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await api.deleteDocument(selectedCollection.id, docId);
      setStatusMessage({ type: "success", text: `Deleted "${docTitle}".` });
      // Refresh documents
      const updatedDocs = await api.getCollectionDocuments(selectedCollection.id);
      setDocuments(updatedDocs);
      // Refresh collections to update document counts
      const data = await api.listKnowledgeCollections();
      setCollections(data);
    } catch (err) {
      await modal.alert({ title: "Failed to Delete", message: err.message || "Delete error.", variant: "danger" });
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-main)", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>
            Knowledge Collections
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            Upload and query reference documents, policy manuals, and SOPs used by AI retrieval nodes in workflows.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
          >
            <Sparkles size={13} className={seeding ? "spin" : ""} />
            <span>{seeding ? "Seeding..." : "Seed Official Policies"}</span>
          </button>

          {selectedCollection && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            >
              <Plus size={14} />
              <span>Add Document</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            marginBottom: "20px",
            background: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: statusMessage.type === "success" ? "#34d399" : "#f87171",
            border: statusMessage.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Collections Sidebar + Document Explorer */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px" }}>
        {/* Collections List */}
        <div className="card" style={{ padding: "16px", height: "fit-content" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Collections
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{collections.length} total</span>
          </div>

          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              Loading collections...
            </div>
          ) : collections.length === 0 ? (
            <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              <p style={{ margin: "0 0 12px 0" }}>No collections yet.</p>
              <button onClick={handleSeed} className="btn btn-secondary btn-sm" style={{ fontSize: "11px" }}>
                Seed Demo Policies
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {collections.map((coll) => {
                const isSelected = selectedCollection?.id === coll.id;
                return (
                  <div
                    key={coll.id}
                    onClick={() => handleSelectCollection(coll)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: isSelected ? "rgba(139, 92, 246, 0.15)" : "transparent",
                      border: isSelected ? "1px solid #8b5cf6" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? "#ffffff" : "var(--text-main)" }}>
                        {coll.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {coll.document_count || 0} indexed documents
                      </div>
                    </div>
                    <ChevronRight size={14} color={isSelected ? "#8b5cf6" : "#555"} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Collection Documents & Search */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {selectedCollection ? (
            <>
              {/* Semantic Query Search Bar */}
              <div className="card" style={{ padding: "16px" }}>
                <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#737373" }} />
                    <input
                      type="text"
                      placeholder={`Test retrieval in "${selectedCollection.name}" (e.g. "What is our refund deadline?")`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input"
                      style={{ paddingLeft: "32px", fontSize: "12px", width: "100%" }}
                    />
                  </div>
                  <button type="submit" disabled={searching} className="btn btn-secondary btn-sm" style={{ padding: "0 14px", fontSize: "12px" }}>
                    {searching ? "Searching..." : "Test Query"}
                  </button>
                  {searchResults && (
                    <button type="button" onClick={() => setSearchResults(null)} className="btn btn-ghost btn-sm" style={{ fontSize: "12px" }}>
                      Clear
                    </button>
                  )}
                </form>

                {/* Semantic Search Matches Output */}
                {searchResults && (() => {
                  const items = searchResults.sources || searchResults.matches || [];
                  const passages = searchResults.passages || [];

                  return (
                    <div style={{ marginTop: "14px", padding: "14px", background: "#111111", borderRadius: "6px", border: "1px solid #333" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "#8b5cf6" }}>
                          Semantic Match Results ({items.length} citation{items.length === 1 ? "" : "s"})
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          Query: "{searchResults.query}"
                        </span>
                      </div>

                      {items.length === 0 ? (
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                          No policy documents matched query score threshold. Try broader keywords like "refund", "billing", or "sla".
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {items.map((src, idx) => (
                            <div key={idx} style={{ padding: "10px 12px", background: "#161616", borderRadius: "4px", border: "1px solid #222" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#ffffff", marginBottom: "4px" }}>
                                <span>{src.title}</span>
                                <span style={{ color: "#34d399", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                                  Score: {src.score !== undefined ? src.score.toFixed(3) : "Matched"}
                                </span>
                              </div>
                              {passages[idx] && (
                                <div style={{ fontSize: "12px", color: "#a3a3a3", lineHeight: 1.4, whiteSpace: "pre-line" }}>
                                  "{passages[idx]}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Document Cards */}
              <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px 0", color: "#ffffff" }}>
                      {selectedCollection.name}
                    </h3>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {selectedCollection.description || "Reference policy collection"}
                    </div>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {documents.length} document{documents.length === 1 ? "" : "s"}
                  </span>
                </div>

                {docsLoading ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    Loading documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    <p style={{ margin: "0 0 12px 0" }}>No documents in this collection yet.</p>
                    <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
                      <Plus size={13} />
                      <span>Add First Document</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: "14px",
                          borderRadius: "6px",
                          background: "#161616",
                          border: "1px solid #262626",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <FileText size={15} color="#8b5cf6" />
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>{doc.title}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {doc.metadata?.policy_id && (
                              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: "#222", color: "#a3a3a3", fontFamily: "var(--font-mono)" }}>
                                {doc.metadata.policy_id}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id, doc.title)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#737373",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "color 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#737373")}
                              title={`Delete "${doc.title}"`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "#a3a3a3", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                          {doc.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              <Database size={32} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", margin: "0 0 6px 0" }}>
                Select or Seed a Collection
              </h3>
              <p style={{ fontSize: "13px", maxWidth: "400px", margin: "0 auto 16px auto" }}>
                Click "Seed Official Policies" to load reference support and refund documents for the flagship workflow.
              </p>
              <button onClick={handleSeed} disabled={seeding} className="btn btn-primary btn-sm">
                <Sparkles size={13} />
                <span>{seeding ? "Seeding..." : "Seed Official Policies"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div className="card" style={{ width: "520px", maxWidth: "100%", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px 0", color: "#ffffff" }}>
              Add Reference Document
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Add text for policies, terms, or guidelines to be indexed for semantic retrieval.
            </p>

            <form onSubmit={handleAddDocument} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* File Upload Dropzone */}
              <div
                onClick={() => !uploadingFile && fileInputRef.current?.click()}
                style={{
                  padding: "16px",
                  borderRadius: "6px",
                  background: uploadingFile ? "rgba(139, 92, 246, 0.08)" : "#161616",
                  border: "1px dashed #3b3b3b",
                  textAlign: "center",
                  cursor: uploadingFile ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  disabled={uploadingFile}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <UploadCloud size={24} color="#8b5cf6" />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff" }}>
                    {uploadingFile ? "Analyzing Document & Translating..." : "Click to Upload Document or Scanned File"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", maxWidth: "440px", lineHeight: 1.4 }}>
                    Supports PDFs, scanned images, and text in <strong>any language</strong>. AI OCR transcribes and translates directly to English.
                  </span>
                </div>
              </div>

              {uploadingFile && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#a78bfa", padding: "8px 12px", background: "rgba(139, 92, 246, 0.1)", borderRadius: "4px" }}>
                  <RefreshCw size={14} className="spin" />
                  <span>{uploadProgress || "Extracting text and translating to English..."}</span>
                </div>
              )}

              {uploadedFileInfo && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#34d399", padding: "6px 10px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "4px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <FileCheck size={14} />
                  <span>{uploadedFileInfo}</span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "2px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "#262626" }}></div>
                <span style={{ fontSize: "10px", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>Review & Edit Document</span>
                <div style={{ flex: 1, height: "1px", background: "#262626" }}></div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard 30-Day Refund Policy"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: "12px" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
                  Content / Policy Text
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste the full policy text, conditions, exceptions, or guidelines..."
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: "12px", resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={addingDoc} className="btn btn-primary btn-sm">
                  {addingDoc ? "Indexing..." : "Save & Index"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
