
import React, { useEffect, useMemo, useState } from "react";
import { buildSiteSelectOptions, getShiftNames } from "../systemCatalog/masterData.js";
import { useMasterCatalogSnapshot } from "../systemCatalog/useMasterCatalogSnapshot.js";

/**
 * BaoCaoVanHanhBepForm.jsx
 * - 1 file JSX độc lập
 * - Form các mục theo flow vận hành (Nhóm A/B/C + Nhóm D tự động)
 * - Không lỗi thì cho qua nhanh
 * - Có lỗi mới bắt nhập chi tiết
 * - Có localStorage theo ngày + khu vực + ca
 */

function ToolbarIconCheck() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ToolbarIconSave() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function ToolbarIconRotateCcw() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function ToolbarIconClock() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

const STATUS_OPTIONS = [
  { value: "ok", label: "Ổn", color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  { value: "warning", label: "Cần chú ý", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  { value: "bad", label: "Không ổn", color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
];

const IMPACT_OPTIONS = [
  { value: "light", label: "Nhẹ" },
  { value: "medium", label: "Trung bình" },
  { value: "serious", label: "Nghiêm trọng" },
];

const labelYesNo = (v) => (v === "yes" ? "Có" : "Không");
/** enoughMeals: "no" = vượt ngưỡng thiếu suất → "Có" nghĩa là có thiếu (theo tên chỉ số). */
const labelThieuSuatCoKhong = (enoughMeals) => (enoughMeals === "no" ? "Có" : "Không");
const labelAtvstpResult = (v) => (v === "bad" ? "Không OK" : "OK");

const toneClassFromOpsGrade = (gradeKey) =>
  gradeKey === "fail" ? "bad" : gradeKey === "watch" ? "warning" : "ok";

/** Ổn / Cần chú ý / Không ổn — suy từ Phát sinh + Mức độ (không còn cột Trạng thái). */
function deriveIssueTone(section) {
  if (!section?.hasIssue) return "ok";
  if (section.impactLevel === "light") return "warning";
  if (section.impactLevel === "medium" || section.impactLevel === "serious") return "bad";
  return "warning";
}

function syncSectionStatusFromIssue(next) {
  const s = { ...next };
  if (!s.hasIssue) {
    s.status = "ok";
    return s;
  }
  if (s.impactLevel === "medium" || s.impactLevel === "serious") {
    s.status = "bad";
  } else {
    s.status = "warning";
  }
  return s;
}

const SOURCE_OPTIONS = [
  "Quản lý",
  "Giám sát DV",
  "Bếp",
  "Kho",
  "Kế toán",
  "Nhà cung cấp",
  "Thiết bị",
  "Nhân sự",
  "Khách hàng thay đổi suất",
  "Khác",
];

const RESPONSIBILITY_OPTIONS = [
  "Quản lý",
  "Giám sát DV",
  "Bếp trưởng",
  "Tổ bếp",
  "Kho",
  "Kỹ thuật",
  "Nhà cung cấp",
  "Khác",
];

const ISSUE_TYPE_OPTIONS = [
  "Nhân sự",
  "Nguyên liệu",
  "Sơ chế",
  "Chế biến",
  "Chia suất",
  "Phục vụ",
  "ATVSTP",
  "Thiết bị",
  "Hạ tầng",
  "Điều phối",
  "Giao tiếp / phản ánh khách",
  "Khác",
];

const DEFAULT_HEADER = {
  reportDate: new Date().toISOString().slice(0, 10),
  site: "Nhơn Trạch - Đồng Nai",
  kitchen: "",
  shift: "Ca ngày",
  manager: "",
  plannedMeals: "",
  actualMeals: "",
};

const createIssueState = (overrides = {}) => ({
  status: "ok",
  hasIssue: false,
  note: "",
  issueTitle: "",
  issueDetail: "",
  cause: "",
  issueSource: "",
  responsibility: "",
  issueType: "",
  impactLevel: "",
  actionTaken: "",
  issueOwner: "",
  issueDeadline: "",
  issueResult: "",
  ...overrides,
});

const createDefaultForm = () => ({
  header: { ...DEFAULT_HEADER },
  sections: {
    dauCaRuiRo: createIssueState(),
    nhapHangThamChieu: createIssueState(),
    soChe: createIssueState(),
    cheBien: createIssueState(),
    chiaSuat: createIssueState(),
    phanAnhKhach: createIssueState(),
    phucVu: createIssueState(),
    sauPhucVu: createIssueState(),
    haTangThietBi: createIssueState(),
    atvstp: createIssueState(),
    svcNhanBanGiao: createIssueState(),
    svcNhanSuPhucVu: createIssueState(),
    svcDungCuPhucVu: createIssueState(),
    svcMonLenLine: createIssueState(),
    svcDinhLuong: createIssueState(),
    svcSaiThieuMon: createIssueState(),
    svcThieuDuSuat: createIssueState(),
    svcTocDoChia: createIssueState(),
    svcBatDauPhucVu: createIssueState(),
    svcKetThucPhucVu: createIssueState(),
    svcTacLine: createIssueState(),
    svcThoiGianCho: createIssueState(),
    svcPhanAnh: createIssueState(),
    svcHaiLong: createIssueState(),
    svcNhietDoMon: createIssueState(),
    svcKhuAn: createIssueState(),
    svcThaiDo: createIssueState(),
    svcSaiThaoTac: createIssueState(),
    svcKhongHoTro: createIssueState(),
    svcKhongTuanThu: createIssueState(),
    bepKeHoachSuat: createIssueState(),
    bepNguyenLieuDauVao: createIssueState(),
    bepNhanSuBep: createIssueState(),
    bepThietBiSanSang: createIssueState(),
    bepQuyTrinhSoChe: createIssueState(),
    bepHaoHutNL: createIssueState(),
    bepThieuNLsauSoChe: createIssueState(),
    bepVeSinhSoChe: createIssueState(),
    bepLoiMonAn: createIssueState(),
    bepSoLuongLoi: createIssueState(),
    bepNhietDoMon: createIssueState(),
    bepSaiCongThuc: createIssueState(),
    bepSanLuongThucTe: createIssueState(),
    bepThieuSuat: createIssueState(),
    bepDuSuat: createIssueState(),
    bepTienDoMon: createIssueState(),
    bepChayHangPhatSinh: createBepChayHangSection(),
    bepBanGiaoSoLuong: createIssueState(),
    bepBanGiaoMon: createIssueState(),
    bepThoiGianBanGiao: createIssueState(),
    bepPhoiHopGSDV: createIssueState(),
    bepThietBiHong: createIssueState(),
    bepThietBiYeu: createIssueState(),
    bepAnhHuongSanXuat: createIssueState(),
    bepVeSinhThietBi: createIssueState(),
    bepBaoTri: createIssueState(),
    bepPPE: createIssueState(),
    bepVeSinhKhuNau: createIssueState(),
    bepLuuMau: createIssueState(),
    bepNhiemCheo: createIssueState(),
    bepNhietDoBaoQuan: createIssueState(),
    whHangHuKhongTuoi: createWarehouseSection(),
    whHangSaiQuyCach: createWarehouseSection(),
    whGiaoThieu: createWarehouseSection(),
    whKhongDuChoBep: createWarehouseSection(),
    whGiaoTre: createWarehouseSection(),
    whGiaoSai: createWarehouseSection(),
    whHsdGanHetHan: createWarehouseSection(),
    whHsdQuaHan: createWarehouseSection(),
    whHsdSaiDate: createWarehouseSection(),
    whHsdNguyCoHuy: createWarehouseSection(),
    whKhongDuLanh: createWarehouseSection(),
    whLuuKhoSai: createWarehouseSection(),
    whNguyCoHu: createWarehouseSection(),
    whThieuMon: createWarehouseSection(),
    whTreNau: createWarehouseSection(),
    whGayLoiMon: createWarehouseSection(),
    whHuHongKg: createWarehouseSection(),
    whNguyCoThieuCaSau: createWarehouseSection(),
    pmGiaTangBatThuong: createProcurementCostSection(),
    pmNccDoiGiaDotXuat: createProcurementCostSection(),
    pmGiaGiamAnhHuongChatLuong: createProcurementCostSection(),
    pmChayHangBoSung: createProcurementCostSection(),
    pmSaiDuBaoThieuDu: createProcurementCostSection(),
    pmSaiDinhLuong: createProcurementCostSection(),
    pmLamLaiMon: createProcurementCostSection(),
    pmMuaDungCuSuatAn: createProcurementCostSection(),
    pmMuaVatTuSuaChuaNho: createProcurementCostSection(),
    pmMuaDungCuGap: createProcurementCostSection(),
    pmChiPhiNgoaiKeHoach: createProcurementCostSection(),
    pmNccKhongOnDinh: createProcurementCostSection(),
    pmDoiNccGiaCaoHon: createProcurementCostSection(),
    pmThieuHangMuaNgoai: createProcurementCostSection(),
  },
  metrics: {
    enoughMeals: "yes",
    onTime: "yes",
    hasComplaint: "no",
    atvstpResult: "ok",
    complaintCount: 0,
    processingIssueCount: 0,
  },
  managerSummary: {
    overallStatus: "ok",
    impactLevel: "light",
    mainIssues: "",
    mainResponsibility: "",
    nextDayAction: "",
    generalComment: "",
  },
});

const MANAGEMENT_SECTION_CONFIG = [
  {
    group: "A",
    groupTitle: "Chuẩn bị vận hành",
    items: [
      {
        key: "dauCaRuiRo",
        title: "1. Đầu ca & rủi ro",
        description: "Kiểm tra điều kiện vận hành đầu ngày, nhân sự, nguyên liệu, rủi ro dự kiến.",
        quickFields: [
          { key: "staffStatus", label: "Nhân sự", type: "selectYN", placeholder: "" },
          { key: "materialStatus", label: "Nguyên liệu", type: "selectYN", placeholder: "" },
          { key: "riskForecast", label: "Rủi ro dự kiến", type: "text", placeholder: "Ví dụ: có khả năng thiếu suất ca trưa" },
        ],
      },
      {
        key: "nhapHangThamChieu",
        title: "2. Nhập hàng (tham chiếu)",
        description: "Chỉ ghi phát sinh liên quan hàng hóa đầu vào, sai hàng, thiếu hàng, hàng lỗi.",
        quickFields: [
          { key: "deliveryEnough", label: "Hàng giao đủ", type: "selectYN" },
          { key: "qualityStatus", label: "Chất lượng đầu vào", type: "shortText", placeholder: "Ví dụ: rau hơi héo" },
        ],
      },
      {
        key: "soChe",
        title: "3. Sơ chế",
        description: "Theo dõi thiếu định mức, hao hụt bất thường, thiếu nguyên liệu trước chế biến.",
        quickFields: [
          { key: "prepEnough", label: "Đủ định mức", type: "selectYN" },
          { key: "abnormalLoss", label: "Hao hụt bất thường", type: "shortText", placeholder: "Ví dụ: hao hụt cao ở rau" },
        ],
      },
    ],
  },
  {
    group: "B",
    groupTitle: "Sản xuất & phục vụ",
    items: [
      {
        key: "cheBien",
        title: "4. Chế biến",
        description: "Theo dõi chất lượng món, lỗi mẻ, ảnh hưởng sản lượng, nguyên nhân trực tiếp.",
        quickFields: [
          { key: "dishTest", label: "Test món", type: "shortText", placeholder: "Ví dụ: đạt / cần chỉnh vị" },
          { key: "affectedMeals", label: "Ảnh hưởng suất", type: "number", placeholder: "0" },
        ],
      },
      {
        key: "chiaSuat",
        title: "5. Chia suất",
        description: "Kiểm soát đủ suất, đúng định lượng, thiếu/dư suất và nguyên nhân.",
        quickFields: [
          { key: "distributedPlan", label: "Kế hoạch", type: "number", placeholder: "0" },
          { key: "distributedActual", label: "Thực tế", type: "number", placeholder: "0" },
          { key: "portionAccuracy", label: "Định lượng", type: "shortText", placeholder: "Ví dụ: đạt / lệch line 2" },
        ],
      },
      {
        key: "phanAnhKhach",
        title: "6. Phản ánh khách hàng",
        description: "Ghi nhận khiếu nại, góp ý hoặc phản ánh từ khách trong ca (dùng cho KPI phản ánh).",
        quickFields: [
          {
            key: "complaintSummary",
            label: "Nội dung phản ánh",
            type: "shortText",
            placeholder: "Để trống nếu không có; ví dụ: cơm khô; hoặc ghi số lượng: 2",
          },
        ],
      },
      {
        key: "phucVu",
        title: "7. Phục vụ",
        description: "Theo dõi đúng giờ, line phục vụ, ùn tắc hoặc chậm.",
        quickFields: [
          { key: "serviceTime", label: "Khung giờ phục vụ", type: "shortText", placeholder: "Ví dụ: 11:30 - 12:15" },
          { key: "delayMinutes", label: "Trễ (phút)", type: "number", placeholder: "0" },
        ],
      },
      {
        key: "sauPhucVu",
        title: "8. Sau phục vụ",
        description: "Theo dõi tồn cuối ca, vệ sinh, lưu mẫu và xác nhận kết ca.",
        quickFields: [
          { key: "remainingMeals", label: "Tồn cuối ca", type: "number", placeholder: "0" },
          { key: "sampleStored", label: "Lưu mẫu", type: "selectYN" },
          { key: "closeShiftConfirm", label: "Xác nhận kết ca", type: "shortText", placeholder: "Ví dụ: bếp OK, line sạch" },
        ],
      },
    ],
  },
  {
    group: "C",
    groupTitle: "Kiểm soát rủi ro",
    items: [
      {
        key: "haTangThietBi",
        title: "8. Cơ sở hạ tầng – thiết bị",
        description: "Theo dõi thiết bị lỗi, hạ tầng ảnh hưởng sản xuất, tình trạng sửa chữa.",
        quickFields: [
          { key: "equipmentStatus", label: "Thiết bị trọng yếu", type: "shortText", placeholder: "Ví dụ: tủ mát 1, bếp gas line 2" },
          { key: "repairStatus", label: "Đã báo sửa", type: "selectYN" },
        ],
      },
      {
        key: "atvstp",
        title: "9. ATVSTP",
        description: "Theo dõi PPE, vệ sinh, lưu mẫu, nhiệt độ thực phẩm và vi phạm ATVSTP.",
        quickFields: [
          { key: "ppeStatus", label: "Bảo hộ nhân sự", type: "shortText", placeholder: "Ví dụ: đạt / 2 người thiếu găng" },
          { key: "hygieneStatus", label: "Vệ sinh khu bếp", type: "shortText", placeholder: "Ví dụ: đạt" },
          { key: "foodTempStatus", label: "Nhiệt độ thực phẩm", type: "shortText", placeholder: "Ví dụ: đạt / cần theo dõi" },
        ],
      },
    ],
  },
];

const SERVICE_SECTION_CONFIG = [
  {
    group: "A",
    groupTitle: "Chuẩn bị line",
    items: [
      { key: "svcNhanBanGiao", title: "1. Nhận bàn giao", quickFields: [] },
      { key: "svcNhanSuPhucVu", title: "2. Nhân sự phục vụ", quickFields: [] },
      { key: "svcDungCuPhucVu", title: "3. Dụng cụ phục vụ", quickFields: [] },
      { key: "svcMonLenLine", title: "4. Món lên line", quickFields: [] },
    ],
  },
  {
    group: "B",
    groupTitle: "Chia suất",
    items: [
      { key: "svcDinhLuong", title: "5. Định lượng", quickFields: [] },
      { key: "svcSaiThieuMon", title: "6. Sai/thiếu món", quickFields: [] },
      { key: "svcThieuDuSuat", title: "7. Thiếu/dư suất", quickFields: [] },
      { key: "svcTocDoChia", title: "8. Tốc độ chia", quickFields: [] },
    ],
  },
  {
    group: "C",
    groupTitle: "Flow phục vụ",
    items: [
      { key: "svcBatDauPhucVu", title: "9. Bắt đầu phục vụ", quickFields: [] },
      { key: "svcKetThucPhucVu", title: "10. Kết thúc phục vụ", quickFields: [] },
      { key: "svcTacLine", title: "11. Tắc line", quickFields: [] },
      { key: "svcThoiGianCho", title: "12. Thời gian chờ (>5p cảnh báo)", quickFields: [] },
    ],
  },
  {
    group: "D",
    groupTitle: "Khách hàng",
    items: [
      { key: "svcPhanAnh", title: "13. Phản ánh", quickFields: [] },
      { key: "svcHaiLong", title: "14. Mức độ hài lòng", quickFields: [] },
      { key: "svcNhietDoMon", title: "15. Nhiệt độ món", quickFields: [] },
      { key: "svcKhuAn", title: "16. Khu ăn", quickFields: [] },
    ],
  },
  {
    group: "E",
    groupTitle: "Nhân sự",
    items: [
      { key: "svcThaiDo", title: "17. Thái độ", quickFields: [] },
      { key: "svcSaiThaoTac", title: "18. Sai thao tác", quickFields: [] },
      { key: "svcKhongHoTro", title: "19. Không hỗ trợ", quickFields: [] },
      { key: "svcKhongTuanThu", title: "20. Không tuân thủ", quickFields: [] },
    ],
  },
];

const CHAY_HANG_REASON_OPTIONS = ["Thiếu suất", "Khách tăng", "Sai dự báo", "Hỗ trợ line"];

function defaultChayHangRows() {
  return [{ dish: "", qty: "", reason: "", time: "", owner: "", result: "" }];
}

const createBepChayHangSection = () =>
  createIssueState({
    chayHangRows: defaultChayHangRows(),
  });

function sumChayHangRowsQty(section) {
  if (!section?.chayHangRows || !Array.isArray(section.chayHangRows)) return 0;
  return section.chayHangRows.reduce((sum, row) => {
    const n = Number(String(row?.qty ?? "").replace(",", "."));
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

function computeChayHangPlanRushPct(header, section) {
  const plan = Math.max(0, Number(header?.plannedMeals || 0));
  const rush = sumChayHangRowsQty(section);
  const pct = plan > 0 ? (rush / plan) * 100 : rush > 0 ? 100 : 0;
  return { plan, rush, pct };
}

function chayHangPctTone(pct, hasIssue) {
  if (!hasIssue) return "ok";
  if (pct < 5) return "ok";
  if (pct <= 10) return "warning";
  return "bad";
}

function syncChayHangDerivedSection(section) {
  let s = { ...section };
  const rows = Array.isArray(s.chayHangRows) ? s.chayHangRows.map((r) => ({ ...r })) : defaultChayHangRows();
  s.chayHangRows = rows;
  if (!s.hasIssue) {
    return {
      ...s,
      chayHangRows: defaultChayHangRows(),
      issueTitle: "",
      issueDetail: "",
      cause: "",
      issueSource: "",
      responsibility: "",
      issueType: "",
      impactLevel: "",
      actionTaken: "",
      issueOwner: "",
      issueDeadline: "",
      issueResult: "",
    };
  }
  const totalQty = sumChayHangRowsQty(s);
  const detailLines = rows
    .filter((r) => String(r.dish || "").trim() && Number(String(r.qty).replace(",", ".")) > 0)
    .map((r) => {
      const q = Number(String(r.qty).replace(",", "."));
      return `${String(r.dish).trim()} — ${q} suất; ${r.reason || "—"}; ${String(r.time || "").trim()} phút; ${String(r.owner || "").trim()}`;
    });
  s.issueTitle = totalQty > 0 ? `Chạy hàng phát sinh: ${totalQty} suất` : "";
  s.cause = detailLines.join(" | ");
  s.actionTaken = detailLines.join(" | ");
  s.issueSource = "Bếp";
  if (!s.issueType) s.issueType = "Chia suất";
  if (!s.impactLevel && totalQty > 0) s.impactLevel = "medium";
  const owners = rows.map((r) => String(r.owner || "").trim()).filter(Boolean);
  const matched = owners.find((o) => RESPONSIBILITY_OPTIONS.includes(o));
  s.responsibility = matched || s.responsibility || "Bếp trưởng";
  return s;
}

/** Form Bếp — không dùng lại cấu hình Quản lý / Giám sát DV; chỉ khác data + nhóm auto. */
const KITCHEN_SECTION_CONFIG = [
  {
    group: "A",
    groupTitle: "Chuẩn bị sản xuất",
    items: [
      {
        key: "bepKeHoachSuat",
        title: "1. Kế hoạch suất",
        quickFields: [
          { key: "bepPlanGapNote", label: "Sai lệch kế hoạch (thiếu/dư)", type: "shortText", placeholder: "Ví dụ: thiếu 20 suất so kế hoạch" },
        ],
      },
      {
        key: "bepNguyenLieuDauVao",
        title: "2. Nguyên liệu đầu vào",
        quickFields: [
          { key: "bepNlIssueNote", label: "Thiếu / sai CL / giao trễ", type: "shortText", placeholder: "Ví dụ: giao trễ 25 phút; thiếu 8kg thịt" },
        ],
      },
      {
        key: "bepNhanSuBep",
        title: "3. Nhân sự bếp",
        quickFields: [
          { key: "bepStaffIssueNote", label: "Thiếu người / phân công sai", type: "shortText", placeholder: "Ví dụ: thiếu 2 người line nóng" },
        ],
      },
      {
        key: "bepThietBiSanSang",
        title: "4. Thiết bị sẵn sàng",
        quickFields: [
          { key: "bepReadyEquipNote", label: "Thiết bị hỏng / yếu", type: "shortText", placeholder: "Ví dụ: lò hấp 1 yếu; tủ lạnh 2 báo lỗi" },
        ],
      },
    ],
  },
  {
    group: "B",
    groupTitle: "Sơ chế",
    items: [
      {
        key: "bepQuyTrinhSoChe",
        title: "5. Quy trình sơ chế",
        quickFields: [{ key: "bepPrepSopNote", label: "Sai quy cách", type: "shortText", placeholder: "Ví dụ: sai độ dày cắt 3 line" }],
      },
      {
        key: "bepHaoHutNL",
        title: "6. Hao hụt nguyên liệu",
        quickFields: [{ key: "bepLossNote", label: "Hao hụt bất thường", type: "shortText", placeholder: "Ví dụ: hao hụt rau +12% so định mức" }],
      },
      { key: "bepThieuNLsauSoChe", title: "7. Thiếu nguyên liệu sau sơ chế", quickFields: [] },
      {
        key: "bepVeSinhSoChe",
        title: "8. Vệ sinh sơ chế",
        quickFields: [{ key: "bepPrepHygieneNote", label: "Nguy cơ nhiễm chéo", type: "shortText", placeholder: "Ví dụ: dao/thớt chưa tách màu" }],
      },
    ],
  },
  {
    group: "C",
    groupTitle: "Chế biến (trọng tâm)",
    items: [
      {
        key: "bepLoiMonAn",
        title: "9. Lỗi món ăn",
        quickFields: [
          { key: "bepDishDefectNote", label: "Mặn / nhạt / sống / khét", type: "shortText", placeholder: "Ví dụ: 6 món cơm khô; 2 món sống" },
        ],
      },
      {
        key: "bepSoLuongLoi",
        title: "10. Số lượng lỗi",
        quickFields: [
          { key: "bepErrorDishCount", label: "Bao nhiêu món", type: "number", placeholder: "0" },
          { key: "bepErrorMealImpact", label: "Ảnh hưởng bao nhiêu suất", type: "number", placeholder: "0" },
        ],
      },
      {
        key: "bepNhietDoMon",
        title: "11. Nhiệt độ món",
        quickFields: [{ key: "bepDishTempNote", label: "Không đạt", type: "shortText", placeholder: "Ví dụ: cơm 58°C; canh 62°C" }],
      },
      { key: "bepSaiCongThuc", title: "12. Sai công thức", quickFields: [] },
    ],
  },
  {
    group: "D",
    groupTitle: "Sản lượng & tiến độ",
    items: [
      {
        key: "bepSanLuongThucTe",
        title: "13. Sản lượng thực tế",
        quickFields: [{ key: "bepCookedMeals", label: "Số suất đã nấu", type: "number", placeholder: "0" }],
      },
      {
        key: "bepThieuSuat",
        title: "14. Thiếu suất",
        quickFields: [{ key: "bepShortageMeals", label: "Bao nhiêu suất", type: "number", placeholder: "0" }],
      },
      {
        key: "bepDuSuat",
        title: "15. Dư suất",
        quickFields: [{ key: "bepSurplusMeals", label: "Bao nhiêu suất", type: "number", placeholder: "0" }],
      },
      {
        key: "bepTienDoMon",
        title: "16. Tiến độ món",
        quickFields: [
          { key: "bepDishDelayMinutes", label: "Trễ bao nhiêu phút", type: "number", placeholder: "0" },
          { key: "bepEarlyColdNote", label: "Lên sớm (nguội)", type: "shortText", placeholder: "Ví dụ: canh lên sớm 12 phút" },
        ],
      },
      { key: "bepChayHangPhatSinh", title: "17. Chạy hàng phát sinh", quickFields: [], detailVariant: "chayHang" },
    ],
  },
  {
    group: "E",
    groupTitle: "Bàn giao",
    items: [
      {
        key: "bepBanGiaoSoLuong",
        title: "18. Bàn giao số lượng",
        quickFields: [{ key: "bepHandoverQtyNote", label: "Đủ / thiếu", type: "shortText", placeholder: "Ví dụ: thiếu 15 suất so biên bản" }],
      },
      {
        key: "bepBanGiaoMon",
        title: "19. Bàn giao món",
        quickFields: [{ key: "bepHandoverDishNote", label: "Sai / thiếu món", type: "shortText", placeholder: "Ví dụ: thiếu 3 món phụ" }],
      },
      {
        key: "bepThoiGianBanGiao",
        title: "20. Thời gian bàn giao",
        quickFields: [{ key: "bepHandoverLateMinutes", label: "Trễ (phút)", type: "number", placeholder: "0" }],
      },
      {
        key: "bepPhoiHopGSDV",
        title: "21. Phối hợp GS DV",
        quickFields: [{ key: "bepGsDvCoordNote", label: "Xử lý thiếu/dư suất", type: "shortText", placeholder: "Ví dụ: điều chỉnh 10 suất với line 2" }],
      },
    ],
  },
  {
    group: "F",
    groupTitle: "Thiết bị & hạ tầng",
    items: [
      { key: "bepThietBiHong", title: "22. Thiết bị hỏng", quickFields: [] },
      { key: "bepThietBiYeu", title: "23. Thiết bị yếu", quickFields: [] },
      {
        key: "bepAnhHuongSanXuat",
        title: "24. Ảnh hưởng sản xuất",
        quickFields: [
          { key: "bepProdDelayMinutes", label: "Trễ bao nhiêu phút", type: "number", placeholder: "0" },
          { key: "bepProdLostMeals", label: "Lỗi bao nhiêu suất", type: "number", placeholder: "0" },
        ],
      },
      { key: "bepVeSinhThietBi", title: "25. Vệ sinh thiết bị", quickFields: [] },
      { key: "bepBaoTri", title: "26. Bảo trì", quickFields: [] },
    ],
  },
  {
    group: "G",
    groupTitle: "ATVSTP bếp",
    items: [
      { key: "bepPPE", title: "27. PPE nhân sự", quickFields: [] },
      { key: "bepVeSinhKhuNau", title: "28. Vệ sinh khu nấu", quickFields: [] },
      { key: "bepLuuMau", title: "29. Lưu mẫu", quickFields: [] },
      { key: "bepNhiemCheo", title: "30. Nhiễm chéo", quickFields: [] },
      { key: "bepNhietDoBaoQuan", title: "31. Nhiệt độ bảo quản", quickFields: [] },
    ],
  },
];

/** Kế toán kho — kiểm soát vận hành + cảnh báo HSD (tab accounting). */
const WH_HSD_KEYS = new Set(["whHsdGanHetHan", "whHsdQuaHan", "whHsdSaiDate", "whHsdNguyCoHuy"]);
const PM_GROUP_KEYS = {
  pmGiaTangBatThuong: "A",
  pmNccDoiGiaDotXuat: "A",
  pmGiaGiamAnhHuongChatLuong: "A",
  pmChayHangBoSung: "B",
  pmSaiDuBaoThieuDu: "B",
  pmSaiDinhLuong: "B",
  pmLamLaiMon: "B",
  pmMuaDungCuSuatAn: "C",
  pmMuaVatTuSuaChuaNho: "C",
  pmMuaDungCuGap: "C",
  pmChiPhiNgoaiKeHoach: "C",
  pmNccKhongOnDinh: "D",
  pmDoiNccGiaCaoHon: "D",
  pmThieuHangMuaNgoai: "D",
};
const PM_COST_TYPE_OPTIONS = [
  { value: "waste", label: "Lãng phí (waste)" },
  { value: "error", label: "Do lỗi (error)" },
  { value: "market", label: "Bắt buộc (market)" },
];
const PM_SOURCE_OPTIONS = ["Bếp", "Kho", "GS DV", "NCC", "Quản lý", "Khách tăng"];

function formatCurrencyVnd(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0 VNĐ";
  return `${Math.round(n).toLocaleString("vi-VN")} VNĐ`;
}

function defaultPmCostRows() {
  return [
    {
      content: "",
      qty: "",
      unitPrice: "",
      costType: "",
      source: "",
      impact: "",
      action: "",
      result: "",
    },
  ];
}

function createProcurementCostSection(overrides = {}) {
  return createIssueState({
    costRows: defaultPmCostRows(),
    ...overrides,
  });
}

function pmNum(val) {
  const n = Number(String(val ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function pmRowAmount(row) {
  const q = pmNum(row?.qty);
  const p = pmNum(row?.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) return 0;
  return q * p;
}

function pmRowHasContent(row) {
  return !!(
    String(row?.content || "").trim() ||
    String(row?.qty || "").trim() ||
    String(row?.unitPrice || "").trim() ||
    String(row?.costType || "").trim() ||
    String(row?.source || "").trim() ||
    String(row?.impact || "").trim() ||
    String(row?.action || "").trim() ||
    String(row?.result || "").trim()
  );
}

function syncProcurementSection(section, sectionKey) {
  const s = { ...section };
  const rowsIn = Array.isArray(s.costRows) && s.costRows.length ? s.costRows : defaultPmCostRows();
  const rows = rowsIn.map((r) => ({
    content: typeof r?.content === "string" ? r.content.trim() : "",
    qty: typeof r?.qty === "string" ? r.qty.trim() : r?.qty != null ? String(r.qty) : "",
    unitPrice: typeof r?.unitPrice === "string" ? r.unitPrice.trim() : r?.unitPrice != null ? String(r.unitPrice) : "",
    costType: typeof r?.costType === "string" ? r.costType.trim() : "",
    source: typeof r?.source === "string" ? r.source.trim() : "",
    impact: typeof r?.impact === "string" ? r.impact.trim() : "",
    action: typeof r?.action === "string" ? r.action.trim() : "",
    result: typeof r?.result === "string" ? r.result.trim() : "",
  }));
  const hasIssue = rows.some((r) => pmRowHasContent(r));
  const total = rows.reduce((sum, r) => sum + pmRowAmount(r), 0);
  let impactLevel = s.impactLevel || "";
  if (hasIssue && total > 1000000) impactLevel = "serious";
  else if (hasIssue && total > 500000 && impactLevel !== "serious") impactLevel = impactLevel || "medium";
  const issueTitle = rows
    .filter((r) => pmRowHasContent(r))
    .map((r) => `${r.content || "—"} | ${r.qty || "—"} x ${r.unitPrice || "—"} = ${formatCurrencyVnd(pmRowAmount(r))}`)
    .join(" · ")
    .slice(0, 480);
  s.costRows = rows;
  s.hasIssue = hasIssue;
  s.impactLevel = hasIssue ? impactLevel : "";
  s.issueTitle = hasIssue ? issueTitle : "";
  s.cause = hasIssue ? rows.map((r) => r.impact).filter(Boolean).join(" | ").slice(0, 480) : "";
  s.actionTaken = hasIssue ? rows.map((r) => r.action).filter(Boolean).join(" | ").slice(0, 480) : "";
  s.issueSource = hasIssue ? "Kế toán" : "";
  s.issueType = hasIssue ? `KTSX / Thu mua nhóm ${PM_GROUP_KEYS[sectionKey] || ""}` : "";
  if (!hasIssue) {
    s.responsibility = "";
    s.issueOwner = "";
    s.issueDeadline = "";
    s.issueResult = "";
    s.note = "";
  } else if (!s.responsibility) {
    s.responsibility = "Quản lý";
  }
  return syncSectionStatusFromIssue(s);
}

function aggregateProcurementStats(sections) {
  const keys = Object.keys(PM_GROUP_KEYS);
  let total = 0;
  const sourceTotals = {};
  const groupTotals = {};
  keys.forEach((k) => {
    const sec = sections[k];
    if (!sec?.costRows) return;
    sec.costRows.forEach((r) => {
      const amt = pmRowAmount(r);
      if (amt <= 0) return;
      total += amt;
      const source = r.source || "Chưa xác định";
      sourceTotals[source] = (sourceTotals[source] || 0) + amt;
      const g = PM_GROUP_KEYS[k] || "Khác";
      groupTotals[g] = (groupTotals[g] || 0) + amt;
    });
  });
  const topSource = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1])[0] || ["Không có", 0];
  const topGroup = Object.entries(groupTotals).sort((a, b) => b[1] - a[1])[0] || ["Không có", 0];
  const topSourcePct = total > 0 ? (topSource[1] / total) * 100 : 0;
  const topGroupPct = total > 0 ? (topGroup[1] / total) * 100 : 0;
  return { total, sourceTotals, groupTotals, topSource, topGroup, topSourcePct, topGroupPct };
}

function defaultWhIssueRows() {
  return [
    {
      problem: "",
      qty: "",
      expiryDate: "",
      impact: "",
      cause: "",
      action: "",
      owner: "",
      result: "",
    },
  ];
}

function createWarehouseSection(overrides = {}) {
  return createIssueState({
    issueRows: defaultWhIssueRows(),
    ...overrides,
  });
}

function diffCalendarDaysExpiryMinusReport(expiryYmd, reportYmd) {
  if (!expiryYmd || !reportYmd) return null;
  const [ye, me, de] = String(expiryYmd).split("-").map(Number);
  const [yr, mr, dr] = String(reportYmd).split("-").map(Number);
  if (!ye || !me || !de || !yr || !mr || !dr) return null;
  const E = Date.UTC(ye, me - 1, de);
  const R = Date.UTC(yr, mr - 1, dr);
  return Math.round((E - R) / 86400000);
}

function warehouseActionHintFromDaysLeft(daysLeft) {
  if (daysLeft === null || !Number.isFinite(daysLeft)) return "";
  if (daysLeft <= 0) return "Ngưng sử dụng – xử lý hủy";
  if (daysLeft <= 2) return "Ưu tiên xuất dùng ngay";
  return "";
}

function warehouseDaysLeftTone(daysLeft) {
  if (daysLeft === null || !Number.isFinite(daysLeft)) return { color: "#64748b", label: "—" };
  if (daysLeft > 3) return { color: "#15803d", label: `${daysLeft} ngày` };
  if (daysLeft >= 2) return { color: "#92400e", label: `${daysLeft} ngày` };
  if (daysLeft === 1) return { color: "#c2410c", label: `${daysLeft} ngày` };
  return { color: "#b91c1c", label: `${daysLeft} ngày` };
}

function warehouseRowHasContent(row) {
  return !!(
    String(row?.problem || "").trim() ||
    String(row?.qty || "").trim() ||
    String(row?.expiryDate || "").trim() ||
    String(row?.impact || "").trim() ||
    String(row?.cause || "").trim() ||
    String(row?.action || "").trim() ||
    String(row?.owner || "").trim() ||
    String(row?.result || "").trim()
  );
}

function warehouseHsdAutoIssueFromRows(section, reportDate) {
  const rows = section?.issueRows || [];
  return rows.some((r) => {
    const d = diffCalendarDaysExpiryMinusReport(r.expiryDate, reportDate);
    return d !== null && Number.isFinite(d) && d <= 2;
  });
}

function syncWarehouseAccountingSection(section, sectionKey, reportDate) {
  let s = { ...section };
  const rowsIn = Array.isArray(s.issueRows) && s.issueRows.length ? s.issueRows : defaultWhIssueRows();
  const rows = rowsIn.map((r) => ({
    problem: typeof r?.problem === "string" ? r.problem.trim() : "",
    qty: typeof r?.qty === "string" ? r.qty.trim() : r?.qty != null ? String(r.qty) : "",
    expiryDate: typeof r?.expiryDate === "string" ? r.expiryDate.trim() : "",
    impact: typeof r?.impact === "string" ? r.impact.trim() : "",
    cause: typeof r?.cause === "string" ? r.cause.trim() : "",
    action: typeof r?.action === "string" ? r.action.trim() : "",
    owner: typeof r?.owner === "string" ? r.owner.trim() : "",
    result: typeof r?.result === "string" ? r.result.trim() : "",
  }));

  const isHsd = WH_HSD_KEYS.has(sectionKey);
  const hsdAuto = isHsd && warehouseHsdAutoIssueFromRows({ ...s, issueRows: rows }, reportDate);
  const manualIssue = rows.some((r) => warehouseRowHasContent(r));
  const hasIssue = hsdAuto || manualIssue;

  let worst = "";
  if (isHsd) {
    rows.forEach((r) => {
      const d = diffCalendarDaysExpiryMinusReport(r.expiryDate, reportDate);
      if (d === null || !Number.isFinite(d)) return;
      if (d <= 0) worst = "serious";
      else if (d === 1 && worst !== "serious") worst = "serious";
      else if (d === 2 && worst !== "serious") worst = "medium";
    });
  }

  let impactLevel = s.impactLevel || "";
  if (isHsd && hasIssue) {
    if (worst === "serious") impactLevel = "serious";
    else if (hsdAuto || worst === "medium") {
      if (impactLevel !== "serious") impactLevel = impactLevel || "medium";
    }
  }

  const lines = rows
    .filter((r) => warehouseRowHasContent(r))
    .map((r) => {
      const d = diffCalendarDaysExpiryMinusReport(r.expiryDate, reportDate);
      const dtxt = d !== null && Number.isFinite(d) ? `${d}d` : "—";
      return `${r.problem || "—"} | ${r.qty || "—"} | HSD ${r.expiryDate || "—"} (${dtxt}) | Ảnh hưởng: ${r.impact || "—"}`;
    });
  const issueTitle = lines.length ? lines.join(" · ").slice(0, 480) : "";
  const cause = rows.map((r) => r.cause).filter(Boolean).join(" | ").slice(0, 480);
  const actionTaken = rows.map((r) => r.action).filter(Boolean).join(" | ").slice(0, 480);

  s.issueRows = rows;
  s.hasIssue = hasIssue;
  s.impactLevel = hasIssue ? impactLevel : "";
  s.issueTitle = hasIssue ? issueTitle : "";
  s.cause = hasIssue ? cause : "";
  s.actionTaken = hasIssue ? actionTaken : "";
  s.issueSource = hasIssue ? "Kho" : "";
  s.issueType = hasIssue ? (isHsd ? "Kho / HSD" : "Kho / vận hành") : "";
  if (!hasIssue) {
    s.responsibility = "";
    s.issueOwner = "";
    s.issueDeadline = "";
    s.issueResult = "";
    s.note = "";
  } else if (!s.responsibility) {
    s.responsibility = "Kho";
  }

  return syncSectionStatusFromIssue(s);
}

function aggregateWarehouseHsdStats(sections, reportDate) {
  let nearSkus = 0;
  let overdueSkus = 0;
  let totalQty = 0;
  WH_HSD_KEYS.forEach((key) => {
    const sec = sections[key];
    if (!sec?.issueRows) return;
    sec.issueRows.forEach((r) => {
      if (!String(r?.expiryDate || "").trim()) return;
      const d = diffCalendarDaysExpiryMinusReport(r.expiryDate, reportDate);
      if (d === null || !Number.isFinite(d)) return;
      if (d <= 0) {
        overdueSkus += 1;
        const q = parseFloat(String(r.qty).replace(",", "."));
        if (Number.isFinite(q)) totalQty += q;
      } else if (d >= 1 && d <= 3) {
        nearSkus += 1;
        const q = parseFloat(String(r.qty).replace(",", "."));
        if (Number.isFinite(q)) totalQty += q;
      }
    });
  });
  let assess = "OK";
  if (overdueSkus > 0) assess = "Nghiêm trọng";
  else if (nearSkus > 0) assess = "Cảnh báo";
  return { nearSkus, overdueSkus, totalQty, assess };
}

function warehouseAnyIssue(sections) {
  return Object.keys(sections).some((k) => k.startsWith("wh") && sections[k]?.hasIssue);
}

const ACCOUNTING_WAREHOUSE_SECTION_CONFIG = [
  {
    group: "A",
    groupTitle: "Hàng không đạt",
    items: [
      { key: "whHangHuKhongTuoi", title: "1. Hư / không tươi", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whHangSaiQuyCach", title: "2. Sai quy cách / sai loại", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
  {
    group: "B",
    groupTitle: "Thiếu hàng",
    items: [
      { key: "whGiaoThieu", title: "3. Giao thiếu", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whKhongDuChoBep", title: "4. Không đủ cho bếp", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
  {
    group: "C",
    groupTitle: "Giao hàng",
    items: [
      { key: "whGiaoTre", title: "5. Giao trễ", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whGiaoSai", title: "6. Giao sai", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
  {
    group: "D",
    groupTitle: "Hạn sử dụng (HSD)",
    items: [
      { key: "whHsdGanHetHan", title: "7. Hàng gần hết hạn", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whHsdQuaHan", title: "8. Hàng quá hạn", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whHsdSaiDate", title: "9. Sai date", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whHsdNguyCoHuy", title: "10. Nguy cơ hủy", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
  {
    group: "E",
    groupTitle: "Bảo quản",
    items: [
      { key: "whKhongDuLanh", title: "11. Không đủ lạnh", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whLuuKhoSai", title: "12. Lưu kho sai", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whNguyCoHu", title: "13. Nguy cơ hư", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
  {
    group: "F",
    groupTitle: "Ảnh hưởng bếp",
    items: [
      { key: "whThieuMon", title: "14. Thiếu món", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whTreNau", title: "15. Trễ nấu", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whGayLoiMon", title: "16. Gây lỗi món", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
  {
    group: "G",
    groupTitle: "Rủi ro",
    items: [
      { key: "whHuHongKg", title: "17. Hư hỏng (kg)", quickFields: [], detailVariant: "warehouseOps" },
      { key: "whNguyCoThieuCaSau", title: "18. Nguy cơ thiếu ca sau", quickFields: [], detailVariant: "warehouseOps" },
    ],
  },
];

const PROCUREMENT_SECTION_CONFIG = [
  {
    group: "A",
    groupTitle: "Biến động giá",
    items: [
      { key: "pmGiaTangBatThuong", title: "1. Giá tăng bất thường", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmNccDoiGiaDotXuat", title: "2. NCC thay đổi giá đột xuất", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmGiaGiamAnhHuongChatLuong", title: "3. Giá giảm ảnh hưởng chất lượng", quickFields: [], detailVariant: "procurementCost" },
    ],
  },
  {
    group: "B",
    groupTitle: "Phát sinh do sản xuất",
    items: [
      { key: "pmChayHangBoSung", title: "4. Chạy hàng bổ sung", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmSaiDuBaoThieuDu", title: "5. Thiếu/dư do sai dự báo", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmSaiDinhLuong", title: "6. Sai định lượng", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmLamLaiMon", title: "7. Làm lại món gây tốn nguyên liệu", quickFields: [], detailVariant: "procurementCost" },
    ],
  },
  {
    group: "C",
    groupTitle: "Chi phí mua ngoài",
    items: [
      { key: "pmMuaDungCuSuatAn", title: "8. Mua muỗng / đũa / khay", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmMuaVatTuSuaChuaNho", title: "9. Mua vật tư sửa chữa nhỏ", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmMuaDungCuGap", title: "10. Mua dụng cụ gấp", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmChiPhiNgoaiKeHoach", title: "11. Chi phí ngoài kế hoạch", quickFields: [], detailVariant: "procurementCost" },
    ],
  },
  {
    group: "D",
    groupTitle: "Rủi ro nhà cung cấp",
    items: [
      { key: "pmNccKhongOnDinh", title: "12. NCC không ổn định gây phát sinh chi phí", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmDoiNccGiaCaoHon", title: "13. Phải đổi NCC giá cao hơn", quickFields: [], detailVariant: "procurementCost" },
      { key: "pmThieuHangMuaNgoai", title: "14. Thiếu hàng phải mua ngoài", quickFields: [], detailVariant: "procurementCost" },
    ],
  },
];

const storageKey = (header) =>
  `sky-catering-ops-report:${header.reportDate || ""}:${header.site || ""}:${header.kitchen || ""}:${header.shift || ""}`;

const STATUS_VALUES = STATUS_OPTIONS.map((item) => item.value);
const IMPACT_VALUES = IMPACT_OPTIONS.map((item) => item.value);
const YES_NO_VALUES = ["yes", "no"];

function normalizeSection(section, sectionKey, reportDate = "") {
  const next = { ...section };

  if (sectionKey === "bepChayHangPhatSinh") {
    if (!Array.isArray(next.chayHangRows)) next.chayHangRows = defaultChayHangRows();
    else {
      next.chayHangRows = next.chayHangRows.map((row) => ({
        dish: typeof row?.dish === "string" ? row.dish.trim() : "",
        qty: typeof row?.qty === "string" ? row.qty.trim() : row?.qty != null ? String(row.qty) : "",
        reason: typeof row?.reason === "string" ? row.reason.trim() : "",
        time: typeof row?.time === "string" ? row.time.trim() : "",
        owner: typeof row?.owner === "string" ? row.owner.trim() : "",
        result: typeof row?.result === "string" ? row.result.trim() : "",
      }));
    }
  }

  if (sectionKey.startsWith("wh")) {
    if (!Array.isArray(next.issueRows) || !next.issueRows.length) next.issueRows = defaultWhIssueRows();
    else {
      next.issueRows = next.issueRows.map((row) => ({
        problem: typeof row?.problem === "string" ? row.problem.trim() : "",
        qty: typeof row?.qty === "string" ? row.qty.trim() : row?.qty != null ? String(row.qty) : "",
        expiryDate: typeof row?.expiryDate === "string" ? row.expiryDate.trim() : "",
        impact: typeof row?.impact === "string" ? row.impact.trim() : "",
        cause: typeof row?.cause === "string" ? row.cause.trim() : "",
        action: typeof row?.action === "string" ? row.action.trim() : "",
        owner: typeof row?.owner === "string" ? row.owner.trim() : "",
        result: typeof row?.result === "string" ? row.result.trim() : "",
      }));
    }
  }
  if (sectionKey.startsWith("pm")) {
    if (!Array.isArray(next.costRows) || !next.costRows.length) next.costRows = defaultPmCostRows();
    else {
      next.costRows = next.costRows.map((row) => ({
        content: typeof row?.content === "string" ? row.content.trim() : "",
        qty: typeof row?.qty === "string" ? row.qty.trim() : row?.qty != null ? String(row.qty) : "",
        unitPrice: typeof row?.unitPrice === "string" ? row.unitPrice.trim() : row?.unitPrice != null ? String(row.unitPrice) : "",
        costType: typeof row?.costType === "string" ? row.costType.trim() : "",
        source: typeof row?.source === "string" ? row.source.trim() : "",
        impact: typeof row?.impact === "string" ? row.impact.trim() : "",
        action: typeof row?.action === "string" ? row.action.trim() : "",
        result: typeof row?.result === "string" ? row.result.trim() : "",
      }));
    }
  }

  Object.keys(next).forEach((key) => {
    if (typeof next[key] === "string") next[key] = next[key].trim();
  });

  if (!IMPACT_VALUES.includes(next.impactLevel)) next.impactLevel = "";
  if (!SOURCE_OPTIONS.includes(next.issueSource)) next.issueSource = "";
  if (!RESPONSIBILITY_OPTIONS.includes(next.responsibility)) next.responsibility = "";
  next.hasIssue = !!next.hasIssue;

  if (!next.hasIssue) {
    next.issueTitle = "";
    next.issueDetail = "";
    next.cause = "";
    next.issueSource = "";
    next.responsibility = "";
    next.issueType = "";
    next.impactLevel = "";
    next.actionTaken = "";
    next.issueOwner = "";
    next.issueDeadline = "";
    next.issueResult = "";
    if (sectionKey === "bepChayHangPhatSinh") {
      next.chayHangRows = defaultChayHangRows();
    }
    if (sectionKey.startsWith("wh")) {
      next.issueRows = defaultWhIssueRows();
    }
    if (sectionKey.startsWith("pm")) {
      next.costRows = defaultPmCostRows();
    }
  }

  if (sectionKey.startsWith("wh")) {
    const synced = syncWarehouseAccountingSection(next, sectionKey, reportDate);
    if (!STATUS_VALUES.includes(synced.status)) synced.status = "ok";
    return synced;
  }
  if (sectionKey.startsWith("pm")) {
    const synced = syncProcurementSection(next, sectionKey);
    if (!STATUS_VALUES.includes(synced.status)) synced.status = "ok";
    return synced;
  }

  const synced = syncSectionStatusFromIssue(next);
  if (!STATUS_VALUES.includes(synced.status)) synced.status = "ok";
  return synced;
}

function normalizeFormSnapshot(currentForm) {
  const defaults = createDefaultForm();
  const mergedSections = { ...defaults.sections, ...(currentForm.sections || {}) };
  Object.keys(defaults.sections).forEach((sectionKey) => {
    mergedSections[sectionKey] = { ...defaults.sections[sectionKey], ...(mergedSections[sectionKey] || {}) };
  });
  const pvComplaint = String(mergedSections.phucVu?.complaintSummary || "").trim();
  const pkComplaint = String(mergedSections.phanAnhKhach?.complaintSummary || "").trim();
  if (pvComplaint && !pkComplaint) {
    mergedSections.phanAnhKhach = { ...mergedSections.phanAnhKhach, complaintSummary: pvComplaint };
    mergedSections.phucVu = { ...mergedSections.phucVu, complaintSummary: "" };
  }

  const next = {
    ...currentForm,
    header: { ...currentForm.header },
    sections: mergedSections,
    metrics: { ...currentForm.metrics },
    managerSummary: { ...currentForm.managerSummary },
  };

  Object.keys(next.header).forEach((key) => {
    if (typeof next.header[key] === "string") next.header[key] = next.header[key].trim();
  });

  const allowedShifts = getShiftNames();
  const shiftAllow = allowedShifts.length ? allowedShifts : ["Ca ngày", "Ca đêm"];
  if (!shiftAllow.includes(next.header.shift)) {
    next.header.shift = shiftAllow[0];
  }

  Object.keys(next.sections).forEach((sectionKey) => {
    next.sections[sectionKey] = normalizeSection(next.sections[sectionKey], sectionKey, next.header.reportDate || "");
  });

  if (!YES_NO_VALUES.includes(next.metrics.enoughMeals)) next.metrics.enoughMeals = "yes";
  if (!YES_NO_VALUES.includes(next.metrics.onTime)) next.metrics.onTime = "yes";
  if (!YES_NO_VALUES.includes(next.metrics.hasComplaint)) next.metrics.hasComplaint = "no";
  if (!STATUS_VALUES.includes(next.metrics.atvstpResult)) next.metrics.atvstpResult = "ok";
  next.metrics.complaintCount = Math.max(0, Number(next.metrics.complaintCount || 0));
  next.metrics.processingIssueCount = Math.max(0, Number(next.metrics.processingIssueCount || 0));

  Object.keys(next.managerSummary).forEach((key) => {
    if (typeof next.managerSummary[key] === "string") next.managerSummary[key] = next.managerSummary[key].trim();
  });
  if (!STATUS_VALUES.includes(next.managerSummary.overallStatus)) next.managerSummary.overallStatus = "ok";
  if (!IMPACT_VALUES.includes(next.managerSummary.impactLevel)) next.managerSummary.impactLevel = "light";
  if (
    next.managerSummary.mainResponsibility &&
    !RESPONSIBILITY_OPTIONS.includes(next.managerSummary.mainResponsibility)
  ) {
    next.managerSummary.mainResponsibility = "";
  }

  return next;
}

/** KPI + tổng kết quản lý tự suy ra từ dữ liệu vận hành (sections + header), không nhập tay ở Nhóm D. */
function getAutoMetrics(sections, header) {
  const chiaPlan = Number(sections.chiaSuat?.distributedPlan || 0);
  const chiaActual = Number(sections.chiaSuat?.distributedActual || 0);
  const headerPlanned = Number(header.plannedMeals || 0);
  const headerActual = Number(header.actualMeals || 0);

  let enoughMeals = "yes";
  if (chiaPlan > 0 || chiaActual > 0) {
    const shortage = chiaPlan > chiaActual ? chiaPlan - chiaActual : 0;
    enoughMeals = shortage > 10 ? "no" : "yes";
  } else if (headerPlanned > 0) {
    const gap = headerPlanned - headerActual;
    enoughMeals = gap > 10 ? "no" : "yes";
  }

  const delayMinutes = Number(sections.phucVu?.delayMinutes || 0);
  const onTime = delayMinutes > 5 ? "no" : "yes";

  const complaintText = String(sections.phanAnhKhach?.complaintSummary || sections.phucVu?.complaintSummary || "").trim();
  const hasComplaint = complaintText.length > 0 ? "yes" : "no";
  const parsedDigits = complaintText.match(/\d+/);
  const complaintCount = parsedDigits ? Math.max(0, Number(parsedDigits[0])) : complaintText ? 1 : 0;

  const atvstpBad = sections.atvstp?.status === "bad" || !!sections.atvstp?.hasIssue;
  const atvstpResult = atvstpBad ? "bad" : "ok";

  const affected = Math.max(0, Number(sections.cheBien?.affectedMeals || 0));
  const issueCount = Object.values(sections).filter((s) => s?.hasIssue).length;
  const processingIssueCount = Math.max(affected, issueCount);

  return {
    enoughMeals,
    onTime,
    hasComplaint,
    complaintCount,
    atvstpResult,
    processingIssueCount,
  };
}

function gradeFromOpsScore(score) {
  if (score >= 90) return { key: "excellent", label: "Xuất sắc" };
  if (score >= 80) return { key: "pass", label: "Đạt" };
  if (score >= 65) return { key: "watch", label: "Cần chú ý" };
  return { key: "fail", label: "Không đạt" };
}

/** Điểm 100, tự trừ theo rule vận hành ngày (Nhóm D). */
function computeOperationalDayScore(sections, header) {
  const autoMetrics = getAutoMetrics(sections, header);
  const deductions = [];

  if (autoMetrics.enoughMeals === "no") {
    deductions.push({ id: "shortage", label: "Thiếu suất", points: 15 });
  }
  if (autoMetrics.onTime === "no") {
    deductions.push({ id: "late", label: "Trễ phục vụ > 5 phút", points: 10 });
  }
  const complaintN = Math.max(
    Number(autoMetrics.complaintCount || 0),
    autoMetrics.hasComplaint === "yes" ? 1 : 0
  );
  if (complaintN > 0) {
    deductions.push({
      id: "complaint",
      label: complaintN === 1 ? "1 phản ánh khách" : `${complaintN} phản ánh khách`,
      points: 10 * complaintN,
    });
  }
  const cookingKeys = ["soChe", "cheBien", "chiaSuat"];
  const cookingErrorCount = cookingKeys.filter(
    (k) => sections[k]?.hasIssue || sections[k]?.status === "bad"
  ).length;
  if (cookingErrorCount > 0) {
    deductions.push({
      id: "cooking",
      label:
        cookingErrorCount === 1
          ? "1 lỗi chế biến / sơ chế / chia suất"
          : `${cookingErrorCount} lỗi chế biến / sơ chế / chia suất`,
      points: 10 * cookingErrorCount,
    });
  }
  if (autoMetrics.atvstpResult === "bad") {
    deductions.push({ id: "atvstp", label: "ATVSTP không OK", points: 25 });
  }
  if (sections.haTangThietBi?.hasIssue || sections.haTangThietBi?.status === "bad") {
    deductions.push({
      id: "equipment",
      label: "Thiết bị / hạ tầng ảnh hưởng vận hành",
      points: 10,
    });
  }
  let missingActionCount = 0;
  Object.values(sections).forEach((s) => {
    if (s?.hasIssue && !String(s.actionTaken || "").trim()) missingActionCount += 1;
  });
  if (missingActionCount > 0) {
    deductions.push({
      id: "noAction",
      label:
        missingActionCount === 1
          ? "1 phát sinh thiếu hành động xử lý"
          : `${missingActionCount} phát sinh thiếu hành động xử lý`,
      points: 10 * missingActionCount,
    });
  }

  const totalOff = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, 100 - totalOff);
  const grade = gradeFromOpsScore(score);

  return {
    score,
    grade,
    deductions,
    autoMetrics,
    cookingErrorCount,
    complaintN,
    missingActionCount,
  };
}

const KITCHEN_ATV_KEYS = ["bepPPE", "bepVeSinhKhuNau", "bepLuuMau", "bepNhiemCheo", "bepNhietDoBaoQuan"];

/** KPI tổng hợp riêng cho tab Bếp — chỉ đọc các mục bep*. */
function computeKitchenOperationalScore(sections, header) {
  const ch = sections.bepChayHangPhatSinh;
  const { plan, rush, pct } = computeChayHangPlanRushPct(header, ch || {});
  const chayHangPctText = `${rush} suất (${pct.toFixed(1)}%)`;

  const deductions = [];
  if (ch?.hasIssue && rush > 0) {
    if (pct > 10) {
      deductions.push({
        id: "kitchenRush",
        label: `Chạy hàng phát sinh ${rush} suất (${pct.toFixed(1)}%)`,
        points: 20,
      });
    } else if (pct >= 5) {
      deductions.push({
        id: "kitchenRush",
        label: `Chạy hàng phát sinh ${rush} suất (${pct.toFixed(1)}%)`,
        points: 10,
      });
    } else {
      deductions.push({
        id: "kitchenRush",
        label: `Chạy hàng phát sinh ${rush} suất (${pct.toFixed(1)}%)`,
        points: 5,
      });
    }
  }

  if (sections.bepThieuSuat?.hasIssue) {
    const n = Math.max(0, Number(sections.bepThieuSuat?.bepShortageMeals || 0));
    deductions.push({
      id: "kitchenShort",
      label: n > 0 ? `Thiếu suất ${n} suất (bếp)` : "Thiếu suất (bếp)",
      points: 15,
    });
  }
  if (sections.bepLoiMonAn?.hasIssue) {
    deductions.push({ id: "kitchenDish", label: "Lỗi món ăn (bếp)", points: 10 });
  }
  const lateTienDo = Math.max(0, Number(sections.bepTienDoMon?.bepDishDelayMinutes || 0));
  if (sections.bepTienDoMon?.hasIssue) {
    deductions.push({
      id: "kitchenLate",
      label: lateTienDo > 0 ? `Trễ tiến độ ${lateTienDo} phút` : "Trễ / nguội tiến độ món",
      points: lateTienDo > 5 ? 10 : 8,
    });
  }
  if (sections.bepThietBiHong?.hasIssue) {
    deductions.push({ id: "kitchenEq", label: "Thiết bị hỏng", points: 10 });
  } else if (sections.bepAnhHuongSanXuat?.hasIssue) {
    const pm = Math.max(0, Number(sections.bepAnhHuongSanXuat?.bepProdDelayMinutes || 0));
    deductions.push({
      id: "kitchenEq",
      label: pm > 0 ? `Ảnh hưởng sản xuất, trễ ${pm} phút` : "Ảnh hưởng sản xuất",
      points: 10,
    });
  }
  if (KITCHEN_ATV_KEYS.some((k) => sections[k]?.hasIssue)) {
    deductions.push({ id: "kitchenAtvstp", label: "ATVSTP bếp có phát sinh", points: 25 });
  }

  let missingActionCount = 0;
  Object.entries(sections).forEach(([k, s]) => {
    if (!s?.hasIssue) return;
    if (k === "bepChayHangPhatSinh") return;
    if (!String(s.actionTaken || "").trim()) missingActionCount += 1;
  });
  if (ch?.hasIssue && rush > 0 && !String(ch.actionTaken || "").trim()) {
    missingActionCount += 1;
  }
  if (missingActionCount > 0) {
    deductions.push({
      id: "noAction",
      label:
        missingActionCount === 1
          ? "1 phát sinh thiếu hành động xử lý"
          : `${missingActionCount} phát sinh thiếu hành động xử lý`,
      points: 10 * missingActionCount,
    });
  }

  const totalOff = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, 100 - totalOff);
  const grade = gradeFromOpsScore(score);

  const shortageN = Math.max(0, Number(sections.bepThieuSuat?.bepShortageMeals || 0));
  const enoughMeals = sections.bepThieuSuat?.hasIssue && shortageN > 10 ? "no" : "yes";
  const onTime = sections.bepTienDoMon?.hasIssue && lateTienDo > 5 ? "no" : "yes";
  const autoMetrics = {
    enoughMeals,
    onTime,
    hasComplaint: "no",
    complaintCount: 0,
    atvstpResult: KITCHEN_ATV_KEYS.some((k) => sections[k]?.hasIssue) ? "bad" : "ok",
    processingIssueCount: Object.values(sections).filter((s) => s?.hasIssue).length,
  };

  const cookingErrorCount = ["bepLoiMonAn", "bepSoLuongLoi", "bepSaiCongThuc"].filter((k) => sections[k]?.hasIssue).length;

  return {
    score,
    grade,
    deductions,
    autoMetrics,
    cookingErrorCount,
    complaintN: 0,
    missingActionCount,
    chayHangPctText,
    chayHangRushTotal: rush,
    chayHangPlanTotal: plan,
    chayHangPct: pct,
  };
}

/** KPI tổng hợp tab Kế toán kho — chỉ đọc các mục wh*. */
function computeWarehouseOperationalScore(sections, header) {
  const reportDate = header.reportDate || "";
  const autoMetrics = getAutoMetrics(sections, header);
  const whKeys = Object.keys(sections).filter((k) => k.startsWith("wh"));
  const deductions = [];

  let activeWh = 0;
  whKeys.forEach((k) => {
    if (sections[k]?.hasIssue) activeWh += 1;
  });
  if (activeWh > 0) {
    deductions.push({
      id: "whIssues",
      label: `${activeWh} hạng mục kho có phát sinh vận đề`,
      points: Math.min(30, 5 * activeWh),
    });
  }

  const hsd = aggregateWarehouseHsdStats(sections, reportDate);
  if (hsd.overdueSkus > 0) {
    deductions.push({
      id: "whHsdExpired",
      label: "Có mặt hàng HSD quá hạn / cần ngưng sử dụng",
      points: 25,
    });
  } else if (hsd.nearSkus > 0) {
    deductions.push({
      id: "whHsdNear",
      label: "Có mặt hàng HSD gần hết hạn (1–3 ngày)",
      points: 8,
    });
  }

  let missingActionCount = 0;
  whKeys.forEach((k) => {
    if (sections[k]?.hasIssue && !String(sections[k]?.actionTaken || "").trim()) missingActionCount += 1;
  });
  if (missingActionCount > 0) {
    deductions.push({
      id: "noAction",
      label:
        missingActionCount === 1
          ? "1 mục kho thiếu nội dung xử lý (cột Xử lý)"
          : `${missingActionCount} mục kho thiếu nội dung xử lý`,
      points: 10 * missingActionCount,
    });
  }

  const totalOff = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, 100 - Math.min(100, totalOff));
  const grade = gradeFromOpsScore(score);
  const cookingErrorCount = 0;

  return {
    score,
    grade,
    deductions,
    autoMetrics,
    cookingErrorCount,
    complaintN: 0,
    missingActionCount,
    chayHangPctText: "",
    chayHangRushTotal: 0,
    chayHangPlanTotal: 0,
    chayHangPct: 0,
  };
}

function buildWarehouseBriefAssessment(ops, hsd) {
  const qtyTxt = hsd.totalQty > 0 ? hsd.totalQty.toFixed(1) : "0";
  const tail = `HSD: ${hsd.nearSkus} mặt hàng gần hết hạn; ${hsd.overdueSkus} quá hạn; tổng SL cần xử lý ~${qtyTxt} (${hsd.assess}).`;
  if (!ops.deductions.length) {
    return `Điểm ${ops.score} — ${ops.grade.label}. Không có khấu trừ KPI kho. ${tail}`;
  }
  return `Điểm ${ops.score} — ${ops.grade.label}. Khấu trừ: ${ops.deductions
    .map((d) => `${d.label} (−${d.points})`)
    .join("; ")}. ${tail}`;
}

function buildWarehouseWarningChips(ops) {
  if (!ops.deductions.length) return [];
  return ops.deductions.map((d) => `${d.label} — −${d.points}đ`);
}

function buildWarehouseKpiRows(ops) {
  const d = (id) => deductionPointsById(ops, id);
  return [
    {
      metric: "Điểm / xếp loại (kho)",
      result: `${ops.score} · ${ops.grade.label}`,
      deduct: "—",
      note: "KPI kiểm soát kho + HSD",
    },
    {
      metric: "Hạng mục có phát sinh",
      result: d("whIssues") ? "Có" : "Không",
      deduct: String(d("whIssues") || 0),
      note: "Nhóm A–G",
    },
    {
      metric: "HSD quá hạn",
      result: d("whHsdExpired") ? "Có" : "Không",
      deduct: String(d("whHsdExpired") || 0),
      note: "Nhóm D",
    },
    {
      metric: "HSD gần hết hạn",
      result: d("whHsdNear") ? "Có" : "Không",
      deduct: String(d("whHsdNear") || 0),
      note: "1–3 ngày so ngày báo cáo",
    },
    {
      metric: "Thiếu xử lý ghi nhận",
      result: ops.missingActionCount ? String(ops.missingActionCount) : "Không",
      deduct: String(d("noAction") || 0),
      note: "Tổng hợp từ cột Xử lý",
    },
  ];
}

function calcProcurementSeverity(todayTotal, vs7Pct) {
  if (todayTotal > 1000000 || vs7Pct > 50) return "Nghiêm trọng";
  if (todayTotal > 500000 || vs7Pct > 20) return "Cảnh báo";
  return "OK";
}

function addDaysYmd(ymd, offsetDays) {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return dt.toISOString().slice(0, 10);
}

function loadProcurementTotalByDate(header, tabKey, dateYmd) {
  try {
    const key = `${storageKey({ ...header, reportDate: dateYmd })}::${tabKey}`;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const normalized = normalizeFormSnapshot(parsed);
    return aggregateProcurementStats(normalized.sections || {}).total || 0;
  } catch {
    return 0;
  }
}

function buildProcurementFinanceStats(sections, header, tabKey = "warehouse") {
  const agg = aggregateProcurementStats(sections);
  const todayTotal = agg.total;
  const yesterdayDate = addDaysYmd(header.reportDate, -1);
  const yTotal = yesterdayDate ? loadProcurementTotalByDate(header, tabKey, yesterdayDate) : 0;
  const diff = todayTotal - yTotal;
  const diffPct = yTotal > 0 ? (diff / yTotal) * 100 : todayTotal > 0 ? 100 : 0;
  const sevenTotals = [];
  for (let i = 1; i <= 7; i += 1) {
    const d = addDaysYmd(header.reportDate, -i);
    if (!d) continue;
    sevenTotals.push(loadProcurementTotalByDate(header, tabKey, d));
  }
  const avg7 = sevenTotals.length ? sevenTotals.reduce((s, x) => s + x, 0) / sevenTotals.length : 0;
  const vs7Pct = avg7 > 0 ? ((todayTotal - avg7) / avg7) * 100 : todayTotal > 0 ? 100 : 0;
  const severity = calcProcurementSeverity(todayTotal, vs7Pct);
  return { ...agg, todayTotal, yTotal, diff, diffPct, avg7, vs7Pct, severity };
}

function computeProcurementOperationalScore(sections, header) {
  const stats = buildProcurementFinanceStats(sections, header, "warehouse");
  const deductions = [];
  const pmIssueN = Object.keys(PM_GROUP_KEYS).filter((k) => sections[k]?.hasIssue).length;
  if (pmIssueN > 0) deductions.push({ id: "pmIssueCount", label: `${pmIssueN} hạng mục có chi phí phát sinh`, points: Math.min(25, pmIssueN * 4) });
  if (stats.todayTotal > 1000000) deductions.push({ id: "pmThresholdSerious", label: "Tổng phát sinh > 1,000,000", points: 25 });
  else if (stats.todayTotal > 500000) deductions.push({ id: "pmThresholdWarn", label: "Tổng phát sinh > 500,000", points: 10 });
  if (stats.vs7Pct > 50) deductions.push({ id: "pmVs7Serious", label: "Tăng > 50% so TB 7 ngày", points: 20 });
  else if (stats.vs7Pct > 20) deductions.push({ id: "pmVs7Warn", label: "Tăng > 20% so TB 7 ngày", points: 10 });
  const noActionCount = Object.keys(PM_GROUP_KEYS).filter((k) => sections[k]?.hasIssue && !String(sections[k]?.actionTaken || "").trim()).length;
  if (noActionCount > 0) deductions.push({ id: "noAction", label: `${noActionCount} mục thiếu hướng xử lý`, points: noActionCount * 8 });
  const score = Math.max(0, 100 - deductions.reduce((s, d) => s + d.points, 0));
  return {
    score,
    grade: gradeFromOpsScore(score),
    deductions,
    autoMetrics: { ...getAutoMetrics(sections, header), complaintCount: 0, hasComplaint: "no" },
    cookingErrorCount: 0,
    complaintN: 0,
    missingActionCount: noActionCount,
    financeStats: stats,
  };
}

function buildProcurementWarningChips(ops) {
  return (ops.deductions || []).map((d) => `${d.label} — −${d.points}đ`);
}

function buildOpsBriefAssessment(ops) {
  const { score, grade, deductions, autoMetrics } = ops;
  const tail = `Đủ suất: ${labelYesNo(autoMetrics.enoughMeals)}; đúng giờ: ${labelYesNo(
    autoMetrics.onTime
  )}; phản ánh: ${autoMetrics.complaintCount || 0}.`;
  if (deductions.length === 0) {
    return `Điểm ${score} — ${grade.label}. Không có khấu trừ theo rule. ${tail}`;
  }
  return `Điểm ${score} — ${grade.label}. Khấu trừ: ${deductions
    .map((d) => `${d.label} (−${d.points})`)
    .join("; ")}. ${tail}`;
}

function buildOpsWarningChips(ops, sections, header) {
  const chips = [];
  const delayMinutes = Number(sections.phucVu?.delayMinutes || 0);
  const chiaPlan = Number(sections.chiaSuat?.distributedPlan || 0);
  const chiaActual = Number(sections.chiaSuat?.distributedActual || 0);
  const shortage = chiaPlan > chiaActual ? chiaPlan - chiaActual : 0;
  const planned = Number(header.plannedMeals || 0);
  const actual = Number(header.actualMeals || 0);
  const headerGap = planned > actual ? planned - actual : 0;

  if (ops.autoMetrics.enoughMeals === "no") {
    chips.push(
      shortage > 10
        ? `Thiếu suất (${shortage} suất chia) — −15`
        : headerGap > 10
        ? `Thiếu suất (kế hoạch − thực tế: ${headerGap}) — −15`
        : "Thiếu suất — −15"
    );
  }
  if (ops.autoMetrics.onTime === "no") {
    chips.push(`Trễ phục vụ ${delayMinutes} phút — −10`);
  }
  if (ops.complaintN > 0) {
    chips.push(
      `${ops.complaintN} phản ánh khách — −${10 * ops.complaintN}`
    );
  }
  if (ops.cookingErrorCount > 0) {
    chips.push(`${ops.cookingErrorCount} lỗi chế biến/sơ chế/chia suất — −${10 * ops.cookingErrorCount}`);
  }
  if (ops.autoMetrics.atvstpResult === "bad") {
    chips.push("ATVSTP không OK — −25");
  }
  if (sections.haTangThietBi?.hasIssue || sections.haTangThietBi?.status === "bad") {
    chips.push("Thiết bị / hạ tầng ảnh hưởng vận hành — −10");
  }
  if (ops.missingActionCount > 0) {
    chips.push(
      `${ops.missingActionCount} phát sinh thiếu hành động xử lý — −${10 * ops.missingActionCount}`
    );
  }
  return chips;
}

function deductionPointsById(ops, id) {
  return ops.deductions.find((x) => x.id === id)?.points ?? 0;
}

function levelLabelFromDeductionPoints(points) {
  if (points >= 25) return "Nghiêm trọng";
  if (points >= 15) return "Trung bình";
  return "Nhẹ";
}

const OPS_WARN_RULE_TEXT = {
  shortage: "Thiếu suất vượt ngưỡng KPI (kế hoạch / chia suất)",
  late: "Trễ phục vụ > 5 phút",
  complaint: "Có phản ánh khách hàng",
  cooking: "Phát sinh tại sơ chế / chế biến / chia suất",
  atvstp: "ATVSTP không đạt",
  equipment: "Thiết bị / hạ tầng ảnh hưởng vận hành",
  noAction: "Có phát sinh nhưng thiếu hành động xử lý",
  kitchenRush: "% chạy hàng phát sinh so với tổng suất kế hoạch trong ngày",
  kitchenShort: "Thiếu suất theo báo cáo bếp",
  kitchenDish: "Lỗi món ăn",
  kitchenLate: "Trễ / nguội tiến độ món",
  kitchenEq: "Thiết bị / ảnh hưởng sản xuất",
  kitchenAtvstp: "ATVSTP bếp có phát sinh",
  whIssues: "Có phát sinh tại một hoặc nhiều hạng mục kiểm soát kho / vận hành",
  whHsdExpired: "Tồn tại dòng HSD với số ngày còn lại ≤ 0 (quá hạn)",
  whHsdNear: "Tồn tại dòng HSD còn 1–3 ngày so với ngày báo cáo",
};

const OPS_WARN_ACTION_TEXT = {
  shortage: "Điều chỉnh kế hoạch suất, bổ sung ngay khi có thể; báo cáo điều hành nếu vượt ngưỡng.",
  late: "Chốt khung giờ phục vụ, rút kinh nghiệm line; theo dõi ngày mai.",
  complaint: "Ghi nhận, phản hồi khách, khắc phục nguyên nhân; cập nhật kết quả.",
  cooking: "Xử lý tại line liên quan; kiểm soát chất lượng mẻ / định mức.",
  atvstp: "Khắc phục vi phạm, tái kiểm tra PPE / vệ sinh / nhiệt độ theo checklist.",
  equipment: "Báo kỹ thuật, có phương án dự phòng thiết bị / công suất.",
  noAction: "Bổ sung hành động xử lý và người phụ trách tại mục phát sinh.",
  kitchenRush: "Rà soát kế hoạch suất, dự báo line và phối hợp GS DV để giảm chạy hàng.",
  kitchenShort: "Bù suất, điều chỉnh line và cập nhật biên bản bàn giao.",
  kitchenDish: "Chỉnh công thức / quy trình nấu; kiểm soát QC mẻ.",
  kitchenLate: "Tối ưu lịch lên món, giảm chờ giữa các khâu.",
  kitchenEq: "Báo kỹ thuật, có phương án dự phòng công suất.",
  kitchenAtvstp: "Khắc phục vi phạm ATVSTP bếp và tái kiểm tra ngay trong ca.",
  whIssues: "Xử lý từng dòng chi tiết; phối hợp bếp / thu mua; cập nhật kết quả tại mục.",
  whHsdExpired: "Ngưng sử dụng — xử lý hủy theo quy trình; điều chỉnh tồn và thông báo bếp.",
  whHsdNear: "Ưu tiên xuất dùng ngay; thông báo bếp ưu tiên sử dụng.",
};

function buildDGroupWarningRows(ops) {
  if (!ops.deductions.length) {
    return [
      {
        stt: "—",
        alert: "Không có cảnh báo kích hoạt",
        rule: "Không thỏa điều kiện trừ điểm theo rule",
        level: "—",
        action: "Duy trì vận hành theo chuẩn.",
      },
    ];
  }
  return ops.deductions.map((d, i) => ({
    stt: String(i + 1),
    alert: `${d.label} (−${d.points}đ)`,
    rule: OPS_WARN_RULE_TEXT[d.id] || d.label,
    level: levelLabelFromDeductionPoints(d.points),
    action: OPS_WARN_ACTION_TEXT[d.id] || "Xử lý theo quy trình nội bộ và cập nhật kết quả tại mục liên quan.",
  }));
}

function buildKitchenKpiRows(ops) {
  const d = (id) => deductionPointsById(ops, id);
  return [
    {
      metric: "Điểm tổng / xếp loại",
      result: `${ops.score} · ${ops.grade.label}`,
      deduct: "—",
      note: "KPI bếp — rule nội bộ trong ngày",
    },
    {
      metric: "Thiếu suất",
      result: d("kitchenShort") ? "Có" : "Không",
      deduct: String(d("kitchenShort") || 0),
      note: "Mục 14",
    },
    {
      metric: "Lỗi món",
      result: d("kitchenDish") ? "Có" : "Không",
      deduct: String(d("kitchenDish") || 0),
      note: "Mục 9",
    },
    {
      metric: "Trễ tiến độ",
      result: d("kitchenLate") ? "Có" : "Không",
      deduct: String(d("kitchenLate") || 0),
      note: "Mục 16",
    },
    {
      metric: "Chạy hàng phát sinh",
      result: ops.chayHangPctText || "—",
      deduct: String(d("kitchenRush") || 0),
      note: "Mục 17 — % so kế hoạch header",
    },
    {
      metric: "Thiết bị / ảnh hưởng",
      result: d("kitchenEq") ? "Có" : "Không",
      deduct: String(d("kitchenEq") || 0),
      note: "Mục 22–24",
    },
    {
      metric: "ATVSTP bếp",
      result: d("kitchenAtvstp") ? "Có phát sinh" : "Không",
      deduct: String(d("kitchenAtvstp") || 0),
      note: "Mục 27–31",
    },
    {
      metric: "Thiếu hành động xử lý",
      result: ops.missingActionCount ? String(ops.missingActionCount) : "Không",
      deduct: String(d("noAction") || 0),
      note: "−10đ / mục",
    },
  ];
}

function buildKitchenWarningChips(ops) {
  if (!ops.deductions.length) return [];
  return ops.deductions.map((d) => `${d.label} — −${d.points}đ`);
}

function buildDGroupKpiRows(ops) {
  const d = (id) => deductionPointsById(ops, id);
  return [
    {
      metric: "Điểm / xếp loại",
      result: `${ops.score} · ${ops.grade.label}`,
      deduct: "—",
      note: "Điểm khởi đầu 100, trừ theo rule",
    },
    {
      metric: "Thiếu suất",
      result: labelThieuSuatCoKhong(ops.autoMetrics.enoughMeals),
      deduct: String(d("shortage") || 0),
      note: "Theo KPI kế hoạch & chia suất",
    },
    {
      metric: "Đúng giờ phục vụ",
      result: labelYesNo(ops.autoMetrics.onTime),
      deduct: String(d("late") || 0),
      note: "Trễ > 5 phút → trừ điểm",
    },
    {
      metric: "Phản ánh khách",
      result: ops.complaintN ? String(ops.complaintN) : "Không",
      deduct: String(d("complaint") || 0),
      note: "−10đ / phản ánh",
    },
    {
      metric: "Lỗi sơ chế / chế biến / chia suất",
      result: String(ops.cookingErrorCount),
      deduct: String(d("cooking") || 0),
      note: "−10đ / mục có phát sinh",
    },
    {
      metric: "ATVSTP",
      result: labelAtvstpResult(ops.autoMetrics.atvstpResult),
      deduct: String(d("atvstp") || 0),
      note: "Không OK → −25đ",
    },
    {
      metric: "Thiết bị / hạ tầng",
      result: d("equipment") ? "Có" : "Không",
      deduct: String(d("equipment") || 0),
      note: "Ảnh hưởng vận hành → −10đ",
    },
    {
      metric: "Thiếu hành động xử lý",
      result: ops.missingActionCount ? String(ops.missingActionCount) : "Không",
      deduct: String(d("noAction") || 0),
      note: "−10đ / mục",
    },
  ];
}

function getAutoManagerSummary(sections, header, autoMetrics, opsScoreOverride) {
  const sectionList = Object.values(sections);
  const issueSections = sectionList.filter((s) => s?.hasIssue || s?.status === "bad");
  const badCount = sectionList.filter((s) => s?.status === "bad").length;
  const warningCount = sectionList.filter((s) => s?.status === "warning").length;
  const complaints = Number(autoMetrics.complaintCount || 0);
  const planned = Number(header.plannedMeals || 0);
  const actual = Number(header.actualMeals || 0);
  const gap = planned - actual;

  const ops = opsScoreOverride || computeOperationalDayScore(sections, header);
  let overallStatus = "ok";
  if (ops.grade.key === "fail") overallStatus = "bad";
  else if (ops.grade.key === "watch") overallStatus = "warning";
  else if (badCount > 0 || complaints > 0 || gap > 10 || autoMetrics.atvstpResult === "bad") {
    overallStatus = "bad";
  } else if (warningCount > 0 || issueSections.length > 0) {
    overallStatus = "warning";
  }

  const rank = { serious: 3, medium: 2, light: 1, "": 0 };
  let impactLevel = "light";
  issueSections.forEach((s) => {
    const il = s.impactLevel || "";
    if (rank[il] > rank[impactLevel]) impactLevel = il || "light";
  });
  if (issueSections.length === 0) impactLevel = "light";

  const respCount = {};
  issueSections.forEach((s) => {
    if (s.responsibility) respCount[s.responsibility] = (respCount[s.responsibility] || 0) + 1;
  });
  const mainResponsibility =
    Object.entries(respCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const titles = issueSections.map((s) => s.issueTitle).filter(Boolean);
  const mainIssues =
    titles.length > 0
      ? titles.join(" · ")
      : "Không có mục phát sinh chi tiết trong các hạng mục vận hành.";

  const actions = issueSections.map((s) => s.actionTaken).filter(Boolean);
  const nextDayAction =
    actions.length > 0
      ? actions.slice(0, 4).join(" | ")
      : "Theo dõi KPI ngày mai; rà soát lại các hạng mục đã ghi nhận ổn định.";

  const generalComment = `Chấm điểm tự động: ${ops.score} (${ops.grade.label}). ${issueSections.length} hạng mục có phát sinh cần theo dõi.`;

  return {
    overallStatus,
    impactLevel,
    mainResponsibility,
    mainIssues,
    nextDayAction,
    generalComment,
  };
}

function mergeAutoExecutiveIntoForm(currentForm, opsScoreOverride) {
  const autoMetrics = opsScoreOverride?.autoMetrics ?? getAutoMetrics(currentForm.sections, currentForm.header);
  const autoManager = getAutoManagerSummary(currentForm.sections, currentForm.header, autoMetrics, opsScoreOverride);
  return {
    ...currentForm,
    metrics: { ...currentForm.metrics, ...autoMetrics },
    managerSummary: { ...currentForm.managerSummary, ...autoManager },
  };
}

function renderQuickFieldInput(field, section, onSectionChange) {
  const value = section[field.key] ?? "";
  if (field.type === "selectYN") {
    return (
      <select className="report-select" value={value} onChange={(e) => onSectionChange(field.key, e.target.value)}>
        <option value="">—</option>
        <option value="yes">Có</option>
        <option value="no">Không</option>
      </select>
    );
  }
  if (field.type === "number") {
    return (
      <input
        className="report-input"
        type="number"
        min="0"
        placeholder={field.placeholder || "0"}
        value={value}
        onChange={(e) => onSectionChange(field.key, e.target.value)}
      />
    );
  }
  return (
    <input
      className="report-input"
      type="text"
      placeholder={field.placeholder || ""}
      value={value}
      onChange={(e) => onSectionChange(field.key, e.target.value)}
    />
  );
}

/** Chi tiết phát sinh: 1 bảng, 1 dòng = 1 issue; chỉ số kèm theo gộp 2 cột (tên chỉ số | giá trị). */
function SectionIssueDetailTable({ section, onSectionChange, errors, quickFields = [] }) {
  return (
    <div className="report-issue-detail-wrap">
      <div className="report-issue-detail-caption">Chi tiết phát sinh</div>
      <table className="report-detail-table report-issue-issue-table">
        <thead>
          <tr>
            <th className="col-issue-stt">STT</th>
            <th className="col-issue-title">Nội dung phát sinh</th>
            <th className="col-issue-cause">Nguyên nhân</th>
            <th className="col-issue-action">Hướng xử lý</th>
            <th className="col-issue-resp">Trách nhiệm</th>
            <th className="col-issue-deadline">Deadline</th>
            <th className="col-issue-result">Kết quả</th>
            <th className="col-issue-source">Nguồn lỗi</th>
            <th className="col-issue-owner">Người phụ trách</th>
            <th className="col-issue-kpi-name">Chỉ số liên quan</th>
            <th className="col-issue-kpi-value">Giá trị / Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="col-issue-stt">
              <span className="report-issue-stt">1</span>
            </td>
            <td className="col-issue-title">
              <input
                className="report-input"
                type="text"
                placeholder="Mô tả ngắn gọn"
                value={section.issueTitle}
                onChange={(e) => onSectionChange("issueTitle", e.target.value)}
              />
              {errors.issueTitle ? <div className="report-error-text">{errors.issueTitle}</div> : null}
            </td>
            <td className="col-issue-cause">
              <textarea
                className="report-textarea"
                rows={2}
                placeholder="Nguyên nhân"
                value={section.cause}
                onChange={(e) => onSectionChange("cause", e.target.value)}
              />
              {errors.cause ? <div className="report-error-text">{errors.cause}</div> : null}
            </td>
            <td className="col-issue-action">
              <textarea
                className="report-textarea"
                rows={2}
                placeholder="Hướng xử lý"
                value={section.actionTaken}
                onChange={(e) => onSectionChange("actionTaken", e.target.value)}
              />
              {errors.actionTaken ? <div className="report-error-text">{errors.actionTaken}</div> : null}
            </td>
            <td className="col-issue-resp">
              <select className="report-select" value={section.responsibility} onChange={(e) => onSectionChange("responsibility", e.target.value)}>
                <option value="">—</option>
                {RESPONSIBILITY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              {errors.responsibility ? <div className="report-error-text">{errors.responsibility}</div> : null}
            </td>
            <td className="col-issue-deadline">
              <input
                className="report-input report-input-date"
                type="date"
                value={section.issueDeadline || ""}
                onChange={(e) => onSectionChange("issueDeadline", e.target.value)}
              />
            </td>
            <td className="col-issue-result">
              <input
                className="report-input"
                type="text"
                placeholder="Kết quả"
                value={section.issueResult || ""}
                onChange={(e) => onSectionChange("issueResult", e.target.value)}
              />
            </td>
            <td className="col-issue-source">
              <select className="report-select" value={section.issueSource} onChange={(e) => onSectionChange("issueSource", e.target.value)}>
                <option value="">—</option>
                {SOURCE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              {errors.issueSource ? <div className="report-error-text">{errors.issueSource}</div> : null}
            </td>
            <td className="col-issue-owner">
              <input
                className="report-input"
                type="text"
                placeholder="Họ tên"
                value={section.issueOwner || ""}
                onChange={(e) => onSectionChange("issueOwner", e.target.value)}
              />
            </td>
            <td className="col-issue-kpi-name">
              {quickFields.length === 0 ? (
                <span className="report-issue-kpi-empty">—</span>
              ) : (
                <div className="report-issue-kpi-stack">
                  {quickFields.map((field) => (
                    <div key={field.key} className="report-issue-kpi-line report-issue-kpi-line-label">
                      {field.label}
                    </div>
                  ))}
                </div>
              )}
            </td>
            <td className="col-issue-kpi-value">
              {quickFields.length === 0 ? (
                <span className="report-issue-kpi-empty">—</span>
              ) : (
                <div className="report-issue-kpi-stack">
                  {quickFields.map((field) => (
                    <div key={field.key} className="report-issue-kpi-line report-issue-kpi-line-value">
                      {renderQuickFieldInput(field, section, onSectionChange)}
                    </div>
                  ))}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ChayHangPhatSinhSummary({ header, section }) {
  const { plan, rush, pct } = computeChayHangPlanRushPct(header, section);
  const tone = chayHangPctTone(pct, !!section?.hasIssue);
  const color = tone === "ok" ? "#15803d" : tone === "warning" ? "#c2410c" : "#b91c1c";
  return (
    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color }}>
      Phát sinh: {rush} suất ({pct.toFixed(1)}%)
      {plan > 0 ? (
        <span style={{ fontWeight: 600, color: "#64748b" }}> · Kế hoạch header: {plan} suất</span>
      ) : (
        <span style={{ fontWeight: 600, color: "#94a3b8" }}> · Chưa có kế hoạch header</span>
      )}
    </div>
  );
}

function WarehouseIssueDetailTable({
  rows,
  reportDate,
  warehouseSectionKey,
  onRowChange,
  onAddRow,
  onRemoveLast,
  errors,
}) {
  const rowList = rows.length ? rows : defaultWhIssueRows();
  const rowErrors = errors?.warehouseRowErrors || [];
  const isHsd = WH_HSD_KEYS.has(warehouseSectionKey);

  return (
    <div className="report-issue-detail-wrap">
      <div className="report-issue-detail-caption">Chi tiết vận đề vận hành kho</div>
      <table className="report-detail-table report-issue-issue-table">
        <thead>
          <tr>
            <th className="col-issue-stt">STT</th>
            <th className="col-issue-title">Vấn đề</th>
            <th>Số lượng</th>
            <th>Ngày hết hạn</th>
            <th>Số ngày còn lại</th>
            <th>Ảnh hưởng</th>
            <th>Nguyên nhân</th>
            <th>Xử lý</th>
            <th>Phụ trách</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {rowList.map((row, idx) => {
            const d = row.expiryDate ? diffCalendarDaysExpiryMinusReport(row.expiryDate, reportDate) : null;
            const tone = warehouseDaysLeftTone(d);
            const hint = warehouseActionHintFromDaysLeft(d);
            return (
              <tr key={`wh-row-${idx}`}>
                <td className="col-issue-stt">
                  <span className="report-issue-stt">{idx + 1}</span>
                </td>
                <td className="col-issue-title">
                  <input
                    className="report-input"
                    type="text"
                    placeholder="VD: Thịt heo X — còn 1 ngày"
                    value={row.problem}
                    onChange={(e) => onRowChange(idx, "problem", e.target.value)}
                  />
                  {rowErrors[idx]?.problem ? <div className="report-error-text">{rowErrors[idx].problem}</div> : null}
                </td>
                <td>
                  <input
                    className="report-input"
                    type="text"
                    placeholder="kg / thùng"
                    value={row.qty}
                    onChange={(e) => onRowChange(idx, "qty", e.target.value)}
                  />
                  {rowErrors[idx]?.qty ? <div className="report-error-text">{rowErrors[idx].qty}</div> : null}
                </td>
                <td>
                  <input
                    className="report-input report-input-date"
                    type="date"
                    value={row.expiryDate || ""}
                    onChange={(e) => onRowChange(idx, "expiryDate", e.target.value)}
                  />
                  {rowErrors[idx]?.expiryDate ? <div className="report-error-text">{rowErrors[idx].expiryDate}</div> : null}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: tone.color }}>{tone.label}</span>
                  {isHsd && hint ? (
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Gợi ý: {hint}</div>
                  ) : null}
                </td>
                <td>
                  <input
                    className="report-input"
                    type="text"
                    placeholder="Trễ / thiếu suất…"
                    value={row.impact}
                    onChange={(e) => onRowChange(idx, "impact", e.target.value)}
                  />
                  {rowErrors[idx]?.impact ? <div className="report-error-text">{rowErrors[idx].impact}</div> : null}
                </td>
                <td>
                  <input
                    className="report-input"
                    type="text"
                    placeholder="Nguyên nhân"
                    value={row.cause}
                    onChange={(e) => onRowChange(idx, "cause", e.target.value)}
                  />
                </td>
                <td>
                  <textarea
                    className="report-textarea"
                    rows={2}
                    placeholder={hint || "Biện pháp"}
                    value={row.action}
                    onChange={(e) => onRowChange(idx, "action", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="report-input"
                    type="text"
                    placeholder="Phụ trách"
                    value={row.owner}
                    onChange={(e) => onRowChange(idx, "owner", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="report-input"
                    type="text"
                    placeholder="Kết quả"
                    value={row.result}
                    onChange={(e) => onRowChange(idx, "result", e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="report-expand-btn" onClick={onAddRow}>
          + Thêm dòng
        </button>
        {rowList.length > 1 ? (
          <button type="button" className="report-expand-btn" onClick={onRemoveLast}>
            Xóa dòng cuối
          </button>
        ) : null}
      </div>
      {errors.issueRows ? <div className="report-error-text">{errors.issueRows}</div> : null}
    </div>
  );
}

function ProcurementCostDetailTable({ rows, onRowChange, onAddRow, onRemoveLast, errors }) {
  const rowList = rows.length ? rows : defaultPmCostRows();
  const rowErrors = errors?.procurementRowErrors || [];
  const total = rowList.reduce((sum, r) => sum + pmRowAmount(r), 0);
  return (
    <div className="report-issue-detail-wrap">
      <div className="report-issue-detail-caption">Chi tiết chi phí phát sinh ngoài kế hoạch</div>
      <table className="report-detail-table report-issue-issue-table">
        <thead>
          <tr>
            <th className="col-issue-stt">STT</th>
            <th>Nội dung chi phí</th>
            <th>Số lượng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
            <th>Loại chi phí</th>
            <th>Nguồn phát sinh</th>
            <th>Ảnh hưởng</th>
            <th>Hướng xử lý</th>
            <th>Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {rowList.map((row, idx) => (
            <tr key={`pm-row-${idx}`} style={{ background: pmRowAmount(row) > 500000 ? "#fffbeb" : "transparent" }}>
              <td className="col-issue-stt">
                <span className="report-issue-stt">{idx + 1}</span>
              </td>
              <td>
                <input className="report-input" type="text" placeholder="Nội dung chi phí" value={row.content} onChange={(e) => onRowChange(idx, "content", e.target.value)} />
                {rowErrors[idx]?.content ? <div className="report-error-text">{rowErrors[idx].content}</div> : null}
              </td>
              <td>
                <input className="report-input" type="number" min="0" step="any" placeholder="0" value={row.qty} onChange={(e) => onRowChange(idx, "qty", e.target.value)} />
                {rowErrors[idx]?.qty ? <div className="report-error-text">{rowErrors[idx].qty}</div> : null}
              </td>
              <td>
                <input className="report-input" type="number" min="0" step="any" placeholder="0" value={row.unitPrice} onChange={(e) => onRowChange(idx, "unitPrice", e.target.value)} />
                {rowErrors[idx]?.unitPrice ? <div className="report-error-text">{rowErrors[idx].unitPrice}</div> : null}
              </td>
              <td>
                <input className="report-input" type="text" readOnly value={formatCurrencyVnd(pmRowAmount(row))} />
              </td>
              <td>
                <select className="report-select" value={row.costType} onChange={(e) => onRowChange(idx, "costType", e.target.value)}>
                  <option value="">—</option>
                  {PM_COST_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {rowErrors[idx]?.costType ? <div className="report-error-text">{rowErrors[idx].costType}</div> : null}
              </td>
              <td>
                <select className="report-select" value={row.source} onChange={(e) => onRowChange(idx, "source", e.target.value)}>
                  <option value="">—</option>
                  {PM_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {rowErrors[idx]?.source ? <div className="report-error-text">{rowErrors[idx].source}</div> : null}
              </td>
              <td>
                <input className="report-input" type="text" placeholder="Nguyên nhân / ảnh hưởng" value={row.impact} onChange={(e) => onRowChange(idx, "impact", e.target.value)} />
                {rowErrors[idx]?.impact ? <div className="report-error-text">{rowErrors[idx].impact}</div> : null}
              </td>
              <td>
                <textarea className="report-textarea" rows={2} placeholder="Hướng xử lý" value={row.action} onChange={(e) => onRowChange(idx, "action", e.target.value)} />
              </td>
              <td>
                <input className="report-input" type="text" placeholder="Kết quả" value={row.result} onChange={(e) => onRowChange(idx, "result", e.target.value)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="report-expand-btn" onClick={onAddRow}>
          + Thêm dòng
        </button>
        {rowList.length > 1 ? (
          <button type="button" className="report-expand-btn" onClick={onRemoveLast}>
            Xóa dòng cuối
          </button>
        ) : null}
        <div style={{ marginLeft: "auto", fontWeight: 700 }}>Tổng phát sinh: {formatCurrencyVnd(total)}</div>
      </div>
      {errors.costRows ? <div className="report-error-text">{errors.costRows}</div> : null}
    </div>
  );
}

function BepChayHangDetailTable({ rows, onRowChange, onAddRow, onRemoveLast, errors }) {
  const rowList = rows.length ? rows : defaultChayHangRows();
  const rowErrors = errors?.chayHangRowErrors || [];
  return (
    <div className="report-issue-detail-wrap">
      <div className="report-issue-detail-caption">Chi tiết chạy hàng phát sinh</div>
      <table className="report-detail-table report-issue-issue-table">
        <thead>
          <tr>
            <th className="col-issue-stt">STT</th>
            <th className="col-issue-title">Món phát sinh</th>
            <th className="col-issue-kpi-value">Số lượng</th>
            <th className="col-issue-source">Lý do</th>
            <th className="col-issue-deadline">Thời gian</th>
            <th className="col-issue-owner">Phụ trách</th>
            <th className="col-issue-result">Kết quả</th>
          </tr>
        </thead>
        <tbody>
          {rowList.map((row, idx) => (
            <tr key={idx}>
              <td className="col-issue-stt">
                <span className="report-issue-stt">{idx + 1}</span>
              </td>
              <td className="col-issue-title">
                <input
                  className="report-input"
                  type="text"
                  placeholder="Tên món"
                  value={row.dish}
                  onChange={(e) => onRowChange(idx, "dish", e.target.value)}
                />
                {rowErrors[idx]?.dish ? <div className="report-error-text">{rowErrors[idx].dish}</div> : null}
              </td>
              <td className="col-issue-kpi-value">
                <input
                  className="report-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={row.qty}
                  onChange={(e) => onRowChange(idx, "qty", e.target.value)}
                />
                {rowErrors[idx]?.qty ? <div className="report-error-text">{rowErrors[idx].qty}</div> : null}
              </td>
              <td className="col-issue-source">
                <select className="report-select" value={row.reason} onChange={(e) => onRowChange(idx, "reason", e.target.value)}>
                  <option value="">—</option>
                  {CHAY_HANG_REASON_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {rowErrors[idx]?.reason ? <div className="report-error-text">{rowErrors[idx].reason}</div> : null}
              </td>
              <td className="col-issue-deadline">
                <input
                  className="report-input"
                  type="text"
                  placeholder="Ví dụ: 11:40 hoặc 8 phút"
                  value={row.time}
                  onChange={(e) => onRowChange(idx, "time", e.target.value)}
                />
                {rowErrors[idx]?.time ? <div className="report-error-text">{rowErrors[idx].time}</div> : null}
              </td>
              <td className="col-issue-owner">
                <input
                  className="report-input"
                  type="text"
                  placeholder="Họ tên"
                  value={row.owner}
                  onChange={(e) => onRowChange(idx, "owner", e.target.value)}
                />
                {rowErrors[idx]?.owner ? <div className="report-error-text">{rowErrors[idx].owner}</div> : null}
              </td>
              <td className="col-issue-result">
                <input
                  className="report-input"
                  type="text"
                  placeholder="Kết quả"
                  value={row.result}
                  onChange={(e) => onRowChange(idx, "result", e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="report-expand-btn" onClick={onAddRow}>
          + Thêm dòng
        </button>
        {rowList.length > 1 ? (
          <button type="button" className="report-expand-btn" onClick={onRemoveLast}>
            Xóa dòng cuối
          </button>
        ) : null}
      </div>
      {errors.chayHangRows ? <div className="report-error-text">{errors.chayHangRows}</div> : null}
    </div>
  );
}

function SectionCard({
  title,
  section,
  expanded,
  onToggle,
  onSectionChange,
  errors = {},
  quickFields = [],
  detailVariant,
  phatSinhExtra,
  onChayHangRowsChange,
  warehouseReportDate = "",
  warehouseSectionKey = "",
  onWarehouseIssueRowsChange,
  onProcurementCostRowsChange,
  isWarehouseAccountingMode = false,
}) {
  const hasVisibleErrors = Object.keys(errors).length > 0;
  const tone = deriveIssueTone(section);
  const issueLocked = !section.hasIssue;
  const rows = section.chayHangRows && section.chayHangRows.length ? section.chayHangRows : defaultChayHangRows();
  const whRows = section.issueRows && section.issueRows.length ? section.issueRows : defaultWhIssueRows();
  const pmRows = section.costRows && section.costRows.length ? section.costRows : defaultPmCostRows();

  const hsdAutoLock =
    isWarehouseAccountingMode &&
    warehouseSectionKey &&
    WH_HSD_KEYS.has(warehouseSectionKey) &&
    warehouseHsdAutoIssueFromRows(section, warehouseReportDate);

  const hsdOverdueLock =
    isWarehouseAccountingMode &&
    warehouseSectionKey &&
    WH_HSD_KEYS.has(warehouseSectionKey) &&
    whRows.some((r) => {
      const d = diffCalendarDaysExpiryMinusReport(r.expiryDate, warehouseReportDate);
      return d !== null && Number.isFinite(d) && d <= 0;
    });

  const whOwners = whRows.map((r) => String(r.owner || "").trim()).filter(Boolean);
  const whRespDisplay =
    detailVariant === "warehouseOps" && section.hasIssue
      ? [...new Set([...(section.responsibility ? [section.responsibility] : []), ...whOwners])].join(" · ") || "Kho"
      : detailVariant === "procurementCost" && section.hasIssue
        ? section.responsibility || "Quản lý"
      : section.responsibility || "—";

  return (
    <>
      <tr
        className={`report-master-row ${hasVisibleErrors ? "has-errors" : ""} tone-${tone} ${
          section.hasIssue ? "is-issue" : ""
        }`}
      >
        <td className="report-cell report-cell-expand">
          <button
            type="button"
            className="report-expand-btn"
            onClick={onToggle}
            disabled={!section.hasIssue}
            aria-label={expanded ? "Thu gọn chi tiết" : "Mở rộng chi tiết"}
          >
            {expanded ? "−" : "+"}
          </button>
        </td>
        <td className="report-cell report-cell-item">{title}</td>
        <td className="report-cell">
          <select
            className="report-select"
            value={section.hasIssue ? "yes" : "no"}
            disabled={hsdAutoLock}
            onChange={(e) => onSectionChange("hasIssue", e.target.value === "yes")}
          >
            <option value="no">Không phát sinh</option>
            <option value="yes">Có phát sinh</option>
          </select>
          {phatSinhExtra}
        </td>
        <td className="report-cell">
          <select
            className="report-select"
            value={section.impactLevel}
            disabled={issueLocked || hsdOverdueLock}
            onChange={(e) => onSectionChange("impactLevel", e.target.value)}
          >
            <option value="">{issueLocked ? "—" : "Chọn mức độ"}</option>
            {IMPACT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </td>
        <td className="report-cell">
          <input
            className="report-input"
            type="text"
            readOnly
            value={
              !section.hasIssue
                ? "—"
                : detailVariant === "chayHang"
                  ? rows
                      .map((r) => String(r.owner || "").trim())
                      .filter(Boolean)
                      .join(" · ") || "—"
                  : detailVariant === "warehouseOps"
                    ? whRespDisplay
                    : section.responsibility || "—"
            }
            title={section.hasIssue ? "Chỉnh trong form chi tiết (mở rộng)" : ""}
          />
        </td>
        <td className="report-cell">
          <input
            className="report-input"
            type="text"
            placeholder="Ghi chú"
            value={section.note || ""}
            onChange={(e) => onSectionChange("note", e.target.value)}
          />
        </td>
      </tr>

      {section.hasIssue && expanded ? (
        <tr className="report-detail-row">
          <td className="report-cell" colSpan={6}>
            {detailVariant === "chayHang" && onChayHangRowsChange ? (
              <BepChayHangDetailTable
                rows={rows}
                onRowChange={(idx, field, val) => {
                  const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
                  onChayHangRowsChange(next);
                }}
                onAddRow={() => {
                  onChayHangRowsChange([...rows, { dish: "", qty: "", reason: "", time: "", owner: "", result: "" }]);
                }}
                onRemoveLast={() => {
                  if (rows.length <= 1) return;
                  onChayHangRowsChange(rows.slice(0, -1));
                }}
                errors={errors}
              />
            ) : detailVariant === "warehouseOps" && onWarehouseIssueRowsChange ? (
              <WarehouseIssueDetailTable
                rows={whRows}
                reportDate={warehouseReportDate}
                warehouseSectionKey={warehouseSectionKey}
                onRowChange={(idx, field, val) => {
                  const next = whRows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
                  onWarehouseIssueRowsChange(next);
                }}
                onAddRow={() => {
                  onWarehouseIssueRowsChange([
                    ...whRows,
                    {
                      problem: "",
                      qty: "",
                      expiryDate: "",
                      impact: "",
                      cause: "",
                      action: "",
                      owner: "",
                      result: "",
                    },
                  ]);
                }}
                onRemoveLast={() => {
                  if (whRows.length <= 1) return;
                  onWarehouseIssueRowsChange(whRows.slice(0, -1));
                }}
                errors={errors}
              />
            ) : detailVariant === "procurementCost" && onProcurementCostRowsChange ? (
              <ProcurementCostDetailTable
                rows={pmRows}
                onRowChange={(idx, field, val) => {
                  const next = pmRows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
                  onProcurementCostRowsChange(next);
                }}
                onAddRow={() => {
                  onProcurementCostRowsChange([
                    ...pmRows,
                    { content: "", qty: "", unitPrice: "", costType: "", source: "", impact: "", action: "", result: "" },
                  ]);
                }}
                onRemoveLast={() => {
                  if (pmRows.length <= 1) return;
                  onProcurementCostRowsChange(pmRows.slice(0, -1));
                }}
                errors={errors}
              />
            ) : (
              <SectionIssueDetailTable
                section={section}
                onSectionChange={onSectionChange}
                errors={errors}
                quickFields={quickFields}
              />
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function BaoCaoVanHanhBepForm({ initialTab = "summary" }) {
  const isServiceMode = initialTab === "service";
  const isKitchenMode = initialTab === "bep";
  const isWarehouseAccountingMode = initialTab === "accounting";
  const isProcurementMode = initialTab === "warehouse";
  const activeSectionConfig = isKitchenMode
    ? KITCHEN_SECTION_CONFIG
    : isWarehouseAccountingMode
      ? ACCOUNTING_WAREHOUSE_SECTION_CONFIG
      : isProcurementMode
        ? PROCUREMENT_SECTION_CONFIG
      : isServiceMode
        ? SERVICE_SECTION_CONFIG
        : MANAGEMENT_SECTION_CONFIG;

  const computeOpsForForm = (f) =>
    initialTab === "bep"
      ? computeKitchenOperationalScore(f.sections, f.header)
      : initialTab === "accounting"
        ? computeWarehouseOperationalScore(f.sections, f.header)
        : initialTab === "warehouse"
          ? computeProcurementOperationalScore(f.sections, f.header)
        : computeOperationalDayScore(f.sections, f.header);
  const [form, setForm] = useState(createDefaultForm);
  const masterCatalog = useMasterCatalogSnapshot();
  const siteSelectOptions = useMemo(() => buildSiteSelectOptions(), [masterCatalog]);
  const siteOptionsWithLegacy = useMemo(() => {
    const v = String(form.header.site || "").trim();
    if (v && !siteSelectOptions.some((o) => o.value === v)) {
      return [{ value: v, label: `${v} (không có trong danh mục)` }, ...siteSelectOptions];
    }
    return siteSelectOptions;
  }, [siteSelectOptions, form.header.site]);
  const shiftNameOptions = useMemo(() => {
    const n = getShiftNames();
    return n.length ? n : ["Ca ngày", "Ca đêm"];
  }, [masterCatalog]);
  const kitchenOptionsWithLegacy = useMemo(() => {
    const names = masterCatalog.departments.map((d) => d.name);
    const v = String(form.header.kitchen || "").trim();
    if (v && !names.includes(v)) {
      return [{ id: "__legacy__", name: v }, ...masterCatalog.departments];
    }
    return masterCatalog.departments;
  }, [masterCatalog, form.header.kitchen]);
  const [openSections, setOpenSections] = useState({
    dauCaRuiRo: true,
    kpiDay: true,
    autoWarnings: true,
    phucVu: true,
    phanAnhKhach: true,
    cheBien: true,
    chiaSuat: true,
    atvstp: true,
    managerSummary: true,
  });
  const [saveMessage, setSaveMessage] = useState("");
  /** Chuỗi JSON đã lưu gần nhất (để badge “Chưa lưu” khi có chỉnh sửa). */
  const [persistedSig, setPersistedSig] = useState("");
  const [errors, setErrors] = useState({});
  const [openGroups, setOpenGroups] = useState(() =>
    activeSectionConfig.reduce((acc, group) => ({ ...acc, [group.group]: true }), {})
  );

  useEffect(() => {
    setOpenGroups(activeSectionConfig.reduce((acc, group) => ({ ...acc, [group.group]: true }), {}));
    setOpenSections((prev) => ({
      ...prev,
      ...activeSectionConfig.reduce((acc, group) => {
        group.items.forEach((item) => {
          acc[item.key] = true;
        });
        return acc;
      }, {}),
    }));
  }, [activeSectionConfig]);

  const saveKey = useMemo(() => `${storageKey(form.header)}::${initialTab}`, [form.header, initialTab]);

  const currentSig = useMemo(() => {
    try {
      const ops =
        initialTab === "bep"
          ? computeKitchenOperationalScore(form.sections, form.header)
          : initialTab === "accounting"
            ? computeWarehouseOperationalScore(form.sections, form.header)
            : initialTab === "warehouse"
              ? computeProcurementOperationalScore(form.sections, form.header)
            : computeOperationalDayScore(form.sections, form.header);
      return JSON.stringify(normalizeFormSnapshot(mergeAutoExecutiveIntoForm(form, ops)));
    } catch {
      return "";
    }
  }, [form, initialTab]);

  const showUnsavedBadge = persistedSig !== "" && currentSig !== persistedSig;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(saveKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeFormSnapshot(parsed);
        const merged = mergeAutoExecutiveIntoForm(normalized, computeOpsForForm(normalized));
        setForm(merged);
        setPersistedSig(JSON.stringify(normalizeFormSnapshot(merged)));
      } else {
        const next = {
          ...createDefaultForm(),
          header: { ...createDefaultForm().header, ...form.header },
        };
        setForm(next);
        setPersistedSig(JSON.stringify(normalizeFormSnapshot(mergeAutoExecutiveIntoForm(next, computeOpsForForm(next)))));
      }
    } catch (error) {
      console.error("Không đọc được dữ liệu báo cáo:", error);
    }
    // Chỉ chạy khi saveKey đổi; nhánh không có LS dùng form.header theo key hiện tại.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phụ thuộc saveKey
  }, [saveKey]);

  const execView = useMemo(() => {
    const opsScore =
      initialTab === "bep"
        ? computeKitchenOperationalScore(form.sections, form.header)
        : initialTab === "accounting"
          ? computeWarehouseOperationalScore(form.sections, form.header)
          : initialTab === "warehouse"
            ? computeProcurementOperationalScore(form.sections, form.header)
          : computeOperationalDayScore(form.sections, form.header);
    const { autoMetrics } = opsScore;
    const autoManager = getAutoManagerSummary(form.sections, form.header, autoMetrics, opsScore);
    const warehouseHsdAgg = aggregateWarehouseHsdStats(form.sections, form.header.reportDate || "");
    const procurementStats = buildProcurementFinanceStats(form.sections, form.header, "warehouse");
    const briefAssessment =
      initialTab === "accounting"
        ? buildWarehouseBriefAssessment(opsScore, warehouseHsdAgg)
        : initialTab === "warehouse"
          ? `Tổng phát sinh: ${formatCurrencyVnd(procurementStats.todayTotal)}. So với hôm qua: ${
              procurementStats.diff >= 0 ? "+" : ""
            }${formatCurrencyVnd(procurementStats.diff)} (${procurementStats.diffPct.toFixed(1)}%). So với TB 7 ngày: ${
              procurementStats.vs7Pct >= 0 ? "+" : ""
            }${procurementStats.vs7Pct.toFixed(1)}% (${procurementStats.severity}).`
        : buildOpsBriefAssessment(opsScore);
    return { autoMetrics, autoManager, opsScore, briefAssessment, warehouseHsdAgg, procurementStats };
  }, [form, initialTab]);

  const kitchenFooterStats = useMemo(() => {
    if (!isKitchenMode) return null;
    const plan = Math.max(0, Number(form.header.plannedMeals || 0));
    const rush = sumChayHangRowsQty(form.sections.bepChayHangPhatSinh);
    const pct = plan > 0 ? (rush / plan) * 100 : rush > 0 ? 100 : 0;
    let assess = "Bình thường";
    if (pct >= 10) assess = "Nghiêm trọng";
    else if (pct >= 5) assess = "Cảnh báo";
    return { plan, rush, pct, assess };
  }, [isKitchenMode, form.header.plannedMeals, form.sections.bepChayHangPhatSinh]);

  useEffect(() => {
    if (!isWarehouseAccountingMode) return;
    const rd = form.header.reportDate || "";
    setForm((prev) => {
      const nextSections = { ...prev.sections };
      let changed = false;
      Object.keys(nextSections).forEach((k) => {
        if (!k.startsWith("wh")) return;
        const synced = syncWarehouseAccountingSection(nextSections[k], k, rd);
        if (JSON.stringify(synced) !== JSON.stringify(nextSections[k])) {
          nextSections[k] = synced;
          changed = true;
        }
      });
      return changed ? { ...prev, sections: nextSections } : prev;
    });
  }, [isWarehouseAccountingMode, form.header.reportDate]);

  const warehouseKitchenPriority = useMemo(() => {
    if (!isWarehouseAccountingMode) return false;
    const rd = form.header.reportDate || "";
    for (const k of WH_HSD_KEYS) {
      if (warehouseHsdAutoIssueFromRows(form.sections[k], rd)) return true;
    }
    return false;
  }, [isWarehouseAccountingMode, form.sections, form.header.reportDate]);

  const summary = useMemo(() => {
    const sectionsVals = Object.values(form.sections);
    const issueSections = isWarehouseAccountingMode
      ? Object.entries(form.sections)
          .filter(([k, s]) => k.startsWith("wh") && s.hasIssue)
          .map(([, s]) => s)
      : isProcurementMode
        ? Object.entries(form.sections)
            .filter(([k, s]) => k.startsWith("pm") && s.hasIssue)
            .map(([, s]) => s)
      : sectionsVals.filter((item) => item.hasIssue);
    const { opsScore } = execView;
    const complaints = opsScore.complaintN;

    const overallTone =
      opsScore.grade.key === "fail" ? "red" : opsScore.grade.key === "watch" ? "amber" : "green";
    const overallLabel = opsScore.grade.label;

    const issueBySource = issueSections.reduce((acc, item) => {
      const key = item.issueSource || "Chưa xác định";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topSource = Object.entries(issueBySource).sort((a, b) => b[1] - a[1])[0]?.[0] || "Không có";

    const warnings = isKitchenMode
      ? buildKitchenWarningChips(opsScore)
      : isWarehouseAccountingMode
        ? buildWarehouseWarningChips(opsScore)
        : isProcurementMode
          ? buildProcurementWarningChips(opsScore)
        : buildOpsWarningChips(opsScore, form.sections, form.header);
    const chiaPlan = Number(form.sections.chiaSuat.distributedPlan || 0);
    const chiaActual = Number(form.sections.chiaSuat.distributedActual || 0);
    const shortage = chiaPlan > chiaActual ? chiaPlan - chiaActual : 0;
    const delayMinutes = Number(form.sections.phucVu.delayMinutes || 0);

    return {
      overallTone,
      overallLabel,
      issueSectionCount: issueSections.length,
      complaints,
      warnings,
      topSource,
      shortage,
      delayMinutes,
      opsScore,
    };
  }, [form.sections, form.header, execView, isKitchenMode, isWarehouseAccountingMode, isProcurementMode]);

  const handleHeaderChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        [key]: value,
      },
    }));
    setErrors((prev) => {
      if (!prev.header) return prev;
      return {
        ...prev,
        header: { ...prev.header, [key]: undefined },
      };
    });
  };

  const handleSectionChange = (sectionKey, fieldKey, value) => {
    setForm((prev) => {
      const current = prev.sections[sectionKey];
      let nextSection = { ...current, [fieldKey]: value };

      if (fieldKey === "hasIssue" && value === false) {
        nextSection.issueTitle = "";
        nextSection.issueDetail = "";
        nextSection.cause = "";
        nextSection.issueSource = "";
        nextSection.responsibility = "";
        nextSection.issueType = "";
        nextSection.impactLevel = "";
        nextSection.actionTaken = "";
        nextSection.issueOwner = "";
        nextSection.issueDeadline = "";
        nextSection.issueResult = "";
        if (sectionKey === "bepChayHangPhatSinh") {
          nextSection.chayHangRows = defaultChayHangRows();
        }
        if (sectionKey.startsWith("wh")) {
          nextSection.issueRows = defaultWhIssueRows();
        }
        if (sectionKey.startsWith("pm")) {
          nextSection.costRows = defaultPmCostRows();
        }
      }

      if (sectionKey === "bepChayHangPhatSinh") {
        nextSection = syncChayHangDerivedSection(nextSection);
        nextSection = syncSectionStatusFromIssue(nextSection);
      } else if (sectionKey.startsWith("wh")) {
        nextSection = syncWarehouseAccountingSection(nextSection, sectionKey, prev.header.reportDate || "");
      } else if (sectionKey.startsWith("pm")) {
        nextSection = syncProcurementSection(nextSection, sectionKey);
      } else {
        nextSection = syncSectionStatusFromIssue(nextSection);
      }

      return {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionKey]: nextSection,
        },
      };
    });

    setErrors((prev) => {
      const clone = { ...prev };
      if (clone[sectionKey]) {
        clone[sectionKey] = { ...clone[sectionKey], [fieldKey]: undefined };
      }
      return clone;
    });
  };

  const validateForm = (currentForm = form) => {
    const nextErrors = {};
    const vagueBody = /\b(bị lỗi|không ổn)\b/i;

    const kitchenFieldQuality = (val) => {
      const s = String(val || "").trim();
      if (!s) return null;
      if (vagueBody.test(s)) return "Không mô tả chung chung; phải có số (suất / món / phút).";
      if (!/\d/.test(s)) return "Phải ghi số liệu cụ thể (ví dụ: thiếu 20 suất, trễ 8 phút).";
      return null;
    };

    if (!currentForm.header.reportDate) nextErrors.header = { ...(nextErrors.header || {}), reportDate: "Chưa chọn ngày." };
    if (!currentForm.header.site) nextErrors.header = { ...(nextErrors.header || {}), site: "Chưa nhập khu vực." };
    if (!currentForm.header.kitchen?.trim()) nextErrors.header = { ...(nextErrors.header || {}), kitchen: "Chưa nhập bộ phận." };
    if (!currentForm.header.manager?.trim()) nextErrors.header = { ...(nextErrors.header || {}), manager: "Chưa nhập họ và tên." };

    Object.entries(currentForm.sections).forEach(([key, section]) => {
      const sectionErrors = {};

      if (section.hasIssue) {
        if (key === "bepChayHangPhatSinh") {
          const plan = Math.max(0, Number(currentForm.header.plannedMeals || 0));
          if (plan <= 0) {
            nextErrors.header = {
              ...(nextErrors.header || {}),
              plannedMeals: "Bắt buộc nhập kế hoạch suất (header) > 0 để tính % phát sinh.",
            };
          }
          const rows = section.chayHangRows || defaultChayHangRows();
          let totalQty = 0;
          const rowErrs = [];
          rows.forEach((row, idx) => {
            const any =
              String(row.dish || "").trim() ||
              String(row.qty || "").trim() ||
              String(row.reason || "").trim() ||
              String(row.time || "").trim() ||
              String(row.owner || "").trim() ||
              String(row.result || "").trim();
            if (!any) return;
            const er = {};
            if (!String(row.dish || "").trim()) er.dish = "Bắt buộc.";
            const qn = Number(String(row.qty).replace(",", "."));
            if (!Number.isFinite(qn) || qn <= 0) er.qty = "Số suất > 0.";
            if (!String(row.reason || "").trim()) er.reason = "Chọn lý do.";
            else if (!CHAY_HANG_REASON_OPTIONS.includes(row.reason)) er.reason = "Lý do không hợp lệ.";
            if (!String(row.time || "").trim()) er.time = "Ghi thời gian (phút hoặc giờ).";
            if (!String(row.owner || "").trim()) er.owner = "Ghi phụ trách.";
            if (Object.keys(er).length) rowErrs[idx] = er;
            if (Number.isFinite(qn) && qn > 0) totalQty += qn;
          });
          if (totalQty <= 0) {
            sectionErrors.chayHangRows = sectionErrors.chayHangRows || "Cần ít nhất 1 dòng có số suất phát sinh > 0.";
          }
          if (rowErrs.length) sectionErrors.chayHangRowErrors = rowErrs;
          if (!section.impactLevel) sectionErrors.impactLevel = "Bắt buộc chọn mức độ.";
        } else if (key.startsWith("wh")) {
          const vagueWh = /\b(hàng lỗi|không ổn)\b/i;
          const rows = section.issueRows || defaultWhIssueRows();
          const rowErrs = [];
          let hasAny = false;
          rows.forEach((row, idx) => {
            if (!warehouseRowHasContent(row)) return;
            hasAny = true;
            const er = {};
            if (!String(row.problem || "").trim()) er.problem = "Bắt buộc.";
            const qn = parseFloat(String(row.qty).replace(",", "."));
            if (!Number.isFinite(qn) || qn <= 0) er.qty = "Nhập số lượng > 0 (kg / thùng).";
            if (WH_HSD_KEYS.has(key) && !String(row.expiryDate || "").trim()) {
              er.expiryDate = "Bắt buộc cho mục HSD.";
            }
            if (!String(row.impact || "").trim()) er.impact = "Bắt buộc (trễ / thiếu suất…).";
            const combo = `${row.problem} ${row.impact}`;
            if (vagueWh.test(combo)) {
              er.problem = "Không dùng mô tả chung chung (hàng lỗi / không ổn).";
            }
            if (!/\d/.test(combo)) {
              er.impact = "Phải có số liệu (kg, thùng, suất…).";
            }
            if (Object.keys(er).length) rowErrs[idx] = er;
          });
          if (!hasAny) {
            sectionErrors.issueRows = "Có phát sinh — bắt buộc nhập ít nhất 1 dòng chi tiết.";
          }
          if (rowErrs.length) sectionErrors.warehouseRowErrors = rowErrs;
          if (!section.impactLevel) sectionErrors.impactLevel = "Bắt buộc chọn mức độ.";
        } else if (key.startsWith("pm")) {
          const rows = section.costRows || defaultPmCostRows();
          const rowErrs = [];
          let hasAny = false;
          rows.forEach((row, idx) => {
            if (!pmRowHasContent(row)) return;
            hasAny = true;
            const er = {};
            const q = pmNum(row.qty);
            const u = pmNum(row.unitPrice);
            if (!Number.isFinite(q) || q < 0) er.qty = "Số lượng phải là số >= 0.";
            if (!Number.isFinite(u) || u < 0) er.unitPrice = "Đơn giá phải là số >= 0.";
            if (!String(row.impact || "").trim()) er.impact = "Bắt buộc nhập nguyên nhân/ảnh hưởng.";
            if (!String(row.source || "").trim()) er.source = "Bắt buộc chọn nguồn phát sinh.";
            if (row.costType && !PM_COST_TYPE_OPTIONS.some((x) => x.value === row.costType)) er.costType = "Loại chi phí không hợp lệ.";
            if (row.source && !PM_SOURCE_OPTIONS.includes(row.source)) er.source = "Nguồn phát sinh không hợp lệ.";
            if ((key === "pmGiaTangBatThuong" || key === "pmNccDoiGiaDotXuat" || key === "pmGiaGiamAnhHuongChatLuong") && !/%/.test(String(row.content || ""))) {
              er.content = "Nhóm biến động giá phải ghi giá cũ → giá mới → % thay đổi.";
            }
            if (Object.keys(er).length) rowErrs[idx] = er;
          });
          if (!hasAny) sectionErrors.costRows = "Có phát sinh — bắt buộc nhập ít nhất 1 dòng chi phí.";
          if (rowErrs.length) sectionErrors.procurementRowErrors = rowErrs;
          if (!section.impactLevel) sectionErrors.impactLevel = "Bắt buộc chọn mức độ.";
        } else {
          if (!section.issueTitle?.trim()) sectionErrors.issueTitle = "Bắt buộc nhập nội dung phát sinh.";
          if (!section.cause?.trim()) sectionErrors.cause = "Bắt buộc nhập nguyên nhân.";
          if (!section.issueSource) sectionErrors.issueSource = "Bắt buộc chọn nguồn lỗi.";
          if (!section.responsibility) sectionErrors.responsibility = "Bắt buộc chọn trách nhiệm.";
          if (!section.impactLevel) sectionErrors.impactLevel = "Bắt buộc chọn mức độ.";
          if (!section.actionTaken?.trim()) sectionErrors.actionTaken = "Bắt buộc nhập hành động xử lý.";
          if (isKitchenMode && key.startsWith("bep")) {
            const eTitle = kitchenFieldQuality(section.issueTitle);
            if (eTitle) sectionErrors.issueTitle = eTitle;
            const eCause = kitchenFieldQuality(section.cause);
            if (eCause) sectionErrors.cause = eCause;
            const eAct = kitchenFieldQuality(section.actionTaken);
            if (eAct) sectionErrors.actionTaken = eAct;
          }
        }
      }

      if (Object.keys(sectionErrors).length > 0) nextErrors[key] = sectionErrors;
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = (mode = "draft") => {
    const normalized = normalizeFormSnapshot(form);
    const withExecutive = mergeAutoExecutiveIntoForm(normalized, computeOpsForForm(normalized));

    const isValid = validateForm(withExecutive);
    if (!isValid) {
      setSaveMessage("Chưa lưu được. Vui lòng kiểm tra lại các mục đang báo đỏ.");
      return;
    }

    setForm(withExecutive);

    try {
      localStorage.setItem(saveKey, JSON.stringify(withExecutive));
      setPersistedSig(JSON.stringify(normalizeFormSnapshot(withExecutive)));
      setSaveMessage(mode === "done" ? "Đã hoàn tất báo cáo ngày." : "Đã lưu nháp báo cáo.");
    } catch (error) {
      console.error("Lưu báo cáo lỗi:", error);
      setSaveMessage("Lưu lỗi. Kiểm tra lại localStorage hoặc trình duyệt.");
    }
  };

  const resetCurrent = () => {
    const keepHeader = form.header;
    const next = createDefaultForm();
    next.header = { ...next.header, ...keepHeader };
    setForm(next);
    setPersistedSig(JSON.stringify(normalizeFormSnapshot(mergeAutoExecutiveIntoForm(next, computeOpsForForm(next)))));
    setErrors({});
    setSaveMessage("Đã làm mới form của ngày hiện tại.");
  };

  const wrapperStyle = {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: 24,
    boxSizing: "border-box",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#111827",
  };

  const panelStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 1px 2px rgba(17, 24, 39, 0.06), 0 1px 3px rgba(17, 24, 39, 0.04)",
    overflow: "hidden",
  };

  const hasRiskSummary = isWarehouseAccountingMode
    ? warehouseAnyIssue(form.sections) || execView.warehouseHsdAgg.assess !== "OK"
    : isProcurementMode
      ? (execView.procurementStats?.todayTotal || 0) > 0
    : summary.complaints > 0 ||
        summary.warnings.length > 0 ||
        summary.issueSectionCount > 0 ||
        (summary.topSource && summary.topSource !== "Không có");

  return (
    <div style={wrapperStyle}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div className="report-dash-shell" style={{ ...panelStyle, marginBottom: 16 }}>
          <div className="report-dash-hero">
            <div className="report-dash-hero-grid">
              <div className="report-dash-hero-left">
                <div className="report-dash-eyebrow">Sky Catering · Vận hành bếp</div>
                <h1 className="report-dash-title">
                  {isKitchenMode
                    ? "Báo cáo ngày — Bộ phận Bếp"
                    : isWarehouseAccountingMode
                      ? "Báo cáo ngày — Kế toán kho"
                      : isProcurementMode
                        ? "Báo cáo ngày — Kế toán sản xuất"
                      : "Báo cáo công việc hằng ngày"}
                </h1>
                {isWarehouseAccountingMode && warehouseKitchenPriority ? (
                  <div
                    style={{
                      marginTop: 8,
                      marginBottom: 4,
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "#fff7ed",
                      border: "1px solid #fdba74",
                      color: "#9a3412",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ Ưu tiên sử dụng cho bếp
                  </div>
                ) : null}

                <div className="report-dash-field">
                  <span className="report-dash-field-label">
                    Khu vực / Bếp-site <span className="report-dash-req">*</span>
                  </span>
                  <select
                    className="report-dash-select report-dash-input--hero"
                    value={form.header.site}
                    onChange={(e) => handleHeaderChange("site", e.target.value)}
                    aria-label="Khu vực và bếp site theo danh mục"
                  >
                    <option value="">— Chọn từ danh mục —</option>
                    {siteOptionsWithLegacy.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {errors.header?.site ? <div className="report-dash-field-error">{errors.header.site}</div> : null}
                </div>

                <div className="report-dash-row-2">
                  <div className="report-dash-field">
                    <span className="report-dash-field-label">
                      Ngày báo cáo <span className="report-dash-req">*</span>
                    </span>
                    <input
                      className="report-dash-input"
                      type="date"
                      value={form.header.reportDate}
                      onChange={(e) => handleHeaderChange("reportDate", e.target.value)}
                      aria-label="Ngày báo cáo"
                    />
                    {errors.header?.reportDate ? (
                      <div className="report-dash-field-error">{errors.header.reportDate}</div>
                    ) : null}
                  </div>
                  <div className="report-dash-field">
                    <span className="report-dash-field-label">Ca làm việc</span>
                    <select
                      className="report-dash-select"
                      value={form.header.shift}
                      onChange={(e) => handleHeaderChange("shift", e.target.value)}
                    >
                      {shiftNameOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="report-dash-row-2">
                  <div className="report-dash-field">
                    <span className="report-dash-field-label">
                      Bộ phận <span className="report-dash-req">*</span>
                    </span>
                    <select
                      className="report-dash-select"
                      value={form.header.kitchen}
                      onChange={(e) => handleHeaderChange("kitchen", e.target.value)}
                      aria-label="Bộ phận"
                    >
                      <option value="">— Chọn bộ phận —</option>
                      {kitchenOptionsWithLegacy.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {errors.header?.kitchen ? (
                      <div className="report-dash-field-error">{errors.header.kitchen}</div>
                    ) : null}
                  </div>
                  <div className="report-dash-field">
                    <span className="report-dash-field-label">
                      Họ và tên <span className="report-dash-req">*</span>
                    </span>
                    <input
                      className="report-dash-input"
                      type="text"
                      value={form.header.manager}
                      onChange={(e) => handleHeaderChange("manager", e.target.value)}
                      placeholder="Người lập báo cáo"
                      aria-label="Họ và tên"
                    />
                    {errors.header?.manager ? (
                      <div className="report-dash-field-error">{errors.header.manager}</div>
                    ) : null}
                  </div>
                </div>

                {isKitchenMode ? (
                  <div className="report-dash-row-2">
                    <div className="report-dash-field">
                      <span className="report-dash-field-label">
                        Kế hoạch suất (tổng) <span className="report-dash-req">*</span>
                      </span>
                      <input
                        className="report-dash-input"
                        type="number"
                        min="0"
                        value={form.header.plannedMeals}
                        onChange={(e) => handleHeaderChange("plannedMeals", e.target.value)}
                        placeholder="0"
                        aria-label="Kế hoạch suất tổng"
                      />
                      {errors.header?.plannedMeals ? (
                        <div className="report-dash-field-error">{errors.header.plannedMeals}</div>
                      ) : null}
                    </div>
                    <div className="report-dash-field">
                      <span className="report-dash-field-label">Suất thực tế (header)</span>
                      <input
                        className="report-dash-input"
                        type="number"
                        min="0"
                        value={form.header.actualMeals}
                        onChange={(e) => handleHeaderChange("actualMeals", e.target.value)}
                        placeholder="0"
                        aria-label="Suất thực tế"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="report-dash-kpi" aria-label="Điểm vận hành">
                <table className="report-ds-kpi-table">
                  <tbody>
                    <tr>
                      <th scope="row">Điểm vận hành</th>
                      <td>
                        <span className="report-ds-kpi-score">{summary.opsScore.score}</span>
                        <span className="report-ds-kpi-grade">— {summary.overallLabel}</span>
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Tổng hợp</th>
                      <td className="report-ds-kpi-meta">
                        {isWarehouseAccountingMode ? (
                          <>
                            {summary.issueSectionCount} hạng mục có phát sinh · HSD: {execView.warehouseHsdAgg.assess} ·{" "}
                            {summary.warnings.length} cảnh báo KPI
                          </>
                        ) : isProcurementMode ? (
                          <>
                            Tổng: {formatCurrencyVnd(execView.procurementStats.todayTotal)} · So hôm qua:{" "}
                            {execView.procurementStats.diff >= 0 ? "+" : ""}
                            {formatCurrencyVnd(execView.procurementStats.diff)} · {summary.warnings.length} cảnh báo tài chính
                          </>
                        ) : (
                          <>
                            {summary.issueSectionCount} phát sinh có nhập · {summary.complaints} phản ánh ·{" "}
                            {summary.warnings.length} cảnh báo rule
                          </>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </aside>
            </div>

            <div className="report-dash-toolbar report-toolbar-saas">
              <div className="report-toolbar-saas-even">
                <button
                  type="button"
                  className="report-toolbar-saas-primary"
                  onClick={() => handleSave("done")}
                  aria-label="Hoàn tất và lưu báo cáo"
                >
                  <span className="report-toolbar-saas-primary-main">
                    <span className="report-toolbar-saas-primary-icon" aria-hidden>
                      <ToolbarIconCheck />
                    </span>
                    <span className="report-toolbar-saas-primary-text">Báo cáo</span>
                  </span>
                  {showUnsavedBadge ? <span className="report-toolbar-saas-badge">Chưa lưu</span> : null}
                </button>
                <button type="button" className="report-toolbar-saas-ghost" onClick={() => handleSave("draft")}>
                  <span className="report-toolbar-saas-ghost-icon" aria-hidden>
                    <ToolbarIconSave />
                  </span>
                  <span>Lưu nháp</span>
                </button>
                <button type="button" className="report-toolbar-saas-ghost" onClick={resetCurrent}>
                  <span className="report-toolbar-saas-ghost-icon" aria-hidden>
                    <ToolbarIconRotateCcw />
                  </span>
                  <span>Làm mới</span>
                </button>
                <button
                  type="button"
                  className="report-toolbar-saas-ghost"
                  onClick={() => setSaveMessage("Lịch sử phiên bản: đang phát triển.")}
                >
                  <span className="report-toolbar-saas-ghost-icon" aria-hidden>
                    <ToolbarIconClock />
                  </span>
                  <span>Lịch sử</span>
                </button>
              </div>
              {saveMessage ? <div className="report-toolbar-saas-msg report-toolbar-saas-msg--below">{saveMessage}</div> : null}
            </div>
          </div>
        </div>

        <div className="report-premium-cards">
          <div className="report-premium-card">
            <div className="report-premium-card-label">Suất (header)</div>
            <table className="report-ds-metric-table">
              <tbody>
                <tr>
                  <th scope="row">Thực tế / kế hoạch</th>
                  <td>
                    {form.header.actualMeals || 0}/{form.header.plannedMeals || 0}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="report-premium-card-meta">
              {isWarehouseAccountingMode ? (
                <>Module kho chỉ ghi nhận vấn đề ảnh hưởng vận hành; không nhập số liệu vận hành thường ngày tại đây.</>
              ) : isProcurementMode ? (
                <>Chỉ ghi nhận chi phí phát sinh ngoài kế hoạch; thành tiền và tổng tiền được tính tự động theo thời gian thực.</>
              ) : summary.shortage > 0 ? (
                <>
                  Chênh lệch chia suất: thiếu <strong>{summary.shortage}</strong> suất so với kế hoạch nhập.
                </>
              ) : (
                <>Không phát sinh chênh lệch suất đáng chú ý theo dữ liệu chia suất.</>
              )}
            </p>
          </div>
          <div className="report-premium-card">
            <div className="report-premium-card-label">Theo dõi &amp; rủi ro</div>
            {hasRiskSummary ? (
              <>
                <table className="report-ds-metric-table">
                  <tbody>
                    {isProcurementMode ? (
                      <>
                        <tr>
                          <th scope="row">Tổng phát sinh hôm nay</th>
                          <td>{formatCurrencyVnd(execView.procurementStats.todayTotal)}</td>
                        </tr>
                        <tr>
                          <th scope="row">So với hôm qua</th>
                          <td>
                            {execView.procurementStats.diff >= 0 ? "+" : ""}
                            {formatCurrencyVnd(execView.procurementStats.diff)} ({execView.procurementStats.diffPct.toFixed(1)}%)
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">So với TB 7 ngày</th>
                          <td>
                            {execView.procurementStats.vs7Pct >= 0 ? "+" : ""}
                            {execView.procurementStats.vs7Pct.toFixed(1)}%
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <th scope="row">Phản ánh khách</th>
                          <td>{summary.complaints}</td>
                        </tr>
                        <tr>
                          <th scope="row">Cảnh báo rule</th>
                          <td>{summary.warnings.length}</td>
                        </tr>
                        <tr>
                          <th scope="row">Phát sinh có nhập</th>
                          <td>{summary.issueSectionCount}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                {isProcurementMode ? (
                  <p className="report-premium-card-meta report-premium-card-meta--tight">
                    Nguồn phát sinh lớn nhất:{" "}
                    <span className="report-premium-card-strong">
                      {execView.procurementStats.topSource[0]} ({execView.procurementStats.topSourcePct.toFixed(1)}%)
                    </span>
                  </p>
                ) : summary.topSource && summary.topSource !== "Không có" ? (
                  <p className="report-premium-card-meta report-premium-card-meta--tight">
                    Nguồn lỗi nổi bật: <span className="report-premium-card-strong">{summary.topSource}</span>
                  </p>
                ) : null}
                {summary.warnings.length > 0 ? (
                  <ul className="report-premium-warn-list">
                    {summary.warnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="report-premium-card-muted">
                {isProcurementMode ? "Không có chi phí phát sinh ngoài kế hoạch." : "Không có phản ánh, cảnh báo hay nguồn lỗi nổi bật."}
              </p>
            )}
          </div>
        </div>

        {activeSectionConfig.map((group) => (
          <div key={group.group} className="report-ds-stack">
            <div className="report-ds-group-head">
              <div className="report-ds-group-head-inner">
                <button
                  type="button"
                  className="report-group-toggle"
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [group.group]: !prev[group.group],
                    }))
                  }
                  aria-label={openGroups[group.group] ? "Thu gọn nhóm" : "Mở rộng nhóm"}
                >
                  {openGroups[group.group] ? "−" : "+"}
                </button>
                <div>
                  <div className="report-ds-group-code">NHÓM {group.group}</div>
                  <div className="report-ds-group-title">{group.groupTitle}</div>
                </div>
              </div>
            </div>

            {openGroups[group.group] ? (
              <div className="report-master-table-wrap report-day-erp">
                <table className="report-master-table">
                  <thead>
                    <tr>
                      <th className="col-expand">Expand</th>
                      <th className="col-item">Hạng mục</th>
                      <th>Phát sinh</th>
                      <th>Mức độ</th>
                      <th>Trách nhiệm</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <SectionCard
                        key={item.key}
                        title={item.title}
                        section={form.sections[item.key]}
                        expanded={!!openSections[item.key]}
                        onToggle={() =>
                          setOpenSections((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                        onSectionChange={(fieldKey, value) => handleSectionChange(item.key, fieldKey, value)}
                        errors={errors[item.key] || {}}
                        quickFields={item.quickFields || []}
                        detailVariant={item.detailVariant}
                        phatSinhExtra={
                          isKitchenMode && item.key === "bepChayHangPhatSinh" ? (
                            <ChayHangPhatSinhSummary header={form.header} section={form.sections.bepChayHangPhatSinh} />
                          ) : isWarehouseAccountingMode && WH_HSD_KEYS.has(item.key) ? (
                            warehouseHsdAutoIssueFromRows(form.sections[item.key], form.header.reportDate || "") ? (
                              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#c2410c" }}>
                                ⚠️ Ưu tiên sử dụng cho bếp
                              </div>
                            ) : null
                          ) : null
                        }
                        onChayHangRowsChange={
                          item.key === "bepChayHangPhatSinh"
                            ? (rows) => handleSectionChange("bepChayHangPhatSinh", "chayHangRows", rows)
                            : undefined
                        }
                        warehouseReportDate={form.header.reportDate || ""}
                        warehouseSectionKey={item.key}
                        onWarehouseIssueRowsChange={
                          item.detailVariant === "warehouseOps"
                            ? (rows) => handleSectionChange(item.key, "issueRows", rows)
                            : undefined
                        }
                        onProcurementCostRowsChange={
                          item.detailVariant === "procurementCost"
                            ? (rows) => handleSectionChange(item.key, "costRows", rows)
                            : undefined
                        }
                        isWarehouseAccountingMode={isWarehouseAccountingMode}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ))}

        <div className="report-ds-stack report-ds-stack--lg">
          <div className="report-ds-group-code">
            NHÓM {isKitchenMode || isWarehouseAccountingMode || isProcurementMode ? "H" : isServiceMode ? "F" : "D"}
          </div>
          <div className="report-ds-group-title">
            {isKitchenMode || isWarehouseAccountingMode || isProcurementMode
              ? "Tổng kết (tự động)"
              : isServiceMode
                ? "Tổng kết (tự động)"
                : "Chấm điểm vận hành ngày (tự động)"}
          </div>
          <p className="report-ds-lead">
            {isKitchenMode ? (
              <>
                Điểm khởi đầu <strong>100</strong>, hệ thống tự trừ theo rule bếp (thiếu suất, lỗi món, trễ tiến độ, chạy
                hàng % so kế hoạch, thiết bị, ATVSTP bếp, thiếu hành động xử lý). <strong>Không nhập tay điểm</strong> — chỉ
                đọc kết quả. Xếp loại: 90–100 Xuất sắc; 80–89 Đạt; 65–79 Cần chú ý; dưới 65 Không đạt.
              </>
            ) : isWarehouseAccountingMode ? (
              <>
                Điểm khởi đầu <strong>100</strong>, hệ thống tự trừ theo số hạng mục kho có phát sinh, mức độ HSD (gần hết
                hạn / quá hạn) và thiếu nội dung xử lý ghi nhận. <strong>Không nhập tay điểm</strong> — chỉ đọc kết quả.
                Xếp loại: 90–100 Xuất sắc; 80–89 Đạt; 65–79 Cần chú ý; dưới 65 Không đạt.
              </>
            ) : isProcurementMode ? (
              <>
                Điểm khởi đầu <strong>100</strong>, hệ thống tự trừ theo tổng chi phí phát sinh ngoài kế hoạch, xu hướng tăng
                so với hôm qua và trung bình 7 ngày, cùng các mục thiếu hướng xử lý. <strong>Không nhập tay điểm</strong> —
                chỉ đọc kết quả cảnh báo tài chính.
              </>
            ) : (
              <>
                Điểm khởi đầu <strong>100</strong>, hệ thống tự trừ theo rule (thiếu suất, trễ phục vụ, phản ánh, lỗi chế biến,
                ATVSTP, thiết bị, thiếu hành động xử lý khi có phát sinh). <strong>Không nhập tay điểm</strong> — chỉ đọc kết
                quả. Xếp loại: 90–100 Xuất sắc; 80–89 Đạt; 65–79 Cần chú ý; dưới 65 Không đạt.
              </>
            )}
          </p>

          <div className="report-master-table-wrap report-day-erp">
            <table className="report-master-table">
              <thead>
                <tr>
                  <th className="col-expand">Expand</th>
                  <th className="col-item">Hạng mục</th>
                  <th>Phát sinh</th>
                  <th>Mức độ</th>
                  <th>Trách nhiệm</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                <tr className={`report-master-row tone-${toneClassFromOpsGrade(execView.opsScore.grade.key)}`}>
                  <td className="report-cell report-cell-expand">
                    <button
                      type="button"
                      className="report-expand-btn"
                      onClick={() => setOpenSections((prev) => ({ ...prev, kpiDay: !prev.kpiDay }))}
                    >
                      {openSections.kpiDay ? "−" : "+"}
                    </button>
                  </td>
                  <td className="report-cell report-cell-item">
                    {isKitchenMode
                      ? "32. KPI bếp (tự động)"
                      : isWarehouseAccountingMode
                        ? "19. KPI kho (tự động)"
                        : isProcurementMode
                          ? "15. KPI tài chính (tự động)"
                        : isServiceMode
                          ? "21. KPI ngày (tự động)"
                          : "10. KPI ngày (tự động)"}
                  </td>
                  <td className="report-cell">
                    <input className="report-input" type="text" readOnly value="Không phát sinh" />
                  </td>
                  <td className="report-cell">
                    <input className="report-input" type="text" readOnly value={execView.opsScore.grade.label} />
                  </td>
                  <td className="report-cell">
                    <input className="report-input" type="text" readOnly value={execView.autoManager.mainResponsibility || "—"} />
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={
                        isKitchenMode
                          ? `Điểm ${execView.opsScore.score} · Chạy hàng: ${
                              execView.opsScore.chayHangPctText || "0 suất (0.0%)"
                            } · Thiếu suất (rule): ${labelThieuSuatCoKhong(execView.autoMetrics.enoughMeals)} · Trễ (rule): ${labelYesNo(
                              execView.autoMetrics.onTime
                            )} · ATVSTP: ${labelAtvstpResult(execView.autoMetrics.atvstpResult)}`
                          : isWarehouseAccountingMode
                            ? `Điểm ${execView.opsScore.score} · HSD gần hết hạn: ${execView.warehouseHsdAgg.nearSkus} · Quá hạn: ${
                                execView.warehouseHsdAgg.overdueSkus
                              } · Đánh giá HSD: ${execView.warehouseHsdAgg.assess}`
                            : isProcurementMode
                              ? `Tổng phát sinh: ${formatCurrencyVnd(execView.procurementStats.todayTotal)} · So hôm qua: ${
                                  execView.procurementStats.diff >= 0 ? "+" : ""
                                }${formatCurrencyVnd(execView.procurementStats.diff)} · So TB7: ${execView.procurementStats.vs7Pct.toFixed(1)}%`
                            : `${
                                summary.topSource && summary.topSource !== "Không có" ? `${summary.topSource} · ` : ""
                              }Điểm ${execView.opsScore.score} · Thiếu suất: ${labelThieuSuatCoKhong(
                                execView.autoMetrics.enoughMeals
                              )} · Đúng giờ: ${labelYesNo(execView.autoMetrics.onTime)} · PA: ${execView.opsScore.complaintN}`
                      }
                    />
                  </td>
                </tr>
                {openSections.kpiDay ? (
                  <tr className="report-detail-row">
                    <td className="report-cell" colSpan={6}>
                      <table className="report-detail-table">
                        <thead>
                          <tr>
                            <th>Chỉ số</th>
                            <th>Kết quả</th>
                            <th>Điểm trừ</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(isKitchenMode
                            ? buildKitchenKpiRows
                            : isWarehouseAccountingMode
                              ? buildWarehouseKpiRows
                              : isProcurementMode
                                ? () => [
                                    {
                                      metric: "Tổng phát sinh hôm nay",
                                      result: formatCurrencyVnd(execView.procurementStats.todayTotal),
                                      deduct: "—",
                                      note: "Tự cộng từ tất cả dòng chi phí",
                                    },
                                    {
                                      metric: "So với hôm qua",
                                      result: `${execView.procurementStats.diff >= 0 ? "+" : ""}${formatCurrencyVnd(execView.procurementStats.diff)} (${execView.procurementStats.diffPct.toFixed(1)}%)`,
                                      deduct: "Theo ngưỡng",
                                      note: "Đọc từ dữ liệu đã lưu cùng khu vực/ca",
                                    },
                                    {
                                      metric: "So với trung bình 7 ngày",
                                      result: `${execView.procurementStats.vs7Pct >= 0 ? "+" : ""}${execView.procurementStats.vs7Pct.toFixed(1)}%`,
                                      deduct: execView.procurementStats.vs7Pct > 50 ? "20" : execView.procurementStats.vs7Pct > 20 ? "10" : "0",
                                      note: "Ngưỡng cảnh báo >20%, nghiêm trọng >50%",
                                    },
                                  ]
                              : buildDGroupKpiRows)(execView.opsScore).map((row) => (
                            <tr key={row.metric}>
                              <td>{row.metric}</td>
                              <td>
                                <input className="report-input" type="text" readOnly value={row.result} />
                              </td>
                              <td>
                                <input className="report-input" type="text" readOnly value={row.deduct} />
                              </td>
                              <td>
                                <input className="report-input" type="text" readOnly value={row.note} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}

                <tr className={`report-master-row ${execView.opsScore.deductions.length > 0 ? "tone-warning is-issue" : "tone-ok"}`}>
                  <td className="report-cell report-cell-expand">
                    <button
                      type="button"
                      className="report-expand-btn"
                      disabled={execView.opsScore.deductions.length === 0}
                      onClick={() => setOpenSections((prev) => ({ ...prev, autoWarnings: !prev.autoWarnings }))}
                      aria-label={
                        execView.opsScore.deductions.length === 0
                          ? "Không có cảnh báo tự sinh"
                          : openSections.autoWarnings
                            ? "Thu gọn cảnh báo"
                            : "Mở rộng cảnh báo"
                      }
                    >
                      {openSections.autoWarnings ? "−" : "+"}
                    </button>
                  </td>
                  <td className="report-cell report-cell-item">
                    {isKitchenMode
                      ? "33. Cảnh báo (tự động)"
                      : isWarehouseAccountingMode
                        ? "20. Cảnh báo (tự động)"
                        : isProcurementMode
                          ? "16. Cảnh báo tài chính (tự động)"
                        : isServiceMode
                          ? "22. Cảnh báo (tự động)"
                          : "11. Cảnh báo tự sinh"}
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={execView.opsScore.deductions.length > 0 ? "Có phát sinh" : "Không phát sinh"}
                    />
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={
                        execView.opsScore.deductions.length === 0
                          ? "—"
                          : levelLabelFromDeductionPoints(
                              Math.max(...execView.opsScore.deductions.map((d) => d.points))
                            )
                      }
                    />
                  </td>
                  <td className="report-cell">
                    <input className="report-input" type="text" readOnly value="—" />
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={
                        execView.opsScore.deductions.length > 0
                          ? isWarehouseAccountingMode
                            ? `${execView.opsScore.deductions.length} rule kho · Trừ ${100 - execView.opsScore.score}đ`
                            : isProcurementMode
                              ? `${execView.opsScore.deductions.length} rule tài chính · Trừ ${100 - execView.opsScore.score}đ`
                            : `${summary.topSource && summary.topSource !== "Không có" ? `${summary.topSource} · ` : ""}${
                                execView.opsScore.deductions.length
                              } rule · Trừ ${100 - execView.opsScore.score}đ`
                          : "Không kích hoạt rule"
                      }
                    />
                  </td>
                </tr>
                {openSections.autoWarnings && execView.opsScore.deductions.length > 0 ? (
                  <tr className="report-detail-row">
                    <td className="report-cell" colSpan={6}>
                      <table className="report-detail-table">
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Cảnh báo</th>
                            <th>Rule kích hoạt</th>
                            <th>Mức độ</th>
                            <th>Hành động yêu cầu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buildDGroupWarningRows(execView.opsScore).map((row) => (
                            <tr key={`${row.stt}-${row.alert}`}>
                              <td>{row.stt}</td>
                              <td>
                                <input className="report-input" type="text" readOnly value={row.alert} />
                              </td>
                              <td>
                                <input className="report-input" type="text" readOnly value={row.rule} />
                              </td>
                              <td>
                                <input className="report-input" type="text" readOnly value={row.level} />
                              </td>
                              <td>
                                <textarea className="report-textarea" rows={2} readOnly value={row.action} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}

                <tr className={`report-master-row tone-${toneClassFromOpsGrade(execView.opsScore.grade.key)}`}>
                  <td className="report-cell report-cell-expand">
                    <button
                      type="button"
                      className="report-expand-btn"
                      onClick={() =>
                        setOpenSections((prev) => ({ ...prev, managerSummary: !prev.managerSummary }))
                      }
                    >
                      {openSections.managerSummary ? "−" : "+"}
                    </button>
                  </td>
                  <td className="report-cell report-cell-item">
                    {isKitchenMode
                      ? "34. Tổng kết ca (tự động)"
                      : isWarehouseAccountingMode
                        ? "21. Tổng kết kho (tự động)"
                        : isProcurementMode
                          ? "17. Tổng kết tài chính (tự động)"
                        : isServiceMode
                          ? "23. Tổng kết ca (tự động)"
                          : "12. Tổng kết quản lý (tự động)"}
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={
                        isWarehouseAccountingMode
                          ? warehouseAnyIssue(form.sections)
                            ? "Có vấn đề"
                            : "Không vấn đề"
                          : isProcurementMode
                            ? execView.procurementStats.todayTotal > 0
                              ? "Có phát sinh"
                              : "Không phát sinh"
                          : summary.issueSectionCount > 0
                            ? "Có phát sinh"
                            : "Không phát sinh"
                      }
                    />
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={
                        isWarehouseAccountingMode
                          ? execView.warehouseHsdAgg.assess === "Nghiêm trọng"
                            ? "Nghiêm trọng"
                            : execView.warehouseHsdAgg.assess === "Cảnh báo"
                              ? "Cảnh báo"
                              : warehouseAnyIssue(form.sections)
                                ? "Trung bình"
                                : "OK"
                          : isProcurementMode
                            ? execView.procurementStats.severity
                          : execView.opsScore.grade.label
                      }
                    />
                  </td>
                  <td className="report-cell">
                    <input className="report-input" type="text" readOnly value={execView.autoManager.mainResponsibility || "—"} />
                  </td>
                  <td className="report-cell">
                    <input
                      className="report-input"
                      type="text"
                      readOnly
                      value={
                        isWarehouseAccountingMode
                          ? `${execView.warehouseHsdAgg.nearSkus} gần hết hạn · ${execView.warehouseHsdAgg.overdueSkus} quá hạn · SL xử lý ~${
                              execView.warehouseHsdAgg.totalQty > 0 ? execView.warehouseHsdAgg.totalQty.toFixed(1) : "0"
                            }`
                          : isProcurementMode
                            ? `Tổng ${formatCurrencyVnd(execView.procurementStats.todayTotal)} · Nguồn lớn nhất: ${
                                execView.procurementStats.topSource[0]
                              } (${execView.procurementStats.topSourcePct.toFixed(1)}%)`
                          : `${
                              summary.topSource && summary.topSource !== "Không có" ? `${summary.topSource} · ` : ""
                            }${execView.autoManager.generalComment || ""}`
                      }
                    />
                  </td>
                </tr>
                {openSections.managerSummary ? (
                  <tr className="report-detail-row">
                    <td className="report-cell" colSpan={6}>
                      <table className="report-detail-table">
                        <thead>
                          <tr>
                            <th>Đánh giá ngày</th>
                            <th>Lỗi chính</th>
                            <th>Trách nhiệm chính</th>
                            <th>Hành động ngày mai</th>
                            <th>Nhận định</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <input
                                className="report-input"
                                type="text"
                                readOnly
                                value={
                                  isWarehouseAccountingMode
                                    ? `${warehouseAnyIssue(form.sections) ? "Có vấn đề" : "Không vấn đề"} — HSD: ${
                                        execView.warehouseHsdAgg.assess
                                      } — Điểm ${execView.opsScore.score}`
                                    : isProcurementMode
                                      ? `${execView.procurementStats.severity} — ${formatCurrencyVnd(
                                          execView.procurementStats.todayTotal
                                        )} — Điểm ${execView.opsScore.score}`
                                    : `${execView.opsScore.score} — ${execView.opsScore.grade.label}`
                                }
                              />
                            </td>
                            <td>
                              <textarea className="report-textarea" rows={4} readOnly value={execView.autoManager.mainIssues} />
                            </td>
                            <td>
                              <input className="report-input" type="text" readOnly value={execView.autoManager.mainResponsibility || "—"} />
                            </td>
                            <td>
                              <textarea className="report-textarea" rows={4} readOnly value={execView.autoManager.nextDayAction} />
                            </td>
                            <td>
                              <textarea className="report-textarea" rows={4} readOnly value={execView.briefAssessment} />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {isKitchenMode && kitchenFooterStats ? (
            <div className="report-premium-cards" style={{ marginTop: 12 }}>
              <div className="report-premium-card" style={{ gridColumn: "1 / -1" }}>
                <div className="report-premium-card-label">TỔNG HỢP PHÁT SINH TRONG NGÀY</div>
                <table className="report-ds-metric-table">
                  <tbody>
                    <tr>
                      <th scope="row">Tổng suất kế hoạch (header)</th>
                      <td>{kitchenFooterStats.plan}</td>
                    </tr>
                    <tr>
                      <th scope="row">Tổng suất phát sinh (chạy hàng)</th>
                      <td>{kitchenFooterStats.rush}</td>
                    </tr>
                    <tr>
                      <th scope="row">% phát sinh</th>
                      <td>{kitchenFooterStats.pct.toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <th scope="row">Đánh giá</th>
                      <td>{kitchenFooterStats.assess}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="report-premium-card-meta">Tự động từ mục 17 và kế hoạch header; không nhập tay.</p>
              </div>
            </div>
          ) : null}

          {isWarehouseAccountingMode ? (
            <div className="report-premium-cards" style={{ marginTop: 12 }}>
              <div className="report-premium-card" style={{ gridColumn: "1 / -1" }}>
                <div className="report-premium-card-label">TỔNG HỢP HSD</div>
                <table className="report-ds-metric-table">
                  <tbody>
                    <tr>
                      <th scope="row">Số mặt hàng gần hết hạn (1–3 ngày)</th>
                      <td>{execView.warehouseHsdAgg.nearSkus}</td>
                    </tr>
                    <tr>
                      <th scope="row">Số mặt hàng quá hạn (≤0 ngày)</th>
                      <td>{execView.warehouseHsdAgg.overdueSkus}</td>
                    </tr>
                    <tr>
                      <th scope="row">Tổng số lượng cần xử lý (ước lượng)</th>
                      <td>
                        {execView.warehouseHsdAgg.totalQty > 0 ? execView.warehouseHsdAgg.totalQty.toFixed(1) : "—"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Đánh giá</th>
                      <td>
                        {execView.warehouseHsdAgg.assess === "OK"
                          ? "OK"
                          : execView.warehouseHsdAgg.assess === "Cảnh báo"
                            ? "Cảnh báo"
                            : "Nghiêm trọng"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="report-premium-card-meta">
                  Tự động từ các mục HSD (Nhóm D) và ngày báo cáo; tổng SL lấy từ dòng có HSD 1–3 ngày hoặc quá hạn.
                </p>
              </div>
            </div>
          ) : null}

          {isProcurementMode ? (
            <div className="report-premium-cards" style={{ marginTop: 12 }}>
              <div className="report-premium-card" style={{ gridColumn: "1 / -1" }}>
                <div className="report-premium-card-label">CẢNH BÁO TÀI CHÍNH</div>
                <table className="report-ds-metric-table">
                  <tbody>
                    <tr>
                      <th scope="row">Tổng phát sinh hôm nay</th>
                      <td>{formatCurrencyVnd(execView.procurementStats.todayTotal)}</td>
                    </tr>
                    <tr>
                      <th scope="row">So với hôm qua</th>
                      <td>
                        {execView.procurementStats.diff >= 0 ? "+" : ""}
                        {formatCurrencyVnd(execView.procurementStats.diff)} ({execView.procurementStats.diffPct.toFixed(1)}%)
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">So với trung bình 7 ngày</th>
                      <td>
                        {execView.procurementStats.vs7Pct >= 0 ? "+" : ""}
                        {execView.procurementStats.vs7Pct.toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Nguồn phát sinh lớn nhất</th>
                      <td>
                        {execView.procurementStats.topSource[0]} ({execView.procurementStats.topSourcePct.toFixed(1)}%)
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Nhóm chi phí lớn nhất</th>
                      <td>
                        Nhóm {execView.procurementStats.topGroup[0]} ({execView.procurementStats.topGroupPct.toFixed(1)}%)
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Mức độ</th>
                      <td>{execView.procurementStats.severity}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="report-premium-card-meta">
                  {execView.procurementStats.topGroup[0] === "C"
                    ? "Chi phí mua ngoài tăng cao → kiểm tra thiếu dụng cụ."
                    : execView.procurementStats.topSource[0] === "Bếp"
                      ? "Nguồn phát sinh chính từ Bếp → kiểm tra định lượng."
                      : execView.procurementStats.topSource[0] === "NCC"
                        ? "NCC gây phát sinh → xem xét đàm phán hoặc thay NCC."
                        : execView.procurementStats.todayTotal > 1000000
                          ? "Tổng phát sinh vượt ngưỡng → báo quản lý trong ngày."
                          : "Theo dõi và kiểm soát chi phí ngoài kế hoạch theo từng nguồn phát sinh."}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

