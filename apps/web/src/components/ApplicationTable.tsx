"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ApplicationCreateForm } from "@/components/forms/ApplicationCreateForm";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationRow {
  id: string;
  companyName: string;
  roleTitle: string;
  genericStatus: string;
  appliedAt: string;
}

interface ApplicationAutocompleteOptions {
  companies: string[];
  roleTitles: string[];
  careersPageUrls: string[];
  roleFamilies: string[];
  roleLevels: string[];
  compensations: string[];
}

interface ApplicationTableProps {
  applications: ApplicationRow[];
  resumes: Array<{ id: string; name: string }>;
  autocompleteOptions: ApplicationAutocompleteOptions;
  title?: string;
  initialStatusFilter?: string;
}

export function ApplicationTable({
  applications,
  resumes,
  autocompleteOptions,
  title = "Application Records",
  initialStatusFilter,
}: ApplicationTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const [showArchived, setShowArchived] = useState(initialStatusFilter === "archived" || initialStatusFilter === "rejected");

  const hiddenCount = applications.filter((a) => a.genericStatus === "archived" || a.genericStatus === "rejected").length;
  const visibleApplications = showArchived
    ? applications
    : applications.filter((a) => a.genericStatus !== "archived" && a.genericStatus !== "rejected");

  async function handleDuplicate(application: ApplicationRow) {
    const response = await fetch(`/api/applications/${application.id}/duplicate`, {
      method: "POST",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: unknown;
      };
      window.alert(
        typeof body.error === "string"
          ? body.error
          : "Unable to duplicate application",
      );
      return;
    }

    router.refresh();
  }

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
        renderCell: (params: GridRenderCellParams<ApplicationRow>) => {
          const application = params.row;
          return (
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
                className={`pill status-${application.genericStatus}`}
                style={{
                  lineHeight: 1.2,
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {toTitleCaseLabel(application.genericStatus)}
              </span>
            </Box>
          );
        },
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
        width: isMobile ? 112 : 136,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<ApplicationRow>) => {
          const label = `${params.row.companyName} ${params.row.roleTitle}`;
          return (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <IconButton
                size={isMobile ? "small" : "medium"}
                aria-label={`Duplicate application ${label}`}
                title="Duplicate"
                onClick={(e) => { e.stopPropagation(); void handleDuplicate(params.row); }}
                sx={{
                  backgroundColor: "transparent",
                  border: 0,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "transparent" },
                }}
              >
                <ContentCopyIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
              <IconButton
                size={isMobile ? "small" : "medium"}
                aria-label={`Edit application ${label}`}
                title="Edit"
                component={Link}
                href={`/applications/${params.row.id}`}
              >
                <EditIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            </Box>
          );
        },
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
    const rows = visibleApplications.map(row => [
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

  const header = (
    <div className="section-head">
      <h2 className="no-margin">{title}</h2>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {hiddenCount > 0 && (
          <Button size="small" variant="text" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "Hide Archived & Rejected" : `Show Archived & Rejected (${hiddenCount})`}
          </Button>
        )}
        <ApplicationCreateForm
          resumes={resumes}
          autocompleteOptions={autocompleteOptions}
        />
      </Box>
    </div>
  );

  if (visibleApplications.length === 0) {
    return (
      <div className="stack-md">
        {header}
        <p className="muted">{showArchived ? "No applications logged yet." : "No active applications. Use \"Show Archived & Rejected\" to see hidden records."}</p>
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
      {header}
      <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(15, 74, 134, 0.22)", borderRadius: "8px" }}>
        <DataGrid
          rows={visibleApplications}
          columns={columns}
          autoHeight
          getRowId={(row: ApplicationRow): GridRowId => row.id}
          rowHeight={58}
          onRowClick={(params) => router.push(`/applications/${params.row.id}`)}
          disableRowSelectionOnClick
          disableColumnResize
          columnVisibilityModel={{
            appliedAt: !isMobile,
            companyName: !isMobile || !isTablet,
          }}
          pageSizeOptions={isMobile ? [5, 10, 25] : [10, 25, 50]}
          initialState={{
            pagination: { paginationModel },
            filter: initialStatusFilter ? {
              filterModel: {
                items: [{ field: "genericStatus", operator: "equals", value: initialStatusFilter }],
              },
            } : undefined,
          }}
          sx={{
            backgroundColor: "#fff",
            border: "none",
            width: "100%",
            maxWidth: "100%",
            "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller": { backgroundColor: "rgba(15, 74, 134, 0.06)" },
            "--DataGrid-t-color-border-base": "rgba(15, 74, 134, 0.22)",
            "& .MuiDataGrid-footerContainer": { backgroundColor: "rgba(15, 74, 134, 0.04)" },
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitleContainer":
              {
                px: isMobile ? 1 : 2,
              },
            "& .MuiDataGrid-cell[data-field='actions']": {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
