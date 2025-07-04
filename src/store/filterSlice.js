// store/filterSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  columnFilters: {},
  globalFilter: "",
  sorting: [],
};

const filterSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setColumnFilters: (state, action) => {
      state.columnFilters = action.payload;
    },
    setGlobalFilter: (state, action) => {
      state.globalFilter = action.payload;
    },
    setSorting: (state, action) => {
      state.sorting = Array.isArray(action.payload) ? action.payload : [];
    },
    clearAllFilters: (state) => {
      state.columnFilters = {};
      state.globalFilter = "";
      state.sorting = [];
    },
  },
});

export const {
  setColumnFilters,
  setGlobalFilter,
  setSorting,
  clearAllFilters,
} = filterSlice.actions;

export default filterSlice.reducer;
