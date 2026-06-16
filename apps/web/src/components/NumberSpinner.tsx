import * as React from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import OutlinedInput from "@mui/material/OutlinedInput";

export default function NumberSpinner({
  id: idProp,
  label,
  error,
  size = "medium",
  ...other
}: BaseNumberField.Root.Props & {
  label?: React.ReactNode;
  size?: "small" | "medium";
  error?: boolean;
}) {
  let id = React.useId();
  if (idProp) {
    id = idProp;
  }
  return (
    <BaseNumberField.Root
      {...other}
      render={(props, state) => (
        <FormControl
          size={size}
          ref={props.ref}
          disabled={state.disabled}
          required={state.required}
          error={error}
          variant="outlined"
          sx={{
            "& .MuiButton-root": {
              borderColor: "divider",
              minWidth: size === "small" ? 36 : 42,
              px: 0,
              bgcolor: "rgba(15, 74, 134, 0.08)",
              "&:not(.Mui-disabled)": {
                color: "primary.main",
              },
              "&:hover": {
                bgcolor: "rgba(15, 74, 134, 0.16)",
                borderColor: "rgba(15, 74, 134, 0.35)",
              },
            },
          }}
        >
          {props.children}
        </FormControl>
      )}
    >
      <BaseNumberField.ScrubArea
        render={
          <Box
            component="span"
            sx={{ userSelect: "none", width: "max-content" }}
          />
        }
      >
        <FormLabel
          htmlFor={id}
          sx={{
            display: "inline-block",
            cursor: "ew-resize",
            fontSize: "0.875rem",
            color: "text.primary",
            fontWeight: 500,
            lineHeight: 1.5,
            mb: 0.5,
          }}
        >
          {label}
        </FormLabel>
        <BaseNumberField.ScrubAreaCursor>
          <Box
            component="span"
            sx={{ fontSize: "0.78rem", color: "text.secondary", transform: "translateY(1px)" }}
          >
            ↔
          </Box>
        </BaseNumberField.ScrubAreaCursor>
      </BaseNumberField.ScrubArea>
      <Box sx={{ display: "flex" }}>
        <BaseNumberField.Decrement
          render={
            <Button
              variant="outlined"
              aria-label="Decrease"
              size={size}
              sx={{
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderRight: "0px",
                fontWeight: 700,
                "&.Mui-disabled": {
                  borderRight: "0px",
                },
              }}
            />
          }
        >
          -
        </BaseNumberField.Decrement>

        <BaseNumberField.Input
          id={id}
          render={(props, state) => (
            <OutlinedInput
              inputRef={props.ref}
              value={state.inputValue}
              onBlur={props.onBlur}
              onChange={props.onChange}
              onKeyUp={props.onKeyUp}
              onKeyDown={props.onKeyDown}
              onFocus={props.onFocus}
              slotProps={{
                input: {
                  ...props,
                  size:
                    Math.max(
                      (other.min?.toString() || "").length,
                      state.inputValue.length || 1,
                    ) + 1,
                  sx: {
                    textAlign: "center",
                  },
                },
              }}
              sx={{ pr: 0, borderRadius: 0, flex: 1 }}
            />
          )}
        />

        <BaseNumberField.Increment
          render={
            <Button
              variant="outlined"
              aria-label="Increase"
              size={size}
              sx={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: "0px",
                fontWeight: 700,
                "&.Mui-disabled": {
                  borderLeft: "0px",
                },
              }}
            />
          }
        >
          +
        </BaseNumberField.Increment>
      </Box>
    </BaseNumberField.Root>
  );
}
