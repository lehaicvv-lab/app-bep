import { useEffect, useMemo, useRef, useState } from "react";
import "./BieuMau.css";

const STORAGE_KEY = "company_forms_history";
const LEGACY_COMPANY_NAME = "CÔNG TY CỔ PHẦN SXTM MẠNH PHÚC";
const COMPANY_INFO_DEFAULT = {
  name: "CÔNG TY TNHH SUẤT ĂN CÔNG NGHIỆP SKY",
  taxCode: "3603093461",
  address: "KCN Nhơn Trạch, Đồng Nai",
  phone: "0251 3930 568",
  logoUrl: "",
};

const FORM_ALIAS = {
  giai_trinh_su_co: "giai-trinh-su-co",
  bien_ban_vi_pham: "bien-ban-vi-pham",
  bien_ban_lam_viec: "bien-ban-lam-viec",
  bien_ban_cuoc_hop: "bien-ban-cuoc-hop",
  van_ban_giai_trinh: "van-ban-giai-trinh",
  to_tuong_trinh: "to-tuong-trinh",
  thong_bao_noi_bo: "thong-bao-noi-bo",
  thong_bao_xu_ly_vi_pham: "thong-bao-xu-ly-vi-pham",
  de_nghi_thanh_toan: "de-nghi-thanh-toan",
  de_nghi_mua_hang: "de-nghi-mua-hang",
  chi_phi_phat_sinh: "chi-phi-phat-sinh",
  ban_giao_cong_viec: "ban-giao-cong-viec",
  de_xuat: "de-xuat",
};

const FORM_DEFS = [
  {
    type: "giai-trinh-su-co",
    label: "Giải trình sự cố",
    titlePrint: "VĂN BẢN GIẢI TRÌNH SỰ CỐ",
    fields: [
      { key: "kinhGui", label: "Kính gửi", type: "text" },
      { key: "noiDungSuCo", label: "Nội dung sự cố", type: "textarea" },
      { key: "dienBienSuViec", label: "Diễn biến sự việc", type: "textarea" },
      { key: "ketLuanNguyenNhan", label: "Kết luận nguyên nhân", type: "textarea" },
      { key: "bienPhapKhacPhuc", label: "Biện pháp khắc phục", type: "textarea" },
      { key: "camKet", label: "Cam kết", type: "textarea" },
      { key: "daiDienCongTy", label: "Đại diện công ty", type: "text" },
    ],
  },
  {
    type: "bien-ban-vi-pham",
    label: "Biên bản vi phạm",
    titlePrint: "BIÊN BẢN VI PHẠM",
    fields: [
      { key: "gioNgayLap", label: "Giờ/ngày lập", type: "datetime-local" },
      { key: "diaDiemLap", label: "Địa điểm lập", type: "text" },
      { key: "nguoiLapBienBan", label: "Người lập biên bản", type: "text" },
      { key: "chucVuNguoiLap", label: "Chức vụ người lập", type: "text" },
      { key: "nguoiBiLapBienBan", label: "Người bị lập biên bản", type: "text" },
      { key: "chucVuNguoiBiLap", label: "Chức vụ người bị lập", type: "text" },
      { key: "nguoiChungKien", label: "Người chứng kiến", type: "text" },
      { key: "lanhDaoDonVi", label: "Lãnh đạo đơn vị", type: "text" },
      { key: "thoiGianDiaDiemVuViec", label: "Thời gian, địa điểm xảy ra vụ việc", type: "textarea" },
      { key: "noiDungViPham", label: "Nội dung vi phạm", type: "textarea" },
      { key: "hinhThucPhatViPham", label: "Hình thức phạt vi phạm", type: "textarea" },
      { key: "yKienNguoiBiLap", label: "Ý kiến người bị lập biên bản nếu có", type: "textarea" },
    ],
  },
  {
    type: "thong-bao-noi-bo",
    label: "Thông báo nội bộ",
    titlePrint: "THÔNG BÁO NỘI BỘ",
    fields: [
      { key: "soThongBao", label: "Số thông báo", type: "text" },
      { key: "maVanBan", label: "Mã văn bản", type: "text" },
      { key: "phienBan", label: "Phiên bản", type: "text" },
      { key: "ngayBanHanh", label: "Ngày ban hành", type: "date" },
      { key: "ngayHieuLuc", label: "Ngày hiệu lực", type: "date" },
      { key: "canCuBanHanh", label: "Căn cứ ban hành", type: "text" },
      { key: "nguoiLap", label: "Người lập", type: "text" },
      { key: "nguoiPheDuyet", label: "Người phê duyệt", type: "text" },
      { key: "boPhanKhuVuc", label: "Bộ phận / khu vực", type: "text" },
      { key: "doiTuongApDung", label: "Đối tượng áp dụng", type: "text" },
      { key: "noiNhan", label: "Nơi nhận", type: "text" },
      { key: "tieuDeThongBao", label: "Tiêu đề thông báo", type: "text" },
      { key: "noiDungThongBao", label: "Nội dung thông báo", type: "textarea" },
      { key: "yeuCauThucHien", label: "Yêu cầu thực hiện", type: "textarea" },
      { key: "thoiGianApDung", label: "Thời gian áp dụng", type: "text" },
      { key: "nguoiPhuTrachTheoDoi", label: "Người phụ trách theo dõi", type: "text" },
    ],
  },
  {
    type: "thong-bao-xu-ly-vi-pham",
    label: "Thông báo xử lý vi phạm",
    titlePrint: "THÔNG BÁO XỬ LÝ VI PHẠM",
    fields: [
      { key: "soThongBao", label: "Số thông báo", type: "text" },
      { key: "maVanBan", label: "Mã văn bản", type: "text" },
      { key: "phienBan", label: "Phiên bản", type: "text" },
      { key: "ngayBanHanh", label: "Ngày ban hành", type: "date" },
      { key: "ngayHieuLuc", label: "Ngày hiệu lực", type: "date" },
      { key: "canCuXuLy", label: "Căn cứ xử lý", type: "text" },
      { key: "nguoiLap", label: "Người lập", type: "text" },
      { key: "nguoiPheDuyet", label: "Người phê duyệt", type: "text" },
      { key: "boPhanKhuVuc", label: "Bộ phận / khu vực", type: "text" },
      { key: "nhanSuViPham", label: "Nhân sự vi phạm", type: "text" },
      { key: "boPhanViPham", label: "Bộ phận vi phạm", type: "text" },
      { key: "mucDoViPham", label: "Mức độ vi phạm", type: "text" },
      { key: "taiPham", label: "Tái phạm", type: "text" },
      { key: "maBienBanLienQuan", label: "Mã biên bản liên quan", type: "text" },
      { key: "thoiGianViPham", label: "Thời gian vi phạm", type: "text" },
      { key: "noiDungViPham", label: "Nội dung vi phạm", type: "textarea" },
      { key: "hinhThucXuLy", label: "Hình thức xử lý", type: "textarea" },
      { key: "yeuCauKhacPhuc", label: "Yêu cầu khắc phục", type: "textarea" },
      { key: "thoiHanThucHien", label: "Thời hạn thực hiện", type: "text" },
      { key: "nguoiTheoDoi", label: "Người theo dõi", type: "text" },
      { key: "kenhPhanHoi", label: "Kênh phản hồi/khiếu nại", type: "text" },
      { key: "thoiHanPhanHoi", label: "Thời hạn phản hồi", type: "text" },
    ],
  },
  {
    type: "de-nghi-thanh-toan",
    label: "Đề nghị thanh toán",
    titlePrint: "ĐỀ NGHỊ THANH TOÁN",
    fields: [
      { key: "ngayDeNghi", label: "Ngày đề nghị", type: "date" },
      { key: "nguoiDeNghi", label: "Người đề nghị", type: "text" },
      { key: "boPhan", label: "Bộ phận", type: "text" },
      { key: "site", label: "Khu vực / Site", type: "text" },
      { key: "noiDungThanhToan", label: "Nội dung thanh toán", type: "textarea" },
      { key: "soTien", label: "Số tiền", type: "number" },
      { key: "hinhThucThanhToan", label: "Hình thức thanh toán", type: "text" },
      { key: "chungTuKemTheo", label: "Chứng từ kèm theo", type: "textarea" },
      { key: "nguoiDuyet", label: "Người duyệt", type: "text" },
    ],
  },
  {
    type: "de-nghi-mua-hang",
    label: "Đề nghị mua hàng",
    titlePrint: "ĐỀ NGHỊ MUA HÀNG",
    fields: [
      { key: "ngayDeNghi", label: "Ngày đề nghị", type: "date" },
      { key: "nguoiDeNghi", label: "Người đề nghị", type: "text" },
      { key: "boPhan", label: "Bộ phận", type: "text" },
      { key: "site", label: "Khu vực / Site", type: "text" },
      { key: "tenHangHoaDichVu", label: "Tên hàng hóa / dịch vụ", type: "text" },
      { key: "soLuong", label: "Số lượng", type: "number" },
      { key: "duKienChiPhi", label: "Dự kiến chi phí", type: "number" },
      { key: "lyDoMua", label: "Lý do mua", type: "textarea" },
      { key: "thoiGianCan", label: "Thời gian cần", type: "text" },
      { key: "nguoiDuyet", label: "Người duyệt", type: "text" },
    ],
  },
  {
    type: "chi-phi-phat-sinh",
    label: "Xác nhận chi phí phát sinh",
    titlePrint: "XÁC NHẬN CHI PHÍ PHÁT SINH",
    fields: [
      { key: "ngayDeNghi", label: "Ngày đề nghị", type: "date" },
      { key: "nguoiDeNghi", label: "Người đề nghị", type: "text" },
      { key: "boPhan", label: "Bộ phận", type: "text" },
      { key: "site", label: "Khu vực / Site", type: "text" },
      { key: "noiDungPhatSinh", label: "Nội dung phát sinh", type: "textarea" },
      { key: "nguyenNhanPhatSinh", label: "Nguyên nhân phát sinh", type: "textarea" },
      { key: "soTienPhatSinh", label: "Số tiền phát sinh", type: "number" },
      { key: "nguoiXacNhan", label: "Người xác nhận", type: "text" },
      { key: "nguoiPheDuyet", label: "Người phê duyệt", type: "text" },
      { key: "ghiChu", label: "Ghi chú", type: "textarea" },
    ],
  },
  {
    type: "to-tuong-trinh",
    label: "Tờ tường trình",
    titlePrint: "TỜ TƯỜNG TRÌNH",
    fields: [
      { key: "kinhGui", label: "Kính gửi", type: "text" },
      { key: "nguoiTuongTrinh", label: "Người tường trình", type: "text" },
      { key: "boPhan", label: "Bộ phận", type: "text" },
      { key: "chucVu", label: "Chức vụ", type: "text" },
      { key: "site", label: "Khu vực / Site", type: "text" },
      { key: "thoiGianSuViec", label: "Thời gian xảy ra sự việc", type: "text" },
      { key: "diaDiemSuViec", label: "Địa điểm xảy ra sự việc", type: "text" },
      { key: "noiDungSuViec", label: "Nội dung sự việc", type: "textarea" },
      { key: "nguyenNhanCaNhan", label: "Nguyên nhân theo trình bày cá nhân", type: "textarea" },
      { key: "trachNhiem", label: "Trách nhiệm cá nhân / liên quan", type: "textarea" },
      { key: "huongKhacPhuc", label: "Hướng khắc phục đề xuất", type: "textarea" },
      { key: "camKet", label: "Cam kết", type: "textarea" },
    ],
  },
  {
    type: "bien-ban-cuoc-hop",
    label: "Biên bản cuộc họp",
    titlePrint: "BIÊN BẢN CUỘC HỌP",
    fields: [
      { key: "thoiGianHop", label: "Thời gian", type: "datetime-local" },
      { key: "diaDiemHop", label: "Địa điểm", type: "text" },
      { key: "chuTriHop", label: "Chủ trì", type: "text" },
      { key: "thuKyHop", label: "Thư ký", type: "text" },
      { key: "noiDungCuocHop", label: "Nội dung cuộc họp", type: "textarea" },
      { key: "ketLuanCuocHop", label: "Kết luận", type: "textarea" },
      { key: "kyChuTriHop", label: "Chủ trì", type: "text" },
      { key: "kyThuKyHop", label: "Thư ký", type: "text" },
    ],
  },
  {
    type: "bien-ban-lam-viec",
    label: "Biên bản làm việc",
    titlePrint: "BIÊN BẢN LÀM VIỆC",
    fields: [
      { key: "thoiGianLamViec", label: "Thời gian làm việc", type: "datetime-local" },
      { key: "diaDiemLamViec", label: "Địa điểm", type: "text" },
      { key: "daiDienBenA", label: "Đại diện bên A", type: "text" },
      { key: "daiDienBenB", label: "Đại diện bên B", type: "text" },
      { key: "noiDungTraoDoi", label: "Nội dung trao đổi", type: "textarea" },
      { key: "ketLuanThongNhat", label: "Kết luận / thống nhất", type: "textarea" },
      { key: "kyDaiDienBenA", label: "Đại diện bên A", type: "text" },
      { key: "kyDaiDienBenB", label: "Đại diện bên B", type: "text" },
      { key: "kyNguoiLapBienBan", label: "Người lập biên bản", type: "text" },
    ],
  },
  {
    type: "ban-giao-cong-viec",
    label: "Bàn giao công việc",
    titlePrint: "BIÊN BẢN BÀN GIAO CÔNG VIỆC",
    fields: [
      { key: "nguoiBanGiao", label: "Người bàn giao", type: "text" },
      { key: "nguoiNhanBanGiao", label: "Người nhận bàn giao", type: "text" },
      { key: "boPhanKhuVuc", label: "Bộ phận / khu vực", type: "text" },
      { key: "thoiGianBanGiao", label: "Thời gian bàn giao", type: "datetime-local" },
      { key: "noiDungCongViecBanGiao", label: "Nội dung công việc bàn giao", type: "textarea" },
      { key: "tinhTrangCongViec", label: "Tình trạng công việc", type: "textarea" },
      { key: "hoSoTaiSanCongCu", label: "Hồ sơ / tài sản / công cụ kèm theo", type: "textarea" },
      { key: "vanDeTonDong", label: "Vấn đề tồn đọng", type: "textarea" },
      { key: "camKetBenNhan", label: "Cam kết của bên nhận bàn giao", type: "textarea" },
    ],
  },
  {
    type: "de-xuat",
    label: "Đề xuất",
    titlePrint: "TỜ TRÌNH ĐỀ XUẤT",
    fields: [
      { key: "nguoiDeXuat", label: "Người đề xuất", type: "text" },
      { key: "boPhan", label: "Bộ phận", type: "text" },
      { key: "noiDungDeXuat", label: "Nội dung đề xuất", type: "textarea" },
      { key: "lyDoDeXuat", label: "Lý do đề xuất", type: "textarea" },
      { key: "chiPhiDuKien", label: "Chi phí dự kiến", type: "number" },
      { key: "thoiGianCanThucHien", label: "Thời gian cần thực hiện", type: "text" },
      { key: "nguoiDuyet", label: "Người duyệt", type: "text" },
      { key: "ghiChu", label: "Ghi chú", type: "textarea" },
    ],
  },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function vnDateText(iso) {
  const [y, m, d] = String(iso || "").split("-");
  if (!y || !m || !d) return iso || "……";
  return `${d}/${m}/${y}`;
}

function toActiveForm(value) {
  if (!value) return "giai-trinh-su-co";
  if (FORM_DEFS.some((x) => x.type === value)) return value;
  return FORM_ALIAS[value] || "giai-trinh-su-co";
}

function normalizeRecord(raw) {
  const activeForm = toActiveForm(raw.formType);
  const def = FORM_DEFS.find((x) => x.type === activeForm) || FORM_DEFS[0];
  const incomingCompany = raw.companyInfo && typeof raw.companyInfo === "object" ? raw.companyInfo : {};
  const normalizedCompanyName = String(incomingCompany.name || "").trim();
  const companyInfo = {
    ...COMPANY_INFO_DEFAULT,
    ...incomingCompany,
    name: !normalizedCompanyName || normalizedCompanyName === LEGACY_COMPANY_NAME ? COMPANY_INFO_DEFAULT.name : normalizedCompanyName,
  };
  return {
    id: raw.id || uid(),
    formGroup: raw.formGroup || "",
    formType: activeForm,
    formTitle: raw.formTitle || def.label,
    createdDate: raw.createdDate || todayIso(),
    commonFields: raw.commonFields && typeof raw.commonFields === "object" ? raw.commonFields : { createdBy: "", department: "", site: "", customer: "" },
    fields: raw.fields && typeof raw.fields === "object" ? raw.fields : {},
    updatedAt: raw.updatedAt || new Date().toISOString(),
    companyInfo,
  };
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord);
  } catch {
    return [];
  }
}

function saveHistory(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function createEmptyRecord(type, date) {
  const activeForm = toActiveForm(type);
  const def = FORM_DEFS.find((x) => x.type === activeForm) || FORM_DEFS[0];
  return normalizeRecord({
    id: uid(),
    formGroup: "",
    formType: activeForm,
    formTitle: def.label,
    createdDate: date,
    commonFields: { createdBy: "", department: "", site: "", customer: "" },
    fields: {},
  });
}

function signatureBlocks(type) {
  const base = ["Người lập", "Người xác nhận / Người duyệt"];
  if (["giai-trinh-su-co", "bien-ban-vi-pham"].includes(type)) base.push("Đại diện công ty");
  return base;
}

function fillLine(value) {
  const text = String(value || "").trim();
  return text || "................................................................................................................";
}

function fillLineNotice(value, dots = 56) {
  const text = String(value || "").trim();
  return text || ".".repeat(dots);
}

function createWorkPlanRow() {
  return {
    noiDungCongViec: "",
    nguoiPhuTrach: "",
    thoiHan: "",
    ghiChu: "",
  };
}

function createParticipantRow() {
  return {
    hoTen: "",
    boPhan: "",
    vaiTro: "",
  };
}

function createActionRow() {
  return {
    noiDungCongViec: "",
    nguoiPhuTrach: "",
    deadline: "",
    ghiChu: "",
  };
}

function createKhacPhucRow() {
  return {
    noiDungKhacPhuc: "",
    nguoiPhuTrach: "",
    thoiHan: "",
    nguoiGiamSat: "",
  };
}

export default function BieuMau({
  initialType = "giai_trinh_su_co",
  activeFormGroup = "bien-ban",
  activeFormType = "bien-ban-vi-pham",
  onSelectFormType,
  formTypeOptions = [],
}) {
  const [activeForm, setActiveForm] = useState(() => toActiveForm(initialType));
  const [date, setDate] = useState(todayIso);
  const [history, setHistory] = useState(() => loadHistory());
  const [search, setSearch] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRefs = useRef({});

  const [record, setRecord] = useState(() => createEmptyRecord(toActiveForm(initialType), todayIso()));

  useEffect(() => {
    const nextForm = toActiveForm(initialType);
    setActiveForm(nextForm);
    const matched = history
      .filter((x) => x.formType === nextForm)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    if (matched) {
      setRecord(normalizeRecord(matched));
      setDate(matched.createdDate || todayIso());
      return;
    }
    setRecord(createEmptyRecord(nextForm, date));
  }, [initialType]);

  useEffect(() => {
    setRecord((prev) => normalizeRecord({ ...prev, createdDate: date }));
  }, [date]);

  useEffect(() => {
    const matched = history
      .filter((x) => x.formType === activeForm)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    if (matched) {
      setRecord(normalizeRecord(matched));
      setDate(matched.createdDate || todayIso());
      return;
    }
    setRecord(createEmptyRecord(activeForm, date));
    setPreviewMode(false);
  }, [activeForm]);

  const currentDef = useMemo(() => FORM_DEFS.find((x) => x.type === activeForm) || FORM_DEFS[0], [activeForm]);

  const orderedFieldKeys = useMemo(() => {
    const fieldKeys = currentDef.fields.filter((f) => f.type !== "textarea").map((f) => `fields.${f.key}`);
    if (activeForm === "bien-ban-vi-pham") return fieldKeys;
    return ["createdBy", "department", "site", "customer", ...fieldKeys];
  }, [activeForm, currentDef.fields]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = history.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    if (!q) return rows;
    return rows.filter((r) => {
      return [r.createdDate, r.commonFields?.createdBy, r.commonFields?.department, r.formTitle].join(" ").toLowerCase().includes(q);
    });
  }, [history, search]);

  const patchCommon = (key, value) =>
    setRecord((p) => ({
      ...p,
      commonFields: { ...(p.commonFields || {}), [key]: value },
      updatedAt: new Date().toISOString(),
    }));

  const patchField = (key, value) =>
    setRecord((p) => ({
      ...p,
      fields: { ...(p.fields || {}), [key]: value },
      updatedAt: new Date().toISOString(),
    }));

  const patchCompany = (key, value) =>
    setRecord((p) => ({
      ...p,
      companyInfo: { ...(p.companyInfo || COMPANY_INFO_DEFAULT), [key]: value },
      updatedAt: new Date().toISOString(),
    }));

  const registerRef = (key) => (el) => {
    inputRefs.current[key] = el;
  };

  const focusByKey = (key) => {
    const el = inputRefs.current[key];
    if (!el) return;
    el.focus();
    if (typeof el.select === "function") el.select();
  };

  const handleInputKeyDown = (e, key) => {
    if (e.key !== "Enter") return;
    if (e.target.tagName.toLowerCase() === "textarea") return;
    e.preventDefault();
    const idx = orderedFieldKeys.indexOf(key);
    if (idx < 0) return;
    const next = orderedFieldKeys[idx + 1];
    if (next) focusByKey(next);
  };

  const handleNew = () => {
    const next = createEmptyRecord(activeForm, date);
    setRecord(next);
    setPreviewMode(false);
  };

  const handleReset = () => {
    if (!window.confirm("Reset toàn bộ nội dung biểu mẫu hiện tại?")) return;
    setRecord(createEmptyRecord(activeForm, date));
    setPreviewMode(false);
  };

  const handleSave = () => {
    const clean = {
      id: record.id || uid(),
      formGroup: activeFormGroup || "",
      formType: activeForm,
      formTitle: currentDef.label,
      createdDate: date,
      commonFields: record.commonFields || { createdBy: "", department: "", site: "", customer: "" },
      fields: record.fields || {},
      updatedAt: new Date().toISOString(),
      companyInfo: record.companyInfo || COMPANY_INFO_DEFAULT,
    };
    const normalized = normalizeRecord({
      ...clean,
    });
    setHistory((prev) => {
      const idx = prev.findIndex((x) => x.id === normalized.id);
      const next = idx >= 0 ? prev.map((x) => (x.id === normalized.id ? normalized : x)) : [normalized, ...prev];
      saveHistory(next);
      return next;
    });
    setRecord(normalized);
    setMsg("Đã lưu biểu mẫu.");
    setTimeout(() => setMsg(""), 1500);
  };

  const loadRecord = (row) => {
    const n = normalizeRecord(row);
    setActiveForm(n.formType);
    setDate(n.createdDate);
    setRecord(n);
    setPreviewMode(false);
  };

  const handlePrint = () => {
    if (!canPrint) {
      setMsg("Chức năng bản in cho biểu mẫu này đang xây dựng.");
      setTimeout(() => setMsg(""), 1800);
      return;
    }
    setPreviewMode(true);
    setTimeout(() => window.print(), 50);
  };

  const handleExportWord = () => {
    const docNode = document.querySelector(".company-form-print > *");
    if (!docNode) {
      setMsg("Không tìm thấy nội dung để xuất Word.");
      setTimeout(() => setMsg(""), 1800);
      return;
    }
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${currentDef.label}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; color: #000; background: #fff; margin: 0; padding: 18mm; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #000; padding: 6px; vertical-align: top; }
  </style>
</head>
<body>
${docNode.outerHTML}
</body>
</html>`;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeForm || "bieu-mau"}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printTitle = currentDef.titlePrint || currentDef.label.toUpperCase();
  const signers = signatureBlocks(activeForm);
  const isViolationForm = activeForm === "bien-ban-vi-pham";
  const isExplanationForm = activeFormType === "van-ban-giai-trinh";
  const isStatementForm = activeFormType === "to-tuong-trinh";
  const isInternalNoticeForm = activeFormType === "thong-bao-noi-bo";
  const isViolationNoticeForm = activeFormType === "thong-bao-xu-ly-vi-pham";
  const isNoticeForm = isInternalNoticeForm || isViolationNoticeForm;
  const isFinancePaymentForm = activeFormType === "de-nghi-thanh-toan";
  const isFinancePurchaseForm = activeFormType === "de-nghi-mua-hang";
  const isFinanceExtraCostForm = activeFormType === "chi-phi-phat-sinh";
  const isFinanceForm = isFinancePaymentForm || isFinancePurchaseForm || isFinanceExtraCostForm;
  const isWorkMinutesForm = activeForm === "bien-ban-lam-viec";
  const isMeetingMinutesForm = activeForm === "bien-ban-cuoc-hop";
  const canPrint = isViolationForm || isExplanationForm || isStatementForm || isNoticeForm || isWorkMinutesForm || isMeetingMinutesForm || isFinanceForm;
  const isUnderConstruction = ![
    "bien-ban-vi-pham",
    "bien-ban-lam-viec",
    "bien-ban-cuoc-hop",
    "van-ban-giai-trinh",
    "to-tuong-trinh",
    "thong-bao-noi-bo",
    "thong-bao-xu-ly-vi-pham",
    "de-nghi-thanh-toan",
    "de-nghi-mua-hang",
    "chi-phi-phat-sinh",
  ].includes(activeFormType);
  const underConstructionMessage =
    activeFormGroup === "thong-bao"
      ? "Đang xây dựng biểu mẫu thông báo"
      : activeFormGroup === "tai-chinh"
      ? "Đang xây dựng biểu mẫu tài chính"
      : "Biểu mẫu đang xây dựng";
  const companyHeading = String(record.companyInfo?.name || COMPANY_INFO_DEFAULT.name).toUpperCase();
  const workPlanRows = Array.isArray(record.fields?.keHoachThucHienRows) && record.fields.keHoachThucHienRows.length > 0 ? record.fields.keHoachThucHienRows : [createWorkPlanRow()];

  const patchWorkPlanRow = (rowIdx, key, value) => {
    const nextRows = workPlanRows.map((row, idx) => (idx === rowIdx ? { ...row, [key]: value } : row));
    patchField("keHoachThucHienRows", nextRows);
  };

  const addWorkPlanRow = () => {
    patchField("keHoachThucHienRows", [...workPlanRows, createWorkPlanRow()]);
  };
  const participantRows = Array.isArray(record.fields?.thanhPhanThamDuRows) && record.fields.thanhPhanThamDuRows.length > 0 ? record.fields.thanhPhanThamDuRows : [createParticipantRow()];
  const actionRows = Array.isArray(record.fields?.actionRows) && record.fields.actionRows.length > 0 ? record.fields.actionRows : [createActionRow()];

  const patchParticipantRow = (rowIdx, key, value) => {
    const nextRows = participantRows.map((row, idx) => (idx === rowIdx ? { ...row, [key]: value } : row));
    patchField("thanhPhanThamDuRows", nextRows);
  };

  const addParticipantRow = () => {
    patchField("thanhPhanThamDuRows", [...participantRows, createParticipantRow()]);
  };

  const patchActionRow = (rowIdx, key, value) => {
    const nextRows = actionRows.map((row, idx) => (idx === rowIdx ? { ...row, [key]: value } : row));
    patchField("actionRows", nextRows);
  };

  const addActionRow = () => {
    patchField("actionRows", [...actionRows, createActionRow()]);
  };

  const explanationNgaySuViec = record.fields?.ngaySuViec || record.createdDate || "";
  const explanationDiaDiem = record.fields?.diaDiem || record.commonFields?.site || "";
  const explanationKinhGui = record.fields?.kinhGui || "";
  const explanationDienBien = record.fields?.dienBien || record.fields?.dienBienSuViec || "";
  const explanationNguyenNhan = record.fields?.nguyenNhan || record.fields?.ketLuanNguyenNhan || "";
  const explanationCamKet = record.fields?.camKet || "";
  const explanationKhacPhuc = Array.isArray(record.fields?.khacPhuc) ? record.fields.khacPhuc : [];
  const explanationKhacPhucRows =
    explanationKhacPhuc.length > 0
      ? explanationKhacPhuc
      : [createKhacPhucRow(), createKhacPhucRow(), createKhacPhucRow()];
  const patchKhacPhucRow = (rowIdx, key, value) => {
    const nextRows = explanationKhacPhucRows.map((row, idx) => (idx === rowIdx ? { ...row, [key]: value } : row));
    patchField("khacPhuc", nextRows);
  };
  const addKhacPhucRow = () => {
    patchField("khacPhuc", [...explanationKhacPhucRows, createKhacPhucRow()]);
  };
  const renderNoticeText = (value, lines = 3) => {
    const text = String(value || "").trim();
    if (text) return text;
    return Array.from({ length: lines }, () => "…………………………………………………………………………").join("\n");
  };
  const statementData = {
    kinhGui: record.fields?.kinhGui || "",
    nguoiTuongTrinh: record.fields?.nguoiTuongTrinh || "",
    boPhan: record.fields?.boPhan || "",
    chucVu: record.fields?.chucVu || "",
    site: record.fields?.site || "",
    thoiGianSuViec: record.fields?.thoiGianSuViec || "",
    diaDiemSuViec: record.fields?.diaDiemSuViec || "",
    noiDungSuViec: record.fields?.noiDungSuViec || "",
    nguyenNhanCaNhan: record.fields?.nguyenNhanCaNhan || "",
    trachNhiem: record.fields?.trachNhiem || "",
    huongKhacPhuc: record.fields?.huongKhacPhuc || "",
    camKet: record.fields?.camKet || "",
  };

  useEffect(() => {
    const explanationCls = "explanation-print-mode";
    const statementCls = "statement-print-mode";
    const noticeCls = "notice-print-mode";
    document.body.classList.remove(explanationCls, statementCls, noticeCls);
    if (previewMode && isExplanationForm) {
      document.body.classList.add(explanationCls);
      return () => document.body.classList.remove(explanationCls, statementCls, noticeCls);
    }
    if (previewMode && isStatementForm) {
      document.body.classList.add(statementCls);
      return () => document.body.classList.remove(explanationCls, statementCls, noticeCls);
    }
    if (previewMode && isNoticeForm) {
      document.body.classList.add(noticeCls);
      return () => document.body.classList.remove(explanationCls, statementCls, noticeCls);
    }
    document.body.classList.remove(explanationCls, statementCls, noticeCls);
    return undefined;
  }, [previewMode, isExplanationForm, isStatementForm, isNoticeForm]);

  return (
    <div className="company-forms-page">
      <div className="company-form-card">
        <div className="company-form-head">
          <div>
            <div className="company-form-eyebrow">SKY CATERING · BIỂU MẪU CÔNG TY</div>
            <h1>{isViolationForm || isWorkMinutesForm || isMeetingMinutesForm || isExplanationForm || isStatementForm || isNoticeForm || isFinanceForm ? currentDef.label : "BIỂU MẪU CÔNG TY"}</h1>
          </div>
          {!isViolationForm && !isWorkMinutesForm && !isMeetingMinutesForm && !isExplanationForm && !isStatementForm && !isNoticeForm && !isFinanceForm && (
            <div className="company-form-head-controls no-print">
              <label className="company-field">
                <span>Ngày lập</span>
                <input type="date" className="company-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        {!previewMode && (
          <>
            <div className="company-form-block no-print">
              <div className="company-block-title">Danh mục biểu mẫu</div>
              {formTypeOptions.length > 0 ? (
                <label className="company-field">
                  <span>Biểu mẫu con</span>
                  <select className="company-input" value={activeFormType} onChange={(e) => onSelectFormType?.(e.target.value)}>
                    {formTypeOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="company-empty">{underConstructionMessage}</div>
              )}
            </div>
            {!isUnderConstruction && isViolationForm ? (
              <>
                <div className="company-form-block company-form-block--violation-head no-print">
                  <div className="company-block-title">A. Thông tin chung</div>
                  <div className="company-form-rows company-form-rows--violation-head">
                    {[
                      ["gioNgayLap", "diaDiemLap"],
                      ["nguoiLapBienBan", "chucVuNguoiLap"],
                      ["nguoiBiLapBienBan", "chucVuNguoiBiLap"],
                    ].map((row, rowIdx) => (
                      <div key={`violation-row-${rowIdx}`} className="company-form-row company-form-row--two-cols">
                        {row.map((key) => {
                          const f = currentDef.fields.find((x) => x.key === key);
                          if (!f) return null;
                          const v = record.fields?.[f.key] ?? "";
                          const refKey = `fields.${f.key}`;
                          return (
                            <label key={f.key} className="company-field">
                              <span>{f.label}</span>
                              <input
                                className="company-input"
                                type={f.type}
                                value={v}
                                onChange={(e) => patchField(f.key, e.target.value)}
                                onKeyDown={(e) => handleInputKeyDown(e, refKey)}
                                ref={registerRef(refKey)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="company-form-block no-print">
                  <div className="company-block-title">B. Nội dung biên bản</div>
                  <div className="company-form-fields">
                    {["thoiGianDiaDiemVuViec", "noiDungViPham", "hinhThucPhatViPham", "yKienNguoiBiLap"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field wide">
                          <span>{f.label}</span>
                          <textarea className="company-textarea company-textarea--violation" rows={3} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                </div>
                
              </>
            ) : !isUnderConstruction && isInternalNoticeForm ? (
              <>
                <div className="company-form-block no-print">
                  <div className="company-block-title">A. Thông tin chung</div>
                  <div className="company-form-fields">
                    {["soThongBao", "maVanBan", "phienBan", "ngayBanHanh", "ngayHieuLuc", "canCuBanHanh", "nguoiLap", "nguoiPheDuyet", "boPhanKhuVuc", "doiTuongApDung", "noiNhan"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field">
                          <span>{f.label}</span>
                          <input className="company-input" type={f.type} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="company-form-block no-print">
                  <div className="company-block-title">B. Nội dung thông báo</div>
                  <div className="company-form-fields">
                    <label className="company-field wide">
                      <span>Tiêu đề thông báo</span>
                      <input className="company-input" value={record.fields?.tieuDeThongBao || ""} onChange={(e) => patchField("tieuDeThongBao", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Nội dung thông báo</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.noiDungThongBao || ""} onChange={(e) => patchField("noiDungThongBao", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Yêu cầu thực hiện</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.yeuCauThucHien || ""} onChange={(e) => patchField("yeuCauThucHien", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Thời gian áp dụng</span>
                      <input className="company-input" value={record.fields?.thoiGianApDung || ""} onChange={(e) => patchField("thoiGianApDung", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Người phụ trách theo dõi</span>
                      <input className="company-input" value={record.fields?.nguoiPhuTrachTheoDoi || ""} onChange={(e) => patchField("nguoiPhuTrachTheoDoi", e.target.value)} />
                    </label>
                  </div>
                </div>
              </>
            ) : !isUnderConstruction && isViolationNoticeForm ? (
              <>
                <div className="company-form-block company-form-block--notice no-print">
                  <div className="company-block-title">A. Thông tin chung</div>
                  <div className="company-form-fields">
                    {["soThongBao", "maVanBan", "phienBan", "ngayBanHanh", "ngayHieuLuc", "canCuXuLy", "nguoiLap", "nguoiPheDuyet", "boPhanKhuVuc"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field company-field--notice">
                          <span>{f.label}</span>
                          <input className="company-input" type={f.type} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="company-form-block company-form-block--notice no-print">
                  <div className="company-block-title">B. Thông tin vi phạm</div>
                  <div className="company-form-fields company-form-fields--notice-top">
                    {["nhanSuViPham", "boPhanViPham", "thoiGianViPham", "mucDoViPham", "taiPham", "maBienBanLienQuan"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field company-field--notice">
                          <span>{f.label}</span>
                          <input className="company-input" type={f.type} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                    <label className="company-field company-field--notice wide">
                      <span>Nội dung vi phạm</span>
                      <textarea className="company-textarea company-textarea--violation company-textarea--notice" rows={4} value={record.fields?.noiDungViPham || ""} onChange={(e) => patchField("noiDungViPham", e.target.value)} />
                    </label>
                    <label className="company-field company-field--notice wide">
                      <span>Hình thức xử lý</span>
                      <textarea className="company-textarea company-textarea--violation company-textarea--notice" rows={4} value={record.fields?.hinhThucXuLy || ""} onChange={(e) => patchField("hinhThucXuLy", e.target.value)} />
                    </label>
                  </div>
                </div>
                <div className="company-form-block company-form-block--notice no-print">
                  <div className="company-block-title">C. Yêu cầu sau xử lý</div>
                  <div className="company-form-fields">
                    <label className="company-field company-field--notice wide">
                      <span>Yêu cầu khắc phục</span>
                      <textarea className="company-textarea company-textarea--violation company-textarea--notice" rows={4} value={record.fields?.yeuCauKhacPhuc || ""} onChange={(e) => patchField("yeuCauKhacPhuc", e.target.value)} />
                    </label>
                    <label className="company-field company-field--notice">
                      <span>Thời hạn thực hiện</span>
                      <input className="company-input" value={record.fields?.thoiHanThucHien || ""} onChange={(e) => patchField("thoiHanThucHien", e.target.value)} />
                    </label>
                    <label className="company-field company-field--notice">
                      <span>Người theo dõi</span>
                      <input className="company-input" value={record.fields?.nguoiTheoDoi || ""} onChange={(e) => patchField("nguoiTheoDoi", e.target.value)} />
                    </label>
                    <label className="company-field company-field--notice">
                      <span>Kênh phản hồi/khiếu nại</span>
                      <input className="company-input" value={record.fields?.kenhPhanHoi || ""} onChange={(e) => patchField("kenhPhanHoi", e.target.value)} />
                    </label>
                    <label className="company-field company-field--notice">
                      <span>Thời hạn phản hồi</span>
                      <input className="company-input" value={record.fields?.thoiHanPhanHoi || ""} onChange={(e) => patchField("thoiHanPhanHoi", e.target.value)} />
                    </label>
                  </div>
                </div>
              </>
            ) : !isUnderConstruction && isFinanceForm ? (
              <>
                <div className="company-form-block no-print">
                  <div className="company-block-title">A. Thông tin chung</div>
                  <div className="company-form-fields">
                    {["ngayDeNghi", "nguoiDeNghi", "boPhan", "site"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field">
                          <span>{f.label}</span>
                          <input className="company-input" type={f.type} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {isFinancePaymentForm && (
                  <div className="company-form-block no-print">
                    <div className="company-block-title">B. Đề nghị thanh toán</div>
                    <div className="company-form-fields">
                      <label className="company-field wide">
                        <span>Nội dung thanh toán</span>
                        <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.noiDungThanhToan || ""} onChange={(e) => patchField("noiDungThanhToan", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Số tiền</span>
                        <input className="company-input" type="number" value={record.fields?.soTien || ""} onChange={(e) => patchField("soTien", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Hình thức thanh toán</span>
                        <input className="company-input" value={record.fields?.hinhThucThanhToan || ""} onChange={(e) => patchField("hinhThucThanhToan", e.target.value)} />
                      </label>
                      <label className="company-field wide">
                        <span>Chứng từ kèm theo</span>
                        <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.chungTuKemTheo || ""} onChange={(e) => patchField("chungTuKemTheo", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Người duyệt</span>
                        <input className="company-input" value={record.fields?.nguoiDuyet || ""} onChange={(e) => patchField("nguoiDuyet", e.target.value)} />
                      </label>
                    </div>
                  </div>
                )}

                {isFinancePurchaseForm && (
                  <div className="company-form-block no-print">
                    <div className="company-block-title">C. Đề nghị mua hàng</div>
                    <div className="company-form-fields">
                      <label className="company-field wide">
                        <span>Tên hàng hóa / dịch vụ</span>
                        <input className="company-input" value={record.fields?.tenHangHoaDichVu || ""} onChange={(e) => patchField("tenHangHoaDichVu", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Số lượng</span>
                        <input className="company-input" type="number" value={record.fields?.soLuong || ""} onChange={(e) => patchField("soLuong", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Dự kiến chi phí</span>
                        <input className="company-input" type="number" value={record.fields?.duKienChiPhi || ""} onChange={(e) => patchField("duKienChiPhi", e.target.value)} />
                      </label>
                      <label className="company-field wide">
                        <span>Lý do mua</span>
                        <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.lyDoMua || ""} onChange={(e) => patchField("lyDoMua", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Thời gian cần</span>
                        <input className="company-input" value={record.fields?.thoiGianCan || ""} onChange={(e) => patchField("thoiGianCan", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Người duyệt</span>
                        <input className="company-input" value={record.fields?.nguoiDuyet || ""} onChange={(e) => patchField("nguoiDuyet", e.target.value)} />
                      </label>
                    </div>
                  </div>
                )}

                {isFinanceExtraCostForm && (
                  <div className="company-form-block no-print">
                    <div className="company-block-title">D. Xác nhận chi phí phát sinh</div>
                    <div className="company-form-fields">
                      <label className="company-field wide">
                        <span>Nội dung phát sinh</span>
                        <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.noiDungPhatSinh || ""} onChange={(e) => patchField("noiDungPhatSinh", e.target.value)} />
                      </label>
                      <label className="company-field wide">
                        <span>Nguyên nhân phát sinh</span>
                        <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.nguyenNhanPhatSinh || ""} onChange={(e) => patchField("nguyenNhanPhatSinh", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Số tiền phát sinh</span>
                        <input className="company-input" type="number" value={record.fields?.soTienPhatSinh || ""} onChange={(e) => patchField("soTienPhatSinh", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Người xác nhận</span>
                        <input className="company-input" value={record.fields?.nguoiXacNhan || ""} onChange={(e) => patchField("nguoiXacNhan", e.target.value)} />
                      </label>
                      <label className="company-field">
                        <span>Người phê duyệt</span>
                        <input className="company-input" value={record.fields?.nguoiPheDuyet || ""} onChange={(e) => patchField("nguoiPheDuyet", e.target.value)} />
                      </label>
                      <label className="company-field wide">
                        <span>Ghi chú</span>
                        <textarea className="company-textarea company-textarea--violation" rows={4} value={record.fields?.ghiChu || ""} onChange={(e) => patchField("ghiChu", e.target.value)} />
                      </label>
                    </div>
                  </div>
                )}
              </>
            ) : !isUnderConstruction && isStatementForm ? (
              <>
                <div className="company-form-block no-print">
                  <div className="company-block-title">A. Thông tin chung</div>
                  <div className="company-form-fields">
                    <label className="company-field">
                      <span>Kính gửi</span>
                      <input className="company-input" value={statementData.kinhGui} onChange={(e) => patchField("kinhGui", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Ngày lập</span>
                      <input className="company-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Người tường trình</span>
                      <input className="company-input" value={statementData.nguoiTuongTrinh} onChange={(e) => patchField("nguoiTuongTrinh", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Bộ phận</span>
                      <input className="company-input" value={statementData.boPhan} onChange={(e) => patchField("boPhan", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Chức vụ</span>
                      <input className="company-input" value={statementData.chucVu} onChange={(e) => patchField("chucVu", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Khu vực / Site</span>
                      <input className="company-input" value={statementData.site} onChange={(e) => patchField("site", e.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">B. Nội dung tường trình</div>
                  <div className="company-form-fields">
                    <label className="company-field">
                      <span>Thời gian xảy ra sự việc</span>
                      <input className="company-input" value={statementData.thoiGianSuViec} onChange={(e) => patchField("thoiGianSuViec", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Địa điểm xảy ra sự việc</span>
                      <input className="company-input" value={statementData.diaDiemSuViec} onChange={(e) => patchField("diaDiemSuViec", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Nội dung sự việc</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={statementData.noiDungSuViec} onChange={(e) => patchField("noiDungSuViec", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Nguyên nhân theo trình bày cá nhân</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={statementData.nguyenNhanCaNhan} onChange={(e) => patchField("nguyenNhanCaNhan", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Trách nhiệm cá nhân / liên quan</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={statementData.trachNhiem} onChange={(e) => patchField("trachNhiem", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Hướng khắc phục đề xuất</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={statementData.huongKhacPhuc} onChange={(e) => patchField("huongKhacPhuc", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Cam kết</span>
                      <textarea className="company-textarea company-textarea--violation" rows={4} value={statementData.camKet} onChange={(e) => patchField("camKet", e.target.value)} />
                    </label>
                  </div>
                </div>
              </>
            ) : !isUnderConstruction && isExplanationForm ? (
              <>
                <div className="company-form-block no-print">
                  <div className="company-block-title">A. Thông tin</div>
                  <div className="company-form-fields">
                    <label className="company-field">
                      <span>Ngày sự việc</span>
                      <input className="company-input" type="date" value={record.fields?.ngaySuViec || ""} onChange={(e) => patchField("ngaySuViec", e.target.value)} />
                    </label>
                    <label className="company-field">
                      <span>Địa điểm</span>
                      <input className="company-input" value={record.fields?.diaDiem || ""} onChange={(e) => patchField("diaDiem", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>Kính gửi</span>
                      <input className="company-input" value={record.fields?.kinhGui || ""} onChange={(e) => patchField("kinhGui", e.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">B. Nội dung giải trình</div>
                  <div className="company-form-fields">
                    <label className="company-field wide">
                      <span>I. Diễn biến sự việc</span>
                      <textarea className="company-textarea company-textarea--violation" rows={3} value={record.fields?.dienBien || ""} onChange={(e) => patchField("dienBien", e.target.value)} />
                    </label>
                    <label className="company-field wide">
                      <span>II. Kết luận nguyên nhân</span>
                      <textarea className="company-textarea company-textarea--violation" rows={3} value={record.fields?.nguyenNhan || ""} onChange={(e) => patchField("nguyenNhan", e.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">C. Biện pháp khắc phục</div>
                  <div className="company-workplan-wrap">
                    <table className="company-workplan-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Nội dung khắc phục</th>
                          <th>Người phụ trách</th>
                          <th>Thời hạn</th>
                          <th>Người giám sát</th>
                        </tr>
                      </thead>
                      <tbody>
                        {explanationKhacPhucRows.map((row, rowIdx) => (
                          <tr key={`khac-phuc-${rowIdx}`}>
                            <td>{rowIdx + 1}</td>
                            <td>
                              <input className="company-input" value={row.noiDungKhacPhuc || ""} onChange={(e) => patchKhacPhucRow(rowIdx, "noiDungKhacPhuc", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.nguoiPhuTrach || ""} onChange={(e) => patchKhacPhucRow(rowIdx, "nguoiPhuTrach", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" type="date" value={row.thoiHan || ""} onChange={(e) => patchKhacPhucRow(rowIdx, "thoiHan", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.nguoiGiamSat || ""} onChange={(e) => patchKhacPhucRow(rowIdx, "nguoiGiamSat", e.target.value)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="company-btn company-btn--ghost company-workplan-add" onClick={addKhacPhucRow}>
                    + Thêm dòng
                  </button>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">D. Cam kết</div>
                  <label className="company-field">
                    <span>Nội dung cam kết</span>
                    <textarea className="company-textarea company-textarea--violation" rows={3} value={record.fields?.camKet || ""} onChange={(e) => patchField("camKet", e.target.value)} />
                  </label>
                </div>
              </>
            ) : !isUnderConstruction && isWorkMinutesForm ? (
              <>
                <div className="company-form-block no-print">
                  <div className="company-block-title">A. Thông tin chung</div>
                  <div className="company-form-fields">
                    {["thoiGianLamViec", "diaDiemLamViec", "daiDienBenA", "daiDienBenB"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      const refKey = `fields.${f.key}`;
                      return (
                        <label key={f.key} className="company-field">
                          <span>{f.label}</span>
                          <input
                            className="company-input"
                            type={f.type}
                            value={v}
                            onChange={(e) => patchField(f.key, e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, refKey)}
                            ref={registerRef(refKey)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">B. Nội dung làm việc</div>
                  <div className="company-form-fields">
                    {["noiDungTraoDoi", "ketLuanThongNhat"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field wide">
                          <span>{f.label}</span>
                          <textarea className="company-textarea company-textarea--violation" rows={3} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">C. Kế hoạch thực hiện</div>
                  <div className="company-workplan-wrap">
                    <table className="company-workplan-table">
                      <thead>
                        <tr>
                          <th>Nội dung công việc</th>
                          <th>Người phụ trách</th>
                          <th>Thời hạn</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workPlanRows.map((row, rowIdx) => (
                          <tr key={`work-plan-${rowIdx}`}>
                            <td>
                              <input className="company-input" value={row.noiDungCongViec || ""} onChange={(e) => patchWorkPlanRow(rowIdx, "noiDungCongViec", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.nguoiPhuTrach || ""} onChange={(e) => patchWorkPlanRow(rowIdx, "nguoiPhuTrach", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" type="date" value={row.thoiHan || ""} onChange={(e) => patchWorkPlanRow(rowIdx, "thoiHan", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.ghiChu || ""} onChange={(e) => patchWorkPlanRow(rowIdx, "ghiChu", e.target.value)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="company-btn company-btn--ghost company-workplan-add" onClick={addWorkPlanRow}>
                    + Thêm dòng
                  </button>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">D. Ký xác nhận</div>
                  <div className="company-form-fields">
                    {["kyDaiDienBenA", "kyDaiDienBenB", "kyNguoiLapBienBan"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      const refKey = `fields.${f.key}`;
                      return (
                        <label key={f.key} className="company-field">
                          <span>{f.label}</span>
                          <input
                            className="company-input"
                            type={f.type}
                            value={v}
                            onChange={(e) => patchField(f.key, e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, refKey)}
                            ref={registerRef(refKey)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : !isUnderConstruction && isMeetingMinutesForm ? (
              <>
                <div className="company-form-block no-print">
                  <div className="company-block-title">A. Thông tin</div>
                  <div className="company-form-fields">
                    {["thoiGianHop", "diaDiemHop", "chuTriHop", "thuKyHop"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      const refKey = `fields.${f.key}`;
                      return (
                        <label key={f.key} className="company-field">
                          <span>{f.label}</span>
                          <input
                            className="company-input"
                            type={f.type}
                            value={v}
                            onChange={(e) => patchField(f.key, e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, refKey)}
                            ref={registerRef(refKey)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">B. Thành phần tham dự</div>
                  <div className="company-workplan-wrap">
                    <table className="company-workplan-table">
                      <thead>
                        <tr>
                          <th>Họ tên</th>
                          <th>Bộ phận</th>
                          <th>Vai trò</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participantRows.map((row, rowIdx) => (
                          <tr key={`participant-${rowIdx}`}>
                            <td>
                              <input className="company-input" value={row.hoTen || ""} onChange={(e) => patchParticipantRow(rowIdx, "hoTen", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.boPhan || ""} onChange={(e) => patchParticipantRow(rowIdx, "boPhan", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.vaiTro || ""} onChange={(e) => patchParticipantRow(rowIdx, "vaiTro", e.target.value)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="company-btn company-btn--ghost company-workplan-add" onClick={addParticipantRow}>
                    + Thêm dòng
                  </button>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">C. Nội dung</div>
                  <div className="company-form-fields">
                    {["noiDungCuocHop", "ketLuanCuocHop"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      return (
                        <label key={f.key} className="company-field wide">
                          <span>{f.label}</span>
                          <textarea className="company-textarea company-textarea--violation" rows={3} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">D. Action</div>
                  <div className="company-workplan-wrap">
                    <table className="company-workplan-table">
                      <thead>
                        <tr>
                          <th>Nội dung công việc</th>
                          <th>Người phụ trách</th>
                          <th>Deadline</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {actionRows.map((row, rowIdx) => (
                          <tr key={`action-${rowIdx}`}>
                            <td>
                              <input className="company-input" value={row.noiDungCongViec || ""} onChange={(e) => patchActionRow(rowIdx, "noiDungCongViec", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.nguoiPhuTrach || ""} onChange={(e) => patchActionRow(rowIdx, "nguoiPhuTrach", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" type="date" value={row.deadline || ""} onChange={(e) => patchActionRow(rowIdx, "deadline", e.target.value)} />
                            </td>
                            <td>
                              <input className="company-input" value={row.ghiChu || ""} onChange={(e) => patchActionRow(rowIdx, "ghiChu", e.target.value)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="company-btn company-btn--ghost company-workplan-add" onClick={addActionRow}>
                    + Thêm dòng
                  </button>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">E. Ký xác nhận</div>
                  <div className="company-form-fields">
                    {["kyChuTriHop", "kyThuKyHop"].map((key) => {
                      const f = currentDef.fields.find((x) => x.key === key);
                      if (!f) return null;
                      const v = record.fields?.[f.key] ?? "";
                      const refKey = `fields.${f.key}`;
                      return (
                        <label key={f.key} className="company-field">
                          <span>{f.label}</span>
                          <input
                            className="company-input"
                            type={f.type}
                            value={v}
                            onChange={(e) => patchField(f.key, e.target.value)}
                            onKeyDown={(e) => handleInputKeyDown(e, refKey)}
                            ref={registerRef(refKey)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : !isUnderConstruction ? (
              <>
                <div className="company-form-grid no-print">
                  <label className="company-field">
                    <span>Người lập</span>
                    <input
                      className="company-input"
                      value={record.commonFields?.createdBy || ""}
                      onChange={(e) => patchCommon("createdBy", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, "createdBy")}
                      ref={registerRef("createdBy")}
                    />
                  </label>
                  <label className="company-field">
                    <span>Bộ phận</span>
                    <input
                      className="company-input"
                      value={record.commonFields?.department || ""}
                      onChange={(e) => patchCommon("department", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, "department")}
                      ref={registerRef("department")}
                    />
                  </label>
                  <label className="company-field">
                    <span>Khu vực / Site</span>
                    <input
                      className="company-input"
                      value={record.commonFields?.site || ""}
                      onChange={(e) => patchCommon("site", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, "site")}
                      ref={registerRef("site")}
                    />
                  </label>
                  <label className="company-field">
                    <span>Khách hàng</span>
                    <input
                      className="company-input"
                      value={record.commonFields?.customer || ""}
                      onChange={(e) => patchCommon("customer", e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, "customer")}
                      ref={registerRef("customer")}
                    />
                  </label>
                </div>

                <div className="company-form-block no-print">
                  <div className="company-block-title">Nội dung biểu mẫu</div>
                  <div className="company-form-fields">
                    {currentDef.fields.map((f) => {
                      const v = record.fields?.[f.key] ?? "";
                      const refKey = `fields.${f.key}`;
                      return (
                        <label key={f.key} className={`company-field ${f.type === "textarea" ? "wide" : ""}`}>
                          <span>{f.label}</span>
                          {f.type === "textarea" ? (
                            <textarea className="company-textarea" rows={3} value={v} onChange={(e) => patchField(f.key, e.target.value)} />
                          ) : (
                            <input
                              className="company-input"
                              type={f.type}
                              value={v}
                              onChange={(e) => patchField(f.key, e.target.value)}
                              onKeyDown={(e) => handleInputKeyDown(e, refKey)}
                              ref={registerRef(refKey)}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="company-form-block no-print">
                <div className="company-empty">{underConstructionMessage}</div>
              </div>
            )}
          </>
        )}

        {!isUnderConstruction && (
          <div className="company-form-history no-print">
          <div className="company-block-title">Lịch sử biểu mẫu</div>
          <div className="company-history-top">
            <input className="company-input" placeholder="Tìm theo ngày, loại biểu mẫu, người lập..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="company-history-table-wrap">
            <table className="company-history-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Loại biểu mẫu</th>
                  <th>Người lập</th>
                  <th>Bộ phận</th>
                  <th>Cập nhật</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((r) => (
                  <tr key={r.id}>
                    <td>{vnDateText(r.createdDate)}</td>
                    <td>{r.formTitle || r.formType}</td>
                    <td>{r.commonFields?.createdBy || "……"}</td>
                    <td>{r.commonFields?.department || "……"}</td>
                    <td>{new Date(r.updatedAt).toLocaleString()}</td>
                    <td>
                      <button type="button" className="company-link" onClick={() => loadRecord(r)}>
                        Mở
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="company-empty">
                      Chưa có biểu mẫu đã lưu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {!isUnderConstruction && (
          <div className="company-form-actions no-print">
          <button type="button" className="company-btn company-btn--ghost company-btn--icon" onClick={handleNew} title="Tạo mới" aria-label="Tạo mới">
            <span aria-hidden>＋</span>
          </button>
          <button type="button" className="company-btn company-btn--primary company-btn--icon" onClick={handleSave} title="Lưu" aria-label="Lưu">
            <span aria-hidden>💾</span>
          </button>
          <button type="button" className="company-btn company-btn--ghost company-btn--icon" onClick={handleReset} title="Reset" aria-label="Reset">
            <span aria-hidden>↺</span>
          </button>
          <button
            type="button"
            className="company-btn company-btn--ghost company-btn--icon"
            title={previewMode ? "Ẩn bản in" : "Xem bản in"}
            aria-label={previewMode ? "Ẩn bản in" : "Xem bản in"}
            onClick={() => {
              if (!canPrint) {
                setMsg("Chức năng bản in cho biểu mẫu này đang xây dựng.");
                setTimeout(() => setMsg(""), 1800);
                return;
              }
              setPreviewMode((v) => !v);
            }}
          >
            <span aria-hidden>{previewMode ? "🙈" : "👁"}</span>
          </button>
          <button type="button" className="company-btn company-btn--ghost company-btn--icon" onClick={handlePrint} title="In" aria-label="In">
            <span aria-hidden>🖨</span>
          </button>
          <button type="button" className="company-btn company-btn--ghost company-btn--icon" onClick={handleExportWord} title="Xuất Word" aria-label="Xuất Word">
            <span aria-hidden>📄</span>
          </button>
          {msg ? <span className="company-msg">{msg}</span> : null}
          </div>
        )}

        {!isUnderConstruction && canPrint && <div className={`company-form-print ${previewMode ? "company-form-print--preview" : ""}`}>
          {isFinanceForm ? (
            <div className="print-explanation-document">
              <div className="print-explanation-header">
                <div className="logo">{record.companyInfo?.logoUrl ? <img className="company-logo" src={record.companyInfo.logoUrl} alt="Logo SKY" /> : "SKY"}</div>
                <div className="meta">
                  <div className="company-name">{companyHeading}</div>
                  <div className="company-sub">HỆ THỐNG VẬN HÀNH SUẤT ĂN CÔNG NGHIỆP</div>
                </div>
              </div>
              <div className="print-explanation-title">{currentDef.titlePrint || currentDef.label.toUpperCase()}</div>
              <p>
                <strong>Ngày đề nghị:</strong> {fillLine(record.fields?.ngayDeNghi || record.createdDate)}
              </p>
              <p>
                <strong>Người đề nghị:</strong> {fillLine(record.fields?.nguoiDeNghi)}
              </p>
              <p>
                <strong>Bộ phận:</strong> {fillLine(record.fields?.boPhan)}
              </p>
              <p>
                <strong>Khu vực / Site:</strong> {fillLine(record.fields?.site)}
              </p>
              {isFinancePaymentForm ? (
                <>
                  <p><strong>Nội dung thanh toán:</strong> {record.fields?.noiDungThanhToan || "……………………………………………………"}</p>
                  <p><strong>Số tiền:</strong> {fillLine(record.fields?.soTien)}</p>
                  <p><strong>Hình thức thanh toán:</strong> {fillLine(record.fields?.hinhThucThanhToan)}</p>
                  <p><strong>Chứng từ kèm theo:</strong> {record.fields?.chungTuKemTheo || "……………………………………………………"}</p>
                  <p><strong>Người duyệt:</strong> {fillLine(record.fields?.nguoiDuyet)}</p>
                </>
              ) : isFinancePurchaseForm ? (
                <>
                  <p><strong>Tên hàng hóa / dịch vụ:</strong> {fillLine(record.fields?.tenHangHoaDichVu)}</p>
                  <p><strong>Số lượng:</strong> {fillLine(record.fields?.soLuong)}</p>
                  <p><strong>Dự kiến chi phí:</strong> {fillLine(record.fields?.duKienChiPhi)}</p>
                  <p><strong>Lý do mua:</strong> {record.fields?.lyDoMua || "……………………………………………………"}</p>
                  <p><strong>Thời gian cần:</strong> {fillLine(record.fields?.thoiGianCan)}</p>
                  <p><strong>Người duyệt:</strong> {fillLine(record.fields?.nguoiDuyet)}</p>
                </>
              ) : (
                <>
                  <p><strong>Nội dung phát sinh:</strong> {record.fields?.noiDungPhatSinh || "……………………………………………………"}</p>
                  <p><strong>Nguyên nhân phát sinh:</strong> {record.fields?.nguyenNhanPhatSinh || "……………………………………………………"}</p>
                  <p><strong>Số tiền phát sinh:</strong> {fillLine(record.fields?.soTienPhatSinh)}</p>
                  <p><strong>Người xác nhận:</strong> {fillLine(record.fields?.nguoiXacNhan)}</p>
                  <p><strong>Người phê duyệt:</strong> {fillLine(record.fields?.nguoiPheDuyet)}</p>
                  <p><strong>Ghi chú:</strong> {record.fields?.ghiChu || "……………………………………………………"}</p>
                </>
              )}
              <div className="print-explanation-sign">
                <div className="sign-col">
                  <strong>NGƯỜI ĐỀ NGHỊ</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="sign-col">
                  <strong>NGƯỜI DUYỆT</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          ) : isWorkMinutesForm ? (
            <div className="print-explanation-document">
              <div className="print-explanation-header">
                <div className="logo">{record.companyInfo?.logoUrl ? <img className="company-logo" src={record.companyInfo.logoUrl} alt="Logo SKY" /> : "SKY"}</div>
                <div className="meta">
                  <div className="company-name">{companyHeading}</div>
                  <div className="company-sub">HỆ THỐNG VẬN HÀNH SUẤT ĂN CÔNG NGHIỆP</div>
                </div>
              </div>
              <div className="print-explanation-title">BIÊN BẢN LÀM VIỆC</div>
              <p>
                <strong>Thời gian làm việc:</strong> {fillLine(record.fields?.thoiGianLamViec)}
              </p>
              <p>
                <strong>Địa điểm:</strong> {fillLine(record.fields?.diaDiemLamViec)}
              </p>
              <p>
                <strong>Đại diện bên A:</strong> {fillLine(record.fields?.daiDienBenA)}
              </p>
              <p>
                <strong>Đại diện bên B:</strong> {fillLine(record.fields?.daiDienBenB)}
              </p>
              <p>
                <strong>Nội dung trao đổi:</strong> {record.fields?.noiDungTraoDoi || "……………………………………………………"}
              </p>
              <p>
                <strong>Kết luận / thống nhất:</strong> {record.fields?.ketLuanThongNhat || "……………………………………………………"}
              </p>
              <p>
                <strong>Kế hoạch thực hiện</strong>
              </p>
              <table className="print-explanation-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nội dung công việc</th>
                    <th>Người phụ trách</th>
                    <th>Thời hạn</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {workPlanRows.map((row, idx) => (
                    <tr key={`print-work-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{row.noiDungCongViec || " "}</td>
                      <td>{row.nguoiPhuTrach || " "}</td>
                      <td>{row.thoiHan || " "}</td>
                      <td>{row.ghiChu || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-explanation-sign">
                <div className="sign-col">
                  <strong>ĐẠI DIỆN BÊN A</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="sign-col">
                  <strong>ĐẠI DIỆN BÊN B</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          ) : isMeetingMinutesForm ? (
            <div className="print-explanation-document">
              <div className="print-explanation-header">
                <div className="logo">{record.companyInfo?.logoUrl ? <img className="company-logo" src={record.companyInfo.logoUrl} alt="Logo SKY" /> : "SKY"}</div>
                <div className="meta">
                  <div className="company-name">{companyHeading}</div>
                  <div className="company-sub">HỆ THỐNG VẬN HÀNH SUẤT ĂN CÔNG NGHIỆP</div>
                </div>
              </div>
              <div className="print-explanation-title">BIÊN BẢN CUỘC HỌP</div>
              <p>
                <strong>Thời gian:</strong> {fillLine(record.fields?.thoiGianHop)}
              </p>
              <p>
                <strong>Địa điểm:</strong> {fillLine(record.fields?.diaDiemHop)}
              </p>
              <p>
                <strong>Chủ trì:</strong> {fillLine(record.fields?.chuTriHop)}
              </p>
              <p>
                <strong>Thư ký:</strong> {fillLine(record.fields?.thuKyHop)}
              </p>
              <p>
                <strong>Thành phần tham dự</strong>
              </p>
              <table className="print-explanation-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ tên</th>
                    <th>Bộ phận</th>
                    <th>Vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  {participantRows.map((row, idx) => (
                    <tr key={`print-part-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{row.hoTen || " "}</td>
                      <td>{row.boPhan || " "}</td>
                      <td>{row.vaiTro || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                <strong>Nội dung cuộc họp:</strong> {record.fields?.noiDungCuocHop || "……………………………………………………"}
              </p>
              <p>
                <strong>Kết luận:</strong> {record.fields?.ketLuanCuocHop || "……………………………………………………"}
              </p>
              <p>
                <strong>Action</strong>
              </p>
              <table className="print-explanation-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nội dung công việc</th>
                    <th>Người phụ trách</th>
                    <th>Deadline</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {actionRows.map((row, idx) => (
                    <tr key={`print-act-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{row.noiDungCongViec || " "}</td>
                      <td>{row.nguoiPhuTrach || " "}</td>
                      <td>{row.deadline || " "}</td>
                      <td>{row.ghiChu || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-explanation-sign">
                <div className="sign-col">
                  <strong>CHỦ TRÌ</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="sign-col">
                  <strong>THƯ KÝ</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          ) : isNoticeForm ? (
            <div className="print-notice-document">
              <div className="print-admin-top">
                <div className="left">
                  <div><strong>{companyHeading}</strong></div>
                  <div><strong>HỆ THỐNG VẬN HÀNH SUẤT ĂN CÔNG NGHIỆP</strong></div>
                  <div className="line">Số: {fillLineNotice(record.fields?.soThongBao, 28)}</div>
                </div>
                <div className="right">
                  <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
                  <div><strong>Độc lập - Tự do - Hạnh phúc</strong></div>
                  <div className="line">...................., ngày {fillLineNotice(record.fields?.ngayBanHanh || record.createdDate, 16)}</div>
                </div>
              </div>
              <div className="print-notice-title">{isInternalNoticeForm ? "THÔNG BÁO NỘI BỘ" : "THÔNG BÁO XỬ LÝ VI PHẠM"}</div>
              <div className="print-notice-meta">
                <div><strong>Mã văn bản:</strong> {fillLineNotice(record.fields?.maVanBan, 30)}</div>
                <div><strong>Phiên bản:</strong> {fillLineNotice(record.fields?.phienBan, 20)}</div>
                <div><strong>Ngày hiệu lực:</strong> {fillLineNotice(record.fields?.ngayHieuLuc, 22)}</div>
              </div>
              <p>
                <strong>Người lập:</strong> {fillLineNotice(record.fields?.nguoiLap)}
              </p>
              <p>
                <strong>Người phê duyệt:</strong> {fillLineNotice(record.fields?.nguoiPheDuyet)}
              </p>
              <p>
                <strong>Bộ phận / khu vực:</strong> {fillLineNotice(record.fields?.boPhanKhuVuc)}
              </p>
              {isInternalNoticeForm ? (
                <>
                  <p>
                    <strong>Căn cứ ban hành:</strong> {fillLineNotice(record.fields?.canCuBanHanh)}
                  </p>
                  <p>
                    <strong>Kính gửi / Đối tượng áp dụng:</strong> {fillLineNotice(record.fields?.doiTuongApDung)}
                  </p>
                  <p>
                    <strong>Nội dung thông báo:</strong>
                  </p>
                  <pre className="print-text-block">{renderNoticeText(record.fields?.noiDungThongBao, 4)}</pre>
                  <p>
                    <strong>Yêu cầu thực hiện:</strong>
                  </p>
                  <pre className="print-text-block">{renderNoticeText(record.fields?.yeuCauThucHien, 3)}</pre>
                  <p>
                    <strong>Thời gian áp dụng:</strong> {fillLineNotice(record.fields?.thoiGianApDung)}
                  </p>
                  <p>
                    <strong>Người phụ trách theo dõi:</strong> {fillLineNotice(record.fields?.nguoiPhuTrachTheoDoi)}
                  </p>
                  <p>
                    <strong>Nơi nhận:</strong> {fillLineNotice(record.fields?.noiNhan)}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Căn cứ xử lý:</strong> {fillLineNotice(record.fields?.canCuXuLy)}
                  </p>
                  <p>
                    <strong>Nhân sự vi phạm:</strong> {fillLineNotice(record.fields?.nhanSuViPham)}
                  </p>
                  <p>
                    <strong>Bộ phận vi phạm:</strong> {fillLineNotice(record.fields?.boPhanViPham)}
                  </p>
                  <p>
                    <strong>Mức độ vi phạm:</strong> {fillLineNotice(record.fields?.mucDoViPham, 18)} | <strong>Tái phạm:</strong> {fillLineNotice(record.fields?.taiPham, 14)}
                  </p>
                  <p>
                    <strong>Mã biên bản liên quan:</strong> {fillLineNotice(record.fields?.maBienBanLienQuan)}
                  </p>
                  <p>
                    <strong>Thời gian vi phạm:</strong> {fillLineNotice(record.fields?.thoiGianViPham)}
                  </p>
                  <p>
                    <strong>Nội dung vi phạm:</strong>
                  </p>
                  <pre className="print-text-block">{renderNoticeText(record.fields?.noiDungViPham, 4)}</pre>
                  <p>
                    <strong>Hình thức xử lý:</strong>
                  </p>
                  <pre className="print-text-block">{renderNoticeText(record.fields?.hinhThucXuLy, 3)}</pre>
                  <p>
                    <strong>Yêu cầu khắc phục:</strong>
                  </p>
                  <pre className="print-text-block">{renderNoticeText(record.fields?.yeuCauKhacPhuc, 3)}</pre>
                  <p>
                    <strong>Thời hạn thực hiện:</strong> {fillLineNotice(record.fields?.thoiHanThucHien)}
                  </p>
                  <p>
                    <strong>Người theo dõi:</strong> {fillLineNotice(record.fields?.nguoiTheoDoi)}
                  </p>
                  <p>
                    <strong>Kênh phản hồi/khiếu nại:</strong> {fillLineNotice(record.fields?.kenhPhanHoi)}
                  </p>
                  <p>
                    <strong>Thời hạn phản hồi:</strong> {fillLineNotice(record.fields?.thoiHanPhanHoi)}
                  </p>
                </>
              )}
              <div className="print-notice-receivers">
                <strong>Nơi nhận:</strong> {fillLineNotice(record.fields?.noiNhan)}
              </div>
              <div className="print-notice-sign">
                <div className="sign-col">
                  <strong>NGƯỜI LẬP</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="sign-col">
                  <strong>ĐẠI DIỆN CÔNG TY</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          ) : isStatementForm ? (
            <div className="print-statement-document">
              <div className="print-statement-company">
                <div><strong>{companyHeading}</strong></div>
                <div><strong>HỆ THỐNG VẬN HÀNH SUẤT ĂN CÔNG NGHIỆP</strong></div>
              </div>

              <div className="print-statement-title">TỜ TƯỜNG TRÌNH</div>
              <p>
                <strong>Kính gửi:</strong> {fillLine(statementData.kinhGui)}
              </p>
              <p>Tôi tên là: {fillLine(statementData.nguoiTuongTrinh)}</p>
              <p>Bộ phận: {fillLine(statementData.boPhan)}</p>
              <p>Chức vụ: {fillLine(statementData.chucVu)}</p>
              <p>Khu vực/Site: {fillLine(statementData.site)}</p>
              <p>Nay tôi làm tờ tường trình này để trình bày sự việc như sau:</p>

              <p>
                <strong>1. Thời gian, địa điểm xảy ra sự việc</strong>
              </p>
              <p>{fillLine(statementData.thoiGianSuViec)} - {fillLine(statementData.diaDiemSuViec)}</p>

              <p>
                <strong>2. Nội dung sự việc</strong>
              </p>
              <p>{statementData.noiDungSuViec || "……………………………………………………"}</p>

              <p>
                <strong>3. Nguyên nhân theo trình bày cá nhân</strong>
              </p>
              <p>{statementData.nguyenNhanCaNhan || "……………………………………………………"}</p>

              <p>
                <strong>4. Trách nhiệm cá nhân/liên quan</strong>
              </p>
              <p>{statementData.trachNhiem || "……………………………………………………"}</p>

              <p>
                <strong>5. Hướng khắc phục đề xuất</strong>
              </p>
              <p>{statementData.huongKhacPhuc || "……………………………………………………"}</p>

              <p>
                <strong>6. Cam kết</strong>
              </p>
              <p>{statementData.camKet || "……………………………………………………"}</p>

              <p>Tôi xin cam đoan nội dung tường trình trên là đúng sự thật và chịu trách nhiệm về nội dung đã trình bày.</p>
              <p>Ngày ... tháng ... năm ...</p>

              <div className="print-statement-sign">
                <strong>NGƯỜI TƯỜNG TRÌNH</strong>
                <div>(Ký, ghi rõ họ tên)</div>
              </div>
            </div>
          ) : isExplanationForm ? (
            <div className="print-explanation-document">
              <div className="print-explanation-header">
                <div className="logo">
                  {record.companyInfo?.logoUrl ? <img className="company-logo" src={record.companyInfo.logoUrl} alt="Logo SKY" /> : "SKY"}
                </div>
                <div className="meta">
                  <div className="company-name">{companyHeading}</div>
                  <div className="company-sub">HỆ THỐNG VẬN HÀNH SUẤT ĂN CÔNG NGHIỆP</div>
                  <div>Địa chỉ: {record.companyInfo?.address || ""}</div>
                  <div>MST: {record.companyInfo?.taxCode || ""}</div>
                  <div>Điện thoại: {record.companyInfo?.phone || ""}</div>
                </div>
              </div>

              <div className="print-explanation-title">VĂN BẢN GIẢI TRÌNH SỰ CỐ</div>
              <div className="print-explanation-sub">V/v: Giải trình sự việc phát sinh ngày {fillLine(explanationNgaySuViec)} tại {fillLine(explanationDiaDiem)}</div>
              <p>
                <strong>Kính gửi:</strong> {fillLine(explanationKinhGui)}
              </p>
              <p>Căn cứ sự việc phát sinh trong quá trình vận hành, Công ty Sky Catering xin báo cáo và giải trình nội dung sự việc như sau:</p>

              <p>
                <strong>I. Diễn biến sự việc</strong>
              </p>
              <p>{explanationDienBien || "………………………………………………………………………………………………"}</p>

              <p>
                <strong>II. Kết luận nguyên nhân</strong>
              </p>
              <p>{explanationNguyenNhan || "………………………………………………………………………………………………"}</p>

              <p>
                <strong>III. Biện pháp khắc phục</strong>
              </p>
              <table className="print-explanation-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Nội dung khắc phục</th>
                    <th>Người phụ trách</th>
                    <th>Thời hạn</th>
                    <th>Người giám sát</th>
                  </tr>
                </thead>
                <tbody>
                  {explanationKhacPhucRows.map((row, idx) => (
                    <tr key={`ex-kp-${idx}`}>
                      <td>{idx + 1}</td>
                      <td>{row.noiDungKhacPhuc || " "}</td>
                      <td>{row.nguoiPhuTrach || " "}</td>
                      <td>{row.thoiHan || " "}</td>
                      <td>{row.nguoiGiamSat || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p>
                <strong>IV. Cam kết</strong>
              </p>
              <p>
                {explanationCamKet ||
                  "Công ty Sky Catering cam kết nghiêm túc rút kinh nghiệm, triển khai đầy đủ các biện pháp khắc phục, tăng cường kiểm tra và giám sát để hạn chế tối đa việc phát sinh sự việc tương tự trong quá trình phục vụ."}
              </p>

              <div className="print-explanation-sign">
                <div className="sign-col">
                  <strong>NGƯỜI LẬP</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
                <div className="sign-col">
                  <strong>ĐẠI DIỆN {companyHeading}</strong>
                  <div>(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          ) : isViolationForm ? (
            <div className="company-print-violation">
              <table className="company-print-violation-head">
                <tbody>
                  <tr>
                    <td className="logo">
                      {record.companyInfo?.logoUrl ? (
                        <img className="company-logo" src={record.companyInfo.logoUrl} alt="Logo SKY" />
                      ) : (
                        "SKY LOGO"
                      )}
                    </td>
                    <td className="name">{record.companyInfo?.name || COMPANY_INFO_DEFAULT.name}</td>
                  </tr>
                </tbody>
              </table>

              <div className="company-print-title">BIÊN BẢN VI PHẠM</div>

              <p>
                Vào lúc {fillLine(record.fields?.gioNgayLap)} tại {fillLine(record.fields?.diaDiemLap)}
              </p>
              <p>
                Họ tên người lập biên bản: {fillLine(record.fields?.nguoiLapBienBan)} Chức vụ: {fillLine(record.fields?.chucVuNguoiLap)}
              </p>
              <p>
                Họ tên người bị lập biên bản: {fillLine(record.fields?.nguoiBiLapBienBan)} Chức vụ: {fillLine(record.fields?.chucVuNguoiBiLap)}
              </p>

              <p>
                <strong>Tiến hành lập biên bản với những nội dung sau:</strong>
              </p>

              <p>
                <strong>1. Thời gian, địa điểm xảy ra vụ việc:</strong>
              </p>
              <p>{fillLine(record.fields?.thoiGianDiaDiemVuViec)}</p>

              <p>
                <strong>2. Nội dung vi phạm:</strong>
              </p>
              <p>{fillLine(record.fields?.noiDungViPham)}</p>

              <p>
                <strong>3. Hình thức phạt vi phạm:</strong>
              </p>
              <p>{fillLine(record.fields?.hinhThucPhatViPham)}</p>

              <p>
                <strong>4. Ý kiến của người bị lập biên bản (nếu có):</strong>
              </p>
              <p>{fillLine(record.fields?.yKienNguoiBiLap)}</p>

              <p>
                Biên bản này được lập thành 2 (hai) bản, 1 (một) bản do người lập biên bản giữ, 1 (một) bản do người bị lập biên bản giữ.
              </p>

              <table className="company-print-violation-sign">
                <thead>
                  <tr>
                    <th>Người lập biên bản</th>
                    <th>Người chứng kiến</th>
                    <th>Người bị lập biên bản</th>
                    <th>Lãnh đạo đơn vị</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>(Ký ghi rõ họ tên)</td>
                    <td>(Ký ghi rõ họ tên)</td>
                    <td>(Ký ghi rõ họ tên)</td>
                    <td>(Ký ghi rõ họ tên)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <div className="company-print-top">
                <div className="company-print-company">
                  {record.companyInfo?.logoUrl ? <img className="company-logo company-logo--top" src={record.companyInfo.logoUrl} alt="Logo SKY" /> : null}
                  <div>
                    <strong>{record.companyInfo?.name || COMPANY_INFO_DEFAULT.name}</strong>
                  </div>
                  <div>MST: {record.companyInfo?.taxCode || "……"}</div>
                  <div>Địa chỉ: {record.companyInfo?.address || "……"}</div>
                  <div>Điện thoại: {record.companyInfo?.phone || "……"}</div>
                </div>
                <div className="company-print-national">
                  <div>
                    <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>
                  </div>
                  <div>
                    <strong>Độc lập - Tự do - Hạnh phúc</strong>
                  </div>
                </div>
              </div>

              <div className="company-print-title">{printTitle}</div>
              <div className="company-print-sub">V/v: {currentDef.label} ngày {vnDateText(record.createdDate)}</div>

              <table className="company-print-info">
                <tbody>
                  <tr>
                    <td>Người lập</td>
                    <td>{record.commonFields?.createdBy || "……"}</td>
                    <td>Bộ phận</td>
                    <td>{record.commonFields?.department || "……"}</td>
                  </tr>
                  <tr>
                    <td>Khu vực / Site</td>
                    <td>{record.commonFields?.site || "……"}</td>
                    <td>Khách hàng</td>
                    <td>{record.commonFields?.customer || "……"}</td>
                  </tr>
                </tbody>
              </table>

              <p>Nội dung như sau:</p>
              <table className="company-print-fields">
                <tbody>
                  {currentDef.fields.map((f, idx) => {
                    const val = record.fields?.[f.key];
                    const text = String(val || "").trim();
                    if (!text) return null;
                    return (
                      <tr key={f.key}>
                        <td className="stt">{idx + 1}</td>
                        <td className="label">{f.label}</td>
                        <td className="value">{text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="company-print-sign">
                {signers.map((s) => (
                  <div key={s} className="company-sign-col">
                    <strong>{s.toUpperCase()}</strong>
                    <div>(Ký, ghi rõ họ tên)</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="company-print-company-edit no-print">
            <div className="company-block-title">Thông tin công ty (dùng cho bản in)</div>
            <div className="company-form-grid">
              <label className="company-field">
                <span>Tên công ty</span>
                <input className="company-input" value={record.companyInfo?.name || ""} onChange={(e) => patchCompany("name", e.target.value)} />
              </label>
              <label className="company-field">
                <span>MST</span>
                <input className="company-input" value={record.companyInfo?.taxCode || ""} onChange={(e) => patchCompany("taxCode", e.target.value)} />
              </label>
              <label className="company-field">
                <span>Địa chỉ</span>
                <input className="company-input" value={record.companyInfo?.address || ""} onChange={(e) => patchCompany("address", e.target.value)} />
              </label>
              <label className="company-field">
                <span>Điện thoại</span>
                <input className="company-input" value={record.companyInfo?.phone || ""} onChange={(e) => patchCompany("phone", e.target.value)} />
              </label>
              <label className="company-field wide">
                <span>Logo URL (dán link hoặc base64)</span>
                <input className="company-input" value={record.companyInfo?.logoUrl || ""} onChange={(e) => patchCompany("logoUrl", e.target.value)} />
              </label>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}