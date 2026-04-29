import { useMemo, useState } from "react";

function actionHint(row) {
  const message = String(row.message || "").toLowerCase();
  if (row.group === "Thiết bị" && message.includes("30 ngày")) return "Lập kiểm tra định kỳ và cập nhật nhật ký sửa chữa.";
  if (row.group === "Thiết bị" && message.includes("chi phí")) return "Rà soát chi phí sửa chữa và đánh giá thay thế thiết bị.";
  if (row.group === "CCDC" && message.includes("chưa kiểm kê")) return "Thực hiện kiểm kê tháng và nhập số liệu thực tế.";
  if (row.group === "CCDC" && message.includes("hao hụt")) return "Kiểm tra thất thoát, đối chiếu chứng từ nhập xuất.";
  return "Xác minh hiện trạng và cập nhật xử lý trong ca trực.";
}

export default function AssetAlerts({ rows, onPatchStatus }) {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    region: "",
    location: "",
    level: "",
    group: "",
    status: "",
    keyword: "",
  });

  const regions = useMemo(
    () => Array.from(new Set(rows.map((x) => x.region).filter(Boolean))).sort(),
    [rows]
  );
  const locations = useMemo(
    () => Array.from(new Set(rows.map((x) => x.location).filter(Boolean))).sort(),
    [rows]
  );
  const levels = useMemo(
    () => Array.from(new Set(rows.map((x) => x.level).filter(Boolean))).sort(),
    [rows]
  );
  const groups = useMemo(
    () => Array.from(new Set(rows.map((x) => x.group).filter(Boolean))).sort(),
    [rows]
  );
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((x) => x.status || "Chưa xử lý").filter(Boolean))).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        const detected = String(row.detectedAt || "");
        if (filters.fromDate && detected < filters.fromDate) return false;
        if (filters.toDate && detected > filters.toDate) return false;
        if (filters.region && row.region !== filters.region) return false;
        if (filters.location && row.location !== filters.location) return false;
        if (filters.level && row.level !== filters.level) return false;
        if (filters.group && row.group !== filters.group) return false;
        if (filters.status && (row.status || "Chưa xử lý") !== filters.status) return false;
        if (filters.keyword) {
          const haystack = `${row.message || ""} ${row.region || ""} ${row.location || ""}`.toLowerCase();
          if (!haystack.includes(filters.keyword.toLowerCase())) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => String(b.detectedAt || "").localeCompare(String(a.detectedAt || "")));
  }, [rows, filters]);

  function patchFilter(key, value) {
    setFilters((v) => ({ ...v, [key]: value }));
  }

  return (
    <section className="equipment-section">
      <h2 className="equipment-title">Cảnh báo</h2>
      <div className="equipment-form-grid equipment-form-grid--7">
        <label className="equipment-field">
          <span>Từ ngày</span>
          <input type="date" value={filters.fromDate} onChange={(e) => patchFilter("fromDate", e.target.value)} />
        </label>
        <label className="equipment-field">
          <span>Đến ngày</span>
          <input type="date" value={filters.toDate} onChange={(e) => patchFilter("toDate", e.target.value)} />
        </label>
        <label className="equipment-field">
          <span>Khu vực</span>
          <select value={filters.region} onChange={(e) => patchFilter("region", e.target.value)}>
            <option value="">Tất cả</option>
            {regions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="equipment-field">
          <span>Bếp/Site</span>
          <select value={filters.location} onChange={(e) => patchFilter("location", e.target.value)}>
            <option value="">Tất cả</option>
            {locations.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="equipment-field">
          <span>Mức độ</span>
          <select value={filters.level} onChange={(e) => patchFilter("level", e.target.value)}>
            <option value="">Tất cả</option>
            {levels.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="equipment-field">
          <span>Nhóm</span>
          <select value={filters.group} onChange={(e) => patchFilter("group", e.target.value)}>
            <option value="">Tất cả</option>
            {groups.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="equipment-field">
          <span>Trạng thái xử lý</span>
          <select value={filters.status} onChange={(e) => patchFilter("status", e.target.value)}>
            <option value="">Tất cả</option>
            {statuses.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="equipment-field equipment-field--full">
          <span>Tìm nhanh</span>
          <input
            value={filters.keyword}
            onChange={(e) => patchFilter("keyword", e.target.value)}
            placeholder="Nhập từ khoá: tên cảnh báo, khu vực, bếp/site..."
          />
        </label>
      </div>
      <div className="equipment-card">
        <div className="equipment-table-wrap">
          <table className="equipment-table equipment-table--compact">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mức độ</th>
                <th>Nhóm</th>
                <th>Khu vực</th>
                <th>Bếp/Site</th>
                <th>Nội dung cảnh báo</th>
                <th>Cần làm</th>
                <th>Ngày phát hiện</th>
                <th>Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={`${row.id}-${idx}`}>
                  <td>{idx + 1}</td>
                  <td>
                    <span className={`equipment-status ${row.level === "Nghiêm trọng" ? "danger" : row.level === "Cảnh báo" ? "warn" : "ok"}`}>
                      {row.level}
                    </span>
                  </td>
                  <td>{row.group}</td>
                  <td>{row.region}</td>
                  <td>{row.location}</td>
                  <td>{row.message}</td>
                  <td>{actionHint(row)}</td>
                  <td>{row.detectedAt}</td>
                  <td>
                    <select
                      value={row.status || "Chưa xử lý"}
                      onChange={(e) => {
                        if (typeof onPatchStatus === "function") onPatchStatus(row.id, e.target.value);
                      }}
                    >
                      <option value="Chưa xử lý">Chưa xử lý</option>
                      <option value="Đang xử lý">Đang xử lý</option>
                      <option value="Đã xử lý">Đã xử lý</option>
                      <option value="Theo dõi thêm">Theo dõi thêm</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={9} className="equipment-empty">Không có cảnh báo theo bộ lọc hiện tại.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
