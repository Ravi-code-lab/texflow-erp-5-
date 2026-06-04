import React from "react";
import DeptTaskPage from "./DeptTaskPage";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";

interface Props {
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
}

export default function TaskPageWashing({ production, onUpdateWorkOrder, karigars }: Props) {
  return (
    <DeptTaskPage
      taskName="Washing"
      production={production}
      onUpdateWorkOrder={onUpdateWorkOrder}
      karigars={karigars}
    />
  );
}
