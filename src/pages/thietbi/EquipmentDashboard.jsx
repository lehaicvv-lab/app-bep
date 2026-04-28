import { useMemo, useState } from "react";

function monthKey(dateStr) {
  return String(dateStr || "").slice(0, 7);
}

function previousMonthKey(month) {
  const [y, m] = String(month || "").split("-");
  if (!y || !m) return "";
  const d = new Date(Number(y), Number(m) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function EquipmentDashboard({
  dashboard,
  alerts,
  equipmentRows,
  equipmentSummary,
  ccdcRows,
  ccdcMonthly,
  ccdcReceipts,
}) {
  const currentMonth = monthKey(new Date().toISOString().slice(0, 10));
  const [fromMonth, setFromMonth] = useState(currentMonth);
  const [toMonth, setToMonth] = useState(currentMonth);
  const prevMonth = previousMonthKey(currentMonth);
  const activeRows = ccdcRows.filter((x) => !x.isDeleted);
  const activeEquipments = equipmentRows.filter((x) => !x.isDeleted);

  const allLogs = useMemo(
    () =>
      activeEquipments.flatMap((asset) =>
        (equipmentSummary[asset.id]?.logs || []).map((log) => ({ ...log, assetId: asset.id }))
      ),
    [activeEquipments, equipmentSummary]
  );

  const monthStats = useMemo(() => {
    const monthSet = new Set([currentMonth]);
    allLogs.forEach((x) => monthSet.add(monthKey(x.logDate)));
    ccdcMonthly.forEach((x) => !x.isDeleted && monthSet.add(x.monthKey));
    ccdcReceipts.forEach((x) => !x.isDeleted && monthSet.add(monthKey(x.receiptDate)));

    const months = Array.from(monthSet).filter(Boolean).sort();
    const byMonth = {};

    months.forEach((m) => {
      const logs = allLogs.filter((x) => !x.isDeleted && monthKey(x.logDate) === m);
      const repairCount = logs.length;
      const repairCost = logs.reduce((sum, x) => sum + Number(x.totalCost || 0), 0);
      const brokenSet = new Set(
        logs
          .filter((x) => ["Đang hỏng", "Đang sửa"].includes(x.afterStatus))
          .map((x) => x.assetId)
      );

      const prev = previousMonthKey(m);
      const ccdcLoss = activeRows.reduce((sum, row) => {
        const prevActual = Number(
          ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === prev && !x.isDeleted)?.actualQty || 0
        );
        const prevReceipts = ccdcReceipts
          .filter((x) => x.rowId === row.id && monthKey(x.receiptDate) === prev && !x.isDeleted)
          .reduce((s, x) => s + Number(x.qty || 0), 0);
        const expected = prevActual + prevReceipts;
        const curInv = ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === m && !x.isDeleted);
        if (!curInv) return sum;
        const diff = Number(curInv.actualQty || 0) - expected;
        return diff < 0 ? sum + Math.abs(diff) : sum;
      }, 0);

      const ccdcUnchecked = activeRows.filter(
        (row) => !ccdcMonthly.some((x) => x.rowId === row.id && x.monthKey === m && !x.isDeleted)
      ).length;

      byMonth[m] = {
        month: m,
        repairCount,
        repairCost,
        brokenCount: brokenSet.size,
        ccdcLoss,
        ccdcUnchecked,
      };
    });

    return { months, byMonth };
  }, [allLogs, activeRows, ccdcMonthly, ccdcReceipts, currentMonth]);

  const rangedMonths = useMemo(() => {
    if (!fromMonth || !toMonth || fromMonth > toMonth) return [];
    return monthStats.months.filter((m) => m >= fromMonth && m <= toMonth);
  }, [monthStats.months, fromMonth, toMonth]);

  const selectedStats = useMemo(() => {
    const base = {
      month: `${fromMonth} → ${toMonth}`,
      repairCount: 0,
      repairCost: 0,
      brokenCount: 0,
      ccdcLoss: 0,
      ccdcUnchecked: 0,
    };
    if (!rangedMonths.length) return base;
    return rangedMonths.reduce((acc, m) => {
      const cur = monthStats.byMonth[m] || {};
      return {
        ...acc,
        repairCount: acc.repairCount + Number(cur.repairCount || 0),
        repairCost: acc.repairCost + Number(cur.repairCost || 0),
        brokenCount: acc.brokenCount + Number(cur.brokenCount || 0),
        ccdcLoss: acc.ccdcLoss + Number(cur.ccdcLoss || 0),
        ccdcUnchecked: acc.ccdcUnchecked + Number(cur.ccdcUnchecked || 0),
      };
    }, base);
  }, [monthStats.byMonth, rangedMonths, fromMonth, toMonth]);

  const monthlyHealthNote =
    selectedStats.brokenCount > 0 || selectedStats.ccdcUnchecked > 0 || selectedStats.ccdcLoss > 0
      ? `Giai đoạn ${fromMonth} đến ${toMonth} có vấn đề: còn ${selectedStats.brokenCount} thiết bị rủi ro, ${selectedStats.ccdcUnchecked} CCDC chưa kiểm kê.`
      : `Giai đoạn ${fromMonth} đến ${toMonth} vận hành ổn định: không có cảnh báo thiếu kiểm kê hoặc thiết bị rủi ro nổi bật.`;

  const chartMonths = useMemo(() => {
    if (!rangedMonths.length) return monthStats.months.slice(-6);
    return rangedMonths.slice(-6);
  }, [rangedMonths, monthStats.months]);

  const maxCost = Math.max(1, ...chartMonths.map((m) => monthStats.byMonth[m]?.repairCost || 0));
  const maxCount = Math.max(1, ...chartMonths.map((m) => monthStats.byMonth[m]?.repairCount || 0));
  const topEquipment = equipmentRows
    .filter((x) => !x.isDeleted)
    .map((x) => ({
      id: x.id,
      name: x.name,
      code: x.code,
      status: equipmentSummary[x.id]?.currentStatus || "Hoạt động tốt",
      cost: Number(equipmentSummary[x.id]?.totalCost || 0),
      lastCheckDate: equipmentSummary[x.id]?.lastCheckDate || "",
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 6);

  const ccdcLossRows = ccdcRows
    .filter((x) => !x.isDeleted)
    .map((row) => {
      const prevActual = Number(ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === prevMonth && !x.isDeleted)?.actualQty || 0);
      const prevReceipts = ccdcReceipts
        .filter((x) => x.rowId === row.id && monthKey(x.receiptDate) === prevMonth && !x.isDeleted)
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);
      const expected = prevActual + prevReceipts;
      const current = ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === currentMonth && !x.isDeleted);
      if (!current) return null;
      const actual = Number(current.actualQty || 0);
      const diff = actual - expected;
      return { name: row.itemName, diff };
    })
    .filter(Boolean)
    .filter((x) => x.diff < 0)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 4);

  const topActions = useMemo(() => {
    const items = [];

    topEquipment
      .filter((x) => ["Đang hỏng", "Đang sửa"].includes(x.status))
      .forEach((row) => {
        items.push({
          key: `eq-risk-${row.id}`,
          group: "Thiết bị hỏng",
          content: `${row.name || "Thiết bị chưa đặt tên"} (${row.code || "—"})`,
          level: "Nghiêm trọng",
          action: "Tạo lệnh sửa chữa và phân công kỹ thuật ngay.",
          priority: 1,
        });
      });

    ccdcLossRows.forEach((row, idx) => {
      items.push({
        key: `ccdc-loss-${idx}`,
        group: "CCDC thất thoát",
        content: `${row.name || "CCDC chưa đặt tên"} (thiếu ${Math.abs(row.diff)})`,
        level: "Cảnh báo",
        action: "Đối chiếu nhập-xuất và kiểm kê thực tế trong ca.",
        priority: 2,
      });
    });

    topEquipment
      .filter((x) => !x.lastCheckDate || (new Date() - new Date(x.lastCheckDate)) / 86400000 > 30)
      .slice(0, 4)
      .forEach((row) => {
        items.push({
          key: `overdue-${row.id}`,
          group: "Quá hạn kiểm tra",
          content: `${row.name || "Thiết bị chưa đặt tên"} (${row.code || "—"})`,
          level: "Cảnh báo",
          action: "Lập lịch kiểm tra định kỳ và cập nhật biên bản kiểm tra.",
          priority: 3,
        });
      });

    topEquipment
      .filter((x) => x.cost > 5000000)
      .slice(0, 3)
      .forEach((row) => {
        items.push({
          key: `high-cost-${row.id}`,
          group: "Chi phí sửa cao",
          content: `${row.name || "Thiết bị chưa đặt tên"} (${row.cost.toLocaleString("vi-VN")}đ)`,
          level: "Theo dõi",
          action: "Rà soát sửa tiếp hay thay mới theo ngưỡng chi phí.",
          priority: 4,
        });
      });

    return items
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 10);
  }, [topEquipment, ccdcLossRows]);

  return (
    <section className="equipment-section">
      <h2 className="equipment-title">Tổng quan thiết bị</h2>
      <div className="equipment-stat-grid">
        <article className="equipment-stat-card"><span>Tổng thiết bị lớn</span><strong>{dashboard.totalEquipment}</strong></article>
        <article className="equipment-stat-card"><span>Thiết bị hoạt động tốt</span><strong>{dashboard.goodEquipment}</strong></article>
        <article className="equipment-stat-card"><span>Thiết bị cần theo dõi</span><strong>{dashboard.needFollow}</strong></article>
        <article className="equipment-stat-card"><span>Thiết bị đang hỏng/đang sửa</span><strong>{dashboard.brokenOrRepairing}</strong></article>
        <article className="equipment-stat-card"><span>Tổng CCDC</span><strong>{dashboard.totalCcdc}</strong></article>
        <article className="equipment-stat-card"><span>CCDC hao hụt tháng này</span><strong>{dashboard.ccdcLossThisMonth}</strong></article>
        <article className="equipment-stat-card"><span>Tổng chi phí xử lý thiết bị</span><strong>{Number(dashboard.totalCost || 0).toLocaleString("vi-VN")}đ</strong></article>
        <article className="equipment-stat-card"><span>Cảnh báo nghiêm trọng</span><strong>{dashboard.severeAlerts}</strong></article>
      </div>

      <div className="equipment-card">
        <div className="equipment-card-head">
          <h3>Đánh giá theo giai đoạn tháng</h3>
        </div>
        <div className="equipment-month-range">
          <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
          <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
        </div>
        <div className="equipment-stat-grid">
          <article className="equipment-stat-card"><span>Số lần sửa chữa</span><strong>{selectedStats.repairCount}</strong></article>
          <article className="equipment-stat-card"><span>Chi phí sửa chữa</span><strong>{Number(selectedStats.repairCost || 0).toLocaleString("vi-VN")}đ</strong></article>
          <article className="equipment-stat-card"><span>Thiết bị rủi ro</span><strong>{selectedStats.brokenCount}</strong></article>
          <article className="equipment-stat-card"><span>CCDC chưa kiểm kê</span><strong>{selectedStats.ccdcUnchecked}</strong></article>
        </div>
        <p className={`equipment-month-note ${selectedStats.brokenCount > 0 || selectedStats.ccdcUnchecked > 0 || selectedStats.ccdcLoss > 0 ? "warn" : "ok"}`}>
          {monthlyHealthNote}
        </p>
      </div>

      <div className="equipment-card">
        <div className="equipment-card-head">
          <h3>Biểu đồ 6 tháng gần nhất</h3>
        </div>
        <div className="equipment-trend-grid">
          <div>
            <strong className="equipment-trend-title">Chi phí sửa chữa</strong>
            {chartMonths.map((m) => {
              const v = monthStats.byMonth[m]?.repairCost || 0;
              return (
                <div className="equipment-trend-row" key={`cost-${m}`}>
                  <span>{m}</span>
                  <div className="equipment-trend-bar"><i style={{ width: `${(v / maxCost) * 100}%` }} /></div>
                  <b>{Number(v).toLocaleString("vi-VN")}đ</b>
                </div>
              );
            })}
          </div>
          <div>
            <strong className="equipment-trend-title">Số lần sửa chữa</strong>
            {chartMonths.map((m) => {
              const v = monthStats.byMonth[m]?.repairCount || 0;
              return (
                <div className="equipment-trend-row" key={`count-${m}`}>
                  <span>{m}</span>
                  <div className="equipment-trend-bar"><i style={{ width: `${(v / maxCount) * 100}%` }} /></div>
                  <b>{v}</b>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="equipment-card">
        <div className="equipment-card-head">
          <h3>Top cần xử lý</h3>
        </div>
        <div className="equipment-table-wrap">
          <table className="equipment-table equipment-table--compact equipment-table--action">
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Nội dung</th>
                <th>Mức độ</th>
                <th>Hành động đề xuất</th>
              </tr>
            </thead>
            <tbody>
              {topActions.map((row) => (
                <tr key={row.key}>
                  <td>{row.group}</td>
                  <td>{row.content}</td>
                  <td>
                    <span className={`equipment-status ${row.level === "Nghiêm trọng" ? "danger" : row.level === "Cảnh báo" ? "warn" : "ok"}`}>
                      {row.level}
                    </span>
                  </td>
                  <td>{row.action}</td>
                </tr>
              ))}
              {!topActions.length && (
                <tr>
                  <td colSpan={4} className="equipment-empty">Chưa có đầu việc ưu tiên trong kỳ này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
