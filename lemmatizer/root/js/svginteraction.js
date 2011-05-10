function svgLoaded() {
  $('.node').dblclick( function(evt) {
    node_target = $(evt.target);
    node_id = node_target.siblings('title').text();
    change_node_state(node_id);
  }).children('ellipse').each( function() {
    $(this).attr( {stroke:'black', fill:'#fff'} );
  });
  change_node_state( null, add_node_objs );
  $('#log').ajaxError(function() {
    $(this).text( 'Oops.. something went wrong with trying to save this change. Please try again...' );
  });
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
        // Apparently the svg is not fully part of the DOM in every sense in FF3?
        // Maybe using JQuery::SVG would offer solutions in svg.style etc. but it seems overkill tbh
        node_ellipse.attr( {stroke:'green', fill:'#b3f36d'} );
        if( node_ellipse.data( 'node_obj' ) ) { node_ellipse.data( 'node_obj' ).draggable( false ) };
        $('#constructedtext').append( node_text + '&#32;' );
      } else {
        node_ellipse.attr( {stroke:'black', fill:'#fff'} );
        if( node_ellipse.data( 'node_obj' ) ) { node_ellipse.data( 'node_obj' ).draggable( true ) };
        if( state == null ) {
          $('#constructedtext').append( ' &hellip; ' );
        }
      }
    });
    if( callback ) { callback() };
  });
}

function add_node_objs() {
  $('ellipse[fill="#fff"]').each( function() {
      $(this).data( 'node_obj', new node_obj( $(this) ) );
    }
  );
}

function node_obj(ellipse) {
  this.ellipse = ellipse;
  var self = this;
  
  this.x = 0;
  this.y = 0;
  this.dx = 0;
  this.dy = 0;
  this.node_elements = node_elements_for(self.ellipse);

  this.mousedown_listener = function(evt) {
    evt.stopPropagation();
    self.x = evt.clientX;
    self.y = evt.clientY;
    $('body').mousemove( self.mousemove_listener );
    $('body').mouseup( self.mouseup_listener );
    self.ellipse.unbind('mouseenter').unbind('mouseleave')
    self.ellipse.attr( 'fill', '#ff66ff' );
  }

  this.mousemove_listener = function(evt) {
    self.dx = evt.clientX - self.x;
    self.dy = evt.clientY - self.y;
    self.move_elements();
  }

  this.mouseup_listener = function(evt) {
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr( 'fill', '#fff' );
    self.ellipse.hover( self.enter_node, self.leave_node );
    self.reset_elements();
  }

  this.enter_node = function(evt) {
    self.ellipse.attr( 'fill', '#ffccff' )
  }

  this.leave_node = function(evt) {
    self.ellipse.attr( 'fill', '#fff' );
  }

  this.move_elements = function() {
    $.each( self.node_elements, function(index, value) {
      value.move(self.dx,self.dy);
    });
  }

  this.reset_elements = function() {
    $.each( self.node_elements, function(index, value) {
      value.reset();
    });
  }

  this.draggable = function( draggable ) {
    if( draggable ) {
      this.ellipse.mousedown( this.mousedown_listener );
      this.ellipse.hover( this.enter_node, this.leave_node );  
    } else {
      this.ellipse.unbind('mouseenter').unbind('mouseleave').unbind('mousedown');
    }
  }

  self.draggable( true );
}

function svgshape( shape_element ) {
  this.shape = shape_element;
  this.move = function(dx,dy) {
    this.shape.attr( "transform", "translate(" + dx + " " + dy + ")" );
  }
  this.reset = function() {
    this.shape.attr( "transform", "translate( 0, 0 )" );
  }
}

function svgpath( path_element ) {
  this.path = path_element;
  this.x = this.path.x;
  this.y = this.path.y;
  this.move = function(dx,dy) {
    this.path.x = this.x + dx;
    this.path.y = this.y + dy;
  }
  this.reset = function() {
    this.path.x = this.x;
    this.path.y = this.y;
  }
}

function node_elements_for( ellipse ) {
  node_elements = get_edge_elements_for( ellipse );
  node_elements.push( new svgshape( ellipse.siblings('text') ) );
  node_elements.push( new svgshape( ellipse ) );
  return node_elements;
}

function get_edge_elements_for( ellipse ) {
  edge_elements = new Array();
  node_id = ellipse.siblings('title').text();
  edge_in_pattern = new RegExp( node_id + '$' );
  edge_out_pattern = new RegExp( '^' + node_id );
  $.each( $('.edge').children('title'), function(index) {
    title = $(this).text();
    if( edge_in_pattern.test(title) ) {
      edge_elements.push( new svgshape( $(this).siblings('polygon') ) );
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(path_segments.numberOfItems - 1) ) );
    }
    if( edge_out_pattern.test(title) ) {
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(0) ) );
    }
  });
  return edge_elements;
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
    if ($(this).data('down') == true ) {
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
