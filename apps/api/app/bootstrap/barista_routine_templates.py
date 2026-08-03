"""Barista Opening / Evening / Midnight Closing routine form templates.

Each task uses Pass/Fail/N/A (or Number/Photo/Text/Approval) with conditional
Issue + Corrective Action (+ evidence photo when Fail) via visibility rules.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

PASS_FAIL_NA = ["Pass", "Fail", "N/A"]
PASS_FAIL = ["Pass", "Fail"]


def _header_fields(*, shift_choices: list[str]) -> list[dict[str, Any]]:
    return [
        {
            "key": "pic",
            "label": "Nama PIC",
            "field_type": "responsible_person",
            "is_required": True,
            "sort_order": 0,
            "help_text": "Header",
            "options_json": {"system": True, "require_execution_note": False},
        },
        {
            "key": "jabatan",
            "label": "Jabatan",
            "field_type": "select",
            "is_required": True,
            "sort_order": 1,
            "help_text": "Header",
            "options_json": {
                "choices": [
                    "Crew",
                    "Senior Barista",
                    "Lead Barista",
                    "Head Barista",
                    "Supervisor",
                ]
            },
        },
        {
            "key": "tanggal",
            "label": "Tanggal",
            "field_type": "date",
            "is_required": True,
            "sort_order": 2,
            "help_text": "Header",
        },
        {
            "key": "shift",
            "label": "Shift",
            "field_type": "select",
            "is_required": True,
            "sort_order": 3,
            "help_text": "Header",
            "options_json": {"choices": shift_choices},
        },
        {
            "key": "jam_mulai",
            "label": "Jam Mulai",
            "field_type": "time",
            "is_required": True,
            "sort_order": 4,
            "help_text": "Header",
        },
        {
            "key": "jam_selesai",
            "label": "Jam Selesai",
            "field_type": "time",
            "is_required": False,
            "sort_order": 5,
            "help_text": "Header",
        },
    ]


def _fail_chain(key: str, area: str, task: str, *, sort_base: int, always_photo: bool) -> list[dict]:
    """Issue + Corrective Action (+ Fail evidence photo if not already always captured)."""
    fields: list[dict[str, Any]] = [
        {
            "key": f"{key}_issue",
            "label": f"Issue — {task}",
            "field_type": "textarea",
            "is_required": True,
            "sort_order": sort_base,
            "help_text": area,
            "show_when_key": key,
            "show_when_value": "Fail",
        },
        {
            "key": f"{key}_corrective",
            "label": f"Corrective Action — {task}",
            "field_type": "textarea",
            "is_required": True,
            "sort_order": sort_base + 1,
            "help_text": area,
            "show_when_key": key,
            "show_when_value": "Fail",
        },
    ]
    if not always_photo:
        fields.append(
            {
                "key": f"{key}_fail_photo",
                "label": f"Evidence foto — {task}",
                "field_type": "photo",
                "is_required": True,
                "sort_order": sort_base + 2,
                "help_text": area,
                "show_when_key": key,
                "show_when_value": "Fail",
            }
        )
    return fields


def _check(
    key: str,
    area: str,
    task: str,
    standard: str,
    *,
    sort_order: int,
    required: bool = True,
    always_photo: bool = False,
    allow_na: bool = True,
    critical: bool = False,
) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = [
        {
            "key": key,
            "label": task,
            "field_type": "select",
            "is_required": required,
            "sort_order": sort_order,
            "help_text": area,
            "options_json": {
                "choices": PASS_FAIL_NA if allow_na else PASS_FAIL,
                "standard": standard,
            },
            "validation_json": {"critical": True} if critical else {"weight": 1},
        }
    ]
    next_sort = sort_order + 1
    if always_photo:
        fields.append(
            {
                "key": f"{key}_photo",
                "label": f"{task} — Photo",
                "field_type": "photo",
                "is_required": required,
                "sort_order": next_sort,
                "help_text": area,
            }
        )
        next_sort += 1
    fields.extend(
        _fail_chain(key, area, task, sort_base=next_sort, always_photo=always_photo)
    )
    return fields


def _number(
    key: str,
    area: str,
    task: str,
    standard: str,
    *,
    sort_order: int,
    unit_hint: str | None = None,
    required: bool = True,
    min_value: float | None = None,
    max_value: float | None = None,
) -> list[dict[str, Any]]:
    label = f"{task} ({unit_hint})" if unit_hint else task
    validation: dict[str, Any] = {"weight": 1}
    if min_value is not None:
        validation["min"] = min_value
    if max_value is not None:
        validation["max"] = max_value
    return [
        {
            "key": key,
            "label": label,
            "field_type": "number",
            "is_required": required,
            "sort_order": sort_order,
            "help_text": area,
            "options_json": {"standard": standard},
            "validation_json": validation,
        }
    ]


def _text(
    key: str,
    area: str,
    task: str,
    standard: str,
    *,
    sort_order: int,
    required: bool = False,
    allow_na_select: bool = False,
) -> list[dict[str, Any]]:
    if allow_na_select:
        # Presence check then optional text details
        return [
            {
                "key": key,
                "label": task,
                "field_type": "select",
                "is_required": True,
                "sort_order": sort_order,
                "help_text": area,
                "options_json": {
                    "choices": ["Recorded", "N/A", "Fail"],
                    "standard": standard,
                },
            },
            {
                "key": f"{key}_detail",
                "label": f"Detail — {task}",
                "field_type": "textarea",
                "is_required": True,
                "sort_order": sort_order + 1,
                "help_text": area,
                "show_when_key": key,
                "show_when_value": "Recorded",
            },
            *_fail_chain(key, area, task, sort_base=sort_order + 2, always_photo=False),
        ]
    return [
        {
            "key": key,
            "label": task,
            "field_type": "textarea",
            "is_required": required,
            "sort_order": sort_order,
            "help_text": area,
            "options_json": {"standard": standard},
        }
    ]


def _photo(
    key: str,
    area: str,
    task: str,
    standard: str,
    *,
    sort_order: int,
    required: bool = True,
) -> list[dict[str, Any]]:
    return [
        {
            "key": key,
            "label": task,
            "field_type": "photo",
            "is_required": required,
            "sort_order": sort_order,
            "help_text": area,
            "options_json": {"standard": standard},
        }
    ]


def _assessment(
    *,
    choices: list[str],
    notes_when: list[str],
    sort_order: int = 900,
) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = [
        {
            "key": "final_assessment",
            "label": "Final Assessment",
            "field_type": "select",
            "is_required": True,
            "sort_order": sort_order,
            "help_text": "Assessment",
            "options_json": {"choices": choices, "standard": "Status akhir kesiapan outlet"},
            "validation_json": {"weight": 1},
        }
    ]
    for index, value in enumerate(notes_when):
        fields.append(
            {
                "key": f"assessment_notes_{index}",
                "label": "Issue & Corrective Action (Assessment)",
                "field_type": "textarea",
                "is_required": True,
                "sort_order": sort_order + 1 + index,
                "help_text": "Assessment",
                "show_when_key": "final_assessment",
                "show_when_value": value,
            }
        )
    return fields


def _opening_fields() -> list[dict[str, Any]]:
    fields = _header_fields(shift_choices=["Opening", "Pagi"])
    sort = 10
    blocks = [
        _check("people_grooming", "People", "Personal grooming", "Sesuai grooming standard", sort_order=sort),
        _check(
            "people_uniform",
            "People",
            "Uniform & personal hygiene",
            "Lengkap, bersih, rapi",
            sort_order=sort + 10,
        ),
        _check(
            "bar_opening",
            "Bar",
            "Kondisi bar opening",
            "Bersih, kering, tidak ada sisa closing",
            sort_order=sort + 20,
            always_photo=True,
        ),
        _check(
            "espresso_on",
            "Espresso",
            "Turn on espresso machine",
            "Machine beroperasi normal",
            sort_order=sort + 30,
        ),
        _check(
            "espresso_flush",
            "Espresso",
            "Flush & machine check",
            "Tidak ada abnormality",
            sort_order=sort + 40,
        ),
        _check(
            "grinder_ready",
            "Grinder",
            "Grinder readiness",
            "Bersih & berfungsi normal",
            sort_order=sort + 50,
        ),
        _number(
            "coffee_dialin",
            "Coffee",
            "Dial-in espresso",
            "Sesuai recipe standard",
            sort_order=sort + 60,
            unit_hint="angka",
        ),
        _number(
            "coffee_dose",
            "Coffee",
            "Dose",
            "Sesuai recipe",
            sort_order=sort + 70,
            unit_hint="gram",
            min_value=0,
        ),
        _number(
            "coffee_yield",
            "Coffee",
            "Yield",
            "Sesuai recipe",
            sort_order=sort + 80,
            unit_hint="gram",
            min_value=0,
        ),
        _number(
            "coffee_time",
            "Coffee",
            "Extraction time",
            "Sesuai recipe",
            sort_order=sort + 90,
            unit_hint="detik",
            min_value=0,
        ),
        _check(
            "coffee_taste",
            "Coffee",
            "Taste validation",
            "Balanced & sesuai profile",
            sort_order=sort + 100,
            allow_na=False,
            critical=True,
        ),
        _check(
            "milk_stock",
            "Milk",
            "Milk stock",
            "Mencukupi opening par",
            sort_order=sort + 110,
        ),
        _number(
            "milk_temp",
            "Milk",
            "Chiller temperature",
            "Sesuai standar",
            sort_order=sort + 120,
            unit_hint="°C",
        ),
        _check(
            "product_syrup",
            "Product",
            "Syrup/sauce/powder",
            "Stock & expiry aman",
            sort_order=sort + 130,
        ),
        _check(
            "product_fifo",
            "Product",
            "FIFO check",
            "FIFO diterapkan",
            sort_order=sort + 140,
        ),
        _check("ice_stock", "Ice", "Ice availability", "Sesuai par", sort_order=sort + 150),
        _check(
            "tools_bar",
            "Tools",
            "Bar tools",
            "Lengkap, bersih, sanitized",
            sort_order=sort + 160,
        ),
        _check(
            "packaging_par",
            "Packaging",
            "Cup/lid/tissue/etc.",
            "Sesuai opening par",
            sort_order=sort + 170,
        ),
        _check(
            "equipment_ok",
            "Equipment",
            "Equipment functionality",
            "Seluruh equipment utama normal",
            sort_order=sort + 180,
            critical=True,
        ),
        _photo(
            "station_final",
            "Station",
            "Final bar readiness",
            "Seluruh station siap operasi",
            sort_order=sort + 190,
        ),
        _text(
            "opening_issue",
            "Issue",
            "Opening issue",
            "Catat jika ada",
            sort_order=sort + 200,
            required=False,
        ),
        _assessment(
            choices=["Ready", "Ready with Notes", "Not Ready"],
            notes_when=["Ready with Notes", "Not Ready"],
            sort_order=900,
        ),
    ]
    for block in blocks:
        fields.extend(block)
    return fields


def _evening_fields() -> list[dict[str, Any]]:
    fields = _header_fields(shift_choices=["Evening", "Sore", "Siang"])
    sort = 10
    blocks = [
        _check(
            "bar_clean",
            "Bar",
            "Bar cleanliness",
            "Clean-as-you-go berjalan",
            sort_order=sort,
            always_photo=True,
        ),
        _check(
            "espresso_condition",
            "Espresso",
            "Espresso machine condition",
            "Bersih & normal",
            sort_order=sort + 10,
        ),
        _check(
            "group_flush",
            "Espresso",
            "Group head flush",
            "Sudah dilakukan",
            sort_order=sort + 20,
        ),
        _check(
            "grinder_condition",
            "Grinder",
            "Grinder condition",
            "Bersih & normal",
            sort_order=sort + 30,
        ),
        _check(
            "espresso_calibration",
            "Coffee",
            "Espresso calibration",
            "Recipe masih sesuai",
            sort_order=sort + 40,
            allow_na=False,
        ),
        _number(
            "redial",
            "Coffee",
            "Re-dial jika diperlukan",
            "Hasil sesuai standard (isi N/A angka 0 jika tidak perlu)",
            sort_order=sort + 50,
            unit_hint="angka",
            required=False,
        ),
        _check(
            "milk_avail",
            "Milk",
            "Milk availability",
            "Cukup sampai closing",
            sort_order=sort + 60,
        ),
        _number(
            "chiller_temp",
            "Milk",
            "Chiller temperature",
            "Sesuai standard",
            sort_order=sort + 70,
            unit_hint="°C",
        ),
        _check(
            "ingredient_stock",
            "Product",
            "Ingredient stock",
            "Critical stock tersedia",
            sort_order=sort + 80,
        ),
        _check(
            "fifo_expiry",
            "Product",
            "FIFO & expiry",
            "Tidak ada expired product",
            sort_order=sort + 90,
            critical=True,
        ),
        _check(
            "packaging_stock",
            "Packaging",
            "Packaging stock",
            "Cukup sampai closing",
            sort_order=sort + 100,
        ),
        _check(
            "station_org",
            "Station",
            "Station organization",
            "Tools kembali pada posisi standar",
            sort_order=sort + 110,
        ),
        _check(
            "preclosing_clean",
            "Cleaning",
            "Pre-closing cleaning",
            "Area nonaktif sudah dibersihkan",
            sort_order=sort + 120,
        ),
        _check(
            "waste_mgmt",
            "Waste",
            "Waste management",
            "Bin tidak overcapacity",
            sort_order=sort + 130,
        ),
        _check(
            "critical_stock",
            "Stock",
            "Critical stock check",
            "Shortage tercatat",
            sort_order=sort + 140,
        ),
        {
            "key": "critical_stock_note",
            "label": "Critical stock notes",
            "field_type": "textarea",
            "is_required": False,
            "sort_order": sort + 141,
            "help_text": "Stock",
            "options_json": {"standard": "Catat shortage jika ada"},
        },
        _check(
            "equipment_condition",
            "Equipment",
            "Equipment condition",
            "Issue tercatat",
            sort_order=sort + 150,
            critical=True,
        ),
        _text(
            "handover_pending",
            "Handover",
            "Pending task",
            "Semua pending task tercatat",
            sort_order=sort + 160,
            required=True,
        ),
        _text(
            "handover_shortage",
            "Handover",
            "Product shortage",
            "Shortage dikomunikasikan",
            sort_order=sort + 170,
            allow_na_select=True,
        ),
        _text(
            "handover_equipment",
            "Handover",
            "Equipment issue",
            "Issue dikomunikasikan",
            sort_order=sort + 180,
            allow_na_select=True,
        ),
        _photo(
            "evening_condition",
            "Bar",
            "Evening condition",
            "Kondisi aktual terdokumentasi",
            sort_order=sort + 190,
        ),
        _assessment(
            choices=["Controlled", "Attention Required", "Critical Issue"],
            notes_when=["Attention Required", "Critical Issue"],
            sort_order=900,
        ),
    ]
    for block in blocks:
        if isinstance(block, list):
            fields.extend(block)
        else:
            fields.append(block)
    return fields


def _closing_fields() -> list[dict[str, Any]]:
    fields = _header_fields(shift_choices=["Midnight", "Closing", "Malam"])
    sort = 10
    blocks = [
        _check(
            "secure_beans",
            "Coffee",
            "Secure coffee beans",
            "Beans tersimpan sesuai standard",
            sort_order=sort,
        ),
        _check(
            "empty_hopper",
            "Grinder",
            "Empty/secure hopper",
            "Sesuai closing SOP",
            sort_order=sort + 10,
        ),
        _check(
            "clean_grinder",
            "Grinder",
            "Clean grinder",
            "Hopper/chute/body bersih",
            sort_order=sort + 20,
            always_photo=True,
        ),
        _check(
            "group_head_clean",
            "Espresso",
            "Group head cleaning",
            "Bersih",
            sort_order=sort + 30,
        ),
        _check(
            "backflush",
            "Espresso",
            "Backflush",
            "Selesai sesuai SOP",
            sort_order=sort + 40,
        ),
        _check(
            "chemical_clean",
            "Espresso",
            "Chemical cleaning",
            "Sesuai cleaning schedule",
            sort_order=sort + 50,
        ),
        _check(
            "steam_wand",
            "Espresso",
            "Steam wand",
            "Bersih, tidak ada milk residue",
            sort_order=sort + 60,
        ),
        _check("drip_tray", "Espresso", "Drip tray", "Bersih", sort_order=sort + 70),
        _check(
            "remaining_milk",
            "Milk",
            "Remaining milk check",
            "Aman & sesuai storage SOP",
            sort_order=sort + 80,
        ),
        _number(
            "closing_chiller_temp",
            "Chiller",
            "Chiller temperature",
            "Sesuai standard",
            sort_order=sort + 90,
            unit_hint="°C",
        ),
        _check(
            "chiller_clean",
            "Chiller",
            "Chiller cleaning",
            "Bersih & organized",
            sort_order=sort + 100,
            always_photo=True,
        ),
        _check(
            "expiry_check",
            "Product",
            "Expiry check",
            "Tidak ada expired product",
            sort_order=sort + 110,
            critical=True,
        ),
        _check(
            "fifo_reset",
            "Product",
            "FIFO reset",
            "Produk tersusun FIFO",
            sort_order=sort + 120,
        ),
        _check(
            "mixology_clean",
            "Mixology",
            "Bottle/nozzle cleaning",
            "Bersih & tertutup",
            sort_order=sort + 130,
        ),
        _check(
            "wash_tools",
            "Tools",
            "Wash bar tools",
            "Semua tools bersih",
            sort_order=sort + 140,
        ),
        _check(
            "sanitize_tools",
            "Tools",
            "Sanitize tools",
            "Sudah sanitized",
            sort_order=sort + 150,
        ),
        _check(
            "counter_clean",
            "Bar",
            "Counter cleaning",
            "Clean & dry",
            sort_order=sort + 160,
        ),
        _check(
            "sink_clean",
            "Sink",
            "Sink cleaning",
            "Bersih, tidak tersumbat",
            sort_order=sort + 170,
        ),
        _check(
            "waste_removal",
            "Waste",
            "Waste removal",
            "Sampah dibuang",
            sort_order=sort + 180,
        ),
        _check(
            "bin_clean",
            "Waste",
            "Bin cleaning",
            "Bersih & liner baru",
            sort_order=sort + 190,
        ),
        _number(
            "critical_count",
            "Stock",
            "Critical stock count",
            "Jumlah tercatat",
            sort_order=sort + 200,
            unit_hint="qty",
            min_value=0,
        ),
        _check(
            "opening_replenish",
            "Packaging",
            "Opening replenishment",
            "Siap untuk opening",
            sort_order=sort + 210,
        ),
        _check(
            "equipment_inspect",
            "Equipment",
            "Equipment inspection",
            "Tidak ada unresolved abnormality",
            sort_order=sort + 220,
            critical=True,
        ),
        _text(
            "closing_issue",
            "Issue",
            "Equipment/product issue",
            "Semua issue tercatat",
            sort_order=sort + 230,
            allow_na_select=True,
        ),
        _photo(
            "final_bar",
            "Bar",
            "Final bar condition",
            "Clean & reset",
            sort_order=sort + 240,
        ),
        _text(
            "opening_handover",
            "Handover",
            "Opening handover",
            "Informasi penting tercatat",
            sort_order=sort + 250,
            required=True,
        ),
        [
            {
                "key": "supervisor_verify",
                "label": "Final verification (Supervisor)",
                "field_type": "select",
                "is_required": True,
                "sort_order": sort + 260,
                "help_text": "Supervisor",
                "options_json": {
                    "choices": ["Approved", "Rejected"],
                    "standard": "Closing diverifikasi supervisor",
                },
                "validation_json": {"critical": True},
            },
            {
                "key": "supervisor_signature",
                "label": "Supervisor signature",
                "field_type": "signature",
                "is_required": True,
                "sort_order": sort + 261,
                "help_text": "Supervisor",
                "show_when_key": "supervisor_verify",
                "show_when_value": "Approved",
            },
            {
                "key": "supervisor_reject_reason",
                "label": "Reject reason",
                "field_type": "textarea",
                "is_required": True,
                "sort_order": sort + 262,
                "help_text": "Supervisor",
                "show_when_key": "supervisor_verify",
                "show_when_value": "Rejected",
            },
        ],
        _assessment(
            choices=["Ready for Tomorrow", "Ready with Follow-up", "Not Ready"],
            notes_when=["Ready with Follow-up", "Not Ready"],
            sort_order=900,
        ),
    ]
    for block in blocks:
        if isinstance(block, list):
            fields.extend(block)
        else:
            fields.append(block)
    return fields


BARISTA_ROUTINE_TEMPLATES: list[dict[str, Any]] = [
    {
        "title": "Barista Opening Routine",
        "description": (
            "Operational readiness checklist for barista opening. "
            "Header: PIC, jabatan, tanggal, shift, jam. Tasks by area with "
            "Pass/Fail/N/A, number, and photo verification. Fail triggers Issue + Corrective Action."
        ),
        "form_type": "opening",
        "fields": _opening_fields(),
        "schedule": {
            "title": "Daily Barista Opening Routine",
            "recurrence": "daily",
            "publish_time": "05:30",
            "due_time": "08:00",
            "priority": "high",
        },
    },
    {
        "title": "Barista Evening Routine",
        "description": (
            "Maintain standard + pre-closing + shift handover for evening barista. "
            "Final assessment: Controlled / Attention Required / Critical Issue."
        ),
        "form_type": "quality_check",
        "fields": _evening_fields(),
        "schedule": {
            "title": "Daily Barista Evening Routine",
            "recurrence": "daily",
            "publish_time": "15:00",
            "due_time": "18:00",
            "priority": "medium",
        },
    },
    {
        "title": "Barista Midnight Closing Routine",
        "description": (
            "Clean + secure + reset + ready for tomorrow. Includes supervisor approval "
            "and final assessment: Ready for Tomorrow / Ready with Follow-up / Not Ready."
        ),
        "form_type": "closing",
        "fields": _closing_fields(),
        "schedule": {
            "title": "Daily Barista Midnight Closing Routine",
            "recurrence": "daily",
            "publish_time": "21:00",
            "due_time": "23:30",
            "priority": "high",
        },
    },
]


def _wire_visibility(fields: list, specs: list[dict[str, Any]]) -> None:
    key_to_id = {
        spec["key"]: field.id
        for spec, field in zip(specs, fields, strict=False)
        if spec.get("key") and field.id is not None
    }

    for spec, field in zip(specs, fields, strict=False):
        trigger_key = spec.get("show_when_key")
        if not trigger_key:
            continue
        trigger_id = key_to_id.get(trigger_key)
        if trigger_id is None:
            continue

        options = dict(field.options_json or {}) if isinstance(field.options_json, dict) else {}
        options["visibilityRule"] = {
            "fieldId": str(trigger_id),
            "operator": "equals",
            "value": spec.get("show_when_value") or "Fail",
        }
        field.options_json = options


def _create_fields(db: Session, template_id: int, specs: list[dict[str, Any]]) -> list:
    from app.models.form_field import FormField

    created = []
    for spec in specs:
        payload = {
            "form_template_id": template_id,
            "label": spec["label"][:150],
            "field_type": spec["field_type"],
            "is_required": bool(spec.get("is_required", False)),
            "sort_order": int(spec.get("sort_order", 0)),
            "help_text": spec.get("help_text"),
            "placeholder": None,
            "options_json": deepcopy(spec.get("options_json")) if spec.get("options_json") else None,
            "validation_json": deepcopy(spec.get("validation_json"))
            if spec.get("validation_json")
            else None,
        }
        field = FormField(**payload)
        db.add(field)
        created.append(field)

    db.flush()
    _wire_visibility(created, specs)
    db.flush()
    return created


def install_barista_routine_templates(
    db: Session,
    *,
    creator: Any | None,
    outlet_ids: list[str] | None = None,
) -> dict[str, Any]:
    from app.models.form_field import FormField
    from app.models.form_template import FormTemplate
    from app.models.task_schedule import TaskSchedule

    if creator is None:
        return {
            "ok": False,
            "message": "Tidak ada user admin untuk membuat barista routine templates.",
            "templates_created": [],
            "templates_existing": [],
            "schedules_created": [],
            "schedules_existing": [],
        }

    outlet_ids = outlet_ids or []
    templates_created: list[str] = []
    templates_existing: list[str] = []
    schedules_created: list[str] = []
    schedules_existing: list[str] = []

    for spec in BARISTA_ROUTINE_TEMPLATES:
        existing = db.scalar(select(FormTemplate).where(FormTemplate.title == spec["title"]))
        if existing:
            template = existing
            templates_existing.append(spec["title"])
            field_count = (
                db.query(FormField)
                .filter(FormField.form_template_id == template.id)
                .count()
            )
            if field_count == 0:
                _create_fields(db, template.id, spec["fields"])
        else:
            template = FormTemplate(
                title=spec["title"],
                description=spec["description"],
                form_type=spec["form_type"],
                created_by=creator.id,
                is_active=True,
            )
            db.add(template)
            db.flush()
            _create_fields(db, template.id, spec["fields"])
            templates_created.append(spec["title"])

        schedule_spec = spec.get("schedule")
        if not schedule_spec or not outlet_ids:
            continue

        schedule_title = schedule_spec["title"]
        existing_schedule = db.scalar(
            select(TaskSchedule).where(TaskSchedule.title == schedule_title)
        )
        if existing_schedule:
            schedules_existing.append(schedule_title)
            continue

        db.add(
            TaskSchedule(
                title=schedule_title,
                description=spec["description"],
                form_template_id=template.id,
                priority=schedule_spec["priority"],
                recurrence=schedule_spec["recurrence"],
                shifts_json=[],
                outlet_ids_json=outlet_ids,
                publish_time=schedule_spec.get("publish_time", "09:00"),
                due_time=schedule_spec["due_time"],
                weekly_publish_day=None,
                auto_publish=True,
                is_active=True,
                created_by=creator.id,
            )
        )
        schedules_created.append(schedule_title)

    return {
        "ok": True,
        "message": (
            f"Barista routines: {len(templates_created)} template baru, "
            f"{len(schedules_created)} jadwal baru."
        ),
        "templates_created": templates_created,
        "templates_existing": templates_existing,
        "schedules_created": schedules_created,
        "schedules_existing": schedules_existing,
    }
