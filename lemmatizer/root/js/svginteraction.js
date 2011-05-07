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
  if( $(this).data( 'dragging' ) != true ) {
    $(this).data( 'fill', $(this).attr('fill') );
    $(this).attr( 'fill', '#ffccff' );
  }
}

function leavedroppable() {
  if( $(this).data( 'dragging' ) != true ) {
    $(this).attr( 'fill', $(this).data('fill') );
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
      node_title = $('.node').children('title').filter( function(index) {
        return $(this).text() == node_id;
      });
      node_text = node_title.siblings('text').text();
      node_ellipse = node_title.siblings('ellipse');
      if( state == 1 ) {
        // node_ellipse.css( 'fill', '#b3f36d' );
        // node_ellipse.css( { 'fill':'#b3f36d', 'stroke':'green' } );
        // node_ellipse.style.fill = 'green';
        // Above solutions don't work with FF3.6 (most do in FF4 btw)
        // Apparently the svg is nor fully part of the DOM in every sense in FF3?
        // Maybe using JQuery::SVG would offer solutions in svg.styl etc. but it seems overkill tbh
        node_ellipse.attr( {stroke:'green', fill:'#b3f36d'} );
        node_ellipse.data( 'fill', '#b3f36d' )
        $('#constructedtext').append( node_text + '&#32;' );
      } else {
        node_ellipse.attr( {stroke:'black', fill:'#fff'} );
        node_ellipse.data( 'fill', '#fff' )
        if( state == null ) {
          $('#constructedtext').append( ' &hellip; ' );
        }
      }
    });
    if( callback ) { callback() };
  });
}

var ellipse,left_path,left_arrow,node_label;
var orgX,orgY;
var left_edge_origin, right_edge_origin;

function mousedown_listener(evt) {
  ellipse = $(this);
  ellipse.data('dragging', true);
  ellipse.attr('fill', '#ff66ff');
  $('#graph').data('dragging', true);
  orgX = evt.clientX;
  orgY = evt.clientY;
  $('body').mousemove( mousemove_listener );
  $('body').mouseup( mouseup_listener );

  node_id = ellipse.siblings('title').text();
  node_label = ellipse.siblings('text')
  left_edge_title = $('.edge').children('title').filter( function(index) {
    title = $(this).text();
    return (new RegExp( node_id + '$' )).test(title);
  });
  left_path = left_edge_title.siblings('path')[0];
  left_arrow = left_edge_title.siblings('polygon');
  left_edge_origin = endpoint( left_path );
  right_edge_title = $('.edge').children('title').filter( function(index) {
    title = $(this).text();
    return (new RegExp( '^' + node_id )).test(title);
  });
  right_edge = right_edge_title.siblings('path')[0];
  right_edge_origin = startpoint( right_edge );
}

function endpoint( path_domobj, x, y ) {
  point = path_domobj.pathSegList.getItem(path_domobj.pathSegList.numberOfItems - 1);
  if( x ) {
    point.x = x;
    point.y = y;
  } else {
    return( { 'x': point.x, 'y': point.y } );
  }
}

function startpoint( path_domobj, x, y ) {
  point = path_domobj.pathSegList.getItem(0);
  if( x ) {
    point.x = x;
    point.y = y;
  } else {
    return( { 'x': point.x, 'y': point.y } );
  }
}

function mousemove_listener(evt) {
  dx = (evt.clientX - orgX);
  dy = (evt.clientY - orgY);
  mousemove_translate( ellipse, dx, dy );
  mousemove_translate( node_label, dx, dy );
  mousemove_translate( left_arrow, dx, dy );
  endpoint( left_path, left_edge_origin.x + dx, left_edge_origin.y + dy);
  startpoint( right_edge, right_edge_origin.x + dx, right_edge_origin.y + dy);
}

function mousemove_translate( jqobj, dx, dy ) {
  jqobj.attr( "transform", "translate(" + dx + " " + dy + ")" );
}

function mouseup_listener(evt) {
  $('body').unbind('mousemove');
  $('body').unbind('mouseup');
  endpoint( left_path, left_edge_origin.x, left_edge_origin.y );
  mousemove_translate( left_arrow, 0, 0 );
  startpoint( right_edge, right_edge_origin.x, right_edge_origin.y );
  mousemove_translate( node_label, 0, 0 );
  mousemove_translate( ellipse, 0, 0 );
  ellipse.attr( 'fill', ellipse.data( 'fill' ) );
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
