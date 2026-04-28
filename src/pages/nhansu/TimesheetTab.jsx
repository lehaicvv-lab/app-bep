import { useEffect, useMemo, useState } from "react";
import { loadAttendance } from "./storage.js";
import { eachDateInRange, minutesBetween, monthRange, timeToMinutes, todayIsoDate, weekRangeContaining } from "./utils.js";

const STANDARD_MIN = 8 * 60;
const LATE_AFTER_MIN = 8 * 60 + 15;

function collectRowsInRange(dates) {
  const rows = [];
  for (const date of dates) {
    const att = loadAttendance(date);
    for (const dept of att.departments || []) {
      for (const r of dept.rows || []) {
        if (!String(r.fullName || "").trim()) continue;
        rows.push({
          date,
          deptName: dept.name,
          deptId: dept.id,
          ...r,
        });
      }
    }
  }
  return rows;
}

function aggregateByPerson(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.deptId}::${String(r.fullName).trim().toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        fullName: r.fullName,
        deptName: r.deptName,
        totalWorkMin: 0,
        workDays: 0,
        lateCount: 0,
        earlyCount: 0,
        shortDays: 0,
      });
    }
    const agg = map.get(key);
    const workMin = minutesBetween(r.checkIn, r.checkOut);
    if (workMin > 0) {
      agg.workDays += 1;
      agg.totalWorkMin += workMin;
    }
    const cin = timeToMinutes(r.checkIn);
    if (cin != null && cin > LATE_AFTER_MIN && ["present", "late", "short"].includes(r.status)) {
      agg.lateCount += 1;
    }
    const cout = timeToMinutes(r.checkOut);
    if (cout != null && cout < 17 * 60 && workMin > 0) agg.earlyCount += 1;
    if (workMin > 0 && workMin < STANDARD_MIN && ["present", "late", "short"].includes(r.status)) agg.shortDays += 1;
  }
  return [...map.values()];
}

function formatHm(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default function TimesheetTab({ workDate }) {
  const [mode, setMode] = useState("week");
  const [anchor, setAnchor] = useState(workDate || todayIsoDate());

  useEffect(() => {
    setAnchor(workDate || todayIsoDate());
  }, [workDate]);

  const dates = useMemo(() => {
    if (mode === "week") {
      const { start, end } = weekRangeContaining(anchor);
      return eachDateInRange(start, end);
    }
    const ym = anchor.slice(0, 7);
    const { start, end } = monthRange(ym);
    return eachDateInRange(start, end);
  }, [mode, anchor]);

  const rows = useMemo(() => aggregateByPerson(collectRowsInRange(dates)), [dates]);

  return (
    <div className="ns-tab">
      <div className="ns-toolbar ns-toolbar--wrap">
        <div className="ns-segment">
          <button type="button" className={`ns-segment-btn ${mode === "week" ? "active" : ""}`} onClick={() => setMode("week")}>
            Theo tuần
          </button>
          <button type="button" className={`ns-segment-btn ${mode === "month" ? "active" : ""}`} onClick={() => setMode("month")}>
            Theo tháng
          </button>
        </div>
        {mode === "week" ? (
          <input className="ns-input" type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
        ) : (
          <input className="ns-input" type="month" value={anchor.slice(0, 7)} onChange={(e) => setAnchor(`${e.target.value}-01`)} />
        )}
      </div>

      <p className="ns-muted">
        Dữ liệu từ <strong>Điểm danh ngày</strong>. Công chuẩn 8h/ngày có chấm giờ vào/ra. Cảnh báo: đi trễ sau 08:15, về trước 17:00, thiếu đủ 8h.
      </p>

      <div className="table-scroll">
        <table className="ns-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Bộ phận</th>
              <th>Ngày có công</th>
              <th>Tổng giờ làm</th>
              <th>Công chuẩn</th>
              <th>Tăng ca</th>
              <th>Thiếu giờ</th>
              <th>Cảnh báo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const standard = STANDARD_MIN * Math.max(1, p.workDays);
              const overtime = Math.max(0, p.totalWorkMin - standard);
              const missing = Math.max(0, standard - p.totalWorkMin);
              const warnings = [];
              if (p.lateCount) warnings.push(`Trễ sau 08:15: ${p.lateCount} buổi`);
              if (p.earlyCount) warnings.push(`Về sớm: ${p.earlyCount} buổi`);
              if (p.shortDays) warnings.push(`Thiếu giờ: ${p.shortDays} buổi`);
              return (
                <tr key={p.key}>
                  <td>{p.fullName}</td>
                  <td>{p.deptName}</td>
                  <td>{p.workDays}</td>
                  <td>{formatHm(p.totalWorkMin)}</td>
                  <td>{formatHm(standard)}</td>
                  <td className="ns-ok">{overtime > 0 ? formatHm(overtime) : "—"}</td>
                  <td className={missing > 0 ? "ns-danger" : ""}>{missing > 0 ? formatHm(missing) : "—"}</td>
                  <td>{warnings.length ? warnings.join(" · ") : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="ns-empty">
                  Chưa có dữ liệu điểm danh trong kỳ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
