import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./nhansu/Nhansu.css";
import OverviewTab from "./nhansu/OverviewTab.jsx";
import AttendanceTab from "./nhansu/AttendanceTab.jsx";
import TimesheetTab from "./nhansu/TimesheetTab.jsx";
import EvaluationTab from "./nhansu/EvaluationTab.jsx";
import { todayIsoDate } from "./nhansu/utils.js";
import { hydrateAttendanceFromSupabase, hydrateEvalMgmtFromSupabase, hydrateEvalStaffFromSupabase, loadAttendance } from "./nhansu/storage.js";
import ModuleShell from "../components/ModuleShell.jsx";

function IconSave() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h11l3 3v15H5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v6h8V3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21v-7h8v7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconReload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 4v6h-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8V3h10v5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="5" y="10" width="14" height="7" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 14h10v7H7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconCopyPrev() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="8" width="10" height="12" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 16V4h10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12H4l2.6-2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const TAB_LABELS = {
  overview: "Tổng quan",
  attendance: "Điểm danh ngày",
  timesheet: "Chấm công",
  evaluation: "Đánh giá",
};

function getWeekRefFromDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `week-${d.getFullYear()}-${String(weekNo).padStart(2, "0")}`;
}

export default function Nhansu({ initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [workDate, setWorkDate] = useState(todayIsoDate);
  const [reloadKey, setReloadKey] = useState(0);
  const attendanceRef = useRef(null);
  const evaluationRef = useRef(null);

  const handleReload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (tab === "attendance") {
      attendanceRef.current?.save?.();
      return;
    }
    if (tab === "evaluation") {
      evaluationRef.current?.save?.();
      return;
    }
    alert("Lưu áp dụng cho tab Điểm danh ngày hoặc Đánh giá.");
  };

  const handleCopyPrevious = () => {
    if (tab !== "attendance") {
      alert("Chức năng này áp dụng cho tab Điểm danh ngày.");
      return;
    }
    const ok = window.confirm("Dữ liệu ngày hiện tại sẽ bị thay bằng dữ liệu ngày hôm trước. Tiếp tục?");
    if (!ok) return;
    attendanceRef.current?.copyFromPreviousDay?.();
  };

  const attendanceSummary = useMemo(() => {
    const data = loadAttendance(workDate);
    let total = 0;
    let present = 0;
    let absent = 0;
    for (const dept of data.departments || []) {
      for (const row of dept.rows || []) {
        total += 1;
        if (row.status === "present" || row.status === "late" || row.status === "short") present += 1;
        if (row.status === "absent" || row.status === "leave_paid" || row.status === "leave_unpaid") absent += 1;
      }
    }
    return { total, present, absent };
  }, [workDate, reloadKey]);

  useEffect(() => {
    let ignore = false;

    const hydrate = async () => {
      try {
        await hydrateAttendanceFromSupabase(workDate);
        await hydrateEvalStaffFromSupabase("week", getWeekRefFromDate(workDate));
        await hydrateEvalStaffFromSupabase("month", `month-${workDate.slice(0, 7)}`);
        await hydrateEvalMgmtFromSupabase(workDate.slice(0, 7));
        if (!ignore) {
          setReloadKey((k) => k + 1);
        }
      } catch (error) {
        console.error("[Nhansu] hydrate from Supabase failed:", error);
      }
    };

    hydrate();

    return () => {
      ignore = true;
    };
  }, [workDate]);

  const displayDate = useMemo(() => {
    const [y, m, d] = String(workDate).split("-");
    if (!y || !m || !d) return workDate;
    return `${d}/${m}/${y}`;
  }, [workDate]);

  return (
    <div className="ns-page ops-standard-page" key={reloadKey}>
      <div className="ns-shell">
        <ModuleShell
          title="Nhân sự"
          subtitle={TAB_LABELS[tab] || tab}
          notice={`Ngày làm việc: ${displayDate}`}
          stats={[
            { label: "Tổng NS", value: attendanceSummary.total },
            { label: "Có mặt", value: attendanceSummary.present },
            { label: "Vắng", value: attendanceSummary.absent, tone: "danger" },
          ]}
        />
        <div className="ns-report-controls">
          <label className="ns-field">
            <span>Ngày làm việc</span>
            <input className="ns-input ns-report-date" type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </label>
        </div>

        {tab === "overview" && <OverviewTab />}
        {tab === "attendance" && (
          <AttendanceTab
            ref={attendanceRef}
            workDate={workDate}
            onSave={handleSave}
            onReload={handleReload}
            onPrint={handlePrint}
            onCopyPrevious={handleCopyPrevious}
            ActionIcons={{ IconSave, IconReload, IconPrint, IconCopyPrev }}
          />
        )}
        {tab === "timesheet" && <TimesheetTab workDate={workDate} />}
        {tab === "evaluation" && <EvaluationTab ref={evaluationRef} workDate={workDate} />}
      </div>
    </div>
  );
}
