import React, { useEffect, useState } from "react";
import { Gauge, Sparkles, CheckCircle2, XCircle, Play, RefreshCw, Layers } from "lucide-react";
import { api } from "../api/client";

export default function Evaluations() {
  const [datasets, setDatasets] = useState([]);
  const [runs, setRuns] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningBenchmark, setRunningBenchmark] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dsList, runsList, wfList] = await Promise.all([
        api.listEvaluationDatasets(),
        api.listEvaluationRuns(),
        api.listWorkflows(),
      ]);
      setDatasets(dsList || []);
      setRuns(runsList || []);
      setWorkflows(wfList || []);
      if (runsList && runsList.length > 0 && !selectedRun) {
        setSelectedRun(runsList[0]);
      }
    } catch {
      // Default to empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedBenchmark = async () => {
    try {
      await api.seedEvaluationBenchmark();
      await fetchData();
    } catch (err) {
      alert(`Failed to seed benchmark: ${err.message}`);
    }
  };

  const handleRunBenchmark = async (datasetId) => {
    if (workflows.length === 0) {
      alert("No workflows found. Create or publish a workflow first.");
      return;
    }
    try {
      setRunningBenchmark(true);
      const targetWf = workflows[0];
      const result = await api.triggerEvaluationRun({
        dataset_id: datasetId,
        workflow_id: targetWf.id,
      });
      setSelectedRun(result);
      await fetchData();
    } catch (err) {
      alert(`Benchmark execution failed: ${err.message}`);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const latestRun = runs[0];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>AI Quality Evaluations</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "2px" }}>
            Benchmark classification accuracy, latency SLAs, and token cost across versioned test suites.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleSeedBenchmark} className="btn btn-secondary btn-sm">
            <Sparkles size={14} color="var(--accent-ai)" />
            <span>Seed Standard Benchmark</span>
          </button>
          <button onClick={fetchData} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Highlights */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Benchmark Accuracy</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px", color: "#10b981" }}>
            {latestRun ? `${(latestRun.accuracy_score * 100).toFixed(1)}%` : "-"}
          </div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Avg Latency</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px" }}>
            {latestRun ? `${latestRun.avg_latency_ms} ms` : "-"}
          </div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Benchmark Cost</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px" }}>
            {latestRun ? `$${(latestRun.total_cost_usd || 0).toFixed(4)}` : "$0.00"}
          </div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Benchmark Datasets</div>
          <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "4px" }}>{datasets.length}</div>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--accent-ai-subtle)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              color: "var(--accent-ai)",
            }}
          >
            <Gauge size={24} />
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 600 }}>No evaluation datasets configured</h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", maxWidth: "460px", margin: "8px auto 16px" }}>
            Click &quot;Seed Standard Benchmark&quot; to initialize the official customer-support triage test suite with 5 labelled evaluation scenarios.
          </p>
          <button onClick={handleSeedBenchmark} className="btn btn-primary btn-sm">
            <Sparkles size={14} />
            <span>Seed Standard Benchmark</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "20px" }}>
          {/* Datasets & Past Runs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="card" style={{ padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Benchmark Datasets</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {datasets.map((d) => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "var(--surface-subtle)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{d.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{d.test_case_count} labelled test cases</div>
                    </div>
                    <button
                      onClick={() => handleRunBenchmark(d.id)}
                      disabled={runningBenchmark}
                      className="btn btn-primary btn-sm"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                    >
                      <Play size={12} />
                      <span>{runningBenchmark ? "Running..." : "Run"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>Evaluation History</h3>
              {runs.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No evaluations run yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {runs.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRun(r)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: selectedRun?.id === r.id ? "var(--surface-subtle)" : "transparent",
                        border: selectedRun?.id === r.id ? "1px solid var(--border-strong)" : "1px solid var(--border-light)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600 }}>Run: {r.id.slice(0, 8)}...</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(r.created_at).toLocaleTimeString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: (r.accuracy_score || 0) >= 0.8 ? "#10b981" : "#ef4444" }}>
                          {((r.accuracy_score || 0) * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{r.avg_latency_ms}ms</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Run Details Inspector */}
          <div className="card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>
              Test Case Results ({selectedRun?.results?.length || 0} Cases)
            </h3>

            {!selectedRun ? (
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Select a run to inspect per-case assertions.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "550px", overflowY: "auto" }}>
                {selectedRun.results?.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-light)",
                      background: c.passed ? "rgba(16, 185, 129, 0.03)" : "rgba(239, 68, 68, 0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600 }}>Case #{i + 1}</span>
                      {c.passed ? (
                        <span className="badge badge-published" style={{ background: "#ecfdf5", color: "#065f46" }}>
                          <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Passed
                        </span>
                      ) : (
                        <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                          <XCircle size={12} style={{ marginRight: 4 }} /> Failed
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Input: &quot;{c.input?.ticket_text || JSON.stringify(c.input)}&quot;
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Latency: {c.latency_ms}ms • Tokens: {c.tokens || 0}
                    </div>

                    {c.failure_reasons && c.failure_reasons.length > 0 && (
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#ef4444" }}>
                        {c.failure_reasons.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
