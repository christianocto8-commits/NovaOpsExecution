# NovaOps Engineering Guidelines

Ini adalah dokumen panduan untuk pengembangan proyek NovaOps.

## Arsitektur & Dokumentasi
- Semua desain sistem harus merujuk pada `docs/architecture/`.
- Keputusan teknis besar wajib didokumentasikan di `docs/decisions/`.

## Konvensi
- Kode: Menggunakan bahasa Inggris untuk penamaan variabel, fungsi, dan komentar.
- Dokumentasi & Komunikasi: Gunakan bahasa Indonesia untuk komunikasi tim dan dokumentasi internal jika relevan.
- Struktur: Patuhi aturan `adr-0001-folder-structure.md`.

## Workflow
- Ikuti alur pengembangan: **Research -> Strategy -> Execution**.
- **Execution** harus mengikuti siklus **Plan -> Act -> Validate**.
- Jangan pernah melakukan *commit* tanpa instruksi eksplisit.
- Selalu jalankan pengujian (`npm run lint`, `pytest`, dll) sebelum menyelesaikan tugas.
