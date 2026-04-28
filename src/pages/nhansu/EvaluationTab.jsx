import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { DEFAULT_DEPARTMENTS } from "./constants.js";
import { loadAttendance, loadEvalMgmt, loadEvalStaff, saveEvalMgmt, saveEvalStaff } from "./storage.js";
import { eachDateInRange, monthRange, uid } from "./utils.js";

const WORK_FIELDS = ["soChe", "chiaSuat", "fiveS", "thaiDo"];
const STAFF_NAV_FIELDS = ["soChe", "chiaSuat", "fiveS", "thaiDo", "reportCount"];

const emptyStaffEvalRow = () => ({
  id: uid(),
  fullName: "",
  deptId: DEFAULT_DEPARTMENTS[0]?.id || "",
  soChe: 4,
  chiaSuat: 4,
  fiveS: 4,
  thaiDo: 4,
  reportLevel: "none",
  reportCount: 0,
  note: "",
});

const emptyMgmtRow = () => ({
  id: uid(),
  fullName: "",
  deptId: DEFAULT_DEPARTMENTS[0]?.id || "",
  jobTitle: "",
  attendance: 4,
  workMgmt: 4,
  qualityControl: 4,
  incidentHandling: 4,
  peopleMgmt: 4,
  reporting: 4,
  attitude: 4,
  hasVsattpViolation: false,
  hasSeriousIncident: false,
  hasCustomerComplaint: false,
  note: "",
});

function personKey(deptId, fullName) {
  return `${deptId}::${String(fullName || "").trim().toLowerCase()}`;
}

function clamp05(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, n));
}

function reportScore(level) {
  if (level === "light") return 4;
  if (level === "medium") return 3;
  if (level === "heavy") return 2;
  return 5;
}

function computeStaffResult(row, attendance) {
  const workAvg = WORK_FIELDS.reduce((sum, f) => sum + clamp05(row[f]), 0) / WORK_FIELDS.length;
  const discipline = reportScore(row.reportLevel);
  const forceWeak = Number(row.unpaidLeaveCount) > 0 || row.reportLevel === "heavy" || Number(row.reportCount) >= 2;
  const total = attendance * 0.25 + workAvg * 0.5 + discipline * 0.25;
  let band = { key: "weak", label: "Yếu" };
  if (!forceWeak) {
    if (total >= 4.5) band = { key: "good", label: "Xuất sắc" };
    else if (total >= 4) band = { key: "good", label: "Tốt" };
    else if (total >= 3) band = { key: "watch", label: "Theo dõi" };
  }
  return { attendance, workAvg, discipline, total, band, forceWeak };
}

function actionByBand(bandKey) {
  if (bandKey === "weak") return "Cắt";
  if (bandKey === "watch") return "Đào tạo";
  return "Giữ";
}

function subDaysIso(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoWeekInfo(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getFullYear(), week: weekNo };
}

function staffRefByPeriod(period, anchorDate) {
  if (period === "month") return `month-${anchorDate.slice(0, 7)}`;
  const info = isoWeekInfo(anchorDate);
  return `week-${info.year}-${String(info.week).padStart(2, "0")}`;
}

function staffPeriodLabel(period, anchorDate) {
  if (period === "month") {
    const [y, m] = anchorDate.slice(0, 7).split("-");
    return `Tháng ${m}/${y}`;
  }
  const info = isoWeekInfo(anchorDate);
  return `Tuần ${info.week} (${info.year})`;
}

function datesInStaffPeriod(period, anchorDate) {
  if (period === "month") {
    const { start, end } = monthRange(anchorDate.slice(0, 7));
    return eachDateInRange(start, end);
  }
  const start = subDaysIso(anchorDate, 6);
  return eachDateInRange(start, anchorDate);
}

function attendanceScoreFromAgg(agg) {
  const total = agg.presentDays + agg.leaveDays;
  if (!total) return 0;
  const ratio = (agg.presentDays / total) * 5;
  const score = ratio - agg.lateCount * 0.2;
  return Math.max(0, Math.min(5, score));
}

function bandClass(row) {
  if (row.band.key === "weak") return "ns-eval-row--weak";
  if (row.band.key === "watch") return "ns-eval-row--watch";
  return row.total >= 4 ? "ns-eval-row--good" : "";
}

function computeMgmtResult(row) {
  const autoFail = Boolean(row.hasVsattpViolation || row.hasSeriousIncident || row.hasCustomerComplaint);
  const total =
    clamp05(row.attendance) * 0.15 +
    clamp05(row.workMgmt) * 0.2 +
    clamp05(row.qualityControl) * 0.2 +
    clamp05(row.incidentHandling) * 0.15 +
    clamp05(row.peopleMgmt) * 0.1 +
    clamp05(row.reporting) * 0.1 +
    clamp05(row.attitude) * 0.1;
  let band = { key: "weak", label: "Không đạt" };
  if (!autoFail) {
    if (total >= 4.5) band = { key: "good", label: "Xuất sắc" };
    else if (total >= 4) band = { key: "good", label: "Tốt" };
    else if (total >= 3) band = { key: "watch", label: "Theo dõi" };
  }
  return { total, band, autoFail };
}

const EvaluationTab = forwardRef(function EvaluationTab({ workDate }, ref) {
  const [sub, setSub] = useState("staff");
  const [staffPeriod, setStaffPeriod] = useState("week");
  const [mgmtMonth, setMgmtMonth] = useState(workDate.slice(0, 7));
  const [staffData, setStaffData] = useState(() => loadEvalStaff("week", staffRefByPeriod("week", workDate)));
  const [mgmtData, setMgmtData] = useState(() => loadEvalMgmt(mgmtMonth));
  const staffInputRefs = useRef({});

  const staffRef = useMemo(() => staffRefByPeriod(staffPeriod, workDate), [staffPeriod, workDate]);
  const staffPeriodText = useMemo(() => staffPeriodLabel(staffPeriod, workDate), [staffPeriod, workDate]);
  const periodDates = useMemo(() => datesInStaffPeriod(staffPeriod, workDate), [staffPeriod, workDate]);

  useEffect(() => {
    setStaffData(loadEvalStaff(staffPeriod, staffRef));
  }, [staffPeriod, staffRef]);

  useEffect(() => {
    setMgmtData(loadEvalMgmt(mgmtMonth));
  }, [mgmtMonth]);

  const attendanceMap = useMemo(() => {
    const map = new Map();
    for (const date of periodDates) {
      const attendanceData = loadAttendance(date);
      for (const dept of attendanceData.departments || []) {
        for (const row of dept.rows || []) {
          const fullName = String(row.fullName || "").trim();
          if (!fullName) continue;
          const key = personKey(dept.id, fullName);
          const cur = map.get(key) || {
            fullName,
            deptId: dept.id,
            deptName: dept.name,
            presentDays: 0,
            leaveDays: 0,
            lateCount: 0,
            unpaidLeaveCount: 0,
          };
          if (["present", "late", "short"].includes(row.status)) cur.presentDays += 1;
          if (["absent", "leave_paid", "leave_unpaid"].includes(row.status)) cur.leaveDays += 1;
          if (row.status === "late" || row.status === "short") cur.lateCount += 1;
          if (row.status === "leave_unpaid") cur.unpaidLeaveCount += 1;
          map.set(key, cur);
        }
      }
    }
    return map;
  }, [periodDates]);

  useEffect(() => {
    setStaffData((prev) => {
      const savedMap = new Map((prev.items || []).map((x) => [personKey(x.deptId, x.fullName), x]));
      const merged = [];
      for (const [key, att] of attendanceMap.entries()) {
        const s = savedMap.get(key);
        merged.push(s ? { ...s, fullName: att.fullName, deptId: att.deptId } : { ...emptyStaffEvalRow(), fullName: att.fullName, deptId: att.deptId });
      }
      return { ...prev, items: merged };
    });
  }, [attendanceMap]);

  const staffRows = staffData.items || [];

  const staffRowsWithScore = useMemo(
    () =>
      staffRows.map((r) => {
        const key = personKey(r.deptId, r.fullName);
        const agg = attendanceMap.get(key) || { presentDays: 0, leaveDays: 0, lateCount: 0, unpaidLeaveCount: 0 };
        const attendanceScore = attendanceScoreFromAgg(agg);
        const calc = computeStaffResult({ ...r, unpaidLeaveCount: agg.unpaidLeaveCount }, attendanceScore);
        return {
          ...r,
          presentDays: agg.presentDays,
          leaveDays: agg.leaveDays,
          lateCount: agg.lateCount,
          ...calc,
          action: actionByBand(calc.band.key),
        };
      }),
    [staffRows, attendanceMap]
  );

  const weakStaff = useMemo(() => staffRowsWithScore.filter((r) => r.band.key === "weak"), [staffRowsWithScore]);
  const watchStaff = useMemo(() => staffRowsWithScore.filter((r) => r.band.key === "watch"), [staffRowsWithScore]);
  const goodStaff = useMemo(() => staffRowsWithScore.filter((r) => r.band.key === "good"), [staffRowsWithScore]);

  const byDeptAvg = useMemo(() => {
    const map = new Map();
    for (const r of staffRowsWithScore) {
      const deptName = DEFAULT_DEPARTMENTS.find((d) => d.id === r.deptId)?.name || r.deptId;
      const cur = map.get(deptName) || { sum: 0, count: 0 };
      cur.sum += r.total;
      cur.count += 1;
      map.set(deptName, cur);
    }
    return [...map.entries()].map(([deptName, x]) => ({ deptName, avg: x.count ? x.sum / x.count : 0, count: x.count })).sort((a, b) => b.avg - a.avg);
  }, [staffRowsWithScore]);

  const mgmtRowsWithScore = useMemo(
    () =>
      mgmtData.items.map((r) => {
        const res = computeMgmtResult(r);
        return { ...r, score: res.total, band: res.band, autoFail: res.autoFail };
      }),
    [mgmtData.items]
  );

  const weakMgmt = useMemo(() => mgmtRowsWithScore.filter((r) => r.band.key === "weak"), [mgmtRowsWithScore]);
  const mgmtSummary = useMemo(() => {
    const totalPeople = mgmtRowsWithScore.length;
    const excellent = mgmtRowsWithScore.filter((r) => r.band.label === "Xuất sắc").length;
    const good = mgmtRowsWithScore.filter((r) => r.band.label === "Tốt").length;
    const watch = mgmtRowsWithScore.filter((r) => r.band.label === "Theo dõi").length;
    const fail = mgmtRowsWithScore.filter((r) => r.band.label === "Không đạt").length;
    const avgScore = totalPeople ? mgmtRowsWithScore.reduce((s, r) => s + r.score, 0) / totalPeople : 0;
    return { totalPeople, excellent, good, watch, fail, avgScore };
  }, [mgmtRowsWithScore]);

  const patchStaff = (id, patch) => {
    setStaffData((p) => {
      const next = (p.items || []).map((x) => (x.id === id ? { ...x, ...patch } : x));
      return { ...p, items: next };
    });
  };

  const updateWorkScore = (id, field, value) => {
    patchStaff(id, { [field]: value });
  };

  const registerStaffInputRef = (rowId, field) => (el) => {
    staffInputRefs.current[`${rowId}:${field}`] = el;
  };

  const focusStaffInput = (rowId, field) => {
    const el = staffInputRefs.current[`${rowId}:${field}`];
    if (!el) return;
    el.focus();
    if (typeof el.select === "function") el.select();
  };

  const onStaffScoreKeyDown = (e, rowId, field) => {
    const rowIndex = staffRowsWithScore.findIndex((x) => x.id === rowId);
    const colIndex = STAFF_NAV_FIELDS.indexOf(field);
    if (rowIndex < 0 || colIndex < 0) return;
    let nextRow = rowIndex;
    let nextCol = colIndex;
    if (e.key === "Enter" || e.key === "ArrowDown") nextRow = rowIndex + 1;
    else if (e.key === "ArrowUp") nextRow = rowIndex - 1;
    else if (e.key === "ArrowRight" || e.key === "Tab") nextCol = colIndex + 1;
    else if (e.key === "ArrowLeft") nextCol = colIndex - 1;
    else return;
    e.preventDefault();
    nextRow = Math.max(0, Math.min(staffRowsWithScore.length - 1, nextRow));
    nextCol = Math.max(0, Math.min(STAFF_NAV_FIELDS.length - 1, nextCol));
    const next = staffRowsWithScore[nextRow];
    if (!next) return;
    focusStaffInput(next.id, STAFF_NAV_FIELDS[nextCol]);
  };

  const onScoreFocusSelect = (e) => {
    if (typeof e.target.select === "function") e.target.select();
  };

  const patchMgmt = (id, patch) => setMgmtData((p) => ({ ...p, items: p.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const addMgmt = () => setMgmtData((p) => ({ ...p, items: [...p.items, emptyMgmtRow()] }));
  const delMgmt = (id) => setMgmtData((p) => ({ ...p, items: p.items.filter((x) => x.id !== id) }));

  const saveStaff = () => {
    saveEvalStaff({
      period: staffPeriod,
      ref: staffRef,
      items: staffRows.map((r) => ({
        id: r.id || uid(),
        fullName: r.fullName,
        deptId: r.deptId,
        soChe: clamp05(r.soChe),
        chiaSuat: clamp05(r.chiaSuat),
        fiveS: clamp05(r.fiveS),
        thaiDo: clamp05(r.thaiDo),
        reportLevel: r.reportLevel || "none",
        reportCount: Number(r.reportCount) || 0,
        note: r.note || "",
      })),
    });
    alert("Đã lưu đánh giá nhân viên.");
  };

  const saveMgmt = () => {
    saveEvalMgmt({
      ...mgmtData,
      month: mgmtMonth,
      items: mgmtData.items.map((r) => ({
        ...r,
        attendance: clamp05(r.attendance),
        workMgmt: clamp05(r.workMgmt),
        qualityControl: clamp05(r.qualityControl),
        incidentHandling: clamp05(r.incidentHandling),
        peopleMgmt: clamp05(r.peopleMgmt),
        reporting: clamp05(r.reporting),
        attitude: clamp05(r.attitude),
      })),
    });
    alert("Đã lưu đánh giá ban quản lý.");
  };

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        if (sub === "staff") saveStaff();
        else saveMgmt();
      },
    }),
    [sub, staffRows, staffPeriod, staffRef, mgmtData, mgmtMonth]
  );

  return (
    <div className="ns-tab">
      <div className="ns-segment ns-segment--wide">
        <button type="button" className={`ns-segment-btn ${sub === "staff" ? "active" : ""}`} onClick={() => setSub("staff")}>
          Nhân viên (thực tế)
        </button>
        <button type="button" className={`ns-segment-btn ${sub === "mgmt" ? "active" : ""}`} onClick={() => setSub("mgmt")}>
          Ban quản lý (chấm sâu theo tháng)
        </button>
      </div>

      {sub === "staff" && (
        <>
          <div className="ns-toolbar ns-toolbar--wrap">
            <label className="ns-field">
              <span>Kỳ đánh giá</span>
              <div className="ns-segment">
                <button type="button" className={`ns-segment-btn ${staffPeriod === "week" ? "active" : ""}`} onClick={() => setStaffPeriod("week")}>
                  Tuần
                </button>
                <button type="button" className={`ns-segment-btn ${staffPeriod === "month" ? "active" : ""}`} onClick={() => setStaffPeriod("month")}>
                  Tháng
                </button>
              </div>
            </label>
            <span className="ns-muted">
              {staffPeriodText} · Chuyên cần tính từ tổng kỳ ({periodDates.length} ngày) theo có mặt/nghỉ/đi trễ.
            </span>
          </div>

          <div className="table-scroll">
            <table className="ns-table ns-eval-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Họ tên</th>
                  <th>BP</th>
                  <th>Chuyên cần</th>
                  <th>Sơ chế</th>
                  <th>Chia suất</th>
                  <th>5S</th>
                  <th>Thái độ</th>
                  <th>Biên bản</th>
                  <th>Tổng</th>
                  <th>Xếp loại</th>
                  <th>Quyết định</th>
                </tr>
              </thead>
              <tbody>
                {staffRowsWithScore.map((r, idx) => (
                  <tr key={r.id} className={bandClass(r)}>
                    <td className="ns-eval-stt">{idx + 1}</td>
                    <td>{r.fullName}</td>
                    <td>{DEFAULT_DEPARTMENTS.find((d) => d.id === r.deptId)?.name || r.deptId}</td>
                    <td>{r.attendance.toFixed(2)} <span className="ns-muted">({r.presentDays}/{r.presentDays + r.leaveDays || 0})</span></td>
                    <td>
                      <input
                        className="ns-input ns-input--cell ns-eval-score-input"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        inputMode="decimal"
                        disabled={false}
                        style={{ pointerEvents: "auto" }}
                        value={r.soChe}
                        onChange={(e) => updateWorkScore(r.id, "soChe", e.target.value)}
                        onFocus={onScoreFocusSelect}
                        onKeyDown={(e) => onStaffScoreKeyDown(e, r.id, "soChe")}
                        ref={registerStaffInputRef(r.id, "soChe")}
                      />
                    </td>
                    <td>
                      <input
                        className="ns-input ns-input--cell ns-eval-score-input"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        inputMode="decimal"
                        disabled={false}
                        style={{ pointerEvents: "auto" }}
                        value={r.chiaSuat}
                        onChange={(e) => updateWorkScore(r.id, "chiaSuat", e.target.value)}
                        onFocus={onScoreFocusSelect}
                        onKeyDown={(e) => onStaffScoreKeyDown(e, r.id, "chiaSuat")}
                        ref={registerStaffInputRef(r.id, "chiaSuat")}
                      />
                    </td>
                    <td>
                      <input
                        className="ns-input ns-input--cell ns-eval-score-input"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        inputMode="decimal"
                        disabled={false}
                        style={{ pointerEvents: "auto" }}
                        value={r.fiveS}
                        onChange={(e) => updateWorkScore(r.id, "fiveS", e.target.value)}
                        onFocus={onScoreFocusSelect}
                        onKeyDown={(e) => onStaffScoreKeyDown(e, r.id, "fiveS")}
                        ref={registerStaffInputRef(r.id, "fiveS")}
                      />
                    </td>
                    <td>
                      <input
                        className="ns-input ns-input--cell ns-eval-score-input"
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        inputMode="decimal"
                        disabled={false}
                        style={{ pointerEvents: "auto" }}
                        value={r.thaiDo}
                        onChange={(e) => updateWorkScore(r.id, "thaiDo", e.target.value)}
                        onFocus={onScoreFocusSelect}
                        onKeyDown={(e) => onStaffScoreKeyDown(e, r.id, "thaiDo")}
                        ref={registerStaffInputRef(r.id, "thaiDo")}
                      />
                    </td>
                    <td>
                      <div className="ns-eval-report-cell">
                        <select className="ns-input ns-input--cell ns-eval-report-select" value={r.reportLevel} onChange={(e) => patchStaff(r.id, { reportLevel: e.target.value })}>
                          <option value="none">Không</option>
                          <option value="light">Nhẹ</option>
                          <option value="medium">Trung bình</option>
                          <option value="heavy">Nặng</option>
                        </select>
                        <input
                          className="ns-input ns-input--cell ns-eval-report-count"
                          type="number"
                          min={0}
                          max={9}
                          value={r.reportCount}
                          onChange={(e) => patchStaff(r.id, { reportCount: e.target.value })}
                          onFocus={onScoreFocusSelect}
                          onKeyDown={(e) => onStaffScoreKeyDown(e, r.id, "reportCount")}
                          ref={registerStaffInputRef(r.id, "reportCount")}
                        />
                      </div>
                    </td>
                    <td>{r.total.toFixed(2)}</td>
                    <td>{r.band.label}</td>
                    <td>{r.action}</td>
                  </tr>
                ))}
                {staffRowsWithScore.length === 0 && (
                  <tr>
                    <td colSpan={12} className="ns-empty">
                      Chưa có nhân sự từ tab Điểm danh ngày.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ns-eval-actions">
            <button type="button" className="ns-btn ns-btn--primary" onClick={saveStaff}>
              Lưu đánh giá NV
            </button>
          </div>

          <div className="ns-kpi-grid">
            {byDeptAvg.map((x) => (
              <div key={x.deptName} className={`ns-kpi-card ${x.avg >= 4 ? "ns-kpi-card--ok" : x.avg >= 3 ? "ns-kpi-card--warn" : "ns-kpi-card--danger"}`}>
                <div className="ns-kpi-label">{x.deptName}</div>
                <div className="ns-kpi-value">{x.avg.toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="ns-card">
            <div className="ns-card-title">Tổng hợp bắt buộc</div>
            <p className="ns-conclusion-text">Yếu: {weakStaff.map((x) => x.fullName).join(", ") || "—"}</p>
            <p className="ns-conclusion-text">Theo dõi: {watchStaff.map((x) => x.fullName).join(", ") || "—"}</p>
            <p className="ns-conclusion-text">Tốt/Xuất sắc: {goodStaff.map((x) => x.fullName).join(", ") || "—"}</p>
            <p className="ns-conclusion-text">Cảnh báo: TB7 &lt; 3 hoặc TB30 &lt; 3 sẽ đề xuất xử lý.</p>
          </div>
        </>
      )}

      {sub === "mgmt" && (
        <>
          <div className="ns-toolbar">
            <label className="ns-field">
              <span>Tháng đánh giá</span>
              <input className="ns-input" type="month" value={mgmtMonth} onChange={(e) => setMgmtMonth(e.target.value)} />
            </label>
          </div>

          <div className="table-scroll">
            <table className="ns-table ns-eval-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Chức danh</th>
                  <th>Chuyên cần</th>
                  <th>QL công việc</th>
                  <th>KS chất lượng</th>
                  <th>Xử lý sự vụ</th>
                  <th>QL nhân sự</th>
                  <th>Báo cáo</th>
                  <th>Thái độ</th>
                  <th>Vi phạm/Sự vụ</th>
                  <th>Điểm tổng</th>
                  <th>Xếp loại</th>
                  <th>Nhận xét</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mgmtRowsWithScore.map((r) => {
                  return (
                    <tr key={r.id} className={bandClass({ band: r.band, total: r.score })}>
                      <td>
                        <input className="ns-input ns-input--cell" value={r.fullName} onChange={(e) => patchMgmt(r.id, { fullName: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell" value={r.jobTitle || ""} onChange={(e) => patchMgmt(r.id, { jobTitle: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.attendance} onChange={(e) => patchMgmt(r.id, { attendance: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.workMgmt} onChange={(e) => patchMgmt(r.id, { workMgmt: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.qualityControl} onChange={(e) => patchMgmt(r.id, { qualityControl: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.incidentHandling} onChange={(e) => patchMgmt(r.id, { incidentHandling: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.peopleMgmt} onChange={(e) => patchMgmt(r.id, { peopleMgmt: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.reporting} onChange={(e) => patchMgmt(r.id, { reporting: e.target.value })} />
                      </td>
                      <td>
                        <input className="ns-input ns-input--cell ns-eval-score-input" type="number" min={1} max={5} step={0.1} value={r.attitude} onChange={(e) => patchMgmt(r.id, { attitude: e.target.value })} />
                      </td>
                      <td>
                        <div className="ns-eval-report-cell">
                          <label><input type="checkbox" checked={Boolean(r.hasVsattpViolation)} onChange={(e) => patchMgmt(r.id, { hasVsattpViolation: e.target.checked })} /> VSATTP</label>
                          <label><input type="checkbox" checked={Boolean(r.hasSeriousIncident)} onChange={(e) => patchMgmt(r.id, { hasSeriousIncident: e.target.checked })} /> Sự cố</label>
                          <label><input type="checkbox" checked={Boolean(r.hasCustomerComplaint)} onChange={(e) => patchMgmt(r.id, { hasCustomerComplaint: e.target.checked })} /> Phản ánh</label>
                        </div>
                      </td>
                      <td>{r.score.toFixed(2)}</td>
                      <td>{r.band.label}</td>
                      <td>
                        <input className="ns-input ns-input--cell" value={r.note} onChange={(e) => patchMgmt(r.id, { note: e.target.value })} />
                      </td>
                      <td>
                        <button type="button" className="ns-link ns-link--danger" onClick={() => delMgmt(r.id)}>
                          Xoá
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {mgmtData.items.length === 0 && (
                  <tr>
                    <td colSpan={14} className="ns-empty">
                      Chưa có đánh giá ban quản lý cho tháng này.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Tổng số người: {mgmtSummary.totalPeople}</strong></td>
                  <td colSpan={2}>Xuất sắc: {mgmtSummary.excellent}</td>
                  <td colSpan={2}>Tốt: {mgmtSummary.good}</td>
                  <td colSpan={2}>Theo dõi: {mgmtSummary.watch}</td>
                  <td>Không đạt: {mgmtSummary.fail}</td>
                  <td colSpan={4}><strong>TB BQL: {mgmtSummary.avgScore.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="ns-eval-actions">
            <button type="button" className="ns-btn ns-btn--ghost" onClick={addMgmt}>
              + Thêm thành viên BQL
            </button>
            <button type="button" className="ns-btn ns-btn--primary" onClick={saveMgmt}>
              Lưu đánh giá BQL
            </button>
          </div>

          {weakMgmt.length > 0 && (
            <div className="ns-card ns-card--warn">
              <div className="ns-card-title">Cảnh báo BQL yếu / cần đào tạo</div>
              <ul className="ns-warn-list">
                {weakMgmt.map((r) => (
                  <li key={r.id}>
                    <strong>{r.fullName || "Chưa tên"}</strong> — điểm {r.score.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default EvaluationTab;
