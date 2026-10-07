import { createLocalId } from "@/lib/local-id";
import type { FormTemplate, FormField } from "@/features/forms/types";
import { ensureResponsiblePersonField } from "@/features/forms/utils/system-fields";
import type { FormCategoryId } from "./form-categories";

export type StarterTemplateDefinition = {
  id: string;
  name: string;
  category: FormCategoryId;
  description: string;
  badge: string;
  iconName: "opening" | "closing" | "temp" | "cleaning" | "quality";
  fields: FormField[];
};

export const STARTER_TEMPLATES: StarterTemplateDefinition[] = [
  {
    id: "starter-opening-fnb",
    name: "Checklist Opening Shift F&B",
    category: "opening",
    description: "Prosedur standar pembukaan outlet, kesiapan alat, suhu chiller, dan sanitasi awal.",
    badge: "Paling Populer",
    iconName: "opening",
    fields: ensureResponsiblePersonField([
      {
        id: `starter-field-${createLocalId()}`,
        label: "Lampu, AC, dan signage outlet menyala dengan baik",
        type: "yes_no",
        required: true,
        section: "1. Fasilitas & Area Kasir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "POS Kasir, mesin EDC, dan printer struk berfungsi normal",
        type: "yes_no",
        required: true,
        section: "1. Fasilitas & Area Kasir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Uang modal kasir (cash float) sudah dihitung dan sesuai",
        type: "yes_no",
        required: true,
        section: "1. Fasilitas & Area Kasir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Suhu Showcase Chiller di bawah 4°C",
        type: "yes_no",
        required: true,
        section: "2. Suhu & Sanitasi Dapur",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Suhu Deep Freezer di bawah -18°C",
        type: "yes_no",
        required: true,
        section: "2. Suhu & Sanitasi Dapur",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Foto termometer chiller & freezer",
        type: "photo",
        required: true,
        section: "2. Suhu & Sanitasi Dapur",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Tempat cuci tangan terisi sabun dan hand towel/tisu",
        type: "yes_no",
        required: true,
        section: "2. Suhu & Sanitasi Dapur",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Cek masa kedaluwarsa (FIFO) bahan baku sayur & daging",
        type: "yes_no",
        required: true,
        section: "3. Bahan Baku & Kesiapan Kru",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Kru berseragam lengkap, rapi, dan menggunakan masker/hairnet",
        type: "yes_no",
        required: true,
        section: "3. Bahan Baku & Kesiapan Kru",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Catatan khusus opening / kendala alat",
        type: "textarea",
        required: false,
        section: "3. Bahan Baku & Kesiapan Kru",
      },
    ]),
  },
  {
    id: "starter-closing-fnb",
    name: "Checklist Closing Shift & Handover",
    category: "closing",
    description: "Prosedur penutupan harian, keamanan gas/listrik, kebersihan kitchen, dan settlement kasir.",
    badge: "Standar Operasional",
    iconName: "closing",
    fields: ensureResponsiblePersonField([
      {
        id: `starter-field-${createLocalId()}`,
        label: "Seluruh kompor, fryer, dan exhaust fan sudah dimatikan",
        type: "yes_no",
        required: true,
        section: "1. Keamanan & Peralatan Kitchen",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Regulator gas dilepas / valve pipa gas utama ditutup rapat",
        type: "yes_no",
        required: true,
        section: "1. Keamanan & Peralatan Kitchen",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Sisa minyak fryer disaring dan ditutup wadah stainless",
        type: "yes_no",
        required: true,
        section: "1. Keamanan & Peralatan Kitchen",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Meja kerja stainless dan kitchen sink disikat dan disanitasi",
        type: "yes_no",
        required: true,
        section: "2. Kebersihan & Sanitasi Akhir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Grease trap / saluran pembuangan minyak telah dibersihkan",
        type: "yes_no",
        required: true,
        section: "2. Kebersihan & Sanitasi Akhir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Seluruh tempat sampah dikosongkan dan plastik sampah diganti",
        type: "yes_no",
        required: true,
        section: "2. Kebersihan & Sanitasi Akhir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Foto kondisi dapur setelah closing",
        type: "photo",
        required: true,
        section: "2. Kebersihan & Sanitasi Akhir",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Bahan sisa disimpan tertutup rapat dan diberi label tanggal FIFO",
        type: "yes_no",
        required: true,
        section: "3. Bahan Baku & Makanan",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Settlement mesin EDC sudah dicetak dan cocok dengan POS",
        type: "yes_no",
        required: true,
        section: "4. Kasir & Keuangan",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Total uang tunai fisik cocok dengan laporan closing",
        type: "yes_no",
        required: true,
        section: "4. Kasir & Keuangan",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Pintu gerai terkunci dan brankas diamankan supervisor",
        type: "yes_no",
        required: true,
        section: "4. Kasir & Keuangan",
      },
    ]),
  },
  {
    id: "starter-temp-haccp",
    name: "Log Suhu Chiller, Freezer & HACCP",
    category: "food_safety",
    description: "Pencatatan suhu harian cold storage untuk kepatuhan sanitasi & food safety.",
    badge: "Food Safety",
    iconName: "temp",
    fields: ensureResponsiblePersonField([
      {
        id: `starter-field-${createLocalId()}`,
        label: "Suhu Chiller Utama / Walk-in (°C)",
        type: "number",
        required: true,
        section: "1. Pemantauan Suhu",
        validation: { min: 0, max: 4 },
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Suhu Deep Freezer Daging (°C)",
        type: "number",
        required: true,
        section: "1. Pemantauan Suhu",
        validation: { min: -25, max: -18 },
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Suhu Showcase Display Minuman / Salad (°C)",
        type: "number",
        required: true,
        section: "1. Pemantauan Suhu",
        validation: { min: 1, max: 7 },
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Foto termometer indikator suhu",
        type: "photo",
        required: true,
        section: "1. Pemantauan Suhu",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Karet gasket pintu chiller/freezer rapat tanpa celah",
        type: "yes_no",
        required: true,
        section: "2. Verifikasi Kondisi Unit",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Bahan mentah dan siap saji disimpan pada rak terpisah",
        type: "yes_no",
        required: true,
        section: "2. Verifikasi Kondisi Unit",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Tindakan koreksi jika suhu di luar batas normal",
        type: "textarea",
        required: false,
        section: "2. Verifikasi Kondisi Unit",
      },
    ]),
  },
  {
    id: "starter-cleaning-audit",
    name: "Audit Kebersihan & Sanitasi Gerai",
    category: "cleaning",
    description: "Inspeksi kebersihan meja makan, lantai, toilet pelanggan, dan area operasional.",
    badge: "Audit Rutin",
    iconName: "cleaning",
    fields: ensureResponsiblePersonField([
      {
        id: `starter-field-${createLocalId()}`,
        label: "Meja dan kursi makan pelanggan bersih dan disemprot disinfektan",
        type: "yes_no",
        required: true,
        section: "1. Dining Area",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Lantai area makan bersih, tidak berminyak/licin",
        type: "yes_no",
        required: true,
        section: "1. Dining Area",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Area saus, sedotan, dan sendok garpu tertata rapi",
        type: "yes_no",
        required: true,
        section: "1. Dining Area",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Wastafel pelanggan bersih, sabun dan tisu terisi penuh",
        type: "yes_no",
        required: true,
        section: "2. Toilet & Sanitasi",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Kloset toilet bersih, tidak berbau, dan air mengalir normal",
        type: "yes_no",
        required: true,
        section: "2. Toilet & Sanitasi",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Foto bukti kondisi toilet & wastafel",
        type: "photo",
        required: true,
        section: "2. Toilet & Sanitasi",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Penilaian Bintang Kebersihan Keseluruhan",
        type: "rating",
        required: true,
        section: "3. Penilaian Akhir",
        options: { maxStars: 5 },
      },
    ]),
  },
  {
    id: "starter-receiving-check",
    name: "Penerimaan Bahan Baku & Kualitas",
    category: "quality_check",
    description: "Pemeriksaan kesesuaian faktur PO, kualitas kemasan, suhu, dan masa kedaluwarsa barang masuk.",
    badge: "Logistik & Gudang",
    iconName: "quality",
    fields: ensureResponsiblePersonField([
      {
        id: `starter-field-${createLocalId()}`,
        label: "Surat Jalan / Faktur sesuai dengan order pembelian (PO)",
        type: "yes_no",
        required: true,
        section: "1. Dokumen & Kemasan",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Kemasan karton/plastik utuh, tidak sobek, penyok, atau bocor",
        type: "yes_no",
        required: true,
        section: "1. Dokumen & Kemasan",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Foto Surat Jalan / Faktur Penerimaan Barang",
        type: "photo",
        required: true,
        section: "1. Dokumen & Kemasan",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Tanggal kedaluwarsa (Exp Date) aman sesuai standar rotasi",
        type: "yes_no",
        required: true,
        section: "2. Kualitas & Suhu",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Suhu armada pengangkut bahan beku/dingin (°C)",
        type: "number",
        required: false,
        section: "2. Kualitas & Suhu",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Barang langsung disimpan ke chiller/freezer/rak FIFO",
        type: "yes_no",
        required: true,
        section: "2. Kualitas & Suhu",
      },
      {
        id: `starter-field-${createLocalId()}`,
        label: "Catatan barang ditolak / retur jika ada",
        type: "textarea",
        required: false,
        section: "2. Kualitas & Suhu",
      },
    ]),
  },
];

export function instantiateStarterTemplate(definition: StarterTemplateDefinition): FormTemplate {
  return {
    id: `local-${createLocalId()}`,
    name: definition.name,
    category: definition.category,
    description: definition.description,
    status: "Draft",
    fields: definition.fields.map((field) => ({
      ...field,
      id: `local-field-${createLocalId()}`,
    })),
  };
}
