import BaoCaoNgay from "./BaoCaoNgay";
import ModuleShell from "../components/ModuleShell.jsx";

export default function BaoCaoVanHanhBepForm(props) {
  return (
    <div className="ops-standard-page">
      <ModuleShell
        title="Báo cáo vận hành bếp"
        subtitle="Chuẩn hóa nhập liệu và theo dõi vận hành theo ca/ngày."
      />
      <BaoCaoNgay {...props} />
    </div>
  );
}
