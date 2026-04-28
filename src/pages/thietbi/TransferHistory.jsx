import { useState } from "react";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function TransferHistory({ rows, equipmentRows, ccdcRows, locations, onSaveRows }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    itemType: "Thiết bị",
    itemId: "",
    fromLocationId: "",
    toLocationId: "",
    qty: 1,
    receiver: "",
    reason: "",
    note: "",
  });

  const activeRows = rows.filter((x) => !x.isDeleted);
  const itemOptions = (form.itemType === "Thiết bị" ? equipmentRows : ccdcRows).filter((x) => !x.isDeleted);
  const locationMap = Object.fromEntries(locations.map((x) => [x.id, x]));

  function patch(key, value) {
    setForm((v) => ({ ...v, [key]: value }));
  }

  function add() {
    if (!form.itemId) return;
    const item = itemOptions.find((x) => x.id === form.itemId);
    const now = new Date().toISOString();
    const row = {
      id: uid(),
      date: form.date,
      itemType: form.itemType,
      itemId: form.itemId,
      itemName: item?.name || item?.itemName || item?.code || "",
      fromLocationId: form.fromLocationId,
      toLocationId: form.toLocationId,
      qty: Number(form.qty || 0),
      receiver: form.receiver,
      reason: form.reason,
      note: form.note,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    onSaveRows([row, ...rows]);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      itemType: form.itemType,
      itemId: "",
      fromLocationId: "",
      toLocationId: "",
      qty: 1,
      receiver: "",
      reason: "",
      note: "",
    });
  }

  function softDelete(id) {
    onSaveRows(rows.map((x) => (x.id === id ? { ...x, isDeleted: true, updatedAt: new Date().toISOString() } : x)));
  }

  return (
    <section className="equipment-section">
      <h2 className="equipment-title">Cấp phát / điều chuyển</h2>
      <div className="equipment-form-grid equipment-form-grid--5">
        <label className="equipment-field"><span>Ngày</span><input type="date" value={form.date} onChange={(e) => patch("date", e.target.value)} /></label>
        <label className="equipment-field"><span>Loại</span><select value={form.itemType} onChange={(e) => patch("itemType", e.target.value)}><option>Thiết bị</option><option>CCDC</option></select></label>
        <label className="equipment-field"><span>Tên</span><select value={form.itemId} onChange={(e) => patch("itemId", e.target.value)}><option value="">Chọn</option>{itemOptions.map((x) => <option key={x.id} value={x.id}>{x.name || x.itemName || x.code}</option>)}</select></label>
        <label className="equipment-field"><span>Từ</span><select value={form.fromLocationId} onChange={(e) => patch("fromLocationId", e.target.value)}><option value="">Chọn</option>{locations.filter((x) => !x.isDeleted).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="equipment-field"><span>Đến</span><select value={form.toLocationId} onChange={(e) => patch("toLocationId", e.target.value)}><option value="">Chọn</option>{locations.filter((x) => !x.isDeleted).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        <label className="equipment-field"><span>Số lượng</span><input type="number" value={form.qty} onChange={(e) => patch("qty", e.target.value)} /></label>
        <label className="equipment-field"><span>Người nhận</span><input value={form.receiver} onChange={(e) => patch("receiver", e.target.value)} /></label>
        <label className="equipment-field"><span>Lý do</span><input value={form.reason} onChange={(e) => patch("reason", e.target.value)} /></label>
        <label className="equipment-field equipment-field--full"><span>Ghi chú</span><input value={form.note} onChange={(e) => patch("note", e.target.value)} /></label>
      </div>
      <div className="equipment-actions">
        <button className="equipment-btn" onClick={add}>+ Ghi nhận điều chuyển</button>
      </div>

      <div className="equipment-card">
        <div className="equipment-table-wrap">
          <table className="equipment-table equipment-table--compact">
            <thead>
              <tr><th>Ngày</th><th>Loại</th><th>Tên</th><th>Từ</th><th>Đến</th><th>Số lượng</th><th>Người nhận</th><th>Lý do</th><th>Ghi chú</th><th>Thao tác</th></tr>
            </thead>
            <tbody>
              {activeRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.date || "—"}</td>
                  <td>{row.itemType || "—"}</td>
                  <td>{row.itemName || "—"}</td>
                  <td>{locationMap[row.fromLocationId]?.name || "—"}</td>
                  <td>{locationMap[row.toLocationId]?.name || "—"}</td>
                  <td>{row.qty || 0}</td>
                  <td>{row.receiver || "—"}</td>
                  <td>{row.reason || "—"}</td>
                  <td>{row.note || "—"}</td>
                  <td><button className="equipment-btn equipment-btn--icon danger" title="Xoá" onClick={() => softDelete(row.id)}>🗑</button></td>
                </tr>
              ))}
              {!activeRows.length && <tr><td colSpan={10} className="equipment-empty">Chưa có lịch sử cấp phát / điều chuyển.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
