import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CardCategory } from '@/hooks/useCollection';

interface SetCombobox {
  sets: any[];
  game: CardCategory;
  value: string; // 'all' | set id/code
  onChange: (next: string) => void;
}

interface NormalizedSet {
  value: string;
  name: string;
  code: string | null; // ptcgo / scryfall code shown next to name and used for filtering
  symbol: string | null;
  series: string | null;
}

function normalizeSets(sets: any[], game: CardCategory): NormalizedSet[] {
  return sets.map((set) => {
    if (game === 'pokemon') {
      return {
        value: set.id,
        name: set.name,
        code: set.ptcgoCode ?? set.id ?? null,
        symbol: set.images?.symbol ?? null,
        series: set.series ?? null,
      };
    }
    // mtg / scryfall
    return {
      value: set.code,
      name: set.name,
      code: set.code ? String(set.code).toUpperCase() : null,
      symbol: set.code ? `https://svgs.scryfall.io/sets/${set.code}.svg` : null,
      series: set.set_type ?? null,
    };
  });
}

export function SetCombobox({ sets, game, value, onChange }: SetCombobox) {
  const [open, setOpen] = useState(false);

  const normalized = useMemo(() => normalizeSets(sets, game), [sets, game]);
  const selected = normalized.find((s) => s.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by set"
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected?.symbol && (
              <img
                src={selected.symbol}
                alt=""
                referrerPolicy="no-referrer"
                className="h-4 w-4 object-contain shrink-0"
              />
            )}
            <span className="truncate">
              {value === 'all' || !selected ? 'All Sets' : selected.name}
            </span>
            {selected?.code && value !== 'all' && (
              <span className="text-xs text-muted-foreground shrink-0">{selected.code}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command
          // Build a rich keyword string so users can match on name, set code, or series.
          filter={(itemValue, search) => {
            const haystack = itemValue.toLowerCase();
            const needle = search.toLowerCase().trim();
            if (!needle) return 1;
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search by name or set code…" />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-1 py-3 text-sm text-muted-foreground">
                <Search className="h-4 w-4 opacity-60" />
                No sets match that search.
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all sets"
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === 'all' ? 'opacity-100' : 'opacity-0',
                  )}
                />
                All Sets
              </CommandItem>
              {normalized.map((set) => {
                // cmdk filters on the `value` prop — pack searchable text into it.
                const searchValue = [set.name, set.code, set.series, set.value]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();
                return (
                  <CommandItem
                    key={set.value}
                    value={searchValue}
                    onSelect={() => {
                      onChange(set.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === set.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {set.symbol && (
                      <img
                        src={set.symbol}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="mr-2 h-4 w-4 object-contain shrink-0"
                      />
                    )}
                    <span className="truncate">{set.name}</span>
                    {set.code && (
                      <span className="ml-auto pl-2 text-xs text-muted-foreground shrink-0">
                        {set.code}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
