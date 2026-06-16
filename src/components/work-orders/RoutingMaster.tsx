/**
 * RoutingMaster.tsx
 * 
 * Dynamic Style-wise Routing Master for Apparel Manufacturing.
 * Each style/category gets its own ordered process route.
 * Routes are used by WorkOrderPage to drive step-by-step production flow.
 */

import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Save, X, Edit2, Copy, ChevronUp, ChevronDown,
  Settings2, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, Package,
  Layers, GripVertical
} from "lucide-react";
import { getItem, setItem } from "../../utils/networkClient";
import type { GarmentRoutingTemplate, GarmentOperationTemplate } from "../../types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROUTING_STORAGE_KEY = "texflow_routing_templates";

export const PROCESS_TYPES = [
  // dept values MUST match WorkOrderTaskHub tab IDs exactly (single source of truth)

  // ── PRE-PRODUCTION ────────────────────────────────────────────────────────
  { id: "FABRIC_INSPECTION",  label: "Fabric Inspection",    icon: "🔍", dept: "Fabric Inspection", color: "text-lime-700",     bg: "bg-lime-50",     border: "border-lime-200" },
  { id: "SHRINKAGE_TEST",     label: "Shrinkage Test",       icon: "🧪", dept: "Fabric Inspection", color: "text-lime-800",     bg: "bg-lime-100",    border: "border-lime-300" },
  { id: "GSMLOT_TEST",        label: "GSM / Lot Test",       icon: "⚖️",  dept: "Fabric Inspection", color: "text-lime-900",     bg: "bg-lime-100",    border: "border-lime-400" },
  { id: "SPREADING",          label: "Spreading",            icon: "📐", dept: "Cutting",           color: "text-rose-600",    bg: "bg-rose-50",     border: "border-rose-200" },
  { id: "MARKER_MAKING",      label: "Marker Making",        icon: "📏", dept: "Cutting",           color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200" },

  // ── WET PROCESSING ────────────────────────────────────────────────────────
  { id: "DYEING",             label: "Dyeing",               icon: "🎨", dept: "Dyeing",            color: "text-pink-700",    bg: "bg-pink-50",     border: "border-pink-200" },
  { id: "BLEACHING",          label: "Bleaching",            icon: "🫗",  dept: "Dyeing",            color: "text-pink-600",    bg: "bg-pink-50",     border: "border-pink-200" },
  { id: "FABRIC_PRINTING",    label: "Fabric Printing",      icon: "🖨️", dept: "Printing",          color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200" },

  // ── DECORATION – FABRIC STAGE ─────────────────────────────────────────────
  { id: "EMBROIDERY_FABRIC",  label: "Embroidery (Fabric)",  icon: "🌸", dept: "Embroidery",        color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200" },
  { id: "SEQUIN_FABRIC",      label: "Sequin / Mirror Work", icon: "💎", dept: "Hand Work",         color: "text-yellow-700",  bg: "bg-yellow-50",   border: "border-yellow-200" },
  { id: "SMOCKING",           label: "Smocking",             icon: "🪡", dept: "Hand Work",         color: "text-yellow-600",  bg: "bg-yellow-50",   border: "border-yellow-200" },
  { id: "APPLIQUE_FABRIC",    label: "Appliqué (Fabric)",    icon: "🏵️", dept: "Hand Work",         color: "text-yellow-800",  bg: "bg-yellow-50",   border: "border-yellow-200" },

  // ── CUTTING ───────────────────────────────────────────────────────────────
  { id: "CUTTING",            label: "Cutting",              icon: "✂️", dept: "Cutting",           color: "text-rose-700",    bg: "bg-rose-50",     border: "border-rose-200" },
  { id: "FUSING",             label: "Fusing / Interlining", icon: "🔥", dept: "Cutting",           color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200" },
  { id: "NUMBERING",          label: "Numbering / Bundling", icon: "🔢", dept: "Cutting",           color: "text-red-600",     bg: "bg-red-50",      border: "border-red-200" },

  // ── STITCHING ─────────────────────────────────────────────────────────────
  { id: "STITCHING",          label: "Stitching",            icon: "🧵", dept: "Stitching",         color: "text-indigo-700",  bg: "bg-indigo-50",   border: "border-indigo-200" },
  { id: "OVER_LOCKING",       label: "Over Locking",         icon: "🔗", dept: "Stitching",         color: "text-indigo-600",  bg: "bg-indigo-50",   border: "border-indigo-200" },
  { id: "BUTTON_HOLE",        label: "Button Hole / Button", icon: "🔘", dept: "Stitching",         color: "text-indigo-800",  bg: "bg-indigo-50",   border: "border-indigo-200" },
  { id: "LINING_ATTACH",      label: "Lining Attachment",    icon: "🪢", dept: "Stitching",         color: "text-indigo-900",  bg: "bg-indigo-50",   border: "border-indigo-200" },
  { id: "ZIPPER_ATTACH",      label: "Zipper Attachment",    icon: "🤐", dept: "Stitching",         color: "text-slate-700",   bg: "bg-slate-50",    border: "border-slate-200" },

  // ── DECORATION – GARMENT STAGE ────────────────────────────────────────────
  { id: "EMBROIDERY_GARMENT", label: "Embroidery (Garment)", icon: "🌺", dept: "Embroidery",        color: "text-fuchsia-700", bg: "bg-fuchsia-50",  border: "border-fuchsia-200" },
  { id: "GARMENT_PRINTING",   label: "Garment Printing",     icon: "👕", dept: "Printing",          color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200" },
  { id: "SCREEN_PRINTING",    label: "Screen Printing",      icon: "🖼️", dept: "Printing",          color: "text-orange-600",  bg: "bg-orange-50",   border: "border-orange-200" },
  { id: "HEAT_TRANSFER",      label: "Heat Transfer / DTF",  icon: "♨️",  dept: "Printing",          color: "text-orange-800",  bg: "bg-orange-50",   border: "border-orange-200" },
  { id: "SUBLIMATION",        label: "Sublimation Print",    icon: "🌈", dept: "Printing",          color: "text-orange-900",  bg: "bg-orange-50",   border: "border-orange-200" },
  { id: "HAND_WORK",          label: "Hand Work",            icon: "✋", dept: "Hand Work",         color: "text-yellow-700",  bg: "bg-yellow-50",   border: "border-yellow-200" },
  { id: "PATCH_WORK",         label: "Patch Work",           icon: "🩹", dept: "Hand Work",         color: "text-yellow-900",  bg: "bg-yellow-50",   border: "border-yellow-200" },
  { id: "STONE_WORK",         label: "Stone / Rhinestone",   icon: "💠", dept: "Hand Work",         color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200" },
  { id: "LACE_ATTACH",        label: "Lace / Trim Attach",   icon: "🎀", dept: "Hand Work",         color: "text-pink-800",    bg: "bg-pink-50",     border: "border-pink-200" },

  // ── WET PROCESSING – POST STITCH ─────────────────────────────────────────
  { id: "WASHING",            label: "Washing",              icon: "🫧", dept: "Washing",           color: "text-cyan-700",    bg: "bg-cyan-50",     border: "border-cyan-200" },
  { id: "ACID_WASH",          label: "Acid / Stone Wash",    icon: "🧴", dept: "Washing",           color: "text-cyan-800",    bg: "bg-cyan-50",     border: "border-cyan-200" },
  { id: "ENZYME_WASH",        label: "Enzyme Wash",          icon: "🔬", dept: "Washing",           color: "text-cyan-900",    bg: "bg-cyan-50",     border: "border-cyan-200" },
  { id: "DRY_CLEANING",       label: "Dry Cleaning",         icon: "🧹", dept: "Washing",           color: "text-teal-600",    bg: "bg-teal-50",     border: "border-teal-200" },

  // ── FINISHING ────────────────────────────────────────────────────────────
  { id: "FINISHING",          label: "Finishing",            icon: "✨", dept: "Finishing",         color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  { id: "THREAD_CUTTING",     label: "Thread Cutting",       icon: "🪚", dept: "Finishing",         color: "text-emerald-600", bg: "bg-emerald-50",  border: "border-emerald-200" },
  { id: "IRONING",            label: "Ironing / Pressing",   icon: "🫸", dept: "Finishing",         color: "text-emerald-800", bg: "bg-emerald-50",  border: "border-emerald-200" },
  { id: "STAIN_REMOVAL",      label: "Stain Removal",        icon: "🧽", dept: "Finishing",         color: "text-emerald-900", bg: "bg-emerald-50",  border: "border-emerald-200" },
  { id: "TAGGING",            label: "Tagging / Labelling",  icon: "🏷️", dept: "Finishing",         color: "text-green-700",   bg: "bg-green-50",    border: "border-green-200" },

  // ── QUALITY ───────────────────────────────────────────────────────────────
  { id: "QC_CHECK",           label: "QC Check",             icon: "✅", dept: "QC Check",          color: "text-teal-700",    bg: "bg-teal-50",     border: "border-teal-200" },
  { id: "INLINE_QC",          label: "Inline QC",            icon: "🔎", dept: "QC Check",          color: "text-teal-600",    bg: "bg-teal-50",     border: "border-teal-200" },
  { id: "FINAL_QC",           label: "Final / AQL Inspection",icon: "📋", dept: "QC Check",         color: "text-teal-800",    bg: "bg-teal-50",     border: "border-teal-200" },
  { id: "BUYER_QC",           label: "Buyer QC / Third Party",icon: "🕵️", dept: "QC Check",         color: "text-teal-900",    bg: "bg-teal-50",     border: "border-teal-200" },

  // ── DISPATCH ──────────────────────────────────────────────────────────────
  { id: "PACKING",            label: "Packing",              icon: "📦", dept: "Packing",           color: "text-sky-700",     bg: "bg-sky-50",      border: "border-sky-200" },
  { id: "FOLDING_PACKING",    label: "Folding & Packing",    icon: "🗂️", dept: "Packing",           color: "text-sky-600",     bg: "bg-sky-50",      border: "border-sky-200" },
  { id: "CARTON_PACKING",     label: "Carton / Box Packing", icon: "📫", dept: "Packing",           color: "text-sky-800",     bg: "bg-sky-50",      border: "border-sky-200" },
  { id: "DISPATCH",           label: "Dispatch / Shipment",  icon: "🚚", dept: "Packing",           color: "text-sky-900",     bg: "bg-sky-50",      border: "border-sky-200" },

  // ── FABRIC TESTING (missing) ───────────────────────────────────────────────
  { id: "COLOUR_FASTNESS",    label: "Colour Fastness Test", icon: "🎯", dept: "Fabric Inspection", color: "text-lime-700",    bg: "bg-lime-50",     border: "border-lime-200" },
  { id: "PH_TEST",            label: "pH / Chemical Test",   icon: "⚗️", dept: "Fabric Inspection", color: "text-lime-800",    bg: "bg-lime-100",    border: "border-lime-300" },
  { id: "FABRIC_RELAXATION",  label: "Fabric Relaxation",    icon: "🪞", dept: "Fabric Inspection", color: "text-lime-900",    bg: "bg-lime-100",    border: "border-lime-400" },

  // ── CUT ROOM (missing) ────────────────────────────────────────────────────
  { id: "BAND_KNIFE",         label: "Band Knife Cutting",   icon: "🔪", dept: "Cutting",           color: "text-rose-800",    bg: "bg-rose-50",     border: "border-rose-300" },
  { id: "TICKET_LOOP",        label: "Ticket / Loop Attach", icon: "🏷️", dept: "Cutting",           color: "text-red-800",     bg: "bg-red-50",      border: "border-red-300" },

  // ── WET PROCESSING (missing) ──────────────────────────────────────────────
  { id: "MERCERIZING",        label: "Mercerizing",          icon: "💧", dept: "Dyeing",            color: "text-pink-900",    bg: "bg-pink-50",     border: "border-pink-300" },
  { id: "SANDBLASTING",       label: "Sandblasting (Denim)", icon: "🌪️", dept: "Washing",           color: "text-cyan-600",    bg: "bg-cyan-50",     border: "border-cyan-300" },

  // ── PRINTING (missing) ────────────────────────────────────────────────────
  { id: "DIGITAL_PRINT",      label: "Digital (Inkjet) Print",icon: "🖥️", dept: "Printing",         color: "text-orange-600",  bg: "bg-orange-50",   border: "border-orange-300" },
  { id: "DISCHARGE_PRINT",    label: "Discharge Printing",   icon: "🧪", dept: "Printing",          color: "text-amber-800",   bg: "bg-amber-50",    border: "border-amber-300" },
  { id: "BLOCK_PRINT",        label: "Block / Resist Print", icon: "🪵", dept: "Printing",          color: "text-amber-900",   bg: "bg-amber-50",    border: "border-amber-400" },

  // ── EMBELLISHMENT (missing) ───────────────────────────────────────────────
  { id: "BEADWORK",           label: "Bead Work",            icon: "📿", dept: "Hand Work",         color: "text-yellow-700",  bg: "bg-yellow-50",   border: "border-yellow-300" },
  { id: "TASSELS_FRINGE",     label: "Tassels / Fringe Attach",icon: "🧶",dept: "Hand Work",        color: "text-yellow-800",  bg: "bg-yellow-50",   border: "border-yellow-400" },

  // ── STITCHING (missing) ───────────────────────────────────────────────────
  { id: "BARTACKING",         label: "Bar Tacking",          icon: "📌", dept: "Stitching",         color: "text-indigo-600",  bg: "bg-indigo-50",   border: "border-indigo-300" },
  { id: "ELASTIC_ATTACH",     label: "Elastic Attachment",   icon: "🪱", dept: "Stitching",         color: "text-slate-600",   bg: "bg-slate-50",    border: "border-slate-300" },

  // ── QUALITY (missing) ─────────────────────────────────────────────────────
  { id: "FIRST_PIECE_APPROVAL",label: "First Piece Approval (FPA)", icon: "🥇", dept: "QC Check",  color: "text-teal-600",    bg: "bg-teal-50",     border: "border-teal-300" },
  { id: "END_LINE_CHECK",     label: "End-of-Line Check",    icon: "🔏", dept: "QC Check",          color: "text-teal-800",    bg: "bg-teal-50",     border: "border-teal-400" },

  // ── PACKING / DISPATCH (missing) ─────────────────────────────────────────
  { id: "POLY_BAGGING",       label: "Poly Bagging",         icon: "🛍️", dept: "Packing",           color: "text-sky-600",     bg: "bg-sky-50",      border: "border-sky-300" },
  { id: "HANGER_ATTACH",      label: "Hanger Attach",        icon: "🧥", dept: "Packing",           color: "text-sky-700",     bg: "bg-sky-50",      border: "border-sky-400" },
  { id: "BARCODE_SCAN",       label: "Barcode / RFID Scan",  icon: "📲", dept: "Packing",           color: "text-sky-800",     bg: "bg-sky-50",      border: "border-sky-500" },
];

export const PROCESS_CATEGORIES = [
  "Kurti", "Saree", "Lehenga", "Shirt", "Trouser", "T-Shirt",
  "Jacket", "Salwar Suit", "Kurta Pyjama", "Denim",
  "Sharara", "Co-ord Set", "3 PC Set", "Kaftan", "Abaya",
  "Sportswear", "Polo Shirt", "Kids Wear", "Uniform", "Other"
];

export const DEFAULT_ROUTING_TEMPLATES: GarmentRoutingTemplate[] = [
  {
    id: "RT-KURTI-PLAIN",
    name: "Plain Kurti",
    category: "Kurti",
    operations: [
      { id: "s1", name: "Fabric Inspection", stage: "FABRIC_INSPECTION", processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1, qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting",      stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting", plannedHours: 3, qualityCheckpoint: false },
      { id: "s3", name: "Stitching",          stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching", plannedHours: 6, qualityCheckpoint: true },
      { id: "s4", name: "Finishing",          stage: "FINISHING",         processType: "IN_HOUSE", workstationType: "Finishing", plannedHours: 2, qualityCheckpoint: false },
      { id: "s5", name: "QC Check",           stage: "QC_CHECK",          processType: "IN_HOUSE", workstationType: "QC Check", plannedHours: 1, qualityCheckpoint: true },
      { id: "s6", name: "Packing",            stage: "PACKING",           processType: "IN_HOUSE", workstationType: "Packing", plannedHours: 1, qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-KURTI-EMBR",
    name: "Embroidered Kurti",
    category: "Kurti",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection",         plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Fabric Embroidery",   stage: "EMBROIDERY_FABRIC",  processType: "JOB_WORK",  workstationType: "Embroidery", plannedHours: 24, qualityCheckpoint: true },
      { id: "s3", name: "Panel Cutting",       stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",    plannedHours: 3,  qualityCheckpoint: false },
      { id: "s4", name: "Stitching",           stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",  plannedHours: 6,  qualityCheckpoint: true },
      { id: "s5", name: "Finishing",           stage: "FINISHING",          processType: "IN_HOUSE", workstationType: "Finishing",  plannedHours: 2,  qualityCheckpoint: false },
      { id: "s6", name: "QC Check",            stage: "QC_CHECK",           processType: "IN_HOUSE", workstationType: "QC Check",         plannedHours: 1,  qualityCheckpoint: true },
      { id: "s7", name: "Packing",             stage: "PACKING",            processType: "IN_HOUSE", workstationType: "Packing",    plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-KURTI-PRINT",
    name: "Printed Kurti (Fabric Print)",
    category: "Kurti",
    operations: [
      { id: "s1", name: "Fabric Inspection",  stage: "FABRIC_INSPECTION", processType: "IN_HOUSE", workstationType: "Fabric Inspection",       plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Fabric Printing",    stage: "FABRIC_PRINTING",   processType: "JOB_WORK",  workstationType: "Printing", plannedHours: 12, qualityCheckpoint: true },
      { id: "s3", name: "Panel Cutting",      stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 3,  qualityCheckpoint: false },
      { id: "s4", name: "Stitching",          stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 6,  qualityCheckpoint: true },
      { id: "s5", name: "Finishing",          stage: "FINISHING",         processType: "IN_HOUSE", workstationType: "Finishing",plannedHours: 2,  qualityCheckpoint: false },
      { id: "s6", name: "QC Check",           stage: "QC_CHECK",          processType: "IN_HOUSE", workstationType: "QC Check",       plannedHours: 1,  qualityCheckpoint: true },
      { id: "s7", name: "Packing",            stage: "PACKING",           processType: "IN_HOUSE", workstationType: "Packing",  plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-COORD-KURTI-PANT",
    name: "Kurti with Pant (Co-ord Set)",
    category: "Co-ord Set",
    operations: [
      { id: "s1", name: "Fabric Inspection",      stage: "FABRIC_INSPECTION", processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting (Kurti)",  stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 3,  qualityCheckpoint: false },
      { id: "s3", name: "Panel Cutting (Pant)",   stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 2,  qualityCheckpoint: false },
      { id: "s4", name: "Stitching (Kurti)",      stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 6,  qualityCheckpoint: true },
      { id: "s5", name: "Stitching (Pant)",       stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 4,  qualityCheckpoint: true },
      { id: "s6", name: "Finishing",              stage: "FINISHING",         processType: "IN_HOUSE", workstationType: "Finishing",plannedHours: 2,  qualityCheckpoint: false },
      { id: "s7", name: "QC Check",               stage: "QC_CHECK",          processType: "IN_HOUSE", workstationType: "QC Check", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s8", name: "Set Matching & Packing", stage: "PACKING",           processType: "IN_HOUSE", workstationType: "Packing",  plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-3PC-SET",
    name: "3 PC Set (Kurti + Pant + Dupatta)",
    category: "3 PC Set",
    operations: [
      { id: "s1", name: "Fabric Inspection",          stage: "FABRIC_INSPECTION", processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting (Kurti)",      stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 3,  qualityCheckpoint: false },
      { id: "s3", name: "Panel Cutting (Pant)",       stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 2,  qualityCheckpoint: false },
      { id: "s4", name: "Dupatta Processing",         stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 1,  qualityCheckpoint: false },
      { id: "s5", name: "Stitching (Kurti)",          stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 6,  qualityCheckpoint: true },
      { id: "s6", name: "Stitching (Pant)",           stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 4,  qualityCheckpoint: true },
      { id: "s7", name: "Dupatta Finishing (Edges)",  stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 1,  qualityCheckpoint: false },
      { id: "s8", name: "Finishing",                  stage: "FINISHING",         processType: "IN_HOUSE", workstationType: "Finishing",plannedHours: 2,  qualityCheckpoint: false },
      { id: "s9", name: "QC Check",                   stage: "QC_CHECK",          processType: "IN_HOUSE", workstationType: "QC Check", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s10", name: "Set Matching & Packing",    stage: "PACKING",           processType: "IN_HOUSE", workstationType: "Packing",  plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-TSHIRT-DTG",
    name: "T-Shirt (Garment Print DTG)",
    category: "T-Shirt",
    operations: [
      { id: "s1", name: "Fabric Inspection",  stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection",              plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting",      stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s3", name: "Stitching",          stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",       plannedHours: 4,  qualityCheckpoint: true },
      { id: "s4", name: "Garment Printing",   stage: "GARMENT_PRINTING",   processType: "IN_HOUSE", workstationType: "Printing",     plannedHours: 6,  qualityCheckpoint: true },
      { id: "s5", name: "Finishing",          stage: "FINISHING",          processType: "IN_HOUSE", workstationType: "Finishing",       plannedHours: 1,  qualityCheckpoint: false },
      { id: "s6", name: "Packing",            stage: "PACKING",            processType: "IN_HOUSE", workstationType: "Packing",         plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-LEHENGA-FULL",
    name: "Heavy Lehenga (Full Decorated)",
    category: "Lehenga",
    operations: [
      { id: "s1", name: "Fabric Inspection",      stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection",         plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Fabric Dyeing",          stage: "DYEING",             processType: "JOB_WORK",  workstationType: "Dyeing",  plannedHours: 48, qualityCheckpoint: true },
      { id: "s3", name: "Fabric Embroidery",      stage: "EMBROIDERY_FABRIC",  processType: "JOB_WORK",  workstationType: "Embroidery", plannedHours: 72, qualityCheckpoint: true },
      { id: "s4", name: "Panel Cutting",          stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",    plannedHours: 4,  qualityCheckpoint: false },
      { id: "s5", name: "Stitching",              stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",  plannedHours: 10, qualityCheckpoint: true },
      { id: "s6", name: "Hand Work / Sequence",   stage: "HAND_WORK",          processType: "JOB_WORK",  workstationType: "Hand Work",  plannedHours: 48, qualityCheckpoint: true },
      { id: "s7", name: "Finishing",              stage: "FINISHING",          processType: "IN_HOUSE", workstationType: "Finishing",  plannedHours: 3,  qualityCheckpoint: false },
      { id: "s8", name: "QC Check",               stage: "QC_CHECK",           processType: "IN_HOUSE", workstationType: "QC Check",         plannedHours: 2,  qualityCheckpoint: true },
      { id: "s9", name: "Packing",                stage: "PACKING",            processType: "IN_HOUSE", workstationType: "Packing",    plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-DENIM",
    name: "Denim Jeans / Jacket",
    category: "Denim",
    operations: [
      { id: "s1", name: "Fabric Inspection",  stage: "FABRIC_INSPECTION", processType: "IN_HOUSE", workstationType: "Fabric Inspection",       plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting",      stage: "CUTTING",           processType: "IN_HOUSE", workstationType: "Cutting",  plannedHours: 3,  qualityCheckpoint: false },
      { id: "s3", name: "Stitching",          stage: "STITCHING",         processType: "IN_HOUSE", workstationType: "Stitching",plannedHours: 8,  qualityCheckpoint: true },
      { id: "s4", name: "Washing / Distress", stage: "WASHING",           processType: "JOB_WORK",  workstationType: "Washing",plannedHours: 24, qualityCheckpoint: true },
      { id: "s5", name: "Finishing",          stage: "FINISHING",         processType: "IN_HOUSE", workstationType: "Finishing",plannedHours: 2,  qualityCheckpoint: false },
      { id: "s6", name: "QC Check",           stage: "QC_CHECK",          processType: "IN_HOUSE", workstationType: "QC Check",       plannedHours: 1,  qualityCheckpoint: true },
      { id: "s7", name: "Packing",            stage: "PACKING",           processType: "IN_HOUSE", workstationType: "Packing",  plannedHours: 1,  qualityCheckpoint: false },
    ],
  },

  // ── NEW TEMPLATES ─────────────────────────────────────────────────────────
  {
    id: "RT-SHIRT-FORMAL",
    name: "Formal Shirt",
    category: "Shirt",
    operations: [
      { id: "s1", name: "Fabric Inspection",    stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "GSM / Lot Test",       stage: "GSMLOT_TEST",        processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s3", name: "Spreading",            stage: "SPREADING",          processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s4", name: "Marker Making",        stage: "MARKER_MAKING",      processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s5", name: "Panel Cutting",        stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 3,  qualityCheckpoint: false },
      { id: "s6", name: "Fusing / Interlining", stage: "FUSING",             processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 2,  qualityCheckpoint: false },
      { id: "s7", name: "Numbering",            stage: "NUMBERING",          processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s8", name: "Stitching",            stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 6,  qualityCheckpoint: true },
      { id: "s9", name: "Over Locking",         stage: "OVER_LOCKING",       processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s10",name: "Button Hole / Button", stage: "BUTTON_HOLE",        processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s11",name: "Bar Tacking",          stage: "BARTACKING",         processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s12",name: "First Piece Approval", stage: "FIRST_PIECE_APPROVAL",processType: "IN_HOUSE",workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s13",name: "Thread Cutting",       stage: "THREAD_CUTTING",     processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s14",name: "Ironing / Pressing",   stage: "IRONING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s15",name: "Stain Removal",        stage: "STAIN_REMOVAL",      processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s16",name: "End-of-Line Check",    stage: "END_LINE_CHECK",     processType: "IN_HOUSE", workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s17",name: "Tagging / Labelling",  stage: "TAGGING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s18",name: "Poly Bagging",         stage: "POLY_BAGGING",       processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s19",name: "Carton Packing",       stage: "CARTON_PACKING",     processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-POLO-TSHIRT",
    name: "Polo T-Shirt",
    category: "Polo Shirt",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting",       stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 2,  qualityCheckpoint: false },
      { id: "s3", name: "Stitching",           stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 4,  qualityCheckpoint: true },
      { id: "s4", name: "Over Locking",        stage: "OVER_LOCKING",       processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s5", name: "Button Hole",         stage: "BUTTON_HOLE",        processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s6", name: "Thread Cutting",      stage: "THREAD_CUTTING",     processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s7", name: "Ironing",             stage: "IRONING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s8", name: "Inline QC",           stage: "INLINE_QC",          processType: "IN_HOUSE", workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s9", name: "Tagging",             stage: "TAGGING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s10",name: "Poly Bagging",        stage: "POLY_BAGGING",       processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s11",name: "Carton Packing",      stage: "CARTON_PACKING",     processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-SALWAR-SUIT",
    name: "Salwar Suit (Plain)",
    category: "Salwar Suit",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Panel Cutting",       stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 3,  qualityCheckpoint: false },
      { id: "s3", name: "Stitching",           stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 6,  qualityCheckpoint: true },
      { id: "s4", name: "Elastic Attachment",  stage: "ELASTIC_ATTACH",     processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s5", name: "Finishing",           stage: "FINISHING",          processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s6", name: "QC Check",            stage: "QC_CHECK",           processType: "IN_HOUSE", workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s7", name: "Tagging",             stage: "TAGGING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s8", name: "Packing",             stage: "PACKING",            processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-SHARARA",
    name: "Sharara / Gharara",
    category: "Sharara",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Fabric Embroidery",   stage: "EMBROIDERY_FABRIC",  processType: "JOB_WORK",  workstationType: "Embroidery",        plannedHours: 48, qualityCheckpoint: true },
      { id: "s3", name: "Panel Cutting",       stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 3,  qualityCheckpoint: false },
      { id: "s4", name: "Stitching",           stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 8,  qualityCheckpoint: true },
      { id: "s5", name: "Lace / Trim Attach",  stage: "LACE_ATTACH",        processType: "IN_HOUSE", workstationType: "Hand Work",         plannedHours: 6,  qualityCheckpoint: false },
      { id: "s6", name: "Hand Work",           stage: "HAND_WORK",          processType: "JOB_WORK",  workstationType: "Hand Work",         plannedHours: 24, qualityCheckpoint: false },
      { id: "s7", name: "Thread Cutting",      stage: "THREAD_CUTTING",     processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s8", name: "Ironing",             stage: "IRONING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s9", name: "QC Check",            stage: "QC_CHECK",           processType: "IN_HOUSE", workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s10",name: "Packing",             stage: "PACKING",            processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-SAREE-EMBR",
    name: "Saree (Embroidered)",
    category: "Saree",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Colour Fastness Test",stage: "COLOUR_FASTNESS",    processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 2,  qualityCheckpoint: true },
      { id: "s3", name: "Fabric Embroidery",   stage: "EMBROIDERY_FABRIC",  processType: "JOB_WORK",  workstationType: "Embroidery",        plannedHours: 72, qualityCheckpoint: true },
      { id: "s4", name: "Sequin / Mirror Work",stage: "SEQUIN_FABRIC",      processType: "JOB_WORK",  workstationType: "Hand Work",         plannedHours: 48, qualityCheckpoint: false },
      { id: "s5", name: "Finishing",           stage: "FINISHING",          processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s6", name: "QC Check",            stage: "QC_CHECK",           processType: "IN_HOUSE", workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s7", name: "Folding & Packing",   stage: "FOLDING_PACKING",    processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-COORD-SET",
    name: "Co-ord Set (Top + Bottom)",
    category: "Co-ord Set",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Fabric Printing",     stage: "FABRIC_PRINTING",    processType: "JOB_WORK",  workstationType: "Printing",          plannedHours: 12, qualityCheckpoint: true },
      { id: "s3", name: "Marker Making",       stage: "MARKER_MAKING",      processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s4", name: "Panel Cutting",       stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 4,  qualityCheckpoint: false },
      { id: "s5", name: "Stitching",           stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 8,  qualityCheckpoint: true },
      { id: "s6", name: "Elastic Attachment",  stage: "ELASTIC_ATTACH",     processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s7", name: "Thread Cutting",      stage: "THREAD_CUTTING",     processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s8", name: "Ironing",             stage: "IRONING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s9", name: "First Piece Approval",stage: "FIRST_PIECE_APPROVAL",processType: "IN_HOUSE",workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s10",name: "Tagging",             stage: "TAGGING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s11",name: "Hanger Attach",       stage: "HANGER_ATTACH",      processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s12",name: "Poly Bagging",        stage: "POLY_BAGGING",       processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-JACKET-LINED",
    name: "Jacket (Lined)",
    category: "Jacket",
    operations: [
      { id: "s1", name: "Fabric Inspection",    stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "Shrinkage Test",       stage: "SHRINKAGE_TEST",     processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 2,  qualityCheckpoint: true },
      { id: "s3", name: "Spreading",            stage: "SPREADING",          processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s4", name: "Panel Cutting",        stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 4,  qualityCheckpoint: false },
      { id: "s5", name: "Fusing / Interlining", stage: "FUSING",             processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 2,  qualityCheckpoint: false },
      { id: "s6", name: "Stitching",            stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 10, qualityCheckpoint: true },
      { id: "s7", name: "Lining Attachment",    stage: "LINING_ATTACH",      processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 4,  qualityCheckpoint: false },
      { id: "s8", name: "Zipper Attachment",    stage: "ZIPPER_ATTACH",      processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s9", name: "Bar Tacking",          stage: "BARTACKING",         processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s10",name: "Thread Cutting",       stage: "THREAD_CUTTING",     processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 2,  qualityCheckpoint: false },
      { id: "s11",name: "Ironing / Pressing",   stage: "IRONING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 3,  qualityCheckpoint: false },
      { id: "s12",name: "End-of-Line Check",    stage: "END_LINE_CHECK",     processType: "IN_HOUSE", workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s13",name: "Tagging / Labelling",  stage: "TAGGING",            processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s14",name: "Hanger Attach",        stage: "HANGER_ATTACH",      processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s15",name: "Poly Bagging",         stage: "POLY_BAGGING",       processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s16",name: "Carton Packing",       stage: "CARTON_PACKING",     processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
  {
    id: "RT-SPORTSWEAR",
    name: "Sportswear / Activewear",
    category: "Sportswear",
    operations: [
      { id: "s1", name: "Fabric Inspection",   stage: "FABRIC_INSPECTION",  processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s2", name: "GSM / Lot Test",      stage: "GSMLOT_TEST",        processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1,  qualityCheckpoint: true },
      { id: "s3", name: "Sublimation Print",   stage: "SUBLIMATION",        processType: "JOB_WORK",  workstationType: "Printing",          plannedHours: 12, qualityCheckpoint: true },
      { id: "s4", name: "Panel Cutting",       stage: "CUTTING",            processType: "IN_HOUSE", workstationType: "Cutting",           plannedHours: 2,  qualityCheckpoint: false },
      { id: "s5", name: "Stitching",           stage: "STITCHING",          processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 4,  qualityCheckpoint: true },
      { id: "s6", name: "Elastic Attachment",  stage: "ELASTIC_ATTACH",     processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s7", name: "Over Locking",        stage: "OVER_LOCKING",       processType: "IN_HOUSE", workstationType: "Stitching",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s8", name: "Thread Cutting",      stage: "THREAD_CUTTING",     processType: "IN_HOUSE", workstationType: "Finishing",         plannedHours: 1,  qualityCheckpoint: false },
      { id: "s9", name: "First Piece Approval",stage: "FIRST_PIECE_APPROVAL",processType: "IN_HOUSE",workstationType: "QC Check",          plannedHours: 1,  qualityCheckpoint: true },
      { id: "s10",name: "Barcode / RFID Scan", stage: "BARCODE_SCAN",       processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s11",name: "Poly Bagging",        stage: "POLY_BAGGING",       processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
      { id: "s12",name: "Carton Packing",      stage: "CARTON_PACKING",     processType: "IN_HOUSE", workstationType: "Packing",           plannedHours: 1,  qualityCheckpoint: false },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getProcessMeta(stageId: string) {
  return PROCESS_TYPES.find(p => p.id === stageId) || PROCESS_TYPES[0];
}

function genStepId() {
  return `s${Date.now().toString(36)}`;
}

function genRouteId() {
  return `RT-${Date.now().toString(36).toUpperCase()}`;
}

// ─── Multi-Piece Quick Build ────────────────────────────────────────────────
// Auto-fills a full piece-wise routing (cutting + stitching per piece,
// shared finishing/QC/packing) for sets like Co-ord Set / 3 PC Set / Saree+Blouse.

type PieceKey = "KURTI" | "PANT" | "DUPATTA" | "BLOUSE" | "JACKET" | "SAREE_FALL";

const PIECE_DEFS: Record<PieceKey, { label: string; cutHours: number; stitchHours: number; stitchOnly?: boolean }> = {
  KURTI:      { label: "Kurti",      cutHours: 3,   stitchHours: 6 },
  PANT:       { label: "Pant",       cutHours: 2,   stitchHours: 4 },
  DUPATTA:    { label: "Dupatta",    cutHours: 1,   stitchHours: 1, stitchOnly: false },
  BLOUSE:     { label: "Blouse",     cutHours: 1.5, stitchHours: 3 },
  JACKET:     { label: "Jacket",     cutHours: 2.5, stitchHours: 5 },
  SAREE_FALL: { label: "Saree Fall/Edging", cutHours: 0, stitchHours: 1, stitchOnly: true },
};

function buildMultiPieceRoute(pieces: PieceKey[], includeFabricStage: "NONE" | "DYEING" | "PRINTING" | "EMBROIDERY"): GarmentOperationTemplate[] {
  const ops: GarmentOperationTemplate[] = [];
  let n = 1;
  const step = (partial: Omit<GarmentOperationTemplate, "id" | "ratePerPiece" | "rateUnit">) => {
    ops.push({ id: `s${n++}`, ratePerPiece: 0, rateUnit: "PER_PIECE", ...partial });
  };

  // Pre-production
  step({ name: "Fabric Inspection", stage: "FABRIC_INSPECTION", processType: "IN_HOUSE", workstationType: "Fabric Inspection", plannedHours: 1, qualityCheckpoint: true });

  if (includeFabricStage === "DYEING") {
    step({ name: "Fabric Dyeing", stage: "DYEING", processType: "JOB_WORK", workstationType: "Dyeing", plannedHours: 48, qualityCheckpoint: true });
  } else if (includeFabricStage === "PRINTING") {
    step({ name: "Fabric Printing", stage: "FABRIC_PRINTING", processType: "JOB_WORK", workstationType: "Printing", plannedHours: 12, qualityCheckpoint: true });
  } else if (includeFabricStage === "EMBROIDERY") {
    step({ name: "Fabric Embroidery", stage: "EMBROIDERY_FABRIC", processType: "JOB_WORK", workstationType: "Embroidery", plannedHours: 24, qualityCheckpoint: true });
  }

  // Cutting — one step per piece that needs cutting
  pieces.forEach(p => {
    const def = PIECE_DEFS[p];
    if (def.stitchOnly) return;
    step({ name: `Panel Cutting (${def.label})`, stage: "CUTTING", processType: "IN_HOUSE", workstationType: "Cutting", plannedHours: def.cutHours, qualityCheckpoint: false });
  });

  // Stitching — one step per piece
  pieces.forEach(p => {
    const def = PIECE_DEFS[p];
    step({ name: `Stitching (${def.label})`, stage: "STITCHING", processType: "IN_HOUSE", workstationType: "Stitching", plannedHours: def.stitchHours, qualityCheckpoint: !def.stitchOnly });
  });

  // Shared finishing onward
  step({ name: "Finishing", stage: "FINISHING", processType: "IN_HOUSE", workstationType: "Finishing", plannedHours: 2, qualityCheckpoint: false });
  step({ name: "QC Check", stage: "QC_CHECK", processType: "IN_HOUSE", workstationType: "QC Check", plannedHours: 1, qualityCheckpoint: true });
  step({ name: pieces.length > 1 ? "Set Matching & Packing" : "Packing", stage: "PACKING", processType: "IN_HOUSE", workstationType: "Packing", plannedHours: 1, qualityCheckpoint: false });

  return ops;
}



// ─── Step Pill (read-only display) ────────────────────────────────────────────

function StepPill({ op, index, total }: { op: GarmentOperationTemplate; index: number; total: number }) {
  const meta = getProcessMeta(op.stage);
  return (
    <div className="flex items-center gap-1">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>
        <span>{meta.icon}</span>
        <span>{op.name}</span>
        {(op.ratePerPiece || 0) > 0 && (
          <span className="text-[9px] font-black bg-white/70 px-1 rounded text-slate-700">
            ₹{(op.ratePerPiece ?? 0).toFixed(2)}{op.rateUnit === "PER_HOUR" ? "/hr" : op.rateUnit === "PER_METER" ? "/mtr" : "/pc"}
          </span>
        )}
        {op.processType === "JOB_WORK" && (
          <span className="text-[9px] font-black bg-white/60 px-1 rounded">OUT</span>
        )}
        {op.qualityCheckpoint && (
          <CheckCircle2 className="w-3 h-3 opacity-60" />
        )}
      </div>
      {index < total - 1 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
    </div>
  );
}

// ─── Route Card ───────────────────────────────────────────────────────────────

function RouteCard({
  route, onEdit, onClone, onDelete
}: {
  route: GarmentRoutingTemplate;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all hover:border-indigo-200 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-black text-slate-400 font-mono">{route.id}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase">
              {route.category}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">{route.name}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-xs text-slate-400">{route.operations.length} steps</p>
            {route.operations.some(o => (o.ratePerPiece || 0) > 0) && (
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                ₹{route.operations.reduce((s, o) => s + (o.ratePerPiece || 0), 0).toFixed(2)}/pc total ops cost
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClone} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Clone">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Step flow */}
      <div className="flex flex-wrap items-center gap-1">
        {route.operations.map((op, i) => (
          <StepPill key={`${route.id}-${op.id}`} op={op} index={i} total={route.operations.length} />
        ))}
      </div>
    </div>
  );
}

// ─── Route Editor ─────────────────────────────────────────────────────────────

// ─── Quick Build Panel (UI) ─────────────────────────────────────────────────

const PIECE_OPTIONS: { key: PieceKey; label: string; icon: string }[] = [
  { key: "KURTI",      label: "Kurti / Top",      icon: "👗" },
  { key: "PANT",       label: "Pant / Bottom",    icon: "👖" },
  { key: "DUPATTA",    label: "Dupatta",          icon: "🧣" },
  { key: "BLOUSE",     label: "Blouse",           icon: "👚" },
  { key: "JACKET",     label: "Jacket / Shrug",   icon: "🧥" },
  { key: "SAREE_FALL", label: "Saree Fall/Edging",icon: "🎀" },
];

const FABRIC_STAGE_OPTIONS: { key: "NONE" | "DYEING" | "PRINTING" | "EMBROIDERY"; label: string }[] = [
  { key: "NONE",       label: "Plain (No extra process)" },
  { key: "DYEING",     label: "Fabric Dyeing (Job Work)" },
  { key: "PRINTING",   label: "Fabric Printing (Job Work)" },
  { key: "EMBROIDERY", label: "Fabric Embroidery (Job Work)" },
];

function QuickBuildPanel({ onApply, hasSteps }: { onApply: (ops: GarmentOperationTemplate[]) => void; hasSteps: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PieceKey[]>(["KURTI", "PANT"]);
  const [fabricStage, setFabricStage] = useState<"NONE" | "DYEING" | "PRINTING" | "EMBROIDERY">("NONE");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const togglePiece = (key: PieceKey) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const previewOps = selected.length > 0 ? buildMultiPieceRoute(selected, fabricStage) : [];

  const handleApply = () => {
    if (selected.length === 0) return;
    if (hasSteps && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onApply(buildMultiPieceRoute(selected, fabricStage));
    setConfirmReplace(false);
    setOpen(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-5 py-3 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Multi-Piece Quick Build</h3>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">Auto-fill</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
      </button>

      {open && (
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500 font-medium">
            Pick the pieces in this style (e.g. Kurti + Pant + Dupatta). This auto-generates Cutting and Stitching steps per piece, with shared Finishing, QC and Packing — department-wise, ready to use.
          </p>

          {/* Piece selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Pieces in this Set</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PIECE_OPTIONS.map(p => {
                const active = selected.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePiece(p.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                    }`}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span>{p.label}</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fabric pre-process */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Fabric Pre-Processing</label>
            <select
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400"
              value={fabricStage}
              onChange={e => setFabricStage(e.target.value as any)}
            >
              {FABRIC_STAGE_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>

          {/* Preview */}
          {previewOps.length > 0 && (
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Preview — {previewOps.length} steps will be created</p>
              <div className="flex flex-wrap items-center gap-1">
                {previewOps.map((op, i) => {
                  const meta = getProcessMeta(op.stage);
                  return (
                    <React.Fragment key={`${op.id}-${i}`}>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${meta.bg} ${meta.color} ${meta.border}`}>
                        <span>{meta.icon}</span>{op.name}
                      </span>
                      {i < previewOps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirm replace banner */}
          {confirmReplace && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-1">
                This will replace all {/* count of current steps shown via parent */}existing process steps with the generated ones. Continue?
              </p>
              <button onClick={() => setConfirmReplace(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2">Cancel</button>
              <button onClick={handleApply} className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg">Replace Steps</button>
            </div>
          )}

          {!confirmReplace && (
            <button
              type="button"
              onClick={handleApply}
              disabled={selected.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black shadow transition-colors"
            >
              <Plus className="w-4 h-4" /> {hasSteps ? "Auto-Fill Steps (Replace Current)" : "Auto-Fill Steps"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RouteEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: GarmentRoutingTemplate;
  onSave: (r: GarmentRoutingTemplate) => void;
  onCancel: () => void;
}) {
  const [route, setRoute] = useState<GarmentRoutingTemplate>(JSON.parse(JSON.stringify(initial)));
  const [validationError, setValidationError] = useState<string | null>(null);

  const setField = (patch: Partial<GarmentRoutingTemplate>) => {
    setValidationError(null);
    setRoute(r => ({ ...r, ...patch }));
  };

  const addStep = (stageId: string) => {
    const meta = getProcessMeta(stageId);
    const newOp: GarmentOperationTemplate = {
      id: genStepId(),
      name: meta.label,
      stage: stageId,
      processType: "IN_HOUSE",
      workstationType: meta.dept,
      plannedHours: 4,
      ratePerPiece: 0,
      rateUnit: "PER_PIECE",
      qualityCheckpoint: false,
    };
    setRoute(r => ({ ...r, operations: [...r.operations, newOp] }));
  };

  const removeStep = (id: string) =>
    setRoute(r => ({ ...r, operations: r.operations.filter(o => o.id !== id) }));

  const moveStep = (id: string, dir: -1 | 1) => {
    setRoute(r => {
      const ops = [...r.operations];
      const i = ops.findIndex(o => o.id === id);
      const j = i + dir;
      if (j < 0 || j >= ops.length) return r;
      [ops[i], ops[j]] = [ops[j], ops[i]];
      return { ...r, operations: ops };
    });
  };

  const replaceAllSteps = (ops: GarmentOperationTemplate[]) => {
    setValidationError(null);
    setRoute(r => ({ ...r, operations: ops.map(o => ({ ...o, id: genStepId() })) }));
  };

  const updateStep = (id: string, patch: Partial<GarmentOperationTemplate>) =>
    setRoute(r => ({
      ...r,
      operations: r.operations.map(o => o.id === id ? { ...o, ...patch } : o)
    }));

  const handleSave = () => {
    if (!route.name.trim()) {
      setValidationError("Route name is required.");
      return;
    }
    if (route.operations.length === 0) {
      setValidationError("Add at least one process step before saving.");
      return;
    }
    setValidationError(null);
    onSave(route);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            {initial.id.startsWith("RT-NEW") ? "New Routing Template" : `Edit: ${route.name}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Define the process steps for this style</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow transition-colors">
            <Save className="w-4 h-4" /> Save Route
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Validation error banner */}
        {validationError && (
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{validationError}</p>
            <button onClick={() => setValidationError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60">
            <Settings2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Route Info</h3>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Route Name *</label>
              <input
                className={`w-full border rounded-xl px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400 transition-colors ${
                  validationError && !route.name.trim()
                    ? "border-red-400 dark:border-red-500 bg-red-50/50 dark:bg-red-950/20"
                    : "border-slate-200 dark:border-slate-700"
                }`}
                placeholder="e.g. Embroidered Kurti with Fabric Print"
                value={route.name}
                onChange={e => setField({ name: e.target.value })}
              />
              {validationError && !route.name.trim() && (
                <p className="text-xs text-red-500 font-semibold mt-1">Route name is required.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category / Style Type</label>
              <select
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-400"
                value={route.category}
                onChange={e => setField({ category: e.target.value })}
              >
                {PROCESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Multi-Piece Quick Build ─────────────────────────────────────────── */}
        <QuickBuildPanel onApply={replaceAllSteps} hasSteps={route.operations.length > 0} />

        {/* Process Steps */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Process Steps</h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">{route.operations.length}</span>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {route.operations.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">No steps added yet</p>
                <p className="text-xs mt-1">Add processes from the panel below</p>
              </div>
            )}

            {route.operations.map((op, i) => {
              const meta = getProcessMeta(op.stage);
              return (
                <div key={`edit-${route.id}-${op.id}-${i}`} className={`flex items-start gap-3 p-3 rounded-xl border ${meta.border} ${meta.bg} dark:bg-opacity-10`}>
                  {/* Step number */}
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black ${meta.bg} ${meta.color} border ${meta.border}`}>
                    {i + 1}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    {/* Process type */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Process</label>
                      <select
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 dark:border-slate-600 outline-none"
                        value={op.stage}
                        onChange={e => {
                          const newMeta = getProcessMeta(e.target.value);
                          updateStep(op.id, { stage: e.target.value, name: newMeta.label, workstationType: newMeta.dept });
                        }}
                      >
                        {PROCESS_TYPES.map(p => (
                          <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Step name */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Step Name</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 dark:border-slate-600 outline-none"
                        value={op.name}
                        onChange={e => updateStep(op.id, { name: e.target.value })}
                      />
                    </div>

                    {/* Rate per piece — style-specific */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                        Rate <span className="text-indigo-500 normal-case font-black">(this style)</span>
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 dark:border-slate-600 outline-none w-0"
                          placeholder="0.00"
                          value={op.ratePerPiece ?? ""}
                          onChange={e => updateStep(op.id, { ratePerPiece: parseFloat(e.target.value) || 0 })}
                        />
                        <select
                          className="border border-slate-200 rounded-lg px-1 py-1.5 text-[10px] font-bold bg-white dark:bg-slate-800 dark:border-slate-600 outline-none shrink-0"
                          value={op.rateUnit || "PER_PIECE"}
                          onChange={e => updateStep(op.id, { rateUnit: e.target.value as any })}
                        >
                          <option value="PER_PIECE">/pc</option>
                          <option value="PER_HOUR">/hr</option>
                          <option value="PER_METER">/mtr</option>
                        </select>
                      </div>
                    </div>

                    {/* In-house / Job Work + QC */}
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase">Type</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStep(op.id, { processType: "IN_HOUSE" })}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-black border transition-all ${op.processType === "IN_HOUSE" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-200"}`}
                        >In-House</button>
                        <button
                          type="button"
                          onClick={() => updateStep(op.id, { processType: "JOB_WORK" })}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-black border transition-all ${op.processType === "JOB_WORK" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-400 border-slate-200"}`}
                        >Job Work</button>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!op.qualityCheckpoint}
                          onChange={e => updateStep(op.id, { qualityCheckpoint: e.target.checked })}
                          className="accent-emerald-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">QC Gate</span>
                      </label>
                    </div>
                  </div>

                  {/* Move + Delete */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => moveStep(op.id, -1)} disabled={i === 0}
                      className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveStep(op.id, 1)} disabled={i === route.operations.length - 1}
                      className="p-1 rounded hover:bg-white/60 text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeStep(op.id)}
                      className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ── Cost Summary ── */}
            {route.operations.some(o => (o.ratePerPiece || 0) > 0) && (
              <div className="mt-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                <p className="text-[10px] font-black uppercase text-indigo-500 mb-2">Style Operation Cost Summary (per piece)</p>
                <div className="space-y-1">
                  {route.operations.filter(o => (o.ratePerPiece || 0) > 0).map(o => (
                    <div key={o.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">{o.name}</span>
                      <span className="font-black text-indigo-700 dark:text-indigo-300 font-mono">
                        ₹{(o.ratePerPiece || 0).toFixed(2)}
                        <span className="text-[10px] text-indigo-400 font-medium ml-0.5">
                          {o.rateUnit === "PER_HOUR" ? "/hr" : o.rateUnit === "PER_METER" ? "/mtr" : "/pc"}
                        </span>
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs border-t border-indigo-200 dark:border-indigo-800 pt-1.5 mt-1.5">
                    <span className="font-black text-slate-700 dark:text-slate-200">Total Operation Cost</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                      ₹{route.operations.reduce((s, o) => s + (o.ratePerPiece || 0), 0).toFixed(2)}/pc
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Process Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60">
            <Plus className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Add Process Step</h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROCESS_TYPES.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addStep(p.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all hover:shadow-sm hover:scale-[1.02] ${p.bg} ${p.color} ${p.border}`}
                >
                  <span className="text-base">{p.icon}</span>
                  <span>{p.label}</span>
                  <Plus className="w-3 h-3 ml-auto opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface RoutingMasterProps {
  externalTemplates?: GarmentRoutingTemplate[];
  onTemplatesChange?: (templates: GarmentRoutingTemplate[]) => void;
}

export default function RoutingMaster({ externalTemplates, onTemplatesChange }: RoutingMasterProps) {
  const [templates, setTemplates] = useState<GarmentRoutingTemplate[]>(DEFAULT_ROUTING_TEMPLATES);
  const [editing, setEditing] = useState<GarmentRoutingTemplate | null>(null);
  const [filterCat, setFilterCat] = useState("ALL");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // Load from IndexedDB (or accept externally-injected templates from parent)
  useEffect(() => {
    if (externalTemplates && externalTemplates.length > 0) {
      setTemplates(externalTemplates);
      return;
    }
    getItem<GarmentRoutingTemplate[]>(ROUTING_STORAGE_KEY).then(saved => {
      if (saved && saved.length) {
        // Merge: add any default templates not already in saved set (by id)
        const savedIds = new Set(saved.map(t => t.id));
        const missing = DEFAULT_ROUTING_TEMPLATES.filter(t => !savedIds.has(t.id));
        setTemplates(missing.length > 0 ? [...saved, ...missing] : saved);
      }
    }).catch(() => {
      console.warn('Could not load routing templates from storage.');
    });
  }, [externalTemplates]);

  const saveTemplates = (next: GarmentRoutingTemplate[]) => {
    setTemplates(next);
    setItem(ROUTING_STORAGE_KEY, next);
    onTemplatesChange?.(next);
  };

  const handleSave = (route: GarmentRoutingTemplate) => {
    const exists = templates.find(t => t.id === route.id);
    saveTemplates(exists
      ? templates.map(t => t.id === route.id ? route : t)
      : [...templates, route]
    );
    setEditing(null);
  };

  const handleClone = (route: GarmentRoutingTemplate) => {
    const cloned: GarmentRoutingTemplate = {
      ...JSON.parse(JSON.stringify(route)),
      id: genRouteId(),
      name: `${route.name} (Copy)`,
    };
    setEditing(cloned);
  };

  const handleDelete = (id: string) => {
    const route = templates.find(t => t.id === id);
    if (route) setConfirmDelete({ id, name: route.name });
  };

  const confirmDeleteExecute = () => {
    if (!confirmDelete) return;
    saveTemplates(templates.filter(t => t.id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  const categories = ["ALL", ...Array.from(new Set(templates.map(t => t.category)))];
  const filtered = filterCat === "ALL" ? templates : templates.filter(t => t.category === filterCat);

  if (editing) {
    return (
      <RouteEditor
        initial={editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Delete Route</h3>
                <p className="text-xs text-slate-500 mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Delete <span className="font-bold text-slate-800 dark:text-slate-100">"{confirmDelete.name}"</span>?
              Any Work Orders using this template will not be affected.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExecute}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Routing Master</h1>
          <p className="text-sm text-slate-500 mt-0.5">Define style-wise process routes for production</p>
        </div>
        <button
          onClick={() => setEditing({ id: `RT-NEW-${Date.now()}`, name: "", category: "Kurti", operations: [] })}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Route
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900">
        <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          <strong>Style-wise dynamic routing.</strong> Each style has its own process order — embroidered fabric goes for embroidery before cutting, garment print goes after stitching. Routes are assigned to Work Orders and drive step-by-step production flow.
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
              filterCat === c
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Route list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-bold text-lg">No routes found</p>
          <button onClick={() => setEditing({ id: `RT-NEW-${Date.now()}`, name: "", category: "Kurti", operations: [] })}
            className="mt-5 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Route
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              onEdit={() => setEditing(route)}
              onClone={() => handleClone(route)}
              onDelete={() => handleDelete(route.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
