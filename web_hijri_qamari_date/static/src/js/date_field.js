/** @odoo-module **/

import { localization } from '@web/core/l10n/localization';
import { Component, onWillRender, useState, onMounted, onWillUpdateProps } from "@odoo/owl";
import { useDateTimePicker } from "@web/core/datetime/datetime_hook";
import { areDatesEqual, deserializeDate, deserializeDateTime, today } from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { ensureArray } from "@web/core/utils/arrays";
import { exprToBoolean } from "@web/core/utils/strings";
import { formatDate, formatDateTime } from "@web/views/fields/formatters";
import { standardFieldProps } from '@web/views/fields/standard_field_props';
import { HijriDatePicker } from './hijri_datepicker';

export class DateTimeField extends Component {
    static props = {
        ...standardFieldProps,
        endDateField: { type: String, optional: true },
        maxDate: { type: String, optional: true },
        minDate: { type: String, optional: true },
        alwaysRange: { type: Boolean, optional: true },
        placeholder: { type: String, optional: true },
        required: { type: Boolean, optional: true },
        rounding: { type: Number, optional: true },
        startDateField: { type: String, optional: true },
        warnFuture: { type: Boolean, optional: true },
        showSeconds: { type: Boolean, optional: true },
        showTime: { type: Boolean, optional: true },
        minPrecision: {
            type: String,
            optional: true,
            validate: (props) => ["days", "months", "years", "decades"].includes(props),
        },
        maxPrecision: {
            type: String,
            optional: true,
            validate: (props) => ["days", "months", "years", "decades"].includes(props),
        },
        condensed: { type: Boolean, optional: true },
        pickerOptions: { type: Object, optional: true },
    };
    static defaultProps = {
        showSeconds: true,
        showTime: true,
    };

    static template = "web_hijri_qamari_date.DateTimeField";
    static components = { HijriDatePicker };


    //-------------------------------------------------------------------------
    // Getters
    //-------------------------------------------------------------------------

    get endDateField() {
        return this.relatedField ? this.props.endDateField || this.props.name : null;
    }

    get field() {
        return this.props.record.fields[this.props.name];
    }

    get relatedField() {
        return this.props.startDateField || this.props.endDateField;
    }

    get startDateField() {
        return this.props.startDateField || this.props.name;
    }

    get values() {
        return ensureArray(this.state.value);
    }

    get isDateTime() {
        return this.field.type === 'datetime';
    }

    get isDateField() {
        return this.field.type === 'date';
    }

    get date() {
        return this.props.value && this.props.value.startOf('day');
    }

    get formattedValue() {
        if (!this.props.value) return '';
        return this.isDateTime
            ? formatDateTime(this.props.value, { format: localization.dateFormat })
            : formatDate(this.props.value);
    }

    getFormattedValue(index) {
        const value = this.values[index];
        if (!value) return "";
        return this.isDateTime
            ? formatDateTime(value)
            : formatDate(value);
    }

    getHijriFormattedValue(index) {
        const value = this.values[index];
        if (!value) return "";
        try {
            if (window.moment) {
                const jsDate = value.toJSDate ? value.toJSDate() : value;
                const m = window.moment(jsDate);
                if (this.isDateTime) {
                    return m.format('iYYYY/iMM/iDD HH:mm');
                }
                return m.format('iYYYY/iMM/iDD');
            }
        } catch (e) {
            // console.error(e);
        }
        return "";
    }

    //-------------------------------------------------------------------------
    // Setup
    //-------------------------------------------------------------------------

    setup() {

        this.hijriPickerRefs = {
            main: null,
            start: null,
            end: null
        };

        const getPickerProps = () => {
            const value = this.getRecordValue();
            const pickerProps = {
                value,
                type: this.field.type,
                range: this.isRange(value),
            };
            if (this.props.maxDate) {
                pickerProps.maxDate = this.parseLimitDate(this.props.maxDate);
            }
            if (this.props.minDate) {
                pickerProps.minDate = this.parseLimitDate(this.props.minDate);
            }
            if (!isNaN(this.props.rounding)) {
                pickerProps.rounding = this.props.rounding;
            } else if (!this.props.showSeconds) {
                pickerProps.rounding = 0;
            }
            if (this.props.maxPrecision) {
                pickerProps.maxPrecision = this.props.maxPrecision;
            }
            if (this.props.minPrecision) {
                pickerProps.minPrecision = this.props.minPrecision;
            }
            return pickerProps;
        };

        const dateTimePicker = useDateTimePicker({
            target: "root",
            showSeconds: this.props.showSeconds,
            condensed: this.props.condensed,
            get pickerProps() {
                return getPickerProps();
            },
            onChange: () => {
                this.state.range = this.isRange(this.state.value);
            },
            onApply: () => {
                const toUpdate = {};
                if (Array.isArray(this.state.value)) {
                    [toUpdate[this.startDateField], toUpdate[this.endDateField]] = this.state.value;
                } else {
                    toUpdate[this.props.name] = this.state.value;
                }

                for (const fieldName in toUpdate) {
                    if (areDatesEqual(toUpdate[fieldName], this.props.record.data[fieldName])) {
                        delete toUpdate[fieldName];
                    }
                }

                if (Object.keys(toUpdate).length) {
                    this.props.record.update(toUpdate);
                    this.triggerIsDirty(true);
                }
            },
        });

        this.state = useState(dateTimePicker.state);
        this.openPicker = dateTimePicker.open;

        onWillRender(() => {
            this.triggerIsDirty();
        });

        onMounted(() => {
            this.updateHijriComponents()
            if (this.props.value) {
                setTimeout(() => {
                    this.updateHijriComponents();
                }, 200);
            }
        });

        onWillUpdateProps((nextProps) => {
            if (!areDatesEqual(this.props.value, nextProps.value)) {
                setTimeout(() => {
                    this.updateHijriComponents();
                }, 100);
            }
        });
    }

    updateRecord(value) {
        const toUpdate = {};

        if (Array.isArray(value)) {
            [toUpdate[this.startDateField], toUpdate[this.endDateField]] = value;
        } else {
            toUpdate[this.props.name] = value;
        }

        for (const fieldName in toUpdate) {
            if (areDatesEqual(toUpdate[fieldName], this.props.record.data[fieldName])) {
                delete toUpdate[fieldName];
            }
        }

        if (Object.keys(toUpdate).length) {
            this.props.record.update(toUpdate);
        }
    }

    //-------------------------------------------------------------------------
    // Core Methods
    //-------------------------------------------------------------------------

    getRecordValue() {
        if (this.relatedField) {
            return [
                this.props.record.data[this.startDateField],
                this.props.record.data[this.endDateField],
            ];
        } else {
            return this.props.record.data[this.props.name];
        }
    }

    isDateInTheFuture(index) {
        return this.values[index] > today();
    }

    isEmpty(fieldName) {
        return fieldName === this.startDateField ? !this.values[0] : !this.values[1];
    }

    isRange(value) {
        if (!this.relatedField) {
            return false;
        }
        return (
            this.props.alwaysRange ||
            this.props.required ||
            ensureArray(value).filter(Boolean).length === 2
        );
    }

    parseLimitDate(value) {
        if (value === "today") {
            return value;
        }
        return this.field.type === "date" ? deserializeDate(value) : deserializeDateTime(value);
    }

    shouldShowSeparator() {
        return (
            (this.props.alwaysRange &&
                (this.props.readonly
                    ? !this.isEmpty(this.startDateField) || !this.isEmpty(this.endDateField)
                    : true)) ||
            (this.state.range &&
                (this.props.required ||
                    (!this.isEmpty(this.startDateField) && !this.isEmpty(this.endDateField))))
        );
    }

    triggerIsDirty(isDirty) {
        this.props.record.model.bus.trigger(
            "FIELD_IS_DIRTY",
            isDirty ?? !areDatesEqual(this.getRecordValue(), this.state.value)
        );
    }

    //-------------------------------------------------------------------------
    // Hijri Date Methods
    //-------------------------------------------------------------------------

    onHijriDateSelected(gregorianDate, fieldIndex = 0) {
        if (this.relatedField) {
            const newValue = [...this.values];
            newValue[fieldIndex] = gregorianDate;
            this.updateRecord(newValue);
        } else {
            this.updateRecord(gregorianDate);
        }
    }

    updateHijriComponents() {
        if (this.hijriPickerComponent) {
            this.hijriPickerComponent.forceUpdateFromParent();
        }
        if (this.hijriStartPickerComponent) {
            this.hijriStartPickerComponent.forceUpdateFromParent();
        }
        if (this.hijriEndPickerComponent) {
            this.hijriEndPickerComponent.forceUpdateFromParent();
        }
    }

    //-------------------------------------------------------------------------
    // Component Callback Setters
    //-------------------------------------------------------------------------

    setHijriPickerComponent(component) {
        this.hijriPickerComponent = component;
    }

    setHijriStartPickerComponent(component) {
        this.hijriStartPickerComponent = component;
    }

    setHijriEndPickerComponent(component) {
        this.hijriEndPickerComponent = component;
    }

    //-------------------------------------------------------------------------
    // Event Handlers
    //-------------------------------------------------------------------------

    onInput() {
        this.triggerIsDirty(true);
    }
}

// Field configurations ...
const START_DATE_FIELD_OPTION = "start_date_field";
const END_DATE_FIELD_OPTION = "end_date_field";

export const dateField = {
    component: DateTimeField,
    displayName: _t("Date"),
    supportedOptions: [
        {
            label: _t("Earliest accepted date"),
            name: "min_date",
            type: "string",
            help: _t(`ISO-formatted date (e.g. "2018-12-31") or "%s".`, "today"),
        },
        {
            label: _t("Latest accepted date"),
            name: "max_date",
            type: "string",
            help: _t(`ISO-formatted date (e.g. "2018-12-31") or "%s".`, "today"),
        },
        {
            label: _t("Warning for future dates"),
            name: "warn_future",
            type: "boolean",
            help: _t(`Displays a warning icon if the input dates are in the future.`),
        },
        {
            label: _t("Minimal precision"),
            name: "min_precision",
            type: "selection",
            choices: [
                { label: _t("Days"), value: "days" },
                { label: _t("Months"), value: "months" },
                { label: _t("Years"), value: "years" },
                { label: _t("Decades"), value: "decades" },
            ],
        },
        {
            label: _t("Maximal precision"),
            name: "max_precision",
            type: "selection",
            choices: [
                { label: _t("Days"), value: "days" },
                { label: _t("Months"), value: "months" },
                { label: _t("Years"), value: "years" },
                { label: _t("Decades"), value: "decades" },
            ],
        },
        {
            label: _t("Condensed display"),
            name: "condensed",
            type: "boolean",
            help: _t(`Set to true to display days, months (and hours) with unpadded numbers`),
        },
    ],
    supportedTypes: ["date"],
    extractProps: ({ attrs, options }, dynamicInfo) => ({
        endDateField: options[END_DATE_FIELD_OPTION],
        maxDate: options.max_date,
        minDate: options.min_date,
        alwaysRange: exprToBoolean(options.always_range),
        placeholder: attrs.placeholder,
        required: dynamicInfo.required,
        rounding: options.rounding && parseInt(options.rounding, 10),
        startDateField: options[START_DATE_FIELD_OPTION],
        warnFuture: exprToBoolean(options.warn_future),
        minPrecision: options.min_precision,
        maxPrecision: options.max_precision,
        condensed: options.condensed,
    }),
    fieldDependencies: ({ type, attrs, options }) => {
        const deps = [];
        if (options[START_DATE_FIELD_OPTION]) {
            deps.push({
                name: options[START_DATE_FIELD_OPTION],
                type,
                readonly: false,
                ...attrs,
            });
            if (options[END_DATE_FIELD_OPTION]) {
                console.warn(
                    `A field cannot have both ${START_DATE_FIELD_OPTION} and ${END_DATE_FIELD_OPTION} options at the same time`
                );
            }
        } else if (options[END_DATE_FIELD_OPTION]) {
            deps.push({
                name: options[END_DATE_FIELD_OPTION],
                type,
                readonly: false,
                ...attrs,
            });
        }
        return deps;
    },
};

export const dateTimeField = {
    ...dateField,
    displayName: _t("Date & Time"),
    supportedOptions: [
        ...dateField.supportedOptions,
        {
            label: _t("Time interval"),
            name: "rounding",
            type: "number",
            default: 5,
            help: _t(`Control the number of minutes in the time selection. E.g. set it to 15 to work in quarters.`),
        },
        {
            label: _t("Show seconds"),
            name: "show_seconds",
            type: "boolean",
            default: true,
            help: _t(`Displays or hides the seconds in the datetime value.`),
        },
        {
            label: _t("Show time"),
            name: "show_time",
            type: "boolean",
            default: true,
            help: _t(`Displays or hides the time in the datetime value.`),
        },
    ],
    extractProps: ({ attrs, options }, dynamicInfo) => ({
        ...dateField.extractProps({ attrs, options }, dynamicInfo),
        showSeconds: exprToBoolean(options.show_seconds ?? true),
        showTime: exprToBoolean(options.show_time ?? true),
    }),
    supportedTypes: ["datetime"],
};

export const dateRangeField = {
    ...dateTimeField,
    displayName: _t("Date Range"),
    supportedOptions: [
        ...dateTimeField.supportedOptions,
        {
            label: _t("Start date field"),
            name: START_DATE_FIELD_OPTION,
            type: "field",
            availableTypes: ["date", "datetime"],
        },
        {
            label: _t("End date field"),
            name: END_DATE_FIELD_OPTION,
            type: "field",
            availableTypes: ["date", "datetime"],
        },
        {
            label: _t("Always range"),
            name: "always_range",
            type: "boolean",
            default: false,
            help: _t(`Set to true the full range input has to be display by default, even if empty.`),
        },
    ],
    supportedTypes: ["date", "datetime"],
    listViewWidth: ({ type }) => (type === "datetime" ? 294 : 180),
    isValid: (record, fieldname, fieldInfo) => {
        // Validation logic for ranges
        if (fieldInfo.widget === "daterange") {
            // ... simplified validation
        }
        return !record.isFieldInvalid(fieldname);
    },
};

// Register fields
registry
    .category("fields")
    .add("date", dateField, { force: true })
    .add("daterange", dateRangeField, { force: true })
    .add("datetime", dateTimeField, { force: true });
