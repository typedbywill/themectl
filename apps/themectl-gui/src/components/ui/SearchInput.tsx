import React from "react";
import { FiSearch, FiX } from "react-icons/fi";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className,
  id,
}) => (
  <div className={["form-field-search", className].filter(Boolean).join(" ")}>
    <div className="form-field-search-control">
      <span className="form-field-search-leading" aria-hidden>
        <FiSearch size={16} />
      </span>
      <input
        id={id}
        type="text"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        role="searchbox"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-field-search-input"
      />
      {value ? (
        <button
          type="button"
          className="form-field-search-clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <FiX size={14} />
        </button>
      ) : (
        <span className="form-field-search-clear-placeholder" aria-hidden />
      )}
    </div>
  </div>
);
