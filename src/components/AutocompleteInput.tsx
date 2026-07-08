import React, { useEffect, useId, useRef, useState } from 'react';
import {
  CA_SUGERENCIAS_EMPTY,
  CA_SUGERENCIAS_ITEM,
  CA_SUGERENCIAS_LIST,
  CA_SUGERENCIAS_PANEL,
} from '../constants/cargaArchivosUi';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  loading?: boolean;
  placeholder?: string;
  minChars?: number;
  className?: string;
}

const INPUT_CLASS =
  'sepri-field w-full px-3.5 py-2.5 text-sm text-stone-700 placeholder:text-stone-400';

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  options,
  loading = false,
  placeholder,
  minChars = 2,
  className,
}) => {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const showSuggestions = open && value.trim().length >= minChars && (options.length > 0 || loading);

  useEffect(() => {
    setHighlighted(0);
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => (prev + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => (prev - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' && options[highlighted]) {
      event.preventDefault();
      selectOption(options[highlighted]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={listId}
        aria-autocomplete="list"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={className || INPUT_CLASS}
      />
      {showSuggestions && (
        <div id={listId} className={CA_SUGERENCIAS_PANEL} role="listbox">
          <ul className={CA_SUGERENCIAS_LIST}>
            {loading && options.length === 0 && (
              <li className={CA_SUGERENCIAS_EMPTY}>Buscando…</li>
            )}
            {options.map((option, index) => (
              <li key={`${option}-${index}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlighted}
                  className={`${CA_SUGERENCIAS_ITEM} ${
                    index === highlighted
                      ? '!bg-primary-light/50 !shadow-soft text-[#1565C0] font-medium'
                      : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => selectOption(option)}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
