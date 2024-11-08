sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "sap/m/BusyDialog"
],
function (Controller, JSONModel , exportLibrary, Spreadsheet, MessageToast, BusyDialog) {
    "use strict";

    return Controller.extend("requesttype.controller.RequestTypeTable", {

        // Initializes the controller, sets the models, and shows the busy dialog.
        onInit: function () {
            var model = this.getOwnerComponent().getModel("datamodel");
            this.getView().setModel(model, "dataModel");
            console.log(model);

            var oViewModel = new JSONModel({
                isEditMode: false,
                isDeleteMode: false,
                selectedRows: []  // Default mode is non-editable
            });
            this.getView().setModel(oViewModel, "viewModel");

            this._oBusyDialog = new BusyDialog();
        },

        // Opens the "NewRequest" fragment to add a new request type.
        onAdd: function () {
            if (!this.fragment) {
                this.fragment = sap.ui.xmlfragment("requesttype.view.NewRequest", this);
                this.getView().addDependent(this.fragment);
            }
            this.fragment.open();
        },

        // Closes the fragment when the cancel button is pressed and destroys it.
        onCancel: function(oEvent) {
            if (this.fragment) {
                this.fragment.close();
                this.fragment.destroy();
                this.fragment = null;
            }
        },

        // Formats the boolean value to return true or false.
        formatBoolean: function (sValue) {
            return sValue === "true";
        },

        // Handles file upload, reads the file data, and binds it to the model.
        handleUpload: function (oEvent) {
            var that = this;
            var files = oEvent.getParameter("files");
            if (files.length > 0) {
                var reader = new FileReader();

                reader.onload = function (e) {
                    var data = e.target.result;
                    var workbook = XLSX.read(data, { type: "binary" });

                    var tableData = [];
                    workbook.SheetNames.forEach(sheetName => {
                        var xl_row_data = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                        tableData = [...tableData, ...xl_row_data];
                    });

                    var jModel = new JSONModel({ Object: tableData });
                    that.getView().setModel(jModel, "dataModel");
                };

                reader.onerror = function (ex) {
                    console.log(ex);
                };

                reader.readAsBinaryString(files[0]);
            }
        },

        // Exports the table data to an Excel file.
        onExport: function () {
            var oTable = this.byId("reuestTypeTable");
            var oBinding = oTable.getBinding("rows");
            var aTableData = oBinding.getModel().getProperty(oBinding.getPath());

            var aExportData = [];
            aTableData.forEach(function (oData) {
                aExportData.push({
                    "KEY": oData.KEY,
                    "IntakeRequestType": oData.IntakeRequestType,
                    "ACTIVE": oData.ACTIVE,
                    "HelpText": oData.HelpText,
                });
            });

            var aCols = [
                { label: "KEY", property: "KEY" },
                { label: "IntakeRequestType", property: "IntakeRequestType" },
                { label: "ACTIVE", property: "ACTIVE" },
                { label: "HelpText", property: "HelpText" }
            ];

            var oSettings = {
                workbook: { columns: aCols },
                dataSource: aExportData,
                fileName: "ExportedData.xlsx",
                worker: false // Disable worker due to CSP restrictions in some environments
            };

            var oSpreadsheet = new Spreadsheet(oSettings);
            oSpreadsheet.build().finally(function () {
                oSpreadsheet.destroy();
            });
        },

        // Toggles between edit and view mode for the table.
        onEdit: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var bIsEditMode = oViewModel.getProperty("/isEditMode");
            oViewModel.setProperty("/isEditMode", !bIsEditMode);

            if (!bIsEditMode) {
                sap.m.MessageToast.show("Edit mode activated");
            }
        },

        // Closes the fragment when the close button is pressed and destroys it.
        onClose: function(oEvent) {
            if (this.fragment) {
                this.fragment.close();
                this.fragment.destroy();
                this.fragment = null;
            }
        },

        // Submits the form, adds the new request type data to the model, and closes the fragment.
        onSubmit: function () {
            var sIntakeRequestType = sap.ui.getCore().byId("inputIntakeRequestType").getValue();
            var sHelpText = sap.ui.getCore().byId("inputHelpText").getValue();

            var sKey = "KEY_" + new Date().getTime();

            var oModel = this.getView().getModel("dataModel");
            var aData = oModel.getProperty("/Object") || [];

            aData.push({
                KEY: sKey,
                IntakeRequestType: sIntakeRequestType,
                HelpText: sHelpText
            });

            oModel.setProperty("/Object", aData);

            this.onCancel();
        },

        // Saves changes to the data and toggles back to view mode.
        onsave: function () {
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/isEditMode", false);
            sap.m.MessageToast.show("Changes have been saved.");
        },

        // Handles the selection change for table rows and updates the model.
        onSelectionChange: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            var oContext = oSelectedItem.getBindingContext("dataModel");
            var oModel = this.getView().getModel("dataModel");

            var bSelected = oSelectedItem.getSelected();
            oModel.setProperty(oContext.getPath() + "/isSelected", bSelected);
        },

        // Opens the delete confirmation dialog.
        onDeleteRow: function () {
            var oDialog = this.byId("deleteConfirmDialog");
            oDialog.open();
        },

        // Confirms the deletion and removes the selected rows from the model.
        onConfirmDelete: function () {
            var oModel = this.getView().getModel("dataModel");
            var data = oModel.getData();
            var oTable = this.byId("reuestTypeTable");

            var selectedIndices = oTable.getSelectedIndices();

            if (selectedIndices.length === 0) {
                MessageToast.show("No rows selected for deletion.");
                this._closeDeleteDialog();
                return;
            }

            for (var i = selectedIndices.length - 1; i >= 0; i--) {
                var idx = selectedIndices[i];
                data.Object.splice(idx, 1);
            }

            oModel.setData(data);
            MessageToast.show("Selected rows deleted.");
            this._closeDeleteDialog();
        },

        // Cancels the deletion process and closes the confirmation dialog.
        onCancelDelete: function () {
            this._closeDeleteDialog();
        },

        // Helper function to close the delete confirmation dialog.
        _closeDeleteDialog: function () {
            var oDialog = this.byId("deleteConfirmDialog");
            if (oDialog) {
                oDialog.close();
            }
        },

        // Refreshes the data model and rebinds the table.
        onRefresh: function () {
            this._oBusyDialog.open();

            setTimeout(() => {
                var oTable = this.byId("reuestTypeTable");
                var oModel = this.getView().getModel("dataModel");

                oModel.refresh(true);
                oTable.getBinding("rows").refresh();

                this._oBusyDialog.close();
                MessageToast.show("Page has been refreshed!");
            }, 500);
        },

        // Applies custom filters to the table based on selected keys in combo boxes.
        onCustomFieldChange: function() {
            var oTable = this.byId("reuestTypeTable");
            var oBinding = oTable.getBinding("rows");
            var aFilters = [];
            
            var oModel = this.getView().getModel("dataModel");

            var selectedItems = this.getView().byId("customFieldComboBox").getSelectedItems();
            selectedItems.forEach(function(oItem) {
                var key = oItem.getKey();
                var filter = new sap.ui.model.Filter("IntakeRequestType", sap.ui.model.FilterOperator.EQ, key);
                aFilters.push(filter);
            });

            oBinding.filter(aFilters);
        },

        // Toggles the delete mode for the table.
        onDeleteMode: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var bIsDeleteMode = oViewModel.getProperty("/isDeleteMode");
            oViewModel.setProperty("/isDeleteMode", !bIsDeleteMode);

            if (!bIsDeleteMode) {
                sap.m.MessageToast.show("Delete mode activated");
            }
        }
    });
});
