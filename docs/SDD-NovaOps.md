# Software Design Document — NovaOps Execution

## 1. Product Vision
NovaOps Execution adalah web-based operational execution platform untuk memastikan aktivitas outlet berjalan sesuai SOP melalui checklist, audit, inspection, task, corrective action, dan reporting.

## 2. Core Philosophy
NovaOps bukan hanya checklist app. NovaOps adalah execution engine.

Semua aktivitas operasional diperlakukan sebagai:
Template → Assignment → Execution → Review → Issue → Corrective Action → Analytics

## 3. Core Modules
- Dashboard
- Form Builder
- Execution
- Tasks
- Reports
- Outlets
- Users
- Settings

## 4. Core Engines
### 4.1 Builder Engine
Digunakan untuk membuat form dinamis seperti checklist, audit, inspection, temperature log, incident report, cleaning log, dan store visit.

### 4.2 Renderer Engine
Membaca form template dan menampilkan form yang bisa diisi oleh user.

### 4.3 Execution Engine
Mengatur proses pengisian form berdasarkan outlet, shift, schedule, dan user assignment.

### 4.4 Task Engine
Mengelola corrective action dari issue, audit finding, checklist failure, atau task manual.

### 4.5 Report Engine
Mengubah data submission, issue, dan task menjadi dashboard operasional.

## 5. Builder Document Model
```json
{
  "metadata": {
    "title": "Opening Checklist",
    "description": "Daily opening checklist",
    "formType": "checklist",
    "status": "draft",
    "version": 1
  },
  "sections": [
    {
      "id": 1,
      "title": "Opening Section",
      "description": "Before outlet operation starts",
      "fields": [
        {
          "id": 101,
          "label": "Espresso machine clean?",
          "field_type": "yes_no",
          "is_required": true,
          "placeholder": "",
          "help_text": ""
        }
      ]
    }
  ]
}