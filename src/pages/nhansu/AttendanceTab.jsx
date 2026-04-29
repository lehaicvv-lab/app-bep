import { forwardRef, Fragment, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ATTENDANCE_STATUS } from "./constants.js";
import { attendanceKey, loadAttendance, loadDepartmentCatalog, saveAttendance, saveDepartmentCatalog } from "./storage.js";
import { uid } from "./utils.js";

const emptyRow = () => ({
  id: uid(),
  fullName: "",
  jobTitle: "",
  status: "present",
  checkIn: "",
  checkOut: "",
  note: "",
});

function rowClass(status) {
  if (status === "leave_paid") return "ns-att-row--leave-paid";
  if (status === "leave_unpaid") return "ns-att-row--leave-unpaid";
  if (status === "late") return "ns-att-row--late";
  return "";
}

function metricsForRows(rows) {
  let total = rows.length;
  let coMat = 0;
  let vang = 0;
  let nghiPhep = 0;
  let diTre = 0;
  for (const r of rows) {
    const s = r.status;
    if (s === "present" || s === "short") coMat += 1;
    else if (s === "late") {
      coMat += 1;
      diTre += 1;
    } else if (s === "absent" || s === "leave_unpaid") vang += 1;
    else if (s === "leave_paid") nghiPhep += 1;
  }
  return { total, coMat, vang, nghiPhep, diTre };
}

function previousIsoDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function IconManageDept() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m19.4 13.6 1.6-1.1-1.2-2.1-1.9.3a6.9 6.9 0 0 0-1.1-1.1l.3-1.9-2.1-1.2-1.1 1.6c-.5-.1-.9-.2-1.4-.2s-.9.1-1.4.2L9.7 6.5 7.6 7.7l.3 1.9c-.4.3-.8.7-1.1 1.1l-1.9-.3-1.2 2.1 1.6 1.1c-.1.5-.2.9-.2 1.4s.1.9.2 1.4l-1.6 1.1 1.2 2.1 1.9-.3c.3.4.7.8 1.1 1.1l-.3 1.9 2.1 1.2 1.1-1.6c.5.1.9.2 1.4.2s.9-.1 1.4-.2l1.1 1.6 2.1-1.2-.3-1.9c.4-.3.8-.7 1.1-1.1l1.9.3 1.2-2.1-1.6-1.1c.1-.5.2-.9.2-1.4s-.1-.9-.2-1.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

const AttendanceTab = forwardRef(function AttendanceTab({ workDate, onSaved, onSave, onReload, onPrint, onCopyPrevious, ActionIcons }, ref) {
  const [data, setData] = useState(() => loadAttendance(workDate));
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [copyNotice, setCopyNotice] = useState({});
  const noticeTimersRef = useRef({});
  const [openDept, setOpenDept] = useState(() => {
    const init = {};
    for (const d of loadAttendance(workDate).departments) init[d.id] = true;
    return init;
  });

  useEffect(() => {
    const loaded = loadAttendance(workDate);
    setData({ ...loaded, date: workDate });
    setOpenDept((prev) => {
      const next = { ...prev };
      for (const d of loaded.departments) {
        if (next[d.id] === undefined) next[d.id] = true;
      }
      for (const k of Object.keys(next)) {
        if (!loaded.departments.some((d) => d.id === k)) delete next[k];
      }
      return next;
    });
  }, [workDate]);

  useEffect(() => {
    return () => {
      Object.values(noticeTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const toggleDept = (deptId) => {
    setOpenDept((p) => ({ ...p, [deptId]: !p[deptId] }));
  };

  const updateDept = useCallback((deptId, updater) => {
    setData((prev) => ({
      ...prev,
      departments: prev.departments.map((d) => (d.id === deptId ? updater(d) : d)),
    }));
  }, []);

  const setDepartments = useCallback((updater) => {
    setData((prev) => {
      const current = prev.departments || [];
      const departments = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, departments };
    });
  }, []);

  const addRow = (deptId) => {
    updateDept(deptId, (d) => ({ ...d, rows: [...d.rows, emptyRow()] }));
    setOpenDept((p) => ({ ...p, [deptId]: true }));
  };

  const removeRow = (deptId, rowId) => {
    updateDept(deptId, (d) => ({ ...d, rows: d.rows.filter((r) => r.id !== rowId) }));
  };

  const patchRow = (deptId, rowId, patch) => {
    updateDept(deptId, (d) => ({
      ...d,
      rows: d.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    }));
  };

  const showCopyNotice = (deptId, message) => {
    if (noticeTimersRef.current[deptId]) window.clearTimeout(noticeTimersRef.current[deptId]);
    setCopyNotice((prev) => ({ ...prev, [deptId]: message }));
    noticeTimersRef.current[deptId] = window.setTimeout(() => {
      setCopyNotice((prev) => ({ ...prev, [deptId]: "" }));
      noticeTimersRef.current[deptId] = null;
    }, 1800);
  };

  const copyTimesForPresent = (deptId) => {
    const dept = data.departments.find((d) => d.id === deptId);
    if (!dept || dept.rows.length === 0) {
      showCopyNotice(deptId, "Chưa có nhân viên để copy giờ.");
      return;
    }
    const firstRow = dept.rows[0];
    const { checkIn, checkOut } = firstRow;
    let copiedCount = 0;
    updateDept(deptId, (d) => ({
      ...d,
      rows: d.rows.map((r) => {
        if (r.status !== "present") return r;
        copiedCount += 1;
        return { ...r, checkIn, checkOut };
      }),
    }));
    showCopyNotice(deptId, `Đã copy giờ cho ${copiedCount} nhân viên`);
  };

  const persistDepartmentCatalog = useCallback(
    (departments) => {
      saveDepartmentCatalog(departments.map((d) => ({ id: d.id, name: d.name })));
    },
    []
  );

  const renameDepartment = (deptId, name) => {
    setDepartments((list) => {
      const next = list.map((d) => (d.id === deptId ? { ...d, name } : d));
      persistDepartmentCatalog(next);
      return next;
    });
  };

  const moveDepartment = (deptId, direction) => {
    setDepartments((list) => {
      const idx = list.findIndex((d) => d.id === deptId);
      if (idx < 0) return list;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      persistDepartmentCatalog(next);
      return next;
    });
  };

  const deleteDepartment = (deptId) => {
    const dept = data.departments.find((d) => d.id === deptId);
    if (!dept) return;
    if (dept.rows.length > 0) {
      const ok = window.confirm("Bộ phận này đang có nhân viên, bạn có chắc muốn xóa?");
      if (!ok) return;
    }
    setDepartments((list) => {
      const next = list.filter((d) => d.id !== deptId);
      persistDepartmentCatalog(next);
      return next;
    });
    setOpenDept((prev) => {
      const next = { ...prev };
      delete next[deptId];
      return next;
    });
  };

  const addDepartment = () => {
    const name = newDeptName.trim();
    if (!name) return;
    const newDept = { id: `dept-${uid()}`, name, rows: [] };
    setDepartments((list) => {
      const next = [...list, newDept];
      persistDepartmentCatalog(next);
      return next;
    });
    setOpenDept((prev) => ({ ...prev, [newDept.id]: true }));
    setNewDeptName("");
  };

  const openDeptManager = () => {
    if (!data.departments.length) {
      const catalog = loadDepartmentCatalog().map((d) => ({ ...d, rows: [] }));
      setDepartments(catalog);
    }
    setDeptModalOpen(true);
  };

  const grandTotals = useMemo(() => {
    const rows = data.departments.flatMap((d) => d.rows);
    return metricsForRows(rows);
  }, [data]);

  const handleSave = useCallback(() => {
    for (const dept of data.departments || []) {
      for (const row of dept.rows || []) {
        if (!row?.checkIn || !row?.checkOut) continue;
        if (row.checkOut < row.checkIn) {
          alert(`Giờ ra phải sau giờ vào: ${row.fullName || "Nhân viên"} (${dept.name}).`);
          return;
        }
      }
    }
    const payload = { ...data, date: workDate, shift: data.shift };
    saveAttendance(payload);
    onSaved?.();
    alert("Đã lưu điểm danh.");
  }, [data, workDate, onSaved]);

  const copyFromPreviousDay = useCallback(() => {
    const prevDate = previousIsoDate(workDate);
    if (!prevDate) return;
    const raw = localStorage.getItem(attendanceKey(prevDate));
    if (!raw) {
      alert("Không tìm thấy dữ liệu ngày hôm trước");
      return;
    }
    const prev = loadAttendance(prevDate);
    const nextDepartments = (prev.departments || []).map((dept) => ({
      id: dept.id,
      name: dept.name,
      rows: (dept.rows || []).map((r) => ({
        id: uid(),
        fullName: r.fullName ?? "",
        jobTitle: r.jobTitle ?? "",
        status: "present",
        checkIn: r.checkIn ?? "",
        checkOut: r.checkOut ?? "",
        note: "",
      })),
    }));
    setData((p) => ({
      ...p,
      shift: prev.shift || p.shift,
      departments: nextDepartments,
    }));
  }, [workDate]);

  useImperativeHandle(ref, () => ({ save: handleSave, copyFromPreviousDay }), [handleSave, copyFromPreviousDay]);

  return (
    <div className="ns-tab">
      <div className="table-scroll ns-att-accordion-wrap">
        <div className="ns-att-table-tools">
          <div className="ns-att-top-actions">
            <button type="button" className="ns-btn ns-btn--primary ns-btn--iconic" onClick={onSave}>
              <span className="ns-btn-icon">{ActionIcons?.IconSave ? <ActionIcons.IconSave /> : null}</span>
              <span className="ns-btn-label">Lưu</span>
            </button>
            <button type="button" className="ns-btn ns-btn--ghost ns-btn--iconic" onClick={onPrint}>
              <span className="ns-btn-icon">{ActionIcons?.IconPrint ? <ActionIcons.IconPrint /> : null}</span>
              <span className="ns-btn-label">In báo cáo</span>
            </button>
            <button type="button" className="ns-btn ns-btn--ghost ns-btn--iconic" onClick={onReload}>
              <span className="ns-btn-icon">{ActionIcons?.IconReload ? <ActionIcons.IconReload /> : null}</span>
              <span className="ns-btn-label">Tải lại</span>
            </button>
            <button type="button" className="ns-btn ns-btn--ghost ns-btn--iconic" onClick={onCopyPrevious}>
              <span className="ns-btn-icon">{ActionIcons?.IconCopyPrev ? <ActionIcons.IconCopyPrev /> : null}</span>
              <span className="ns-btn-label">Copy hôm trước</span>
            </button>
          </div>
          <button type="button" className="ns-att-manage-btn ns-btn--iconic" onClick={openDeptManager}>
            <span className="ns-btn-icon">
              <IconManageDept />
            </span>
            <span className="ns-btn-label">Quản lý bộ phận</span>
          </button>
        </div>
        <table className="ns-table ns-att-accordion-table">
          <colgroup>
            <col className="ns-att-acol-toggle" />
            <col className="ns-att-acol-a" />
            <col className="ns-att-acol-b" />
            <col className="ns-att-acol-num" />
            <col className="ns-att-acol-num" />
            <col className="ns-att-acol-num" />
            <col className="ns-att-acol-num" />
            <col className="ns-att-acol-rest" />
            <col className="ns-att-acol-action" />
          </colgroup>
          <thead>
            <tr>
              <th className="ns-att-th-toggle">+/−</th>
              <th>Bộ phận</th>
              <th className="ns-att-th-num">Tổng NS</th>
              <th className="ns-att-th-num">Có mặt</th>
              <th className="ns-att-th-num">Vắng</th>
              <th className="ns-att-th-num">Nghỉ phép</th>
              <th className="ns-att-th-num">Đi trễ</th>
              <th>Ghi chú</th>
              <th className="ns-att-th-action" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {data.departments.map((dept) => {
              const m = metricsForRows(dept.rows);
              const expanded = openDept[dept.id] !== false;
              return (
                <Fragment key={dept.id}>
                  <tr className="ns-att-dept-row">
                    <td className="ns-att-td-toggle">
                      <button
                        type="button"
                        className="ns-att-toggle"
                        onClick={() => toggleDept(dept.id)}
                        aria-expanded={expanded}
                        aria-label={expanded ? `Thu gọn ${dept.name}` : `Mở ${dept.name}`}
                      >
                        {expanded ? "−" : "+"}
                      </button>
                    </td>
                    <td className="ns-att-dept-name">{dept.name}</td>
                    <td className="ns-att-td-num">{m.total}</td>
                    <td className="ns-att-td-num ns-att-num--ok">{m.coMat}</td>
                    <td className="ns-att-td-num">{m.vang}</td>
                    <td className="ns-att-td-num">{m.nghiPhep}</td>
                    <td className="ns-att-td-num ns-att-num--warn">{m.diTre}</td>
                    <td className="ns-att-dept-note" colSpan={2}>
                      <span className="ns-att-dept-note-dash">—</span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="ns-att-detail-row">
                      <td colSpan={9} className="ns-att-detail-cell">
                        <div className="ns-att-detail-panel">
                          <div className="ns-att-nested-toolbar-inner">
                            <span className="ns-att-nested-status">
                              Trạng thái: <strong>Bản nháp</strong>
                              <span className="ns-att-nested-meta"> · {dept.rows.length} nhân viên</span>
                            </span>
                            <div className="ns-att-nested-actions">
                              <button type="button" className="ns-att-copy-btn" onClick={() => copyTimesForPresent(dept.id)}>
                                Copy giờ
                              </button>
                              <button type="button" className="ns-att-add-blue" onClick={() => addRow(dept.id)}>
                                + Thêm
                              </button>
                            </div>
                          </div>
                          {copyNotice[dept.id] ? <div className="ns-att-copy-notice">{copyNotice[dept.id]}</div> : null}

                          <table className="ns-att-nested-table">
                            <thead>
                              <tr>
                                <th className="ns-att-sub-th-stt">STT</th>
                                <th>Họ tên</th>
                                <th>Chức danh</th>
                                <th>Trạng thái</th>
                                <th>Giờ vào</th>
                                <th>Giờ ra</th>
                                <th>Ghi chú</th>
                                <th className="ns-att-th-action" />
                              </tr>
                            </thead>
                            <tbody>
                              {dept.rows.map((row, idx) => (
                                <tr key={row.id} className={`ns-att-emp-row ${rowClass(row.status)}`}>
                                  <td className="ns-att-td-stt">{idx + 1}</td>
                                  <td className="ns-att-cell-text">
                                    <input
                                      className="ns-att-input ns-att-inline"
                                      value={row.fullName}
                                      onChange={(e) => patchRow(dept.id, row.id, { fullName: e.target.value })}
                                      placeholder="Họ tên"
                                      spellCheck={false}
                                    />
                                  </td>
                                  <td className="ns-att-cell-text">
                                    <input
                                      className="ns-att-input ns-att-inline"
                                      value={row.jobTitle}
                                      onChange={(e) => patchRow(dept.id, row.id, { jobTitle: e.target.value })}
                                      placeholder="Chức danh"
                                      spellCheck={false}
                                    />
                                  </td>
                                  <td>
                                    <select className="ns-att-select ns-att-inline" value={row.status} onChange={(e) => patchRow(dept.id, row.id, { status: e.target.value })}>
                                      {ATTENDANCE_STATUS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                          {s.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <input className="ns-att-time ns-att-inline" type="time" value={row.checkIn} onChange={(e) => patchRow(dept.id, row.id, { checkIn: e.target.value })} />
                                  </td>
                                  <td>
                                    <input className="ns-att-time ns-att-inline" type="time" value={row.checkOut} onChange={(e) => patchRow(dept.id, row.id, { checkOut: e.target.value })} />
                                  </td>
                                  <td className="ns-att-cell-text">
                                    <input
                                      className="ns-att-input ns-att-inline"
                                      value={row.note}
                                      onChange={(e) => patchRow(dept.id, row.id, { note: e.target.value })}
                                      placeholder="Ghi chú"
                                      spellCheck={false}
                                    />
                                  </td>
                                  <td className="ns-att-td-action">
                                    <button type="button" className="ns-att-del" title="Xoá dòng" onClick={() => removeRow(dept.id, row.id)}>
                                      Xoá
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {dept.rows.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="ns-att-empty-nested">
                                    Chưa có nhân viên - nhấn + Thêm
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr className="ns-att-totals-row">
              <td />
              <td className="ns-att-totals-label">
                <strong>Tổng cộng</strong>
              </td>
              <td className="ns-att-td-num">
                <strong>{grandTotals.total}</strong>
              </td>
              <td className="ns-att-td-num ns-att-num--ok">
                <strong>{grandTotals.coMat}</strong>
              </td>
              <td className="ns-att-td-num">
                <strong>{grandTotals.vang}</strong>
              </td>
              <td className="ns-att-td-num">
                <strong>{grandTotals.nghiPhep}</strong>
              </td>
              <td className="ns-att-td-num ns-att-num--warn">
                <strong>{grandTotals.diTre}</strong>
              </td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <div className="ns-att-footer">
        <div className="ns-att-footer-hint">Bấm +/− để mở hoặc thu danh sách theo bộ phận. Dữ liệu giữ nguyên khi thu gọn.</div>
        <button type="button" className="ns-btn ns-btn--primary" onClick={handleSave}>
          Lưu điểm danh
        </button>
      </div>

      {deptModalOpen && (
        <div className="ns-modal-backdrop" role="dialog" aria-modal="true">
          <div className="ns-modal">
            <div className="ns-modal-head">
              <h3>Quản lý bộ phận</h3>
              <button type="button" className="ns-modal-close" onClick={() => setDeptModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="ns-modal-body">
              {data.departments.map((dept, idx) => (
                <div key={dept.id} className="ns-dept-item">
                  <input className="ns-input ns-dept-input" value={dept.name} onChange={(e) => renameDepartment(dept.id, e.target.value)} placeholder="Tên bộ phận" />
                  <div className="ns-dept-actions">
                    <button type="button" className="ns-btn ns-btn--ghost ns-dept-move" onClick={() => moveDepartment(dept.id, "up")} disabled={idx === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ns-btn ns-btn--ghost ns-dept-move"
                      onClick={() => moveDepartment(dept.id, "down")}
                      disabled={idx === data.departments.length - 1}
                    >
                      ↓
                    </button>
                    <button type="button" className="ns-btn ns-btn--ghost ns-dept-delete" onClick={() => deleteDepartment(dept.id)}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
              <div className="ns-dept-add-row">
                <input
                  className="ns-input ns-dept-input"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Thêm bộ phận mới"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDepartment();
                    }
                  }}
                />
                <button type="button" className="ns-btn ns-btn--primary ns-dept-add-btn" onClick={addDepartment}>
                  Thêm
                </button>
              </div>
            </div>
            <div className="ns-modal-foot">
              <button type="button" className="ns-btn ns-btn--ghost" onClick={() => setDeptModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AttendanceTab;
