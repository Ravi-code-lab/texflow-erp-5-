import React from "react";
import DeptTaskPage from "./DeptTaskPage";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";

interface Props {
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
}

export default function TaskPageFinishing({ production, onUpdateWorkOrder, karigars }: Props) {
  return (
    <DeptTaskPage
      taskName="Finishing"
      production={production}
      onUpdateWorkOrder={onUpdateWorkOrder}
      karigars={karigars}
    />
  );
}
