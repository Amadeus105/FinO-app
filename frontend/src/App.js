import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const API = "http://127.0.0.1:8000";

const COLORS = {
  "Food & Drink": "#4f86c6",
  "Rent": "#e05c5c",
  "Utilities": "#f0a500",
  "Shopping": "#6bbf6b",
  "Entertainment": "#9b72cf",
  "Health & Fitness": "#e08060",
  "Travel": "#50b8c8",
  "Salary": "#aaaaaa",
};

function StatCard({ title, value, sub, color }) {
  return (
    <div style={{
      background: "#1e1e2e", borderRadius: 12, padding: "20px 24px",
      borderLeft: `4px solid ${color}`, flex: 1, minWidth: 180
    }}>
      <div style={{ color: "#888", fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ color: "#fff", fontSize: 26, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [forecast, setForecast] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ description: "", amount: "", date: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/forecast`).then(r => setForecast(r.data));
    axios.get(`${API}/categories`).then(r => setCategories(r.data.categories));
  }, []);

  const categorize = async () => {
    if (!form.description || !form.amount || !form.date) return;
    setLoading(true);
    try {
      const r = await axios.post(`${API}/categorize`, {
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
      });
      setResult(r.data);
    } catch (e) {
      setResult({ error: "API error" });
    }
    setLoading(false);
  };

  const categoryData = forecast
    ? Object.entries(forecast.by_category).map(([name, value]) => ({ name, value }))
    : [];

  const forecastData = forecast
    ? forecast.forecast_next_30_days.map(w => ({
      week: w.week.slice(5),
      predicted: w.predicted,
      lower: w.lower,
      upper: w.upper,
    }))
    : [];

  return (
    <div style={{
      minHeight: "100vh", background: "#13131f", color: "#fff",
      fontFamily: "Inter, sans-serif", padding: "32px 40px"
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
          FinTech AI Dashboard
        </div>
        <div style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
          Expense analytics & forecasting
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard
          title="Predicted next 30 days"
          value={forecast ? `$${forecast.total_predicted.toLocaleString()}` : "..."}
          sub="Based on historical patterns"
          color="#4f86c6"
        />
        <StatCard
          title="Biggest expense"
          value={categoryData.length
            ? `${categoryData.sort((a, b) => b.value - a.value)[0]?.name}`
            : "..."}
          sub={categoryData.length
            ? `$${categoryData.sort((a, b) => b.value - a.value)[0]?.value.toLocaleString()}`
            : ""}
          color="#e05c5c"
        />
        <StatCard
          title="Categories tracked"
          value={categories.length || "..."}
          sub="Active expense categories"
          color="#6bbf6b"
        />
        <StatCard
          title="Forecast accuracy"
          value="78.57%"
          sub="Gradient Boosting model"
          color="#9b72cf"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Weekly forecast chart */}
        <Section title="Weekly Spending Forecast">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="week" stroke="#555" tick={{ fontSize: 12 }} />
              <YAxis stroke="#555" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="predicted" stroke="#4f86c6" strokeWidth={2} dot={{ r: 5, fill: "#4f86c6" }} name="Predicted" />
              <Line type="monotone" dataKey="upper" stroke="#555" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Upper bound" />
              <Line type="monotone" dataKey="lower" stroke="#555" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Lower bound" />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        {/* Category breakdown */}
        <Section title="Forecast by Category (30 days)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis type="number" stroke="#555" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="#555" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                contentStyle={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 8 }}
                formatter={v => [`$${v.toLocaleString()}`, "Predicted"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || "#4f86c6"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Categorize transaction */}
      <Section title="Categorize a Transaction">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#888", fontSize: 12 }}>Description</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Grocery store"
              style={{
                background: "#13131f", border: "1px solid #333", borderRadius: 8,
                color: "#fff", padding: "10px 14px", fontSize: 14, width: 220
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#888", fontSize: 12 }}>Amount ($)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 55.00"
              style={{
                background: "#13131f", border: "1px solid #333", borderRadius: 8,
                color: "#fff", padding: "10px 14px", fontSize: 14, width: 130
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#888", fontSize: 12 }}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              style={{
                background: "#13131f", border: "1px solid #333", borderRadius: 8,
                color: "#fff", padding: "10px 14px", fontSize: 14
              }}
            />
          </div>
          <button
            onClick={categorize}
            disabled={loading}
            style={{
              background: "#4f86c6", color: "#fff", border: "none", borderRadius: 8,
              padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Analyzing..." : "Categorize"}
          </button>
        </div>

        {result && (
          <div style={{
            marginTop: 20, padding: "16px 20px", background: "#13131f",
            borderRadius: 10, borderLeft: `4px solid ${COLORS[result.predicted_category] || "#4f86c6"}`
          }}>
            {result.error ? (
              <span style={{ color: "#e05c5c" }}>{result.error}</span>
            ) : (
              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#888", fontSize: 12 }}>Category</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                    {result.predicted_category}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#888", fontSize: 12 }}>Amount</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                    ${result.amount}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#888", fontSize: 12 }}>Date</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                    {result.date}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}