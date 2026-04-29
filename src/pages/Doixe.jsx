import { useEffect, useMemo, useState } from "react";
import ModuleShell from "../components/ModuleShell.jsx";
import { useMasterCatalogSnapshot } from "../systemCatalog/useMasterCatalogSnapshot.js";

const STORAGE_KEY = "sky_ops_doi_xe_nhat_ky_v5";
const WEEKLY_STORAGE_KEY = "sky_ops_doi_xe_lich_tuan_v2";
const VEHICLE_INSPECTION_STORAGE_PREFIX = "vehicle_inspection_";
const VEHICLE_WEEK_ISSUE_STORAGE_KEY = "vehicle_week_issue_records_v1";
const WEEKLY_VEHICLE_MASTER_STORAGE_KEY = "sky_ops_weekly_vehicle_master_v1";
const DAILY_REPORT_STORAGE_KEYS = [
  "bc_management_v2",
  "bc_service_v2",
  "bc_accounting_v2",
  "bc_warehouse_v2",
  "bc_bep_v2",
];
const INCIDENT_DETAIL_SUGGESTIONS = [
  "Vá vỏ",
  "Thay bánh",
  "Thay lốp",
  "Thay bình ắc quy",
  "Đề không nổ",
  "Hỏng đèn chiếu sáng",
  "Rò rỉ dầu",
  "Quá nhiệt động cơ",
  "Cứu hộ 24/7",
  "Thay nhớt",
];
const XE_OPTIONS = ["60C53518", "60C60959", "60H04281", "60K73144"];

const DRIVER_OPTIONS = [
  { name: "NGUYỄN NAM", phone: "0909000001" },
  { name: "NGUYỄN HỮU PHƯƠNG", phone: "0909000002" },
  { name: "BẠCH DUY MINH ĐỨC", phone: "0909000003" },
  { name: "TRẦN VĂN PHÁT", phone: "0909000006" },
];

const ROUTE_OPTIONS = [
  {
    value: "CMC - X1 X2 X3",
    label: "CMC - X1 X2 X3",
    standardTime: "10:30",
    priority: "cao",
    note: "Chú ý timing sản xuất, tuyến trọng yếu.",
  },
  {
    value: "Nguyên Hưng - Na San",
    label: "Nguyên Hưng - Na San",
    standardTime: "10:45",
    priority: "cao",
    note: "Quốc lộ 51 đông xe, không được trễ khung phục vụ.",
  },
  {
    value: "MTC - Young Wire",
    label: "MTC - Young Wire",
    standardTime: "10:30",
    priority: "trungbinh",
    note: "Tuyến ghép điểm, cần canh giờ gom đồ chiều.",
  },
  {
    value: "Rotong - CF Vina",
    label: "Rotong - CF Vina",
    standardTime: "10:20",
    priority: "trungbinh",
    note: "Tuyến cố định, kiểm soát thời gian trả dụng cụ.",
  },
  {
    value: "Casar ca 3",
    label: "Casar ca 3",
    standardTime: "19:20",
    priority: "trungbinh",
    note: "Tuyến tối, chú ý bàn giao cuối ngày.",
  },
  {
    value: "CMC - MTC ca 3",
    label: "CMC - MTC ca 3",
    standardTime: "21:00",
    priority: "cao",
    note: "Ca đêm, cần chuẩn bị hàng hóa trước khi xuất phát.",
  },
  {
    value: "Phát sinh điều động",
    label: "Phát sinh điều động",
    standardTime: "",
    priority: "thap",
    note: "Chuyến phát sinh, cập nhật ghi chú rõ ràng.",
  },
];

const TAB_OPTIONS = [
  { key: "nhatky", label: "Nhật ký xe" },
  { key: "lichtuan", label: "Lịch trình tuần" },
  { key: "kiemtra", label: "Kiểm tra xe" },
  { key: "tonghop", label: "Tổng hợp tháng" },
];

const LOAI_CHUYEN_OPTIONS = [
  { value: "codinh", label: "Cố định" },
  { value: "phatsinh", label: "Phát sinh" },
  { value: "tangcuong", label: "Tăng cường" },
];

const PRIORITY_OPTIONS = [
  { value: "cao", label: "Cao" },
  { value: "trungbinh", label: "Trung bình" },
  { value: "thap", label: "Thấp" },
];

const TRANG_THAI_OPTIONS = [
  { value: "kehoach", label: "Kế hoạch" },
  { value: "dangchay", label: "Đang chạy" },
  { value: "hoanthanh", label: "Hoàn thành" },
  { value: "tre", label: "Trễ" },
];

const INSPECTION_STATUS_OPTIONS = [
  { value: "ok", label: "Đạt" },
  { value: "minor", label: "Lỗi nhẹ" },
  { value: "major", label: "Lỗi nghiêm trọng" },
];

const INSPECTION_GROUPS = [
  {
    key: "documents",
    title: "Giấy tờ",
    items: ["Đăng kiểm", "Bảo hiểm TNDS", "Bảo hiểm vật chất", "Cavet xe"],
  },
  {
    key: "safety",
    title: "An toàn bắt buộc",
    items: ["Phanh", "Đèn chiếu sáng", "Xi nhan", "Còi", "Gương", "Lốp", "Bình chữa cháy", "Tam giác cảnh báo"],
  },
  {
    key: "exterior",
    title: "Ngoại thất & vận hành",
    items: ["Kính chắn gió", "Cần gạt nước", "Cửa xe", "Bình ắc quy", "Rò rỉ dầu / nước", "Tiếng máy"],
  },
  {
    key: "interior",
    title: "Nội thất & điều khiển",
    items: ["Vô lăng", "Đồng hồ", "Cần số", "Phanh tay", "Điều hòa / quạt gió", "Ghế lái", "Dây an toàn"],
  },
  {
    key: "cargo",
    title: "Thùng xe / vận chuyển suất ăn",
    items: ["Thùng xe sạch", "Không mùi lạ", "Không côn trùng", "Không đọng nước", "Dụng cụ vận chuyển sạch", "Cửa thùng kín"],
  },
];

const DOCUMENT_ITEMS_WITH_EXPIRY = ["Đăng kiểm", "Bảo hiểm TNDS", "Bảo hiểm vật chất", "Cavet xe"];

const DAYS_OF_WEEK = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getWeekStart(date = new Date()) {
  const base = new Date(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  base.setHours(0, 0, 0, 0);
  return base;
}

function formatInputDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getWeekKey(date = new Date()) {
  return formatInputDate(getWeekStart(date));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekDays(weekKey) {
  const start = new Date(`${weekKey}T00:00:00`);
  return DAYS_OF_WEEK.map((item, index) => {
    const current = addDays(start, index);
    return {
      ...item,
      date: formatInputDate(current),
      fullLabel: `${item.label} - ${formatDate(formatInputDate(current))}`,
    };
  });
}

function getWeekLabel(weekKey) {
  const start = new Date(`${weekKey}T00:00:00`);
  const end = addDays(start, 6);
  return `${formatDate(formatInputDate(start))} - ${formatDate(formatInputDate(end))}`;
}

function getWeekInputFromWeekKey(weekKey) {
  const date = new Date(`${weekKey}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${pad(week)}`;
}

function getWeekKeyFromWeekInput(weekInput) {
  const [yearPart, weekPart] = String(weekInput).split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);
  if (!year || !week) return getWeekKey();
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - jan4Day + 1);
  const target = addDays(mondayWeek1, (week - 1) * 7);
  return formatInputDate(target);
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-");
  return `Tháng ${m}/${y}`;
}

function getMonthRange(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: formatInputDate(start),
    end: formatInputDate(end),
    daysInMonth: end.getDate(),
    year,
    month,
  };
}

function getVietnamWeekNumber(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function parseVndInput(value, fallback = 0) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return fallback;
  return Number(digits);
}

function parseMoneyFromText(text) {
  const normalized = String(text || "").replace(/[^\d.,\s]/g, " ");
  const matches = normalized.match(/\d{1,3}(?:[.,]\d{3})+|\d{5,}/g) || [];
  if (!matches.length) return 0;
  const values = matches
    .map((raw) => Number(String(raw).replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  return values.length ? Math.max(...values) : 0;
}

function extractVehicleFromText(text) {
  const lower = String(text || "").toLowerCase();
  const labelMatch = lower.match(/xe\s*[:\-]?\s*([a-z0-9\-]+)/i);
  if (labelMatch?.[1]) return `Xe ${labelMatch[1].toUpperCase()}`;
  const numericMatch = lower.match(/\bxe\s*(\d{1,3})\b/i);
  if (numericMatch?.[1]) return `Xe ${numericMatch[1]}`;
  return "Xe chưa rõ";
}

function readDailyReportIssuesByMonth(monthKey) {
  const { start, end } = getMonthRange(monthKey);
  const incidents = [];

  DAILY_REPORT_STORAGE_KEYS.forEach((key) => {
    try {
      const reports = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(reports)) return;

      reports
        .filter((report) => report?.date >= start && report?.date <= end)
        .forEach((report) => {
          const rows = report?.rows || {};
          Object.values(rows).forEach((row) => {
            const note = String(row?.note || "").trim();
            const score = Number(row?.score || 5);
            if (!note && score > 3) return;

            const isTechIncident =
              /sự cố|ky thuat|kỹ thuật|hỏng|hu hong|xe|đội xe|doi xe/i.test(note) || score <= 2;
            if (!isTechIncident) return;

            const cost = parseMoneyFromText(note);
            incidents.push({
              date: report.date,
              vehicle: extractVehicleFromText(note),
              cost,
              note,
            });
          });
        });
    } catch {
      // Ignore invalid storage payload
    }
  });

  return incidents;
}

function formatVndInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

function formatCurrency(value) {
  return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function buildMonthlyDashboard(records, weeklyRecords, weeklyIssueRecords, monthKey) {
  const { start, end, daysInMonth, year, month } = getMonthRange(monthKey);
  const dailyItems = Object.values(records).filter((item) => item.ngay >= start && item.ngay <= end);
  const weeklyItems = weeklyRecords.filter((item) => item.ngay >= start && item.ngay <= end);
  const issueItems = weeklyIssueRecords.filter((item) => item.ngayPhatHien >= start && item.ngayPhatHien <= end);
  const dailyReportIncidents = readDailyReportIssuesByMonth(monthKey);

  const tongChuyen = weeklyItems.length;
  const dungGio = weeklyItems.filter((item) => item.trangThai !== "tre").length;
  const tiLeDungGio = tongChuyen ? (dungGio / tongChuyen) * 100 : 100;

  const tongLit = dailyItems.reduce((sum, item) => sum + Number(item.litDo || 0), 0);
  const fuelCost = dailyItems.reduce(
    (sum, item) => sum + Number(item.litDo || 0) * parseVndInput(item.donGiaDo, 24500),
    0
  );
  const maintenanceFromIssues = issueItems.reduce((sum, item) => {
    if (item.mucDoLoi === "major") return sum + 1800000;
    if (item.mucDoLoi === "minor") return sum + 550000;
    return sum;
  }, 0);
  const maintenanceFromDailyIncident = dailyItems.reduce((sum, item) => {
    if (!item.suCoKyThuat) return sum;
    return sum + parseVndInput(item.giaSuCoKyThuat, 0);
  }, 0);
  const maintenanceFromDailyReports = dailyReportIncidents.reduce(
    (sum, incident) => sum + Number(incident.cost || 0),
    0
  );
  const maintenanceCost =
    maintenanceFromIssues + maintenanceFromDailyIncident + maintenanceFromDailyReports;
  const delayCost = weeklyItems.filter((item) => item.trangThai === "tre").length * 200000;
  const opCost = tongChuyen * 35000;
  const tongChiPhi = fuelCost + maintenanceCost + delayCost + opCost;

  const majorCount = issueItems.filter((item) => item.mucDoLoi === "major").length;
  const minorCount = issueItems.filter((item) => item.mucDoLoi === "minor").length;
  const scoreAnToan = Math.max(0, 100 - majorCount * 8 - minorCount * 2);

  const activeDays = new Set(dailyItems.map((item) => item.ngay)).size;
  const tiLeKhaiThac = daysInMonth ? (activeDays / daysInMonth) * 100 : 0;

  const weekKeys = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = formatInputDate(new Date(year, month - 1, day));
    const weekNumber = getVietnamWeekNumber(currentDate);
    if (!weekKeys.includes(weekNumber)) {
      weekKeys.push(weekNumber);
    }
  }

  const weekCosts = weekKeys.map((weekNumber) => {
    const dailyCostWeek = dailyItems
      .filter((item) => getVietnamWeekNumber(item.ngay) === weekNumber)
      .reduce((sum, item) => sum + Number(item.litDo || 0) * parseVndInput(item.donGiaDo, 24500), 0);
    const weeklyCostWeek = weeklyItems
      .filter((item) => getVietnamWeekNumber(item.ngay) === weekNumber)
      .reduce(
        (sum, item) =>
          sum + 35000 + (item.trangThai === "tre" ? 200000 : 0) + (item.doUuTien === "cao" ? 45000 : 0),
        0
      );
    const issueCostWeek = issueItems
      .filter((item) => getVietnamWeekNumber(item.ngayPhatHien) === weekNumber)
      .reduce((sum, item) => sum + (item.mucDoLoi === "major" ? 1800000 : 550000), 0);
    const dailyIncidentCostWeek = dailyItems
      .filter((item) => getVietnamWeekNumber(item.ngay) === weekNumber && item.suCoKyThuat)
      .reduce((sum, item) => sum + parseVndInput(item.giaSuCoKyThuat, 0), 0);
    const dailyReportIncidentCostWeek = dailyReportIncidents
      .filter((item) => getVietnamWeekNumber(item.date) === weekNumber)
      .reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const value =
      dailyCostWeek + weeklyCostWeek + issueCostWeek + dailyIncidentCostWeek + dailyReportIncidentCostWeek;
    return { label: `Tuần ${weekNumber}`, value };
  });

  const maxWeekCost = Math.max(...weekCosts.map((item) => item.value), 1);
  const weekCostsWithRatio = weekCosts.map((item) => ({
    ...item,
    ratio: (item.value / maxWeekCost) * 100,
  }));

  const pieSegments = [
    { key: "fuel", label: "Nhiên liệu", value: fuelCost, color: "#22c55e" },
    { key: "maintenance", label: "Sửa chữa / bảo trì", value: maintenanceCost, color: "#f59e0b" },
    { key: "delay", label: "Chi phí trễ", value: delayCost, color: "#ef4444" },
    { key: "op", label: "Chi phí điều phối", value: opCost, color: "#0ea5e9" },
  ];

  const tongPie = pieSegments.reduce((sum, item) => sum + item.value, 0) || 1;
  let current = 0;
  const pieGradient = pieSegments
    .map((item) => {
      const startPercent = (current / tongPie) * 100;
      current += item.value;
      const endPercent = (current / tongPie) * 100;
      return `${item.color} ${startPercent}% ${endPercent}%`;
    })
    .join(", ");

  const riskByVehicleMap = {};
  const appendRiskDetail = (bucket, detail) => {
    if (!detail) return;
    if (!bucket.details) bucket.details = [];
    if (bucket.details.length < 4) {
      bucket.details.push(detail);
    }
  };
  issueItems.forEach((item) => {
    const key = item.bienSo || item.xe || "Chưa rõ xe";
    if (!riskByVehicleMap[key]) {
      riskByVehicleMap[key] = { vehicle: key, major: 0, minor: 0, issues: 0, cost: 0, details: [] };
    }
    riskByVehicleMap[key].issues += 1;
    if (item.mucDoLoi === "major") riskByVehicleMap[key].major += 1;
    if (item.mucDoLoi === "minor") riskByVehicleMap[key].minor += 1;
    riskByVehicleMap[key].cost += item.mucDoLoi === "major" ? 1800000 : 550000;
    appendRiskDetail(
      riskByVehicleMap[key],
      `${item.mucDoLoi === "major" ? "Lỗi nghiêm trọng" : "Lỗi nhẹ"}: ${item.loiPhatHien || item.nhomLoi || "Kiểm tra xe"}`
    );
  });

  dailyReportIncidents.forEach((incident) => {
    const key = incident.vehicle || "Xe chưa rõ";
    if (!riskByVehicleMap[key]) {
      riskByVehicleMap[key] = { vehicle: key, major: 0, minor: 0, issues: 0, cost: 0, details: [] };
    }
    riskByVehicleMap[key].issues += 1;
    riskByVehicleMap[key].minor += 1;
    riskByVehicleMap[key].cost += Number(incident.cost || 0);
    appendRiskDetail(
      riskByVehicleMap[key],
      `Sự cố từ Báo cáo ngày${incident.note ? `: ${incident.note}` : ""}`
    );
  });

  dailyItems.forEach((item) => {
    const key = item.xe?.trim() || "Xe chưa rõ";
    if (!riskByVehicleMap[key]) {
      riskByVehicleMap[key] = { vehicle: key, major: 0, minor: 0, issues: 0, cost: 0, details: [] };
    }

    const itemFuelCost = Number(item.litDo || 0) * parseVndInput(item.donGiaDo, 24500);
    const itemIncidentCost = item.suCoKyThuat ? parseVndInput(item.giaSuCoKyThuat, 0) : 0;

    if (itemFuelCost > 0) {
      riskByVehicleMap[key].cost += itemFuelCost;
      appendRiskDetail(
        riskByVehicleMap[key],
        `Nhiên liệu ${Number(item.litDo || 0).toLocaleString("vi-VN")} lít x ${formatCurrency(
          parseVndInput(item.donGiaDo, 24500)
        )} (${formatDate(item.ngay)})`
      );
    }

    if (itemIncidentCost > 0) {
      riskByVehicleMap[key].issues += 1;
      riskByVehicleMap[key].minor += 1;
      riskByVehicleMap[key].cost += itemIncidentCost;
      const incidentDetail = String(item.chiTietSuCoKyThuat || "").trim();
      appendRiskDetail(
        riskByVehicleMap[key],
        `Sự cố kỹ thuật: ${formatCurrency(itemIncidentCost)} (${formatDate(item.ngay)})${
          incidentDetail ? ` - ${incidentDetail}` : ""
        }`
      );
    }
  });

  const riskyVehicles = Object.values(riskByVehicleMap)
    .sort((a, b) => {
      if (b.cost !== a.cost) return b.cost - a.cost;
      const scoreA = a.major * 2 + a.minor;
      const scoreB = b.major * 2 + b.minor;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  const headline = [];
  if (tiLeDungGio < 95) headline.push("Tỉ lệ đúng giờ thấp hơn ngưỡng 95%, cần xử lý nút thắt điều phối.");
  if (majorCount > 0) headline.push(`Có ${majorCount} lỗi nghiêm trọng, ưu tiên ngân sách khắc phục sớm.`);
  if (dailyReportIncidents.length > 0) {
    headline.push(
      `Đã cộng thêm ${dailyReportIncidents.length} sự cố kỹ thuật từ Báo cáo ngày vào phân tích tháng.`
    );
  }
  if (fuelCost > maintenanceCost * 2) headline.push("Chi phí nhiên liệu chiếm tỷ trọng cao, nên tối ưu tuyến và cách chạy.");
  if (headline.length === 0) headline.push("Vận hành tháng ổn định, có thể tập trung tối ưu chi phí sâu hơn.");

  return {
    monthLabel: formatMonthLabel(monthKey),
    tongChuyen,
    tiLeDungGio,
    tongChiPhi,
    fuelCost,
    maintenanceCost,
    delayCost,
    opCost,
    majorCount,
    minorCount,
    scoreAnToan,
    tiLeKhaiThac,
    weekCosts: weekCostsWithRatio,
    pieSegments,
    pieGradient,
    riskyVehicles,
    headline,
  };
}

function getRouteMeta(routeValue) {
  return ROUTE_OPTIONS.find((item) => item.value === routeValue) || null;
}

function createDefaultForm(date = getToday()) {
  return {
    ngay: date,
    xe: "",
    taiXe: "",
    odo: "",
    tuyen: "",
    litDo: "",
    donGiaDo: "",
    treGio: false,
    thieuHang: false,
    rotHang: false,
    suCoKyThuat: false,
    giaSuCoKyThuat: "",
    chiTietSuCoKyThuat: "",
    ghiChu: "",
  };
}

function createDefaultWeeklyForm(date = getWeekKey()) {
  return {
    id: "",
    ngay: date,
    ca: "ca1",
    gioChay: "",
    xe: "",
    taiXe: "",
    soDienThoai: "",
    tuyen: "",
    loaiChuyen: "codinh",
    doUuTien: "trungbinh",
    gioChuan: "",
    trangThai: "kehoach",
    dieuPhoi: "",
    backup: false,
    ghiChu: "",
  };
}

function createDefaultVehicleMasters() {
  return XE_OPTIONS.map((plate, index) => {
    const driver = DRIVER_OPTIONS[index] || DRIVER_OPTIONS[0] || { name: "", phone: "" };
    return {
      id: `vm-${plate}`,
      plate,
      driver: driver.name || "",
      phone: driver.phone || "",
      status: "hoatdong",
    };
  });
}

function readWeeklyVehicleMasters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEEKLY_VEHICLE_MASTER_STORAGE_KEY) || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed
        .filter((item) => {
          const driverName = String(item?.driver || "").toLowerCase();
          return !driverName.includes("duy long") && !driverName.includes("hiếu trực");
        })
        .map((item) => ({
          id: item.id || `vm-${item.plate || Date.now()}`,
          plate: String(item.plate || "").trim().toUpperCase(),
          driver: String(item.driver || "").trim(),
          phone: String(item.phone || "").trim(),
          status: item.status || "hoatdong",
        }))
        .filter((item) => item.plate);

      const existingPlateSet = new Set(cleaned.map((item) => item.plate));
      const defaults = createDefaultVehicleMasters().filter((item) => !existingPlateSet.has(item.plate));
      const merged = [...cleaned, ...defaults];
      localStorage.setItem(WEEKLY_VEHICLE_MASTER_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // fallback default
  }
  const defaults = createDefaultVehicleMasters();
  localStorage.setItem(WEEKLY_VEHICLE_MASTER_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveWeeklyVehicleMasters(items) {
  localStorage.setItem(WEEKLY_VEHICLE_MASTER_STORAGE_KEY, JSON.stringify(items));
}

function createEmptyScheduleRow(date, dayLabel) {
  return {
    id: "",
    ngay: date,
    thu: dayLabel,
    gio: "",
    moTa: "",
    congViec: "",
    uuTien: "trungbinh",
    ghiChu: "",
  };
}

function createVehicleWeekDraft(plate, weekDays, records) {
  const source = records.filter((item) => item.xe === plate && weekDays.some((d) => d.date === item.ngay));
  const byKey = source.reduce((acc, item) => {
    acc[`${item.ca || "ca1"}-${item.ngay}`] = item;
    return acc;
  }, {});

  const buildRows = (caValue) =>
    weekDays.map((day) => {
      const found = byKey[`${caValue}-${day.date}`];
      if (!found) return createEmptyScheduleRow(day.date, day.label);
      return {
        id: found.id || "",
        ngay: day.date,
        thu: day.label,
        gio: found.gioChay || "",
        moTa: found.moTa || found.tuyen || "",
        congViec: found.congViec || "",
        uuTien: found.doUuTien || "trungbinh",
        ghiChu: found.ghiChu || "",
      };
    });

  return {
    ca1: buildRows("ca1"),
    ca2: buildRows("ca2"),
  };
}

function isScheduleRowFilled(row) {
  return Boolean(
    String(row.gio || "").trim() ||
      String(row.moTa || "").trim() ||
      String(row.congViec || "").trim() ||
      String(row.ghiChu || "").trim()
  );
}

function countTripsByTimeFilled(rows = []) {
  return rows.filter((row) => String(row.gio || "").trim()).length;
}

function getVehicleLoadLevel(totalTrips) {
  if (totalTrips > 10) return { key: "overload", label: "Quá tải", tone: "danger" };
  if (totalTrips < 5) return { key: "idle", label: "Nhàn", tone: "warning" };
  return { key: "normal", label: "Bình thường", tone: "ok" };
}

function createInspectionChecks() {
  return INSPECTION_GROUPS.reduce((acc, group) => {
    acc[group.key] = group.items.reduce((groupAcc, itemName) => {
      groupAcc[itemName] = "ok";
      return groupAcc;
    }, {});
    return acc;
  }, {});
}

function createInspectionIssueNotes() {
  return INSPECTION_GROUPS.reduce((acc, group) => {
    acc[group.key] = group.items.reduce((groupAcc, itemName) => {
      groupAcc[itemName] = "";
      return groupAcc;
    }, {});
    return acc;
  }, {});
}

function createDefaultInspectionForm(date = getToday()) {
  const documentExpiry = DOCUMENT_ITEMS_WITH_EXPIRY.reduce((acc, itemName) => {
    acc[itemName] = "";
    return acc;
  }, {});
  return {
    date,
    vehicle: "",
    plate: "",
    driver: "",
    shift: "ca1",
    route: "",
    odo: "",
    checks: createInspectionChecks(),
    issueNotes: createInspectionIssueNotes(),
    documentExpiry,
    minorCount: 0,
    majorCount: 0,
    result: "Đủ điều kiện vận hành",
    note: "",
  };
}

function readRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function journalStorageKey(date, vehicle) {
  const d = String(date || "").trim();
  const v = String(vehicle || "").trim().toUpperCase();
  if (!d) return "";
  return v ? `${d}__${v}` : d;
}

function extractJournalDate(key, item) {
  const valueDate = String(item?.ngay || "").trim();
  if (valueDate) return valueDate;
  const rawKey = String(key || "");
  if (rawKey.includes("__")) return rawKey.split("__")[0];
  return rawKey;
}

function listJournalEntries(records) {
  return Object.entries(records).map(([key, item]) => ({
    key,
    item,
    date: extractJournalDate(key, item),
  }));
}

function readWeeklyRecords() {
  try {
    return JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWeeklyRecords(records) {
  localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(records));
}

function readWeeklyIssueRecords() {
  try {
    return JSON.parse(localStorage.getItem(VEHICLE_WEEK_ISSUE_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWeeklyIssueRecords(records) {
  localStorage.setItem(VEHICLE_WEEK_ISSUE_STORAGE_KEY, JSON.stringify(records));
}

function readInspectionRecord(date, plate) {
  const key = `${VEHICLE_INSPECTION_STORAGE_PREFIX}${date}_${plate}`;
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function saveInspectionRecord(payload) {
  const plateKey = payload.plate.trim() || payload.vehicle.trim() || "unknown";
  const key = `${VEHICLE_INSPECTION_STORAGE_PREFIX}${payload.date}_${plateKey}`;
  localStorage.setItem(key, JSON.stringify(payload));
}

function countInspectionIssues(checks) {
  return INSPECTION_GROUPS.reduce(
    (acc, group) => {
      group.items.forEach((itemName) => {
        const status = checks?.[group.key]?.[itemName] || "ok";
        if (status === "minor") acc.minorCount += 1;
        if (status === "major") acc.majorCount += 1;
      });
      return acc;
    },
    { minorCount: 0, majorCount: 0 }
  );
}

function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const end = new Date(`${expiryDate}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getExpiryMeta(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft <= 0) return { label: "Đã hết hạn", tone: "danger" };
  if (daysLeft <= 14) return { label: "Cận hạn", tone: "critical" };
  if (daysLeft <= 30) return { label: "Sắp hết hạn", tone: "warning" };
  return { label: "Còn hạn", tone: "ok" };
}

function getEffectiveInspectionStatus(form, groupKey, itemName) {
  const baseStatus = form.checks?.[groupKey]?.[itemName] || "ok";
  if (groupKey !== "documents") return baseStatus;
  if (!DOCUMENT_ITEMS_WITH_EXPIRY.includes(itemName)) return baseStatus;
  const daysLeft = getDaysLeft(form.documentExpiry?.[itemName] || "");
  if (daysLeft !== null && daysLeft <= 0) return "major";
  return baseStatus;
}

function getInspectionResult({ minorCount, majorCount }) {
  if (majorCount > 0) return "Không đủ điều kiện vận hành";
  if (minorCount > 0) return "Vận hành có theo dõi";
  return "Đủ điều kiện vận hành";
}

function getInspectionResultTone(result) {
  if (result === "Không đủ điều kiện vận hành") return "danger";
  if (result === "Vận hành có theo dõi") return "warning";
  return "ok";
}

function getInspectionStatusLabel(status) {
  if (status === "major") return "Lỗi nghiêm trọng";
  if (status === "minor") return "Lỗi nhẹ";
  return "Đạt";
}

function toWeeklyIssueRecords(inspectionForm) {
  const issueRecords = [];
  INSPECTION_GROUPS.forEach((group, groupIndex) => {
    group.items.forEach((itemName, itemIndex) => {
      const status = getEffectiveInspectionStatus(inspectionForm, group.key, itemName);
      if (status === "ok") return;
      const daysLeft =
        group.key === "documents" ? getDaysLeft(inspectionForm.documentExpiry?.[itemName] || "") : null;
      const code = `${groupIndex + 1}.${itemIndex + 1}`;
      const note = inspectionForm.issueNotes?.[group.key]?.[itemName]?.trim() || "";
      issueRecords.push({
        id: `vehicle_week_issue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ngayPhatHien: inspectionForm.date,
        xe: inspectionForm.vehicle.trim(),
        bienSo: inspectionForm.plate.trim(),
        taiXe: inspectionForm.driver.trim(),
        maMuc: code,
        loiPhatHien: `${code} ${itemName}`,
        nhomLoi: group.title,
        mucDoLoi: status,
        soNgayConLai: daysLeft,
        trangThaiXuLy: "Chưa xử lý",
        moTaLoi: note,
        ghiChu: [note, inspectionForm.note.trim()].filter(Boolean).join(" | "),
        createdAt: new Date().toISOString(),
      });
    });
  });
  return issueRecords;
}

function getPreviousRecord(records, currentDate, currentXe) {
  if (!currentDate || !currentXe) return null;

  const items = listJournalEntries(records)
    .filter((entry) => entry.date < currentDate && entry.item?.xe === currentXe && entry.item?.odo)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return items.length ? items[0].item : null;
}

function getMetrics(form, records) {
  const currentOdo = Number(form.odo || 0);
  const currentLit = Number(form.litDo || 0);

  if (!form.ngay || !form.xe || !currentOdo) {
    return {
      previousOdo: null,
      kmDaChay: null,
      tieuHao: null,
      canhBao: [],
      coDuLieuTruoc: false,
    };
  }

  const previous = getPreviousRecord(records, form.ngay, form.xe);
  const previousOdo = previous ? Number(previous.odo || 0) : null;

  let kmDaChay = null;
  if (previousOdo !== null && currentOdo >= previousOdo) {
    kmDaChay = currentOdo - previousOdo;
  }

  let tieuHao = null;
  if (kmDaChay && kmDaChay > 0 && currentLit > 0) {
    tieuHao = (currentLit / kmDaChay) * 100;
  }

  const canhBao = [];

  if (previousOdo === null) {
    canhBao.push({
      label: "Chưa có dữ liệu trước đó của xe này",
      tone: "warning",
    });
  }

  if (previousOdo !== null && currentOdo < previousOdo) {
    canhBao.push({
      label: "ODO nhỏ hơn lần nhập trước",
      tone: "danger",
    });
  }

  if (kmDaChay !== null && kmDaChay > 250) {
    canhBao.push({
      label: "Km chạy trong ngày cao bất thường",
      tone: "warning",
    });
  }

  if (tieuHao !== null && tieuHao > 25) {
    canhBao.push({
      label: "Tiêu hao nhiên liệu cao",
      tone: "danger",
    });
  } else if (tieuHao !== null && tieuHao > 18) {
    canhBao.push({
      label: "Tiêu hao nhiên liệu cần theo dõi",
      tone: "warning",
    });
  }

  if (form.treGio || form.thieuHang || form.rotHang || form.suCoKyThuat) {
    canhBao.push({
      label: "Có sự cố phát sinh trong ngày",
      tone: "danger",
    });
  }

  return {
    previousOdo,
    kmDaChay,
    tieuHao,
    canhBao,
    coDuLieuTruoc: previousOdo !== null,
  };
}

function buildBadges(item) {
  const badges = [];
  if (item.treGio) badges.push({ label: "Trễ giờ", tone: "danger" });
  if (item.thieuHang) badges.push({ label: "Thiếu hàng", tone: "warning" });
  if (item.rotHang) badges.push({ label: "Rớt hàng", tone: "danger" });
  if (item.suCoKyThuat) badges.push({ label: "Kỹ thuật", tone: "neutral" });
  return badges;
}

function getHistoryMetrics(item, records) {
  const previous = getPreviousRecord(records, item.ngay, item.xe);
  const currentOdo = Number(item.odo || 0);
  const previousOdo = previous ? Number(previous.odo || 0) : null;

  let kmDaChay = null;
  if (previousOdo !== null && currentOdo >= previousOdo) {
    kmDaChay = currentOdo - previousOdo;
  }

  let tieuHao = null;
  const lit = Number(item.litDo || 0);
  if (kmDaChay && kmDaChay > 0 && lit > 0) {
    tieuHao = (lit / kmDaChay) * 100;
  }

  const canhBao = [];
  if (previousOdo === null) {
    canhBao.push({ label: "Chưa có dữ liệu trước đó của xe này", tone: "warning" });
  }
  if (previousOdo !== null && currentOdo < previousOdo) {
    canhBao.push({ label: "ODO bất thường", tone: "danger" });
  }
  if (kmDaChay !== null && kmDaChay > 250) {
    canhBao.push({ label: "Km cao bất thường", tone: "warning" });
  }
  if (tieuHao !== null && tieuHao > 25) {
    canhBao.push({ label: "Tiêu hao cao", tone: "danger" });
  }

  return { kmDaChay, tieuHao, canhBao };
}

function sortWeeklyItems(items) {
  return [...items].sort((a, b) => {
    if (a.ngay !== b.ngay) return a.ngay.localeCompare(b.ngay);
    if (a.gioChay !== b.gioChay) return (a.gioChay || "").localeCompare(b.gioChay || "");
    return (a.xe || "").localeCompare(b.xe || "");
  });
}

function getPriorityBadge(priority) {
  if (priority === "cao") return { label: "Ưu tiên cao", tone: "danger" };
  if (priority === "trungbinh") return { label: "Ưu tiên TB", tone: "warning" };
  return { label: "Ưu tiên thấp", tone: "ok" };
}

function getStatusBadge(status) {
  if (status === "tre") return { label: "Trễ", tone: "danger" };
  if (status === "dangchay") return { label: "Đang chạy", tone: "warning" };
  if (status === "hoanthanh") return { label: "Hoàn thành", tone: "ok" };
  return { label: "Kế hoạch", tone: "neutral" };
}

function getLoaiChuyenLabel(value) {
  return LOAI_CHUYEN_OPTIONS.find((item) => item.value === value)?.label || "-";
}

function buildWeeklyWarnings(form, records, editingId = "") {
  const warnings = [];

  if (!form.soDienThoai.trim()) {
    warnings.push({
      label: "Thiếu số điện thoại tài xế",
      tone: "danger",
    });
  }

  if (form.gioChuan && form.gioChay && form.gioChay > form.gioChuan) {
    warnings.push({
      label: "Giờ chạy đang trễ hơn giờ chuẩn",
      tone: "warning",
    });
  }

  const duplicatedXe = records.find(
    (item) =>
      item.id !== editingId &&
      item.ngay === form.ngay &&
      item.gioChay === form.gioChay &&
      item.xe &&
      item.xe.trim().toLowerCase() === form.xe.trim().toLowerCase() &&
      form.xe.trim()
  );

  if (duplicatedXe) {
    warnings.push({
      label: "Trùng xe cùng ngày và giờ",
      tone: "danger",
    });
  }

  const duplicatedDriver = records.find(
    (item) =>
      item.id !== editingId &&
      item.ngay === form.ngay &&
      item.gioChay === form.gioChay &&
      item.taiXe &&
      item.taiXe.trim().toLowerCase() === form.taiXe.trim().toLowerCase() &&
      form.taiXe.trim()
  );

  if (duplicatedDriver) {
    warnings.push({
      label: "Trùng tài xế cùng ngày và giờ",
      tone: "danger",
    });
  }

  return warnings;
}

function buildWeekSummary(items) {
  return {
    tongChuyen: items.length,
    tongXe: new Set(items.map((item) => item.xe.trim()).filter(Boolean)).size,
    tongTaiXe: new Set(items.map((item) => item.taiXe.trim()).filter(Boolean)).size,
    tongRuiRo: items.filter((item) => item.doUuTien === "cao" || item.trangThai === "tre").length,
  };
}

export default function Doixe({ initialTab = "nhatky", onTabChange = null }) {
  const masterCat = useMasterCatalogSnapshot();
  const scheduleCaOptions = useMemo(() => {
    const label1 = masterCat.shifts.find((s) => s.id === "ca1")?.name || "Ca 1";
    const label2 = masterCat.shifts.find((s) => s.id === "ca2")?.name || "Ca 2";
    return [
      { value: "ca1", label: label1 },
      { value: "ca2", label: label2 },
    ];
  }, [masterCat]);

  const getSafeTab = (targetTab) =>
    TAB_OPTIONS.some((item) => item.key === targetTab) ? targetTab : "nhatky";
  const [tab, setTab] = useState(getSafeTab(initialTab));
  const [form, setForm] = useState(createDefaultForm());
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [saveMessage, setSaveMessage] = useState("Chưa có thao tác lưu.");

  const [weekKey, setWeekKey] = useState(getWeekKey());
  const [weeklyForm, setWeeklyForm] = useState(createDefaultWeeklyForm(getWeekKey()));
  const [weeklyVersion, setWeeklyVersion] = useState(0);
  const [vehicleMasterVersion, setVehicleMasterVersion] = useState(0);
  const [weeklyMessage, setWeeklyMessage] = useState("Chưa có thao tác lưu lịch tuần.");
  const [newVehicleForm, setNewVehicleForm] = useState({
    plate: "",
    driver: "",
    phone: "",
  });
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [weeklyVehicleDrafts, setWeeklyVehicleDrafts] = useState({});
  const [expandedVehicles, setExpandedVehicles] = useState({});
  const [scheduleVehicleFilter, setScheduleVehicleFilter] = useState("");
  const [filterXe, setFilterXe] = useState("");
  const [filterTaiXe, setFilterTaiXe] = useState("");
  const [filterCa, setFilterCa] = useState("");
  const [inspectionForm, setInspectionForm] = useState(createDefaultInspectionForm());
  const [inspectionMessage, setInspectionMessage] = useState("Chưa có thao tác lưu kiểm tra xe.");
  const [openGuideGroup, setOpenGuideGroup] = useState("");
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [weeklyIssueVersion, setWeeklyIssueVersion] = useState(0);
  const [riskVehicleFilter, setRiskVehicleFilter] = useState("");
  const [riskKeywordFilter, setRiskKeywordFilter] = useState("");

  const records = useMemo(() => readRecords(), [recordsVersion]);
  const weeklyRecords = useMemo(() => readWeeklyRecords(), [weeklyVersion]);
  const vehicleMasters = useMemo(() => readWeeklyVehicleMasters(), [vehicleMasterVersion]);
  const weeklyIssueRecords = useMemo(() => readWeeklyIssueRecords(), [weeklyIssueVersion]);

  const sortedRecords = useMemo(() => {
    return listJournalEntries(records).sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return new Date(b.item?.updatedAt || 0) - new Date(a.item?.updatedAt || 0);
    });
  }, [records]);

  const stats = useMemo(() => {
    const items = Object.values(records);

    const totalWarnings = items.reduce((sum, item) => {
      const baseBadges = buildBadges(item);
      const extra = getHistoryMetrics(item, records).canhBao;
      return sum + baseBadges.length + extra.length;
    }, 0);

    return {
      tongNhatKy: items.length,
      tongXeCoMat: new Set(items.map((x) => x.xe).filter(Boolean)).size,
      tongCanhBao: totalWarnings,
    };
  }, [records]);

  const metrics = useMemo(() => getMetrics(form, records), [form, records]);

  const weekDays = useMemo(() => getWeekDays(weekKey), [weekKey]);

  const weekRecordsRaw = useMemo(() => {
    const start = weekKey;
    const end = formatInputDate(addDays(new Date(`${weekKey}T00:00:00`), 6));
    return weeklyRecords.filter((item) => item.ngay >= start && item.ngay <= end);
  }, [weekKey, weeklyRecords]);

  const weekRecords = useMemo(() => {
    let items = sortWeeklyItems(weekRecordsRaw);

    if (filterXe.trim()) {
      items = items.filter((item) =>
        item.xe.toLowerCase().includes(filterXe.trim().toLowerCase())
      );
    }
    if (filterTaiXe.trim()) {
      items = items.filter((item) =>
        item.taiXe.toLowerCase().includes(filterTaiXe.trim().toLowerCase())
      );
    }
    if (filterCa) {
      items = items.filter((item) => item.ca === filterCa);
    }

    return items;
  }, [weekRecordsRaw, filterXe, filterTaiXe, filterCa]);

  const weekSummary = useMemo(() => buildWeekSummary(weekRecords), [weekRecords]);

  const weeklyWarnings = useMemo(
    () => buildWeeklyWarnings(weeklyForm, weeklyRecords, weeklyForm.id),
    [weeklyForm, weeklyRecords]
  );

  const weekInputValue = useMemo(() => getWeekInputFromWeekKey(weekKey), [weekKey]);

  const groupedWeekRecords = useMemo(() => {
    return weekDays.map((day) => ({
      ...day,
      items: weekRecords.filter((item) => item.ngay === day.date),
    }));
  }, [weekDays, weekRecords]);

  const inspectionSummary = useMemo(() => {
    const counts = INSPECTION_GROUPS.reduce(
      (acc, group) => {
        group.items.forEach((itemName) => {
          const status = getEffectiveInspectionStatus(inspectionForm, group.key, itemName);
          if (status === "minor") acc.minorCount += 1;
          if (status === "major") acc.majorCount += 1;
        });
        return acc;
      },
      { minorCount: 0, majorCount: 0 }
    );
    return {
      ...counts,
      result: getInspectionResult(counts),
    };
  }, [inspectionForm]);

  const inspectionIssueSummary = useMemo(() => {
    return INSPECTION_GROUPS.map((group, groupIndex) => {
      const items = group.items
        .map((itemName, itemIndex) => {
          const status = getEffectiveInspectionStatus(inspectionForm, group.key, itemName);
          if (status === "ok") return null;
          return {
            code: `${groupIndex + 1}.${itemIndex + 1}`,
            itemName,
            status,
            description: inspectionForm.issueNotes?.[group.key]?.[itemName]?.trim() || "",
          };
        })
        .filter(Boolean);

      return {
        key: group.key,
        title: `${groupIndex + 1}. ${group.title}`,
        items,
      };
    }).filter((group) => group.items.length > 0);
  }, [inspectionForm]);

  const monthlyDashboard = useMemo(() => {
    return buildMonthlyDashboard(records, weeklyRecords, weeklyIssueRecords, monthKey);
  }, [records, weeklyRecords, weeklyIssueRecords, monthKey]);

  const schedulableVehicles = useMemo(
    () => vehicleMasters.filter((item) => String(item.phone || "").trim()),
    [vehicleMasters]
  );

  const blockedVehicles = useMemo(
    () => vehicleMasters.filter((item) => !String(item.phone || "").trim()),
    [vehicleMasters]
  );

  const displayedVehicles = useMemo(() => {
    if (!scheduleVehicleFilter) return schedulableVehicles;
    return schedulableVehicles.filter((item) => item.plate === scheduleVehicleFilter);
  }, [schedulableVehicles, scheduleVehicleFilter]);

  const getVehicleDraft = (plate) =>
    weeklyVehicleDrafts[plate] || createVehicleWeekDraft(plate, weekDays, weeklyRecords);

  const jobSuggestions = useMemo(() => {
    const options = weeklyRecords
      .flatMap((item) => [item.congViec || "", item.moTa || "", item.tuyen || ""])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return [...new Set(options)].slice(0, 120);
  }, [weeklyRecords]);

  const vehicleScheduleSummary = useMemo(() => {
    const list = schedulableVehicles.map((vehicle) => {
      const draft = getVehicleDraft(vehicle.plate);
      const totalTrips = countTripsByTimeFilled(draft.ca1) + countTripsByTimeFilled(draft.ca2);
      const level = getVehicleLoadLevel(totalTrips);
      return {
        ...vehicle,
        totalTrips,
        level,
      };
    });

    const tongXe = list.length;
    const tongChuyen = list.reduce((sum, item) => sum + item.totalTrips, 0);
    const xeQuaTai = list.filter((item) => item.level.key === "overload").length;
    const xeNhan = list.filter((item) => item.level.key === "idle").length;
    const totals = list.map((item) => item.totalTrips);
    const maxTrips = totals.length ? Math.max(...totals) : 0;
    const minTrips = totals.length ? Math.min(...totals) : 0;
    const phanBo = maxTrips - minTrips <= 3 ? "Phân bổ đều" : "Lệch tải";

    return {
      list,
      tongXe,
      tongChuyen,
      xeQuaTai,
      xeNhan,
      phanBo,
    };
  }, [schedulableVehicles, weeklyVehicleDrafts, weekDays, weeklyRecords]);

  const filteredRiskVehicles = useMemo(() => {
    return monthlyDashboard.riskyVehicles.filter((item) => {
      const vehicleOk = !riskVehicleFilter || item.vehicle === riskVehicleFilter;
      const keyword = riskKeywordFilter.trim().toLowerCase();
      if (!keyword) return vehicleOk;

      const inVehicle = item.vehicle.toLowerCase().includes(keyword);
      const inDetails = (item.details || []).some((detail) => detail.toLowerCase().includes(keyword));
      return vehicleOk && (inVehicle || inDetails);
    });
  }, [monthlyDashboard.riskyVehicles, riskVehicleFilter, riskKeywordFilter]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]:
          field === "donGiaDo" || field === "giaSuCoKyThuat" ? formatVndInput(value) : value,
      };
      if (field === "suCoKyThuat" && !value) {
        next.giaSuCoKyThuat = "";
        next.chiTietSuCoKyThuat = "";
      }
      return next;
    });
  };

  const handleDateChange = (newDate) => {
    const allRecords = readRecords();
    const sameDateRows = listJournalEntries(allRecords)
      .filter((entry) => entry.date === newDate)
      .sort((a, b) => new Date(b.item?.updatedAt || 0) - new Date(a.item?.updatedAt || 0));
    if (allRecords[newDate]) {
      setForm(allRecords[newDate]);
      setSaveMessage(`Đã tải dữ liệu ngày ${formatDate(newDate)}.`);
    } else if (sameDateRows.length > 0) {
      setForm(sameDateRows[0].item);
      setSaveMessage(`Đã tải dữ liệu gần nhất ngày ${formatDate(newDate)}.`);
    } else {
      setForm(createDefaultForm(newDate));
      setSaveMessage(`Ngày ${formatDate(newDate)} chưa có dữ liệu, đang tạo form mới.`);
    }
  };

  const handleSave = () => {
    if (!form.ngay) {
      setSaveMessage("Vui lòng chọn ngày.");
      return;
    }
    if (!form.xe.trim()) {
      setSaveMessage("Vui lòng chọn xe trước khi lưu.");
      return;
    }
    if (!form.taiXe.trim()) {
      setSaveMessage("Vui lòng nhập tài xế trước khi lưu.");
      return;
    }
    if (Number(form.litDo || 0) > 0 && parseVndInput(form.donGiaDo, 0) <= 0) {
      setSaveMessage("Đã nhập đổ dầu, vui lòng nhập đơn giá DO hợp lệ.");
      return;
    }
    if (form.suCoKyThuat && parseVndInput(form.giaSuCoKyThuat, 0) <= 0) {
      setSaveMessage("Đã chọn sự cố kỹ thuật, vui lòng nhập chi phí sự cố.");
      return;
    }
    if (form.suCoKyThuat && !String(form.chiTietSuCoKyThuat || "").trim()) {
      setSaveMessage("Đã chọn sự cố kỹ thuật, vui lòng nhập chi tiết (vd: vá vỏ, thay bánh).");
      return;
    }

    const payload = {
      ...form,
      odo: form.odo?.toString() || "",
      litDo: form.litDo?.toString() || "",
      donGiaDo: form.donGiaDo?.toString() || "",
      giaSuCoKyThuat: form.giaSuCoKyThuat?.toString() || "",
      chiTietSuCoKyThuat: form.chiTietSuCoKyThuat?.toString().trim() || "",
      updatedAt: new Date().toISOString(),
    };

    const allRecords = readRecords();
    const recordKey = journalStorageKey(form.ngay, form.xe);
    if (!recordKey) {
      setSaveMessage("Không thể lưu do thiếu ngày nhật ký.");
      return;
    }
    allRecords[recordKey] = payload;
    saveRecords(allRecords);
    setRecordsVersion((v) => v + 1);
    setSaveMessage(`Đã lưu nhật ký ${form.xe} ngày ${formatDate(form.ngay)}.`);
  };

  const handleReset = () => {
    setForm(createDefaultForm(form.ngay || getToday()));
    setSaveMessage("Đã làm mới form của ngày đang chọn.");
  };

  const handleOpenRecord = (_, item) => {
    setForm(item);
    setSaveMessage(`Đã mở lại dữ liệu ngày ${formatDate(item.ngay)}.`);
  };

  const handleWeeklyFieldChange = (field, value) => {
    setWeeklyForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "taiXe") {
        const driver = DRIVER_OPTIONS.find(
          (item) => item.name.toLowerCase() === String(value).trim().toLowerCase()
        );
        if (driver && !prev.soDienThoai) {
          next.soDienThoai = driver.phone;
        }
      }

      if (field === "tuyen") {
        const route = getRouteMeta(value);
        if (route) {
          next.gioChuan = route.standardTime || prev.gioChuan || "";
          next.ghiChu = prev.ghiChu || route.note || "";
          if (!prev.doUuTien || prev.doUuTien === "trungbinh") {
            next.doUuTien = route.priority || "trungbinh";
          }
        }
      }

      return next;
    });
  };

  const handleChangeWeek = (direction) => {
    const next = addDays(new Date(`${weekKey}T00:00:00`), direction * 7);
    const nextKey = formatInputDate(next);
    setWeekKey(nextKey);
    setWeeklyForm((prev) => ({
      ...prev,
      ngay: nextKey,
    }));
  };

  const handleWeeklyReset = () => {
    setWeeklyForm(createDefaultWeeklyForm(weekKey));
    setWeeklyMessage("Đã làm mới form lịch tuần.");
  };

  const handleWeeklySave = () => {
    if (!weeklyForm.ngay || !weeklyForm.gioChay || !weeklyForm.xe.trim() || !weeklyForm.taiXe.trim() || !weeklyForm.tuyen.trim()) {
      setWeeklyMessage("Vui lòng nhập đủ ngày, giờ chạy, xe, tài xế và tuyến.");
      return;
    }

    if (!weeklyForm.soDienThoai.trim()) {
      setWeeklyMessage("Vui lòng nhập số điện thoại tài xế.");
      return;
    }

    const warnings = buildWeeklyWarnings(weeklyForm, weeklyRecords, weeklyForm.id);
    const hasBlockingError = warnings.some((item) => item.label.includes("Trùng") || item.label.includes("Thiếu số"));
    if (hasBlockingError) {
      setWeeklyMessage("Không thể lưu vì đang có trùng lịch hoặc thiếu số điện thoại.");
      return;
    }

    const payload = {
      ...weeklyForm,
      id: weeklyForm.id || `lt-${Date.now()}`,
      xe: weeklyForm.xe.trim(),
      taiXe: weeklyForm.taiXe.trim(),
      tuyen: weeklyForm.tuyen.trim(),
      soDienThoai: weeklyForm.soDienThoai.trim(),
      dieuPhoi: weeklyForm.dieuPhoi.trim(),
      ghiChu: weeklyForm.ghiChu.trim(),
    };

    const all = readWeeklyRecords();
    const existed = all.some((item) => item.id === payload.id);
    const finalRecords = existed
      ? all.map((item) => (item.id === payload.id ? payload : item))
      : [...all, payload];

    saveWeeklyRecords(finalRecords);
    setWeeklyVersion((v) => v + 1);
    setWeeklyMessage(
      existed
        ? `Đã cập nhật lịch ngày ${formatDate(payload.ngay)} - ${payload.gioChay}.`
        : `Đã lưu lịch ngày ${formatDate(payload.ngay)} - ${payload.gioChay}.`
    );
    setWeeklyForm(createDefaultWeeklyForm(weekKey));
  };

  const handleOpenWeekly = (item) => {
    setWeeklyForm(item);
    setWeeklyMessage(`Đã mở lịch ${formatDate(item.ngay)} - ${item.gioChay} để chỉnh sửa.`);
  };

  const handleDeleteWeekly = (id) => {
    const all = readWeeklyRecords();
    const next = all.filter((item) => item.id !== id);
    saveWeeklyRecords(next);
    setWeeklyVersion((v) => v + 1);
    if (weeklyForm.id === id) {
      setWeeklyForm(createDefaultWeeklyForm(weekKey));
    }
    setWeeklyMessage("Đã xóa lịch tuần.");
  };

  const handleCopyPreviousWeek = () => {
    const previousWeekKey = formatInputDate(addDays(new Date(`${weekKey}T00:00:00`), -7));
    const previousWeekDays = getWeekDays(previousWeekKey);
    const currentWeekDays = getWeekDays(weekKey);

    const previousMap = previousWeekDays.reduce((acc, item, index) => {
      acc[item.date] = currentWeekDays[index].date;
      return acc;
    }, {});

    const previousRecords = readWeeklyRecords().filter((item) => previousMap[item.ngay]);

    if (previousRecords.length === 0) {
      setWeeklyMessage("Tuần trước chưa có dữ liệu để sao chép.");
      return;
    }

    const currentWeekKeys = new Set(
      readWeeklyRecords()
        .filter((item) => currentWeekDays.some((day) => day.date === item.ngay))
        .map((item) => `${item.ngay}-${item.gioChay}-${item.xe}-${item.taiXe}`)
    );

    const copied = previousRecords
      .map((item) => ({
        ...item,
        id: `lt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ngay: previousMap[item.ngay],
        trangThai: "kehoach",
      }))
      .filter((item) => !currentWeekKeys.has(`${item.ngay}-${item.gioChay}-${item.xe}-${item.taiXe}`));

    if (copied.length === 0) {
      setWeeklyMessage("Tuần này đã có đủ lịch tương ứng, không cần copy thêm.");
      return;
    }

    const all = readWeeklyRecords();
    saveWeeklyRecords([...all, ...copied]);
    setWeeklyVersion((v) => v + 1);
    setWeeklyMessage(`Đã copy ${copied.length} lịch từ tuần trước.`);
  };

  const updateVehicleDraftRow = (plate, caValue, index, field, value) => {
    setWeeklyVehicleDrafts((prev) => {
      const base = prev[plate] || createVehicleWeekDraft(plate, weekDays, weeklyRecords);
      const rows = [...base[caValue]];
      rows[index] = { ...rows[index], [field]: value };
      return {
        ...prev,
        [plate]: {
          ...base,
          [caValue]: rows,
        },
      };
    });
  };

  const handleCopyPreviousRow = (plate, caValue, index) => {
    if (index <= 0) return;
    setWeeklyVehicleDrafts((prev) => {
      const base = prev[plate] || createVehicleWeekDraft(plate, weekDays, weeklyRecords);
      const rows = [...base[caValue]];
      const previous = rows[index - 1];
      rows[index] = {
        ...rows[index],
        gio: previous.gio,
        moTa: previous.moTa,
        congViec: previous.congViec,
        uuTien: previous.uuTien,
        ghiChu: previous.ghiChu,
      };
      return {
        ...prev,
        [plate]: { ...base, [caValue]: rows },
      };
    });
    setWeeklyMessage(`Đã copy dòng trước cho ${plate} (${caValue.toUpperCase()}).`);
  };

  const handleCopyCa = (plate, fromCa, toCa) => {
    setWeeklyVehicleDrafts((prev) => {
      const base = prev[plate] || createVehicleWeekDraft(plate, weekDays, weeklyRecords);
      const fromRows = base[fromCa] || [];
      const copiedRows = (base[toCa] || []).map((item, index) => ({
        ...item,
        gio: fromRows[index]?.gio || "",
        moTa: fromRows[index]?.moTa || "",
        congViec: fromRows[index]?.congViec || "",
        uuTien: fromRows[index]?.uuTien || "trungbinh",
        ghiChu: fromRows[index]?.ghiChu || "",
      }));
      return {
        ...prev,
        [plate]: { ...base, [toCa]: copiedRows },
      };
    });
    setWeeklyMessage(`Đã copy ${fromCa.toUpperCase()} sang ${toCa.toUpperCase()} cho xe ${plate}.`);
  };

  const handleCopyVehiclePreviousWeek = (plate) => {
    const previousWeekKey = formatInputDate(addDays(new Date(`${weekKey}T00:00:00`), -7));
    const previousWeekDays = getWeekDays(previousWeekKey);
    const previousRecords = weeklyRecords.filter(
      (item) => item.xe === plate && previousWeekDays.some((day) => day.date === item.ngay)
    );
    if (previousRecords.length === 0) {
      setWeeklyMessage(`Tuần trước chưa có dữ liệu của xe ${plate}.`);
      return;
    }

    const dayMap = previousWeekDays.reduce((acc, day, idx) => {
      acc[day.date] = weekDays[idx]?.date;
      return acc;
    }, {});

    const translated = previousRecords.map((item) => ({
      ...item,
      id: "",
      ngay: dayMap[item.ngay] || item.ngay,
      trangThai: "kehoach",
    }));

    setWeeklyVehicleDrafts((prev) => ({
      ...prev,
      [plate]: createVehicleWeekDraft(plate, weekDays, translated),
    }));
    setWeeklyMessage(`Đã copy dữ liệu tuần trước cho xe ${plate}.`);
  };

  const handleNewVehicleFieldChange = (field, value) => {
    setNewVehicleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddVehicle = () => {
    const plate = String(newVehicleForm.plate || "").trim().toUpperCase().replace(/\s+/g, "");
    const driver = String(newVehicleForm.driver || "").trim();
    const phone = String(newVehicleForm.phone || "").trim();
    if (!plate || !driver || !phone) {
      setWeeklyMessage("Vui lòng nhập đủ biển số xe, họ tên tài xế và số điện thoại.");
      return;
    }

    const all = readWeeklyVehicleMasters();
    const exists = all.some((item) => item.plate.toUpperCase() === plate);
    if (exists) {
      setWeeklyMessage("Không thể thêm mới: biển số xe đã tồn tại.");
      return;
    }

    const next = [
      ...all,
      {
        id: `vm-${Date.now()}`,
        plate,
        driver,
        phone,
        status: "hoatdong",
      },
    ];
    saveWeeklyVehicleMasters(next);
    setVehicleMasterVersion((v) => v + 1);
    setNewVehicleForm({ plate: "", driver: "", phone: "" });
    setShowAddVehicleForm(false);
    setWeeklyMessage(`Đã thêm xe ${plate} vào danh sách lập lịch.`);
  };

  const handleDeleteVehicle = (vehicle) => {
    const all = readWeeklyVehicleMasters();
    const next = all.filter((item) => item.id !== vehicle.id);
    saveWeeklyVehicleMasters(next);
    setVehicleMasterVersion((v) => v + 1);
    setWeeklyVehicleDrafts((prev) => {
      const nextDrafts = { ...prev };
      delete nextDrafts[vehicle.plate];
      return nextDrafts;
    });
    setExpandedVehicles((prev) => {
      const nextOpen = { ...prev };
      delete nextOpen[vehicle.plate];
      return nextOpen;
    });
    setWeeklyMessage(`Đã xóa xe ${vehicle.plate} khỏi danh sách.`);
  };

  const handleSaveVehicleSchedule = (vehicle) => {
    if (!String(vehicle.phone || "").trim()) {
      setWeeklyMessage("Xe chưa có số điện thoại tài xế trong master data, không thể lưu.");
      return;
    }

    const draft = getVehicleDraft(vehicle.plate);
    const weekDates = new Set(weekDays.map((day) => day.date));

    const payloadRows = [...draft.ca1.map((row) => ({ ...row, ca: "ca1" })), ...draft.ca2.map((row) => ({ ...row, ca: "ca2" }))]
      .filter(isScheduleRowFilled)
      .map((row) => ({
        id: row.id || `lt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ngay: row.ngay,
        ca: row.ca,
        gioChay: row.gio,
        xe: vehicle.plate,
        taiXe: vehicle.driver,
        soDienThoai: vehicle.phone,
        tuyen: row.moTa,
        moTa: row.moTa,
        congViec: row.congViec,
        loaiChuyen: "phatsinh",
        doUuTien: row.uuTien || "trungbinh",
        gioChuan: "",
        trangThai: "kehoach",
        dieuPhoi: "",
        backup: false,
        ghiChu: row.ghiChu || "",
      }));

    const current = readWeeklyRecords();
    const replacingRows = current.filter((item) => item.xe === vehicle.plate && weekDates.has(item.ngay));
    if (replacingRows.length > 0) {
      const ok = window.confirm(
        `Xe ${vehicle.plate} đang có ${replacingRows.length} dòng lịch trong tuần này. Bạn có chắc muốn ghi đè bằng dữ liệu mới?`
      );
      if (!ok) {
        setWeeklyMessage("Đã hủy thao tác ghi đè lịch tuần.");
        return;
      }
    }
    const others = current.filter((item) => !(item.xe === vehicle.plate && weekDates.has(item.ngay)));
    const finalRecords = [...others, ...payloadRows];
    saveWeeklyRecords(finalRecords);
    setWeeklyVersion((v) => v + 1);
    setWeeklyVehicleDrafts((prev) => ({
      ...prev,
      [vehicle.plate]: createVehicleWeekDraft(vehicle.plate, weekDays, finalRecords),
    }));
    setWeeklyMessage(
      `Đã lưu lịch tuần cho xe ${vehicle.plate} (${payloadRows.length} chuyến).`
    );
  };

  const toggleVehicleAccordion = (plate) => {
    setExpandedVehicles((prev) => ({ ...prev, [plate]: !prev[plate] }));
  };

  const handleInspectionFieldChange = (field, value) => {
    setInspectionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInspectionCheckChange = (groupKey, itemName, value) => {
    setInspectionForm((prev) => ({
      ...prev,
      checks: {
        ...prev.checks,
        [groupKey]: {
          ...prev.checks[groupKey],
          [itemName]: value,
        },
      },
      issueNotes:
        value === "ok"
          ? {
              ...prev.issueNotes,
              [groupKey]: {
                ...prev.issueNotes[groupKey],
                [itemName]: "",
              },
            }
          : prev.issueNotes,
    }));
  };

  const handleInspectionIssueNoteChange = (groupKey, itemName, value) => {
    setInspectionForm((prev) => ({
      ...prev,
      issueNotes: {
        ...prev.issueNotes,
        [groupKey]: {
          ...prev.issueNotes[groupKey],
          [itemName]: value,
        },
      },
    }));
  };

  const handleInspectionExpiryChange = (itemName, value) => {
    setInspectionForm((prev) => ({
      ...prev,
      documentExpiry: {
        ...prev.documentExpiry,
        [itemName]: value,
      },
    }));
  };

  const handleInspectionDateOrPlateChange = (field, value) => {
    setInspectionForm((prev) => {
      const next = { ...prev, [field]: value };
      if (!next.date || !(next.plate || next.vehicle)) return next;
      const loaded = readInspectionRecord(next.date, next.plate || next.vehicle);
      if (loaded) {
        if (!loaded.documentExpiry) {
          loaded.documentExpiry = DOCUMENT_ITEMS_WITH_EXPIRY.reduce((acc, itemName) => {
            acc[itemName] = "";
            return acc;
          }, {});
        }
        if (!loaded.issueNotes) {
          loaded.issueNotes = createInspectionIssueNotes();
        }
        setInspectionMessage("Đã tải dữ liệu kiểm tra đã lưu.");
        return loaded;
      }
      return next;
    });
  };

  const handleInspectionSave = () => {
    const counts = INSPECTION_GROUPS.reduce(
      (acc, group) => {
        group.items.forEach((itemName) => {
          const status = getEffectiveInspectionStatus(inspectionForm, group.key, itemName);
          if (status === "minor") acc.minorCount += 1;
          if (status === "major") acc.majorCount += 1;
        });
        return acc;
      },
      { minorCount: 0, majorCount: 0 }
    );
    const result = getInspectionResult(counts);
    if (counts.majorCount > 0 && !inspectionForm.note.trim()) {
      setInspectionMessage("Có lỗi nghiêm trọng, vui lòng nhập ghi chú trước khi lưu.");
      return;
    }
    if (!inspectionForm.date || !(inspectionForm.plate.trim() || inspectionForm.vehicle.trim())) {
      setInspectionMessage("Vui lòng nhập ngày và xe / biển số trước khi lưu.");
      return;
    }

    const payload = {
      ...inspectionForm,
      vehicle: inspectionForm.vehicle.trim(),
      plate: inspectionForm.plate.trim(),
      driver: inspectionForm.driver.trim(),
      route: inspectionForm.route.trim(),
      odo: inspectionForm.odo?.toString() || "",
      note: inspectionForm.note.trim(),
      minorCount: counts.minorCount,
      majorCount: counts.majorCount,
      result,
      updatedAt: new Date().toISOString(),
    };

    saveInspectionRecord(payload);
    setInspectionForm(payload);
    setInspectionMessage("Đã lưu kiểm tra xe thành công.");
  };

  const handleInspectionReset = () => {
    setInspectionForm(createDefaultInspectionForm(getToday()));
    setInspectionMessage("Đã làm mới form kiểm tra xe.");
  };

  const handleTransferIssuesToWeek = () => {
    const counts = INSPECTION_GROUPS.reduce(
      (acc, group) => {
        group.items.forEach((itemName) => {
          const status = getEffectiveInspectionStatus(inspectionForm, group.key, itemName);
          if (status === "minor") acc.minorCount += 1;
          if (status === "major") acc.majorCount += 1;
        });
        return acc;
      },
      { minorCount: 0, majorCount: 0 }
    );
    if (counts.minorCount === 0 && counts.majorCount === 0) {
      setInspectionMessage("Không có lỗi để chuyển sang theo dõi tuần.");
      return;
    }
    if (!inspectionForm.date || !(inspectionForm.plate.trim() || inspectionForm.vehicle.trim())) {
      setInspectionMessage("Vui lòng nhập ngày và xe / biển số trước khi chuyển.");
      return;
    }
    const issueRecords = toWeeklyIssueRecords(inspectionForm);
    const existing = readWeeklyIssueRecords();
    const seen = new Set(
      existing.map(
        (x) =>
          `${x.ngayPhatHien || ""}|${x.bienSo || x.xe || ""}|${x.maMuc || ""}|${x.loiPhatHien || ""}`
      )
    );
    const uniqueNew = issueRecords.filter((x) => {
      const key = `${x.ngayPhatHien || ""}|${x.bienSo || x.xe || ""}|${x.maMuc || ""}|${x.loiPhatHien || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    saveWeeklyIssueRecords([...existing, ...uniqueNew]);
    setWeeklyIssueVersion((v) => v + 1);
    setInspectionMessage(`Đã chuyển ${uniqueNew.length}/${issueRecords.length} lỗi sang theo dõi tuần.`);
  };

  useEffect(() => {
    setTab(getSafeTab(initialTab));
  }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof onTabChange === "function") {
      onTabChange(tab);
    }
  }, [tab, onTabChange]);

  return (
    <div className="dx-page ops-standard-page">
      <div className="dx-shell">
        <ModuleShell
          title="Quản lý đội xe"
          subtitle="Theo dõi vận hành xe, quãng đường, tiêu hao nhiên liệu và cảnh báo bất thường."
          stats={[
            { label: "Tổng nhật ký", value: stats.tongNhatKy },
            { label: "Xe hoạt động", value: stats.tongXeCoMat },
            { label: "Cảnh báo / sự cố", value: stats.tongCanhBao, tone: "danger" },
          ]}
        />

        {tab === "nhatky" && (
          <>
            <div className="dx-card">
              <div className="dx-card-header">
                <div>
                  <h2>Nhật ký xe hằng ngày</h2>
                  <p>Nhập nhanh dữ liệu vận hành thực tế, lưu theo đúng ngày thao tác.</p>
                </div>
                <div className="dx-save-chip">{saveMessage}</div>
              </div>

              <div className="dx-form-grid">
                <div className="dx-field">
                  <label>Ngày</label>
                  <input
                    type="date"
                    value={form.ngay}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>

                <div className="dx-field">
                  <label>Xe / Biển số</label>
                  <select
                    value={form.xe}
                    onChange={(e) => handleFieldChange("xe", e.target.value)}
                  >
                    <option value="">Chọn xe</option>
                    {XE_OPTIONS.map((xe) => (
                      <option key={xe} value={xe}>
                        {xe}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dx-field">
                  <label>Tài xế</label>
                  <input
                    type="text"
                    placeholder="Nhập tên tài xế"
                    value={form.taiXe}
                    onChange={(e) => handleFieldChange("taiXe", e.target.value)}
                  />
                </div>

                <div className="dx-field">
                  <label>ODO hiện tại</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 1200"
                    value={form.odo}
                    onChange={(e) => handleFieldChange("odo", e.target.value)}
                  />
                </div>

                <div className="dx-field">
                  <label>Tuyến / Canteen</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Đồng Nai - Block A"
                    value={form.tuyen}
                    onChange={(e) => handleFieldChange("tuyen", e.target.value)}
                  />
                </div>

                <div className="dx-field">
                  <label>Số lít đổ (nếu có)</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 20"
                    value={form.litDo}
                    onChange={(e) => handleFieldChange("litDo", e.target.value)}
                  />
                </div>

                <div className="dx-field">
                  <label>Đơn giá DO (đ/lít)</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 24500"
                    value={form.donGiaDo}
                    onChange={(e) => handleFieldChange("donGiaDo", e.target.value)}
                  />
                </div>
              </div>

              <div className="dx-metric-panel">
                <div className="dx-section-title">Phân tích nhiên liệu</div>

                <div className="dx-metric-grid">
                  <div className="dx-metric-card">
                    <span className="dx-metric-label">Km chạy</span>
                    <strong>{metrics.kmDaChay !== null ? `${metrics.kmDaChay}` : "-"}</strong>
                  </div>

                  <div className="dx-metric-card">
                    <span className="dx-metric-label">Lít đổ</span>
                    <strong>{form.litDo ? `${form.litDo}` : "-"}</strong>
                  </div>

                  <div className="dx-metric-card">
                    <span className="dx-metric-label">Hiệu suất tạm tính</span>
                    <strong>
                      {metrics.tieuHao !== null ? `${metrics.tieuHao.toFixed(1)} l/100km` : "-"}
                    </strong>
                  </div>
                </div>

                <div className="dx-analysis-line">
                  {metrics.canhBao.length > 0 ? (
                    metrics.canhBao.map((item) => (
                      <span
                        key={item.label}
                        className={`dx-badge ${
                          item.tone === "danger"
                            ? "dx-badge-danger"
                            : item.tone === "warning"
                            ? "dx-badge-warning"
                            : "dx-badge-neutral"
                        }`}
                      >
                        {item.label}
                      </span>
                    ))
                  ) : (
                    <span className="dx-badge dx-badge-ok">Không có dấu hiệu bất thường</span>
                  )}
                </div>
              </div>

              <div className="dx-alert-box">
                <div className="dx-alert-box-title">Sự cố / ghi nhận nhanh</div>
                <div className="dx-check-row">
                  <label className="dx-check danger">
                    <input
                      type="checkbox"
                      checked={form.treGio}
                      onChange={(e) => handleFieldChange("treGio", e.target.checked)}
                    />
                    <span>Trễ giờ</span>
                  </label>

                  <label className="dx-check warning">
                    <input
                      type="checkbox"
                      checked={form.thieuHang}
                      onChange={(e) => handleFieldChange("thieuHang", e.target.checked)}
                    />
                    <span>Thiếu hàng</span>
                  </label>

                  <label className="dx-check danger">
                    <input
                      type="checkbox"
                      checked={form.rotHang}
                      onChange={(e) => handleFieldChange("rotHang", e.target.checked)}
                    />
                    <span>Rớt hàng</span>
                  </label>

                  <label className="dx-check neutral">
                    <input
                      type="checkbox"
                      checked={form.suCoKyThuat}
                      onChange={(e) => handleFieldChange("suCoKyThuat", e.target.checked)}
                    />
                    <span>Sự cố kỹ thuật</span>
                  </label>
                </div>
                {form.suCoKyThuat && (
                  <div className="dx-incident-cost-row">
                    <div className="dx-field">
                      <label>Giá tiền sự cố kỹ thuật (đ)</label>
                      <input
                        type="number"
                        placeholder="Ví dụ: 1500000"
                        value={form.giaSuCoKyThuat}
                        onChange={(e) => handleFieldChange("giaSuCoKyThuat", e.target.value)}
                      />
                    </div>
                    <div className="dx-field">
                      <label>Chi tiết sự cố kỹ thuật</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: vá vỏ, thay bánh, thay nhớt..."
                        list="dx-incident-detail-options"
                        value={form.chiTietSuCoKyThuat || ""}
                        onChange={(e) => handleFieldChange("chiTietSuCoKyThuat", e.target.value)}
                      />
                      <datalist id="dx-incident-detail-options">
                        {INCIDENT_DETAIL_SUGGESTIONS.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                )}
              </div>

              <div className="dx-field dx-field-full">
                <label>Ghi chú thêm</label>
                <textarea
                  rows={4}
                  placeholder="Nhập ghi chú nếu có..."
                  value={form.ghiChu}
                  onChange={(e) => handleFieldChange("ghiChu", e.target.value)}
                />
              </div>

              <div className="dx-action-row">
                <button type="button" className="dx-btn dx-btn-primary" onClick={handleSave}>
                  Lưu nhật ký
                </button>
                <button type="button" className="dx-btn dx-btn-secondary" onClick={handleReset}>
                  Làm mới form
                </button>
              </div>
            </div>

            <div className="dx-card">
              <div className="dx-history-head">
                <div>
                  <h2>Lịch sử nhật ký</h2>
                  <p>Xem nhanh dữ liệu đã lưu, bấm vào dòng để tải lại form.</p>
                </div>
              </div>

              {sortedRecords.length === 0 ? (
                <div className="dx-empty">Chưa có dữ liệu.</div>
              ) : (
                <div className="dx-history-list">
                    {sortedRecords.map((entry) => {
                      const { key, item, date } = entry;
                    const baseBadges = buildBadges(item);
                    const extraMetrics = getHistoryMetrics(item, records);

                    return (
                      <button
                          key={key}
                        type="button"
                        className="dx-history-item"
                          onClick={() => handleOpenRecord(date, item)}
                      >
                        <div className="dx-history-left">
                          <div className="dx-history-date">{formatDate(date)}</div>
                          <div className="dx-history-xe-line">
                            <span className="dx-history-xe">{item.xe || "Chưa chọn xe"}</span>
                            <span className="dx-history-driver">{item.taiXe || "Chưa nhập tài xế"}</span>
                          </div>
                          <div className="dx-history-route">{item.tuyen || "Chưa nhập tuyến"}</div>

                          <div className="dx-history-detail">
                            <span>ODO: {item.odo || "-"}</span>
                            <span>Lít đổ: {item.litDo || "-"}</span>
                            <span>Đơn giá DO: {item.donGiaDo || "-"}</span>
                            {item.suCoKyThuat && (
                              <span>
                                Sự cố KT: {item.giaSuCoKyThuat || "-"}
                                {item.chiTietSuCoKyThuat ? ` (${item.chiTietSuCoKyThuat})` : ""}
                              </span>
                            )}
                            <span>
                              Km chạy: {extraMetrics.kmDaChay !== null ? extraMetrics.kmDaChay : "-"}
                            </span>
                            <span>
                              Hiệu suất:{" "}
                              {extraMetrics.tieuHao !== null
                                ? `${extraMetrics.tieuHao.toFixed(1)} l/100km`
                                : "-"}
                            </span>
                          </div>
                        </div>

                        <div className="dx-history-right">
                          <div className="dx-history-tags">
                            {baseBadges.length > 0 ? (
                              baseBadges.map((badge) => (
                                <span
                                  key={badge.label}
                                  className={`dx-badge ${
                                    badge.tone === "danger"
                                      ? "dx-badge-danger"
                                      : badge.tone === "warning"
                                      ? "dx-badge-warning"
                                      : "dx-badge-neutral"
                                  }`}
                                >
                                  {badge.label}
                                </span>
                              ))
                            ) : (
                              <span className="dx-badge dx-badge-ok">Bình thường</span>
                            )}
                          </div>

                          {extraMetrics.canhBao.length > 0 && (
                            <div className="dx-history-warning-group">
                              {extraMetrics.canhBao.map((warn) => (
                                <span
                                  key={warn.label}
                                  className={`dx-badge ${
                                    warn.tone === "danger"
                                      ? "dx-badge-danger"
                                      : warn.tone === "warning"
                                      ? "dx-badge-warning"
                                      : "dx-badge-neutral"
                                  }`}
                                >
                                  {warn.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "lichtuan" && (
          <>
            <div className="dx-card">
              <div className="dx-card-header">
                <div>
                  <h2>Lịch trình xe tuần</h2>
                  <p>Module lịch trình tách riêng, chỉ lấy danh sách xe từ Master Data để lập lịch linh động.</p>
                </div>
                <div className="dx-save-chip">{weeklyMessage}</div>
              </div>

              <div className="dx-week-add-block">
                <button
                  type="button"
                  className="dx-btn dx-btn-secondary dx-btn-small"
                  onClick={() => setShowAddVehicleForm((prev) => !prev)}
                >
                  {showAddVehicleForm ? "Ẩn thêm xe" : "+ Thêm xe mới"}
                </button>

                {showAddVehicleForm && (
                  <div className="dx-week-add-row">
                    <div className="dx-field">
                      <label>Biển số xe (nhập tay)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 60C99999"
                        value={newVehicleForm.plate}
                        onChange={(e) => handleNewVehicleFieldChange("plate", e.target.value)}
                      />
                    </div>
                    <div className="dx-field">
                      <label>Họ tên tài xế (nhập tay)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={newVehicleForm.driver}
                        onChange={(e) => handleNewVehicleFieldChange("driver", e.target.value)}
                      />
                    </div>
                    <div className="dx-field">
                      <label>Số điện thoại (bắt buộc)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 0909000001"
                        value={newVehicleForm.phone}
                        onChange={(e) => handleNewVehicleFieldChange("phone", e.target.value)}
                      />
                    </div>
                    <div className="dx-week-add-action">
                      <button type="button" className="dx-btn dx-btn-primary dx-btn-small" onClick={handleAddVehicle}>
                        + Thêm xe
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="dx-week-toolbar">
                <div className="dx-week-switch">
                  <div className="dx-week-picker-box">
                    <label>Tuần trực</label>
                    <div className="dx-week-picker-inline">
                      <input
                        type="week"
                        value={weekInputValue}
                        onChange={(e) => setWeekKey(getWeekKeyFromWeekInput(e.target.value))}
                      />
                      <span>{getWeekLabel(weekKey)}</span>
                    </div>
                  </div>
                  <div className="dx-week-picker-box">
                    <label>Chọn xe hiển thị</label>
                    <select
                      value={scheduleVehicleFilter}
                      onChange={(e) => setScheduleVehicleFilter(e.target.value)}
                    >
                      <option value="">Tất cả xe đủ dữ liệu</option>
                      {schedulableVehicles.map((item) => (
                        <option key={item.id} value={item.plate}>
                          {item.plate}
                        </option>
                      ))}
                    </select>
                    <span>Chỉ xe có số điện thoại mới được lập lịch.</span>
                  </div>
                </div>
              </div>

              <div className="dx-week-summary-row">
                <div className="dx-week-inline-card">
                  <span>Tổng số xe</span>
                  <strong>{vehicleScheduleSummary.tongXe}</strong>
                </div>
                <div className="dx-week-inline-card">
                  <span>Tổng chuyến</span>
                  <strong>{vehicleScheduleSummary.tongChuyen}</strong>
                </div>
                <div className="dx-week-inline-card">
                  <span>Xe quá tải</span>
                  <strong>{vehicleScheduleSummary.xeQuaTai}</strong>
                </div>
                <div className="dx-week-inline-card">
                  <span>Ít chuyến</span>
                  <strong>{vehicleScheduleSummary.xeNhan}</strong>
                </div>
              </div>

              <div className="dx-analysis-line">
                <span className="dx-badge dx-badge-neutral">{vehicleScheduleSummary.phanBo}</span>
              </div>

              {blockedVehicles.length > 0 && (
                <div className="dx-analysis-line">
                  <span className="dx-badge dx-badge-danger">
                    {`Có ${blockedVehicles.length} xe thiếu SĐT, chưa thể chọn để nhập lịch.`}
                  </span>
                </div>
              )}

              <div className="dx-week-accordion-list">
                {displayedVehicles.map((vehicle) => {
                  const draft = getVehicleDraft(vehicle.plate);
                  const totalTrips =
                    draft.ca1.filter(isScheduleRowFilled).length + draft.ca2.filter(isScheduleRowFilled).length;
                  const level = getVehicleLoadLevel(totalTrips);
                  const isOpen = Boolean(expandedVehicles[vehicle.plate]);

                  return (
                    <div key={vehicle.id} className="dx-week-vehicle-accordion">
                      <button
                        type="button"
                        className="dx-week-vehicle-head"
                        onClick={() => toggleVehicleAccordion(vehicle.plate)}
                      >
                        <div>
                          <strong>{`🚚 ${vehicle.plate}`}</strong>
                          <span>
                            {vehicle.driver} • {vehicle.phone}
                          </span>
                        </div>
                        <div className="dx-history-tags">
                          <span className="dx-badge dx-badge-neutral">{`${totalTrips} chuyến`}</span>
                          <span
                            className={`dx-badge ${
                              level.tone === "danger"
                                ? "dx-badge-danger"
                                : level.tone === "ok"
                                ? "dx-badge-ok"
                                : "dx-badge-warning"
                            }`}
                          >
                            {level.label}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="dx-week-vehicle-body">
                          <div className="dx-week-actions">
                            <button
                              type="button"
                              className="dx-btn dx-btn-secondary dx-btn-small"
                              onClick={() => handleDeleteVehicle(vehicle)}
                            >
                              Xóa xe
                            </button>
                            <button
                              type="button"
                              className="dx-btn dx-btn-secondary dx-btn-small"
                              onClick={() => handleCopyVehiclePreviousWeek(vehicle.plate)}
                            >
                              Copy tuần trước (xe này)
                            </button>
                            <button
                              type="button"
                              className="dx-btn dx-btn-primary dx-btn-small"
                              onClick={() => handleSaveVehicleSchedule(vehicle)}
                            >
                              Lưu lịch xe này
                            </button>
                          </div>

                          {scheduleCaOptions.map((caItem) => (
                            <div key={caItem.value} className="dx-week-ca-block">
                              <div className="dx-week-ca-head">
                                <h3>{caItem.label}</h3>
                                <div className="dx-schedule-actions">
                                  <button
                                    type="button"
                                    className="dx-inline-btn"
                                    onClick={() =>
                                      handleCopyCa(
                                        vehicle.plate,
                                        caItem.value === "ca1" ? "ca2" : "ca1",
                                        caItem.value
                                      )
                                    }
                                  >
                                    {caItem.value === "ca1" ? "Copy từ Ca 2" : "Copy từ Ca 1"}
                                  </button>
                                </div>
                              </div>

                              <div className="dx-week-table-wrap">
                                <table className="dx-week-plan-table">
                                  <thead>
                                    <tr>
                                      <th>Thứ</th>
                                      <th>Giờ</th>
                                      <th>Mô tả</th>
                                      <th>Công việc</th>
                                      <th>Ưu tiên</th>
                                      <th>Ghi chú</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {draft[caItem.value].map((row, idx) => (
                                      <tr key={`${vehicle.plate}-${caItem.value}-${row.ngay}`}>
                                        <td>{row.thu}</td>
                                        <td>
                                          <input
                                            type="text"
                                            inputMode="numeric"
                                            value={row.gio}
                                            placeholder="VD: 07:30"
                                            onChange={(e) =>
                                              updateVehicleDraftRow(
                                                vehicle.plate,
                                                caItem.value,
                                                idx,
                                                "gio",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="text"
                                            value={row.moTa}
                                            placeholder="Nhập mô tả tuyến/chuyến"
                                            onChange={(e) =>
                                              updateVehicleDraftRow(
                                                vehicle.plate,
                                                caItem.value,
                                                idx,
                                                "moTa",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <input
                                            type="text"
                                            value={row.congViec}
                                            placeholder="Nhập hoặc chọn gợi ý"
                                            list="dx-week-job-suggestions"
                                            onChange={(e) =>
                                              updateVehicleDraftRow(
                                                vehicle.plate,
                                                caItem.value,
                                                idx,
                                                "congViec",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <select
                                            value={row.uuTien}
                                            onChange={(e) =>
                                              updateVehicleDraftRow(
                                                vehicle.plate,
                                                caItem.value,
                                                idx,
                                                "uuTien",
                                                e.target.value
                                              )
                                            }
                                          >
                                            {PRIORITY_OPTIONS.map((priority) => (
                                              <option key={priority.value} value={priority.value}>
                                                {priority.label}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          <input
                                            type="text"
                                            value={row.ghiChu}
                                            placeholder="Ghi chú linh động"
                                            onChange={(e) =>
                                              updateVehicleDraftRow(
                                                vehicle.plate,
                                                caItem.value,
                                                idx,
                                                "ghiChu",
                                                e.target.value
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            className="dx-inline-btn"
                                            onClick={() =>
                                              handleCopyPreviousRow(vehicle.plate, caItem.value, idx)
                                            }
                                            disabled={idx === 0}
                                          >
                                            Copy dòng trước
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <datalist id="dx-week-job-suggestions">
                {jobSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </>
        )}

        {tab === "kiemtra" && (
          <div className="dx-card">
            <div className="dx-card-header">
              <div>
                <h2>Kiểm tra xe</h2>
                <p>Kiểm tra nhanh tình trạng xe trước khi vận hành.</p>
              </div>
              <div className="dx-save-chip">{inspectionMessage}</div>
            </div>

            <div className="dx-inspect-info-grid dx-inspect-info-grid-top">
              <div className="dx-field dx-inspect-pill-field dx-inspect-pill-pop">
                <label>Ngày</label>
                <input
                  type="date"
                  value={inspectionForm.date}
                  onChange={(e) => handleInspectionDateOrPlateChange("date", e.target.value)}
                />
              </div>

              <div className="dx-field dx-inspect-pill-field dx-inspect-pill-pop">
                <label>Xe</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Xe tải 1.5T"
                  value={inspectionForm.vehicle}
                  onChange={(e) => handleInspectionDateOrPlateChange("vehicle", e.target.value)}
                />
              </div>

              <div className="dx-field dx-inspect-pill-field dx-inspect-pill-pop">
                <label>Biển số</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 60C53518"
                  value={inspectionForm.plate}
                  onChange={(e) => handleInspectionDateOrPlateChange("plate", e.target.value)}
                />
              </div>

              <div className="dx-field dx-inspect-pill-field">
                <label>Tài xế</label>
                <input
                  type="text"
                  placeholder="Nhập tên tài xế"
                  value={inspectionForm.driver}
                  onChange={(e) => handleInspectionFieldChange("driver", e.target.value)}
                />
              </div>

              <div className="dx-field dx-inspect-pill-field">
                <label>Tuyến / Điểm giao</label>
                <input
                  type="text"
                  placeholder="Ví dụ: CMC - Block B"
                  value={inspectionForm.route}
                  onChange={(e) => handleInspectionFieldChange("route", e.target.value)}
                />
              </div>

              <div className="dx-field dx-inspect-pill-field">
                <label>ODO hiện tại</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 153240"
                  value={inspectionForm.odo}
                  onChange={(e) => handleInspectionFieldChange("odo", e.target.value)}
                />
              </div>
            </div>

            <div className="dx-inspect-group-list">
              {INSPECTION_GROUPS.map((group, groupIndex) => (
                <div key={group.key} className="dx-inspect-group-card">
                  <div className="dx-inspect-group-head">
                    <div className="dx-inspect-group-title">{`${groupIndex + 1}. ${group.title}`}</div>
                    <button
                      type="button"
                      className="dx-inline-btn"
                      onClick={() =>
                        setOpenGuideGroup((prev) => (prev === group.key ? "" : group.key))
                      }
                    >
                      Hướng dẫn mức lỗi
                    </button>
                  </div>

                  {openGuideGroup === group.key && (
                    <div className="dx-inspect-guide-box">
                      <div>
                        <strong>Lỗi nhẹ</strong>
                        <p>Xe vẫn có thể vận hành tạm thời, cần theo dõi và xử lý sớm.</p>
                      </div>
                      <div>
                        <strong>Lỗi nghiêm trọng</strong>
                        <p>Ảnh hưởng an toàn/vận hành, cần dừng xe hoặc xử lý ngay.</p>
                      </div>
                    </div>
                  )}

                  <div className="dx-inspect-item-list">
                    {group.items.map((itemName, itemIndex) => (
                      <div key={itemName} className="dx-inspect-item-row">
                        <div className="dx-inspect-item-main">
                          <span>{`${groupIndex + 1}.${itemIndex + 1} ${itemName}`}</span>
                          {group.key === "documents" && DOCUMENT_ITEMS_WITH_EXPIRY.includes(itemName) && (
                            <div className="dx-inspect-expiry-wrap">
                              <input
                                type="date"
                                value={inspectionForm.documentExpiry?.[itemName] || ""}
                                onChange={(e) => handleInspectionExpiryChange(itemName, e.target.value)}
                                className="dx-inspect-expiry-input"
                              />
                              {(() => {
                                const daysLeft = getDaysLeft(inspectionForm.documentExpiry?.[itemName] || "");
                                const expiryMeta = getExpiryMeta(daysLeft);
                                if (!expiryMeta) return null;
                                return (
                                  <span
                                    className={`dx-badge ${
                                      expiryMeta.tone === "danger"
                                        ? "dx-badge-danger"
                                        : expiryMeta.tone === "critical"
                                        ? "dx-badge-critical"
                                        : expiryMeta.tone === "warning"
                                        ? "dx-badge-warning"
                                        : "dx-badge-ok"
                                    }`}
                                  >
                                    {expiryMeta.label} ({daysLeft} ngày)
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        <div className="dx-inspect-status-options">
                          {INSPECTION_STATUS_OPTIONS.map((statusItem) => (
                            <label
                              key={statusItem.value}
                              className={`dx-inspect-radio ${
                                statusItem.value === "major"
                                  ? "danger"
                                  : statusItem.value === "minor"
                                  ? "warning"
                                  : "ok"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`${group.key}-${itemName}`}
                                value={statusItem.value}
                                checked={
                                  getEffectiveInspectionStatus(inspectionForm, group.key, itemName) ===
                                  statusItem.value
                                }
                                onChange={(e) =>
                                  handleInspectionCheckChange(group.key, itemName, e.target.value)
                                }
                                disabled={
                                  group.key === "documents" &&
                                  DOCUMENT_ITEMS_WITH_EXPIRY.includes(itemName) &&
                                  getDaysLeft(inspectionForm.documentExpiry?.[itemName] || "") !== null &&
                                  getDaysLeft(inspectionForm.documentExpiry?.[itemName] || "") <= 0 &&
                                  statusItem.value !== "major"
                                }
                              />
                              <span>{statusItem.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="dx-inspect-note-cell">
                          <input
                            type="text"
                            placeholder="Mô tả lỗi (nếu có)"
                            value={inspectionForm.issueNotes?.[group.key]?.[itemName] || ""}
                            onChange={(e) =>
                              handleInspectionIssueNoteChange(group.key, itemName, e.target.value)
                            }
                            disabled={
                              getEffectiveInspectionStatus(inspectionForm, group.key, itemName) === "ok"
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="dx-inspect-result-row">
              <div className="dx-inspect-result-card">
                <span>Tổng lỗi minor</span>
                <strong>{inspectionSummary.minorCount}</strong>
              </div>
              <div className="dx-inspect-result-card">
                <span>Tổng lỗi major</span>
                <strong>{inspectionSummary.majorCount}</strong>
              </div>
              <div className="dx-inspect-result-card dx-inspect-result-card-wide">
                <span>Kết luận xe</span>
                <strong>
                  <span
                    className={`dx-badge ${
                      getInspectionResultTone(inspectionSummary.result) === "danger"
                        ? "dx-badge-danger"
                        : getInspectionResultTone(inspectionSummary.result) === "warning"
                        ? "dx-badge-warning"
                        : "dx-badge-ok"
                    }`}
                  >
                    {inspectionSummary.result}
                  </span>
                </strong>
              </div>
            </div>

            <div className="dx-field dx-field-full">
              <label>Ghi chú lỗi</label>
              <textarea
                rows={3}
                placeholder="Nhập ghi chú ngắn gọn, bắt buộc khi có lỗi nghiêm trọng."
                value={inspectionForm.note}
                onChange={(e) => handleInspectionFieldChange("note", e.target.value)}
              />
            </div>

            {inspectionIssueSummary.length > 0 && (
              <div className="dx-inspect-summary-box">
                <div className="dx-alert-box-title">Tổng hợp lỗi phát hiện</div>
                <div className="dx-inspect-summary-groups">
                  {inspectionIssueSummary.map((group) => (
                    <div key={group.key} className="dx-inspect-summary-group">
                      <div className="dx-inspect-summary-title">{group.title}</div>
                      {group.items.map((item) => (
                        <div key={item.code} className="dx-inspect-summary-item">
                          <span className="dx-inspect-summary-code">{item.code}</span>
                          <span className="dx-inspect-summary-name">{item.itemName}</span>
                          <span
                            className={`dx-badge ${
                              item.status === "major" ? "dx-badge-danger" : "dx-badge-warning"
                            }`}
                          >
                            {getInspectionStatusLabel(item.status)}
                          </span>
                          <span className="dx-inspect-summary-desc">{item.description || "-"}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="dx-action-row">
              <button type="button" className="dx-btn dx-btn-primary" onClick={handleInspectionSave}>
                Lưu kiểm tra
              </button>
              <button
                type="button"
                className="dx-btn dx-btn-secondary"
                onClick={handleTransferIssuesToWeek}
                disabled={inspectionSummary.minorCount === 0 && inspectionSummary.majorCount === 0}
              >
                Chuyển sang theo dõi tuần
              </button>
              <button type="button" className="dx-btn dx-btn-secondary" onClick={handleInspectionReset}>
                Làm mới form
              </button>
            </div>
          </div>
        )}

        {tab === "tonghop" && (
          <div className="dx-card">
            <div className="dx-card-header">
              <div>
                <h2>Tổng hợp tháng</h2>
                <p>Góc nhìn đầu tư thông minh: hiệu suất, chi phí, rủi ro và hành động ưu tiên.</p>
              </div>
              <div className="dx-month-picker">
                <label>Chọn tháng</label>
                <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} />
              </div>
            </div>

            <div className="dx-month-kpi-grid">
              <div className="dx-month-kpi-card">
                <span>Tổng chi phí vận hành</span>
                <strong>{formatCurrency(monthlyDashboard.tongChiPhi)}</strong>
              </div>
              <div className="dx-month-kpi-card">
                <span>Tỉ lệ đúng giờ</span>
                <strong>{monthlyDashboard.tiLeDungGio.toFixed(1)}%</strong>
              </div>
              <div className="dx-month-kpi-card">
                <span>Số chuyến tháng</span>
                <strong>{monthlyDashboard.tongChuyen}</strong>
              </div>
              <div className="dx-month-kpi-card">
                <span>Điểm an toàn</span>
                <strong>{monthlyDashboard.scoreAnToan}</strong>
              </div>
              <div className="dx-month-kpi-card">
                <span>Lỗi major / minor</span>
                <strong>
                  {monthlyDashboard.majorCount} / {monthlyDashboard.minorCount}
                </strong>
              </div>
              <div className="dx-month-kpi-card">
                <span>Tỉ lệ khai thác ngày</span>
                <strong>{monthlyDashboard.tiLeKhaiThac.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="dx-month-visual-grid">
              <div className="dx-month-panel">
                <div className="dx-section-title">Cơ cấu chi phí tháng</div>
                <div className="dx-month-pie-wrap">
                  <div
                    className="dx-month-pie"
                    style={{ background: `conic-gradient(${monthlyDashboard.pieGradient})` }}
                  />
                  <div className="dx-month-pie-legend">
                    {monthlyDashboard.pieSegments.map((item) => (
                      <div key={item.key} className="dx-month-legend-item">
                        <span className="dx-month-dot" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                        <strong>{formatCurrency(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dx-month-panel">
                <div className="dx-section-title">Biểu đồ chi phí theo tuần</div>
                <div className="dx-month-bar-chart">
                  {monthlyDashboard.weekCosts.map((item) => (
                    <div key={item.label} className="dx-month-bar-col">
                      <div className="dx-month-bar-value">{formatCurrency(item.value)}</div>
                      <div className="dx-month-bar-track">
                        <div className="dx-month-bar-fill" style={{ height: `${item.ratio}%` }} />
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="dx-month-risk-grid">
              <div className="dx-month-panel">
                <div className="dx-section-title">Top xe rủi ro / chi phí cao</div>
                <div className="dx-month-risk-filter-row">
                  <div className="dx-field">
                    <label>Lọc theo xe</label>
                    <select
                      value={riskVehicleFilter}
                      onChange={(e) => setRiskVehicleFilter(e.target.value)}
                    >
                      <option value="">Tất cả xe</option>
                      {monthlyDashboard.riskyVehicles.map((item) => (
                        <option key={item.vehicle} value={item.vehicle}>
                          {item.vehicle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="dx-field">
                    <label>Từ khóa sự cố / lỗi</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: vá vỏ, thay bánh, 18/04..."
                      value={riskKeywordFilter}
                      onChange={(e) => setRiskKeywordFilter(e.target.value)}
                    />
                  </div>
                </div>
                {monthlyDashboard.riskyVehicles.length === 0 ? (
                  <div className="dx-empty">Tháng này chưa phát sinh lỗi theo xe.</div>
                ) : filteredRiskVehicles.length === 0 ? (
                  <div className="dx-empty">Không có xe phù hợp bộ lọc đang chọn.</div>
                ) : (
                  <div className="dx-month-risk-list">
                    {filteredRiskVehicles.map((item) => (
                      <div key={item.vehicle} className="dx-month-risk-item">
                        <div>
                          <strong>{item.vehicle}</strong>
                          <span>
                            Lỗi nghiêm trọng: {item.major} | Lỗi nhẹ: {item.minor} | Số sự cố: {item.issues}
                          </span>
                          {item.details?.length > 0 && (
                            <div className="dx-month-risk-details">
                              {item.details.map((detail) => (
                                <p key={`${item.vehicle}-${detail}`}>{detail}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        <strong>{formatCurrency(item.cost)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dx-month-panel">
                <div className="dx-section-title">Khuyến nghị hành động quản trị</div>
                <div className="dx-month-insight-list">
                  {monthlyDashboard.headline.map((line) => (
                    <div key={line} className="dx-month-insight-item">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
