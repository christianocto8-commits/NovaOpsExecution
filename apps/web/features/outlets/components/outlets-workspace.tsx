"use client";

import { useMemo, useState } from "react";

import { outlets, OutletRow, OutletStatus } from "../data/outlets-data";
import { StatCard, SectionCard } from "@/shared/ui/cards";
import { DataTable, DataTableColumn, Pagination } from "@/shared/ui/data-display";
import { FilterBar, SearchBar } from "@/shared/ui/filters";
import { Drawer } from "@/shared/ui/overlay";
import { Badge, Button, Divider, Input } from "@/shared/ui/primitives";

function getStatusVariant(status: OutletStatus) {
  if (status === "Online") return "success";
  if (status === "Review") return "warning";
  return "danger";
}

export function OutletsWorkspace() {
  const [search, setSearch] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<OutletRow | null>(null);

  const filteredOutlets = useMemo(() => {
    const keyword = search.toLowerCase();

    return outlets.filter((outlet) => {
      return (
        outlet.name.toLowerCase().includes(keyword) ||
        outlet.area.toLowerCase().includes(keyword) ||
        outlet.manager.toLowerCase().includes(keyword) ||
        outlet.status.toLowerCase().includes(keyword) ||
        outlet.tier.toLowerCase().includes(keyword)
      );
    });
  }, [search]);

  const columns: DataTableColumn<OutletRow>[] = [
    {
      key: "outlet",
      header: "Outlet",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setSelectedOutlet(row)}
          className="text-left"
        >
          <div className="font-semibold text-[#1E1E1E]">{row.name}</div>
          <div className="text-xs text-gray-500">{row.id} • {row.area}</div>
        </button>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      cell: (row) => <Badge variant="primary">{row.tier}</Badge>,
    },
    {
      key: "manager",
      header: "Manager",
      cell: (row) => row.manager,
    },
    {
      key: "compliance",
      header: "Compliance",
      cell: (row) => (
        <span className="font-semibold text-[#274733]">{row.compliance}</span>
      ),
    },
    {
      key: "tasks",
      header: "Open Tasks",
      cell: (row) => row.openTasks,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedOutlet(row)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Outlets"
          value={outlets.length}
          description="Registered operating locations"
          trend="Multi-outlet ready"
        />
        <StatCard
          title="Online"
          value={outlets.filter((outlet) => outlet.status === "Online").length}
          description="Currently operational"
          trend="Healthy"
        />
        <StatCard
          title="Need Review"
          value={outlets.filter((outlet) => outlet.status === "Review").length}
          description="Require operational validation"
          trend="Monitor"
        />
        <StatCard
          title="Average Compliance"
          value="89%"
          description="Across all outlets"
          trend="+3% this week"
        />
      </div>

      <SectionCard
        title="Outlet Network"
        description="Multi-location visibility for status, compliance, manager ownership, and operational workload."
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Import</Button>
            <Button variant="secondary">Export</Button>
            <Button>Add Outlet</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {outlets.map((outlet) => (
              <button
                key={outlet.id}
                type="button"
                onClick={() => setSelectedOutlet(outlet)}
                className="rounded-2xl border border-[#E7ECE9] bg-[#F7FAF8] p-5 text-left transition hover:border-[#C9D8CF] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#1E1E1E]">
                      {outlet.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {outlet.area} • {outlet.tier}
                    </div>
                  </div>

                  <Badge variant={getStatusVariant(outlet.status)}>
                    {outlet.status}
                  </Badge>
                </div>

                <div className="mt-5 text-2xl font-bold text-[#274733]">
                  {outlet.compliance}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Compliance score
                </div>
              </button>
            ))}
          </div>

          <FilterBar>
            <div className="w-full sm:max-w-md">
              <SearchBar
                value={search}
                placeholder="Search outlet, area, manager, status..."
                onChange={setSearch}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSearch("")}>
                Reset
              </Button>
              <Button variant="secondary">Tier Filter</Button>
              <Button variant="secondary">Status Filter</Button>
            </div>
          </FilterBar>

          <DataTable
            columns={columns}
            data={filteredOutlets}
            getRowKey={(row) => row.id}
            emptyTitle="No outlets found"
            emptyDescription="Try changing your search keyword."
          />

          <Pagination page={1} totalPages={1} onPageChange={() => {}} />
        </div>
      </SectionCard>

      <Drawer
        open={Boolean(selectedOutlet)}
        title={selectedOutlet?.name}
        description={selectedOutlet ? `${selectedOutlet.id} • ${selectedOutlet.area}` : undefined}
        onClose={() => setSelectedOutlet(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedOutlet(null)}>
              Close
            </Button>
            <Button>Edit Outlet</Button>
          </div>
        }
      >
        {selectedOutlet ? (
          <div className="space-y-5">
            <div className="flex gap-2">
              <Badge variant={getStatusVariant(selectedOutlet.status)}>
                {selectedOutlet.status}
              </Badge>
              <Badge variant="primary">{selectedOutlet.tier}</Badge>
            </div>

            <Divider />

            <div className="grid gap-4">
              <Input label="Outlet ID" value={selectedOutlet.id} readOnly />
              <Input label="Outlet Name" value={selectedOutlet.name} readOnly />
              <Input label="Area" value={selectedOutlet.area} readOnly />
              <Input label="Manager" value={selectedOutlet.manager} readOnly />
              <Input label="Compliance" value={selectedOutlet.compliance} readOnly />
              <Input label="Open Tasks" value={selectedOutlet.openTasks} readOnly />
              <Input label="Last Audit" value={selectedOutlet.lastAudit} readOnly />
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}