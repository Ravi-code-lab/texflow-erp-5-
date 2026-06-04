import React from "react";
import DeptTaskPage from "./DeptTaskPage";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";

interface Props {
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
}

export default function TaskPagePacking({ production, onUpdateWorkOrder, karigars }: Props) {
  return (
    <DeptTaskPage
      taskName="Packing"
      production={production}
      onUpdateWorkOrder={onUpdateWorkOrder}
      karigars={karigars}
    />
  );
}
