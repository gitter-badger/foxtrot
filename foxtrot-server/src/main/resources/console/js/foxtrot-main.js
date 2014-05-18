
function TablesView(id, tables) {
	this.id = id;
	this.tables = tables;
	this.tableSelectionChangeHandler = null;
}

TablesView.prototype.load = function(tables) {
	var select = $(this.id);
	select.find('option')
    .remove();
	for (var i = tables.length - 1; i >= 0; i--) {
		select.append("<option value='" + i + "'>" + tables[i].name + '</option>');
	};
	select.val(0);
	select.selectpicker('refresh');
	select.change();
};

TablesView.prototype.registerTableSelectionChangeHandler = function(handler) {
	this.tableSelectionChangeHandler = handler;
};

TablesView.prototype.init = function() {
	this.tables.registerTableChangeHandler($.proxy(this.load, this));
	$(this.id).change($.proxy(function(){
		var value = parseInt($(this.id).val());
		var table = this.tables.tables[value];
		if(table) {
			if(this.tableSelectionChangeHandler) {
				this.tableSelectionChangeHandler(table.name);
			}
			this.tables.loadTableMeta(table.name);
			this.tables.selectedTable = table;
			console.log("Table changed to: " + table.name);
		}
	}, this));
	this.tables.init();
};

function FoxTrot() {
	this.tables = new Tables();
	this.tablesView = new TablesView("#tables", this.tables);
	this.selectedTable = null;
	this.tableSelectionChangeHandlers = [];
	this.queue = new Queue();
	this.tileSet = new TileSet("#tileContainer", tables);
	this.consoleManager = new ConsoleManager(this.tileSet, this.queue, this.tables);
	$("#tileContainer").sortable();
	$("#tileContainer").on("sortstart", function(){
		$(".tile").addClass("tile-drag");
	})

	$("#tileContainer").on("sortstop", function(){
		$(".tile").removeClass("tile-drag");
	})

	$("#tileContainer").disableSelection();
	$("#saveConsole").click($.proxy(this.consoleManager.saveConsole, this.consoleManager));	
}

FoxTrot.prototype.init = function() {
	this.tablesView.registerTableSelectionChangeHandler($.proxy(function(value){
		this.selectedTable = value;
		if(this.tableSelectionChangeHandler && value) {
			for (var i = this.tableSelectionChangeHandlers.length - 1; i >= 0; i--) {
				this.tableSelectionChangeHandlers[i](value);
			};
		}
	}, this));
	this.tablesView.init();
	this.queue.start();
};

FoxTrot.prototype.registerTableSelectionChangeHandler = function(handler) {
	this.tableSelectionChangeHandlers.push(handler);
};

FoxTrot.prototype.addTile = function() {
	var type = $("#widgetType").val();
	var tile = TileFactory.create(type);
	tile.init(guid(), this.queue, this.tables);
	this.tileSet.register(tile);
	$("#addWidgetModal").modal('hide');
	success("<strong>Tile added!!</strong> Click the settings icon on the widget to setup the tile and see your data..");
};

FoxTrot.prototype.saveConsole = function(e) {
	var representation = this.consoleManager.getConsoleRepresentation();
	var modal = $("#saveConsoleModal");
	var name = modal.find(".console-name").val();
	representation['id'] = name.trim().toLowerCase().split(' ').join("_");
	representation['updated'] = new Date().getTime();
	representation['name'] = name;

	console.log(JSON.stringify(representation));
	$.ajax({
		url: hostDetails.url("/foxtrot/v1/consoles"),
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(representation),
		success: function() {
			success("Saved console. The new console can be accessed <a href='?console=" + representation.id + "' class='alert-link'>here</a>");
		},
		error: function() {
			error("Could not save console");
		}
	})
	modal.modal('hide');
	e.preventDefault();
};

FoxTrot.prototype.loadConsole = function(consoleId) {
	$.ajax({
		url: hostDetails.url("/foxtrot/v1/consoles/" + consoleId),
		type: 'GET',
		contentType: 'application/json',
		success: $.proxy(this.consoleManager.buildConsoleFromRepresentation, this.consoleManager),
		error: function() {
			error("Could not save console");
		}
	})	
};

FoxTrot.prototype.loadConsoleList = function() {
	$.ajax({
		url: hostDetails.url("/foxtrot/v1/consoles/"),
		type: 'GET',
		contentType: 'application/json',
		success: function(data){
			for (var i = data.length - 1; i >= 0; i--) {
				var select = $("#select_console_name");
				select.find('option')
			    .remove();
				for (var i = data.length - 1; i >= 0; i--) {
					select.append("<option value='" + data[i].id + "'>" + data[i].name + '</option>');
				};
				select.val(0);
				select.selectpicker('refresh');
				select.change();
			};
		},
		error: function() {
			error("Could not save console");
		}
	})	
};

$(document).ready(function(){
	$(".alert").alert();	
	$("#setupPieChartModal").validator();
	$("#setupBarChartModal").validator();
	$("#setupHistogramForm").validator();
	$("#setupEventBrowser").validator();
	$("#saveConsoleModal").validator();
	$("#loadConsoleModal").validator();
	// $("#histogram_settings_form").bootstrapValidator();
	var foxtrot = new FoxTrot();

	var configSaveform = $("#saveConsoleModal").find("form");
	configSaveform.off('submit');
	configSaveform.on('submit', $.proxy(foxtrot.saveConsole, foxtrot));

	var configLoadform = $("#loadConsoleModal").find("form");
	configLoadform.off('submit');
	configLoadform.on('submit', function(e){
		var console = $("#select_console_name").val();
		if(console) {
			// try {
			// console.log("Going to: " + console);

			// } catch(err) {
			// 	console.error(err);
			// }
			window.location.assign("?console=" + console);
		}
		e.preventDefault();
	});

	$("#addWidgetConfirm").click($.proxy(foxtrot.addTile, foxtrot));
	$("#loadConsoleModal").on('shown.bs.modal', $.proxy(foxtrot.loadConsoleList, foxtrot));
	foxtrot.init();

	//Check if a console is specified.
	//If yes, render the UI accordingly...

	var consoleId = getParameterByName("console").replace('/','');
	if(consoleId) {
		info("Loading console: " + consoleId);
		foxtrot.loadConsole(consoleId);
	}
});

//Initialize libs
$('.selectpicker').selectpicker();