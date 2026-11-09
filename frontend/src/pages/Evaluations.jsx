import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Play,
  RefreshCw,
  Gauge,
} from "lucide-react";
import { api } from "../api/client";

export default function Evaluations() {
  const [datasets, setDatasets] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningBenchmark, setRunningBenchmark] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dsData, runsData] = await Promise.all([
        api.listDatasets().catch(() => []),
        api.listEvalRuns().catch(() => []),
      ]);
      setDatasets(dsData || []);
      setRuns(runsData || []);
      if (runsData && runsData.length > 0 && !selectedRun) {
        setSelectedRun(runsData[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunBenchmark = async (datasetId) => {
    try {
      setRunningBenchmark(true);
      const res = await api.runBenchmark(datasetId);
      await fetchData();
      setSelectedRun(res);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleSeedBenchmark = async () => {
    try {
      setLoading(true);
      await api.seedStandardBenchmark();
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const latestRun = runs[0] || null;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", margin: "0 0 4px 0" }}>
            Model Evaluation & Benchmarking
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
            Benchmark classification accuracy, latency percentiles, and token expenditure across test suites.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handleSeedBenchmark} className="btn btn-secondary btn-sm">
            <Sparkles size={13} color="var(--accent-primary)" />
            <span>Seed Standard Benchmark</span>
          </button>
          <button onClick={fetchData} className="btn btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Highlights */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))", gap: "12px" }}>
        <div style={{ padding: "16px 20px", background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Benchmark Accuracy
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "var(--status-success-text)", fontFamily: "var(--font-mono)" }}>
            {latestRun ? `${(latestRun.accuracy_score * 100).toFixed(1)}%` : "-"}
          </div>
        </div>

        <div style={{ padding: "16px 20px", background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Avg Roundtrip Latency
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
            {latestRun ? `${latestRun.avg_latency_ms} ms` : "-"}
          </div>
        </div>

        <div style={{ padding: "16px 20px", background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Total Benchmark Cost
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "6px", color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
            {latestRun ? `$${(latestRun.total_cost_usd || 0).toFixed(4)}` : "$0.0000"}
          </div>
        </div>

        <div style={{ padding: "16px 20px", background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", boxShadow: "var(--card-shadow)" }}>
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
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--surface-card)",
            border: "1px dashed var(--border-light)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "var(--accent-primary-bg)",
              border: "1px solid var(--accent-primary-border)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              color: "var(--accent-primary)",
            }}
          >
            <Gauge size={20} />
          </div>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>No evaluation datasets configured</h3>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "460px", margin: "6px auto 16px" }}>
            Click &quot;Seed Standard Benchmark&quot; to initialize the official customer-support triage test suite with 5 labelled evaluation scenarios.
          </p>
          <button onClick={handleSeedBenchmark} className="btn btn-primary btn-sm">
            Seed Standard Benchmark
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: "20px" }}>
          {/* Datasets & History */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "16px", boxShadow: "var(--card-shadow)" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
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
                      background: "var(--surface-subtle)",
                      border: "1px solid var(--border-light)",
                      borderRadius: "5px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-main)" }}>{d.name}</div>
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

            <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "16px", boxShadow: "var(--card-shadow)" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
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
                          background: isSelected ? "var(--accent-primary-bg)" : "transparent",
                          border: isSelected ? "1px solid var(--accent-primary-border)" : "1px solid var(--border-light)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
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
                              color: (r.accuracy_score || 0) >= 0.8 ? "var(--status-success-text)" : "var(--status-danger-text)",
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
          <div style={{ background: "var(--surface-card)", border: "1px solid var(--border-light)", borderRadius: "6px", padding: "16px", boxShadow: "var(--card-shadow)" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
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
                      border: "1px solid var(--border-light)",
                      background: "var(--surface-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>Scenario #{i + 1}</span>
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

                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                      Input: &quot;{c.input?.ticket_text || JSON.stringify(c.input)}&quot;
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Latency: {c.latency_ms}ms • Tokens: {c.tokens || 0}
                    </div>

                    {c.failure_reasons && c.failure_reasons.length > 0 && (
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--status-danger-text)" }}>
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
