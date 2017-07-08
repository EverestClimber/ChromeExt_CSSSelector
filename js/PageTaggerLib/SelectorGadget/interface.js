// Copyright (c) 2008, 2009 Andrew Cantino
// Copyright (c) 2008, 2009 Kyle Maxwell

function SelectorGadget() {

  this.selected = [];
  this.rejected = [];
  this.special_mode = null;
  this.path_output_field = null;
  this.sg_div = null;
  this.unbound = false;
  this.prediction_helper = new DomPredictionHelper();
  this.restricted_elements = jQuery.map(['html', 'body', 'head', 'base'], function(selector) { return jQuery(selector).get(0) });
}
SelectorGadget.prototype = new Object();

SelectorGadget.prototype.px = function(p) {
  return p + 'px';
};

SelectorGadget.prototype.addHoverEffect = function(element){

    jQuery(element).addClass('sg_hover');

};

SelectorGadget.prototype.removeHoverEffect = function(element){

    jQuery(element).removeClass('sg_hover');

};


SelectorGadget.prototype.sgMouseover = function(e) {
  

  var gadget = e.data.self;
  if (gadget.unbound) return true;
  if (this == document.body || this == document.body.parentNode) return false;
  var self = jQuery(this);
  if (gadget.special_mode != 'd') { // Jump to any the first selected parent of this node.

    gadget.addHoverEffect(this);

  } else {
    if (!jQuery('.sg_selected', this).get(0)) {
      gadget.addHoverEffect(this);
    }
  }
  return false;
};

SelectorGadget.prototype.firstSelectedOrSuggestedParent = function(elem) {
  var orig = elem;
  if (jQuery(elem).hasClass('sg_suggested') || jQuery(elem).hasClass('sg_selected')) return elem
  while (elem.parentNode && (elem = elem.parentNode)) {
    if (jQuery.inArray(elem, this.restricted_elements) == -1)
      if (jQuery(elem).hasClass('sg_suggested') || jQuery(elem).hasClass('sg_selected')) return elem
  }
  return null;
};

SelectorGadget.prototype.sgMouseout = function(e) {
  e.data.self.removeHoverEffect(this);

  if (e.data.self.unbound) return true;
  if (this == document.body || this == document.body.parentNode) return false;

  return false;
};

SelectorGadget.prototype.sgMousedown = function(e) {
  var gadget = e.data.self;
  if (gadget.unbound) return true;
  var elem = this;
  var w_elem = jQuery(elem);

  if (w_elem.hasClass('sg_hover')) {

    elem = elem.target_elem || elem;
    w_elem = jQuery(elem);
  }

  if (elem == document.body || elem == document.body.parentNode) return;
  
  if (gadget.special_mode != 'd') {
    var potential_elem = gadget.firstSelectedOrSuggestedParent(elem);
    if (potential_elem != null && potential_elem != elem) {
      elem = potential_elem;
      w_elem = jQuery(elem);
    }
  } else {
    if (jQuery('.sg_selected', this).get(0)) gadget.blockClicksOn(elem); // Don't allow selection of elements that have a selected child.
  }
  
  if (w_elem.hasClass('sg_selected')) {
    w_elem.removeClass('sg_selected');
    gadget.selected.splice(jQuery.inArray(elem, gadget.selected), 1);
  } else if (w_elem.hasClass("sg_rejected")) {
    w_elem.removeClass('sg_rejected');
    gadget.rejected.splice(jQuery.inArray(elem, gadget.rejected), 1);
  } else if (w_elem.hasClass("sg_suggested")) {
    w_elem.addClass('sg_rejected');
    gadget.rejected.push(elem);
  } else {
    w_elem.addClass('sg_selected');
    gadget.selected.push(elem);
  }

  gadget.clearSuggested()
  var prediction = gadget.prediction_helper.predictCss(gadget.selected, gadget.rejected.concat(gadget.restricted_elements));
  gadget.suggestPredicted(prediction);
  gadget.setPath(prediction);

  gadget.blockClicksOn(elem);

  w_elem.trigger("mouseover.sg", { 'self': gadget }); 

  return false;
};

SelectorGadget.prototype.setupEventHandlers = function() {
  jQuery("*:not(.sg_ignore)").bind("mouseover.sg", { 'self': this }, this.sgMouseover);
  jQuery("*:not(.sg_ignore)").bind("mouseout.sg", { 'self': this }, this.sgMouseout);
  jQuery("*:not(.sg_ignore)").bind("mousedown.sg", { 'self': this }, this.sgMousedown);
  jQuery("html").bind("keydown.sg", { 'self': this }, this.listenForActionKeys);
  jQuery("html").bind("keyup.sg", { 'self': this }, this.clearActionKeys);
};

// Why doesn't this work?
// SelectorGadget.prototype.removeEventHandlers = function() {
//   // For some reason the jQuery unbind isn't working for me.
// 
//   // jQuery("*").unbind("mouseover.sg");//, this.sgMouseover);
//   // jQuery("*").unbind("mouseout.sg");//, this.sgMouseout);
//   // jQuery("*").unbind("click.sg");//, this.sgMousedown);
//   // jQuery("html").unbind("keydown.sg");//, this.listenForActionKeys);
//   // jQuery("html").unbind("keyup.sg");//, this.clearActionKeys);
// };

// The only action key right now is shift, which snaps to any div that has been selected.
SelectorGadget.prototype.listenForActionKeys = function(e) {
  var gadget = e.data.self;
  if (gadget.unbound) return true;
  if (e.keyCode == 16 || e.keyCode == 68) { // shift or d
    gadget.special_mode = 'd';
  }
};

SelectorGadget.prototype.clearActionKeys = function(e) {
  var gadget = e.data.self;
  if (gadget.unbound) return true;
  gadget.special_mode = null;
};

// Block clicks for a moment by covering this element with a div.  Eww?
SelectorGadget.prototype.blockClicksOn = function(elem) {
  var elem = jQuery(elem);
  var p = elem.offset();
  var block = jQuery('<div>').css('position', 'absolute').css('z-index', '9999999').css('width', this.px(elem.outerWidth())).
                                css('height', this.px(elem.outerHeight())).css('top', this.px(p.top)).css('left', this.px(p.left)).
                              css('background-color', '');
  document.body.appendChild(block.get(0));
  setTimeout(function() { block.remove(); }, 400);
  return false;
};

SelectorGadget.prototype.setMode = function(mode) {
  if (mode == 'browse') {
    this.removeEventHandlers();
  } else if (mode == 'interactive') {
    this.setupEventHandlers();
  }
  this.clearSelected();
};

SelectorGadget.prototype.suggestPredicted = function(prediction) {
  if (prediction && prediction != '') {
    var count = 0;
    jQuery(prediction).each(function() {
      count += 1;
      if (!jQuery(this).hasClass('sg_selected') && !jQuery(this).hasClass('sg_ignore') && !jQuery(this).hasClass('sg_rejected')) jQuery(this).addClass('sg_suggested');
    });
    
    if (this.clear_button) {
      if (count > 0) {
        this.clear_button.attr('value', 'Clear (' + count + ')');
      } else {
        this.clear_button.attr('value', 'Clear');
      }
    }
  }
};

SelectorGadget.prototype.setPath = function(prediction) {
  if (prediction && prediction.length > 0)
    this.path_output_field.value = prediction;
  else
    this.path_output_field.value = 'No valid path found.';
};

SelectorGadget.prototype.refreshFromPath = function(e) {
  var self = (e && e.data && e.data.self) || this;
  var path = self.path_output_field.value;
  self.clearSelected();
  self.suggestPredicted(path);
  self.setPath(path);
};

SelectorGadget.prototype.showXPath = function(e) {
  var self = (e && e.data && e.data.self) || this;
  var path = self.path_output_field.value;
  if (path == 'No valid path found.') return;
  prompt("The CSS selector '" + path + "' as an XPath is shown below.  Please report any bugs that you find with this converter.", 
         self.prediction_helper.cssToXPath(path));
};

SelectorGadget.prototype.clearSelected = function(e) {
  var self = (e && e.data && e.data.self) || this;
  self.selected = [];
  self.rejected = [];
  jQuery('.sg_selected').removeClass('sg_selected');
  jQuery('.sg_rejected').removeClass('sg_rejected');
  self.clearSuggested();
};

SelectorGadget.prototype.clearEverything = function(e) {
  var self = (e && e.data && e.data.self) || this;
  self.clearSelected()
  self.resetOutputs()
};

SelectorGadget.prototype.resetOutputs = function() {
  this.setPath();
};

SelectorGadget.prototype.clearSuggested = function() {
  jQuery('.sg_suggested').removeClass('sg_suggested');
  if (this.clear_button) this.clear_button.attr('value', 'Clear');
};

SelectorGadget.prototype.showHelp = function() {
  alert("(Better help coming soon!  Please visit http://selectorgadget.com!  Please report bugs!)\n\nClick on a page element that you would like your selector to match (it will turn green). SelectorGadget will then generate a minimal CSS selector for that element, and will highlight (yellow) everything that is matched by the selector. Now click on a highlighted element to remove it from the selector (red), or click on an unhighlighted element to add it to the selector. Through this process of selection and rejection, SelectorGadget helps you to come up with the perfect CSS selector for your needs.\n\nHolding 'shift' while moving the mouse will let you select elements inside of other selected ones.");
};

SelectorGadget.prototype.makeInterface = function() {
  this.sg_div = jQuery('<div>').attr('id', '_sg_div').addClass('sg_bottom').addClass('sg_ignore');
  var self = this;
  var path = jQuery('<input>').attr('id', '_sg_path_field').addClass('sg_ignore').keydown(function(e) {
    if (e.keyCode == 13) {
      return self.refreshFromPath(e);
    }
  }).focus(function() { jQuery(this).select(); });
  this.sg_div.append(path);
  this.clear_button = jQuery('<input type="button" value="Clear"/>').bind("click", {'self': this}, this.clearEverything).addClass('sg_ignore');
  this.sg_div.append(this.clear_button);
  this.sg_div.append(jQuery('<input type="button" value="Toggle Position"/>').click(function() {
    if (self.sg_div.hasClass('sg_top')) {
      self.sg_div.removeClass('sg_top').addClass('sg_bottom');
    } else {
      self.sg_div.removeClass('sg_bottom').addClass('sg_top');
    }
  }).addClass('sg_ignore'));

  this.sg_div.append(jQuery('<input type="button" value="XPath"/>').bind("click", {'self': this}, this.showXPath).addClass('sg_ignore'));

  this.sg_div.append(jQuery('<input type="button" value="Help"/>').bind("click", {'self': this}, this.showHelp).addClass('sg_ignore'));

  this.sg_div.append(jQuery('<input type="button" value="X"/>').bind("click", {'self': this}, this.unbind).addClass('sg_ignore'));

  // this.sg_div.append( 
  //   jQuery('<span class="sg_ignore sg_option sg_new_line">Show XPath</span>').bind("click", {'self': this}, this.showXPath)
  // );

  jQuery('body').append(this.sg_div);

  this.path_output_field = path.get(0);
};

SelectorGadget.prototype.removeInterface = function(e) {
  this.sg_div.remove();
  this.sg_div = null;

  //this.removeHoverEffect(this);
};

SelectorGadget.prototype.unbind = function(e) {
  var self = (e && e.data && e.data.self) || this;
  self.unbound = true;
  self.removeInterface();
  self.clearSelected();
};

SelectorGadget.prototype.setOutputMode = function(e, output_mode) {
  var self = (e && e.data && e.data.self) || this;
  self.output_mode = (e && e.data && e.data.mode) || output_mode;
  
};

SelectorGadget.prototype.rebind = function() {
  this.unbound = false;
  this.makeInterface();
  this.clearEverything();
};

SelectorGadget.prototype.randBetween = function(a, b) {
  return Math.floor(Math.random() * b) + a;
};

SelectorGadget.prototype.analytics = function() {
  // http://www.vdgraaf.info/google-analytics-without-javascript.html 
  var utmac = 'UA-148948-9';
  var utmhn = encodeURIComponent('www.selectorgadget.com');
  var utmn = this.randBetween(1000000000,9999999999); //random request number
  var cookie = this.randBetween(10000000,99999999); //random cookie number
  var random = this.randBetween(1000000000,2147483647); //number under 2147483647
  var today = Math.round(new Date().getTime()/1000.0);
  var referer = encodeURIComponent(window.location.href); //referer url
  var uservar='-'; //enter your own user defined variable
  var utmp='sg';
  
  var urchinUrl = 'http://www.google-analytics.com/__utm.gif?utmwv=1&utmn=' + utmn + '&utmsr=-&utmsc=-&utmul=-&utmje=0&utmfl=-&utmdt=-&utmhn=' + utmhn + '&utmr=' + referer + '&utmp=' + utmp + '&utmac=' + utmac + '&utmcc=__utma%3D' + cookie + '.' + random + '.' + today + '.' + today + '.' + today + '.2%3B%2B__utmb%3D' + cookie + '%3B%2B__utmc%3D' + cookie + '%3B%2B__utmz%3D' + cookie + '.' + today + '.2.2.utmccn%3D(direct)%7Cutmcsr%3D(direct)%7Cutmcmd%3D(none)%3B%2B__utmv%3D' + cookie + '.' + uservar + '%3B';
  document.body.appendChild(jQuery('<img />').attr('src', urchinUrl).get(0));
};

// And go!
if (typeof(selector_gadget) == 'undefined' || selector_gadget == null) {
  (function() {
    selector_gadget = new SelectorGadget();
    selector_gadget.makeInterface();
    selector_gadget.clearEverything();
    selector_gadget.setMode('interactive');
    selector_gadget.analytics();
  })();
} else if (selector_gadget.unbound) {
  selector_gadget.rebind();
} else {
  selector_gadget.unbind();
}

jQuery('.selector_gadget_loading').remove();