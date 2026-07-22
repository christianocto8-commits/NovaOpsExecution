from app.services.template_settings import template_requires_execution_note


def test_template_requires_execution_note_defaults_true(db):
    from app.models.form_template import FormTemplate

    template = FormTemplate(
        title="Template settings default",
        description="",
        form_type="test",
        outlet_id=None,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()

    assert template_requires_execution_note(db, template.id) is True


def test_template_requires_execution_note_reads_responsible_person_option(db):
    from app.models.form_field import FormField
    from app.models.form_template import FormTemplate

    template = FormTemplate(
        title="Template settings optional note",
        description="",
        form_type="test",
        outlet_id=None,
        created_by=1,
        is_active=True,
    )
    db.add(template)
    db.flush()

    db.add(
        FormField(
            form_template_id=template.id,
            label="Nama pelaksana / PIC",
            field_type="responsible_person",
            is_required=True,
            sort_order=0,
            options_json={"system": True, "require_execution_note": False},
        )
    )
    db.commit()

    assert template_requires_execution_note(db, template.id) is False
