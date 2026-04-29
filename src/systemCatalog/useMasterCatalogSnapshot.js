import { useEffect, useMemo, useState } from "react";
import { MASTER_DATA_CHANGE, loadDepartments, loadLocations, loadRegions, loadShifts } from "./masterData.js";

export function useMasterCatalogSnapshot() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(MASTER_DATA_CHANGE, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(MASTER_DATA_CHANGE, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  return useMemo(
    () => ({
      regions: loadRegions(),
      locations: loadLocations(),
      departments: loadDepartments(),
      shifts: loadShifts(),
    }),
    [tick]
  );
}
