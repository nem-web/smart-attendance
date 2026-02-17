import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateRange = () => {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    return (
        <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-semibold text-[var(--text-body)]/80 uppercase tracking-wide">Date range</label>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <DatePicker
                        className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                        placeholderText="Start date"
                        selected={startDate}
                        onChange={(date) => setStartDate(date)}
                        dateFormat="dd/MM/yyyy"
                        isClearable
                        showPopperArrow={false}
                        value={startDate ? startDate : ''}
                    />
                </div>
                <div className="relative flex-1">
                    <DatePicker
                        className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-main)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                        placeholderText="End date"
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        dateFormat="dd/MM/yyyy"
                        isClearable
                        showPopperArrow={false}
                        value={endDate ? endDate : ''}
                    />
                </div>
            </div>
        </div>
    );
};

export default DateRange;