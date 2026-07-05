"use client";

import { Input } from "@/shared/ui/primitives";

type SearchBarProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function SearchBar({ value, placeholder = "Search...", onChange }: SearchBarProps) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
