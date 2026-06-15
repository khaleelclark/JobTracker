"use client";

export function LocalDate() {
  return (
    <>
      {new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
    </>
  );
}
