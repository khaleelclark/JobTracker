"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from "@mui/material";

interface SkillsInventoryFiltersProps {
  query: string;
  category: string;
  categoryOptions: string[];
}

const APP_BUTTON_SX = {
  fontFamily: "var(--font-body)",
  textTransform: "none",
  fontWeight: 400,
  lineHeight: 1.2,
  border: "1px solid rgba(15, 74, 134, 0.25)",
  background: "linear-gradient(145deg, #ffffff 0%, #e5efff 100%)",
  color: "var(--brand-strong)",
  borderRadius: "10px",
  padding: "0.43rem 0.75rem",
  minWidth: "auto",
  "&:hover": {
    background: "linear-gradient(145deg, #f7fbff 0%, #dceafe 100%)",
    border: "1px solid rgba(15, 74, 134, 0.25)",
  },
  "&.Mui-disabled": {
    opacity: 0.55,
    color: "var(--brand-strong)",
  },
} as const;

export function SkillsInventoryFilters({ query, category, categoryOptions }: SkillsInventoryFiltersProps) {
  const router = useRouter();
  const [queryValue, setQueryValue] = useState(query);
  const [categoryValue, setCategoryValue] = useState(category);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (queryValue.trim()) {
      params.set("query", queryValue.trim());
    }
    if (categoryValue.trim()) {
      params.set("category", categoryValue.trim());
    }

    const suffix = params.toString();
    router.push(suffix ? `/skills?${suffix}` : "/skills");
  }

  function handleClear() {
    setQueryValue("");
    setCategoryValue("");
    router.push("/skills");
  }

  return (
    <form className="form-grid form-grid-2" onSubmit={handleSubmit}>
      <TextField
        label="Search"
        value={queryValue}
        onChange={(event) => setQueryValue(event.target.value)}
        inputProps={{ maxLength: 120 }}
        placeholder="Skill name or notes"
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
      />

      <FormControl>
        <InputLabel id="skills-filter-category-label">Category</InputLabel>
        <Select
          labelId="skills-filter-category-label"
          value={categoryValue}
          label="Category"
          onChange={(event: SelectChangeEvent<string>) => setCategoryValue(event.target.value)}
          sx={{ borderRadius: "14px" }}
        >
          <MenuItem value="">All categories</MenuItem>
          {categoryOptions.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <div className="form-actions">
        <Button type="submit" sx={APP_BUTTON_SX}>Apply Filters</Button>
        <Button type="button" onClick={handleClear} sx={APP_BUTTON_SX}>Clear</Button>
      </div>
    </form>
  );
}
