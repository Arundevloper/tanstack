import React, { useMemo, useRef, useState, useEffect } from "react";
import MOCK_DATA from "./MOCK_DATA.json";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSelector, useDispatch } from "react-redux";

import { FaFilter } from "react-icons/fa";
import {
  setColumnFilters,
  setGlobalFilter,
  setSorting,
} from "../store/filterSlice.js";

const VirtualTable = () => {
  const rawData = useMemo(() => MOCK_DATA, []);
  const dispatch = useDispatch();
  const columnFilters = useSelector((state) => state.filters.columnFilters);
  const globalFilter = useSelector((state) => state.filters.globalFilter);
  const sorting = useSelector((state) => state.filters.sorting);
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  const applyFilter = (columnId, selectedOptions) => {
    dispatch(
      setColumnFilters({
        ...columnFilters,
        [columnId]: selectedOptions.length ? selectedOptions : undefined,
      })
    );
  };

  const columns = useMemo(() => {
    const fields = [
      { id: "Unique id", label: "Unique ID" },
      { id: "Name", label: "Name" },
      { id: "District", label: "District" },
      { id: "State", label: "State" },
      { id: "Std Code", label: "Std Code" },
      { id: "Zone", label: "Zone" },
      { id: "extra details", label: "Extra Details" },
    ];

    const selectionColumn = {
      id: "select",
      header: () => {
        const allRowIds = table?.getRowModel().rows.map((row) => row.id) || [];
        const allSelected = allRowIds.every((id) =>
          selectedRowIds.includes(id)
        );
        return (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              const newSelected = e.target.checked ? allRowIds : [];
              setSelectedRowIds(newSelected);
            }}
          />
        );
      },
      cell: ({ row }) => {
        const isSelected = selectedRowIds.includes(row.id);
        return (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              const id = row.id;
              setSelectedRowIds((prev) =>
                e.target.checked ? [...prev, id] : prev.filter((i) => i !== id)
              );
            }}
          />
        );
      },
    };

    const dataColumns = fields.map(({ id, label }) => ({
      accessorKey: id,
      header: (headerContext) => (
        <FilterHeader
          label={label}
          columnId={id}
          data={rawData}
          applyFilter={applyFilter}
          table={headerContext.table}
          columnFilters={columnFilters}
          sorting={sorting}
        />
      ),
      cell: (info) => info.getValue(),
    }));

    return [selectionColumn, ...dataColumns];
  }, [rawData, selectedRowIds, columnFilters]);

  const filteredData = useMemo(() => {
    let data = rawData;

    // Apply column filters
    Object.entries(columnFilters).forEach(([colId, values]) => {
      if (values?.length) {
        data = data.filter((row) => values.includes(row[colId]));
      }
    });

    // Apply global filter
    if (globalFilter.trim()) {
      const lower = globalFilter.toLowerCase();
      data = data.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(lower)
        )
      );
    }

    return data;
  }, [rawData, columnFilters, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      dispatch(setSorting(Array.isArray(newSorting) ? newSorting : []));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      return Object.values(row.original).some((value) =>
        String(value).toLowerCase().includes(filterValue.toLowerCase())
      );
    },
  });

  const parentRef = useRef();

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Search across all fields..."
          value={globalFilter}
          onChange={(e) => dispatch(setGlobalFilter(e.target.value))}
          style={{
            width: "100%",
            padding: "8px",
            fontSize: "14px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ display: "flex", fontWeight: "bold", padding: "10px" }}>
        {table.getHeaderGroups()[0].headers.map((header) => (
          <div key={header.id} style={{ flex: 1, paddingRight: "8px" }}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
      </div>

      <div
        ref={parentRef}
        style={{
          height: "500px",
          overflow: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  padding: "10px",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} style={{ flex: 1, paddingRight: "8px" }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FilterHeader = ({
  label,
  columnId,
  data,
  table,
  applyFilter,
  columnFilters,
  sorting,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedValues, setSelectedValues] = useState([]);
  const column = table.getColumn(columnId);
  const currentSort = Array.isArray(sorting ?? [])
    ? (sorting ?? []).find((s) => s.id === columnId)
    : null;

  const isSorted = column.getIsSorted();
  const dropdownRef = useRef();

  // Unique values for the column
  const options = useMemo(() => {
    const unique = [...new Set(data.map((row) => row[columnId]))];
    return unique.filter((val) =>
      String(val).toLowerCase().includes(searchText.toLowerCase())
    );
  }, [data, columnId, searchText]);

  // Handle checkbox change
  const handleCheckboxChange = (value) => {
    let newSelected = [...selectedValues];
    if (newSelected.includes(value)) {
      newSelected = newSelected.filter((v) => v !== value);
    } else {
      newSelected.push(value);
    }
    setSelectedValues(newSelected);
    applyFilter(columnId, newSelected);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedValues(columnFilters[columnId] || []);
  }, [columnFilters, columnId, isOpen]);

  return (
    <div style={{ position: "relative", fontWeight: "bold" }} ref={dropdownRef}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
        }}
      onClick={column.getToggleSortingHandler()}

      >
        <span>
          {label}

          {isSorted === "asc" ? " 🔼" : isSorted === "desc" ? " 🔽" : ""}
        </span>
       

        <FaFilter
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          style={{
            cursor: "pointer",
            color:
              columnFilters && columnFilters[columnId]?.length
                ? "#007bff"
                : isOpen
                ? "#007bff"
                : "#666",
            fontWeight:
              columnFilters && columnFilters[columnId]?.length
                ? "bold"
                : "normal",
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "8px",
            width: "220px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%",
              marginBottom: "8px",
              padding: "4px",
              fontSize: "14px",
            }}
          />
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              marginBottom: "8px",
            }}
          >
            {options.map((val) => (
              <label
                key={val}
                style={{ display: "block", fontWeight: "normal" }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(val)}
                  onChange={() => handleCheckboxChange(val)}
                  style={{ marginRight: "6px" }}
                />
                {val}
              </label>
            ))}
            {options.length === 0 && (
              <div style={{ fontStyle: "italic", color: "#888" }}>No match</div>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedValues([]);
              applyFilter(columnId, []);
            }}
            style={{
              width: "100%",
              padding: "6px",
              fontSize: "14px",
              background: "#f44336",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
};

export default VirtualTable;
