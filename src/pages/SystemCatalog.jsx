import { useCallback, useMemo, useRef, useState } from "react";
import { IconCatalogChevron, IconCatalogPlus } from "../components/icons/CatalogUiIcons.jsx";
import IconTrash2D from "../components/icons/IconTrash2D.jsx";
import ModuleShell from "../components/ModuleShell.jsx";
import LocationMaster from "./thietbi/LocationMaster.jsx";
import "./Thietbi.css";
import {
  loadDepartments,
  loadLocations,
  loadRegions,
  loadShifts,
  saveDepartments,
  saveLocations,
  saveRegions,
  saveShifts,
} from "../systemCatalog/masterData.js";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readArray(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function SystemCatalog() {
  const [regions, setRegions] = useState(() => loadRegions());
  const [locations, setLocations] = useState(() => loadLocations());
  const [departments, setDepartments] = useState(() => loadDepartments());
  const [shifts, setShifts] = useState(() => loadShifts());
  const [deptPanelOpen, setDeptPanelOpen] = useState(true);
  const [shiftPanelOpen, setShiftPanelOpen] = useState(true);
  const deptNameInputRef = useRef(null);
  const shiftNameInputRef = useRef(null);

  const equipmentRows = useMemo(() => readArray("asset_equipment_list", readArray("equipment_list", [])), []);
  const ccdcRows = useMemo(() => readArray("asset_tree_rows", []), []);
  const transferRows = useMemo(() => readArray("asset_transfer_history", []), []);

  const onSaveRegions = useCallback((rows) => {
    setRegions(rows);
    saveRegions(rows);
  }, []);
  const onSaveLocations = useCallback((rows) => {
    setLocations(rows);
    saveLocations(rows);
  }, []);

  const [deptName, setDeptName] = useState("");
  const addDepartment = () => {
    const name = deptName.trim();
    if (!name) {
      const wasClosed = !deptPanelOpen;
      setDeptPanelOpen(true);
      const focusField = () => deptNameInputRef.current?.focus();
      if (wasClosed) setTimeout(focusField, 60);
      else focusField();
      return;
    }
    const next = [...departments, { id: `dept-${uid()}`, name }];
    setDepartments(next);
    saveDepartments(next);
    setDeptName("");
  };
  const removeDepartment = (id) => {
    const next = departments.filter((d) => d.id !== id);
    setDepartments(next);
    saveDepartments(next);
  };

  const [shiftName, setShiftName] = useState("");
  const addShift = () => {
    const name = shiftName.trim();
    if (!name) {
      const wasClosed = !shiftPanelOpen;
      setShiftPanelOpen(true);
      const focusField = () => shiftNameInputRef.current?.focus();
      if (wasClosed) setTimeout(focusField, 60);
      else focusField();
      return;
    }
    const maxOrder = shifts.reduce((m, s) => Math.max(m, Number(s.sortOrder) || 0), 0);
    const next = [...shifts, { id: `shift-${uid()}`, name, sortOrder: maxOrder + 1 }];
    setShifts(next);
    saveShifts(next);
    setShiftName("");
  };
  const removeShift = (id) => {
    const next = shifts.filter((s) => s.id !== id);
    setShifts(next);
    saveShifts(next);
  };

  return (
    <div className="equipment-page ops-standard-page system-catalog-master">
      <ModuleShell
        title="Danh mục hệ thống"
        subtitle="Khu vực, bếp/site, bộ phận và ca làm việc dùng chung cho báo cáo, thiết bị, nhân sự, an toàn, đội xe"
      />

      <LocationMaster
        heading="Khu vực & Bếp / Site"
        regions={regions}
        locations={locations}
        equipmentRows={equipmentRows}
        ccdcRows={ccdcRows}
        transferRows={transferRows}
        onSaveRegions={onSaveRegions}
        onSaveLocations={onSaveLocations}
      />

      <section className="equipment-section system-catalog-block">
        <h2 className="equipment-title">Bộ phận</h2>
        <div className="equipment-card location-master-card">
          <div className="equipment-card-head location-master-card-head">
            <h3>Danh mục bộ phận</h3>
            <div className="location-master-head-actions">
              <button
                type="button"
                className="location-master-toggle"
                onClick={() => setDeptPanelOpen((v) => !v)}
                aria-expanded={deptPanelOpen}
                aria-controls="system-catalog-dept-body"
                title={deptPanelOpen ? "Thu gọn" : "Mở rộng"}
              >
                <IconCatalogChevron open={deptPanelOpen} />
              </button>
              <button type="button" className="equipment-btn location-master-add-btn" onClick={addDepartment}>
                <IconCatalogPlus />
                <span>Thêm bộ phận</span>
              </button>
            </div>
          </div>
          <div id="system-catalog-dept-body" className="location-master-card-body" hidden={!deptPanelOpen}>
            <div className="equipment-form-grid">
              <label className="equipment-field">
                <span>Tên bộ phận</span>
                <input
                  ref={deptNameInputRef}
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="Ví dụ: Bếp nóng"
                />
              </label>
            </div>
            <div className="equipment-table-wrap">
              <table className="equipment-table equipment-table--compact">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên</th>
                    <th>Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d, idx) => (
                    <tr key={d.id}>
                      <td>{idx + 1}</td>
                      <td>{d.name}</td>
                      <td>
                        <button
                          type="button"
                          className="catalog-flat-del-btn"
                          title="Xoá"
                          aria-label="Xoá"
                          onClick={() => removeDepartment(d.id)}
                        >
                          <IconTrash2D />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="equipment-section system-catalog-block">
        <h2 className="equipment-title">Ca làm việc</h2>
        <div className="equipment-card location-master-card">
          <div className="equipment-card-head location-master-card-head">
            <h3>Danh mục ca</h3>
            <div className="location-master-head-actions">
              <button
                type="button"
                className="location-master-toggle"
                onClick={() => setShiftPanelOpen((v) => !v)}
                aria-expanded={shiftPanelOpen}
                aria-controls="system-catalog-shift-body"
                title={shiftPanelOpen ? "Thu gọn" : "Mở rộng"}
              >
                <IconCatalogChevron open={shiftPanelOpen} />
              </button>
              <button type="button" className="equipment-btn location-master-add-btn" onClick={addShift}>
                <IconCatalogPlus />
                <span>Thêm ca</span>
              </button>
            </div>
          </div>
          <div id="system-catalog-shift-body" className="location-master-card-body" hidden={!shiftPanelOpen}>
            <p className="system-catalog-hint">
              Lịch tuần Đội xe vẫn dùng hai ca cố định <strong>ca1</strong> và <strong>ca2</strong> (đổi tên hiển thị tại đây).
              Nhật ký xe có thể chọn thêm các ca khác trong danh mục.
            </p>
            <div className="equipment-form-grid">
              <label className="equipment-field">
                <span>Tên ca</span>
                <input
                  ref={shiftNameInputRef}
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="Ví dụ: Ca sáng"
                />
              </label>
            </div>
            <div className="equipment-table-wrap">
              <table className="equipment-table equipment-table--compact">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã (id)</th>
                    <th>Tên hiển thị</th>
                    <th>Xoá</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s, idx) => (
                    <tr key={s.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <code className="catalog-shift-id">{s.id}</code>
                      </td>
                      <td>{s.name}</td>
                      <td>
                        <button
                          type="button"
                          className="catalog-flat-del-btn"
                          title="Xoá"
                          aria-label="Xoá"
                          onClick={() => removeShift(s.id)}
                        >
                          <IconTrash2D />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
