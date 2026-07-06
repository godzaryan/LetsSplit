'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  sublabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  style = {}
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div
        className="input-field"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '12px 16px', // Matching generic input-field padding
          ...style
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          color="var(--text-muted)"
          style={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 100,
            maxHeight: '250px',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                background: value === option.value ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                borderLeft: value === option.value ? '3px solid var(--accent-primary)' : '3px solid transparent',
              }}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ 
                color: value === option.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontWeight: value === option.value ? 600 : 500,
                fontSize: '14px'
              }}>
                {option.label}
              </span>
              {option.sublabel && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {option.sublabel}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
