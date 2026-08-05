import { CanvasDimensionsPanel } from "./general/canvas-dimensions-panel";
import { GridColumnsPanel } from "./general/grid-columns-panel";

export function GeneralSettings() {
  return (
    <div className="space-y-4">
      <CanvasDimensionsPanel />
      <GridColumnsPanel />
    </div>
  );
}
