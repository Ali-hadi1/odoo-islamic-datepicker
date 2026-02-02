/** @odoo-module */
import {
    Component,
    onMounted,
    onWillUpdateProps,
    useState,
    useRef,
    onWillUnmount,
} from '@odoo/owl';

export class HijriDatePicker extends Component {
    setup() {
        this.state = useState({
            value: null,
            hijriValue: '',
            isUpdating: false,
            initialized: false,
            lastUpdateCounter: 0,
            lastPropDate: null
        });

        this.pickerInputRef = useRef('pickerInput');
        this.picker = null;
        this.isDestroyed = false;

        onMounted(() => this.onMounted());
        onWillUpdateProps((nextProps) => this.onWillUpdateProps(nextProps));
        onWillUnmount(() => this.onWillUnmount());
    }

    onMounted() {
        if (this.props.onComponentMounted) {
            this.props.onComponentMounted(this);
        }
        this.initializePicker();
    }

    onWillUpdateProps(nextProps) {
        if (this.isDestroyed) return;

        if (nextProps.updateCounter && nextProps.updateCounter !== this.state.lastUpdateCounter) {
            this.state.lastUpdateCounter = nextProps.updateCounter;
            setTimeout(() => {
                if (!this.isDestroyed) {
                    this.updateFromGregorianDate(nextProps.date);
                }
            }, 50);
            return;
        }
        const currentDateStr = this.dateToString(this.props.date);
        const nextDateStr = this.dateToString(nextProps.date);
        const lastPropDateStr = this.dateToString(this.state.lastPropDate);

        if (nextDateStr !== currentDateStr && nextDateStr !== lastPropDateStr && !this.state.isUpdating) {
            this.state.lastPropDate = nextProps.date;
            setTimeout(() => {
                if (!this.isDestroyed) {
                    this.updateFromGregorianDate(nextProps.date);
                }
            }, 50);
        }
    }

    dateToString(date) {
        if (!date || date === false) return 'null';
        try {
            const timestamp = this.extractTimestamp(date);
            return timestamp ? timestamp.toString() : 'null';
        } catch (error) {
            return 'invalid';
        }
    }

    onWillUnmount() {
        this.isDestroyed = true;
        this.destroyPicker();
    }

    initializePicker() {
        const inputElement = this.pickerInputRef.el;
        if (!inputElement) return;

        // Check availability of the plugin
        // The library filename suggests 'hijriDatePicker' or similar. 
        // We need to check what the jQuery plugin is actually registered as.
        // Usually it is .hijriDatePicker() based on the balbarak library.

        if (window.$ && window.$.fn && (window.$.fn.hijriDatePicker || window.$.fn.datetimepicker)) {
            try {
                const format = this.getDateFormat();
                const hijriFormat = this.props.isDateTime
                    ? (this.props.showSeconds ? 'iYYYY/iMM/iDD HH:mm:ss' : 'iYYYY/iMM/iDD HH:mm')
                    : 'iYYYY/iMM/iDD';

                const pickerConfig = {
                    locale: 'ar-sa',
                    format: format,
                    hijriFormat: hijriFormat,
                    dayViewHeaderFormat: 'iMMMM iYYYY',
                    hijri: true,
                    showSwitcher: false, // Reverted to default
                    allowInputToggle: true,
                    useCurrent: false,
                    isRTL: true,
                    keepOpen: false,
                    debug: false,
                    showClear: true,
                    showClose: true,
                    sideBySide: this.props.isDateTime,
                };

                // The plugin might be named datetimepicker if it replaces the standard bootstrap one
                const pluginFunc = window.$.fn.hijriDatePicker || window.$.fn.datetimepicker;
                this.picker = pluginFunc.call(window.$(inputElement), pickerConfig);

                window.$(inputElement).on('dp.change', (e) => {
                    if (e.date) {
                        this.onDateSelect(e.date);
                    } else {
                        this.onDateSelect(null);
                    }
                });

                this.state.initialized = true;
                this.updateFromGregorianDate();

            } catch (error) {
                console.error('Error initializing Hijri datepicker:', error);
                this.initializeFallback();
            }
        } else {
            console.warn('Hijri datepicker library not available, using fallback');
            this.initializeFallback();
        }
    }

    getDateFormat() {
        if (this.props.isDateTime) {
            return this.props.showSeconds ? 'iYYYY/iMM/iDD HH:mm:ss' : 'iYYYY/iMM/iDD HH:mm';
        }
        return 'iYYYY/iMM/iDD';
    }

    onDateSelect(momentDate) {
        if (this.state.isUpdating || this.isDestroyed) return;

        try {
            let gregorianDate = null;
            if (momentDate) {
                const jsDate = momentDate.toDate();
                if (window.luxon && window.luxon.DateTime) {
                    gregorianDate = window.luxon.DateTime.fromJSDate(jsDate);
                } else {
                    gregorianDate = jsDate;
                }
            }

            if (this.props.onHijriDateSelected) {
                this.state.isUpdating = true;
                this.props.onHijriDateSelected(gregorianDate, this.props.fieldIndex || 0);

                setTimeout(() => {
                    if (!this.isDestroyed) {
                        this.state.isUpdating = false;
                    }
                }, 200);
            }
        } catch (error) {
            console.error('Error in onDateSelect:', error);
            this.state.isUpdating = false;
        }
    }

    initializeFallback() {
        const inputElement = this.pickerInputRef.el;
        if (inputElement) {
            inputElement.addEventListener('change', (e) => this.onManualDateChange(e));
            this.updateFromGregorianDate();
        }
    }

    onManualDateChange(event) {
        // Fallback manual change logic
    }

    updateFromGregorianDate(date = null) {
        if (this.isDestroyed || this.state.isUpdating) return;

        const dateToUse = date !== (undefined || null) ? date : this.props.date;

        if (!dateToUse) {
            this.clearDateDisplay();
            return;
        }

        try {
            let mDate;
            if (dateToUse.toJSDate) {
                mDate = moment(dateToUse.toJSDate());
            } else {
                mDate = moment(new Date(dateToUse));
            }

            if (mDate.isValid()) {
                if (this.picker && window.$(this.pickerInputRef.el).data('DateTimePicker')) {
                    window.$(this.pickerInputRef.el).data('DateTimePicker').date(mDate);
                } else {
                    const format = this.getDateFormat();
                    this.pickerInputRef.el.value = mDate.format(format);
                }
            }
        } catch (error) {
            console.error('Error updating Hijri date display:', error);
        }
    }

    extractTimestamp(dateValue) {
        if (!dateValue) return null;
        if (dateValue.toMillis) return dateValue.toMillis();
        if (dateValue instanceof Date) return dateValue.getTime();
        return new Date(dateValue).getTime();
    }

    clearDateDisplay() {
        if (this.pickerInputRef.el) {
            this.pickerInputRef.el.value = '';
            if (window.$(this.pickerInputRef.el).data('DateTimePicker')) {
                window.$(this.pickerInputRef.el).data('DateTimePicker').clear();
            }
        }
    }

    destroyPicker() {
        if (this.pickerInputRef.el && window.$) {
            const $el = window.$(this.pickerInputRef.el);
            if ($el.data('DateTimePicker')) {
                $el.data('DateTimePicker').destroy();
            }
        }
    }

    forceUpdateFromParent() {
        if (!this.state.isUpdating && !this.isDestroyed) {
            setTimeout(() => {
                this.updateFromGregorianDate();
            }, 10);
        }
    }
}

HijriDatePicker.template = 'web_hijri_qamari_date.HijriDatePicker';
HijriDatePicker.props = {
    date: { type: [Object, Boolean], optional: true },
    inputId: { type: String, optional: true },
    placeholder: { type: String, optional: true },
    readonly: { type: Boolean, optional: true },
    fieldIndex: { type: Number, optional: true },
    updateCounter: { type: Number, optional: true },
    isDateTime: { type: Boolean, optional: true },
    showSeconds: { type: Boolean, optional: true },
    onHijriDateSelected: { type: Function, optional: true },
    onComponentMounted: { type: Function, optional: true },
};
