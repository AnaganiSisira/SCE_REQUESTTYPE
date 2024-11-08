/*global QUnit*/

sap.ui.define([
	"requesttype/controller/RequestTypeTable.controller"
], function (Controller) {
	"use strict";

	QUnit.module("RequestTypeTable Controller");

	QUnit.test("I should test the RequestTypeTable controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
