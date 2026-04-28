const STATUS_AFTER_REPAIR = ["Hoạt động tốt", "Cần theo dõi", "Đang hỏng"];

function emptyLog(equipmentId = "") {
  return {
    ngay: "",
    equipmentId,
    loi: "",
    nguyenNhan: "",
    cachXuLy: "",
    vatTuThayThe: "",
    chiPhi: "",
    trangThaiSauSua: "Hoạt động tốt",
  };
}

export default function MaintenanceLog({
  equipmentId,
  logs,
  onAddLog,
}) {
  const formId = `log-form-${equipmentId}`;
  const startAdd = () => {
    const root = document.getElementById(formId);
    if (!root) return;
    root.dataset.active = "true";
  };

  const cancelAdd = () => {
    const root = document.getElementById(formId);
    if (!root) return;
    root.dataset.active = "false";
    root.reset();
  };

  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const row = {
      ...emptyLog(equipmentId),
      ngay: String(data.get("ngay") || ""),
      loi: String(data.get("loi") || "").trim(),
      nguyenNhan: String(data.get("nguyenNhan") || "").trim(),
      cachXuLy: String(data.get("cachXuLy") || "").trim(),
      vatTuThayThe: String(data.get("vatTuThayThe") || "").trim(),
      chiPhi: String(data.get("chiPhi") || "0"),
      trangThaiSauSua: String(data.get("trangThaiSauSua") || "Hoạt động tốt"),
    };
    if (!row.ngay || !row.loi) return;
    onAddLog(row);
    cancelAdd();
  };

  return (
    <div className="equipment-expand-box">
      <div className="equipment-expand-head">
        <strong>Lịch sử sửa chữa</strong>
        <button type="button" className="equipment-icon-btn" onClick={startAdd} title="Thêm sửa chữa">
          ＋
        </button>
      </div>

      <table className="equipment-table equipment-table--compact">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Lỗi</th>
            <th>Nguyên nhân</th>
            <th>Cách xử lý</th>
            <th>Vật tư</th>
            <th>Chi phí</th>
            <th>Sau sửa</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="equipment-empty-cell">Chưa có lịch sử sửa chữa.</td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td>{log.ngay}</td>
                <td>{log.loi}</td>
                <td>{log.nguyenNhan}</td>
                <td>{log.cachXuLy}</td>
                <td>{log.vatTuThayThe || "—"}</td>
                <td>{Number(log.chiPhi || 0).toLocaleString("vi-VN")}</td>
                <td>{log.trangThaiSauSua}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <form id={formId} className="equipment-inline-form" data-active="false" onSubmit={submit}>
        <div className="equipment-form-grid">
          <label className="equipment-field"><span>Ngày</span><input name="ngay" type="date" /></label>
          <label className="equipment-field"><span>Lỗi</span><input name="loi" /></label>
          <label className="equipment-field"><span>Nguyên nhân</span><input name="nguyenNhan" /></label>
          <label className="equipment-field"><span>Cách xử lý</span><input name="cachXuLy" /></label>
          <label className="equipment-field"><span>Vật tư thay thế</span><input name="vatTuThayThe" /></label>
          <label className="equipment-field"><span>Chi phí</span><input name="chiPhi" type="number" /></label>
          <label className="equipment-field">
            <span>Trạng thái sau sửa</span>
            <select name="trangThaiSauSua">
              {STATUS_AFTER_REPAIR.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="equipment-actions">
          <button type="submit">Lưu sửa chữa</button>
          <button type="button" onClick={cancelAdd}>Hủy</button>
        </div>
      </form>
    </div>
  );
}
