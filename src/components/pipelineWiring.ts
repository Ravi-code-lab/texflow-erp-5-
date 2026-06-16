/**
 * pipelineWiring.ts — TexFlow Garment Manufacturing Pipeline Engine
 *
 * The single source of truth for:
 *  1. Canonical garment pipeline stage order
 *  2. Stage → Department mapping (authoritative)
 *  3. Pipeline blocking logic (cross-dept gating)
 *  4. WO route derivation from operations array
 *  5. Pipeline progress computation per WO
 *
 * Design principle: WOs drive their own route via the `operations` array.
 * The pipeline enforces that you cannot start Dept[N] until Dept[N-1] is
 * Completed. This mirrors ERPNext's Work Order routing.
 */

// ─── Canonical Stage Definitions ─────────────────────────────────────────────

export type StageId =
  // ── Pre-Production ──
  | "FABRIC_INSPECTION"
  | "SHRINKAGE_TEST"
  | "GSMLOT_TEST"
  | "SPREADING"
  | "MARKER_MAKING"
  // ── Wet Processing ──
  | "DYEING"
  | "BLEACHING"
  | "PRINTING_FABRIC"       // alias for FABRIC_PRINTING (kept for backward compat)
  | "FABRIC_PRINTING"
  // ── Decoration – Fabric Stage ──
  | "EMBROIDERY_FABRIC"
  | "SEQUIN_FABRIC"
  | "SMOCKING"
  | "APPLIQUE_FABRIC"
  // ── Cutting ──
  | "CUTTING"
  | "FUSING"
  | "NUMBERING"
  // ── Stitching ──
  | "STITCHING"
  | "OVER_LOCKING"
  | "BUTTON_HOLE"
  | "LINING_ATTACH"
  | "ZIPPER_ATTACH"
  // ── Decoration – Garment Stage ──
  | "EMBROIDERY_GARMENT"
  | "GARMENT_PRINTING"
  | "SCREEN_PRINTING"
  | "HEAT_TRANSFER"
  | "SUBLIMATION"
  | "HAND_WORK"
  | "PATCH_WORK"
  | "STONE_WORK"
  | "LACE_ATTACH"
  // ── Wet Processing – Post Stitch ──
  | "WASHING"
  | "ACID_WASH"
  | "ENZYME_WASH"
  | "DRY_CLEANING"
  // ── Finishing ──
  | "FINISHING"
  | "THREAD_CUTTING"
  | "IRONING"
  | "STAIN_REMOVAL"
  | "TAGGING"
  // ── Quality ──
  | "QC_CHECK"
  | "INLINE_QC"
  | "FINAL_QC"
  | "BUYER_QC"
  // ── Dispatch ──
  | "PACKING"
  | "FOLDING_PACKING"
  | "CARTON_PACKING"
  | "DISPATCH"
  // ── Fabric Testing (new) ──
  | "COLOUR_FASTNESS"
  | "PH_TEST"
  | "FABRIC_RELAXATION"
  // ── Cut Room (new) ──
  | "BAND_KNIFE"
  | "TICKET_LOOP"
  // ── Wet Processing (new) ──
  | "MERCERIZING"
  | "SANDBLASTING"
  // ── Printing (new) ──
  | "DIGITAL_PRINT"
  | "DISCHARGE_PRINT"
  | "BLOCK_PRINT"
  // ── Embellishment (new) ──
  | "BEADWORK"
  | "TASSELS_FRINGE"
  // ── Stitching (new) ──
  | "BARTACKING"
  | "ELASTIC_ATTACH"
  // ── Quality (new) ──
  | "FIRST_PIECE_APPROVAL"
  | "END_LINE_CHECK"
  // ── Packing (new) ──
  | "POLY_BAGGING"
  | "HANGER_ATTACH"
  | "BARCODE_SCAN";

export interface PipelineStage {
  id: StageId;
  label: string;         // Display name
  dept: string;          // Department tab name
  icon: string;          // Emoji icon
  accentColor: string;   // Tailwind color name
  isVendor: boolean;     // Goes out to vendor
  isQC: boolean;         // Quality checkpoint
  /** Typical SLA in hours */
  slaHours: number;
  /** Which stages can precede this one (direct predecessors) */
  predecessors: StageId[];
}

/**
 * GARMENT_PIPELINE — Canonical ordered pipeline for apparel/garment manufacturing.
 * Order matters: stages listed earlier must complete before later ones can start.
 * Multiple paths exist (e.g., fabric printing can happen before OR after cutting).
 * predecessors array encodes the DAG.
 */
export const GARMENT_PIPELINE: PipelineStage[] = [
  {
    id: "FABRIC_INSPECTION",
    label: "Fabric Inspection",
    dept: "Fabric Inspection",
    icon: "🔍",
    accentColor: "slate",
    isVendor: false,
    isQC: true,
    slaHours: 4,
    predecessors: [],
  },
  {
    id: "DYEING",
    label: "Dyeing",
    dept: "Dyeing",
    icon: "🎨",
    accentColor: "blue",
    isVendor: true,
    isQC: false,
    slaHours: 48,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "FABRIC_PRINTING",
    label: "Fabric Printing",
    dept: "Printing",
    icon: "🖨️",
    accentColor: "amber",
    isVendor: true,
    isQC: false,
    slaHours: 48,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "CUTTING",
    label: "Cutting",
    dept: "Cutting",
    icon: "✂️",
    accentColor: "rose",
    isVendor: false,
    isQC: false,
    slaHours: 8,
    predecessors: ["FABRIC_INSPECTION", "DYEING", "FABRIC_PRINTING"],
  },
  {
    id: "EMBROIDERY_FABRIC",
    label: "Embroidery (Fabric)",
    dept: "Embroidery",
    icon: "🌸",
    accentColor: "violet",
    isVendor: true,
    isQC: false,
    slaHours: 72,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "STITCHING",
    label: "Stitching",
    dept: "Stitching",
    icon: "🧵",
    accentColor: "indigo",
    isVendor: false,
    isQC: false,
    slaHours: 24,
    predecessors: ["CUTTING"],
  },
  {
    id: "GARMENT_PRINTING",
    label: "Printing (Garment)",
    dept: "Printing",
    icon: "🖨️",
    accentColor: "amber",
    isVendor: true,
    isQC: false,
    slaHours: 48,
    predecessors: ["STITCHING"],
  },
  {
    id: "EMBROIDERY_GARMENT",
    label: "Embroidery (Garment)",
    dept: "Embroidery",
    icon: "🌸",
    accentColor: "violet",
    isVendor: true,
    isQC: false,
    slaHours: 72,
    predecessors: ["STITCHING"],
  },
  {
    id: "WASHING",
    label: "Washing",
    dept: "Washing",
    icon: "🫧",
    accentColor: "cyan",
    isVendor: true,
    isQC: false,
    slaHours: 36,
    predecessors: ["STITCHING"],
  },
  {
    id: "HAND_WORK",
    label: "Hand Work",
    dept: "Hand Work",
    icon: "🤲",
    accentColor: "orange",
    isVendor: false,
    isQC: false,
    slaHours: 16,
    predecessors: ["STITCHING"],
  },
  {
    id: "FINISHING",
    label: "Finishing",
    dept: "Finishing",
    icon: "✨",
    accentColor: "emerald",
    isVendor: false,
    isQC: false,
    slaHours: 16,
    predecessors: ["STITCHING", "WASHING", "GARMENT_PRINTING", "EMBROIDERY_GARMENT", "HAND_WORK"],
  },
  {
    id: "QC_CHECK",
    label: "QC Check",
    dept: "QC Check",
    icon: "✅",
    accentColor: "teal",
    isVendor: false,
    isQC: true,
    slaHours: 4,
    predecessors: ["FINISHING"],
  },
  {
    id: "PACKING",
    label: "Packing",
    dept: "Packing",
    icon: "📦",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 8,
    predecessors: ["QC_CHECK", "FINISHING"],
  },

  // ── PRE-PRODUCTION SUB-STEPS (dept: "Fabric Inspection") ─────────────────
  {
    id: "SHRINKAGE_TEST",
    label: "Shrinkage Test",
    dept: "Fabric Inspection",
    icon: "🧪",
    accentColor: "lime",
    isVendor: false,
    isQC: true,
    slaHours: 2,
    predecessors: [],
  },
  {
    id: "GSMLOT_TEST",
    label: "GSM / Lot Test",
    dept: "Fabric Inspection",
    icon: "⚖️",
    accentColor: "lime",
    isVendor: false,
    isQC: true,
    slaHours: 1,
    predecessors: [],
  },

  // ── CUTTING SUB-STEPS (dept: "Cutting") ───────────────────────────────────
  {
    id: "SPREADING",
    label: "Spreading",
    dept: "Cutting",
    icon: "📐",
    accentColor: "rose",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "MARKER_MAKING",
    label: "Marker Making",
    dept: "Cutting",
    icon: "📏",
    accentColor: "rose",
    isVendor: false,
    isQC: false,
    slaHours: 1,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "FUSING",
    label: "Fusing / Interlining",
    dept: "Cutting",
    icon: "🔥",
    accentColor: "red",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["CUTTING"],
  },
  {
    id: "NUMBERING",
    label: "Numbering / Bundling",
    dept: "Cutting",
    icon: "🔢",
    accentColor: "red",
    isVendor: false,
    isQC: false,
    slaHours: 1,
    predecessors: ["CUTTING"],
  },

  // ── WET PROCESSING SUB-STEPS (dept: "Dyeing") ─────────────────────────────
  {
    id: "BLEACHING",
    label: "Bleaching",
    dept: "Dyeing",
    icon: "🫗",
    accentColor: "pink",
    isVendor: true,
    isQC: false,
    slaHours: 24,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "PRINTING_FABRIC",
    label: "Fabric Printing",
    dept: "Printing",
    icon: "🖨️",
    accentColor: "amber",
    isVendor: true,
    isQC: false,
    slaHours: 48,
    predecessors: ["FABRIC_INSPECTION"],
  },

  // ── DECORATION – FABRIC STAGE (dept: "Hand Work" / "Embroidery") ──────────
  {
    id: "SEQUIN_FABRIC",
    label: "Sequin / Mirror Work",
    dept: "Hand Work",
    icon: "💎",
    accentColor: "yellow",
    isVendor: true,
    isQC: false,
    slaHours: 48,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "SMOCKING",
    label: "Smocking",
    dept: "Hand Work",
    icon: "🪡",
    accentColor: "yellow",
    isVendor: false,
    isQC: false,
    slaHours: 24,
    predecessors: ["CUTTING"],
  },
  {
    id: "APPLIQUE_FABRIC",
    label: "Appliqué (Fabric)",
    dept: "Hand Work",
    icon: "🏵️",
    accentColor: "yellow",
    isVendor: false,
    isQC: false,
    slaHours: 16,
    predecessors: ["FABRIC_INSPECTION"],
  },

  // ── STITCHING SUB-STEPS (dept: "Stitching") ───────────────────────────────
  {
    id: "OVER_LOCKING",
    label: "Over Locking",
    dept: "Stitching",
    icon: "🔗",
    accentColor: "indigo",
    isVendor: false,
    isQC: false,
    slaHours: 4,
    predecessors: ["CUTTING"],
  },
  {
    id: "BUTTON_HOLE",
    label: "Button Hole / Button",
    dept: "Stitching",
    icon: "🔘",
    accentColor: "indigo",
    isVendor: false,
    isQC: false,
    slaHours: 3,
    predecessors: ["STITCHING"],
  },
  {
    id: "LINING_ATTACH",
    label: "Lining Attachment",
    dept: "Stitching",
    icon: "🪢",
    accentColor: "indigo",
    isVendor: false,
    isQC: false,
    slaHours: 4,
    predecessors: ["STITCHING"],
  },
  {
    id: "ZIPPER_ATTACH",
    label: "Zipper Attachment",
    dept: "Stitching",
    icon: "🤐",
    accentColor: "slate",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["STITCHING"],
  },

  // ── GARMENT PRINTING SUB-TYPES (dept: "Printing") ────────────────────────
  {
    id: "SCREEN_PRINTING",
    label: "Screen Printing",
    dept: "Printing",
    icon: "🖼️",
    accentColor: "orange",
    isVendor: true,
    isQC: false,
    slaHours: 24,
    predecessors: ["STITCHING"],
  },
  {
    id: "HEAT_TRANSFER",
    label: "Heat Transfer / DTF",
    dept: "Printing",
    icon: "♨️",
    accentColor: "orange",
    isVendor: true,
    isQC: false,
    slaHours: 12,
    predecessors: ["STITCHING"],
  },
  {
    id: "SUBLIMATION",
    label: "Sublimation Print",
    dept: "Printing",
    icon: "🌈",
    accentColor: "orange",
    isVendor: true,
    isQC: false,
    slaHours: 24,
    predecessors: ["CUTTING"],
  },

  // ── HAND WORK SUB-TYPES (dept: "Hand Work") ───────────────────────────────
  {
    id: "PATCH_WORK",
    label: "Patch Work",
    dept: "Hand Work",
    icon: "🩹",
    accentColor: "yellow",
    isVendor: false,
    isQC: false,
    slaHours: 12,
    predecessors: ["STITCHING"],
  },
  {
    id: "STONE_WORK",
    label: "Stone / Rhinestone",
    dept: "Hand Work",
    icon: "💠",
    accentColor: "blue",
    isVendor: false,
    isQC: false,
    slaHours: 16,
    predecessors: ["STITCHING"],
  },
  {
    id: "LACE_ATTACH",
    label: "Lace / Trim Attach",
    dept: "Hand Work",
    icon: "🎀",
    accentColor: "pink",
    isVendor: false,
    isQC: false,
    slaHours: 8,
    predecessors: ["STITCHING"],
  },

  // ── WASHING SUB-TYPES (dept: "Washing") ──────────────────────────────────
  {
    id: "ACID_WASH",
    label: "Acid / Stone Wash",
    dept: "Washing",
    icon: "🧴",
    accentColor: "cyan",
    isVendor: true,
    isQC: false,
    slaHours: 24,
    predecessors: ["STITCHING"],
  },
  {
    id: "ENZYME_WASH",
    label: "Enzyme Wash",
    dept: "Washing",
    icon: "🔬",
    accentColor: "cyan",
    isVendor: true,
    isQC: false,
    slaHours: 12,
    predecessors: ["STITCHING"],
  },
  {
    id: "DRY_CLEANING",
    label: "Dry Cleaning",
    dept: "Washing",
    icon: "🧹",
    accentColor: "teal",
    isVendor: true,
    isQC: false,
    slaHours: 8,
    predecessors: ["FINISHING"],
  },

  // ── FINISHING SUB-STEPS (dept: "Finishing") ───────────────────────────────
  {
    id: "THREAD_CUTTING",
    label: "Thread Cutting",
    dept: "Finishing",
    icon: "🪚",
    accentColor: "emerald",
    isVendor: false,
    isQC: false,
    slaHours: 3,
    predecessors: ["STITCHING", "WASHING"],
  },
  {
    id: "IRONING",
    label: "Ironing / Pressing",
    dept: "Finishing",
    icon: "🫸",
    accentColor: "emerald",
    isVendor: false,
    isQC: false,
    slaHours: 4,
    predecessors: ["FINISHING", "THREAD_CUTTING"],
  },
  {
    id: "STAIN_REMOVAL",
    label: "Stain Removal",
    dept: "Finishing",
    icon: "🧽",
    accentColor: "emerald",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["FINISHING"],
  },
  {
    id: "TAGGING",
    label: "Tagging / Labelling",
    dept: "Finishing",
    icon: "🏷️",
    accentColor: "green",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["FINISHING", "QC_CHECK"],
  },

  // ── QUALITY SUB-STEPS (dept: "QC Check") ─────────────────────────────────
  {
    id: "INLINE_QC",
    label: "Inline QC",
    dept: "QC Check",
    icon: "🔎",
    accentColor: "teal",
    isVendor: false,
    isQC: true,
    slaHours: 2,
    predecessors: ["STITCHING"],
  },
  {
    id: "FINAL_QC",
    label: "Final / AQL Inspection",
    dept: "QC Check",
    icon: "📋",
    accentColor: "teal",
    isVendor: false,
    isQC: true,
    slaHours: 4,
    predecessors: ["FINISHING"],
  },
  {
    id: "BUYER_QC",
    label: "Buyer QC / Third Party",
    dept: "QC Check",
    icon: "🕵️",
    accentColor: "teal",
    isVendor: true,
    isQC: true,
    slaHours: 8,
    predecessors: ["FINISHING", "QC_CHECK"],
  },

  // ── DISPATCH SUB-STEPS (dept: "Packing") ──────────────────────────────────
  {
    id: "FOLDING_PACKING",
    label: "Folding & Packing",
    dept: "Packing",
    icon: "🗂️",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 4,
    predecessors: ["QC_CHECK", "TAGGING"],
  },
  {
    id: "CARTON_PACKING",
    label: "Carton / Box Packing",
    dept: "Packing",
    icon: "📫",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 3,
    predecessors: ["PACKING", "FOLDING_PACKING"],
  },
  {
    id: "DISPATCH",
    label: "Dispatch / Shipment",
    dept: "Packing",
    icon: "🚚",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["PACKING", "CARTON_PACKING"],
  },

  // ── FABRIC TESTING (new) ──────────────────────────────────────────────────
  {
    id: "COLOUR_FASTNESS",
    label: "Colour Fastness Test",
    dept: "Fabric Inspection",
    icon: "🎯",
    accentColor: "lime",
    isVendor: false,
    isQC: true,
    slaHours: 3,
    predecessors: [],
  },
  {
    id: "PH_TEST",
    label: "pH / Chemical Test",
    dept: "Fabric Inspection",
    icon: "⚗️",
    accentColor: "lime",
    isVendor: false,
    isQC: true,
    slaHours: 2,
    predecessors: [],
  },
  {
    id: "FABRIC_RELAXATION",
    label: "Fabric Relaxation",
    dept: "Fabric Inspection",
    icon: "🪞",
    accentColor: "lime",
    isVendor: false,
    isQC: false,
    slaHours: 4,
    predecessors: ["FABRIC_INSPECTION"],
  },

  // ── CUT ROOM (new) ────────────────────────────────────────────────────────
  {
    id: "BAND_KNIFE",
    label: "Band Knife Cutting",
    dept: "Cutting",
    icon: "🔪",
    accentColor: "rose",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["SPREADING", "CUTTING"],
  },
  {
    id: "TICKET_LOOP",
    label: "Ticket / Loop Attach",
    dept: "Cutting",
    icon: "🏷️",
    accentColor: "red",
    isVendor: false,
    isQC: false,
    slaHours: 1,
    predecessors: ["NUMBERING", "CUTTING"],
  },

  // ── WET PROCESSING (new) ──────────────────────────────────────────────────
  {
    id: "MERCERIZING",
    label: "Mercerizing",
    dept: "Dyeing",
    icon: "💧",
    accentColor: "pink",
    isVendor: true,
    isQC: false,
    slaHours: 12,
    predecessors: ["FABRIC_INSPECTION"],
  },
  {
    id: "SANDBLASTING",
    label: "Sandblasting (Denim)",
    dept: "Washing",
    icon: "🌪️",
    accentColor: "cyan",
    isVendor: true,
    isQC: false,
    slaHours: 8,
    predecessors: ["STITCHING", "WASHING"],
  },

  // ── PRINTING (new) ────────────────────────────────────────────────────────
  {
    id: "DIGITAL_PRINT",
    label: "Digital (Inkjet) Print",
    dept: "Printing",
    icon: "🖥️",
    accentColor: "orange",
    isVendor: true,
    isQC: false,
    slaHours: 12,
    predecessors: ["FABRIC_INSPECTION", "STITCHING"],
  },
  {
    id: "DISCHARGE_PRINT",
    label: "Discharge Printing",
    dept: "Printing",
    icon: "🧪",
    accentColor: "amber",
    isVendor: true,
    isQC: false,
    slaHours: 24,
    predecessors: ["DYEING", "FABRIC_INSPECTION"],
  },
  {
    id: "BLOCK_PRINT",
    label: "Block / Resist Print",
    dept: "Printing",
    icon: "🪵",
    accentColor: "amber",
    isVendor: true,
    isQC: false,
    slaHours: 48,
    predecessors: ["FABRIC_INSPECTION"],
  },

  // ── EMBELLISHMENT (new) ───────────────────────────────────────────────────
  {
    id: "BEADWORK",
    label: "Bead Work",
    dept: "Hand Work",
    icon: "📿",
    accentColor: "yellow",
    isVendor: false,
    isQC: false,
    slaHours: 24,
    predecessors: ["STITCHING"],
  },
  {
    id: "TASSELS_FRINGE",
    label: "Tassels / Fringe Attach",
    dept: "Hand Work",
    icon: "🧶",
    accentColor: "yellow",
    isVendor: false,
    isQC: false,
    slaHours: 8,
    predecessors: ["STITCHING"],
  },

  // ── STITCHING (new) ───────────────────────────────────────────────────────
  {
    id: "BARTACKING",
    label: "Bar Tacking",
    dept: "Stitching",
    icon: "📌",
    accentColor: "indigo",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["STITCHING"],
  },
  {
    id: "ELASTIC_ATTACH",
    label: "Elastic Attachment",
    dept: "Stitching",
    icon: "🪱",
    accentColor: "slate",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["STITCHING"],
  },

  // ── QUALITY (new) ─────────────────────────────────────────────────────────
  {
    id: "FIRST_PIECE_APPROVAL",
    label: "First Piece Approval (FPA)",
    dept: "QC Check",
    icon: "🥇",
    accentColor: "teal",
    isVendor: false,
    isQC: true,
    slaHours: 2,
    predecessors: ["STITCHING"],
  },
  {
    id: "END_LINE_CHECK",
    label: "End-of-Line Check",
    dept: "QC Check",
    icon: "🔏",
    accentColor: "teal",
    isVendor: false,
    isQC: true,
    slaHours: 2,
    predecessors: ["FINISHING", "THREAD_CUTTING"],
  },

  // ── PACKING / DISPATCH (new) ──────────────────────────────────────────────
  {
    id: "POLY_BAGGING",
    label: "Poly Bagging",
    dept: "Packing",
    icon: "🛍️",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 2,
    predecessors: ["TAGGING", "QC_CHECK"],
  },
  {
    id: "HANGER_ATTACH",
    label: "Hanger Attach",
    dept: "Packing",
    icon: "🧥",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 1,
    predecessors: ["TAGGING"],
  },
  {
    id: "BARCODE_SCAN",
    label: "Barcode / RFID Scan",
    dept: "Packing",
    icon: "📲",
    accentColor: "sky",
    isVendor: false,
    isQC: false,
    slaHours: 1,
    predecessors: ["POLY_BAGGING", "FOLDING_PACKING"],
  },
];

/** Fast lookup: stageId → PipelineStage */
export const STAGE_MAP = new Map<StageId, PipelineStage>(
  GARMENT_PIPELINE.map(s => [s.id, s])
);

/** Stage → Dept tab name (authoritative) */
export const STAGE_TO_DEPT: Record<string, string> = Object.fromEntries(
  GARMENT_PIPELINE.map(s => [s.id, s.dept])
);

// ─── Routing helpers ──────────────────────────────────────────────────────────

/**
 * Returns the StageId for an op, using stage field first, then
 * workstationType, then name-based fuzzy match as last resort.
 *
 * Handles aliases: workstationType "QC" is disambiguated by op name.
 * "Dye House" → DYEING. "Hand Work" / "Karigar" → HAND_WORK.
 */
export function getOpStageId(op: any): StageId | null {
  // 1. Explicit stage field — must be a valid StageId
  if (op.stage && STAGE_MAP.has(op.stage as StageId)) return op.stage as StageId;

  // 2. stage field may be a dept label (e.g. "Fabric Inspection") or broken uppercase
  //    with spaces (e.g. "FABRIC INSPECTION" from old toUpperCase bug). Normalise it.
  if (op.stage) {
    // Try spaces→underscores uppercase match first (catches the old bug output)
    const normalised = String(op.stage).trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z_]/g, "") as StageId;
    if (STAGE_MAP.has(normalised)) return normalised;

    // Try dept label match
    const lower = String(op.stage).toLowerCase().trim();
    for (const stage of GARMENT_PIPELINE) {
      if (stage.dept.toLowerCase() === lower || stage.label.toLowerCase() === lower) return stage.id;
    }
  }

  const wst = (op.workstationType || "").toLowerCase().trim();
  const name = (op.name || "").toLowerCase().trim();

  // 3. workstationType may itself be a valid dept tab name (e.g. "Fabric Inspection", "QC Check")
  //    Handle this before fuzzy logic so exact dept names don't get mis-matched.
  for (const stage of GARMENT_PIPELINE) {
    if (wst === stage.dept.toLowerCase()) return stage.id;
    if (wst === stage.label.toLowerCase()) return stage.id;
  }

  // 4. workstationType-based disambiguation for ambiguous short values
  if (wst === "qc") {
    if (name.includes("fabric") || name.includes("insp")) return "FABRIC_INSPECTION";
    if (name.includes("qc check") || name.includes("final") || name.includes("quality check")) return "QC_CHECK";
    // default ambiguous "QC" → FABRIC_INSPECTION (first QC in pipeline)
    return "FABRIC_INSPECTION";
  }
  if (wst.includes("dye") || name.includes("dyeing") || name.includes("fabric dye")) return "DYEING";
  if (wst.includes("hand work") || wst.includes("karigar") || (wst.includes("hand") && name.includes("work"))) return "HAND_WORK";

  // 5. Fuzzy match by dept label
  for (const stage of GARMENT_PIPELINE) {
    const dept = stage.dept.toLowerCase();
    if (wst && wst.includes(dept)) return stage.id;
    if (wst && dept.includes(wst) && wst.length > 3) return stage.id;
    if (name.includes(dept) || name.includes(stage.label.toLowerCase())) return stage.id;
  }
  return null;
}

/**
 * Derives the ordered route of PipelineStages from a WO's operations array.
 * Result is sorted by GARMENT_PIPELINE order, filtered to only stages present in ops.
 */
export function deriveWORoute(operations: any[]): { stage: PipelineStage; op: any }[] {
  const pipelineOrder = GARMENT_PIPELINE.map(s => s.id);
  const seen = new Set<string>();
  const result: { stage: PipelineStage; op: any }[] = [];

  for (const op of operations) {
    const stageId = getOpStageId(op);
    if (!stageId) continue;
    const stage = STAGE_MAP.get(stageId);
    if (!stage) continue;
    // Skip duplicate stages — keep first occurrence (pipeline order sort below picks the right one)
    if (seen.has(stageId)) continue;
    seen.add(stageId);
    result.push({ stage, op });
  }

  // Sort by pipeline order
  result.sort((a, b) => pipelineOrder.indexOf(a.stage.id) - pipelineOrder.indexOf(b.stage.id));
  return result;
}

/**
 * Returns true if this operation belongs to the given department tab.
 * Priority: stage field → workstationType → name text fallback.
 *
 * Special aliases handled here so every caller benefits:
 *   "QC" workstationType → "Fabric Inspection" (stage FABRIC_INSPECTION)
 *                         or "QC Check" (stage QC_CHECK)
 *   "Dye House" workstationType → "Dyeing"
 */
export function opBelongsToDept(op: any, deptTabName: string): boolean {
  const stageId = getOpStageId(op);
  if (stageId) {
    const stage = STAGE_MAP.get(stageId);
    if (stage) return stage.dept.toLowerCase() === deptTabName.toLowerCase();
  }

  // workstationType alias table
  const wst = (op.workstationType || "").toLowerCase().trim();
  const dept = deptTabName.toLowerCase().trim();

  // Direct match
  if (wst && wst === dept) return true;

  // Alias: "QC" workstationType belongs to both Fabric Inspection and QC Check
  // (resolved by checking op name / stage for disambiguation)
  if (wst === "qc") {
    const name = (op.name || "").toLowerCase();
    if (dept === "fabric inspection" && (name.includes("fabric insp") || name.includes("fabric inspection"))) return true;
    if (dept === "qc check" && (name.includes("qc check") || name.includes("quality check") || name.includes("final qc"))) return true;
    // If we can't tell, match on position: fabric inspection gets it if it's the first QC op
    if (dept === "fabric inspection" || dept === "qc check") return name.includes("insp") ? dept === "fabric inspection" : dept === "qc check";
  }

  // Alias: "Dye House", "Dyehouse" → Dyeing
  if ((wst.includes("dye") || wst.includes("dyeing")) && dept === "dyeing") return true;

  // Alias: "Hand Work", "Handwork", "Karigar" → Hand Work
  if ((wst.includes("hand") || wst.includes("karigar")) && dept === "hand work") return true;

  // Name-based fuzzy fallback
  return (op.name || "").toLowerCase().includes(dept.replace(" ", ""));
}

// ─── Blocking / gating logic ──────────────────────────────────────────────────

type OpStatus = string; // "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | WorkflowState

function isOpCompleted(op: any): boolean {
  return (
    op.status === "COMPLETED" ||
    op.workflowState === "Completed"
  );
}

/**
 * Given a WO's operations array, determines if the operation at `opIndex`
 * is blocked by an upstream incomplete operation.
 *
 * Uses pipeline DAG: all predecessor stages defined in GARMENT_PIPELINE must
 * be Completed before this op can start.
 *
 * Returns: { blocked: boolean; blockedBy: string | null }
 */
export function computeBlockState(
  operations: any[],
  opIndex: number
): { blocked: boolean; blockedBy: string | null } {
  const op = operations[opIndex];
  if (!op) return { blocked: false, blockedBy: null };

  const thisStageId = getOpStageId(op);
  if (!thisStageId) {
    // Fallback: simple sequential — only block if a previous op in the array
    // is not done AND that previous op maps to a real pipeline stage that
    // should precede this one. If we can't determine stages, don't block at all
    // to avoid false positives on unlabelled ops.
    return { blocked: false, blockedBy: null };
  }

  const stage = STAGE_MAP.get(thisStageId);
  if (!stage || stage.predecessors.length === 0) {
    return { blocked: false, blockedBy: null };
  }

  // ── KEY FIX ──────────────────────────────────────────────────────────────
  // Build the WO's actual ordered route from its operations array.
  // A predecessor only blocks if it:
  //   1. Is present in this WO's operations (otherwise skip — not in route)
  //   2. Appears BEFORE the current op in the WO's own route order
  //      (i.e. its pipeline position is lower than this op's position)
  //
  // This prevents the DAG from blocking a stage that is intentionally the
  // FIRST step of a particular WO's route (e.g. a WO that starts at
  // Fabric Printing before Fabric Inspection, by design).
  // ─────────────────────────────────────────────────────────────────────────
  const pipelineOrder = GARMENT_PIPELINE.map(s => s.id);
  const thisPosition = pipelineOrder.indexOf(thisStageId);

  for (const predId of stage.predecessors) {
    // Skip predecessors that come AFTER this stage in global pipeline order
    // (can happen in some multi-path DAGs — they are not real blockers)
    const predPosition = pipelineOrder.indexOf(predId);
    if (predPosition >= thisPosition) continue;

    // Find op(s) in this WO that correspond to the predecessor stage
    const predOps = operations.filter(o => getOpStageId(o) === predId);
    if (predOps.length === 0) continue; // predecessor not in this WO's route — not a blocker

    // ── ROUTE ORDER CHECK ─────────────────────────────────────────────────
    // Verify the predecessor op actually appears before this op in the
    // operations array (i.e. it is upstream in THIS WO's intended route).
    // If for some reason it appears after, it is not a blocker.
    const predOpIndices = predOps.map(po => operations.indexOf(po));
    const anyPredBefore = predOpIndices.some(pi => pi < opIndex);
    if (!anyPredBefore) continue;

    const allPredDone = predOps.every(isOpCompleted);
    if (!allPredDone) {
      const predStage = STAGE_MAP.get(predId);
      return {
        blocked: true,
        blockedBy: predStage?.label || predId,
      };
    }
  }

  return { blocked: false, blockedBy: null };
}

// ─── Pipeline progress ────────────────────────────────────────────────────────

export interface PipelineProgress {
  /** Ordered stages in this WO's route */
  route: { stage: PipelineStage; op: any; isCompleted: boolean; isActive: boolean; isBlocked: boolean }[];
  /** 0–100 */
  overallPct: number;
  /** Stage label of current active stage */
  currentStage: string;
  /** Number of completed stages */
  completedCount: number;
}

export function computePipelineProgress(operations: any[]): PipelineProgress {
  const route = deriveWORoute(operations);
  const enriched = route.map(({ stage, op }, idx) => {
    const isCompleted = isOpCompleted(op);
    const isActive = !isCompleted && (idx === 0 || route.slice(0, idx).every(r => isOpCompleted(r.op)));
    const { blocked: isBlocked } = computeBlockState(operations, operations.indexOf(op));
    return { stage, op, isCompleted, isActive, isBlocked };
  });

  const completedCount = enriched.filter(r => r.isCompleted).length;
  const overallPct = enriched.length > 0 ? Math.round((completedCount / enriched.length) * 100) : 0;
  const active = enriched.find(r => r.isActive);
  const currentStage = active?.stage.label ?? (completedCount === enriched.length && enriched.length > 0 ? "Completed" : "Pending");

  return { route: enriched, overallPct, currentStage, completedCount };
}

// ─── Next-dept unlocking ──────────────────────────────────────────────────────

/**
 * When a dept completes its op, this returns the dept labels that are now unblocked.
 * Used to surface "You just unlocked Stitching" alerts in the UI.
 */
export function getUnlockedDepts(operations: any[], justCompletedOpIndex: number): string[] {
  const justCompletedOp = operations[justCompletedOpIndex];
  if (!justCompletedOp) return [];

  const justCompletedStageId = getOpStageId(justCompletedOp);
  const unlocked: string[] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (i === justCompletedOpIndex) continue;
    if (isOpCompleted(op)) continue;

    const stageId = getOpStageId(op);
    if (!stageId) continue;
    const stage = STAGE_MAP.get(stageId);
    if (!stage) continue;

    // This op lists the just-completed stage as a predecessor
    if (!stage.predecessors.includes(justCompletedStageId as StageId)) continue;

    // Check if it was blocked before (all preds done except justCompleted)
    const wasPreviouslyBlocked = stage.predecessors.some(predId => {
      if (predId === justCompletedStageId) return false; // we just did this one
      const predOps = operations.filter(o => getOpStageId(o) === predId);
      if (predOps.length === 0) return false;
      return !predOps.every(isOpCompleted);
    });

    // Now check if it's unblocked
    const { blocked: stillBlocked } = computeBlockState(operations, i);
    if (!stillBlocked && !wasPreviouslyBlocked) {
      unlocked.push(stage.dept);
    }
  }

  return [...new Set(unlocked)];
}

// ─── Route templates ──────────────────────────────────────────────────────────

/**
 * Common WO route templates for quick creation.
 * Each template specifies the ordered stages to include.
 */
export const ROUTE_TEMPLATES: { name: string; description: string; stages: StageId[] }[] = [
  {
    name: "Basic (Cut → Stitch → Finish → Pack)",
    description: "Standard route for solid-color basics",
    stages: ["FABRIC_INSPECTION", "CUTTING", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Basic + Detailed Finishing",
    description: "Basics with thread cutting, ironing, tagging sub-steps",
    stages: ["FABRIC_INSPECTION", "SPREADING", "MARKER_MAKING", "CUTTING", "FUSING", "NUMBERING", "STITCHING", "OVER_LOCKING", "THREAD_CUTTING", "IRONING", "TAGGING", "INLINE_QC", "FINAL_QC", "FOLDING_PACKING", "CARTON_PACKING", "DISPATCH"],
  },
  {
    name: "Printed (Cut → Stitch → Print → Finish → Pack)",
    description: "T-shirts, kurtas with garment printing",
    stages: ["FABRIC_INSPECTION", "CUTTING", "STITCHING", "GARMENT_PRINTING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Screen Print / DTF",
    description: "Garments with screen printing or heat transfer",
    stages: ["FABRIC_INSPECTION", "CUTTING", "STITCHING", "OVER_LOCKING", "SCREEN_PRINTING", "HEAT_TRANSFER", "THREAD_CUTTING", "IRONING", "INLINE_QC", "FINAL_QC", "TAGGING", "FOLDING_PACKING"],
  },
  {
    name: "Sublimation (All-Over Print)",
    description: "Sportswear, athleisure with sublimation printing",
    stages: ["FABRIC_INSPECTION", "GSMLOT_TEST", "CUTTING", "SUBLIMATION", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Embroidered (Cut → Stitch → Embroidery → Finish → Pack)",
    description: "Ethnic wear with garment embroidery",
    stages: ["FABRIC_INSPECTION", "CUTTING", "STITCHING", "EMBROIDERY_GARMENT", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Heavy Ethnic (Full Embroidery + Hand Work)",
    description: "Lehenga, bridal wear — fabric embroidery, stone work, lace",
    stages: ["FABRIC_INSPECTION", "SHRINKAGE_TEST", "EMBROIDERY_FABRIC", "SEQUIN_FABRIC", "CUTTING", "FUSING", "STITCHING", "LINING_ATTACH", "EMBROIDERY_GARMENT", "STONE_WORK", "LACE_ATTACH", "PATCH_WORK", "THREAD_CUTTING", "IRONING", "STAIN_REMOVAL", "INLINE_QC", "FINAL_QC", "BUYER_QC", "TAGGING", "FOLDING_PACKING"],
  },
  {
    name: "Washed Denim (Cut → Stitch → Acid Wash → Finish → Pack)",
    description: "Denim jeans, jackets with acid/stone wash",
    stages: ["FABRIC_INSPECTION", "SPREADING", "CUTTING", "NUMBERING", "STITCHING", "BUTTON_HOLE", "ZIPPER_ATTACH", "ACID_WASH", "THREAD_CUTTING", "IRONING", "INLINE_QC", "FINAL_QC", "TAGGING", "CARTON_PACKING"],
  },
  {
    name: "Enzyme Washed Casuals",
    description: "Casual shirts, pants with enzyme wash finish",
    stages: ["FABRIC_INSPECTION", "CUTTING", "STITCHING", "BUTTON_HOLE", "ENZYME_WASH", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Dyed Fabric (Dye → Cut → Stitch → Finish → Pack)",
    description: "Custom dyed fabric garments",
    stages: ["FABRIC_INSPECTION", "DYEING", "CUTTING", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Dyed + Bleached Fabric",
    description: "Fabric with dyeing and bleaching before cut",
    stages: ["FABRIC_INSPECTION", "GSMLOT_TEST", "BLEACHING", "DYEING", "SHRINKAGE_TEST", "CUTTING", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Full Embroidered Ethnic",
    description: "Heavy ethnic wear — fabric embroidery + garment work",
    stages: ["FABRIC_INSPECTION", "EMBROIDERY_FABRIC", "CUTTING", "STITCHING", "EMBROIDERY_GARMENT", "HAND_WORK", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Printed Fabric (Print Fabric → Cut → Stitch → Finish → Pack)",
    description: "All-over printed fabric garments",
    stages: ["FABRIC_INSPECTION", "FABRIC_PRINTING", "CUTTING", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Export Order (Full Compliance)",
    description: "Export garments with inline QC, AQL, buyer inspection, dispatch",
    stages: ["FABRIC_INSPECTION", "GSMLOT_TEST", "SHRINKAGE_TEST", "SPREADING", "MARKER_MAKING", "CUTTING", "FUSING", "NUMBERING", "STITCHING", "OVER_LOCKING", "BUTTON_HOLE", "THREAD_CUTTING", "IRONING", "STAIN_REMOVAL", "INLINE_QC", "FINAL_QC", "BUYER_QC", "TAGGING", "FOLDING_PACKING", "CARTON_PACKING", "DISPATCH"],
  },
  {
    name: "Smocked / Appliqué Ethnic",
    description: "Ethnic wear with smocking or appliqué at fabric stage",
    stages: ["FABRIC_INSPECTION", "APPLIQUE_FABRIC", "SMOCKING", "CUTTING", "STITCHING", "LACE_ATTACH", "FINISHING", "QC_CHECK", "PACKING"],
  },

  // ── NEW TEMPLATES ─────────────────────────────────────────────────────────
  {
    name: "Formal Shirt (Full Cut Room)",
    description: "Export shirt — full cut room, bar tacking, FPA, end-line check",
    stages: ["FABRIC_INSPECTION", "GSMLOT_TEST", "SPREADING", "MARKER_MAKING", "CUTTING", "FUSING", "NUMBERING", "STITCHING", "OVER_LOCKING", "BUTTON_HOLE", "BARTACKING", "FIRST_PIECE_APPROVAL", "THREAD_CUTTING", "IRONING", "STAIN_REMOVAL", "END_LINE_CHECK", "TAGGING", "POLY_BAGGING", "CARTON_PACKING"],
  },
  {
    name: "Salwar Suit (Plain)",
    description: "Simple salwar suit with elastic waistband",
    stages: ["FABRIC_INSPECTION", "CUTTING", "STITCHING", "ELASTIC_ATTACH", "FINISHING", "QC_CHECK", "TAGGING", "PACKING"],
  },
  {
    name: "Sharara / Gharara",
    description: "Ethnic bottom with fabric embroidery, lace, hand work",
    stages: ["FABRIC_INSPECTION", "EMBROIDERY_FABRIC", "CUTTING", "STITCHING", "LACE_ATTACH", "HAND_WORK", "THREAD_CUTTING", "IRONING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Saree (Embroidered)",
    description: "Embroidered saree with sequin and colour fastness test",
    stages: ["FABRIC_INSPECTION", "COLOUR_FASTNESS", "EMBROIDERY_FABRIC", "SEQUIN_FABRIC", "FINISHING", "QC_CHECK", "FOLDING_PACKING"],
  },
  {
    name: "Co-ord Set (Printed)",
    description: "Matching co-ord with fabric print, elastic, hanger pack",
    stages: ["FABRIC_INSPECTION", "FABRIC_PRINTING", "MARKER_MAKING", "CUTTING", "STITCHING", "ELASTIC_ATTACH", "THREAD_CUTTING", "IRONING", "FIRST_PIECE_APPROVAL", "TAGGING", "HANGER_ATTACH", "POLY_BAGGING"],
  },
  {
    name: "Jacket (Lined)",
    description: "Structured jacket — fusing, lining, zipper, bar tack, hanger pack",
    stages: ["FABRIC_INSPECTION", "SHRINKAGE_TEST", "SPREADING", "CUTTING", "FUSING", "STITCHING", "LINING_ATTACH", "ZIPPER_ATTACH", "BARTACKING", "THREAD_CUTTING", "IRONING", "END_LINE_CHECK", "TAGGING", "HANGER_ATTACH", "POLY_BAGGING", "CARTON_PACKING"],
  },
  {
    name: "Sportswear / Activewear",
    description: "Sublimation printed, elastic, barcode scan for e-com",
    stages: ["FABRIC_INSPECTION", "GSMLOT_TEST", "SUBLIMATION", "CUTTING", "STITCHING", "ELASTIC_ATTACH", "OVER_LOCKING", "THREAD_CUTTING", "FIRST_PIECE_APPROVAL", "BARCODE_SCAN", "POLY_BAGGING", "CARTON_PACKING"],
  },
  {
    name: "Block Print Ethnic (Fabric Stage)",
    description: "Hand block / resist print on fabric before cut",
    stages: ["FABRIC_INSPECTION", "FABRIC_RELAXATION", "BLOCK_PRINT", "CUTTING", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Discharge Print (Dyed Fabric)",
    description: "Dyed fabric with discharge over-print for effect",
    stages: ["FABRIC_INSPECTION", "COLOUR_FASTNESS", "DYEING", "DISCHARGE_PRINT", "CUTTING", "STITCHING", "FINISHING", "QC_CHECK", "PACKING"],
  },
  {
    name: "Export Order + Buyer QC (Full Compliance)",
    description: "End-to-end export order with FPA, AQL, buyer inspection, barcode, dispatch",
    stages: ["FABRIC_INSPECTION", "GSMLOT_TEST", "SHRINKAGE_TEST", "COLOUR_FASTNESS", "FABRIC_RELAXATION", "SPREADING", "MARKER_MAKING", "CUTTING", "FUSING", "NUMBERING", "TICKET_LOOP", "STITCHING", "OVER_LOCKING", "BUTTON_HOLE", "BARTACKING", "FIRST_PIECE_APPROVAL", "THREAD_CUTTING", "IRONING", "STAIN_REMOVAL", "INLINE_QC", "FINAL_QC", "BUYER_QC", "TAGGING", "POLY_BAGGING", "BARCODE_SCAN", "CARTON_PACKING", "DISPATCH"],
  },
];

// ─── Cross-stage field inheritance (dynamic routing) ──────────────────────────

/**
 * FIELD_INHERITANCE — generic map of "this stage's input field" → list of
 * candidate "predecessor's output field(s)" (checked in priority order).
 *
 * This is intentionally STAGE-AGNOSTIC about WHICH predecessor supplies the
 * value — getInheritedFieldData() walks the WO's own dynamic route (via
 * stage.predecessors + the operations array order), finds the nearest
 * completed predecessor, and pulls whichever candidate field is populated.
 *
 * Add new (targetField → [sourceField, ...]) entries here as new stages/forms
 * are introduced — no per-stage-pair wiring code needed elsewhere.
 */
export const FIELD_INHERITANCE: Record<StageId, Record<string, string[]>> = {
  FABRIC_INSPECTION: {
    totalMeters: ["receivedMeters", "acceptedMeters", "receivedFabricMeters", "totalMeters"],
    rollCount: ["rollCount"],
  },
  DYEING: {
    sentMeters: ["acceptedMeters", "totalMeters", "receivedFabricMeters"],
  },
  FABRIC_PRINTING: {
    sentMeters: ["acceptedMeters", "totalMeters", "receivedMeters"],
  },
  CUTTING: {
    fabricIssuedMeters: ["acceptedMeters", "receivedMeters", "totalMeters"],
  },
  STITCHING: {
    bundlesReceived: ["bundlesOut"],
  },
  GARMENT_PRINTING: {
    sentQty: ["bundlesOut", "completedQuantity"],
  },
  EMBROIDERY_GARMENT: {
    sentQty: ["bundlesOut", "completedQuantity"],
  },
  HAND_WORK: {
    sentQty: ["completedQuantity"],
  },
  FINISHING: {
    receivedQty: ["completedQuantity"],
  },
  QC_CHECK: {
    receivedQty: ["completedQuantity"],
  },
  PACKING: {
    receivedQty: ["completedQuantity"],
  },
} as Partial<Record<StageId, Record<string, string[]>>> as Record<StageId, Record<string, string[]>>;

/**
 * getInheritedFieldData — for the op at `opIndex`, walks this WO's dynamic
 * route to find the nearest completed predecessor (per GARMENT_PIPELINE DAG
 * + this WO's actual operations order), and returns a patch of
 * { targetField: value } for any FIELD_INHERITANCE entries that are
 * currently empty on the current op but available on that predecessor.
 *
 * Returns {} if there's nothing to inherit (no predecessor, predecessor not
 * completed, or fields already filled / unmapped).
 */
export function getInheritedFieldData(operations: any[], opIndex: number): Record<string, any> {
  const op = operations[opIndex];
  if (!op) return {};

  const thisStageId = getOpStageId(op);
  if (!thisStageId) return {};

  const inheritMap = FIELD_INHERITANCE[thisStageId];
  if (!inheritMap) return {};

  const stage = STAGE_MAP.get(thisStageId);
  if (!stage || stage.predecessors.length === 0) return {};

  const pipelineOrder = GARMENT_PIPELINE.map(s => s.id);
  const thisPosition = pipelineOrder.indexOf(thisStageId);
  const cd = op.customData || {};

  // Collect all completed predecessor ops present in THIS WO's route,
  // ordered by their position in the operations array (closest/last first).
  const candidates: any[] = [];
  for (const predId of stage.predecessors) {
    const predPosition = pipelineOrder.indexOf(predId);
    if (predPosition >= thisPosition) continue;

    const predOps = operations.filter((o, idx) => idx < opIndex && getOpStageId(o) === predId && isOpCompleted(o));
    candidates.push(...predOps);
  }
  if (candidates.length === 0) return {};

  // Prefer the predecessor op closest to (immediately before) this op.
  candidates.sort((a, b) => operations.indexOf(b) - operations.indexOf(a));

  const patch: Record<string, any> = {};
  for (const [targetField, sourceFields] of Object.entries(inheritMap)) {
    if (cd[targetField]) continue; // already filled — never overwrite

    for (const predOp of candidates) {
      const predCd = predOp.customData || {};
      const value = sourceFields
        .map(f => predCd[f] ?? predOp[f])
        .find(v => v !== undefined && v !== null && v !== "");
      if (value !== undefined) {
        patch[targetField] = value;
        break;
      }
    }
  }
  return patch;
}