window.onresize = resizePanels;

function init() {
   var mssArea = document.getElementById("mssArea");
   var mssPanels = getElementsByClass("mssPanel",mssArea,"div");
   for (i = 0; i < mssPanels.length; i++) {
      var currentPanel = mssPanels[i];
      var witnessMenu = getElementsByClass("witnessMenu",currentPanel,"select")[0];
      var witness = witnessMenu.value;
      changeWitness(witness,currentPanel);
   }
   resizePanels();
}

function getElementsByClass(searchClass,node,tag) {
   var classElements = new Array();
   if ( node == null ) node = document;
   if ( tag == null ) tag = "*";
   var els = node.getElementsByTagName(tag);
   var elsLen = els.length;
   var pattern = new RegExp('(^|\\s)'+searchClass+'(\\s|$)');
   for (var j = 0, k = 0; j < elsLen; j++) {
      if (pattern.test(els[j].className)) {
         classElements[k] = els[j];
         k++;
      }
   }
   return classElements;
}

function resizePanels() {
   var mssArea = document.getElementById("mssArea");
   var panels = getElementsByClass("mssPanel",mssArea,"div");
   var notesPanel = document.getElementById("notesPanel");
   var bibPanel = document.getElementById("bibPanel");
   var critPanel = document.getElementById("critPanel");
   var numPanels = panels.length;
   if (notesPanel.style.display != "none") numPanels++;
 
   if (bibPanel.style.display != "none") numPanels++;
    if (critPanel.style.display != "none") numPanels++;

   var borderWidth = 2;

   // Set a minimum page width equal to the width of the main banner / control bar
   var minPageWidth = document.getElementById("mainBanner").offsetWidth;
            
   // Calculate viewport width
   var pageWidth = windowWidth();
   
   if (pageWidth < minPageWidth) pageWidth = minPageWidth;
   
   // Set a minimum panel width of 300px
   var minPanelWidth = 325 - borderWidth;
   
   // Calculate panel width
   var panelWidth = Math.floor(pageWidth / numPanels);
   if (panelWidth < minPanelWidth) panelWidth = minPanelWidth;
   
   var leftPos = 0;
   if (bibPanel.style.display != "none") {
      bibPanel.style.width = panelWidth + "px";
   }
   if (critPanel.style.display != "none") {
      critPanel.style.width = panelWidth + "px";
   }
   for (l = 0; l < panels.length; l++) {
      panels[l].style.width = panelWidth + "px"; 
   }
   if (notesPanel.style.display != "none") {
      notesPanel.style.width = panelWidth + "px";
   }
   mssArea.style.width = numPanels * (panelWidth + borderWidth) + 5 + "px";
}
function windowWidth() {
   var viewportwidth;
   
   var scrollbarWidth = getScrollerWidth();
   
   
   if (typeof window.innerWidth != 'undefined') {
      // the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
      viewportwidth = window.innerWidth - scrollbarWidth;
   } else if (typeof document.documentElement != 'undefined' && typeof document.documentElement.clientWidth != 'undefined' && document.documentElement.clientWidth != 0) {
      // IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
      viewportwidth = document.documentElement.clientWidth - scrollbarWidth;
   } else {
      // older versions of IE
      viewportwidth = document.getElementsByTagName('body')[0].clientWidth - scrollbarWidth;
   }
   return viewportwidth;
}

function getScrollerWidth() {
   var scr = null;
   var inn = null;
   var wNoScroll = 0;
   var wScroll = 0;
   
   // Outer scrolling div
   scr = document.createElement("div");
   scr.style.position = "absolute";
   scr.style.top = "-1000px";
   scr.style.left = "-1000px";
   scr.style.width = "100px";
   scr.style.height = "50px";
   // Start with no scrollbar
   scr.style.overflow = "hidden";
   
   // Inner content div
   inn = document.createElement("div");
   inn.style.width = "100%";
   inn.style.height = "200px";
   
   // Put the inner div in the scrolling div
   scr.appendChild(inn);
   // Append the scrolling div to the doc
   document.body.appendChild(scr);
   
   // Width of the inner div sans scrollbar
   wNoScroll = inn.offsetWidth;
   // Add the scrollbar
   scr.style.overflow = "auto";
   // Width of the inner div width scrollbar
   wScroll = inn.offsetWidth;
   
   // Remove the scrolling div from the doc
   document.body.removeChild(document.body.lastChild);
   
   // Pixel width of the scroller
   return (wNoScroll - wScroll);
}

function openPanel() {
   var mssArea = document.getElementById("mssArea");
   var manuscriptsDiv = document.getElementById("manuscripts");
   var panelButton = document.getElementById("newPanel");
   var mssPanels = getElementsByClass("mssPanel",mssArea,"div");
   var totalPanels = mssPanels.length;
   if (totalPanels + 1 >= maxPanels) {
      panelButton.disabled = true;
   }
   if (totalPanels >= maxPanels) {
      alert("Sorry, but the number of visible versions may not exceed the total number of available witnesses.");
   } else {
      var witnessIndex = getElementsByClass("witnessMenu",mssPanels[totalPanels - 1],"select")[0].selectedIndex;
      var newPanel = mssPanels[totalPanels - 1].cloneNode(true);
      var newMenu = getElementsByClass("witnessMenu",newPanel,"select")[0];
      var newWitnessIndex = witnessIndex + 1;
      if (newWitnessIndex >= newMenu.length) newWitnessIndex = witnessIndex;
      newMenu.selectedIndex = newWitnessIndex;
      manuscriptsDiv.appendChild(newPanel);
      resizePanels();
      changeWitness(newMenu.value,newPanel);
   }
}
function closePanel(panel) {
   var mssArea = document.getElementById("mssArea");
   var manuscriptsDiv = document.getElementById("manuscripts");
   var mssPanels = getElementsByClass("mssPanel",manuscriptsDiv,"div");
   var panelButton = document.getElementById("newPanel");
   var totalPanels = mssPanels.length;
   if (totalPanels == 1) {
      alert("Sorry, but you cannot close all versions.");
   } else {
      manuscriptsDiv.removeChild(panel);
      resizePanels();
      presentInlineNotes();
      if (panelButton.disabled == true) {
         panelButton.disabled = false;
      }
   }
}




function changeWitness(witness,panel) {
    var lines = getElementsByClass("line",panel,"div");
    var rdgTags = getElementsByClass("reading",panel,"span");
    var rdgGroups = getElementsByClass("rdgGrp",panel,"span");
    var images = getElementsByClass("imageLink",panel,"img");
    var stanzas = getElementsByClass("stanzabreak",panel,"br");
    var pagebreaks = getElementsByClass("pagebreak",panel,"hr");
    var notesPanel = document.getElementById("notesPanel");
    var notes = getElementsByClass("noteContent",notesPanel,"div");
    var matching = witnesses[witness].split(';');

    // Show/hide any reading or lemma tags relevant to chosen witness
    for (m = 0; m < rdgTags.length; m++) {
       rdgTags[m].style.display = "none";
       for (n = 0; n < matching.length; n++) {
          var pattern = new RegExp('(^|\\s)' + matching[n] + '(\\s|$)');
          if (pattern.test(rdgTags[m].className)) {
             rdgTags[m].style.display = "inline";
          }
       }
    }

    // Show/hide any reading group tags relevant to chosen witness
    for (m = 0; m < rdgGroups.length; m++) {
       rdgGroups[m].style.display = "none";
       for (n = 0; n < matching.length; n++) {
          var pattern = new RegExp('(^|\\s)' + matching[n] + '(\\s|$)');
          if (pattern.test(rdgGroups[m].className)) {
             rdgGroups[m].style.display = "inline";
          }
       }
    }

    // Show/hide witness-specific images
    for (p = 0; p < images.length; p++) {
       if (images[p].className != "imageLink") {
          images[p].style.display = "none";
          for (q = 0; q < matching.length; q++) {
             var pattern = new RegExp('(^|\\s)' + matching[q] + '(\\s|$)');
             if (pattern.test(images[p].className)) {
                images[p].style.display = "block";
             }
          }
       }
    }

    for (r = 0; r < stanzas.length; r++) {
       stanzas[r].style.display = "none";
       for (s = 0; s < matching.length; s++) {
          var pattern = new RegExp('(^|\\s)' + matching[s] + '(\\s|$)');
          if (pattern.test(stanzas[r].className)) {
             stanzas[r].style.display = "block";
          }
       }
    }

    for (t = 0; t < pagebreaks.length; t++) {
       pagebreaks[t].style.display = "none";
       for (u = 0; u < matching.length; u++) {
          var pattern = new RegExp('(^|\\s)' + matching[u] + '(\\s|$)');
          if (pattern.test(pagebreaks[t].className)) {
             pagebreaks[t].style.display = "block";
          }
       }
    }

    // Hide lines that have no visible content (which should, therefore, have
    // a display height of zero)
    for (o = 0; o < lines.length; o++) {
       lines[o].style.display = "block";
       if (lines[o].offsetHeight == 0) {
          lines[o].style.display = "none";
       }
    }

    presentInlineNotes();
}


function matchApp(matchClass) {

   var mssArea = document.getElementById("mssArea");
   var matchingApps = getElementsByClass(matchClass,mssArea,"span");
   

   for (p = 0; p < matchingApps.length; p++) {

      var pattern = new RegExp('(^|\\s)highlighted(\\s|$)');
      if (pattern.test(matchingApps[p].className)) {
         matchingApps[p].className = matchingApps[p].className.replace(pattern,"");
      } else {
         matchingApps[p].className = matchingApps[p].className + " highlighted";
      }
   }
}
function matchLine(matchClass) {

   var mssArea = document.getElementById("mssArea");
   var matchingLines = getElementsByClass(matchClass,mssArea,"div");
   for (q = 0; q < matchingLines.length; q++) {
      var pattern = new RegExp('(^|\\s)highlighted(\\s|$)');
      if (pattern.test(matchingLines[q].className)) {
         matchingLines[q].className = matchingLines[q].className.replace(pattern,"");
      } else {
         matchingLines[q].className = matchingLines[q].className + " highlighted";
      }
   }
}
function toggleLineNumbers(state) {
   var mssArea = document.getElementById("mssArea");
   var linenumbers = getElementsByClass("linenumber",mssArea,"div");
   for (r = 0; r < linenumbers.length; r++) {
      if (!state) {
         linenumbers[r].style.visibility = "hidden";
      } else {
         linenumbers[r].style.visibility = "visible";
      }
   }
}
function presentInlineNotes() {
   var mssArea = document.getElementById("mssArea");
   var notesPanel = document.getElementById("notesPanel");
   var noNotes = document.getElementById("noNotesFound");
   var notes = getElementsByClass("noteContent",notesPanel,"div");
   var menus = getElementsByClass("witnessMenu",mssArea,"select");
   for (s = 0; s < notes.length; s++) {
      if (notes[s].className == "noteContent") {
         notes[s].style.display = "block";
      } else {
         notes[s].style.display = "none";
         for (t = 0; t < menus.length; t++) {
            var matching = witnesses[menus[t].value].split(';');
            for (u = 0; u < matching.length; u++) {
               var pattern = new RegExp('(^|\\s)' + matching[u] + '(\\s|$)');
               if (pattern.test(notes[s].className)) {
                  notes[s].style.display = "block";
               }
            }
         }
      }
   }
   var visibleNotes = 0;
   for (u = 0; u < notes.length; u++) {
      if (notes[u].style.display != "none") {
         visibleNotes++;
      }
   }
   if (visibleNotes == 0) noNotes.style.display = "block";
   else noNotes.style.display = "none";            
}

function notesFormat(format) {
   var mssArea = document.getElementById("mssArea");
   var notesPanel = document.getElementById("notesPanel");
   var icons = getElementsByClass("noteicon",mssArea,"span");
   if (format == "popup") {
      notesPanel.style.display = "none";
      for (v = 0; v < icons.length; v++) {
         icons[v].style.display = "inline";
      }
   } else if (format == "inline") {
      for (v = 0; v < icons.length; v++) {
         icons[v].style.display = "none";
      }
      notesPanel.style.display = "block";
   } else {
      notesPanel.style.display = "none";
      for (v = 0; v < icons.length; v++) {
         icons[v].style.display = "none";
      }
   }
   resizePanels();
}
function toggleBiblio() {
   var bibPanel = document.getElementById("bibPanel");
   var bibToggle = document.getElementById("bibToggle");
   if (bibPanel.style.display != "none") {
      bibPanel.style.display = "none";
   } else {
      bibPanel.style.display = "block";
   }
   resizePanels();
}

function toggleCrit() {
   var critPanel = document.getElementById("critPanel");
   var critToggle = document.getElementById("critToggle");
   if (critPanel.style.display != "none") {
      critPanel.style.display = "none";
   } else {
      critPanel.style.display = "block";
   }
   resizePanels();
}


function hideNotesPanel(panel) {
   var notesPanel = document.getElementById("notesPanel");
   var notesMenu = document.getElementById("notesMenu");
   notesPanel.style.display = "none";
   for (i = 0; i < notesMenu.options.length; i++) {
      if (notesMenu.options[i].value == "none") {
         notesMenu.selectedIndex = i;
      }
   }
   resizePanels();
}



/* The following script is slightly modified by Sean Daugherty.
It was originally a seperate file named "dw_tooltip.js" */



/*************************************************************************
 * Copyright 2006, Trustees of Indiana University. All rights reserved. This
 * file is part of the Chymistry of Isaac Newton website,
 * http://www.dlib.indiana.edu/collections/newton
 * External javascript libraries have been included here; see
 * individual copyright information for those libraries below. 
 
 * $Id: dw_tooltip.js,v 1.1.2.6 2006/06/07 15:16:31 tlcamero Exp $
 *************************************************************************/ 

 
/*************************************************************************
 Name: makePanelTop, imgStyleDrag, imgStyleDragEnd
 Desc: These functions are keyed to events handled by the * dom-drag.js
      library, below.  They are called within the showImgPanel function.
*************************************************************************/
      
var panels = [];
  
 /* makePanelTop = function(){
 var start = this.style.zIndex;
 for(i=0;i<panels.length;i++){
   if( panels[i].style.zIndex > start ){
     panels[i].style.zIndex--;
   }
 }
    this.style.zIndex=panels.length - 1;
 } */
  
    pStyleDrag = function() {
        this.style.opacity = '.70';
        this.style.filter = "alpha(opacity=70)";
    }
    pStyleDragEnd = function() {
       this.style.opacity = '1.0'; 
       this.style.filter = "alpha(opacity=100)";
   
    }
    
/*************************************************************************
 Name: hidePanel
 Desc: Closes a panel. 
     
 Params: 
 theInstance - the unique id of the panel to hide (i.e. 70r_screen, 'panel_')
*************************************************************************/
function hidePanel(theInstance) { 
   if (!document.getElementById) {
   return null;
}
       
document.getElementById("panel" + "_" + theInstance).style.visibility = "hidden";
  
}
       
   
 /*************************************************************************
  Name: showPanel
  Desc: Opens a new panel. 
  Params: 
  e           - the event triggering the swap (typically onClick)
  theInstance - the id of the panel to show (i.e. 70r_screen)
  theImgSrc   - relative path to the img (i.e. /collections/newton/img/70r.gif)
  x           - horizontal offset (in pixels) for new panel
  y           - vertical offset (in pixels) for new panel 
 *************************************************************************/
   
   
function showPanel(e, theInstance, x, y) {
    var offx = (x)? x - 0 : 20;
    var offy= (y)? y - 0 : 20;
      var theHandle = document.getElementById("handle" + "_" + theInstance);
     var theRoot   = document.getElementById("panel" + "_" + theInstance);
      
    Drag.init(theHandle, theRoot);
    /* theRoot.onDragStart=makePanelTop; */
     theRoot.onDrag=pStyleDrag;
    theRoot.onDragEnd=pStyleDragEnd;
    panels[panels.length]=theRoot;
     /* panels[panels.length-1].style.zIndex = panels.length-1; */
     positionPanel(e,theRoot,offx,offy);
     theRoot.style.visibility = "visible";
   
   }
   
    /*************************************************************************
     Name: showImgPanel
     Desc: Opens a new image panel. Distinct from showPanel in that the
           content is written when the panel is made visible.
     NOTE: probably this should be generalized.
     Params: 
     e           - the event triggering the swap (typically onClick)
     theInstance - the id of the panel to show (i.e. 70r_screen)
     theImgSrc   - relative path to the img (i.e. /collections/newton/img/70r.gif)
     x           - horizontal offset (in pixels) for new panel
     y           - vertical offset (in pixels) for new panel 
     
     Note from Tanya 9.19: If you want the version id name to show up on the image panel change the bottom to this:
     
      theContent.innerHTML = theImg;
     if (theWitness != '') {
        theTitle.innerHTML = "Image Viewer [witness " + theWitness + "]";
     } else {
        theTitle.innerHTML = "Image Viewer";
     }
     theRoot.style.visibility = "visible";
   
   }
    *************************************************************************/
   
   
   function showImgPanel(e, theInstance, theImgSrc, theWitness, x, y) {
   
     var offx = (x)? x-0 : 20;
                var offy =  (y)? y-0: 20;
               var theHandle = document.getElementById("handle" + "_" + theInstance);
     var theRoot   = document.getElementById("panel" + "_" + theInstance);
     var theContent   = document.getElementById("content" + "_" + theInstance);
     var theTitle = document.getElementById("title" + "_" + theInstance);
     
     var theImg = "<img title='Page image' alt='Page image' src='"+ theImgSrc + "'>";
   
      
    Drag.init(theRoot, theRoot);
    /* theRoot.onDragStart=makePanelTop; */
    theRoot.onDrag=pStyleDrag;
    theRoot.onDragEnd=pStyleDragEnd;
     panels[panels.length]=theRoot;
     /* panels[panels.length-1].style.zIndex = panels.length - 1; */
     positionPanel(e,theRoot,offx,offy);
    
     theContent.innerHTML = theImg;
     if (theWitness != '') {
        theTitle.innerHTML = "Image Viewer";
     } else {
        theTitle.innerHTML = "Image Viewer";
     }
     theRoot.style.visibility = "visible";
   
   }
   
    /*************************************************************************
     Name: swapImgPanel
     Desc: Wrapper function, used to bundle operations on the switch between
           panels.
     Params: 
     e           - the event triggering the swap (typically onClick)
     theInstance - the id of the panel to show (i.e. 70r_screen)
     theImgSrc   - relative path to the img (i.e. /collections/newton/img/70r.gif)
     toHide      - the id of the panel to hide (i.e. 72r_screen)
     x           - horizontal offset (in pixels) for new panel
     y           - vertical offset (in pixels) for new panel 
    *************************************************************************/
   
    function swapImgPanel(e, theInstance, theImgSrc, toHide, x, y) {
          
       showImgPanel(e, theInstance,theImgSrc, x,y); 
       hidePanel(toHide);
   }
   
    /*************************************************************************
     Name: positionPanel
     Desc: Uses functions from the dyn-web libraries also in this file to
           position panels.  
     NOTE: This is not working so well in i.e., needs to be refactored.
     
     Params: 
     e           - the event from which the position will be determined (typically onClick)
     o           - the object to position
     offx        - horizontal offset (in pixels) for new panel
     offy        - vertical offset (in pixels) for new panel 
    *************************************************************************/
   
   
function positionPanel(e, o, offX, offY) {
  var x=0, y=0; viewport.getAll();
  x = e.pageX? e.pageX: e.clientX + viewport.scrollX;
  y = e.pageY? e.pageY: e.clientY + viewport.scrollY;
  
  if ( x + o.offsetWidth + offX > viewport.width + viewport.scrollX )
  x = x - o.offsetWidth - offX;
  else x = x + offX;
  
  if ( y + o.offsetHeight + offY > viewport.height + viewport.scrollY )
  y = ( y - o.offsetHeight - offY > viewport.scrollY )? y - o.offsetHeight - offY : viewport.height + viewport.scrollY - o.offsetHeight;
  else y = y + offY;
  
  o.style.left = x + "px"; o.style.top = y + "px";
 
  }

  /*************************************************************************
     Name: toggleDiv
     Desc: This is used to selectively show or hide divs.    
     NOTE: This is tightly coupled to the XTF browse/search results screen
           at the moment - should be generalized.
     
     Params: 
     action      - the action to perform (show | hide)
  *************************************************************************/
function toggleDiv(action) {
 
if (!document.getElementById) {
   return null;
}
   var divs =
   document.getElementsByTagName("div");
   for(var i=0; i < divs.length; i++) {
   var div = divs[i];
   var className = div.className;
   if (className == "longDisp") {
      if (action == "hide") {
         div.style.display = "none";
         changeLink = document.getElementById("dispLink");
         changeLink.innerHTML = "<a href='#' class='button' onClick='toggleDiv(\"show\");'>Long Display</a>";
      } else { // show the div 
         div.style.display = "block";
         changeLink = document.getElementById("dispLink");
         changeLink.innerHTML = "<a href='#' class='button' onClick='toggleDiv(\"hide\");'>Short Display</a>";
        }
      }
 }
} 



/*************************************************************************
This code is from Dynamic Web Coding at dyn-web.com
Copyright 2003-5 by Sharon Paine
See Terms of Use at http://www.dyn-web.com/bus/terms.html
regarding conditions under which you may use this code.
This notice must be retained in the code as is!

NOTE: This library has not been altered internally - tlcamero

*************************************************************************/

function doTooltip(e, msg) {
if ( typeof Tooltip == "undefined" || !Tooltip.ready ) return;
Tooltip.show(e, msg);
}

function hideTip() {
if ( typeof Tooltip == "undefined" || !Tooltip.ready ) return;
Tooltip.hide();
}

/*************************************************************************
  dw_tooltip.js   requires: dw_event.js and dw_viewport.js
  version date: May 21, 2005 moved init call to body onload
  (March 14, 2005: minor changes in position algorithm and timer mechanism)
  
  This code is from Dynamic Web Coding at dyn-web.com
  Copyright 2003-5 by Sharon Paine 
  See Terms of Use at www.dyn-web.com/bus/terms.html
  regarding conditions under which you may use this code.
  This notice must be retained in the code as is!
*************************************************************************/

/*  Readable code available for licensed users */

var Tooltip = {
  followMouse: true,
  offX: 8,
  offY: 12,
  
  ready: false,
  t1: null,
  t2: null,
  tipID: "tipDiv",
  tip: null,
  timerId: 0,
  
  init: function() {
  if ( document.createElement && document.body && typeof document.body.appendChild != "undefined" ) {
  var el = document.createElement("DIV");
  el.className = "tooltip";
  el.id = this.tipID;
  document.body.appendChild(el);
  this.ready = true;
  }
  },
  
  hoverTipInit: function() {
  // adjust horizontal and vertical offsets here
  // (distance from mouseover event which activates tooltip)
  Tooltip.offX = 4;  
  Tooltip.offY = 4;
  tipID = "hoverTipDiv";
  Tooltip.followMouse = false;  // must be turned off for hover-tip
  dw_event.add(window, "unload", Tooltip.unHookHover, true);
  },
  
  hoverTipFinal: function() {
  // adjust horizontal and vertical offsets here
  // (distance from mouseover event which activates tooltip)
  Tooltip.offX = 8;  
  Tooltip.offY = 12;
  tipID = "tipDiv";
  Tooltip.followMouse = true;  // must be turned off for hover-tip
  },
  
  show: function(e, msg) {
  if (this.t1) clearTimeout(this.t1);	
  if (this.t2) clearTimeout(this.t2); 
  this.tip = document.getElementById( this.tipID );
  // set up mousemove 
  if (this.followMouse) 
  dw_event.add( document, "mousemove", this.trackMouse, true );
  this.writeTip("");  // for mac ie
  this.writeTip(msg);
  viewport.getAll();
  this.positionTip(e);
  this.t1 = setTimeout("document.getElementById('" + Tooltip.tipID + "').style.visibility = 'visible'",200);	
  },
  
  writeTip: function(msg) {
  if ( this.tip && typeof this.tip.innerHTML != "undefined" ) this.tip.innerHTML = msg;
  },
  
  positionTip: function(e) {
  var x = e.pageX? e.pageX: e.clientX + viewport.scrollX;
  var y = e.pageY? e.pageY: e.clientY + viewport.scrollY;
  
  if ( x + this.tip.offsetWidth + this.offX > viewport.width + viewport.scrollX )
  x = x - this.tip.offsetWidth - this.offX;
  else x = x + this.offX;
  
  if ( y + this.tip.offsetHeight + this.offY > viewport.height + viewport.scrollY )
  y = ( y - this.tip.offsetHeight - this.offY > viewport.scrollY )? y - this.tip.offsetHeight - this.offY : viewport.height + viewport.scrollY - this.tip.offsetHeight;
  else y = y + this.offY;
  
  this.tip.style.left = x + "px"; this.tip.style.top = y + "px";
  },
  
  hide: function() {
  if (this.t1) clearTimeout(this.t1);	
  if (this.t2) clearTimeout(this.t2); 
  this.t2 = setTimeout("document.getElementById('" + this.tipID + "').style.visibility = 'hidden'",200);
  // release mousemove
  if (this.followMouse) 
  dw_event.remove( document, "mousemove", this.trackMouse, true );
  this.tip = null;
  },
  
  tipOutCheck: function(e) {
  e = dw_event.DOMit(e);
  // is element moused into contained by tooltip?
  var toEl = e.relatedTarget? e.relatedTarget: e.toElement;
  if ( this != toEl && !this.contained(toEl, this) ) this.hide();
  },

  contained: function(oNode, oCont) { // returns true of oNode is contained by oCont (container)
  if (!oNode) return; // in case alt-tab away while hovering (prevent error)
  while ( oNode = oNode.parentNode ) if ( oNode == oCont ) return true;
  return false;
  },
  
  clearTimer: function() {
  if (this.timerId) { clearTimeout(this.timerId); this.timerId = 0; }
  },

  unHookHover: function () {
    var tip = document.getElementById? document.getElementById(this.tipID): null;
    if (tip) {
        tip.onmouseover = null; 
        tip.onmouseout = null;
        tip = null;
    }
  },
  
  trackMouse: function(e) {
  e = dw_event.DOMit(e);
  Tooltip.positionTip(e);	
  }
  
  }

/*************************************************************************
    dw_event.js (version date Feb 2004)
    
    This code is from Dynamic Web Coding at http://www.dyn-web.com/
    See Terms of Use at http://www.dyn-web.com/bus/terms.html
    regarding conditions under which you may use this code.
    This notice must be retained in the code as is!
    *************************************************************************/
    
    var dw_event = {
    
    add: function(obj, etype, fp, cap) {
    cap = cap || false;
    if (obj.addEventListener) obj.addEventListener(etype, fp, cap);
    else if (obj.attachEvent) obj.attachEvent("on" + etype, fp);
    }, 
    
    remove: function(obj, etype, fp, cap) {
    cap = cap || false;
    if (obj.removeEventListener) obj.removeEventListener(etype, fp, cap);
    else if (obj.detachEvent) obj.detachEvent("on" + etype, fp);
    }, 
    
    DOMit: function(e) { 
    e = e? e: window.event;
    e.tgt = e.srcElement? e.srcElement: e.target;
    
    if (!e.preventDefault) e.preventDefault = function () { return false; }
    if (!e.stopPropagation) e.stopPropagation = function () { if (window.event) window.event.cancelBubble = true; }
    
    return e;
    }
    
    }
    
    
    /*************************************************************************
    
    dw_viewport.js
    version date Nov 2003
    
    This code is from Dynamic Web Coding 
    at http://www.dyn-web.com/
    Copyright 2003 by Sharon Paine 
    See Terms of Use at http://www.dyn-web.com/bus/terms.html
    regarding conditions under which you may use this code.
    This notice must be retained in the code as is!
    
    *************************************************************************/  
    
    var viewport = {
    getWinWidth: function () {
    this.width = 0;
    if (window.innerWidth) this.width = window.innerWidth - 18;
    else if (document.documentElement && document.documentElement.clientWidth) 
    this.width = document.documentElement.clientWidth;
    else if (document.body && document.body.clientWidth) 
    this.width = document.body.clientWidth;
    },
    
    getWinHeight: function () {
    this.height = 0;
    if (window.innerHeight) this.height = window.innerHeight - 18;
    else if (document.documentElement && document.documentElement.clientHeight) 
    this.height = document.documentElement.clientHeight;
    else if (document.body && document.body.clientHeight) 
    this.height = document.body.clientHeight;
    },
    
    getScrollX: function () {
    this.scrollX = 0;
    if (typeof window.pageXOffset == "number") this.scrollX = window.pageXOffset;
    else if (document.documentElement && document.documentElement.scrollLeft)
    this.scrollX = document.documentElement.scrollLeft;
    else if (document.body && document.body.scrollLeft) 
    this.scrollX = document.body.scrollLeft; 
    else if (window.scrollX) this.scrollX = window.scrollX;
    },
    
    getScrollY: function () {
    this.scrollY = 0;    
    if (typeof window.pageYOffset == "number") this.scrollY = window.pageYOffset;
    else if (document.documentElement && document.documentElement.scrollTop)
    this.scrollY = document.documentElement.scrollTop;
    else if (document.body && document.body.scrollTop) 
    this.scrollY = document.body.scrollTop; 
    else if (window.scrollY) this.scrollY = window.scrollY;
    },
    
    getAll: function () {
    this.getWinWidth(); this.getWinHeight();
    this.getScrollX();  this.getScrollY();
    }
    
    }
    
 /**************************************************
 * dom-drag.js
 * 09.25.2001
 * www.youngpup.net
 **************************************************
 * This library was borrowed from youngpup.net,
 * it has not been altered internally - tlcamero
 **************************************************/

var Drag = {

   obj : null,

   init : function(o, oRoot, minX, maxX, minY, maxY, bSwapHorzRef, bSwapVertRef, fXMapper, fYMapper)
   {
      o.onmousedown	= Drag.start;

      o.hmode			= bSwapHorzRef ? false : true ;
      o.vmode			= bSwapVertRef ? false : true ;

      o.root = oRoot && oRoot != null ? oRoot : o ;

      if (o.hmode  && isNaN(parseInt(o.root.style.left  ))) o.root.style.left   = "0px";
      if (o.vmode  && isNaN(parseInt(o.root.style.top   ))) o.root.style.top    = "0px";
      if (!o.hmode && isNaN(parseInt(o.root.style.right ))) o.root.style.right  = "0px";
      if (!o.vmode && isNaN(parseInt(o.root.style.bottom))) o.root.style.bottom = "0px";

      o.minX	= typeof minX != 'undefined' ? minX : null;
      o.minY	= typeof minY != 'undefined' ? minY : null;
      o.maxX	= typeof maxX != 'undefined' ? maxX : null;
      o.maxY	= typeof maxY != 'undefined' ? maxY : null;

      o.xMapper = fXMapper ? fXMapper : null;
      o.yMapper = fYMapper ? fYMapper : null;

      o.root.onDragStart	= new Function();
      o.root.onDragEnd	= new Function();
      o.root.onDrag		= new Function();
   },

   start : function(e)
   {
      var o = Drag.obj = this;
      e = Drag.fixE(e);
      var y = parseInt(o.vmode ? o.root.style.top  : o.root.style.bottom);
      var x = parseInt(o.hmode ? o.root.style.left : o.root.style.right );
      o.root.onDragStart(x, y);

      o.lastMouseX	= e.clientX;
      o.lastMouseY	= e.clientY;

      if (o.hmode) {
         if (o.minX != null)	o.minMouseX	= e.clientX - x + o.minX;
         if (o.maxX != null)	o.maxMouseX	= o.minMouseX + o.maxX - o.minX;
      } else {
         if (o.minX != null) o.maxMouseX = -o.minX + e.clientX + x;
         if (o.maxX != null) o.minMouseX = -o.maxX + e.clientX + x;
      }

      if (o.vmode) {
         if (o.minY != null)	o.minMouseY	= e.clientY - y + o.minY;
         if (o.maxY != null)	o.maxMouseY	= o.minMouseY + o.maxY - o.minY;
      } else {
         if (o.minY != null) o.maxMouseY = -o.minY + e.clientY + y;
         if (o.maxY != null) o.minMouseY = -o.maxY + e.clientY + y;
      }

      document.onmousemove	= Drag.drag;
      document.onmouseup		= Drag.end;

      return false;
   },

   drag : function(e)
   {
      e = Drag.fixE(e);
      var o = Drag.obj;

      var ey	= e.clientY;
      var ex	= e.clientX;
      var y = parseInt(o.vmode ? o.root.style.top  : o.root.style.bottom);
      var x = parseInt(o.hmode ? o.root.style.left : o.root.style.right );
      var nx, ny;

      if (o.minX != null) ex = o.hmode ? Math.max(ex, o.minMouseX) : Math.min(ex, o.maxMouseX);
      if (o.maxX != null) ex = o.hmode ? Math.min(ex, o.maxMouseX) : Math.max(ex, o.minMouseX);
      if (o.minY != null) ey = o.vmode ? Math.max(ey, o.minMouseY) : Math.min(ey, o.maxMouseY);
      if (o.maxY != null) ey = o.vmode ? Math.min(ey, o.maxMouseY) : Math.max(ey, o.minMouseY);

      nx = x + ((ex - o.lastMouseX) * (o.hmode ? 1 : -1));
      ny = y + ((ey - o.lastMouseY) * (o.vmode ? 1 : -1));

      if (o.xMapper)		nx = o.xMapper(y)
      else if (o.yMapper)	ny = o.yMapper(x)

      Drag.obj.root.style[o.hmode ? "left" : "right"] = nx + "px";
      Drag.obj.root.style[o.vmode ? "top" : "bottom"] = ny + "px";
      Drag.obj.lastMouseX	= ex;
      Drag.obj.lastMouseY	= ey;

      Drag.obj.root.onDrag(nx, ny);
      return false;
   },

   end : function()
   {
      document.onmousemove = null;
      document.onmouseup   = null;
      Drag.obj.root.onDragEnd(parseInt(Drag.obj.root.style[Drag.obj.hmode ? "left" : "right"]), parseInt(Drag.obj.root.style[Drag.obj.vmode ? "top" : "bottom"]));
      Drag.obj = null;
   },

   fixE : function(e)
   {
      if (typeof e == 'undefined') e = window.event;
      if (typeof e.layerX == 'undefined') e.layerX = e.offsetX;
      if (typeof e.layerY == 'undefined') e.layerY = e.offsetY;
      return e;
   }
};

