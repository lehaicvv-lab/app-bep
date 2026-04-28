import { useState } from "react";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LocationMaster({ regions, locations, onSaveRegions, onSaveLocations }) {
  const [regionForm, setRegionForm] = useState({ name: "", note: "" });
  const [locationForm, setLocationForm] = useState({ regionId: "", name: "", type: "Bếp", note: "" });

  function addRegion() {
    if (!regionForm.name.trim()) return;
    onSaveRegions([
      {
        id: uid(),
        name: regionForm.name.trim(),
        note: regionForm.note || "",
        isDeleted: false,
      },
      ...regions,
    ]);
    setRegionForm({ name: "", note: "" });
  }

  function addLocation() {
    if (!locationForm.name.trim() || !locationForm.regionId) return;
    onSaveLocations([
      {
        id: uid(),
        regionId: locationForm.regionId,
        name: locationForm.name.trim(),
        type: locationForm.type,
        note: locationForm.note || "",
        isDeleted: false,
      },
      ...locations,
    ]);
    setLocationForm({ regionId: "", name: "", type: "Bếp", note: "" });
  }

  function removeRegion(id) {
    onSaveRegions(regions.map((x) => (x.id === id ? { ...x, isDeleted: true } : x)));
  }

  function removeLocation(id) {
    onSaveLocations(locations.map((x) => (x.id === id ? { ...x, isDeleted: true } : x)));
  }

  const regionMap = Object.fromEntries(regions.map((x) => [x.id, x]));

  return (
    <section className="equipment-section">
      <h2 className="equipment-title">Danh mục bếp/site</h2>

      <div className="equipment-card">
        <div className="equipment-card-head"><h3>Khu vực</h3></div>
        <div className="equipment-form-grid">
          <label className="equipment-field"><span>Tên khu vực</span><input value={regionForm.name} onChange={(e) => setRegionForm((v) => ({ ...v, name: e.target.value }))} /></label>
          <label className="equipment-field"><span>Ghi chú</span><input value={regionForm.note} onChange={(e) => setRegionForm((v) => ({ ...v, note: e.target.value }))} /></label>
        </div>
        <div className="equipment-actions"><button className="equipment-btn" onClick={addRegion}>+ Thêm khu vực</button></div>
        <div className="equipment-table-wrap">
          <table className="equipment-table equipment-table--compact">
            <thead><tr><th>STT</th><th>Tên khu vực</th><th>Ghi chú</th><th>Xoá</th></tr></thead>
            <tbody>
              {regions.filter((x) => !x.isDeleted).map((x, idx) => (
                <tr key={x.id}><td>{idx + 1}</td><td>{x.name}</td><td>{x.note || "—"}</td><td><button className="equipment-btn equipment-btn--icon danger" title="Xoá" onClick={() => removeRegion(x.id)}>🗑</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="equipment-card">
        <div className="equipment-card-head"><h3>Bếp/Site</h3></div>
        <div className="equipment-form-grid equipment-form-grid--4">
          <label className="equipment-field"><span>Khu vực</span><select value={locationForm.regionId} onChange={(e) => setLocationForm((v) => ({ ...v, regionId: e.target.value }))}><option value="">Chọn</option>{regions.filter((x) => !x.isDeleted).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="equipment-field"><span>Tên bếp/site</span><input value={locationForm.name} onChange={(e) => setLocationForm((v) => ({ ...v, name: e.target.value }))} /></label>
          <label className="equipment-field"><span>Loại</span><select value={locationForm.type} onChange={(e) => setLocationForm((v) => ({ ...v, type: e.target.value }))}><option>Bếp</option><option>Site</option><option>Kho</option><option>Xưởng</option></select></label>
          <label className="equipment-field"><span>Ghi chú</span><input value={locationForm.note} onChange={(e) => setLocationForm((v) => ({ ...v, note: e.target.value }))} /></label>
        </div>
        <div className="equipment-actions"><button className="equipment-btn" onClick={addLocation}>+ Thêm bếp/site</button></div>
        <div className="equipment-table-wrap">
          <table className="equipment-table equipment-table--compact">
            <thead><tr><th>STT</th><th>Khu vực</th><th>Tên</th><th>Loại</th><th>Ghi chú</th><th>Xoá</th></tr></thead>
            <tbody>
              {locations.filter((x) => !x.isDeleted).map((x, idx) => (
                <tr key={x.id}><td>{idx + 1}</td><td>{regionMap[x.regionId]?.name || "—"}</td><td>{x.name}</td><td>{x.type}</td><td>{x.note || "—"}</td><td><button className="equipment-btn equipment-btn--icon danger" title="Xoá" onClick={() => removeLocation(x.id)}>🗑</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
