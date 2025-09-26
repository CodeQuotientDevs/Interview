import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown } from "lucide-react";
import logger from "@/lib/logger";

export type Option = { label: string; value: string };

interface MultiSelectProps {
  placeholder?: string;
  options: Option[];
  defaultSelected?: Option[];
  onChange?: (selected: Option[]) => void;
}

const createNewTag: Option = {
  label: 'Create New Tag',
  value: '#123123123',
}

export default function MultiSelect({
  placeholder = "Select options",
  options,
  defaultSelected = [],
  onChange,
}: MultiSelectProps) {
  const [selected, setSelected] = useState<Option[]>(defaultSelected);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allOptions, setOptions] = useState<Array<Option>>(options);
  const handleChangeRef = React.useRef(onChange);

  const handleToggle = React.useCallback((option: Option) => {
    if (option.value === createNewTag.value) {
      option.label = search;
      option.value = search;
    }
    const isSelected = selected.some(o => o.value === option.value);
    const newSelected = isSelected
      ? selected.filter(o => o.value !== option.value)
      : [...selected, option];
    setSelected(newSelected);
  }, [search, selected])

  React.useEffect(() => {
    setSelected((values) => {
      const result: Array<Option> = [];
      const setInserted = new Set();
      ([...defaultSelected, ...values]).forEach((element) => {
        if (!setInserted.has(element.value)) {
          result.push(element);
          setInserted.add(element.value);
        }
      })
      return result;
    })
  }, [defaultSelected, setSelected]);

  const filteredOptions = React.useMemo(() => {
    const options = allOptions.filter(option =>
      option.label.toLowerCase().includes(search.toLowerCase())
    );
    if (search.length && options.length) {
      options.unshift({
        label: createNewTag.label,
        value: createNewTag.value,
      });
    }
    return options;
  }, [allOptions, search]);

  const createNewOption = React.useCallback((optionToAdd: string) => {
    const newOption = { value: optionToAdd.trim(), label: optionToAdd.trim() };
    setOptions((opts) => [...opts, newOption]);
    setSelected((opts) => [...opts, newOption]);
  }, []);

  React.useEffect(() => {
    handleChangeRef.current?.(selected);
  }, [selected]);

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex flex-wrap items-center gap-2 p-2 h-auto"
            onClick={() => setOpen(!open)}
          >
            <div className="flex flex-wrap gap-2 flex-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selected.map(option => (
                  <Badge key={option.value} className="flex items-center gap-1">
                    {option.label}
                    <Button
                      className="w-fit p-0 m-0 h-[24px]"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggle(option);
                      }}
                    >
                      <X
                        data-stop="true"
                        className="h-4 w-4 cursor-pointer pointer-events-auto"
                      />
                    </Button>

                  </Badge>
                ))
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 pointer-events-none" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0">
          <Command
            filter={(value, search, keywords) => {
              logger.info(value, search, keywords);
              if (search.length && keywords?.length == 0 && value === createNewTag.value) {
                return 1;
              }
              return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput
              placeholder="Search..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filteredOptions.length === 0 && (
                <CommandEmpty>
                  <Button
                    size="sm"
                    onClick={() => {
                      createNewOption(search);
                      setSearch("");
                    }}
                  >
                    Create New Tag
                  </Button>
                </CommandEmpty>
              )}
              <CommandGroup>
                {filteredOptions.map(option => (
                  <CommandItem
                    // className={`${(option.value === createNewTag.value)?'bg-black':''}`}
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      handleToggle(option);
                    }}
                  >
                    {option.label}
                    {selected.some(o => o.value === option.value) && (
                      <X className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {/* <CommandGroup>
                {filteredOptions.map(option => (
                  <>
                    <div>{option.label}</div>
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        handleToggle(option);
                      }}
                    >
                      <div className="bg-red-500">
                        {option.label}
                      </div>
                      {selected.some(o => o.value === option.value) && (
                        <X className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  </>

                ))}
              </CommandGroup> */}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
