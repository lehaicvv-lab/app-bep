import { useRef, useState } from "react";
import { IconCatalogChevron, IconCatalogPlus } from "../../components/icons/CatalogUiIcons.jsx";
import IconTrash2D from "../../components/icons/IconTrash2D.jsx";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LocationMaster({
  heading = "Danh mục bếp/site",
  regions,
  locations,
  equipmentRows = [],
  ccdcRows = [],
  transferRows = [],
  onSaveRegions,
  onSaveLocations,
}) {
  const [regionForm, setRegionForm] = useState({ name: "", note: "" });
  const [locationForm, setLocationForm] = useState({ regionId: "", name: "", type: "Bếp", note: "" });
  const [regionPanelOpen, setRegionPanelOpen] = useState(true);
  const [locationPanelOpen, setLocationPanelOpen] = useState(true);
  const regionNameInputRef = useRef(null);
  const locationRegionSelectRef = useRef(null);
  const locationNameInputRef = useRef(null);

  function addRegion() {
    if (typeof onSaveRegions !== "function") {
      window.alert("Lỗi cấu hình: thiếu onSaveRegions.");
      return;
    }
    if (!regionForm.name.trim()) {
      const wasClosed = !regionPanelOpen;
      setRegionPanelOpen(true);
      const focusName = () => regionNameInputRef.current?.focus();
      if (wasClosed) setTimeout(focusName, 60);
      else focusName();
      return;
    }
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
    if (typeof onSaveLocations !== "function") {
      window.alert("Lỗi cấu hình: thiếu onSaveLocations.");
      return;
    }
    if (!locationForm.regionId || !locationForm.name.trim()) {
      const wasClosed = !locationPanelOpen;
      setLocationPanelOpen(true);
      const focusField = () => {
        if (!locationForm.regionId) locationRegionSelectRef.current?.focus();
        else locationNameInputRef.current?.focus();
      };
      if (wasClosed) setTimeout(focusField, 60);
      else focusField();
      return;
    }
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
    const inUseByLocation = locations.some((x) => !x.isDeleted && x.regionId === id);
    const inUseByEquipment = equipmentRows.some((x) => !x.isDeleted && x.regionId === id);
    const inUseByCcdc = ccdcRows.some((x) => !x.isDeleted && x.regionId === id);
    if (inUseByLocation || inUseByEquipment || inUseByCcdc) {
      window.alert("Không thể xoá khu vực vì đang có dữ liệu tham chiếu.");
      return;
    }
    onSaveRegions(regions.map((x) => (x.id === id ? { ...x, isDeleted: true } : x)));
  }

  function removeLocation(id) {
    const inUseByEquipment = equipmentRows.some((x) => !x.isDeleted && x.locationId === id);
    const inUseByCcdc = ccdcRows.some((x) => !x.isDeleted && x.locationId === id);
    const inUseByTransfer = transferRows.some(
      (x) => !x.isDeleted && (x.fromLocationId === id || x.toLocationId === id)
    );
    if (inUseByEquipment || inUseByCcdc || inUseByTransfer) {
      window.alert("Không thể xoá bếp/site vì đang có dữ liệu tham chiếu.");
      return;
    }
    onSaveLocations(locations.map((x) => (x.id === id ? { ...x, isDeleted: true } : x)));
  }

  const regionMap = Object.fromEntries(regions.map((x) => [x.id, x]));

  return (
    <section className="equipment-section">
      {heading ? <h2 className="equipment-title">{heading}</h2> : null}

      <div className="equipment-card location-master-card">
        <div className="equipment-card-head location-master-card-head">
          <h3>Khu vực</h3>
          <div className="location-master-head-actions">
            <button
              type="button"
              className="location-master-toggle"
              onClick={() => setRegionPanelOpen((v) => !v)}
              aria-expanded={regionPanelOpen}
              aria-controls="location-master-region-body"
              title={regionPanelOpen ? "Thu gọn" : "Mở rộng"}
            >
              <IconCatalogChevron open={regionPanelOpen} />
            </button>
            <button type="button" className="equipment-btn location-master-add-btn" onClick={addRegion}>
              <IconCatalogPlus />
              <span>Thêm khu vực</span>
            </button>
          </div>
        </div>
        <div id="location-master-region-body" className="location-master-card-body" hidden={!regionPanelOpen}>
          <div className="equipment-form-grid">
            <label className="equipment-field">
              <span>Tên khu vực</span>
              <input
                ref={regionNameInputRef}
                value={regionForm.name}
                onChange={(e) => setRegionForm((v) => ({ ...v, name: e.target.value }))}
              />
            </label>
            <label className="equipment-field">
              <span>Ghi chú</span>
              <input
                value={regionForm.note}
                onChange={(e) => setRegionForm((v) => ({ ...v, note: e.target.value }))}
              />
            </label>
          </div>
          <div className="equipment-table-wrap">
            <table className="equipment-table equipment-table--compact">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên khu vực</th>
                  <th>Ghi chú</th>
                  <th>Xoá</th>
                </tr>
              </thead>
              <tbody>
                {regions.filter((x) => !x.isDeleted).map((x, idx) => (
                  <tr key={x.id}>
                    <td>{idx + 1}</td>
                    <td>{x.name}</td>
                    <td>{x.note || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="catalog-flat-del-btn"
                        title="Xoá"
                        aria-label="Xoá"
                        onClick={() => removeRegion(x.id)}
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

      <div className="equipment-card location-master-card">
        <div className="equipment-card-head location-master-card-head">
          <h3>Bếp/Site</h3>
          <div className="location-master-head-actions">
            <button
              type="button"
              className="location-master-toggle"
              onClick={() => setLocationPanelOpen((v) => !v)}
              aria-expanded={locationPanelOpen}
              aria-controls="location-master-location-body"
              title={locationPanelOpen ? "Thu gọn" : "Mở rộng"}
            >
              <IconCatalogChevron open={locationPanelOpen} />
            </button>
            <button type="button" className="equipment-btn location-master-add-btn" onClick={addLocation}>
              <IconCatalogPlus />
              <span>Thêm bếp/site</span>
            </button>
          </div>
        </div>
        <div id="location-master-location-body" className="location-master-card-body" hidden={!locationPanelOpen}>
          <div className="equipment-form-grid equipment-form-grid--4">
            <label className="equipment-field">
              <span>Khu vực</span>
              <select
                ref={locationRegionSelectRef}
                value={locationForm.regionId}
                onChange={(e) => setLocationForm((v) => ({ ...v, regionId: e.target.value }))}
              >
                <option value="">Chọn</option>
                {regions
                  .filter((x) => !x.isDeleted)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="equipment-field">
              <span>Tên bếp/site</span>
              <input
                ref={locationNameInputRef}
                value={locationForm.name}
                onChange={(e) => setLocationForm((v) => ({ ...v, name: e.target.value }))}
              />
            </label>
            <label className="equipment-field">
              <span>Loại</span>
              <select value={locationForm.type} onChange={(e) => setLocationForm((v) => ({ ...v, type: e.target.value }))}>
                <option>Bếp</option>
                <option>Site</option>
                <option>Kho</option>
                <option>Xưởng</option>
              </select>
            </label>
            <label className="equipment-field">
              <span>Ghi chú</span>
              <input
                value={locationForm.note}
                onChange={(e) => setLocationForm((v) => ({ ...v, note: e.target.value }))}
              />
            </label>
          </div>
          <div className="equipment-table-wrap">
            <table className="equipment-table equipment-table--compact">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Khu vực</th>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>Ghi chú</th>
                  <th>Xoá</th>
                </tr>
              </thead>
              <tbody>
                {locations.filter((x) => !x.isDeleted).map((x, idx) => (
                  <tr key={x.id}>
                    <td>{idx + 1}</td>
                    <td>{regionMap[x.regionId]?.name || "—"}</td>
                    <td>{x.name}</td>
                    <td>{x.type}</td>
                    <td>{x.note || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="catalog-flat-del-btn"
                        title="Xoá"
                        aria-label="Xoá"
                        onClick={() => removeLocation(x.id)}
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
  );
}
