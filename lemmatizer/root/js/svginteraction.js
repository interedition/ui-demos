function getRelativePath( action ) {
    path_elements = window.location.pathname.split('/'); 
    if( path_elements[1].length > 0 ) {
        return window.location.pathname.split('/')[1] + '/' + action;
    } else {
        return action;
    }
}

function svgLoaded() {
  // some initial scaling cause we can't control GraphViz's way of scaling
  var svg_element = $('#svgbasics').children('svg');
  var svg_graph = svg_element.svg().svg('get').root()
  svg_width = svg_graph.viewBox.baseVal.width;
  $('#svgbasics').width( svg_width );
  svg_element.width( svg_width );
  //
  $('ellipse').attr( {stroke:'black', fill:'#fff'} );
  $('ellipse[fill="#fff"]').each( function() {
      $(this).data( 'node_obj', new node_obj( $(this) ) );
    }
  );
}

function get_node_obj( node_id ) {
  return $('.node').children('title').filter( function(index) {
    return $(this).text() == node_id;
  }).siblings('ellipse').data( 'node_obj' );
}

function get_edge( edge_id ) {
  return $('.edge').filter( function(index) {
    return $(this).children( 'title' ).text() == $('<div/>').html(edge_id).text() ;
  });
}

function node_obj(ellipse) {
  this.ellipse = ellipse;
  var self = this;
  
  this.x = 0;
  this.y = 0;
  this.dx = 0;
  this.dy = 0;
  this.node_elements = node_elements_for(self.ellipse);
  this.sub_nodes = [];
  this.super_node = null;

  this.get_id = function() {
    return self.ellipse.siblings('title').text()
  }
  
  this.set_draggable = function( draggable ) {
    if( draggable ) {
      self.ellipse.attr( {stroke:'black', fill:'#fff'} );
      self.ellipse.mousedown( this.mousedown_listener );
      self.ellipse.hover( this.enter_node, this.leave_node );  
    } else {
      self.ellipse.unbind('mouseenter').unbind('mouseleave').unbind('mousedown');
      self.ellipse.attr( {stroke:'green', fill:'#b3f36d'} );
    }
  }

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
    if( $('ellipse[fill="#ffccff"]').size() > 0 ) {
      $('#source_node_id').val( self.ellipse.siblings('title').text() );
      $('#target_node_id').val( $('ellipse[fill="#ffccff"]').siblings("title").text() );
      $( '#dialog-form' ).dialog( 'open' );
    };
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr( 'fill', '#fff' );
    self.ellipse.hover( self.enter_node, self.leave_node );
    if( self.super_node ) {
      self.eclipse();
    } else {
      self.reset_elements();
    }
  }

  this.cpos = function() {
    return { x: self.ellipse.attr('cx'), y: self.ellipse.attr('cy') };
  }

  this.get_g = function() {
    return self.ellipse.parent('g');
  }

  this.stack_behind = function( collapse_info ) {
    self.super_node = get_node_obj( collapse_info.target );
    self.super_node.sub_nodes.push( self );
    self.eclipse();
    if( collapse_info.edges ) {
      $.each( collapse_info.edges, function( source_edge_id, target_info ) {
        get_edge(source_edge_id).attr( 'display', 'none' );
        target_edge = get_edge(target_info.target);
        // Unfortunately, the simple solution doesn't work...
        // target_edge.children( 'text' ).replaceWith( '<text x="2270" y="-59.400001525878906"><tspan text-anchor="middle">A, B</tspan><tspan fill="red">, C</tspan></text>' );
        // ..so we take the long and winding road...
        var svg = $('#svgbasics').children('svg').svg().svg('get');
        textx = target_edge.children( 'text' )[0].x.baseVal.getItem(0).value
        texty = target_edge.children( 'text' )[0].y.baseVal.getItem(0).value
        current_label = target_edge.children( 'text' ).text(); 
        target_edge.children( 'text' ).remove();
        texts = svg.createText();
        texts.span(current_label, {'text-anchor': 'middle'}).span(target_info.label, {fill: 'red'});
        svg.text(target_edge, textx, texty, texts);
      }); 
    }
  }

  this.eclipse = function() {
    self.dx = new Number( self.super_node.cpos().x ) - new Number( self.cpos().x ) + ( 10 * (self.super_node.sub_nodes.indexOf(self) + 1) );
    self.dy = new Number( self.super_node.cpos().y ) - new Number( self.cpos().y ) + ( 5 * (self.super_node.sub_nodes.indexOf(self) + 1) );
    self.move_elements();
    eclipse_index = self.super_node.sub_nodes.indexOf(self) - 1;
    if( eclipse_index > -1 ) {
      self.get_g().insertBefore( self.super_node.sub_nodes[eclipse_index].get_g() );
    } else {
      self.get_g().insertBefore( self.super_node.get_g() );
    }
  }

  this.enter_node = function(evt) {
    self.ellipse.attr( 'fill', '#ffccff' );
    reportSomeIntersect(self.get_id);
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

  self.set_draggable( true );
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
  $('#graph').ajaxError(function() {
    console.log( 'Oops.. something went wrong with trying to save this change. Please try again...' );
  });
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
  $( "#dialog-form" ).dialog({
    autoOpen: false,
    height: 150,
    width: 250,
    modal: true,
    buttons: {
      "Ok": function() {
        form_values = $('#collapse_node_form').serialize()
	ncpath = getRelativePath( 'node_collapse' );
        var jqjson = $.getJSON( ncpath, form_values, function(data) {
          $.each( data, function(item, collapse_info) { 
            get_node_obj( item ).stack_behind( collapse_info );
          });
        });
        $( this ).dialog( "close" );
      },
      Cancel: function() {
        $( this ).dialog( "close" );
      }
    },
    close: function() {
      $('#reason').val( "" ).removeClass( "ui-state-error" );
    }
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


// Spiking below

function reportSomeIntersect() {
    console.log( "0" );
    var svgWidth = parseInt( $('#svgbasics').children('svg').svg().svg('get').root().viewBox.baseVal.width );
    toPixelDim = $('#svgbasics').width() / svgWidth;
    console.log( "1" );
    scrollOffset = parseInt( $('#graph').scrollLeft() );
    var xs = '';
    console.log( "2" );
    $('ellipse').each( function( index ) {
        xs = xs + (parseInt( $(this).attr('cx') ) - scrollOffset) + ', ';
    });
    console.log( xs );
    console.log( $('#visor').position.left() );
    //console.log( $('#graph').scrollLeft() );
    // var svg_element = $('#svgbasics').children('svg');
    // var svgroot = svg_element.svg().svg('get').root();
    // var vbParts = svgroot.getAttribute("viewBox").split(" ");
    // var vbxu = parseInt(vbParts[2]);
    // var svgWidth = parseInt( svgroot.viewBox.baseVal.width );
    // console.log( svgWidth );
    // var svgzoomfactor = vbxu / svgWidth;
    // dims = { 'vbxu':vbxu, 'svgWidth':svgWidth, 'svgzoomfactor':svgzoomfactor };

  //console.log(dims);
  // 
  // // For real life the g parent element suffices probably
  // var node_ellipse = $('.node').children('title').filter( function(index) {
  //   return $(this).text() == "n18";
  // }).siblings('ellipse');
  // 
  // var scale = svgroot.currentScale;
  // var vbParts = svgroot.getAttribute("viewBox").split(" ");
  // var vbx = parseInt(vbParts[0]);
  // var vby = parseInt(vbParts[1]);
  // var vbxu = parseInt(vbParts[2]);
  // var vbyu = parseInt(vbParts[3]);
  // 
  // var tx = svgroot.currentTranslate.x;
  // var ty = svgroot.currentTranslate.y;
  // var svgWidth = parseInt( svgroot.viewBox.baseVal.width );
  // var svgHeight = parseInt( svgroot.viewBox.baseVal.height );
  // var svgzoomfactor = vbxu / svgWidth;
  // var vpRect = svgroot.createSVGRect();
  // vpRect.x = parseFloat(vbx + (-tx) * (svgzoomfactor) / scale);
  // vpRect.y = parseFloat(vby + (-ty) * (svgzoomfactor) / scale);
  // vpRect.width = parseFloat(svgWidth * svgzoomfactor / scale);
  // vpRect.height = parseFloat(svgHeight * svgzoomfactor / scale);
  // console.log( vpRect );
  // console.log( svgroot.getEnclosureList );
  // console.log( '++'+svgroot.getEnclosureList(vpRect) );
  //       if (svgroot.checkIntersection(node_ellipse, vpRect)) {
  //   console.log( 'sure it does!' );
  // } else {
  //     console.log( 'duh!' );
  //     
  // }
}
