/** Thùng rác phẳng 2D — dùng currentColor (đỏ qua CSS nút) */
export default function IconTrash2D() {
  return (
    <svg
      className="catalog-flat-del-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M19 6l-1.05 14.1A2 2 0 0115.95 22H8.05a2 2 0 01-1.99-1.9L5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
