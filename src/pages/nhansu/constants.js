/** Danh sách bộ phận mặc định — có thể mở rộng */
export const DEFAULT_DEPARTMENTS = [
  { id: "ban-ql", name: "Ban quản lý" },
  { id: "bep", name: "Bếp" },
  { id: "doi-xe", name: "Đội xe" },
  { id: "lo-xe", name: "Lơ xe" },
  { id: "kho", name: "Kho" },
  { id: "so-che", name: "Sơ chế" },
  { id: "rua-don", name: "Rửa dọn" },
  { id: "cmc", name: "CMC" },
  { id: "mtc", name: "MTC" },
  { id: "ca-dem", name: "Ca đêm" },
];

/** Trạng thái điểm danh */
export const ATTENDANCE_STATUS = [
  { value: "present", label: "Có mặt" },
  { value: "absent", label: "Vắng" },
  { value: "leave_paid", label: "Nghỉ phép" },
  { value: "leave_unpaid", label: "Nghỉ không phép" },
  { value: "late", label: "Đi trễ" },
  { value: "short", label: "Cắt giảm" },
];

export const SHIFT_OPTIONS = ["Ca ngày", "Ca đêm", "Ca gãy"];

export const STORAGE_PREFIX = "nhansu_v1_";
