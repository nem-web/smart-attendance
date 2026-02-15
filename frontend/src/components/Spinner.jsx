// components/Spinner.jsx
import React from "react";
import { Loader2 } from "lucide-react";

export default function Spinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
      <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
      <p className="text-[var(--text-body)] text-sm font-medium animate-pulse">
        {message}
      </p>
    </div>
  );
}