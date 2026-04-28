import MaintenanceLog from "./MaintenanceLog";

function statusClass(status) {
  if (status === "Đang hỏng") return "danger";
  if (status === "Cần theo dõi") return "warn";
  if (status === "Ngừng sử dụng") return "muted";
  return "ok";
}

export default function EquipmentTable({
  rows,
  expandedId,
  setExpandedId,
  maintenanceByEquipment,
  summaryByEquipment,
  onEdit,
  onDelete,
  onAddMaintenance,
}) {
  return (
    <div className="equipment-table-wrap">
      <table className="equipment-table">
        <thead>
          <tr>
            <th className="name-col">Tên thiết bị</th>
            <th>Mã thiết bị</th>
            <th>Ngày sử dụng</th>
            <th>Người phụ trách</th>
            <th>Trạng thái hiện tại</th>
            <th>Lần bảo trì gần nhất</th>
            <th>Tổng chi phí sửa</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="equipment-empty-cell">Chưa có thiết bị.</td>
            </tr>
          ) : (
            rows.map((row) => {
              const summary = summaryByEquipment[row.id] || { count: 0, totalCost: 0, lastDate: "—", status: row.tinhTrang || "Hoạt động tốt" };
              const isOpen = expandedId === row.id;
              return (
                <>
                  <tr key={row.id}>
                    <td className="name-col">{row.tenThietBi}</td>
                    <td>{row.maThietBi}</td>
                    <td>{row.ngaySuDung || "—"}</td>
                    <td>{row.nguoiPhuTrach || "—"}</td>
                    <td>
                      <span className={`equipment-status ${statusClass(summary.status)}`}>{summary.status}</span>
                    </td>
                    <td>{summary.lastDate}</td>
                    <td>{summary.totalCost.toLocaleString("vi-VN")}</td>
                    <td>
                      <button className="equipment-icon-btn" onClick={() => setExpandedId(isOpen ? "" : row.id)} title="Số lần sửa">
                        {summary.count}
                      </button>
                      <button className="equipment-icon-btn" onClick={() => onEdit(row)} title="Sửa">✎</button>
                      <button className="equipment-icon-btn" onClick={() => onDelete(row.id)} title="Xóa">🗑</button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr key={`${row.id}-expand`}>
                      <td colSpan={8}>
                        <MaintenanceLog
                          equipmentId={row.id}
                          logs={maintenanceByEquipment[row.id] || []}
                          onAddLog={onAddMaintenance}
                        />
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
