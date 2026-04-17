import React, { useMemo, useState, useEffect } from "react";
import {
  loadReportsFromCloud,
  getReportByDateFromCloud,
  upsertReportToCloud,
} from "./reportStore.js";
import { supabase } from "./supabase";

const STORAGE_KEY = "report_history";
const SERVICE_STORAGE_KEY = "service-report-v1";
const ACCOUNTING_STORAGE_KEY = "accounting-report-v1";
const WAREHOUSE_STORAGE_KEY = "warehouse-qc-report-v1";
const BEP_STORAGE_KEY = "bep-report-v1";

const ACCOUNTING_UNIT_DEFAULT = "Kế toán SX / Thu mua";
const WAREHOUSE_UNIT_DEFAULT = "Kho / QC";
const BEP_UNIT_DEFAULT = "Đội bếp";
const SERVICE_UNIT_DEFAULT = "Giám sát dịch vụ";

const GROUPS = [
  {
    id: "1",
    title: "NHẬP XUẤT HÀNG",
    items: [
      { code: "a", text: "Kiểm tra kỹ lưỡng số lượng và chất lượng hàng hóa khi nhập kho." },
      { code: "b", text: "Đối chiếu chính xác hóa đơn nhập xuất để đảm bảo không có sai sót." },
      { code: "c", text: "Rà soát, cập nhật, báo cáo hạng sử dụng." },
    ],
  },
  {
    id: "2",
    title: "SƠ CHẾ, CHẾ BIẾN",
    items: [
      { code: "a", text: "Kiểm tra nguyên liệu đầu vào và dự trù đủ lượng cần thiết." },
      { code: "b", text: "Tuân thủ nghiêm ngặt quy trình chế biến và đảm bảo tiến độ công việc." },
      { code: "c", text: "Vệ sinh khu vực chế biến sạch sẽ sau khi hoàn thành." },
      { code: "d", text: "Màu sắc, khẩu vị, hình thái thành phẩm." },
    ],
  },
  {
    id: "3",
    title: "CHIA HÀNG PHỤC VỤ",
    items: [
      { code: "a", text: "Phân chia thực phẩm theo dự trù và số lượng đã báo trước." },
      { code: "b", text: "Kiểm đếm số lượng đầy đủ để đảm bảo quá trình phục vụ diễn ra suôn sẻ." },
      { code: "c", text: "Công tác phục vụ, chia suất ổn định không phát sinh chạy hàng, dư hàng." },
    ],
  },
  {
    id: "4",
    title: "NHÂN SỰ VẬN HÀNH",
    items: [
      { code: "a", text: "Kiểm tra báo cáo họp giao ban, số lượng nhân sự làm việc trong từng ca." },
      { code: "b", text: "Ghi nhận và xử lý kịp thời các vấn đề liên quan đến nhân sự (nếu có)." },
    ],
  },
  {
    id: "5",
    title: "AN TOÀN CƠ SỞ",
    items: [
      { code: "a", text: "Kiểm tra việc sử dụng bảo hộ lao động của nhân viên." },
      { code: "b", text: "Đảm bảo khu vực làm việc tuân thủ nguyên tắc 5S." },
      { code: "c", text: "Kiểm tra các hạng mục PCCC và an ninh để đảm bảo an toàn." },
    ],
  },
  {
    id: "6",
    title: "HẠ TẦNG THIẾT BỊ",
    items: [
      { code: "a", text: "Kiểm tra tình trạng thiết bị, báo cáo ngay nếu có hỏng hóc." },
      { code: "b", text: "Thực hiện vệ sinh và bảo trì định kỳ để duy trì hoạt động hiệu quả." },
    ],
  },
  {
    id: "7",
    title: "PHẢN HỒI KHÁCH HÀNG",
    items: [
      { code: "a", text: "Tiếp nhận và xử lý kịp thời các phản hồi từ khách hàng." },
      { code: "b", text: "Đánh giá và cải thiện chất lượng dịch vụ dựa trên ý kiến khách hàng." },
    ],
  },
];

const ACCOUNTING_GROUPS = [
  {
    id: "KT1",
    displayId: "1",
    title: "KIỂM SOÁT GIÁ & NCC",
    items: [
      { code: "a", text: "Cập nhật bảng giá NCC trong ngày" },
      { code: "b", text: "So sánh giá NCC với ngày trước" },
      { code: "c", text: "Phát hiện mặt hàng tăng giá bất thường" },
      { code: "d", text: "Làm việc NCC nếu giá tăng >2%" },
      { code: "e", text: "Kiểm tra tính ổn định nguồn hàng NCC" },
      { code: "f", text: "Đánh giá chất lượng NCC (phối hợp kho/QC)" },
    ],
  },
  {
    id: "KT2",
    displayId: "2",
    title: "ĐẶT HÀNG & KẾ HOẠCH MUA",
    items: [
      { code: "a", text: "Kiểm tra dự trù nguyên liệu" },
      { code: "b", text: "Đối chiếu dự trù với tồn kho thực tế" },
      { code: "c", text: "Điều chỉnh số lượng đặt hàng hợp lý" },
      { code: "d", text: "Lên đơn đặt hàng theo ngày" },
      { code: "e", text: "Kiểm soát không đặt dư / thiếu" },
      { code: "f", text: "Xác nhận NCC giao đúng thời gian" },
    ],
  },
  {
    id: "KT3",
    displayId: "3",
    title: "KIỂM SOÁT CHI PHÍ NGUYÊN LIỆU",
    items: [
      { code: "a", text: "Tính cost lý thuyết theo thực đơn" },
      { code: "b", text: "Tính cost thực tế theo nhập hàng" },
      { code: "c", text: "So sánh cost LT vs TT" },
      { code: "d", text: "Kiểm tra lệch cost >0.5%" },
      { code: "e", text: "Phân tích nguyên nhân lệch cost" },
      { code: "f", text: "Báo cáo cost trong ngày" },
    ],
  },
  {
    id: "KT4",
    displayId: "4",
    title: "KIỂM SOÁT XUẤT – NHẬP – TỒN",
    items: [
      { code: "a", text: "Đối chiếu nhập hàng với đơn đặt" },
      { code: "b", text: "Kiểm tra hóa đơn NCC" },
      { code: "c", text: "Kiểm soát xuất kho theo định mức" },
      { code: "d", text: "Theo dõi tồn kho cuối ngày" },
      { code: "e", text: "Phát hiện hao hụt bất thường" },
      { code: "f", text: "Kiểm tra tồn kho chậm luân chuyển" },
    ],
  },
  {
    id: "KT5",
    displayId: "5",
    title: "PHÂN TÍCH & TỐI ƯU CHI PHÍ",
    items: [
      { code: "a", text: "Tổng hợp chi phí theo ngày" },
      { code: "b", text: "Phân tích biến động giá nguyên liệu" },
      { code: "c", text: "Xác định mặt hàng chi phí cao" },
      { code: "d", text: "Đề xuất thay thế nguyên liệu" },
      { code: "e", text: "Đề xuất tối ưu chi phí" },
      { code: "f", text: "Cảnh báo rủi ro chi phí" },
    ],
  },
  {
    id: "KT6",
    displayId: "6",
    title: "PHỐI HỢP VẬN HÀNH",
    items: [
      { code: "a", text: "Làm việc với bếp về định mức" },
      { code: "b", text: "Làm việc với kho về tồn kho" },
      { code: "c", text: "Phối hợp QC về chất lượng NCC" },
      { code: "d", text: "Xử lý sự cố nguyên liệu thiếu / lỗi" },
      { code: "e", text: "Điều chỉnh kế hoạch mua trong ngày" },
    ],
  },
];

const WAREHOUSE_GROUPS = [
  {
    id: "KQ1",
    displayId: "1",
    title: "NHẬN HÀNG",
    items: [
      { code: "a", text: "Kiểm tra số lượng hàng nhận so với đơn đặt" },
      { code: "b", text: "Kiểm tra quy cách, chủng loại hàng hóa" },
      { code: "c", text: "Kiểm tra nhiệt độ hàng giao nhận" },
      { code: "d", text: "Kiểm tra bao bì, tình trạng hàng hóa" },
      { code: "e", text: "Kiểm tra hạn sử dụng khi nhận hàng" },
      { code: "f", text: "Kiểm tra hồ sơ/chứng từ giao hàng" },
    ],
  },
  {
    id: "KQ2",
    displayId: "2",
    title: "KIỂM SOÁT CHẤT LƯỢNG",
    items: [
      { code: "a", text: "Kiểm tra cảm quan nguyên liệu đầu vào" },
      { code: "b", text: "Phát hiện hàng lỗi, hàng không đạt" },
      { code: "c", text: "Tách riêng hàng không phù hợp" },
      { code: "d", text: "Phối hợp NCC xử lý hàng lỗi" },
      { code: "e", text: "Ghi nhận lỗi chất lượng trong ngày" },
    ],
  },
  {
    id: "KQ3",
    displayId: "3",
    title: "NHẬP KHO – BẢO QUẢN",
    items: [
      { code: "a", text: "Sắp xếp hàng hóa đúng khu vực quy định" },
      { code: "b", text: "Bảo quản hàng theo đúng điều kiện nhiệt độ" },
      { code: "c", text: "Thực hiện FIFO/FEFO đúng quy định" },
      { code: "d", text: "Theo dõi tồn kho thực tế" },
      { code: "e", text: "Kiểm tra vệ sinh kho, kệ, dụng cụ chứa" },
    ],
  },
  {
    id: "KQ4",
    displayId: "4",
    title: "XUẤT KHO",
    items: [
      { code: "a", text: "Xuất hàng đúng phiếu, đúng số lượng" },
      { code: "b", text: "Xuất hàng đúng định mức" },
      { code: "c", text: "Xuất hàng đúng thời gian phục vụ sản xuất" },
      { code: "d", text: "Ghi nhận chênh lệch khi xuất kho" },
      { code: "e", text: "Phối hợp bếp xử lý thiếu hàng phát sinh" },
    ],
  },
  {
    id: "KQ5",
    displayId: "5",
    title: "KIỂM SOÁT TỒN KHO",
    items: [
      { code: "a", text: "Đối chiếu tồn kho thực tế và sổ sách" },
      { code: "b", text: "Phát hiện hàng cận date / chậm luân chuyển" },
      { code: "c", text: "Phát hiện hao hụt bất thường" },
      { code: "d", text: "Báo cáo tồn kho cuối ngày" },
      { code: "e", text: "Đề xuất hướng xử lý hàng tồn rủi ro" },
    ],
  },
  {
    id: "KQ6",
    displayId: "6",
    title: "VSATTP & AN TOÀN KHO",
    items: [
      { code: "a", text: "Kiểm tra vệ sinh kho mỗi ngày" },
      { code: "b", text: "Kiểm tra tách biệt sống/chín, sạch/bẩn" },
      { code: "c", text: "Kiểm tra khu vực bảo quản hóa chất/dụng cụ" },
      { code: "d", text: "Kiểm tra côn trùng, động vật gây hại" },
      { code: "e", text: "Kiểm tra an toàn điện, thiết bị kho" },
    ],
  },
];


const BEP_GROUPS = [
  {
    id: "BP1",
    displayId: "1",
    title: "CHUẨN BỊ ĐẦU CA",
    items: [
      { code: "a", text: "Kiểm tra dự trù, hệ thống gas, điện, nước, chuẩn bị gia vị nấu." },
      { code: "b", text: "Điều phối, đôn đốc tiến độ sơ chế." },
      { code: "c", text: "Nhận hàng từ bộ phận sơ chế, kiểm tra chất lượng hàng hóa, chuẩn bị CCDC nấu." },
      { code: "d", text: "Tiến hành nấu theo kế hoạch đã đặt ra." },
      { code: "e", text: "Kiểm tra hàng tồn ca đêm, báo cất kho hoặc phối hợp với PQL quyết định tái sử dụng (nếu có)." },
    ],
  },
  {
    id: "BP2",
    displayId: "2",
    title: "CHẾ BIẾN CA 1",
    items: [
      { code: "a", text: "Tập trung cao độ để nấu đúng tiến độ giờ phục vụ." },
      { code: "b", text: "Phối hợp với Quản lý, PQL để nêm nếm lại các món đã hoàn tất." },
      { code: "c", text: "Chuẩn bị khay mẫu và công tác phục vụ." },
    ],
  },
  {
    id: "BP3",
    displayId: "3",
    title: "GIÁM SÁT PHỤC VỤ & CA 2",
    items: [
      { code: "a", text: "Cùng Quản lý giám sát quá trình phục vụ ca 1. Lắng nghe ý kiến đóng góp, điều chỉnh nếu cần." },
      { code: "b", text: "Kiểm tra dự trù hàng hóa, chuẩn bị sơ chế và chế biến ca 2." },
      { code: "c", text: "Nấu các món phát sinh (nếu có)." },
    ],
  },
  {
    id: "BP4",
    displayId: "4",
    title: "ĐÓNG CA",
    items: [
      { code: "a", text: "Nấu hàng ca 2." },
      { code: "b", text: "Kiểm tra hệ thống gas, khóa gas." },
      { code: "c", text: "Vệ sinh bếp và bàn giao cho ca sau." },
      { code: "d", text: "Nhận dự trù – đọc tên món – cùng QL lên kế hoạch nhân sự cho ngày mai." },
      { code: "e", text: "Che đậy gia vị, đổ dầu cặn đúng quy định, cất phụ gia (tỏi xay, hành xay...)." },
    ],
  },
  {
    id: "BP5",
    displayId: "5",
    title: "KIỂM SOÁT CHẠY HÀNG",
    items: [
      { code: "a", text: "Có phát sinh chạy hàng." },
      { code: "b", text: "Ghi nhận số lượng chạy hàng." },
      { code: "c", text: "Xác định rõ lý do chạy hàng." },
      { code: "d", text: "Xử lý chạy hàng kịp thời." },
      { code: "e", text: "Không để lặp lại lỗi chạy hàng." },
    ],
  },
];

const SERVICE_GROUPS = [
  {
    id: "SV1",
    displayId: "1",
    title: "ĐẦU CA & KIỂM SOÁT ĐẦU VÀO",
    items: [
      { code: "a", text: "Nhận bàn giao ca từ đêm, điểm danh nhân sự ca sáng." },
      { code: "b", text: "Kiểm tra thực phẩm sơ chế (số lượng, quy cách, nhiệt độ)." },
      { code: "c", text: "Kiểm tra công tác chuẩn bị: sơ chế, khu chia suất." },
      { code: "d", text: "Rà soát hạn dùng thực phẩm." },
    ],
  },
  {
    id: "SV2",
    displayId: "2",
    title: "CHẤT LƯỢNG MÓN ĂN",
    items: [
      { code: "a", text: "Test thử món ăn bữa sáng, ghi nhận khẩu vị." },
      { code: "b", text: "Giám sát chất lượng món ăn (nhiệt độ, vị, trang trí)." },
      { code: "c", text: "Test thử món chiều." },
    ],
  },
  {
    id: "SV3",
    displayId: "3",
    title: "PHỤC VỤ & KHÁCH HÀNG",
    items: [
      { code: "a", text: "Giám sát phục vụ bữa sáng – trưa tại căn tin." },
      { code: "b", text: "Ghi nhận ý kiến khách hàng." },
      { code: "c", text: "Theo dõi chia suất trưa, kiểm tra khẩu phần." },
      { code: "d", text: "Theo dõi phục vụ chiều." },
    ],
  },
  {
    id: "SV4",
    displayId: "4",
    title: "NHÂN SỰ & ĐIỀU PHỐI",
    items: [
      { code: "a", text: "Kiểm tra vệ sinh dụng cụ, khu ăn." },
      { code: "b", text: "Điều phối hàng hóa thiếu đến các điểm." },
      { code: "c", text: "Nhắc nhở tác phong nhân sự." },
      { code: "d", text: "Phối hợp bếp trưởng lên kế hoạch chiều." },
    ],
  },
  {
    id: "SV5",
    displayId: "5",
    title: "KẾ HOẠCH, VSATTP & BÁO CÁO",
    items: [
      { code: "a", text: "Dự trù nguyên liệu ngày mai." },
      { code: "b", text: "Xem lại lỗi buổi sáng để điều chỉnh." },
      { code: "c", text: "Chuẩn bị biểu mẫu kiểm tra nội bộ." },
      { code: "d", text: "Giám sát sơ chế, chia suất chiều." },
      { code: "e", text: "Kiểm tra VSATTP khu sơ chế, nhận hàng." },
      { code: "f", text: "Kiểm tra vệ sinh sau phục vụ." },
      { code: "g", text: "Ghi nhận sự cố, báo cáo quản lý tổng." },
      { code: "h", text: "Hỗ trợ bàn giao cho ca tối." },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.items.map((i) => `${g.id}${i.code}`));
const ACCOUNTING_ALL_KEYS = ACCOUNTING_GROUPS.flatMap((g) => g.items.map((i) => `${g.id}${i.code}`));
const WAREHOUSE_ALL_KEYS = WAREHOUSE_GROUPS.flatMap((g) => g.items.map((i) => `${g.id}${i.code}`));
const BEP_ALL_KEYS = BEP_GROUPS.flatMap((g) => g.items.map((i) => `${g.id}${i.code}`));
const SERVICE_ALL_KEYS = SERVICE_GROUPS.flatMap((g) => g.items.map((i) => `${g.id}${i.code}`));

function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function buildRows(keys) {
  const rows = {};
  keys.forEach((key) => {
    rows[key] = { score: "5", note: "" };
  });
  return rows;
}

const buildEmptyRows = () => buildRows(ALL_KEYS);
const buildEmptyAccountingRows = () => buildRows(ACCOUNTING_ALL_KEYS);
const buildEmptyWarehouseRows = () => buildRows(WAREHOUSE_ALL_KEYS);
const buildEmptyBepRows = () => buildRows(BEP_ALL_KEYS);
const buildEmptyServiceRows = () => buildRows(SERVICE_ALL_KEYS);

function isValidText(text) {
  return String(text || "").trim().length >= 2;
}

function loadArrayFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveArrayToStorage(storageKey, data) {
  localStorage.setItem(storageKey, JSON.stringify(cloneData(data)));
}

function getReportByDate(storageKey, date) {
  return loadArrayFromStorage(storageKey).find((item) => item.date === date) || null;
}

function upsertReportByDate(storageKey, payload) {
  const current = loadArrayFromStorage(storageKey);
  const next = current.filter((item) => item.date !== payload.date);
  next.unshift(cloneData(payload));
  saveArrayToStorage(storageKey, next);
  return next;
}

function conclusionFromPercent(percent) {
  if (percent >= 85) return "Đạt";
  if (percent >= 70) return "Không đạt";
  return "Nguy cơ cao";
}

function computeReportMetrics(entries) {
  let sum = 0;
  const validScores = [];
  const issues = [];

  for (const entry of entries) {
    const score = Number(entry.score || 0);
    if (![1, 2, 3, 4, 5].includes(score)) continue;
    sum += score;
    validScores.push(score);
    const note = String(entry.note || "").trim();
    if (note) {
      issues.push({
        key: entry.key,
        label: entry.label,
        score,
        note,
      });
    }
  }

  const maxPossible = validScores.length * 5;
  const avg = validScores.length ? Number((sum / validScores.length).toFixed(2)) : 0;
  const percent100 = maxPossible ? Math.round((sum / maxPossible) * 100) : 0;
  const conclusion = conclusionFromPercent(percent100);
  return { sum, maxPossible, avg, percent100, conclusion, issues };
}

function statusColor(status) {
  if (status === "Đạt") return "#16a34a";
  if (status === "Không đạt") return "#f59e0b";
  return "#d92d20";
}

function rowColor(score) {
  const n = Number(score || 5);
  if (n <= 2) return "#fde2e2";
  if (n === 3) return "#fff4cf";
  return "#dff7e7";
}

function parseDateMs(dateStr) {
  if (!dateStr) return 0;
  const ms = new Date(`${dateStr}T00:00:00`).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function toIsoDate(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(
    dateObj.getDate()
  ).padStart(2, "0")}`;
}

function getRangeFromMode(mode, baseDateStr = getToday()) {
  const base = new Date(`${baseDateStr}T00:00:00`);
  if (mode === "day") return { from: baseDateStr, to: baseDateStr };
  if (mode === "week") {
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toIsoDate(monday), to: toIsoDate(sunday) };
  }
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

function countIssueItems(report) {
  if (Array.isArray(report.issues)) return report.issues.length;
  if (Array.isArray(report.result?.issues)) return report.result.issues.length;
  return 0;
}

function getIssueList(report) {
  if (Array.isArray(report.issues)) return report.issues;
  if (Array.isArray(report.result?.issues)) return report.result.issues;
  return [];
}

function avgScoreFromReports(list) {
  if (!list.length) return 0;
  return Math.round(
    list.reduce((sum, item) => sum + Number(item.totalScore || item.result?.percent100 || 0), 0) /
      list.length
  );
}

function formatRangeLabel(from, to, mode) {
  if (!from || !to) return "Chưa chọn khoảng thời gian";
  if (from === to) return `Ngày ${formatDateDisplay(from)}`;
  if (mode === "week") return `Tuần từ ${formatDateDisplay(from)} đến ${formatDateDisplay(to)}`;
  if (mode === "month") return `Tháng từ ${formatDateDisplay(from)} đến ${formatDateDisplay(to)}`;
  return `Từ ${formatDateDisplay(from)} đến ${formatDateDisplay(to)}`;
}

function validateBase({ date, unitName, manager, rows, allKeys }) {
  if (!date) return "Thiếu ngày báo cáo.";
  if (!isValidText(unitName)) return "Đơn vị phải từ 2 ký tự.";
  if (!isValidText(manager)) return "Người phụ trách phải từ 2 ký tự.";
  for (const key of allKeys) {
    const score = Number(rows[key]?.score || 0);
    if (![1, 2, 3, 4, 5].includes(score)) return `Điểm tại mục ${key} không hợp lệ.`;
    if (score <= 3 && String(rows[key]?.note || "").trim() === "") {
      return `Mục ${key} có điểm <=3 phải nhập nhận xét.`;
    }
  }
  return "";
}

function HistoryList({ history, emptyText = "Chưa có dữ liệu báo cáo." }) {
  return (
    <div style={{ marginTop: 14 }} className="print-history">
      <div style={styles.sectionTitle}>Lịch sử báo cáo gần nhất</div>
      {history.length === 0 ? (
        <div style={styles.empty}>{emptyText}</div>
      ) : (
        history.slice(0, 5).map((row) => (
          <div key={`${row.date}-${row.unitName}-${row.manager}`} style={styles.historyCard}>
            <div>
              <b>{formatDateDisplay(row.date)}</b> | {row.unitName}
            </div>
            <div>Phụ trách: {row.manager}</div>
            <div>
              Điểm: <b>{row.result?.percent100 ?? row.totalScore ?? "—"}</b>
            </div>
            <div>
              Kết quả:{" "}
              <b style={{ color: statusColor(row.result?.conclusion ?? row.conclusion) }}>
                {row.result?.conclusion ?? row.conclusion}
              </b>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SaveBadge({ text }) {
  const saved = text.includes("Đã lưu");
  return (
    <span
      style={{
        ...styles.saveBadge,
        color: saved ? "#166534" : "#64748b",
        borderColor: saved ? "#86efac" : "#cbd5e1",
        background: saved ? "#f0fdf4" : "#f8fafc",
      }}
    >
      {text}
    </span>
  );
}

function Box({ title, value, color, subtitle }) {
  return (
    <div style={styles.box}>
      <div style={styles.boxTitle}>{title}</div>
      <div style={{ ...styles.boxValue, color: color || "#0f172a" }}>{value}</div>
      {subtitle ? <div style={styles.boxSubtitle}>{subtitle}</div> : null}
    </div>
  );
}

function FilterModeButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.filterModeButton,
        background: active ? "#2970ff" : "#eef2f7",
        color: active ? "#fff" : "#0f172a",
        borderColor: active ? "#2970ff" : "#dbe3ef",
      }}
    >
      {children}
    </button>
  );
}

function LineTrendChart({ points }) {
  const safePoints = Array.isArray(points) ? points : [];
  if (safePoints.length === 0) return <div style={styles.empty}>Chưa đủ dữ liệu để vẽ đồ thị.</div>;

  const width = 760;
  const height = 220;
  const padding = 34;
  const values = safePoints.map((p) => Number(p.value || 0));
  const maxVal = Math.max(100, ...values);
  const minVal = Math.min(0, ...values);
  const range = Math.max(1, maxVal - minVal);
  const stepX = safePoints.length === 1 ? 0 : (width - padding * 2) / (safePoints.length - 1);

  const coords = safePoints.map((p, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((Number(p.value || 0) - minVal) / range) * (height - padding * 2);
    return { x, y, label: p.label, value: p.value };
  });

  const polyline = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const gridValues = [60, 70, 80, 90, 100];

  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>Xu hướng điểm theo thời gian</div>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.chartSvg}>
        {gridValues.map((g) => {
          const y = height - padding - ((g - minVal) / range) * (height - padding * 2);
          return (
            <g key={g}>
              <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={8} y={y + 4} fontSize="10" fill="#64748b">
                {g}
              </text>
            </g>
          );
        })}
        <polyline fill="none" stroke="#2970ff" strokeWidth="3" points={polyline} />
        {coords.map((p) => (
          <g key={`${p.label}-${p.x}`}>
            <circle cx={p.x} cy={p.y} r="4" fill="#2970ff" />
            <text x={p.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#64748b">
              {p.label}
            </text>
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#0f172a">
              {p.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HorizontalBarChart({
  title,
  items,
  valueKey = "avgScore",
  labelKey = "label",
  color = "#16a34a",
  maxBars = 6,
  secondaryKey,
}) {
  const list = Array.isArray(items) ? items.slice(0, maxBars) : [];
  return (
    <div style={styles.chartCard}>
      <div style={styles.chartTitle}>{title}</div>
      {list.length === 0 ? (
        <div style={styles.empty}>Chưa có dữ liệu.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {list.map((item, idx) => {
            const value = Number(item[valueKey] || 0);
            const width = Math.max(8, Math.min(100, value));
            return (
              <div key={`${item[labelKey]}-${idx}`} style={{ display: "grid", gap: 6 }}>
                <div style={styles.rowBetween}>
                  <div style={styles.barLabel}>{item[labelKey]}</div>
                  <div style={styles.barValue}>
                    {secondaryKey ? `${item[secondaryKey]} | ` : ""}TB {value}
                  </div>
                </div>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${width}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupRows({ group, rows, onChange }) {
  return (
    <>
      <tr>
        <td style={styles.groupIndex}>{group.displayId || group.id}</td>
        <td style={styles.groupTitleCell} colSpan={3}>
          {group.title}
        </td>
      </tr>
      {group.items.map((item) => {
        const key = `${group.id}${item.code}`;
        const row = rows[key] || { score: "5", note: "" };
        const score = Number(row.score || 5);
        return (
          <tr key={key} style={{ background: rowColor(score) }}>
            <td style={styles.cellIndex}>{item.code}</td>
            <td style={styles.cellText}>{item.text}</td>
            <td style={styles.cellScore}>
              <select
                value={row.score}
                onChange={(e) => onChange(key, { score: e.target.value })}
                style={{
                  ...styles.select,
                  borderColor: score <= 2 ? "#ef4444" : score === 3 ? "#f59e0b" : "#16a34a",
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </td>
            <td style={styles.cellNote}>
              <textarea
                value={row.note}
                onChange={(e) => onChange(key, { note: e.target.value })}
                placeholder={score <= 3 ? "Bắt buộc nhập nhận xét cho mục điểm thấp" : "Nhận xét (nếu có)"}
                style={styles.textarea}
              />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function HeaderFields({ label1, value1, onChange1, label2, value2, onChange2, date, onDateChange }) {
  return (
    <div style={styles.infoRow} className="print-meta">
      <div style={styles.infoField}>
        <label style={styles.infoLabel}>{label1}</label>
        <input value={value1} onChange={(e) => onChange1(e.target.value)} style={styles.infoInput} />
      </div>
      <div style={styles.infoField}>
        <label style={styles.infoLabel}>{label2}</label>
        <input value={value2} onChange={(e) => onChange2(e.target.value)} style={styles.infoInput} />
      </div>
      <div style={styles.infoField}>
        <label style={styles.infoLabel}>Ngày:</label>
        <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} style={styles.infoInput} />
      </div>
    </div>
  );
}

function SummaryBar({ score, conclusion }) {
  return (
    <div style={styles.summaryBar} className="print-summary">
      <div style={styles.kpi}>
        Điểm: <b>{score}</b>
      </div>
      <div style={styles.kpi}>
        Kết quả: <b style={{ color: statusColor(conclusion) }}>{conclusion}</b>
      </div>
    </div>
  );
}

function TableBlock({ groups, rows, onChange }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table} className="print-table">
        <thead>
          <tr>
            <th style={styles.th}>Stt</th>
            <th style={styles.th}>Hạng mục</th>
            <th style={styles.th}>Điểm (1-5)</th>
            <th style={styles.th}>Nhận xét</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group.id} group={group} rows={rows} onChange={onChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IssueBlock({ issues }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={styles.sectionTitle}>DANH SÁCH VẤN ĐỀ TRONG NGÀY</div>
      {issues.length === 0 ? (
        <div style={styles.goodBox}>Không phát sinh vấn đề</div>
      ) : (
        <ul style={styles.issueList}>
          {issues.map((issue) => (
            <li key={issue.key}>
              <b>{issue.content}</b>
              {issue.note ? ` — ${issue.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionRow({ onSave, onReset, onPrint, saveStatus }) {
  return (
    <div style={styles.buttonRow} className="no-print">
      <button style={styles.saveButton} onClick={onSave}>
        Lưu báo cáo
      </button>
      <button style={styles.grayButton} onClick={onReset}>
        Làm mới form
      </button>
      <button style={styles.printButton} onClick={onPrint}>
        In / Xuất PDF
      </button>
      <div className="save-status-no-print">
        <SaveBadge text={saveStatus} />
      </div>
    </div>
  );
}

function DashboardSection({ title, children }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function tabButtonStyle(active) {
  return {
    ...styles.tabButton,
    background: active ? "#2970ff" : "#e5e7eb",
    color: active ? "#fff" : "#111827",
  };
}

export default function App() {
  useEffect(() => {
    async function syncCloud() {
      try {
        const [management, service, accounting, warehouse, bep] = await Promise.all([
          loadReportsFromCloud(STORAGE_KEY),
          loadReportsFromCloud(SERVICE_STORAGE_KEY),
          loadReportsFromCloud(ACCOUNTING_STORAGE_KEY),
          loadReportsFromCloud(WAREHOUSE_STORAGE_KEY),
          loadReportsFromCloud(BEP_STORAGE_KEY),
        ]);

        if (management.length) setHistory(management);
        if (service.length) setServiceHistory(service);
        if (accounting.length) setAccountingHistory(accounting);
        if (warehouse.length) setWarehouseHistory(warehouse);
        if (bep.length) setBepHistory(bep);
      } catch (err) {
        console.error("Cloud sync failed:", err);
      }
    }

    syncCloud();
  }, []);
  const [activeTab, setActiveTab] = useState("form");
  const [message, setMessage] = useState("");

  const [unitName, setUnitName] = useState("Điều Hành");
  const [manager, setManager] = useState("");
  const [date, setDate] = useState(getToday());
  const [rows, setRows] = useState(buildEmptyRows);
  const [history, setHistory] = useState(() => loadArrayFromStorage(STORAGE_KEY));
  const [managementSaveStatus, setManagementSaveStatus] = useState("Chưa lưu báo cáo");

  const [serviceUnit, setServiceUnit] = useState(SERVICE_UNIT_DEFAULT);
  const [serviceManager, setServiceManager] = useState("");
  const [serviceDate, setServiceDate] = useState(getToday());
  const [serviceRows, setServiceRows] = useState(buildEmptyServiceRows);
  const [serviceHistory, setServiceHistory] = useState(() => loadArrayFromStorage(SERVICE_STORAGE_KEY));
  const [serviceSaveStatus, setServiceSaveStatus] = useState("Chưa lưu báo cáo");

  const [accountingUnit, setAccountingUnit] = useState(ACCOUNTING_UNIT_DEFAULT);
  const [accountingManager, setAccountingManager] = useState("");
  const [accountingDate, setAccountingDate] = useState(getToday());
  const [accountingRows, setAccountingRows] = useState(buildEmptyAccountingRows);
  const [accountingHistory, setAccountingHistory] = useState(() => loadArrayFromStorage(ACCOUNTING_STORAGE_KEY));
  const [accountingSaveStatus, setAccountingSaveStatus] = useState("Chưa lưu báo cáo");

  const [warehouseUnit, setWarehouseUnit] = useState(WAREHOUSE_UNIT_DEFAULT);
  const [warehouseManager, setWarehouseManager] = useState("");
  const [warehouseDate, setWarehouseDate] = useState(getToday());
  const [warehouseRows, setWarehouseRows] = useState(buildEmptyWarehouseRows);
  const [warehouseHistory, setWarehouseHistory] = useState(() => loadArrayFromStorage(WAREHOUSE_STORAGE_KEY));
  const [warehouseSaveStatus, setWarehouseSaveStatus] = useState("Chưa lưu báo cáo");

  const [bepUnit, setBepUnit] = useState(BEP_UNIT_DEFAULT);
  const [bepManager, setBepManager] = useState("");
  const [bepDate, setBepDate] = useState(getToday());
  const [bepRows, setBepRows] = useState(buildEmptyBepRows);
  const [bepHistory, setBepHistory] = useState(() => loadArrayFromStorage(BEP_STORAGE_KEY));
  const [bepSaveStatus, setBepSaveStatus] = useState("Chưa lưu báo cáo");

  const initialDashboardRange = getRangeFromMode("week");
  const [dashboardMode, setDashboardMode] = useState("week");
  const [dashboardFromDate, setDashboardFromDate] = useState(initialDashboardRange.from);
  const [dashboardToDate, setDashboardToDate] = useState(initialDashboardRange.to);

  const calculated = useMemo(() => {
    const entries = [];
    GROUPS.forEach((group) =>
      group.items.forEach((item) => {
        const key = `${group.id}${item.code}`;
        entries.push({
          key,
          label: `${group.id}.${item.code} ${item.text}`,
          score: Number(rows[key]?.score || 0),
          note: rows[key]?.note || "",
        });
      })
    );
    const m = computeReportMetrics(entries);
    return {
      ...m,
      totalScore: m.percent100,
      issues: m.issues.map((it) => ({ key: it.key, content: it.label, score: it.score, note: it.note })),
    };
  }, [rows]);

  const serviceCalculated = useMemo(() => {
    const entries = [];
    SERVICE_GROUPS.forEach((group) =>
      group.items.forEach((item) => {
        const key = `${group.id}${item.code}`;
        entries.push({
          key,
          label: `${group.displayId}.${item.code} ${item.text}`,
          score: Number(serviceRows[key]?.score || 0),
          note: serviceRows[key]?.note || "",
        });
      })
    );
    const m = computeReportMetrics(entries);
    return {
      ...m,
      totalScore: m.percent100,
      issues: m.issues.map((it) => ({ key: it.key, content: it.label, score: it.score, note: it.note })),
    };
  }, [serviceRows]);

  const accountingCalculated = useMemo(() => {
    const entries = [];
    ACCOUNTING_GROUPS.forEach((group) =>
      group.items.forEach((item) => {
        const key = `${group.id}${item.code}`;
        entries.push({
          key,
          label: `${group.displayId}.${item.code} ${item.text}`,
          score: Number(accountingRows[key]?.score || 0),
          note: accountingRows[key]?.note || "",
        });
      })
    );
    return computeReportMetrics(entries);
  }, [accountingRows]);

  const warehouseCalculated = useMemo(() => {
    const entries = [];
    WAREHOUSE_GROUPS.forEach((group) =>
      group.items.forEach((item) => {
        const key = `${group.id}${item.code}`;
        entries.push({
          key,
          label: `${group.displayId}.${item.code} ${item.text}`,
          score: Number(warehouseRows[key]?.score || 0),
          note: warehouseRows[key]?.note || "",
        });
      })
    );
    return computeReportMetrics(entries);
  }, [warehouseRows]);

  const bepCalculated = useMemo(() => {
    const entries = [];
    BEP_GROUPS.forEach((group) =>
      group.items.forEach((item) => {
        const key = `${group.id}${item.code}`;
        entries.push({
          key,
          label: `${group.displayId}.${item.code} ${item.text}`,
          score: Number(bepRows[key]?.score || 0),
          note: beRowsSafe(bepRows, key),
        });
      })
    );
    return computeReportMetrics(entries);
  }, [bepRows]);

  const companyReports = useMemo(() => {
    return [...history, ...serviceHistory, ...accountingHistory, ...warehouseHistory, ...bepHistory]
      .filter(Boolean)
      .map((item) => ({
        ...item,
        totalScore: Number(item.totalScore ?? item.result?.percent100 ?? 0),
        conclusion: item.conclusion ?? item.result?.conclusion ?? "—",
        issueCount: countIssueItems(item),
        dateMs: parseDateMs(item.date),
      }))
      .sort((a, b) => b.dateMs - a.dateMs);
  }, [history, serviceHistory, accountingHistory, warehouseHistory, bepHistory]);

  const dashboardStats = useMemo(() => {
    const fromMs = parseDateMs(dashboardFromDate);
    const toMs = parseDateMs(dashboardToDate);
    const filteredReports = companyReports.filter((item) => {
      if (!fromMs || !toMs) return true;
      return item.dateMs >= fromMs && item.dateMs <= toMs;
    });

    const departmentSummary = Object.values(
      filteredReports.reduce((acc, report) => {
        const key = report.unitName || "Chưa rõ bộ phận";
        if (!acc[key]) {
          acc[key] = { label: key, total: 0, count: 0, issues: 0, lastDate: "" };
        }
        acc[key].total += Number(report.totalScore || 0);
        acc[key].count += 1;
        acc[key].issues += report.issueCount || 0;
        if (!acc[key].lastDate || report.date > acc[key].lastDate) acc[key].lastDate = report.date;
        return acc;
      }, {})
    )
      .map((item) => ({ ...item, avgScore: item.count ? Math.round(item.total / item.count) : 0 }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const peopleSummary = Object.values(
      filteredReports.reduce((acc, report) => {
        const key = report.manager || "Chưa rõ người phụ trách";
        if (!acc[key]) {
          acc[key] = { label: key, total: 0, count: 0, units: new Set(), lastDate: "" };
        }
        acc[key].total += Number(report.totalScore || 0);
        acc[key].count += 1;
        if (report.unitName) acc[key].units.add(report.unitName);
        if (!acc[key].lastDate || report.date > acc[key].lastDate) acc[key].lastDate = report.date;
        return acc;
      }, {})
    )
      .map((item) => ({
        label: item.label,
        avgScore: item.count ? Math.round(item.total / item.count) : 0,
        count: item.count,
        unitsText: Array.from(item.units).join(", "),
        lastDate: item.lastDate,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    const groupedByDate = Object.values(
      filteredReports.reduce((acc, report) => {
        const key = report.date;
        if (!acc[key]) acc[key] = { label: formatDateDisplay(report.date), date: report.date, total: 0, count: 0 };
        acc[key].total += Number(report.totalScore || 0);
        acc[key].count += 1;
        return acc;
      }, {})
    )
      .map((item) => ({ label: item.label, date: item.date, value: item.count ? Math.round(item.total / item.count) : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const issueMap = {};
    filteredReports.forEach((report) => {
      getIssueList(report).forEach((issue) => {
        const key = issue.content || issue.label || issue.key || "Chưa rõ lỗi";
        if (!issueMap[key]) issueMap[key] = { label: key, count: 0, lowestScore: 5, units: new Set() };
        issueMap[key].count += 1;
        issueMap[key].lowestScore = Math.min(issueMap[key].lowestScore, Number(issue.score || 5));
        if (report.unitName) issueMap[key].units.add(report.unitName);
      });
    });

    const rootIssues = Object.values(issueMap)
      .map((item) => ({
        label: item.label,
        count: item.count,
        lowestScore: item.lowestScore,
        unitsText: Array.from(item.units).join(", "),
      }))
      .sort((a, b) => b.count - a.count || a.lowestScore - b.lowestScore)
      .slice(0, 8);

    const avgScore = avgScoreFromReports(filteredReports);
    const totalIssues = filteredReports.reduce((sum, item) => sum + (item.issueCount || 0), 0);
    const weakDepartment = departmentSummary[0] || null;
    const weakPerson = peopleSummary[0] || null;
    const alerts = [];
    if (filteredReports.length === 0) alerts.push("Khoảng thời gian này chưa có báo cáo nào được lưu.");
    if (avgScore > 0 && avgScore < 85) alerts.push("Điểm trung bình toàn công ty đang dưới ngưỡng đạt, cần rà soát ngay.");
    if (weakDepartment && weakDepartment.avgScore < 90) alerts.push(`Bộ phận cần xử lý trước: ${weakDepartment.label}.`);
    if (weakPerson && weakPerson.avgScore < 90) alerts.push(`Cá nhân cần kèm sát: ${weakPerson.label}.`);
    if (rootIssues[0] && rootIssues[0].count >= 2) alerts.push(`Lỗi lặp nổi bật: ${rootIssues[0].label}.`);

    return {
      filteredReports,
      avgScore,
      totalIssues,
      reportCount: filteredReports.length,
      departmentSummary,
      peopleSummary,
      groupedByDate,
      rootIssues,
      weakDepartment,
      weakPerson,
      alerts,
      rangeLabel: formatRangeLabel(dashboardFromDate, dashboardToDate, dashboardMode),
    };
  }, [companyReports, dashboardFromDate, dashboardToDate, dashboardMode]);

  function showMessage(text) {
    setMessage(text);
    window.clearTimeout(window.__msgTimer);
    window.__msgTimer = window.setTimeout(() => setMessage(""), 2500);
  }

  function applyDashboardMode(mode) {
    const range = getRangeFromMode(mode);
    setDashboardMode(mode);
    setDashboardFromDate(range.from);
    setDashboardToDate(range.to);
  }

  function setSavedStatus(setter) {
    setter(`Đã lưu ✓ ${new Date().toLocaleTimeString()}`);
  }

  function updateRow(setter, statusSetter, key, patch) {
    setter((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    statusSetter("Chưa lưu báo cáo");
  }

  async function saveDepartmentReport({
    storageKey,
    date,
    unitName,
    manager,
    rows,
    allKeys,
    result,
    historySetter,
    statusSetter,
    successMessage,
  }) {
    const error = validateBase({ date, unitName, manager, rows, allKeys });
    if (error) return showMessage(error);

    const payload = {
      date,
      unitName: String(unitName || "").trim(),
      manager: String(manager || "").trim(),
      rows: cloneData(rows),
      result: cloneData(result),
      totalScore: result.percent100 ?? result.totalScore,
      conclusion: result.conclusion,
      issues: cloneData(result.issues || []),
      savedAt: new Date().toLocaleString(),
    };

    try {
      const nextCloud = await upsertReportToCloud(storageKey, payload);
      historySetter(nextCloud);
      saveArrayToStorage(storageKey, nextCloud);
      setSavedStatus(statusSetter);
      showMessage(successMessage);
    } catch (err) {
      console.error("Save cloud failed, fallback local:", err);
      const next = upsertReportByDate(storageKey, payload);
      historySetter(next);
      setSavedStatus(statusSetter);
      showMessage(`${successMessage} (đã lưu local)`);
    }
  }

  async function handleDepartmentDateChange({
    nextDate,
    storageKey,
    unitDefault,
    setDateFn,
    setUnitFn,
    setManagerFn,
    setRowsFn,
    buildEmptyFn,
    statusSetter,
  }) {
    setDateFn(nextDate);

    try {
      const foundCloud = await getReportByDateFromCloud(storageKey, nextDate);
      if (foundCloud) {
        setUnitFn(foundCloud.unitName || unitDefault);
        setManagerFn(foundCloud.manager || "");
        setRowsFn(cloneData(foundCloud.rows || buildEmptyFn()));
        statusSetter(foundCloud.savedAt ? `Đã lưu ✓ ${foundCloud.savedAt}` : "Đã lưu báo cáo");
        return;
      }
    } catch (err) {
      console.error("Load cloud by date failed:", err);
    }

    const found = getReportByDate(storageKey, nextDate);
    if (found) {
      setUnitFn(found.unitName || unitDefault);
      setManagerFn(found.manager || "");
      setRowsFn(cloneData(found.rows || buildEmptyFn()));
      statusSetter(found.savedAt ? `Đã lưu ✓ ${found.savedAt}` : "Đã lưu báo cáo");
      return;
    }

    setUnitFn(unitDefault);
    setManagerFn("");
    setRowsFn(buildEmptyFn());
    statusSetter("Chưa lưu báo cáo");
  }

  function resetDepartment({ setUnitFn, setManagerFn, setRowsFn, buildEmptyFn, unitDefault, statusSetter, message }) {
    setUnitFn(unitDefault);
    setManagerFn("");
    setRowsFn(buildEmptyFn());
    statusSetter("Chưa lưu báo cáo");
    showMessage(message);
  }

  function handlePrint() {
    window.print();
  }

  const printStyle = `
    .print-only { display: none !important; }
    @page { size: A4 portrait; margin: 10mm; }
    @media print {
      html, body { width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px !important; }
      .no-print, .save-status-no-print, .print-history, .print-dashboard-extra { display: none !important; }
      .print-root { width: 100% !important; min-height: auto !important; background: #fff !important; padding: 0 !important; }
      .print-wrap { width: 100% !important; max-width: 190mm !important; margin: 0 auto !important; }
      .print-panel { width: 100% !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; background: #fff !important; }
      .print-title { text-align: center !important; font-size: 17px !important; line-height: 1.2 !important; font-weight: 800 !important; margin: 0 0 5mm !important; }
      .print-meta { display: grid !important; grid-template-columns: 1.05fr 1.1fr 0.85fr !important; gap: 2.5mm !important; margin-bottom: 3mm !important; align-items: stretch !important; }
      .print-summary { display: flex !important; gap: 6mm !important; align-items: center !important; border: 1px solid #999 !important; border-radius: 0 !important; padding: 2.2mm 2.8mm !important; margin: 0 0 3mm !important; background: #fff !important; }
      .print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; font-size: 8.7px !important; }
      .print-table th, .print-table td { border: 1px solid #999 !important; padding: 1.3mm 1.5mm !important; vertical-align: top !important; word-break: break-word !important; white-space: normal !important; }
      .print-table th:nth-child(1), .print-table td:nth-child(1) { width: 5.5% !important; }
      .print-table th:nth-child(2), .print-table td:nth-child(2) { width: 51.5% !important; }
      .print-table th:nth-child(3), .print-table td:nth-child(3) { width: 11% !important; }
      .print-table th:nth-child(4), .print-table td:nth-child(4) { width: 32% !important; }
      .print-table input, .print-table textarea, .print-table select { width: 100% !important; min-width: 0 !important; max-width: 100% !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; margin: 0 !important; border: none !important; outline: none !important; background: transparent !important; color: #000 !important; font: inherit !important; }
      .print-table textarea { min-height: auto !important; height: auto !important; resize: none !important; }
    }
  `;

  return (
    <>
      <style>{printStyle}</style>
      <div style={styles.page} className="print-root">
        <div style={styles.container} className="print-wrap">
          <h1 style={styles.title} className="print-title">
            BẢNG BÁO CÁO CÔNG VIỆC HẰNG NGÀY
          </h1>

          {message ? <div style={styles.message}>{message}</div> : null}

          <div style={styles.tabWrap} className="no-print">
            <button style={tabButtonStyle(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
            <button style={tabButtonStyle(activeTab === "form")} onClick={() => setActiveTab("form")}>Quản Lý</button>
            <button style={tabButtonStyle(activeTab === "service")} onClick={() => setActiveTab("service")}>Giám sát dịch vụ</button>
            <button style={tabButtonStyle(activeTab === "ke-toan-sx-thu-mua")} onClick={() => setActiveTab("ke-toan-sx-thu-mua")}>Kế toán / Thu mua</button>
            <button style={tabButtonStyle(activeTab === "kho-qc")} onClick={() => setActiveTab("kho-qc")}>Kho / QC</button>
            <button style={tabButtonStyle(activeTab === "bep")} onClick={() => setActiveTab("bep")}>Bếp</button>
          </div>

          {activeTab === "dashboard" && (
            <div style={styles.panel} className="print-panel">
              <DashboardSection title="Bộ lọc phân tích">
                <div style={styles.filterPanel}>
                  <div style={styles.filterModes}>
                    <FilterModeButton active={dashboardMode === "day"} onClick={() => applyDashboardMode("day")}>Ngày</FilterModeButton>
                    <FilterModeButton active={dashboardMode === "week"} onClick={() => applyDashboardMode("week")}>Tuần</FilterModeButton>
                    <FilterModeButton active={dashboardMode === "month"} onClick={() => applyDashboardMode("month")}>Tháng</FilterModeButton>
                    <FilterModeButton active={dashboardMode === "custom"} onClick={() => setDashboardMode("custom")}>Tùy chọn</FilterModeButton>
                  </div>
                  <div style={styles.filterDates}>
                    <div style={styles.infoField}>
                      <label style={styles.infoLabel}>Từ ngày</label>
                      <input type="date" value={dashboardFromDate} onChange={(e) => { setDashboardMode("custom"); setDashboardFromDate(e.target.value); }} style={styles.infoInput} />
                    </div>
                    <div style={styles.infoField}>
                      <label style={styles.infoLabel}>Đến ngày</label>
                      <input type="date" value={dashboardToDate} onChange={(e) => { setDashboardMode("custom"); setDashboardToDate(e.target.value); }} style={styles.infoInput} />
                    </div>
                  </div>
                  <div style={styles.filterHint}>{dashboardStats.rangeLabel}</div>
                </div>
              </DashboardSection>

              <div style={styles.dashboardGrid}>
                <Box title="Điểm TB giai đoạn" value={dashboardStats.avgScore || "—"} subtitle={`${dashboardStats.reportCount} báo cáo`} color={statusColor(conclusionFromPercent(dashboardStats.avgScore))} />
                <Box title="Tổng vấn đề" value={dashboardStats.totalIssues} color={dashboardStats.totalIssues > 0 ? "#d92d20" : "#16a34a"} subtitle="Từ toàn bộ bộ phận" />
                <Box title="Bộ phận yếu nhất" value={dashboardStats.weakDepartment?.label || "—"} subtitle={dashboardStats.weakDepartment ? `TB ${dashboardStats.weakDepartment.avgScore}` : "Chưa có dữ liệu"} color="#d92d20" />
                <Box title="Cá nhân cần kèm" value={dashboardStats.weakPerson?.label || "—"} subtitle={dashboardStats.weakPerson ? `TB ${dashboardStats.weakPerson.avgScore}` : "Chưa có dữ liệu"} color="#d92d20" />
              </div>

              <DashboardSection title="CEO cần hành động gì ngay">
                {dashboardStats.alerts.length === 0 ? (
                  <div style={styles.goodBox}>Giai đoạn đang ổn, chưa có cảnh báo lớn.</div>
                ) : (
                  <ul style={styles.issueList}>
                    {dashboardStats.alerts.map((alert, index) => (
                      <li key={`alert-${index}`}><b>{alert}</b></li>
                    ))}
                  </ul>
                )}
              </DashboardSection>

              <DashboardSection title="Đồ thị tổng quan">
                <div style={styles.chartGrid}>
                  <LineTrendChart points={dashboardStats.groupedByDate} />
                  <HorizontalBarChart title="Hiệu suất nhóm / tập thể" items={dashboardStats.departmentSummary} valueKey="avgScore" labelKey="label" color="#16a34a" secondaryKey="count" />
                </div>
                <div style={{ marginTop: 14 }}>
                  <HorizontalBarChart title="Hiệu suất cá nhân" items={dashboardStats.peopleSummary} valueKey="avgScore" labelKey="label" color="#2970ff" secondaryKey="count" />
                </div>
              </DashboardSection>

              <DashboardSection title="Điểm nóng cần bắt tận gốc">
                {dashboardStats.rootIssues.length === 0 ? (
                  <div style={styles.goodBox}>Khoảng thời gian này chưa có lỗi lặp nổi bật.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {dashboardStats.rootIssues.map((item) => (
                      <div key={item.label} style={styles.historyCard}>
                        <div style={styles.rowBetween}>
                          <b>{item.label}</b>
                          <span style={{ color: item.lowestScore <= 2 ? "#d92d20" : "#f59e0b", fontWeight: 800 }}>
                            Lặp {item.count} lần
                          </span>
                        </div>
                        <div style={styles.metricLine}>Điểm thấp nhất: <b>{item.lowestScore}</b></div>
                        <div style={styles.metricLine}>Bộ phận liên quan: <b>{item.unitsText || "—"}</b></div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardSection>
            </div>
          )}

          {activeTab === "form" && (
            <div style={styles.panel} className="print-panel">
              <HeaderFields
                label1="Khu vực:"
                value1={unitName}
                onChange1={(v) => { setUnitName(v); setManagementSaveStatus("Chưa lưu báo cáo"); }}
                label2="Người phụ trách:"
                value2={manager}
                onChange2={(v) => { setManager(v); setManagementSaveStatus("Chưa lưu báo cáo"); }}
                date={date}
                onDateChange={(nextDate) =>
                  handleDepartmentDateChange({
                    nextDate,
                    storageKey: STORAGE_KEY,
                    unitDefault: "Điều Hành",
                    setDateFn: setDate,
                    setUnitFn: setUnitName,
                    setManagerFn: setManager,
                    setRowsFn: setRows,
                    buildEmptyFn: buildEmptyRows,
                    statusSetter: setManagementSaveStatus,
                  })
                }
              />
              <SummaryBar score={calculated.totalScore} conclusion={calculated.conclusion} />
              <TableBlock groups={GROUPS} rows={rows} onChange={(key, patch) => updateRow(setRows, setManagementSaveStatus, key, patch)} />
              <IssueBlock issues={calculated.issues} />
              <ActionRow
                onSave={() =>
                  saveDepartmentReport({
                    storageKey: STORAGE_KEY,
                    date,
                    unitName,
                    manager,
                    rows,
                    allKeys: ALL_KEYS,
                    result: calculated,
                    historySetter: setHistory,
                    statusSetter: setManagementSaveStatus,
                    successMessage: "Đã lưu báo cáo Quản Lý.",
                  })
                }
                onReset={() =>
                  resetDepartment({
                    setUnitFn: setUnitName,
                    setManagerFn: setManager,
                    setRowsFn: setRows,
                    buildEmptyFn: buildEmptyRows,
                    unitDefault: "Điều Hành",
                    statusSetter: setManagementSaveStatus,
                    message: "Đã làm mới form Quản Lý.",
                  })
                }
                onPrint={handlePrint}
                saveStatus={managementSaveStatus}
              />
              <HistoryList history={history} emptyText="Chưa có dữ liệu báo cáo quản lý." />
            </div>
          )}

          {activeTab === "service" && (
            <div style={styles.panel} className="print-panel">
              <HeaderFields
                label1="Đơn vị:"
                value1={serviceUnit}
                onChange1={(v) => { setServiceUnit(v); setServiceSaveStatus("Chưa lưu báo cáo"); }}
                label2="Người phụ trách:"
                value2={serviceManager}
                onChange2={(v) => { setServiceManager(v); setServiceSaveStatus("Chưa lưu báo cáo"); }}
                date={serviceDate}
                onDateChange={(nextDate) =>
                  handleDepartmentDateChange({
                    nextDate,
                    storageKey: SERVICE_STORAGE_KEY,
                    unitDefault: SERVICE_UNIT_DEFAULT,
                    setDateFn: setServiceDate,
                    setUnitFn: setServiceUnit,
                    setManagerFn: setServiceManager,
                    setRowsFn: setServiceRows,
                    buildEmptyFn: buildEmptyServiceRows,
                    statusSetter: setServiceSaveStatus,
                  })
                }
              />
              <SummaryBar score={serviceCalculated.totalScore} conclusion={serviceCalculated.conclusion} />
              <TableBlock groups={SERVICE_GROUPS} rows={serviceRows} onChange={(key, patch) => updateRow(setServiceRows, setServiceSaveStatus, key, patch)} />
              <IssueBlock issues={serviceCalculated.issues} />
              <ActionRow
                onSave={() =>
                  saveDepartmentReport({
                    storageKey: SERVICE_STORAGE_KEY,
                    date: serviceDate,
                    unitName: serviceUnit,
                    manager: serviceManager,
                    rows: serviceRows,
                    allKeys: SERVICE_ALL_KEYS,
                    result: serviceCalculated,
                    historySetter: setServiceHistory,
                    statusSetter: setServiceSaveStatus,
                    successMessage: "Đã lưu báo cáo Giám sát dịch vụ.",
                  })
                }
                onReset={() =>
                  resetDepartment({
                    setUnitFn: setServiceUnit,
                    setManagerFn: setServiceManager,
                    setRowsFn: setServiceRows,
                    buildEmptyFn: buildEmptyServiceRows,
                    unitDefault: SERVICE_UNIT_DEFAULT,
                    statusSetter: setServiceSaveStatus,
                    message: "Đã làm mới form Giám sát dịch vụ.",
                  })
                }
                onPrint={handlePrint}
                saveStatus={serviceSaveStatus}
              />
              <HistoryList history={serviceHistory} emptyText="Chưa có dữ liệu báo cáo giám sát dịch vụ." />
            </div>
          )}

          {activeTab === "ke-toan-sx-thu-mua" && (
            <div style={styles.panel} className="print-panel">
              <HeaderFields
                label1="Đơn vị:"
                value1={accountingUnit}
                onChange1={(v) => { setAccountingUnit(v); setAccountingSaveStatus("Chưa lưu báo cáo"); }}
                label2="Người phụ trách:"
                value2={accountingManager}
                onChange2={(v) => { setAccountingManager(v); setAccountingSaveStatus("Chưa lưu báo cáo"); }}
                date={accountingDate}
                onDateChange={(nextDate) =>
                  handleDepartmentDateChange({
                    nextDate,
                    storageKey: ACCOUNTING_STORAGE_KEY,
                    unitDefault: ACCOUNTING_UNIT_DEFAULT,
                    setDateFn: setAccountingDate,
                    setUnitFn: setAccountingUnit,
                    setManagerFn: setAccountingManager,
                    setRowsFn: setAccountingRows,
                    buildEmptyFn: buildEmptyAccountingRows,
                    statusSetter: setAccountingSaveStatus,
                  })
                }
              />
              <SummaryBar score={accountingCalculated.percent100} conclusion={accountingCalculated.conclusion} />
              <TableBlock groups={ACCOUNTING_GROUPS} rows={accountingRows} onChange={(key, patch) => updateRow(setAccountingRows, setAccountingSaveStatus, key, patch)} />
              <IssueBlock issues={accountingCalculated.issues.map((it) => ({ ...it, content: it.label }))} />
              <ActionRow
                onSave={() =>
                  saveDepartmentReport({
                    storageKey: ACCOUNTING_STORAGE_KEY,
                    date: accountingDate,
                    unitName: accountingUnit,
                    manager: accountingManager,
                    rows: accountingRows,
                    allKeys: ACCOUNTING_ALL_KEYS,
                    result: accountingCalculated,
                    historySetter: setAccountingHistory,
                    statusSetter: setAccountingSaveStatus,
                    successMessage: "Đã lưu báo cáo Kế toán / Thu mua.",
                  })
                }
                onReset={() =>
                  resetDepartment({
                    setUnitFn: setAccountingUnit,
                    setManagerFn: setAccountingManager,
                    setRowsFn: setAccountingRows,
                    buildEmptyFn: buildEmptyAccountingRows,
                    unitDefault: ACCOUNTING_UNIT_DEFAULT,
                    statusSetter: setAccountingSaveStatus,
                    message: "Đã làm mới form Kế toán / Thu mua.",
                  })
                }
                onPrint={handlePrint}
                saveStatus={accountingSaveStatus}
              />
              <HistoryList history={accountingHistory} emptyText="Chưa có dữ liệu báo cáo kế toán." />
            </div>
          )}

          {activeTab === "kho-qc" && (
            <div style={styles.panel} className="print-panel">
              <HeaderFields
                label1="Đơn vị:"
                value1={warehouseUnit}
                onChange1={(v) => { setWarehouseUnit(v); setWarehouseSaveStatus("Chưa lưu báo cáo"); }}
                label2="Người phụ trách:"
                value2={warehouseManager}
                onChange2={(v) => { setWarehouseManager(v); setWarehouseSaveStatus("Chưa lưu báo cáo"); }}
                date={warehouseDate}
                onDateChange={(nextDate) =>
                  handleDepartmentDateChange({
                    nextDate,
                    storageKey: WAREHOUSE_STORAGE_KEY,
                    unitDefault: WAREHOUSE_UNIT_DEFAULT,
                    setDateFn: setWarehouseDate,
                    setUnitFn: setWarehouseUnit,
                    setManagerFn: setWarehouseManager,
                    setRowsFn: setWarehouseRows,
                    buildEmptyFn: buildEmptyWarehouseRows,
                    statusSetter: setWarehouseSaveStatus,
                  })
                }
              />
              <SummaryBar score={warehouseCalculated.percent100} conclusion={warehouseCalculated.conclusion} />
              <TableBlock groups={WAREHOUSE_GROUPS} rows={warehouseRows} onChange={(key, patch) => updateRow(setWarehouseRows, setWarehouseSaveStatus, key, patch)} />
              <IssueBlock issues={warehouseCalculated.issues.map((it) => ({ ...it, content: it.label }))} />
              <ActionRow
                onSave={() =>
                  saveDepartmentReport({
                    storageKey: WAREHOUSE_STORAGE_KEY,
                    date: warehouseDate,
                    unitName: warehouseUnit,
                    manager: warehouseManager,
                    rows: warehouseRows,
                    allKeys: WAREHOUSE_ALL_KEYS,
                    result: warehouseCalculated,
                    historySetter: setWarehouseHistory,
                    statusSetter: setWarehouseSaveStatus,
                    successMessage: "Đã lưu báo cáo Kho / QC.",
                  })
                }
                onReset={() =>
                  resetDepartment({
                    setUnitFn: setWarehouseUnit,
                    setManagerFn: setWarehouseManager,
                    setRowsFn: setWarehouseRows,
                    buildEmptyFn: buildEmptyWarehouseRows,
                    unitDefault: WAREHOUSE_UNIT_DEFAULT,
                    statusSetter: setWarehouseSaveStatus,
                    message: "Đã làm mới form Kho / QC.",
                  })
                }
                onPrint={handlePrint}
                saveStatus={warehouseSaveStatus}
              />
              <HistoryList history={warehouseHistory} emptyText="Chưa có dữ liệu báo cáo kho." />
            </div>
          )}

          {activeTab === "bep" && (
            <div style={styles.panel} className="print-panel">
              <HeaderFields
                label1="Đơn vị:"
                value1={bepUnit}
                onChange1={(v) => { setBepUnit(v); setBepSaveStatus("Chưa lưu báo cáo"); }}
                label2="Người phụ trách:"
                value2={bepManager}
                onChange2={(v) => { setBepManager(v); setBepSaveStatus("Chưa lưu báo cáo"); }}
                date={bepDate}
                onDateChange={(nextDate) =>
                  handleDepartmentDateChange({
                    nextDate,
                    storageKey: BEP_STORAGE_KEY,
                    unitDefault: BEP_UNIT_DEFAULT,
                    setDateFn: setBepDate,
                    setUnitFn: setBepUnit,
                    setManagerFn: setBepManager,
                    setRowsFn: setBepRows,
                    buildEmptyFn: buildEmptyBepRows,
                    statusSetter: setBepSaveStatus,
                  })
                }
              />
              <SummaryBar score={bepCalculated.percent100} conclusion={bepCalculated.conclusion} />
              <TableBlock groups={BEP_GROUPS} rows={bepRows} onChange={(key, patch) => updateRow(setBepRows, setBepSaveStatus, key, patch)} />
              <IssueBlock issues={bepCalculated.issues.map((it) => ({ ...it, content: it.label }))} />
              <ActionRow
                onSave={() =>
                  saveDepartmentReport({
                    storageKey: BEP_STORAGE_KEY,
                    date: bepDate,
                    unitName: bepUnit,
                    manager: bepManager,
                    rows: bepRows,
                    allKeys: BEP_ALL_KEYS,
                    result: bepCalculated,
                    historySetter: setBepHistory,
                    statusSetter: setBepSaveStatus,
                    successMessage: "Đã lưu báo cáo Bếp.",
                  })
                }
                onReset={() =>
                  resetDepartment({
                    setUnitFn: setBepUnit,
                    setManagerFn: setBepManager,
                    setRowsFn: setBepRows,
                    buildEmptyFn: buildEmptyBepRows,
                    unitDefault: BEP_UNIT_DEFAULT,
                    statusSetter: setBepSaveStatus,
                    message: "Đã làm mới form Bếp.",
                  })
                }
                onPrint={handlePrint}
                saveStatus={bepSaveStatus}
              />
              <HistoryList history={bepHistory} emptyText="Chưa có dữ liệu báo cáo bếp." />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function beRowsSafe(rows, key) {
  return String(rows[key]?.note || "").trim();
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f7fb", padding: 16, color: "#0f172a", fontFamily: "Inter, system-ui, sans-serif" },
  container: { maxWidth: 1360, margin: "0 auto" },
  title: { textAlign: "center", fontSize: 36, fontWeight: 800, margin: "4px 0 18px", letterSpacing: -0.5, lineHeight: 1.15 },
  message: { margin: "0 auto 12px", maxWidth: 760, background: "#dbeafe", color: "#1d4ed8", border: "1px solid #93c5fd", borderRadius: 12, padding: "10px 14px", fontWeight: 700, textAlign: "center", fontSize: 14 },
  tabWrap: { display: "flex", justifyContent: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" },
  tabButton: { border: "none", padding: "12px 22px", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" },
  panel: { background: "#fff", border: "1px solid #dbe3ef", borderRadius: 22, padding: 16, boxShadow: "0 6px 18px rgba(15,23,42,0.04)" },
  infoRow: { display: "grid", gridTemplateColumns: "1.15fr 1.15fr 0.8fr", gap: 12, marginBottom: 14 },
  infoField: { display: "grid", gap: 6, minWidth: 0 },
  infoLabel: { fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" },
  infoInput: { width: "100%", border: "1.5px solid #d1d5db", background: "#fff", borderRadius: 12, padding: "10px 12px", fontSize: 15, lineHeight: 1.3, minWidth: 0, boxSizing: "border-box" },
  summaryBar: { display: "flex", gap: 24, alignItems: "center", border: "1px solid #d1d5db", borderRadius: 14, padding: "12px 16px", marginBottom: 14, flexWrap: "wrap" },
  kpi: { fontSize: 16, fontWeight: 600 },
  tableWrap: { overflowX: "auto", border: "1px solid #d1d5db", borderRadius: 14 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 920 },
  th: { background: "#16a34a", color: "#fff", padding: "12px 12px", fontSize: 15, textAlign: "left", border: "1px solid #cbd5e1" },
  groupIndex: { width: 54, background: "#dbe4f0", color: "#1d4ed8", fontWeight: 800, fontSize: 16, padding: "10px 12px", border: "1px solid #cbd5e1", verticalAlign: "top" },
  groupTitleCell: { background: "#dbe4f0", color: "#0f172a", fontWeight: 800, fontSize: 16, padding: "10px 12px", border: "1px solid #cbd5e1" },
  cellIndex: { width: 54, fontWeight: 700, fontSize: 15, padding: "10px 12px", border: "1px solid #cbd5e1", verticalAlign: "top" },
  cellText: { padding: "10px 12px", border: "1px solid #cbd5e1", fontSize: 15, lineHeight: 1.45, verticalAlign: "top" },
  cellScore: { width: 130, padding: "10px 12px", border: "1px solid #cbd5e1", verticalAlign: "top" },
  cellNote: { width: 320, padding: "10px 12px", border: "1px solid #cbd5e1", verticalAlign: "top" },
  select: { width: "100%", borderRadius: 12, padding: "10px 12px", fontSize: 15, fontWeight: 700, border: "2px solid #16a34a", background: "#fff" },
  textarea: { width: "100%", minHeight: 88, borderRadius: 12, padding: "10px 12px", fontSize: 14, border: "1.5px solid #cbd5e1", resize: "vertical", boxSizing: "border-box" },
  sectionTitle: { fontSize: 16, fontWeight: 800, marginBottom: 10 },
  goodBox: { background: "#d1fae5", color: "#166534", borderRadius: 14, padding: "14px 16px", border: "1px solid #86efac", fontSize: 15, fontWeight: 700 },
  issueList: { margin: 0, paddingLeft: 24, fontSize: 15, lineHeight: 1.65 },
  buttonRow: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 },
  saveButton: { border: "none", background: "#16a34a", color: "#fff", borderRadius: 14, padding: "12px 22px", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  grayButton: { border: "none", background: "#334155", color: "#fff", borderRadius: 14, padding: "12px 22px", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  printButton: { border: "none", background: "#0b1736", color: "#fff", borderRadius: 14, padding: "12px 22px", fontSize: 15, fontWeight: 800, cursor: "pointer" },
  saveBadge: { display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 16px", borderRadius: 14, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 800 },
  empty: { color: "#64748b", fontSize: 15 },
  historyCard: { marginTop: 10, border: "1px solid #dbe3ef", background: "#fff", borderRadius: 14, padding: "14px 16px", fontSize: 15, lineHeight: 1.55 },
  box: { background: "#fff", border: "1px solid #dbe3ef", borderRadius: 16, padding: 16, minHeight: 90 },
  boxTitle: { color: "#64748b", fontSize: 14, marginBottom: 8 },
  boxValue: { fontSize: 28, fontWeight: 800, lineHeight: 1.2 },
  boxSubtitle: { fontSize: 13, color: "#64748b", marginTop: 6 },
  dashboardGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 },
  filterPanel: { display: "grid", gap: 12, marginBottom: 8 },
  filterModes: { display: "flex", gap: 10, flexWrap: "wrap" },
  filterModeButton: { border: "1px solid #dbe3ef", padding: "10px 16px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  filterDates: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  filterHint: { fontSize: 14, color: "#64748b", fontWeight: 600 },
  chartGrid: { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 },
  chartCard: { border: "1px solid #dbe3ef", borderRadius: 14, padding: 14, background: "#fff" },
  chartTitle: { fontSize: 15, fontWeight: 800, marginBottom: 10 },
  chartSvg: { width: "100%", height: 240, display: "block" },
  barTrack: { width: "100%", height: 10, background: "#e5e7eb", borderRadius: 999 },
  barFill: { height: "100%", borderRadius: 999 },
  barLabel: { fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0 },
  barValue: { fontSize: 13, color: "#64748b", fontWeight: 700 },
  dashboardGridThree: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 },
  metricLine: { fontSize: 14, marginTop: 4 },
  rowBetween: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
};
