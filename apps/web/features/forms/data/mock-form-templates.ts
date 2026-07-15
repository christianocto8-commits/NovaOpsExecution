import { FormTemplate } from "@/features/forms/types";

import { readStoredFormTemplates } from "@/features/forms/data/form-template-storage";

export const formTemplates: FormTemplate[] = [
  {
    id: "FORM-OPENING",
    name: "Daily Opening Checklist",
    category: "Opening",
    urgency: "High",
    description: "Checklist standar opening outlet harian.",
    status: "Active",
    fields: [
      {
        id: "opening-bar-ready",
        label: "Bar area sudah bersih dan siap operasional?",
        type: "yes_no",
        required: true,
      },
      {
        id: "opening-machine-ready",
        label: "Espresso machine sudah dipanaskan dan dicek?",
        type: "yes_no",
        required: true,
      },
      {
        id: "opening-grinder-ready",
        label: "Grinder sudah bersih dan siap digunakan?",
        type: "yes_no",
        required: true,
      },
      { id: "opening-stock-note", label: "Catatan stock awal", type: "textarea", required: false },
      { id: "opening-photo", label: "Foto kondisi bar opening", type: "photo", required: false },
    ],
  },
  {
    id: "FORM-CLEANING",
    name: "Cleaning Audit",
    category: "Cleaning",
    urgency: "Medium",
    description: "Audit kebersihan station dan equipment.",
    status: "Active",
    fields: [
      {
        id: "cleaning-machine",
        label: "Espresso machine sudah dibersihkan?",
        type: "yes_no",
        required: true,
      },
      {
        id: "cleaning-grinder",
        label: "Grinder area sudah bersih?",
        type: "yes_no",
        required: true,
      },
      {
        id: "cleaning-bar",
        label: "Bar top dan working area sudah clean?",
        type: "yes_no",
        required: true,
      },
      { id: "cleaning-note", label: "Catatan temuan cleaning", type: "textarea", required: false },
    ],
  },
  {
    id: "FORM-INVENTORY",
    name: "Inventory Variance Check",
    category: "Inventory",
    urgency: "High",
    description: "Form pengecekan selisih inventory outlet.",
    status: "Active",
    fields: [
      { id: "inventory-item", label: "Item yang dicek", type: "text", required: true },
      { id: "inventory-system", label: "Qty system", type: "number", required: true },
      { id: "inventory-actual", label: "Qty aktual", type: "number", required: true },
      { id: "inventory-correction", label: "Catatan koreksi", type: "textarea", required: true },
    ],
  },
  {
    id: "FORM-AUDIT",
    name: "Outlet Operational Audit",
    category: "Audit",
    urgency: "Medium",
    description: "Audit singkat standar operasional outlet.",
    status: "Active",
    fields: [
      {
        id: "audit-service",
        label: "Service flow berjalan sesuai standar?",
        type: "yes_no",
        required: true,
      },
      {
        id: "audit-quality",
        label: "Produk sample sesuai standar kualitas?",
        type: "yes_no",
        required: true,
      },
      { id: "audit-finding", label: "Temuan utama", type: "textarea", required: true },
      { id: "audit-signature", label: "Signature PIC Outlet", type: "signature", required: false },
    ],
  },
];

export function getFormTemplate(templateId?: string) {
  return (
    readStoredFormTemplates().find((template) => template.id === templateId) ??
    formTemplates.find((template) => template.id === templateId)
  );
}
