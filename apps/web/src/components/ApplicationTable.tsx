"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  GridRowId,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { ApplicationCreateForm } from "@/components/forms/ApplicationCreateForm";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationRow {
  id: string;
  companyName: string;
  roleTitle: string;
  genericStatus: string;
  appliedAt: string;
}

interface ApplicationTableProps {
  applications: ApplicationRow[];
  resumes: Array<{ id: string; name: string }>;
  title?: string;
}

export function ApplicationTable({
  applications,
  resumes,
  title = "Application Records",
}: ApplicationTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const columns = useMemo<GridColDef<ApplicationRow>[]>(
    () => [
      {
        field: "companyName",
        headerName: "Company",
        flex: isMobile ? 1.1 : 1,
        minWidth: isMobile ? 120 : 150,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "roleTitle",
        headerName: "Role",
        flex: isMobile ? 1.6 : 1.1,
        minWidth: isMobile ? 180 : 280,
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<ApplicationRow>) => (
          <Box sx={{ width: "100%", overflow: "hidden" }}>
            <Link
              href={`/applications/${params.row.id}`}
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={params.row.roleTitle}
            >
              {params.row.roleTitle}
            </Link>
          </Box>
        ),
      },
      {
        field: "genericStatus",
        headerName: "Status",
        flex: isMobile ? 1 : 0.8,
        minWidth: isMobile ? 120 : 160,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<ApplicationRow>) => (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span
              className={`pill status-${params.row.genericStatus}`}
              style={{
                lineHeight: 1.2,
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              {toTitleCaseLabel(params.row.genericStatus)}
            </span>
          </Box>
        ),
      },
      {
        field: "appliedAt",
        headerName: "Applied",
        width: isMobile ? 110 : 140,
        headerAlign: "center",
        align: "center",
        valueGetter: (_value, row) =>
          new Date(row.appliedAt).toLocaleDateString(),
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        width: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<ApplicationRow>) => (
          <IconButton
            size={isMobile ? "small" : "medium"}
            aria-label={`Edit application ${params.row.companyName} ${params.row.roleTitle}`}
            title="Edit"
            component={Link}
            href={`/applications/${params.row.id}`}
          >
            <EditIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        ),
      },
    ],
    [isMobile],
  );
  const paginationModel: GridPaginationModel = isMobile
    ? { pageSize: 5, page: 0 }
    : { pageSize: 10, page: 0 };

  function escapeCsvCell(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function handleExportCsv() {
    const header = ["Company", "Role", "Status", "Applied Date"];
    const rows = applications.map(row => [
      row.companyName,
      row.roleTitle,
      toTitleCaseLabel(row.genericStatus),
      new Date(row.appliedAt).toISOString().slice(0, 10),
    ]);

    const csv = [header, ...rows]
      .map(cells => cells.map(cell => escapeCsvCell(String(cell))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (applications.length === 0) {
    return (
      <div className="stack-md">
        <div className="section-head">
          <h2 className="no-margin">{title}</h2>
          <ApplicationCreateForm resumes={resumes} />
        </div>
        <p className="muted">No applications logged yet.</p>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={handleExportCsv} disabled>
            Export Applications
          </Button>
        </Box>
      </div>
    );
  }

  return (
    <div className="stack-md">
      <div className="section-head">
        <h2 className="no-margin">{title}</h2>
        <ApplicationCreateForm resumes={resumes} />
      </div>
      <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
        <DataGrid
          rows={applications}
          columns={columns}
          autoHeight
          getRowId={(row: ApplicationRow): GridRowId => row.id}
          disableRowSelectionOnClick
          disableColumnResize
          columnVisibilityModel={{
            appliedAt: !isMobile,
            companyName: !isMobile || !isTablet,
          }}
          pageSizeOptions={isMobile ? [5, 10, 25] : [10, 25, 50]}
          initialState={{
            pagination: { paginationModel },
          }}
          sx={{
            backgroundColor: "#fff",
            width: "100%",
            maxWidth: "100%",
            "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitleContainer":
              {
                px: isMobile ? 1 : 2,
              },
          }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleExportCsv}>Export Applications</Button>
      </Box>
    </div>
  );
}
