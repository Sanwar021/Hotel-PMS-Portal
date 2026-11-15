import React from 'react';
import { ArrowUpDown, Search } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
}

interface SearchSortControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  placeholder: string;
  resultCount?: number;
  compact?: boolean;
}

export const SearchSortControls: React.FC<SearchSortControlsProps> = ({
  search,
  onSearchChange,
  sort,
  onSortChange,
  sortOptions,
  placeholder,
  resultCount,
  compact = false,
}) => (
  <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${compact ? '' : 'border-b border-hotel-line pb-4'}`}>
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hotel-muted" />
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-hotel-line bg-hotel-panel py-2 pl-9 pr-3 text-xs text-hotel-text outline-none transition placeholder:text-hotel-muted focus:border-hotel-accent focus:ring-2 focus:ring-hotel-accent/10"
      />
    </div>
    <div className="flex items-center gap-2">
      <div className="relative min-w-44">
        <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-hotel-muted" />
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label="Sort records"
          className="h-10 w-full appearance-none rounded-lg border border-hotel-line bg-hotel-panel py-2 pl-9 pr-8 text-xs font-medium text-hotel-text outline-none focus:border-hotel-accent"
        >
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      {typeof resultCount === 'number' && <span className="whitespace-nowrap text-[11px] text-hotel-muted">{resultCount} results</span>}
    </div>
  </div>
);
