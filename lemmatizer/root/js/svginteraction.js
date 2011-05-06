function svgLoaded() {
  $('.node').dblclick( function(evt) {
    node_target = $(evt.target);
    node_id = node_target.siblings('title').text();
    change_node_state(node_id);
  }).children('ellipse').attr( {stroke:'black', fill:'#fff'} );
  change_node_state( null, add_draggable );
  $('#log').ajaxError(function() {
    $(this).text( 'Oops.. something went wrong with trying to save this change. Please try again...' );
  });
}

function add_draggable() {
  $('ellipse[fill="#fff"]').mousedown( mousedown_listener );
  $('ellipse[fill="#fff"]').hover( enterdroppable, leavedroppable );
}

function enterdroppable() {
  if( $(this).data( 'dragging' ) != true ){
    $(this).attr( 'fill', '#ffccff' );
  }
}

function leavedroppable() {
  if( $(this).data( 'dragging' ) != true ){
    $(this).attr( 'fill', '#fff' );
  }
}

// We're assuming JSON of the form:
//   { 'node_1': 1, 'node_2': 0, 'node_3': 0, 'node_4': null, 'node_5': 1 }
// with the following heuristics:
//   1 -> turn the associated SVG node on, put in the associate word in the text box.
//   0 -> turn SVG node off.
//   null -> turn node off, put in ellipsis in text box at the corresponding place.

function change_node_state(node_id, callback) {
  var jqjson = $.getJSON( 'nodeclick', 'node_id=' + node_id, function(data) {
    $('#constructedtext').empty();
    $.each( data, function(item, value) {
      node_id = value[0];
      state = value[1];
      current_node = $('.node').children('title').filter( function(index) {
        return $(this).text() == node_id;
      });
      node_text = current_node.siblings('text').text();
      node_ellipse = current_node.siblings('ellipse');
      if( state == 1 ) {
        // node_ellipse.css( 'fill', '#b3f36d' );
        // node_ellipse.css( { 'fill':'#b3f36d', 'stroke':'green' } );
        // node_ellipse.style.fill = 'green';
        // Above solutions don't work with FF3.6 (most do in FF4 btw)
        // Apparently the svg is nor fully part of the DOM in every sense in FF3?
        // Maybe using JQuery::SVG would offer solutions in svg.styl etc. but it seems overkill tbh
        node_ellipse.attr( {stroke:'green', fill:'#b3f36d'} );
        $('#constructedtext').append( node_text + '&#32;' );
      } else {
        node_ellipse.attr( {stroke:'black', fill:'#fff'} );
        if( state == null ) {
          $('#constructedtext').append( ' &hellip; ' );
        }
      }
    });
    if( callback ) { callback() };
  });
}

var orgX,orgY;
var ellipse;

function mousedown_listener(evt) {
  ellipse = $(this);
  ellipse.attr( 'fill', '#ff66ff');
  ellipse.data('dragging', true);
  $('#graph').data('dragging', true);
  orgX = evt.clientX;
  orgY = evt.clientY;
  $('body').mousemove( mousemove_listener );
  $('body').mouseup( mouseup_listener );
}

function mousemove_listener(evt) {
  ellipse.attr("transform","translate("+(evt.clientX - orgX)+" "+(evt.clientY - orgY)+")");
}

function mouseup_listener(evt) {
  $('body').unbind('mousemove');
  $('body').unbind('mouseup');
  ellipse.attr("transform","translate(0 0)");
  ellipse.attr( 'fill', '#fff');
  ellipse.data('dragging', false);
  $('#graph').data('dragging', false);
}


$(document).ready(function () {        
  $('#graph').mousedown(function (event) {
    $(this)
      .data('down', true)
      .data('x', event.clientX)
      .data('scrollLeft', this.scrollLeft);
      return false;
  }).mouseup(function (event) {
    $(this).data('down', false);
  }).mousemove(function (event) {
    if ($(this).data('down') == true && $(this).data('dragging') != true) {
      this.scrollLeft = $(this).data('scrollLeft') + $(this).data('x') - event.clientX;
    }
  }).mousewheel(function (event, delta) {
      this.scrollLeft -= (delta * 30);
  }).css({
    'overflow' : 'hidden',
    'cursor' : '-moz-grab'
  });
});


$(window).mouseout(function (event) {
  if ($('#graph').data('down')) {
    try {
      if (event.originalTarget.nodeName == 'BODY' || event.originalTarget.nodeName == 'HTML') {
        $('#graph').data('down', false);
      }                
    } catch (e) {}
  }
});
