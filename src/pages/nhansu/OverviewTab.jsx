import { useMemo, useState } from "react";
import { eachDateInRange, monthRange, todayIsoDate, weekRangeContaining } from "./utils.js";
import { loadAttendance } from "./storage.js";

function aggregateDates(dates) {
  const acc = {
    totalRows: 0,
    present: 0,
    absent: 0,
    leavePaid: 0,
    leaveUnpaid: 0,
    late: 0,
    short: 0,
  };
  for (const date of dates) {
    const att = loadAttendance(date);
    for (const dept of att.departments || []) {
      for (const row of dept.rows || []) {
        acc.totalRows += 1;
        switch (row.status) {
          case "present":
            acc.present += 1;
            break;
          case "absent":
            acc.absent += 1;
            break;
          case "leave_paid":
            acc.leavePaid += 1;
            break;
          case "leave_unpaid":
            acc.leaveUnpaid += 1;
            break;
          case "late":
            acc.late += 1;
            break;
          case "short":
            acc.short += 1;
            break;
          default:
            acc.present += 1;
        }
      }
    }
  }
  return acc;
}

function buildConclusion(a, daysCount) {
  if (a.totalRows === 0) {
    return "Chưa có dữ liệu điểm danh trong kỳ đã chọn. Hãy nhập tại tab Điểm danh ngày và bấm Lưu.";
  }
  const parts = [];
  const rate = (n) => ((n / a.totalRows) * 100).toFixed(1);
  parts.push(`Trong ${daysCount} ngày, có ${a.totalRows} lượt chấm.`);
  parts.push(`Tỷ lệ có mặt ${rate(a.present)}%, vắng ${rate(a.absent)}%.`);
  if (a.leaveUnpaid > 0) parts.push(`Có ${a.leaveUnpaid} lượt nghỉ không phép cần xử lý.`);
  if (a.late > 0) parts.push(`Đi trễ ${a.late} lượt.`);
  if (a.short > 0) parts.push(`Thiếu giờ ${a.short} lượt.`);
  if (a.leavePaid > 0) parts.push(`Nghỉ phép hợp lệ ${a.leavePaid} lượt.`);
  return parts.join(" ");
}

export default function OverviewTab() {
  const [mode, setMode] = useState("day"); // day | week | month
  const [anchorDate, setAnchorDate] = useState(todayIsoDate());
  const [anchorMonth, setAnchorMonth] = useState(todayIsoDate().slice(0, 7));

  const dates = useMemo(() => {
    if (mode === "day") return [anchorDate];
    if (mode === "week") {
      const { start, end } = weekRangeContaining(anchorDate);
      return eachDateInRange(start, end);
    }
    const { start, end } = monthRange(anchorMonth);
    return eachDateInRange(start, end);
  }, [mode, anchorDate, anchorMonth]);

  const stats = useMemo(() => aggregateDates(dates), [dates]);
  const conclusion = useMemo(() => buildConclusion(stats, dates.length), [stats, dates.length]);

  const kpi = [
    { label: "Tổng NS (lượt)", value: stats.totalRows },
    { label: "Có mặt", value: stats.present, tone: "ok" },
    { label: "Vắng", value: stats.absent, tone: "muted" },
    { label: "Nghỉ phép", value: stats.leavePaid, tone: "info" },
    { label: "Nghỉ không phép", value: stats.leaveUnpaid, tone: "danger" },
    { label: "Đi trễ", value: stats.late, tone: "warn" },
    { label: "Thiếu giờ", value: stats.short, tone: "warn" },
  ];

  return (
    <div className="ns-tab">
      <div className="ns-toolbar ns-toolbar--wrap">
        <div className="ns-segment" role="tablist" aria-label="Chế độ kỳ">
          {[
            { key: "day", label: "Ngày" },
            { key: "week", label: "Tuần" },
            { key: "month", label: "Tháng" },
          ].map((x) => (
            <button
              key={x.key}
              type="button"
              className={`ns-segment-btn ${mode === x.key ? "active" : ""}`}
              onClick={() => setMode(x.key)}
            >
              {x.label}
            </button>
          ))}
        </div>
        {mode === "month" ? (
          <input className="ns-input" type="month" value={anchorMonth} onChange={(e) => setAnchorMonth(e.target.value)} />
        ) : (
          <input className="ns-input" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
        )}
      </div>

      <div className="ns-kpi-grid">
        {kpi.map((c) => (
          <div key={c.label} className={`ns-kpi-card ${c.tone ? `ns-kpi-card--${c.tone}` : ""}`}>
            <div className="ns-kpi-label">{c.label}</div>
            <div className="ns-kpi-value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="ns-card ns-conclusion">
        <div className="ns-card-title">Kết luận tự động</div>
        <p className="ns-conclusion-text">{conclusion}</p>
      </div>
    </div>
  );
}
