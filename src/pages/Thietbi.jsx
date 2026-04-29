import { useEffect, useMemo, useState } from "react";
import "./Thietbi.css";
import EquipmentDashboard from "./thietbi/EquipmentDashboard";
import EquipmentLarge from "./thietbi/EquipmentLarge";
import CCDCInventory from "./thietbi/CCDCInventory";
import EquipmentLogs from "./thietbi/EquipmentLogs";
import TransferHistory from "./thietbi/TransferHistory";
import AssetAlerts from "./thietbi/AssetAlerts";
import ModuleShell from "../components/ModuleShell";
import { loadLocations, loadRegions, MASTER_DATA_CHANGE } from "../systemCatalog/masterData.js";

const KEYS = {
  regions: "asset_regions",
  locations: "asset_locations",
  ccdcRows: "asset_tree_rows",
  ccdcMonthly: "asset_monthly_inventory",
  ccdcReceipts: "asset_ccdc_receipts",
  equipment: "asset_equipment_list",
  equipmentLogs: "asset_equipment_logs",
  transferHistory: "asset_transfer_history",
  alertStates: "asset_alert_states",
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

function stableAlertId(parts) {
  return parts.map((x) => String(x || "").trim().toLowerCase()).join("|");
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

function deriveAlerts({
  regions,
  locations,
  equipmentRows,
  equipmentSummary,
  ccdcRows,
  ccdcMonthly,
  ccdcReceipts,
  alertStates,
}) {
  const alerts = [];
  const now = new Date();
  const currentMonth = monthKey(now.toISOString().slice(0, 10));
  const prevMonth = previousMonthKey(currentMonth);
  const locById = Object.fromEntries(locations.map((x) => [x.id, x]));
  const regionById = Object.fromEntries(regions.map((x) => [x.id, x]));
  const monthlyByRowMonth = new Map(
    ccdcMonthly.filter((x) => !x.isDeleted).map((x) => [`${x.rowId}|${x.monthKey}`, x])
  );
  const receiptQtyByRowMonth = ccdcReceipts
    .filter((x) => !x.isDeleted)
    .reduce((acc, x) => {
      const key = `${x.rowId}|${monthKey(x.receiptDate)}`;
      acc.set(key, (acc.get(key) || 0) + Number(x.qty || 0));
      return acc;
    }, new Map());

  function pushAlert(base, keyParts) {
    const id = stableAlertId(keyParts);
    alerts.push({
      ...base,
      id,
      status: alertStates[id] || base.status || "Chưa xử lý",
    });
  }

  equipmentRows
    .filter((x) => !x.isDeleted)
    .forEach((asset) => {
      const s = equipmentSummary[asset.id];
      const status = s?.currentStatus || "Hoạt động tốt";
      const loc = locById[asset.locationId];
      const region = regionById[asset.regionId];

      if (["Đang hỏng", "Đang sửa", "Đề xuất thay thế"].includes(status)) {
        pushAlert({
          level: status === "Đề xuất thay thế" ? "Cảnh báo" : "Nghiêm trọng",
          group: "Thiết bị",
          assetId: asset.id,
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} đang ở trạng thái ${status}`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        }, ["thietbi", asset.id, "status", status]);
      }

      if (!s?.lastCheckDate || (now - new Date(s.lastCheckDate)) / 86400000 > 30) {
        pushAlert({
          level: "Cảnh báo",
          group: "Thiết bị",
          assetId: asset.id,
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} quá 30 ngày chưa kiểm tra`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        }, ["thietbi", asset.id, "overdue-check"]);
      }

      const logsThisMonth = (s?.logs || []).filter((x) => monthKey(x.logDate) === currentMonth);
      if (logsThisMonth.length > 3) {
        pushAlert({
          level: "Nghiêm trọng",
          group: "Thiết bị",
          assetId: asset.id,
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} xử lý ${logsThisMonth.length} lần trong tháng`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        }, ["thietbi", asset.id, "high-frequency", currentMonth]);
      }

      if ((s?.totalCost || 0) > 10000000) {
        pushAlert({
          level: "Theo dõi",
          group: "Thiết bị",
          assetId: asset.id,
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${asset.name} có chi phí xử lý cao (${s.totalCost.toLocaleString("vi-VN")}đ)`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        }, ["thietbi", asset.id, "high-cost"]);
      }
    });

  const rowsById = Object.fromEntries(ccdcRows.filter((x) => !x.isDeleted).map((x) => [x.id, x]));
  ccdcRows
    .filter((x) => !x.isDeleted)
    .forEach((row) => {
      const region = regionById[row.regionId];
      const loc = locById[row.locationId];
      const prevInv = monthlyByRowMonth.get(`${row.id}|${prevMonth}`);
      const prevActual = Number(prevInv?.actualQty || 0);
      const prevReceipts = receiptQtyByRowMonth.get(`${row.id}|${prevMonth}`) || 0;
      const expected = prevActual + prevReceipts;
      const curInv = monthlyByRowMonth.get(`${row.id}|${currentMonth}`);
      const actual = Number(curInv?.actualQty || 0);

      if (!curInv) {
        pushAlert({
          level: "Theo dõi",
          group: "CCDC",
          rowId: row.id,
          region: region?.name || "—",
          location: loc?.name || "—",
          message: `${row.itemName} chưa kiểm kê tháng ${currentMonth}`,
          detectedAt: now.toISOString().slice(0, 10),
          status: "Chưa xử lý",
        }, ["ccdc", row.id, "missing-inventory", currentMonth]);
      } else {
        const diff = actual - expected;
        const rate = expected > 0 ? (diff / expected) * 100 : 0;
        if (diff < 0) {
          pushAlert({
            level: Math.abs(rate) > 20 ? "Nghiêm trọng" : "Cảnh báo",
            group: "CCDC",
            rowId: row.id,
            region: region?.name || "—",
            location: loc?.name || "—",
            message: `${rowsById[row.id]?.itemName || row.itemName} hao hụt ${Math.abs(diff)}`,
            detectedAt: now.toISOString().slice(0, 10),
            status: "Chưa xử lý",
          }, ["ccdc", row.id, "loss", currentMonth]);
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
  const safeTab = initialTab === "catalog" || initialTab === "monthly" ? "overview" : initialTab;
  const [tab, setTab] = useState(safeTab);
  useEffect(() => setTab(initialTab === "catalog" || initialTab === "monthly" ? "overview" : initialTab), [initialTab]);

  useEffect(() => {
    const sync = () => {
      setRegions(loadRegions());
      setLocations(loadLocations());
    };
    window.addEventListener(MASTER_DATA_CHANGE, sync);
    return () => window.removeEventListener(MASTER_DATA_CHANGE, sync);
  }, []);

  const [regions, setRegions] = useState(() => loadRegions());
  const [locations, setLocations] = useState(() => loadLocations());
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
  const [alertStateRows, setAlertStateRows] = useState(() => readArray(KEYS.alertStates));
  const alertStates = useMemo(
    () => Object.fromEntries(alertStateRows.map((x) => [x.id, x.status])),
    [alertStateRows]
  );

  const equipmentSummary = useMemo(
    () => calcEquipmentSummary(equipmentRows, equipmentLogs),
    [equipmentRows, equipmentLogs]
  );

  const currentMonth = monthKey(new Date().toISOString().slice(0, 10));
  const prevMonth = previousMonthKey(currentMonth);
  const ccdcLossThisMonth = useMemo(() => {
    const monthlyByRowMonth = new Map(
      ccdcMonthly.filter((x) => !x.isDeleted).map((x) => [`${x.rowId}|${x.monthKey}`, x])
    );
    const receiptQtyByRowMonth = ccdcReceipts
      .filter((x) => !x.isDeleted)
      .reduce((acc, x) => {
        const key = `${x.rowId}|${monthKey(x.receiptDate)}`;
        acc.set(key, (acc.get(key) || 0) + Number(x.qty || 0));
        return acc;
      }, new Map());
    return ccdcRows
      .filter((x) => !x.isDeleted)
      .reduce((sum, row) => {
        const prevActual = Number(monthlyByRowMonth.get(`${row.id}|${prevMonth}`)?.actualQty || 0);
        const prevReceipts = receiptQtyByRowMonth.get(`${row.id}|${prevMonth}`) || 0;
        const expected = prevActual + prevReceipts;
        const cur = monthlyByRowMonth.get(`${row.id}|${currentMonth}`);
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
        alertStates,
      }),
    [regions, locations, equipmentRows, equipmentSummary, ccdcRows, ccdcMonthly, ccdcReceipts, alertStates]
  );
  const tabLabel = useMemo(
    () =>
      ({
        overview: "Tổng quan",
        equipment: "Thiết bị lớn",
        ccdc: "CCDC",
        repairs: "Lịch sử sửa chữa",
        transfers: "Cấp phát / điều chuyển",
        alerts: "Cảnh báo",
      }[tab] || "Thiết bị"),
    [tab]
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
  const saveAlertStates = (rows) => {
    setAlertStateRows(rows);
    writeArray(KEYS.alertStates, rows);
  };

  return (
    <div className="equipment-page ops-standard-page">
      <ModuleShell
        title="Quản lý thiết bị"
        subtitle={`Phân hệ hiện tại: ${tabLabel}`}
        stats={[
          { label: "Thiết bị", value: dashboardData.totalEquipment || 0 },
          { label: "CCDC", value: dashboardData.totalCcdc || 0 },
          { label: "Cảnh báo nghiêm trọng", value: dashboardData.severeAlerts || 0, tone: "danger" },
        ]}
      />
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
          onSyncEquipmentStatus={(assetId, status, nowIso) =>
            saveEquipments(
              equipmentRows.map((x) =>
                x.id === assetId
                  ? {
                      ...x,
                      currentStatus: status || x.currentStatus || "Hoạt động tốt",
                      updatedAt: nowIso || new Date().toISOString(),
                    }
                  : x
              )
            )
          }
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

      {tab === "alerts" && (
        <AssetAlerts
          rows={alerts}
          onPatchStatus={(id, status) => {
            const now = new Date().toISOString();
            const next = alertStateRows.some((x) => x.id === id)
              ? alertStateRows.map((x) => (x.id === id ? { ...x, status, updatedAt: now } : x))
              : [{ id, status, updatedAt: now }, ...alertStateRows];
            saveAlertStates(next);
          }}
        />
      )}

    </div>
  );
}
