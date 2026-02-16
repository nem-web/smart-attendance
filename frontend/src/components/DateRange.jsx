import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateRange = ({ onChange, initialDate }) => {
    const [startDate, setStartDate] = useState(() => initialDate || new Date());

    const handleDateChange = (date) => {
        setStartDate(date);
        if (onChange) {
            onChange(date);
        }
    };

    return (
        <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-semibold text-[var(--text-body)] uppercase tracking-wide">Date range</label>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <DatePicker
                        className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)] outline-none text-[var(--text-main)]"
                        placeholderText="Start date"
                        selected={startDate}
                        onChange={handleDateChange}
                        dateFormat="dd/MM/yyyy"
                        isClearable
                        showPopperArrow={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default DateRange;