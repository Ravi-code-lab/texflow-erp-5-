import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { uuidShort } from "../utils/uuid";
import { PackingSlip, Order, CompanyInfo, InventoryItem } from '../types';
import {
  Search, Plus, ArrowLeft, Save, Trash2, ChevronLeft, ChevronRight,
  Printer, Box, Package, Weight, CalendarDays, User, Hash,
  ClipboardList, Copy, CheckCircle2, AlertCircle, MoreVertical,
  Download, Eye, Layers, Tag, Ruler, Palette, RefreshCw, FileText,
  AlertTriangle, Minus,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ───────────────────────────────────────────────────────────────────

/** One size in a size-set ratio, e.g. { size: 'M', ratio: 3 } */
interface SizeRatioEntry {
  size: string;
  ratio: number;
}

/** Extra loose pcs by size added on top of sets, e.g. { size: 'S', qty: 3 } */
interface LoosePcEntry {
  size: string;
  qty: number;
}

interface BoxItem {
  productName: string;
  style?: string;
  color?: string;
  unit: string;
  imageUrl?: string;            // product thumbnail from inventory
  inventoryId?: string;         // linked inventory item id
  // NEW: size-set mode
  useSizeSet: boolean;          // true = size-set entry; false = single size flat qty
  // flat mode (useSizeSet = false)
  size?: string;
  quantity: number;             // pcs (flat) OR sets count (size-set mode)
  // size-set mode (useSizeSet = true)
  sizeRatios: SizeRatioEntry[]; // e.g. [{size:'S',ratio:1},{size:'M',ratio:2},{size:'L',ratio:1}]
  sets: number;                 // how many complete sets packed in this box
  // loose pcs alongside sets (size-set mode only)
  loosePcs: LoosePcEntry[];     // extra individual pcs by size, e.g. [{size:'S',qty:3},{size:'M',qty:2}]
}

interface PackingBox {
  id: string;
  boxNo: string;
  dimensions?: string;
  netWeight?: number;
  grossWeight?: number;
  items: BoxItem[];
}

interface SlipFormData extends Partial<PackingSlip> {
  boxes: PackingBox[];
}

interface PackingSlipProps {
  slips: PackingSlip[];
  orders: Order[];
  pendingOrderId?: string;
  onAddSlip: (slip: PackingSlip) => void;
  onUpdateSlip: (slip: PackingSlip) => void;
  onAction?: (action: string, data: any) => void;
  companyInfo?: CompanyInfo;
  inventory?: InventoryItem[];
  onUpdateInventory?: (item: InventoryItem) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT:      { label: 'Draft',      color: 'bg-slate-100 text-slate-600 border-slate-200' },
  PACKED:     { label: 'Packed',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  DISPATCHED: { label: 'Dispatched', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
} as const;

type SlipStatus = keyof typeof STATUS_CONFIG;

// Standard sizes used for quick size-set presets
const SIZE_PRESETS: Record<string, string[]> = {
  'XS-XXL': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'S-XL':   ['S', 'M', 'L', 'XL'],
  'S-XXL':  ['S', 'M', 'L', 'XL', 'XXL'],
  '36-46':  ['36', '38', '40', '42', '44', '46'],
  '38-44':  ['38', '40', '42', '44'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Total pcs for a BoxItem regardless of mode (sets + loose pcs) */
function itemTotalPcs(it: BoxItem): number {
  if (!it.useSizeSet) return it.quantity || 0;
  const ratioSum = it.sizeRatios.reduce((s, r) => s + (r.ratio || 0), 0);
  const setPcs   = (it.sets || 0) * ratioSum;
  const loosePcs = (it.loosePcs || []).reduce((s, l) => s + (l.qty || 0), 0);
  return setPcs + loosePcs;
}

/** Breakdown by size for size-set item (sets + loose pcs merged per size) */
function sizeBreakdown(it: BoxItem): { size: string; qty: number }[] {
  if (!it.useSizeSet || !it.sizeRatios.length) return [];
  const map: Record<string, number> = {};
  it.sizeRatios.filter(r => r.ratio > 0).forEach(r => {
    map[r.size] = (map[r.size] || 0) + (it.sets || 0) * r.ratio;
  });
  (it.loosePcs || []).filter(l => l.qty > 0).forEach(l => {
    map[l.size] = (map[l.size] || 0) + l.qty;
  });
  return Object.entries(map).map(([size, qty]) => ({ size, qty }));
}

function emptyBoxItem(): BoxItem {
  return { productName: '', unit: 'PCS', useSizeSet: false, quantity: 0, sizeRatios: [], sets: 0, loosePcs: [] };
}

// ─── PDF helpers ──────────────────────────────────────────────────────────────

/** Safely embed a base64 image into jsPDF, returns true on success */
function tryAddImage(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number): boolean {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return false;
  try {
    const semi  = dataUrl.indexOf(';');
    const raw   = dataUrl.substring('data:image/'.length, semi).toUpperCase();
    const fmt   = raw === 'JPG' ? 'JPEG' : (raw || 'PNG');
    doc.addImage(dataUrl, fmt, x, y, w, h);
    return true;
  } catch { return false; }
}

/** Helper: label + value pair used in info blocks */
function infoCell(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(130);
  doc.text(label.toUpperCase(), x, y);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(25);
  doc.text(value || '—', x, y + 4.5);
}

/** Core slip renderer — shared by save-PDF and print */
async function renderSlipDoc(slip: SlipFormData, companyInfo?: CompanyInfo): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W   = doc.internal.pageSize.width;   // 210
  const H   = doc.internal.pageSize.height;  // 297
  const ML  = 14; const MR = 14;
  const CW  = W - ML - MR;                  // content width

  // ── accent colour ──
  const BLUE: [number,number,number] = [37, 99, 235];
  const LBLUE: [number,number,number] = [219, 234, 254];
  const DARK: [number,number,number]  = [15, 23, 42];
  const GREY: [number,number,number]  = [100, 116, 139];

  // ════ HEADER ════════════════════════════════════════════════════════════════
  // Top accent bar
  doc.setFillColor(...BLUE); doc.rect(0, 0, W, 2, 'F');

  // Company logo
  let logoRight = ML;
  if (companyInfo?.logoUrl) {
    const ok = tryAddImage(doc, companyInfo.logoUrl, ML, 8, 26, 26);
    if (ok) logoRight = ML + 30;
  }

  // Company name + address
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text((companyInfo?.name || 'Company').toUpperCase(), logoRight, 15);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY);
  let cly = 20;
  if (companyInfo?.address) { doc.text(companyInfo.address, logoRight, cly); cly += 4; }
  if (companyInfo?.gstin)   { doc.text(`GSTIN: ${companyInfo.gstin}`, logoRight, cly); cly += 4; }
  if (companyInfo?.phone)   { doc.text(`Ph: ${companyInfo.phone}`, logoRight, cly); }

  // PACKING SLIP title block (right side)
  doc.setFillColor(...BLUE);
  doc.roundedRect(W - MR - 58, 6, 58, 28, 2, 2, 'F');
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255);
  doc.text('PACKING SLIP', W - MR - 4, 16, { align: 'right' });
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(200);
  doc.text(`No: ${slip.id || 'DRAFT'}`,          W - MR - 4, 22, { align: 'right' });
  doc.text(`Date: ${slip.date || '—'}`,           W - MR - 4, 27, { align: 'right' });
  doc.text(`SO: ${slip.salesOrderId || '—'}`,     W - MR - 4, 32, { align: 'right' });

  let y = 42;

  // ── Divider ──
  doc.setDrawColor(...LBLUE); doc.setLineWidth(0.5); doc.line(ML, y, W - MR, y); y += 5;

  // ── Summary info row ──────────────────────────────────────────────────────
  const totalPcsAll = (slip.boxes || []).reduce((s, b) => s + b.items.reduce((si, it) => si + itemTotalPcs(it), 0), 0);

  // 4-column info strip
  const colW = CW / 4;
  const infos = [
    { label: 'Customer',      value: slip.customerName || '—' },
    { label: 'Total Boxes',   value: String(slip.boxes?.length || 0) },
    { label: 'Total Pcs',     value: String(totalPcsAll) },
    { label: 'Weight N / G',  value: `${slip.netWeight || 0} / ${slip.grossWeight || 0} kg` },
  ];
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(ML, y, CW, 16, 2, 2, 'F');
  infos.forEach((inf, i) => infoCell(doc, inf.label, inf.value, ML + 4 + i * colW, y + 4));
  y += 21;

  // ════ BOXES ═════════════════════════════════════════════════════════════════
  for (const box of (slip.boxes || [])) {
    const boxTotalPcs = box.items.reduce((s, it) => s + itemTotalPcs(it), 0);
    const hasImages   = box.items.some(it => !!it.imageUrl);

    // Estimate height needed: box header(12) + items
    // Each item with image: ~22mm; without image: size-set rows ≈ 6mm each + 8mm base
    const estH = 12 + box.items.reduce((s, it) => {
      if (hasImages) return s + 24;
      const rows = it.useSizeSet ? Math.max(1, sizeBreakdown(it).length) : 1;
      return s + rows * 6 + 4;
    }, 0) + 10;

    if (y + estH > H - 18) { doc.addPage(); y = 16; }

    // ── Box header bar ──
    doc.setFillColor(...BLUE);
    doc.roundedRect(ML, y, CW, 11, 1.5, 1.5, 'F');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255);
    doc.text(`BOX  ${box.boxNo}`, ML + 5, y + 7.5);
    // right: dims + weight
    const boxMeta: string[] = [];
    if (box.dimensions)  boxMeta.push(box.dimensions);
    if (box.netWeight)   boxMeta.push(`NW: ${box.netWeight}kg`);
    if (box.grossWeight) boxMeta.push(`GW: ${box.grossWeight}kg`);
    if (boxMeta.length) {
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(200);
      doc.text(boxMeta.join('  ·  '), W - MR - 4, y + 7.5, { align: 'right' });
    }
    y += 13;

    if (hasImages) {
      // ── IMAGE CARD layout ─────────────────────────────────────────────────
      // Each item = a card: image left (20×20) | name/style/colour right | size table far right
      for (let ii = 0; ii < box.items.length; ii++) {
        const it = box.items[ii];
        const bd = sizeBreakdown(it);
        const CARD_H = 22;

        if (y + CARD_H > H - 18) { doc.addPage(); y = 16; }

        // Card background (alternating)
        if (ii % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(ML, y, CW, CARD_H, 1, 1, 'F');
        }

        // ── Product image (20×20) ──
        const IMG = 20;
        const imgOk = it.imageUrl ? tryAddImage(doc, it.imageUrl, ML + 2, y + 1, IMG, IMG) : false;
        if (!imgOk) {
          doc.setFillColor(230, 236, 245);
          doc.roundedRect(ML + 2, y + 1, IMG, IMG, 1, 1, 'F');
          doc.setFontSize(6); doc.setTextColor(180);
          doc.text('IMG', ML + 2 + IMG / 2, y + 12, { align: 'center' });
        }

        // ── Item info (name / style / colour / total pcs) ──
        const TX = ML + IMG + 5;
        let ty = y + 5;
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
        const nameLines = doc.splitTextToSize(it.productName || '—', 55);
        nameLines.slice(0, 2).forEach((l: string) => { doc.text(l, TX, ty); ty += 4.5; });

        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY);
        const meta: string[] = [];
        if (it.style) meta.push(`Style: ${it.style}`);
        if (it.color) meta.push(`Colour: ${it.color}`);
        if (meta.length) { doc.text(meta.join('   '), TX, ty); ty += 4; }

        // Total pcs badge
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
        doc.text(`${itemTotalPcs(it)} ${it.unit || 'PCS'}`, TX, ty);

        // ── Size breakdown (right column) ──
        if (bd.length > 0) {
          const SX = ML + CW - 55;
          // Mini size table header
          doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY);
          doc.text('SIZE', SX, y + 5);
          doc.text('QTY', SX + 18, y + 5);
          doc.setDrawColor(...LBLUE); doc.setLineWidth(0.2);
          doc.line(SX, y + 6.5, SX + 40, y + 6.5);

          let sy = y + 10;
          bd.forEach(s => {
            doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
            doc.text(s.size, SX, sy);
            doc.setFont('helvetica', 'normal');
            doc.text(String(s.qty), SX + 18, sy);
            sy += 4;
          });
          // Total row
          doc.setDrawColor(...LBLUE); doc.line(SX, sy - 1, SX + 40, sy - 1);
          doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
          doc.text('TOTAL', SX, sy + 3);
          doc.text(String(itemTotalPcs(it)), SX + 18, sy + 3);
        } else if (it.size) {
          const SX = ML + CW - 55;
          doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY);
          doc.text(`Size: ${it.size}`, SX, y + 8);
        }

        // bottom divider
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
        doc.line(ML, y + CARD_H, ML + CW, y + CARD_H);

        y += CARD_H + 1;
      }

    } else {
      // ── TABLE layout (no images) ──────────────────────────────────────────
      const rows: (string | number)[][] = [];
      let rowIdx = 1;
      box.items.forEach(it => {
        const bd = sizeBreakdown(it);
        if (it.useSizeSet && bd.length > 0) {
          bd.forEach((s, si) => {
            rows.push([
              si === 0 ? rowIdx : '',
              si === 0 ? it.productName : '',
              si === 0 ? (it.style || '') : '',
              si === 0 ? (it.color || '') : '',
              s.size,
              s.qty,
              it.unit || 'PCS',
            ]);
          });
          rows.push(['', '', '', '', 'TOTAL', itemTotalPcs(it), it.unit || 'PCS']);
          rowIdx++;
        } else {
          rows.push([rowIdx++, it.productName, it.style || '', it.color || '', it.size || '', it.quantity, it.unit || 'PCS']);
        }
      });
      autoTable(doc, {
        startY: y,
        head: [['#', 'Item', 'Style', 'Colour', 'Size', 'Qty', 'UOM']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 8 }, 5: { cellWidth: 14, fontStyle: 'bold' }, 6: { cellWidth: 14 } },
        margin: { left: ML, right: MR },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    // ── Box footer summary ──
    doc.setFillColor(...LBLUE);
    doc.roundedRect(ML, y, CW, 7, 1, 1, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
    doc.text(
      `${box.items.length} style${box.items.length !== 1 ? 's' : ''}   ·   ${boxTotalPcs} pcs total`,
      ML + 5, y + 4.8
    );
    y += 11;
  }

  // ════ GRAND SUMMARY ═════════════════════════════════════════════════════════
  if (y + 20 > H - 18) { doc.addPage(); y = 16; }
  doc.setFillColor(...DARK);
  doc.roundedRect(ML, y, CW, 14, 2, 2, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255);
  const summItems = [
    `Boxes: ${slip.boxes?.length || 0}`,
    `Total Pcs: ${totalPcsAll}`,
    slip.netWeight   ? `Net Wt: ${slip.netWeight} kg`   : null,
    slip.grossWeight ? `Gross Wt: ${slip.grossWeight} kg` : null,
  ].filter(Boolean).join('     ');
  doc.text(summItems, ML + 5, y + 9);

  // ════ FOOTER ════════════════════════════════════════════════════════════════
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...BLUE); doc.rect(0, H - 10, W, 10, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(255);
    doc.text('TexFlow ERP · Packing Slip', ML, H - 4);
    doc.text(`Page ${p} of ${totalPages}`, W - MR, H - 4, { align: 'right' });
    doc.text(slip.id || '', W / 2, H - 4, { align: 'center' });
  }

  return doc;
}

async function buildSlipPDF(slip: SlipFormData, companyInfo?: CompanyInfo) {
  const doc = await renderSlipDoc(slip, companyInfo);
  doc.save(`${slip.id || 'PackingSlip'}.pdf`);
}

async function printSlipPDF(slip: SlipFormData, companyInfo?: CompanyInfo) {
  const doc = await renderSlipDoc(slip, companyInfo);
  const blobUrl = doc.output('bloburl');
  const win = window.open(blobUrl as unknown as string, '_blank');
  if (win) { win.onload = () => { win.focus(); win.print(); }; }
}

/** Shared: render one box label page into an existing jsPDF doc at current page */
async function renderBoxLabelPage(
  doc: jsPDF,
  slip: SlipFormData,
  box: PackingBox,
  companyInfo?: CompanyInfo,
) {
  const W = 100; // page width mm

  // ── Header bar ──
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, W, 13, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255);
  doc.text((companyInfo?.name || 'TexFlow').toUpperCase(), W / 2, 5.5, { align: 'center' });
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  if (companyInfo?.address) doc.text(companyInfo.address, W / 2, 9.5, { align: 'center' });

  // ── BOX number badge ──
  doc.setFillColor(240, 247, 255); doc.roundedRect(6, 16, W - 12, 16, 2, 2, 'F');
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
  doc.text(`BOX  ${box.boxNo}`, W / 2, 27, { align: 'center' });

  // ── Meta row ──
  let y = 37;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
  const metaParts = [
    slip.id   ? `Slip: ${slip.id}`              : null,
    slip.date ? `Date: ${slip.date}`             : null,
    slip.salesOrderId ? `SO: ${slip.salesOrderId}` : null,
  ].filter(Boolean).join('   ');
  doc.text(metaParts, W / 2, y, { align: 'center' }); y += 5;

  // Customer
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text('Customer:', 8, y);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(37, 99, 235);
  doc.text(slip.customerName || '—', 28, y); y += 5;

  // Dims / weight
  const meta2: string[] = [];
  if (box.dimensions) meta2.push(`Dims: ${box.dimensions}`);
  if (box.netWeight)  meta2.push(`NW: ${box.netWeight} kg`);
  if (box.grossWeight) meta2.push(`GW: ${box.grossWeight} kg`);
  if (meta2.length) {
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(meta2.join('   '), 8, y); y += 4;
  }

  // Divider
  doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(6, y, W - 6, y); y += 4;

  // ── Items (image left, name+style+pcs right) ──
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
  doc.text('CONTENTS', 8, y); y += 3.5;

  const IMG_SIZE = 18; // mm square
  const TEXT_X   = 8 + IMG_SIZE + 3;
  const TEXT_W   = W - TEXT_X - 6;

  for (const it of box.items) {
    if (y > 138) break; // safety
    const totalPcs = itemTotalPcs(it);
    const itemBottom = y + IMG_SIZE;

    // Image box (placeholder rect or actual image)
    doc.setDrawColor(220); doc.setLineWidth(0.2);
    doc.roundedRect(8, y, IMG_SIZE, IMG_SIZE, 1, 1, 'S');

    if (it.imageUrl) {
      try {
        // Detect format from data URL or assume PNG
        let fmt = 'PNG';
        if (it.imageUrl.startsWith('data:image/')) {
          const mid = it.imageUrl.substring('data:image/'.length, it.imageUrl.indexOf(';'));
          fmt = mid.toUpperCase() === 'JPG' ? 'JPEG' : mid.toUpperCase();
        }
        doc.addImage(it.imageUrl, fmt, 8.5, y + 0.5, IMG_SIZE - 1, IMG_SIZE - 1);
      } catch {
        // fallback: draw placeholder icon text
        doc.setFontSize(6); doc.setTextColor(180);
        doc.text('IMG', 8 + IMG_SIZE / 2, y + IMG_SIZE / 2 + 1, { align: 'center' });
      }
    } else {
      doc.setFontSize(6); doc.setTextColor(200);
      doc.text('no img', 8 + IMG_SIZE / 2, y + IMG_SIZE / 2 + 1, { align: 'center' });
    }

    // Text: product name
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(20);
    const nameLines = doc.splitTextToSize(it.productName || '—', TEXT_W);
    let ty = y + 4;
    nameLines.slice(0, 2).forEach((l: string) => { doc.text(l, TEXT_X, ty); ty += 4; });

    // Style
    if (it.style) {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
      doc.text(`Style: ${it.style}`, TEXT_X, ty); ty += 3.5;
    }

    // Colour
    if (it.color) {
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
      doc.text(`Colour: ${it.color}`, TEXT_X, ty); ty += 3.5;
    }

    // Size-wise breakdown
    const bd = sizeBreakdown(it);
    if (bd.length > 0) {
      const bdStr = bd.map(s => `${s.size}: ${s.qty}`).join('   ');
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
      const bdLines = doc.splitTextToSize(bdStr, TEXT_W);
      bdLines.forEach((l: string) => { doc.text(l, TEXT_X, ty); ty += 3.5; });
    } else if (!it.useSizeSet && it.size) {
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
      doc.text(`Size: ${it.size}`, TEXT_X, ty); ty += 3.5;
    }

    // Total pcs — prominent
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
    doc.text(`${totalPcs} ${it.unit || 'PCS'}`, TEXT_X, Math.max(ty, y + IMG_SIZE - 2));

    y = itemBottom + 4;

    // thin divider between items
    if (y < 138) {
      doc.setDrawColor(235); doc.setLineWidth(0.2);
      doc.line(8, y - 2, W - 8, y - 2);
    }
  }

  // ── Footer ──
  doc.setFillColor(37, 99, 235); doc.rect(0, 142, W, 8, 'F');
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(255);
  const totalPcsAll = box.items.reduce((s, it) => s + itemTotalPcs(it), 0);
  doc.text(`${box.items.length} style${box.items.length !== 1 ? 's' : ''}  ·  ${totalPcsAll} pcs total`, W / 2, 147, { align: 'center' });
}

async function buildBoxLabelPDF(slip: SlipFormData, box: PackingBox, companyInfo?: CompanyInfo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  await renderBoxLabelPage(doc, slip, box, companyInfo);
  doc.save(`${slip.id || 'Slip'}_Box${box.boxNo}.pdf`);
}

async function printAllBoxLabelsPDF(slip: SlipFormData, companyInfo?: CompanyInfo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
  const boxes = slip.boxes || [];
  for (let i = 0; i < boxes.length; i++) {
    if (i > 0) doc.addPage([100, 150]);
    await renderBoxLabelPage(doc, slip, boxes[i], companyInfo);
  }
  const blobUrl = doc.output('bloburl');
  const win = window.open(blobUrl as unknown as string, '_blank');
  if (win) { win.onload = () => { win.focus(); win.print(); }; }
}


// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status?: string }> = ({ status = 'DRAFT' }) => {
  const cfg = STATUS_CONFIG[status as SlipStatus] || STATUS_CONFIG.DRAFT;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>;
};

const Pill: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-[#e3e8ed] shadow-sm">
    <span className="text-[#2490ef]">{icon}</span>
    <div>
      <p className="text-[9px] text-[#8d99a6] uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-sm font-bold text-[#1c2126] leading-none mt-0.5">{value}</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ onNew: () => void }> = ({ onNew }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl bg-[#2490ef]/8 flex items-center justify-center mb-4">
      <Package className="w-8 h-8 text-[#2490ef]/50" />
    </div>
    <p className="text-base font-bold text-[#1c2126] mb-1">No packing slips yet</p>
    <p className="text-sm text-[#8d99a6] mb-5 max-w-xs">Create your first packing slip to start tracking boxes and dispatch</p>
    <button onClick={onNew} className="h-8 px-4 bg-[#2490ef] hover:bg-[#2081d6] text-white text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
      <Plus className="w-4 h-4" /> New Packing Slip
    </button>
  </div>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-[#525c66] uppercase tracking-widest">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inp = "w-full px-3 py-2 text-[13px] bg-white border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] focus:ring-2 focus:ring-[#2490ef]/20 transition-all text-[#1c2126] placeholder-[#c0c8d0]";
const sel = `${inp} appearance-none cursor-pointer`;

// ─── SizeSetEditor ────────────────────────────────────────────────────────────
const SizeSetEditor: React.FC<{
  item: BoxItem;
  onChange: (patch: Partial<BoxItem>) => void;
}> = ({ item, onChange }) => {
  const addSize = () => {
    onChange({ sizeRatios: [...item.sizeRatios, { size: '', ratio: 1 }] });
  };
  const removeSize = (idx: number) => {
    onChange({ sizeRatios: item.sizeRatios.filter((_, i) => i !== idx) });
  };
  const updateRatio = (idx: number, field: keyof SizeRatioEntry, val: string | number) => {
    const ratios = [...item.sizeRatios];
    ratios[idx] = { ...ratios[idx], [field]: field === 'ratio' ? Number(val) : val };
    onChange({ sizeRatios: ratios });
  };
  const applyPreset = (key: string) => {
    const sizes = SIZE_PRESETS[key];
    onChange({ sizeRatios: sizes.map(s => ({ size: s, ratio: 1 })) });
  };

  // Loose pcs helpers
  const loosePcs: LoosePcEntry[] = item.loosePcs || [];
  const addLoose = () => onChange({ loosePcs: [...loosePcs, { size: '', qty: 1 }] });
  const removeLoose = (idx: number) => onChange({ loosePcs: loosePcs.filter((_, i) => i !== idx) });
  const updateLoose = (idx: number, field: keyof LoosePcEntry, val: string | number) => {
    const arr = [...loosePcs];
    arr[idx] = { ...arr[idx], [field]: field === 'qty' ? Number(val) : val };
    onChange({ loosePcs: arr });
  };

  const pcsPerSet   = item.sizeRatios.reduce((s, r) => s + (r.ratio || 0), 0);
  const setPcsTotal = (item.sets || 0) * pcsPerSet;
  const loosePcsTotal = loosePcs.reduce((s, l) => s + (l.qty || 0), 0);
  const grandTotal  = setPcsTotal + loosePcsTotal;

  return (
    <div className="mt-1.5 bg-[#f0f7ff] border border-[#c5dffe] rounded-lg p-3 space-y-3">
      {/* presets */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] font-bold text-[#525c66] uppercase mr-1">Preset:</span>
        {Object.keys(SIZE_PRESETS).map(k => (
          <button key={k} type="button" onClick={() => applyPreset(k)}
            className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#d1d8dd] hover:border-[#2490ef] hover:text-[#2490ef] font-semibold transition-colors">
            {k}
          </button>
        ))}
      </div>

      {/* ── Set ratio rows ── */}
      <div>
        <p className="text-[10px] font-bold text-[#2490ef] uppercase mb-1.5">Size Set Ratios</p>
        <div className="space-y-1">
          {item.sizeRatios.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="w-16 px-2 py-1 text-[12px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-semibold text-[#1c2126] uppercase"
                placeholder="Size" value={r.size}
                onChange={e => updateRatio(idx, 'size', e.target.value.toUpperCase())}
              />
              <span className="text-[11px] text-[#8d99a6]">×</span>
              <input
                type="number" min="0"
                className="w-14 px-2 py-1 text-[12px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-semibold text-[#1c2126]"
                placeholder="Ratio" value={r.ratio || ''}
                onChange={e => updateRatio(idx, 'ratio', e.target.value)}
              />
              <span className="text-[10px] text-[#8d99a6]">= {(item.sets || 0) * (r.ratio || 0)} pcs</span>
              <button type="button" onClick={() => removeSize(idx)}
                className="w-5 h-5 flex items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]">
                <Minus className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addSize}
          className="mt-1.5 text-[11px] font-semibold text-[#2490ef] flex items-center gap-1 hover:underline">
          <Plus className="w-3 h-3" /> Add Size
        </button>

        {/* sets × ratio summary */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#c5dffe] mt-2">
          <label className="text-[10px] font-bold text-[#525c66] uppercase shrink-0">Sets packed:</label>
          <input
            type="number" min="0"
            className="w-20 px-2 py-1 text-[12px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-bold text-[#1c2126]"
            value={item.sets || ''}
            onChange={e => onChange({ sets: Number(e.target.value) })}
          />
          <span className="text-[11px] text-[#525c66]">
            × {pcsPerSet} pcs/set = <strong className="text-[#1c2126]">{setPcsTotal} pcs</strong>
          </span>
        </div>
      </div>

      {/* ── Loose Pcs Section ── */}
      <div className="bg-white/70 border border-[#d4eaf9] rounded-lg p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-[#0369a1] uppercase flex items-center gap-1">
            <Package className="w-3 h-3" /> Loose Pcs (extra, not in sets)
          </p>
          <button type="button" onClick={addLoose}
            className="text-[10px] font-bold text-[#2490ef] flex items-center gap-0.5 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {loosePcs.length === 0 && (
          <p className="text-[11px] text-[#8d99a6] italic">No loose pcs — click Add to enter e.g. S×3, M×2</p>
        )}
        <div className="space-y-1">
          {loosePcs.map((l, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="w-16 px-2 py-1 text-[12px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-semibold text-[#1c2126] uppercase"
                placeholder="Size" value={l.size}
                onChange={e => updateLoose(idx, 'size', e.target.value.toUpperCase())}
              />
              <span className="text-[11px] text-[#8d99a6]">×</span>
              <input
                type="number" min="0"
                className="w-16 px-2 py-1 text-[12px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-bold text-[#1c2126]"
                placeholder="Qty" value={l.qty || ''}
                onChange={e => updateLoose(idx, 'qty', e.target.value)}
              />
              <span className="text-[10px] text-[#0369a1] font-semibold">{l.qty || 0} loose pcs</span>
              <button type="button" onClick={() => removeLoose(idx)}
                className="w-5 h-5 flex items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2]">
                <Minus className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        {loosePcs.length > 0 && (
          <p className="mt-1.5 text-[11px] font-bold text-[#0369a1]">
            Loose total: {loosePcsTotal} pcs
          </p>
        )}
      </div>

      {/* Grand total */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#c5dffe] text-[12px]">
        <span className="text-[#525c66]">Sets pcs:</span>
        <strong className="text-[#1c2126]">{setPcsTotal}</strong>
        {loosePcsTotal > 0 && <>
          <span className="text-[#525c66] ml-2">+ Loose pcs:</span>
          <strong className="text-[#0369a1]">{loosePcsTotal}</strong>
        </>}
        <span className="text-[#525c66] ml-2">= Grand Total:</span>
        <strong className="text-[#2490ef] text-[14px]">{grandTotal} pcs</strong>
      </div>
    </div>
  );
};

// ─── InventoryPickerModal ──────────────────────────────────────────────────────
const InventoryPickerModal: React.FC<{
  inventory: InventoryItem[];
  onSelect: (item: InventoryItem) => void;
  onClose: () => void;
}> = ({ inventory, onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!q.trim()) return inventory.slice(0, 60);
    const lq = q.toLowerCase();
    return inventory.filter(inv =>
      (inv.name || '').toLowerCase().includes(lq) ||
      (inv.style || '').toLowerCase().includes(lq) ||
      (inv.itemGroup || '').toLowerCase().includes(lq) ||
      (inv.variant || '').toLowerCase().includes(lq) ||
      (inv.sku || '').toLowerCase().includes(lq)
    ).slice(0, 60);
  }, [inventory, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#d1d8dd]">
          <div className="w-8 h-8 rounded-lg bg-[#2490ef]/10 flex items-center justify-center">
            <Search className="w-4 h-4 text-[#2490ef]" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-[#525c66] uppercase tracking-widest">Select Item from Ready Stock</p>
            <input
              autoFocus
              className="w-full mt-1 text-[14px] font-medium text-[#1c2126] outline-none placeholder-[#c0c8d0]"
              placeholder="Search by name, style, SKU…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f4f5f6] text-[#525c66]">
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[#8d99a6] text-[13px]">No items found in inventory</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((inv, i) => {
                const stockQty = inv.quantity ?? inv.qty ?? inv.stock ?? 0;
                const imgSrc   = inv.imageUrl || inv.image || inv.thumbnail || inv.photo || null;
                return (
                  <button
                    key={inv.id || i}
                    type="button"
                    onClick={() => onSelect(inv)}
                    className="text-left flex flex-col rounded-xl border border-[#d1d8dd] hover:border-[#2490ef] hover:shadow-md transition-all overflow-hidden group bg-white"
                  >
                    {/* Image */}
                    <div className="w-full h-28 bg-[#f4f5f6] flex items-center justify-center overflow-hidden shrink-0">
                      {imgSrc ? (
                        <img src={imgSrc} alt={inv.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-[#c0c8d0]">
                          <Package className="w-8 h-8" />
                          <span className="text-[10px]">No image</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2.5 flex-1">
                      <p className="text-[12px] font-bold text-[#1c2126] leading-tight line-clamp-2">{inv.name || 'Unnamed'}</p>
                      {inv.style && <p className="text-[10px] text-[#525c66] mt-0.5">{inv.style}</p>}
                      {inv.sku   && <p className="text-[10px] text-[#8d99a6] mt-0.5 font-mono">{inv.sku}</p>}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stockQty > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {stockQty > 0 ? `${stockQty} pcs` : 'Out of stock'}
                        </span>
                        {inv.itemGroup && <span className="text-[10px] text-[#8d99a6]">{inv.itemGroup}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#f0f2f4] text-[11px] text-[#8d99a6]">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''} shown · Click to select
        </div>
      </div>
    </div>
  );
};


/**
 * Match inventory item to a packed BoxItem by name + style (case-insensitive).
 * Deducts totalPcs from item.quantity.
 */
function deductFromInventory(
  items: BoxItem[],
  inventory: InventoryItem[],
  onUpdateInventory: (item: InventoryItem) => void,
): { deducted: { name: string; pcs: number }[]; notFound: string[] } {
  const deducted: { name: string; pcs: number }[] = [];
  const notFound: string[] = [];

  items.forEach(it => {
    const pcs = itemTotalPcs(it);
    if (!pcs || !it.productName) return;

    const nameKey = it.productName.trim().toLowerCase();
    const styleKey = (it.style || '').trim().toLowerCase();

    const match = inventory.find(inv => {
      const invName = (inv.name || '').trim().toLowerCase();
      const invStyle = (inv.style || inv.variant || inv.itemGroup || '').trim().toLowerCase();
      const nameMatch = invName === nameKey || invName.includes(nameKey) || nameKey.includes(invName);
      const styleMatch = !styleKey || invStyle === styleKey || invStyle.includes(styleKey);
      return nameMatch && styleMatch;
    });

    if (match) {
      const newQty = Math.max(0, (match.quantity || 0) - pcs);
      onUpdateInventory({ ...match, quantity: newQty });
      deducted.push({ name: `${it.productName}${it.style ? ` [${it.style}]` : ''}`, pcs });
    } else {
      notFound.push(`${it.productName}${it.style ? ` [${it.style}]` : ''}`);
    }
  });

  return { deducted, notFound };
}

// ─── Main component ───────────────────────────────────────────────────────────
const PackingList: React.FC<PackingSlipProps> = ({
  slips, orders, pendingOrderId, onAddSlip, onUpdateSlip, onAction, companyInfo,
  inventory = [], onUpdateInventory,
}) => {
  const [viewMode, setViewMode]       = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter]           = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [saved, setSaved]             = useState(false);
  const [page, setPage]               = useState(1);
  const [stockAlert, setStockAlert]   = useState<{ deducted: { name: string; pcs: number }[]; notFound: string[] } | null>(null);
  // Inventory picker state: { bIdx, iIdx } of the item being picked
  const [inventoryPicker, setInventoryPicker] = useState<{ bIdx: number; iIdx: number } | null>(null);
  const PER_PAGE = 20;

  const emptyForm = (): SlipFormData => ({
    boxes: [{ id: uuidShort(6), boxNo: '1', items: [] }],
    date: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
  });

  const [formData, setFormData] = useState<SlipFormData>(emptyForm());
  const formRef = useRef<HTMLDivElement>(null);
  const salesOrders = useMemo(() => orders.filter(o => !o.id?.startsWith('DC')), [orders]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      slips.length,
    draft:      slips.filter(s => (s.status || 'DRAFT') === 'DRAFT').length,
    packed:     slips.filter(s => s.status === 'PACKED').length,
    dispatched: slips.filter(s => s.status === 'DISPATCHED').length,
    boxes:      slips.reduce((a, s) => a + (s.boxes?.length || 0), 0),
  }), [slips]);

  const filteredSlips = useMemo(() => {
    const q = filter.toLowerCase();
    return slips.filter(s => {
      const matchQ = !q || s.customerName?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q) || s.salesOrderId?.toLowerCase().includes(q);
      const matchS = statusFilter === 'ALL' || (s.status || 'DRAFT') === statusFilter;
      return matchQ && matchS;
    });
  }, [slips, filter, statusFilter]);

  const pageCount = Math.ceil(filteredSlips.length / PER_PAGE);
  const pageSlips = filteredSlips.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const linkSalesOrder = useCallback((soId: string) => {
    const so = orders.find(o => o.id === soId);
    if (!so) return;
    setFormData(prev => ({
      ...prev,
      salesOrderId: soId,
      customerName: so.customerName,
      boxes: [{
        id: uuidShort(6), boxNo: '1',
        items: (so.items || []).map((it: any) => ({
          productName: it.productName || it.name || '',
          quantity: it.quantity || 0,
          unit: it.unit || 'PCS',
          style: it.style || '',
          size: it.size || '',
          color: it.color || '',
          useSizeSet: false,
          sizeRatios: [],
          sets: 0,
          loosePcs: [],
        }))
      }]
    }));
  }, [orders]);

  useEffect(() => {
    if (pendingOrderId && orders.length > 0) {
      setFormData(emptyForm());
      linkSalesOrder(pendingOrderId);
      setViewMode('FORM');
    }
  }, [pendingOrderId, orders]);

  const openForm = (slip?: PackingSlip) => {
    if (slip) {
      const boxes: PackingBox[] = slip.boxes?.length
        ? slip.boxes.map((b: any) => ({
            ...b,
            items: (b.items || []).map((it: any) => ({
              useSizeSet: it.useSizeSet || false,
              sizeRatios: it.sizeRatios || [],
              sets: it.sets || 0,
              loosePcs: it.loosePcs || [],
              quantity: it.quantity || 0,
              ...it,
            }))
          }))
        : slip.items?.length
          ? [{ id: uuidShort(6), boxNo: '1', items: slip.items.map((it: any) => ({ ...it, useSizeSet: false, sizeRatios: [], sets: 0 })) }]
          : [{ id: uuidShort(6), boxNo: '1', items: [] }];
      setFormData({ ...slip, boxes });
    } else {
      setFormData(emptyForm());
    }
    setSaved(false);
    setStockAlert(null);
    setViewMode('FORM');
    setTimeout(() => formRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  // ── Save + stock deduction ─────────────────────────────────────────────────
  const prevStatusRef = useRef<string | undefined>(undefined);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.salesOrderId || !formData.customerName) return;

    const slip = { ...formData, updatedAt: new Date().toISOString() } as PackingSlip;

    // Deduct stock when transitioning to PACKED
    const prevStatus = prevStatusRef.current;
    const nowPacked  = formData.status === 'PACKED' && prevStatus !== 'PACKED';

    if (nowPacked && onUpdateInventory && inventory.length > 0) {
      const allItems = formData.boxes.flatMap(b => b.items);
      const result = deductFromInventory(allItems, inventory, onUpdateInventory);
      setStockAlert(result);
    }

    if (formData.id) { onUpdateSlip(slip); }
    else { onAddSlip({ ...slip, id: `PS-${uuidShort(10)}` }); }
    setSaved(true);
    setTimeout(() => { setSaved(false); setViewMode('LIST'); }, 1200);
  };

  const handleStatusChange = (status: SlipStatus) => {
    prevStatusRef.current = formData.status;
    setFormData(prev => ({ ...prev, status }));
  };

  // ── Box/item mutation helpers ──────────────────────────────────────────────
  const updateBox = (bIdx: number, patch: Partial<PackingBox>) => {
    setFormData(prev => {
      const boxes = [...prev.boxes];
      boxes[bIdx] = { ...boxes[bIdx], ...patch };
      return { ...prev, boxes };
    });
  };

  const updateBoxItem = (bIdx: number, iIdx: number, patch: Partial<BoxItem>) => {
    setFormData(prev => {
      const boxes = [...prev.boxes];
      const items = [...boxes[bIdx].items];
      items[iIdx] = { ...items[iIdx], ...patch };
      boxes[bIdx] = { ...boxes[bIdx], items };
      return { ...prev, boxes };
    });
  };

  const addBoxItem = (bIdx: number) => {
    setFormData(prev => {
      const boxes = [...prev.boxes];
      boxes[bIdx] = { ...boxes[bIdx], items: [...boxes[bIdx].items, emptyBoxItem()] };
      return { ...prev, boxes };
    });
  };

  const removeBoxItem = (bIdx: number, iIdx: number) => {
    setFormData(prev => {
      const boxes = [...prev.boxes];
      boxes[bIdx] = { ...boxes[bIdx], items: boxes[bIdx].items.filter((_, i) => i !== iIdx) };
      return { ...prev, boxes };
    });
  };

  const addBox = () => {
    setFormData(prev => ({
      ...prev,
      boxes: [...prev.boxes, { id: uuidShort(6), boxNo: String(prev.boxes.length + 1), items: [] }]
    }));
  };

  const removeBox = (bIdx: number) => {
    setFormData(prev => {
      const boxes = prev.boxes.filter((_, i) => i !== bIdx).map((b, i) => ({ ...b, boxNo: String(i + 1) }));
      return { ...prev, boxes };
    });
  };

  const duplicateBox = (bIdx: number) => {
    setFormData(prev => {
      const src = prev.boxes[bIdx];
      const clone: PackingBox = { ...src, id: uuidShort(6), boxNo: String(prev.boxes.length + 1), items: src.items.map(it => ({ ...it })) };
      return { ...prev, boxes: [...prev.boxes, clone] };
    });
  };

  // Pick an inventory item and fill the box item row
  const handleInventoryPick = (inv: InventoryItem, bIdx: number, iIdx: number) => {
    const imgSrc = inv.imageUrl || inv.image || inv.thumbnail || inv.photo || undefined;
    updateBoxItem(bIdx, iIdx, {
      productName:  inv.name   || '',
      style:        inv.style  || inv.variant || '',
      color:        inv.color  || '',
      unit:         inv.unit   || 'PCS',
      imageUrl:     imgSrc,
      inventoryId:  inv.id     || undefined,
    });
    setInventoryPicker(null);
  };

  const totalItems = formData.boxes.reduce((a, b) => a + b.items.reduce((s, it) => s + itemTotalPcs(it), 0), 0);

  const toggleCheck = (id: string) => {
    const s = new Set(checkedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setCheckedIds(s);
  };
  const toggleAll = () => {
    setCheckedIds(checkedIds.size === pageSlips.length ? new Set() : new Set(pageSlips.map(s => s.id)));
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (viewMode === 'LIST') return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">

      {/* Header */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2490ef]/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-[#2490ef]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1c2126] leading-none">Packing Slips</h1>
              <p className="text-[11px] text-[#8d99a6] mt-0.5">{slips.length} total · {stats.boxes} boxes packed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {checkedIds.size === 1 && onAction && (
              <button
                onClick={() => {
                  const slip = slips.find(s => s.id === [...checkedIds][0]);
                  if (slip) { onAction('CONVERT_TO_DELIVERY_NOTE', slip); setCheckedIds(new Set()); }
                }}
                className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded-lg text-[13px] font-semibold text-[#0369a1] transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Delivery Challan
              </button>
            )}
            <button onClick={() => openForm()}
              className="h-8 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded-lg text-[13px] font-semibold shadow-sm transition-all">
              <Plus className="w-4 h-4" /> New Packing Slip
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Pill icon={<Layers className="w-3.5 h-3.5" />}       label="Total"       value={stats.total} />
          <Pill icon={<ClipboardList className="w-3.5 h-3.5" />} label="Draft"       value={stats.draft} />
          <Pill icon={<Package className="w-3.5 h-3.5" />}      label="Packed"      value={stats.packed} />
          <Pill icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Dispatched"  value={stats.dispatched} />
          <Pill icon={<Box className="w-3.5 h-3.5" />}          label="Total Boxes" value={stats.boxes} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
            <input type="text" placeholder="Search ID, customer, SO…"
              value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
              className="h-8 w-full pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] placeholder-[#8d99a6]" />
          </div>
          {(['ALL', 'DRAFT', 'PACKED', 'DISPATCHED'] as const).map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`h-8 px-3 rounded-lg text-[12px] font-semibold border transition-colors ${statusFilter === s ? 'bg-[#2490ef] text-white border-transparent' : 'bg-white text-[#525c66] border-[#d1d8dd] hover:bg-[#f4f5f6]'}`}>
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[#525c66]">
            <span>{filteredSlips.length} results</span>
            {pageCount > 1 && <>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-7 h-7 flex items-center justify-center rounded border border-[#d1d8dd] bg-white disabled:opacity-40 hover:bg-[#f4f5f6]"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <span>{page}/{pageCount}</span>
              <button disabled={page === pageCount} onClick={() => setPage(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded border border-[#d1d8dd] bg-white disabled:opacity-40 hover:bg-[#f4f5f6]"><ChevronRight className="w-3.5 h-3.5" /></button>
            </>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-5 pb-10">
        {filteredSlips.length === 0
          ? <EmptyState onNew={() => openForm()} />
          : (
          <div className="bg-white rounded-xl border border-[#d1d8dd] shadow-sm overflow-hidden min-w-[760px]">
            <div className="grid grid-cols-[2rem_7rem_6rem_6rem_1fr_7rem_6rem_5rem] items-center border-b border-[#d1d8dd] bg-[#f8f9fa] px-4 py-2.5 text-[11px] font-bold text-[#525c66] uppercase tracking-wider select-none">
              <div><input type="checkbox" checked={checkedIds.size === pageSlips.length && pageSlips.length > 0} onChange={toggleAll} className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5 cursor-pointer" /></div>
              <div>Slip ID</div><div>Date</div><div>Sales Order</div>
              <div>Customer</div><div>Boxes</div><div>Status</div><div></div>
            </div>
            <div className="divide-y divide-[#f0f2f4]">
              {pageSlips.map(slip => (
                <div key={slip.id}
                  className={`grid grid-cols-[2rem_7rem_6rem_6rem_1fr_7rem_6rem_5rem] items-center px-4 py-3 hover:bg-[#f8fbff] transition-colors cursor-pointer group ${checkedIds.has(slip.id) ? 'bg-[#eef6ff]' : ''}`}
                  onClick={() => openForm(slip)}>
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checkedIds.has(slip.id)} onChange={() => toggleCheck(slip.id)} className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5 cursor-pointer" />
                  </div>
                  <div className="font-semibold text-[#2490ef] text-[13px] truncate group-hover:underline">{slip.id}</div>
                  <div className="text-[13px] text-[#525c66]">{slip.date}</div>
                  <div className="text-[13px] font-medium text-[#1c2126] truncate">{slip.salesOrderId || '—'}</div>
                  <div className="text-[13px] text-[#1c2126] font-medium truncate pr-2">{slip.customerName}</div>
                  <div className="text-[13px] text-[#525c66]">
                    <span className="inline-flex items-center gap-1">
                      <Box className="w-3 h-3 text-[#8d99a6]" />
                      {slip.boxes?.length || 0} box{(slip.boxes?.length || 0) !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <div><StatusBadge status={slip.status} /></div>
                  <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => printSlipPDF({ ...slip, boxes: slip.boxes || [] }, companyInfo)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8d99a6] hover:text-[#2490ef] hover:bg-[#eef6ff] transition-colors opacity-0 group-hover:opacity-100" title="Print">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => buildSlipPDF({ ...slip, boxes: slip.boxes || [] }, companyInfo)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8d99a6] hover:text-[#2490ef] hover:bg-[#eef6ff] transition-colors opacity-0 group-hover:opacity-100" title="Download PDF">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // FORM VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">

      {/* Form Header */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#1c2126] leading-none">
                {formData.id ? formData.id : 'New Packing Slip'}
              </h1>
              {formData.customerName && (
                <p className="text-[11px] text-[#8d99a6] mt-0.5">{formData.customerName} · {formData.boxes.length} box{formData.boxes.length !== 1 ? 'es' : ''} · {totalItems} pcs total</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status selector */}
            <div className="flex rounded-lg border border-[#d1d8dd] overflow-hidden text-[11px] font-bold">
              {(Object.keys(STATUS_CONFIG) as SlipStatus[]).map(s => (
                <button key={s} type="button" onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 transition-colors ${formData.status === s || (!formData.status && s === 'DRAFT') ? 'bg-[#2490ef] text-white' : 'bg-white text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Stock deduction hint */}
            {formData.status === 'PACKED' && onUpdateInventory && (
              <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                <AlertTriangle className="w-3 h-3" /> Stock will deduct on Save
              </span>
            )}

            {formData.id && (
              <>
                <button type="button" onClick={() => printSlipPDF(formData, companyInfo)}
                  className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded-lg text-[13px] font-semibold text-[#525c66] transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button type="button" onClick={() => buildSlipPDF(formData, companyInfo)}
                  className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded-lg text-[13px] font-semibold text-[#525c66] transition-colors">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                {formData.boxes.length > 0 && (
                  <button type="button" onClick={() => printAllBoxLabelsPDF(formData, companyInfo)}
                    className="h-8 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded-lg text-[13px] font-semibold text-[#525c66] transition-colors">
                    <Tag className="w-3.5 h-3.5" /> Print Box Labels
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={() => setViewMode('LIST')}
              className="h-8 px-3 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded-lg text-[13px] font-semibold text-[#1c2126] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className={`h-8 px-4 flex items-center gap-1.5 rounded-lg text-[13px] font-bold shadow-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-[#2490ef] hover:bg-[#2081d6] text-white'}`}>
              {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div ref={formRef} className="flex-1 overflow-auto p-5 pb-20 space-y-4">
        <div className="max-w-[960px] mx-auto space-y-4">

          {/* Stock alert banner */}
          {stockAlert && (
            <div className={`p-4 rounded-xl border text-[12px] ${stockAlert.notFound.length ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <div className="flex items-start gap-2">
                {stockAlert.notFound.length
                  ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                }
                <div>
                  {stockAlert.deducted.length > 0 && (
                    <p className="font-semibold mb-1">
                      Stock deducted: {stockAlert.deducted.map(d => `${d.name} (−${d.pcs} pcs)`).join(', ')}
                    </p>
                  )}
                  {stockAlert.notFound.length > 0 && (
                    <p>Not found in inventory: <strong>{stockAlert.notFound.join(', ')}</strong> — adjust manually.</p>
                  )}
                </div>
                <button onClick={() => setStockAlert(null)} className="ml-auto text-[#8d99a6] hover:text-[#1c2126]">
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Reference */}
          <div className="bg-white rounded-xl border border-[#d1d8dd] shadow-sm p-5">
            <h3 className="text-[11px] font-black text-[#525c66] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[#2490ef]" /> Reference & Details
            </h3>
            <div className="grid grid-cols-3 gap-5">
              <Field label="Sales Order" required>
                <select value={formData.salesOrderId || ''} onChange={e => linkSalesOrder(e.target.value)} className={sel} required>
                  <option value="">Select Sales Order…</option>
                  {salesOrders.map(o => <option key={o.id} value={o.id}>{o.id} – {o.customerName}</option>)}
                </select>
              </Field>
              <Field label="Customer">
                <div className={`${inp} bg-[#f8f9fa] text-[#525c66] cursor-not-allowed flex items-center gap-2`}>
                  <User className="w-3.5 h-3.5 text-[#8d99a6] shrink-0" />
                  {formData.customerName || <span className="text-[#c0c8d0]">Auto-filled</span>}
                </div>
              </Field>
              <Field label="Date">
                <input type="date" value={formData.date || ''} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className={inp} />
              </Field>
            </div>
          </div>

          {/* Weight & Totals */}
          <div className="bg-white rounded-xl border border-[#d1d8dd] shadow-sm p-5">
            <h3 className="text-[11px] font-black text-[#525c66] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Weight className="w-3.5 h-3.5 text-[#2490ef]" /> Weight & Totals
            </h3>
            <div className="grid grid-cols-4 gap-5">
              <Field label="Total Boxes">
                <div className={`${inp} bg-[#f8f9fa] text-[#525c66] cursor-not-allowed`}>{formData.boxes.length}</div>
              </Field>
              <Field label="Total Pcs">
                <div className={`${inp} bg-[#f8f9fa] text-[#525c66] cursor-not-allowed`}>{totalItems}</div>
              </Field>
              <Field label="Net Weight (kg)">
                <input type="number" step="0.01" placeholder="0.00" value={formData.netWeight || ''} onChange={e => setFormData(p => ({ ...p, netWeight: Number(e.target.value) }))} className={inp} />
              </Field>
              <Field label="Gross Weight (kg)">
                <input type="number" step="0.01" placeholder="0.00" value={formData.grossWeight || ''} onChange={e => setFormData(p => ({ ...p, grossWeight: Number(e.target.value) }))} className={inp} />
              </Field>
            </div>
          </div>

          {/* Boxes */}
          {formData.boxes.map((box, bIdx) => {
            const boxTotalPcs = box.items.reduce((s, it) => s + itemTotalPcs(it), 0);
            return (
              <div key={box.id} className="bg-white rounded-xl border border-[#d1d8dd] shadow-sm overflow-hidden">
                {/* Box header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-[#f8f9fa] border-b border-[#d1d8dd]">
                  <div className="w-7 h-7 rounded-lg bg-[#2490ef] flex items-center justify-center shrink-0">
                    <Box className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-black text-[13px] text-[#1c2126]">Box {box.boxNo}</span>
                  <span className="text-[11px] text-[#8d99a6]">· {box.items.length} style{box.items.length !== 1 ? 's' : ''} · {boxTotalPcs} pcs</span>

                  <div className="flex items-center gap-2 ml-2 flex-1">
                    <div className="relative">
                      <Ruler className="w-3.5 h-3.5 text-[#8d99a6] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input type="text" placeholder="L×W×H cm" value={box.dimensions || ''}
                        onChange={e => updateBox(bIdx, { dimensions: e.target.value })}
                        className="h-8 pl-8 pr-3 w-32 text-[12px] bg-white border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] placeholder-[#c0c8d0]" />
                    </div>
                    <div className="relative">
                      <Weight className="w-3.5 h-3.5 text-[#8d99a6] absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input type="number" placeholder="Net kg" value={box.netWeight || ''}
                        onChange={e => updateBox(bIdx, { netWeight: Number(e.target.value) })}
                        className="h-8 pl-8 pr-3 w-24 text-[12px] bg-white border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] placeholder-[#c0c8d0]" />
                    </div>
                    <input type="number" placeholder="Gross kg" value={box.grossWeight || ''}
                      onChange={e => updateBox(bIdx, { grossWeight: Number(e.target.value) })}
                      className="h-8 px-3 w-24 text-[12px] bg-white border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] placeholder-[#c0c8d0]" />
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    {/* Download box label PDF */}
                    <button type="button" onClick={() => buildBoxLabelPDF(formData, box, companyInfo)}
                      title="Download box label PDF"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#525c66] hover:text-[#2490ef] hover:bg-[#eef6ff] transition-colors">
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    {/* Print box label */}
                    <button type="button"
                      title="Print box label"
                      onClick={() => {
                        const singleBoxSlip = { ...formData, boxes: [box] };
                        printAllBoxLabelsPDF(singleBoxSlip, companyInfo);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#525c66] hover:text-[#2490ef] hover:bg-[#eef6ff] transition-colors">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => duplicateBox(bIdx)} title="Duplicate box"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#525c66] hover:text-[#2490ef] hover:bg-[#eef6ff] transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {formData.boxes.length > 1 && (
                      <button type="button" onClick={() => removeBox(bIdx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#ef4444] hover:bg-[#fef2f2] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items table */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold text-[#525c66] uppercase tracking-wider border-b border-[#f0f2f4] bg-[#fafbfc]">
                      <th className="py-2 pl-5 w-8 text-center">#</th>
                      <th className="py-2 px-3">Item Name</th>
                      <th className="py-2 px-3 w-28"><span className="flex items-center gap-1"><Tag className="w-3 h-3" />Style</span></th>
                      <th className="py-2 px-3 w-24"><span className="flex items-center gap-1"><Palette className="w-3 h-3" />Colour</span></th>
                      <th className="py-2 px-3 w-28">Mode</th>
                      <th className="py-2 px-3 w-20">Qty/Sets</th>
                      <th className="py-2 px-3 w-20">Total Pcs</th>
                      <th className="py-2 px-3 w-16">UOM</th>
                      <th className="py-2 pr-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {box.items.map((it, iIdx) => (
                      <React.Fragment key={iIdx}>
                        <tr className={`hover:bg-[#fafbff] group/row border-b border-[#f0f2f4] ${it.useSizeSet ? 'align-top' : ''}`}>
                          <td className="py-2 pl-5 text-[11px] text-[#8d99a6] text-center">{iIdx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {/* Thumbnail */}
                              <button
                                type="button"
                                title="Pick from inventory"
                                onClick={() => setInventoryPicker({ bIdx, iIdx })}
                                className="w-9 h-9 rounded-lg border border-[#d1d8dd] bg-[#f4f5f6] hover:border-[#2490ef] hover:bg-[#eef6ff] flex items-center justify-center shrink-0 overflow-hidden transition-all group/img"
                              >
                                {it.imageUrl ? (
                                  <img src={it.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5 text-[#8d99a6] group-hover/img:text-[#2490ef]" />
                                )}
                              </button>
                              <input
                                className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#1c2126] placeholder-[#c0c8d0] focus:bg-[#f0f7ff] focus:px-2 rounded transition-all"
                                value={it.productName} placeholder="Item description or pick →"
                                onChange={e => updateBoxItem(bIdx, iIdx, { productName: e.target.value })}
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              className="w-full bg-transparent outline-none text-[13px] text-[#525c66] placeholder-[#c0c8d0] focus:bg-[#f0f7ff] focus:px-2 rounded transition-all"
                              value={it.style || ''} placeholder="Style"
                              onChange={e => updateBoxItem(bIdx, iIdx, { style: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              className="w-full bg-transparent outline-none text-[13px] text-[#525c66] placeholder-[#c0c8d0] focus:bg-[#f0f7ff] focus:px-2 rounded transition-all"
                              value={it.color || ''} placeholder="Colour"
                              onChange={e => updateBoxItem(bIdx, iIdx, { color: e.target.value })}
                            />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => updateBoxItem(bIdx, iIdx, {
                                useSizeSet: !it.useSizeSet,
                                sizeRatios: !it.useSizeSet && it.sizeRatios.length === 0 ? [{ size: 'S', ratio: 1 }, { size: 'M', ratio: 2 }, { size: 'L', ratio: 1 }] : it.sizeRatios,
                              })}
                              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${it.useSizeSet ? 'bg-[#2490ef] text-white border-[#2490ef]' : 'bg-white text-[#525c66] border-[#d1d8dd] hover:border-[#2490ef] hover:text-[#2490ef]'}`}
                            >
                              {it.useSizeSet ? '⊞ Size Set' : '— Flat Qty'}
                            </button>
                          </td>
                          <td className="py-2 px-3">
                            {!it.useSizeSet && (
                              <input type="number" min="0"
                                className="w-full bg-transparent outline-none text-[13px] font-semibold text-[#1c2126] focus:bg-[#f0f7ff] focus:px-2 rounded transition-all"
                                value={it.quantity}
                                onChange={e => updateBoxItem(bIdx, iIdx, { quantity: Number(e.target.value) })}
                              />
                            )}
                            {it.useSizeSet && (
                              <span className="text-[12px] text-[#8d99a6]">{it.sets || 0} sets</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-[13px] font-bold ${itemTotalPcs(it) > 0 ? 'text-[#1c2126]' : 'text-[#c0c8d0]'}`}>
                              {itemTotalPcs(it) || '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <select value={it.unit || 'PCS'} onChange={e => updateBoxItem(bIdx, iIdx, { unit: e.target.value })}
                              className="bg-transparent outline-none text-[12px] text-[#525c66] cursor-pointer appearance-none w-full">
                              {['PCS', 'SET', 'DOZ', 'PKT', 'BOX', 'MTR', 'KG'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="py-2 pr-4">
                            <button type="button" onClick={() => removeBoxItem(bIdx, iIdx)}
                              className="w-6 h-6 flex items-center justify-center rounded text-[#ef4444] hover:bg-[#fef2f2] opacity-0 group-hover/row:opacity-100 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                        {/* Size set editor row */}
                        {it.useSizeSet && (
                          <tr className="border-b border-[#f0f2f4]">
                            <td colSpan={9} className="pl-10 pr-5 pb-3">
                              <SizeSetEditor item={it} onChange={patch => updateBoxItem(bIdx, iIdx, patch)} />
                            </td>
                          </tr>
                        )}
                        {/* Flat size field (single size mode) */}
                        {!it.useSizeSet && (
                          <tr className="border-b border-[#f0f2f4]">
                            <td />
                            <td colSpan={2} className="pb-2 px-3">
                              <input
                                className="w-24 bg-transparent outline-none text-[12px] text-[#525c66] placeholder-[#c0c8d0] focus:bg-[#f0f7ff] focus:px-2 rounded transition-all border-b border-dashed border-[#d1d8dd]"
                                value={it.size || ''} placeholder="Size (e.g. M)"
                                onChange={e => updateBoxItem(bIdx, iIdx, { size: e.target.value })}
                              />
                            </td>
                            <td colSpan={6} />
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    <tr>
                      <td colSpan={9} className="py-2.5 pl-5">
                        <button type="button" onClick={() => addBoxItem(bIdx)}
                          className="text-[12px] font-semibold text-[#2490ef] hover:text-[#2081d6] flex items-center gap-1 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Add Item
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Box footer */}
                {box.items.length > 0 && (
                  <div className="px-5 py-2.5 bg-[#f8f9fa] border-t border-[#f0f2f4] flex items-center gap-6 text-[11px] text-[#525c66]">
                    <span><strong className="text-[#1c2126]">{box.items.length}</strong> style{box.items.length !== 1 ? 's' : ''}</span>
                    <span><strong className="text-[#1c2126]">{boxTotalPcs}</strong> total pcs</span>
                    {box.netWeight   && <span>NW <strong className="text-[#1c2126]">{box.netWeight}</strong> kg</span>}
                    {box.grossWeight && <span>GW <strong className="text-[#1c2126]">{box.grossWeight}</strong> kg</span>}
                    {/* size breakdown summary */}
                    {box.items.some(it => it.useSizeSet) && (
                      <span className="ml-auto text-[10px] font-mono text-[#8d99a6]">
                        {(() => {
                          const agg: Record<string, number> = {};
                          box.items.forEach(it => {
                            if (it.useSizeSet) sizeBreakdown(it).forEach(s => { agg[s.size] = (agg[s.size] || 0) + s.qty; });
                          });
                          return Object.entries(agg).map(([sz, q]) => `${sz}:${q}`).join('  ');
                        })()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button type="button" onClick={addBox}
            className="w-full py-3 border-2 border-dashed border-[#d1d8dd] hover:border-[#2490ef] hover:bg-[#f0f7ff] rounded-xl text-[13px] font-semibold text-[#525c66] hover:text-[#2490ef] flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Add Another Box
          </button>

          {!formData.salesOrderId && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              Select a Sales Order to save this packing slip
            </div>
          )}
        </div>
      </div>

      {/* Inventory Picker Modal */}
      {inventoryPicker && (
        <InventoryPickerModal
          inventory={inventory}
          onSelect={inv => handleInventoryPick(inv, inventoryPicker.bIdx, inventoryPicker.iIdx)}
          onClose={() => setInventoryPicker(null)}
        />
      )}
    </div>
  );
};

export default PackingList;
export { ROLE_LABELS, ROLE_COLORS } from './Login';