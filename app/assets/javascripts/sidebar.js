Sidebar = window.Sidebar || {};

// Models
Sidebar.AnnotationRows = Backbone.Model.extend({
	defaults: {
		rows: null,
	}
});

// Models
Sidebar.Annotation = Backbone.Model.extend({
	initialize: function (annotationObject) {
		this.set(annotationObject);
	},
	defaults: {
		user: null,
		quote: null,
		text: null,
		id: null,
	}
});

// Collection
Sidebar.RemoteAnnotationList = Backbone.Collection.extend({
	model: Sidebar.Annotation,
    url: 'http://annotations.mit.edu/api/search',
    // url: 'http://localhost:5000/api/search',
	// comparator: function(annotation) {
	// 	try {
	// 		var startOffset = annotation.get("ranges")[0].startOffset;
	// 	}
	// 	catch(e) {
	// 		console.info("startOffset issue." + e.toString());
	// 	}
	// 	finally {
	// 		return startOffset; // change to startOffset
	// 	}
	// },
	initialize: function (options) {
		//console.info(options);
		this.fetch({
			data: options,
			success: this.fetchSuccess,
			error: this.fetchError
		});
		this.deferred = new $.Deferred();
		// this.sort();
	},
    deferred: Function.constructor.prototype,
    fetchSuccess: function (collection, response) {
        collection.deferred.resolve();
    },
    fetchError: function (collection, response) {
        throw new Error("Fetch did not get annotations from the API");
    }
});

Sidebar.LocalAnnotationList = Backbone.Collection.extend({
	model: Sidebar.Annotation,
	// comparator: function(annotation) {
	// 	return annotation.get("ranges")[0].startOffset; // change to startOffset
	// },
	initialize: function (annotations) {
		// this.sort();
	},
});

// Annotation View
Sidebar.AnnotationView = Backbone.View.extend({
	tagName: 'li',
	className: 'annotation-item',
	initialize: function (annotation) {
		this.commenttemplate = $('#comment-template').html();
		this.highlighttemplate = $('#highlight-template').html();
		this.mdconverter = new Showdown.converter();
		this.href="#full"+this.model.get("uuid");
	},
	render: function () {
		$(this.el).find("highlight.comment img").addClass("thumbnail");

		// This annotation contains a comment
		if (this.model.get("text") != "") {
			this.mdConvert();
			$(this.el).html(Mustache.to_html(this.commenttemplate, this.model.toJSON())); // instead of console.info: 
		}

		// This is just a highlight -- no contents
		else {
			$(this.el).html(Mustache.to_html(this.highlighttemplate, this.model.toJSON())); // instead of console.info: 
		}
		$(this.el).find(".details").hide();
	 	$(this.el).find("a").click(function(){
		  window.open(this.href, '_blank');
		  return false;
		});
		return this;
	},
	mdConvert: function () {
		var userComment = this.model.get("text");
		if (userComment != "") {
			this.model.set("text", this.mdconverter.makeHtml(userComment));
		}
		return this;
	}
});

// Annotation List View
Sidebar.AnnotationListView = Backbone.View.extend({
	el: $("div#annotation-well"),
	initialize: function (options) {
		this.template = $('#annotation-template').html();
	},
	render: function () {
		// Clear out existing annotations
		$("ul#annotation-list").find(".annotation-item").remove();

		// Walk throught the list, and render markdown in the user comment first.
		this.collection.each(function(ann) {
			var annView = new Sidebar.AnnotationView({model: ann});
			$("ul#annotation-list").append(annView.render().el);
		});
		// this.collection.sort();

		$("li.annotation-item span").tooltip();

		// Bind some events to links
		$("span.annotator-hl").click(function(event) {
			$("ul#annotation-list li").removeClass('hover');
			$("span.highlightlink").tooltip('hide');
			var str = this.id.toString();
			var parts = str.match(/(hl)(.+)/).slice(1);
			var targetid = "#sb" + parts[1];

			// TODO: deal with the events in a more organized way (recompose them in functions)
			$('div#annotation-well').animate({scrollTop:$(targetid).offset().top}, 100, function (){
				console.info("Scroll to: "+targetid);
				// $(targetid).parent().addClass('hover');
				$(targetid).trigger("click");
				// $(targetid).tooltip('show'); // disappears after 1 sec?
			});
		});

		// Bind some events to links
		$("li.annotation-item").click(function(event){
			var idtarget = $(this).find("span.highlightlink").attr("data-highlight");

			// Hide all details
			$("ul#annotation-list li").removeClass('hover');
			$("#annotation-well ul#annotation-list li").removeClass('focuswhite');

			// Hide all details
			$("ul#annotation-list li .details").hide();

			// Show all comments
			$("ul#annotation-list li .highlightlink.comment, ul#annotation-list li .highlightlink.highlight").show();

			// Hide these comments
			$(this).find(".comment, .highlight").hide();

			// Show these details
			$(this).find(".details").show(200);

			$(this).addClass("focuswhite");

			//$(this).addClass('hover');

			// console.info("ID target attr from list item click function: "+idtarget);
			$("span.highlightlink").tooltip('hide');
			
			// $(this).removeClass('hover');

			// console.info("This offset top "+$(this).offset().top);
			// console.info("IdTarget offset top "+$(idtarget).offset().top);
			$('html,body').animate({scrollTop: $(idtarget).offset().top - 150}, 500);
			$(".icon-comment").remove();
			$(idtarget).prepend('<i class="icon-comment"></i>');
			// event.stopPropagation();
		});
	}
});

// Application
Sidebar.App = Backbone.Router.extend({
	// Not currently being invoked.
	routes: {
		'list':  'listAnnotations', 
		'update':  'updateAnnotations'
	},
	// takes an array of existing annotation object literals.
	listAnnotations: function (annotationArray) {
		Sidebar.annotations = new Sidebar.LocalAnnotationList(annotationArray);
		var annotationsList = new Sidebar.AnnotationListView({
			"container": $('#annotation-well'),
			"collection": Sidebar.annotations
		});
		annotationsList.render();
		// console.info("Local: "+ Sidebar.annotations.toJSON());
	},
	// takes an object literal of options for an XHR request.
	updateAnnotations: function (options) {
		Sidebar.annotations = new Sidebar.RemoteAnnotationList(options);
		var annotationsList = new Sidebar.AnnotationListView({
			"container": $('#annotation-well'),
			"collection": Sidebar.annotations
		});
		Sidebar.annotations.deferred.done(function () {
			annotationsList.render();
			// console.info("Remote: "+ Sidebar.annotations.toJSON());
		});
	},
});
