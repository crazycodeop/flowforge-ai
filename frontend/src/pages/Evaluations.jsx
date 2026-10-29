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
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
            AI Evaluations & Benchmarks
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Benchmark classification accuracy, latency percentiles, and token expenditure across test suites.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handleSeedBenchmark} className="btn btn-secondary btn-sm">
            <Sparkles size={13} color="#8b5cf6" />
            <span>Seed Standard Benchmark</span>
          </button>
          <button onClick={fetchData} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Highlights (Render-style flat cards) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: "12px" }}>
        <div style={{ padding: "16px 20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Benchmark Accuracy
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "#10b981", fontFamily: "var(--font-mono)" }}>
            {latestRun ? `${(latestRun.accuracy_score * 100).toFixed(1)}%` : "-"}
          </div>
        </div>

        <div style={{ padding: "16px 20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Avg Roundtrip Latency
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
            {latestRun ? `${latestRun.avg_latency_ms} ms` : "-"}
          </div>
        </div>

        <div style={{ padding: "16px 20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Total Benchmark Cost
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
            {latestRun ? `$${(latestRun.total_cost_usd || 0).toFixed(4)}` : "$0.0000"}
          </div>
        </div>

        <div style={{ padding: "16px 20px", background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Configured Suites
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
            {datasets.length}
          </div>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div
          style={{
            background: "#141414",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#1c1c1c",
              border: "1px solid #262626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              color: "#8b5cf6",
            }}
          >
            <Gauge size={20} />
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5" }}>No evaluation datasets configured</h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "460px", margin: "6px auto 16px" }}>
            Click &quot;Seed Standard Benchmark&quot; to initialize the official customer-support triage test suite with 5 labelled evaluation scenarios.
          </p>
          <button onClick={handleSeedBenchmark} className="btn btn-primary btn-sm">
            <Sparkles size={13} />
            <span>Seed Standard Benchmark</span>
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: "20px" }}>
          {/* Datasets & History */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#f5f5f5", marginBottom: "12px" }}>
                Benchmark Datasets
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {datasets.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "#181818",
                      border: "1px solid #262626",
                      borderRadius: "5px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "#f5f5f5" }}>{d.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{d.test_case_count} labelled test cases</div>
                    </div>
                    <button
                      onClick={() => handleRunBenchmark(d.id)}
                      disabled={runningBenchmark}
                      className="btn btn-primary btn-sm"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                    >
                      <Play size={11} />
                      <span>{runningBenchmark ? "Running..." : "Run"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#f5f5f5", marginBottom: "12px" }}>
                Evaluation History
              </h3>
              {runs.length === 0 ? (
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>No evaluations run yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {runs.map((r) => {
                    const isSelected = selectedRun?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRun(r)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "5px",
                          cursor: "pointer",
                          background: isSelected ? "#1e1e1e" : "transparent",
                          border: isSelected ? "1px solid #383838" : "1px solid #222222",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f5", fontFamily: "var(--font-mono)" }}>
                            Run: {r.id.slice(0, 8)}...
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {new Date(r.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              color: (r.accuracy_score || 0) >= 0.8 ? "#10b981" : "#ef4444",
                            }}
                          >
                            {((r.accuracy_score || 0) * 100).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {r.avg_latency_ms}ms
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Selected Run Details Inspector */}
          <div style={{ background: "#141414", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#f5f5f5", marginBottom: "12px" }}>
              Test Case Assertions ({selectedRun?.results?.length || 0} Scenarios)
            </h3>

            {!selectedRun ? (
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Select an evaluation run to inspect per-case assertions.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "550px", overflowY: "auto" }}>
                {selectedRun.results?.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "5px",
                      border: "1px solid #262626",
                      background: "#181818",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#f5f5f5" }}>Scenario #{i + 1}</span>
                      {c.passed ? (
                        <span className="badge badge-published" style={{ fontSize: "10px" }}>
                          ✓ Passed
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontSize: "10px" }}>
                          ✕ Failed
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "12px", color: "#a3a3a3", marginBottom: "4px" }}>
                      Input: &quot;{c.input?.ticket_text || JSON.stringify(c.input)}&quot;
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Latency: {c.latency_ms}ms • Tokens: {c.tokens || 0}
                    </div>

                    {c.failure_reasons && c.failure_reasons.length > 0 && (
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#f87171" }}>
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
