import { useEffect, useMemo, useState } from "react";
import "./Thietbi.css";
import EquipmentDashboard from "./thietbi/EquipmentDashboard";
import EquipmentLarge from "./thietbi/EquipmentLarge";
import CCDCInventory from "./thietbi/CCDCInventory";
import EquipmentLogs from "./thietbi/EquipmentLogs";
import TransferHistory from "./thietbi/TransferHistory";
import AssetAlerts from "./thietbi/AssetAlerts";
import LocationMaster from "./thietbi/LocationMaster";

const KEYS = {
  regions: "asset_regions",
  locations: "asset_locations",
  ccdcRows: "asset_tree_rows",
  ccdcMonthly: "asset_monthly_inventory",
  ccdcReceipts: "asset_ccdc_receipts",
  equipment: "asset_equipment_list",
  equipmentLogs: "asset_equipment_logs",
  transferHistory: "asset_transfer_history",
};

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

function writeArray(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function monthKey(dateStr) {
  const [y, m] = String(dateStr || "").slice(0, 7).split("-");
  return y && m ? `${y}-${m}` : "";
}

function previousMonthKey(month) {
  const [y, m] = String(month || "").split("-");
  if (!y || !m) return "";
  const d = new Date(Number(y), Number(m) - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calcEquipmentSummary(equipmentRows, equipmentLogs) {
  const activeLogs = equipmentLogs.filter((x) => !x.isDeleted);
  const byAsset = activeLogs.reduce((acc, row) => {
    if (!acc[row.assetId]) acc[row.assetId] = [];
    acc[row.assetId].push(row);
    return acc;
  }, {});
  const summary = {};
  equipmentRows.filter((x) => !x.isDeleted).forEach((asset) => {
    const logs = (byAsset[asset.id] || []).slice().sort((a, b) => String(b.logDate).localeCompare(String(a.logDate)));
    const totalCost = logs.reduce((sum, x) => sum + Number(x.totalCost || 0), 0);
    const last = logs[0];
    const lastCheck = logs.find((x) => ["Kiểm tra định kỳ", "Bảo trì", "Sửa chữa"].includes(x.processType));
    summary[asset.id] = {
      count: logs.length,
      totalCost,
      currentStatus: last?.afterStatus || asset.currentStatus || "Hoạt động tốt",
      lastMaintenanceDate: last?.logDate || "",
      lastCheckDate: lastCheck?.logDate || "",
      logs,
    };
  });
  return summary;
}

function deriveAlerts({ regions, locations, equipmentRows, equipmentSummary, ccdcRows, ccdcMonthly, ccdcReceipts }) {
  const alerts = [];
  const now = new Date();
  const currentMonth = monthKey(now.toISOString().slice(0, 10));
  const prevMonth = previousMonthKey(currentMonth);
  const locById = Object.fromEntries(locations.map((x) => [x.id, x]));
  const regionById = Object.fromEntries(regions.map((x) => [x.id, x]));

  equipmentRows
    .filter((x) => !x.isDeleted)
    .forEach((asset) => {
      const s = equipmentSummary[asset.id];
      const status = s?.currentStatus || "Hoạt động tốt";
      const loc = locById[asset.locationId];
      const region = regionById[asset.regionId];

      if (["Đang hỏng", "Đang sửa", "Đề xuất thay thế"].includes(status)) {
        alerts.push({
          id: uid(),
          level: status === "Đề xuất thay thế" ? "Cảnh báo" : "Nghiêm trọng",
          group: "Thiết bị",
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} đang ở trạng thái ${status}`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        });
      }

      if (!s?.lastCheckDate || (now - new Date(s.lastCheckDate)) / 86400000 > 30) {
        alerts.push({
          id: uid(),
          level: "Cảnh báo",
          group: "Thiết bị",
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} quá 30 ngày chưa kiểm tra`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        });
      }

      const logsThisMonth = (s?.logs || []).filter((x) => monthKey(x.logDate) === currentMonth);
      if (logsThisMonth.length > 3) {
        alerts.push({
          id: uid(),
          level: "Nghiêm trọng",
          group: "Thiết bị",
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} xử lý ${logsThisMonth.length} lần trong tháng`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        });
      }

      if ((s?.totalCost || 0) > 10000000) {
        alerts.push({
          id: uid(),
          level: "Theo dõi",
          group: "Thiết bị",
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} có chi phí xử lý cao (${s.totalCost.toLocaleString("vi-VN")}đ)`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        });
      }
    });

  const rowsById = Object.fromEntries(ccdcRows.filter((x) => !x.isDeleted).map((x) => [x.id, x]));
  ccdcRows
    .filter((x) => !x.isDeleted)
    .forEach((row) => {
      const region = regionById[row.regionId];
      const loc = locById[row.locationId];
      const prevInv = ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === prevMonth && !x.isDeleted);
      const prevActual = Number(prevInv?.actualQty || 0);
      const prevReceipts = ccdcReceipts
        .filter((x) => x.rowId === row.id && monthKey(x.receiptDate) === prevMonth && !x.isDeleted)
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);
      const expected = prevActual + prevReceipts;
      const curInv = ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === currentMonth && !x.isDeleted);
      const actual = Number(curInv?.actualQty || 0);

      if (!curInv) {
        alerts.push({
          id: uid(),
          level: "Theo dõi",
          group: "CCDC",
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${row.itemName} chưa kiểm kê tháng ${currentMonth}`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        });
      } else {
        const diff = actual - expected;
        const rate = expected > 0 ? (diff / expected) * 100 : 0;
        if (diff < 0) {
          alerts.push({
            id: uid(),
            level: Math.abs(rate) > 20 ? "Nghiêm trọng" : "Cảnh báo",
            group: "CCDC",
            region: region?.name || "—",
            location: loc?.name || "—",
            message: `${rowsById[row.id]?.itemName || row.itemName} hao hụt ${Math.abs(diff)}`,
            detectedAt: now.toISOString().slice(0, 10),
            status: "Chưa xử lý",
          });
        }
      }
    });

  return alerts;
}

function buildDashboard(cardsSource) {
  return {
    totalEquipment: cardsSource.totalEquipment,
    goodEquipment: cardsSource.goodEquipment,
    needFollow: cardsSource.needFollow,
    brokenOrRepairing: cardsSource.brokenOrRepairing,
    totalCcdc: cardsSource.totalCcdc,
    ccdcLossThisMonth: cardsSource.ccdcLossThisMonth,
    totalCost: cardsSource.totalCost,
    severeAlerts: cardsSource.severeAlerts,
  };
}

export default function Thietbi({ initialTab = "overview" }) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const [regions, setRegions] = useState(() => readArray(KEYS.regions));
  const [locations, setLocations] = useState(() => readArray(KEYS.locations));
  const [ccdcRows, setCcdcRows] = useState(() => readArray(KEYS.ccdcRows));
  const [ccdcMonthly, setCcdcMonthly] = useState(() => readArray(KEYS.ccdcMonthly));
  const [ccdcReceipts, setCcdcReceipts] = useState(() => readArray(KEYS.ccdcReceipts));
  const [equipmentRows, setEquipmentRows] = useState(() => {
    const direct = readArray(KEYS.equipment);
    if (direct.length) return direct;
    return readArray("equipment_list");
  });
  const [equipmentLogs, setEquipmentLogs] = useState(() => {
    const direct = readArray(KEYS.equipmentLogs);
    if (direct.length) return direct;
    return readArray("equipment_maintenance_history").map((x) => ({
      id: x.id || uid(),
      assetId: x.equipmentId || "",
      logDate: x.ngayPhatSinh || "",
      processType: "Sửa chữa",
      issue: x.tinhTrangTruocSua || "",
      cause: "",
      solution: x.noiDungSuaChua || "",
      material: "",
      unitPrice: x.chiPhi || 0,
      qty: 1,
      totalCost: x.chiPhi || 0,
      technician: x.donViSua || "",
      afterStatus: x.trangThaiSauSua || "Hoạt động tốt",
      note: x.ghiChu || "",
      createdAt: x.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    }));
  });
  const [transferHistory, setTransferHistory] = useState(() => readArray(KEYS.transferHistory));

  const equipmentSummary = useMemo(
    () => calcEquipmentSummary(equipmentRows, equipmentLogs),
    [equipmentRows, equipmentLogs]
  );

  const currentMonth = monthKey(new Date().toISOString().slice(0, 10));
  const prevMonth = previousMonthKey(currentMonth);
  const ccdcLossThisMonth = useMemo(() => {
    return ccdcRows
      .filter((x) => !x.isDeleted)
      .reduce((sum, row) => {
        const prevActual = Number(ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === prevMonth && !x.isDeleted)?.actualQty || 0);
        const prevReceipts = ccdcReceipts
          .filter((x) => x.rowId === row.id && monthKey(x.receiptDate) === prevMonth && !x.isDeleted)
          .reduce((s, x) => s + Number(x.qty || 0), 0);
        const expected = prevActual + prevReceipts;
        const cur = ccdcMonthly.find((x) => x.rowId === row.id && x.monthKey === currentMonth && !x.isDeleted);
        if (!cur) return sum;
        const diff = Number(cur.actualQty || 0) - expected;
        return diff < 0 ? sum + Math.abs(diff) : sum;
      }, 0);
  }, [ccdcRows, ccdcMonthly, ccdcReceipts, prevMonth, currentMonth]);

  const alerts = useMemo(
    () =>
      deriveAlerts({
        regions,
        locations,
        equipmentRows,
        equipmentSummary,
        ccdcRows,
        ccdcMonthly,
        ccdcReceipts,
      }),
    [regions, locations, equipmentRows, equipmentSummary, ccdcRows, ccdcMonthly, ccdcReceipts]
  );

  const dashboardData = useMemo(() => {
    const activeEquipments = equipmentRows.filter((x) => !x.isDeleted);
    const statuses = activeEquipments.map((x) => equipmentSummary[x.id]?.currentStatus || "Hoạt động tốt");
    const totalCost = Object.values(equipmentSummary).reduce((sum, x) => sum + Number(x.totalCost || 0), 0);
    return buildDashboard({
      totalEquipment: activeEquipments.length,
      goodEquipment: statuses.filter((x) => x === "Hoạt động tốt").length,
      needFollow: statuses.filter((x) => x === "Cần theo dõi" || x === "Cần bảo trì").length,
      brokenOrRepairing: statuses.filter((x) => ["Đang hỏng", "Đang sửa"].includes(x)).length,
      totalCcdc: ccdcRows.filter((x) => !x.isDeleted).length,
      ccdcLossThisMonth,
      totalCost,
      severeAlerts: alerts.filter((x) => x.level === "Nghiêm trọng").length,
    });
  }, [equipmentRows, equipmentSummary, ccdcRows, ccdcLossThisMonth, alerts]);

  const equipmentById = useMemo(() => Object.fromEntries(equipmentRows.map((x) => [x.id, x])), [equipmentRows]);

  const saveRegions = (rows) => {
    setRegions(rows);
    writeArray(KEYS.regions, rows);
  };
  const saveLocations = (rows) => {
    setLocations(rows);
    writeArray(KEYS.locations, rows);
  };
  const saveCcdcRows = (rows) => {
    setCcdcRows(rows);
    writeArray(KEYS.ccdcRows, rows);
  };
  const saveCcdcMonthly = (rows) => {
    setCcdcMonthly(rows);
    writeArray(KEYS.ccdcMonthly, rows);
  };
  const saveCcdcReceipts = (rows) => {
    setCcdcReceipts(rows);
    writeArray(KEYS.ccdcReceipts, rows);
  };
  const saveEquipments = (rows) => {
    setEquipmentRows(rows);
    writeArray(KEYS.equipment, rows);
  };
  const saveLogs = (rows) => {
    setEquipmentLogs(rows);
    writeArray(KEYS.equipmentLogs, rows);
  };
  const saveTransfers = (rows) => {
    setTransferHistory(rows);
    writeArray(KEYS.transferHistory, rows);
  };

  return (
    <div className="equipment-page">
      {tab === "overview" && (
        <EquipmentDashboard
          dashboard={dashboardData}
          alerts={alerts}
          equipmentRows={equipmentRows}
          equipmentSummary={equipmentSummary}
          ccdcRows={ccdcRows}
          ccdcMonthly={ccdcMonthly}
          ccdcReceipts={ccdcReceipts}
        />
      )}

      {tab === "equipment" && (
        <EquipmentLarge
          equipmentRows={equipmentRows}
          equipmentSummary={equipmentSummary}
          equipmentLogs={equipmentLogs}
          regions={regions}
          locations={locations}
          onSaveEquipments={saveEquipments}
          onSaveLogs={saveLogs}
        />
      )}

      {tab === "ccdc" && (
        <CCDCInventory
          regions={regions}
          locations={locations}
          rows={ccdcRows}
          monthly={ccdcMonthly}
          receipts={ccdcReceipts}
          onSaveRows={saveCcdcRows}
          onSaveMonthly={saveCcdcMonthly}
          onSaveReceipts={saveCcdcReceipts}
        />
      )}

      {tab === "repairs" && (
        <EquipmentLogs
          logs={equipmentLogs}
          equipmentById={equipmentById}
          regions={regions}
          locations={locations}
          onSaveLogs={saveLogs}
        />
      )}

      {tab === "transfers" && (
        <TransferHistory
          rows={transferHistory}
          equipmentRows={equipmentRows}
          ccdcRows={ccdcRows}
          locations={locations}
          onSaveRows={saveTransfers}
        />
      )}

      {tab === "alerts" && <AssetAlerts rows={alerts} />}

      {tab === "catalog" && (
        <LocationMaster
          regions={regions}
          locations={locations}
          onSaveRegions={saveRegions}
          onSaveLocations={saveLocations}
        />
      )}
    </div>
  );
}
