# -*- coding: utf-8 -*-
{
    "name": "Hijri Qamari Date Picker",
    "version": "1.0",
    "category": "web",
    "sequence": 7,
    "summary": "Adds Hijri Qamari date pickers to the Odoo web client.",
    "description": """
        Provides the ability to display and pick dates using the Hijri Qamari calendar in the Odoo web client.
        Integrates a Hijri date picker widget (using moment-hijri and bootstrap-hijri-datetimepicker) to show non‑Gregorian equivalents 
        alongside standard Gregorian dates.
    """,
    "author": "TechTown",
    "depends": ["web"],
    'installable': True,
    'auto_install': False,
    'application': False,
    "assets": {
        "web.assets_backend": [
            'web/static/lib/jquery/jquery.js',
            "web_hijri_qamari_date/static/lib/moment/moment.min.js",
            "web_hijri_qamari_date/static/lib/moment/moment-hijri.js",
            "web_hijri_qamari_date/static/lib/bootstrap-hijri-datepicker/js/bootstrap-hijri-datetimepicker.min.js",
            "web_hijri_qamari_date/static/lib/bootstrap-hijri-datepicker/css/bootstrap-datetimepicker.css",
            "web_hijri_qamari_date/static/src/xml/date_field.xml",
            "web_hijri_qamari_date/static/src/xml/hijri_date_picker.xml",
            "web_hijri_qamari_date/static/src/js/hijri_datepicker.js",
            "web_hijri_qamari_date/static/src/js/date_field.js",
        ],
    },
    'license': 'LGPL-3',
    'price': 36.0,
    'currency': 'USD',
    'images': ['static/description/banner.png'],
}
