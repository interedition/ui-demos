// Stacking
// Dialogue

function getRelativePath( action ) {
    path_elements = window.location.pathname.split('/'); 
    if( path_elements[1].length > 0 ) {
        return window.location.pathname.split('/')[1] + '/' + action;
    } else {
        return action;
    }
}

function svgLoaded() {
  // some initial scaling
  var svg_element = $('#svgbasics').children('svg');
  var svg_graph = svg_element.svg().svg('get').root();
  var svg_vbwidth = svg_graph.viewBox.baseVal.width;
  var svg_vbheight = svg_graph.viewBox.baseVal.height;
  var scroll_padding = $('#graph_container').width();
  // (Use attr('width') to set width attr, otherwise style="width: npx;" is set.)
  var svg_element_width = svg_vbwidth/svg_vbheight * parseInt(svg_element.attr('height'));
  svg_element_width += scroll_padding;
  svg_element.attr( 'width', svg_element_width );
  $('ellipse').attr( {stroke:'black', fill:'#fff'} );
}

function svgEnlargementLoaded() {
  // some initial scaling
  var svg_element = $('#svgenlargement').children('svg');
  var svg_graph = svg_element.svg().svg('get').root()
  var svg_vbwidth = svg_graph.viewBox.baseVal.width;
  var svg_vbheight = svg_graph.viewBox.baseVal.height;
  var scroll_padding = $('#enlargement_container').width();
  // (Use attr('width') to set width attr, otherwise style="width: npx;" is set.)
  var svg_element_width = svg_vbwidth/svg_vbheight * parseInt(svg_element.attr('height'));
  svg_element_width += scroll_padding;
  svg_element.attr( 'width', svg_element_width );
  $('ellipse').attr( {stroke:'black', fill:'#fff'} );
  var svg_height = parseInt( $('#svgenlargement').height() );
  scroll_enlargement_ratio = svg_height/svg_vbheight;
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
    first_node_g_element = $("#svgenlargement g .node" ).filter( ":first" );
    if( first_node_g_element.attr('id') !== self.get_g().attr('id') ) { self.get_g().insertBefore( first_node_g_element ) };
  }

  this.mousemove_listener = function(evt) {
    self.dx = (evt.clientX - self.x) / mousemove_enlargement_ratio;
    self.dy = (evt.clientY - self.y) / mousemove_enlargement_ratio;
    self.move_elements();
  }

  this.mouseup_listener = function(evt) {    
    if( $('ellipse[fill="#ffccff"]').size() > 0 ) {
        $('#source_node_id').val( self.ellipse.siblings('title').text() );
        var target_ellipse = $('ellipse[fill="#ffccff"]');
        $('#target_node_id').val( target_ellipse.siblings("title").text() );
        var svg = $('#svgenlargement').children('svg').svg().svg('get');
        var path = svg.createPath(); 
        var sx = parseInt( self.ellipse.attr('cx') );
        var rx = parseInt( self.ellipse.attr('rx') );
        var sy = parseInt( self.ellipse.attr('cy') );
        var ex = parseInt( target_ellipse.attr('cx') );
        var ey = parseInt( target_ellipse.attr('cy') );
        var relation = svg.group( $("#svgenlargement svg g"), {'class':'relation'} );
        svg.title( relation, $('#source_node_id').val() + '->' + $('#target_node_id').val() );
        svg.path( relation, path.move( sx, sy ).curveC( sx + (2*rx), sy, ex + (2*rx), ey, ex, ey ), {fill: 'none', stroke: '#FFA14F', strokeWidth: 4});
        $('#svgenlargement .relation').filter( ':last' ).insertBefore( $('#svgenlargement g g').filter(':first') );
        $('#dialog-form').dialog( 'open' );
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
  }

  this.leave_node = function(evt) {
    self.ellipse.attr( 'fill', '#fff' );
  }

  this.greyout_edges = function() {
      $.each( self.node_elements, function(index, value) {
        value.grey_out('.edge');
      });
  }

  this.ungreyout_edges = function() {
      $.each( self.node_elements, function(index, value) {
        value.un_grey_out('.edge');
      });
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
  this.grey_out = function(filter) {
      if( this.shape.parent(filter).size() != 0 ) {
          this.shape.attr({'stroke':'#e5e5e5', 'fill':'#e5e5e5'});
      }
  }
  this.un_grey_out = function(filter) {
      if( this.shape.parent(filter).size() != 0 ) {
        this.shape.attr({'stroke':'#000000', 'fill':'#000000'});
      }
  }
}

function svgpath( path_element, svg_element ) {
  this.svg_element = svg_element;
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
  this.grey_out = function() {
      this.svg_element.attr('stroke', '#e5e5e5');
      this.svg_element.siblings('text').attr('fill', '#e5e5e5');
  }
  this.un_grey_out = function() {
      this.svg_element.attr('stroke', '#000000');
      this.svg_element.siblings('text').attr('fill', '#000000');
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
  $.each( $('#svgenlargement .edge').children('title'), function(index) {
    title = $(this).text();
    if( edge_in_pattern.test(title) ) {
      edge_elements.push( new svgshape( $(this).siblings('polygon') ) );
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(path_segments.numberOfItems - 1), $(this).siblings('path') ) );
    }
    if( edge_out_pattern.test(title) ) {
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(0), $(this).siblings('path') ) );
    }
  });
  return edge_elements;
} 

$(document).ready(function () {
  scroll_ratio =  $('#enlargement').height() / $('#graph').height();
  
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
      if ( $('#update_workspace_button').data('locked') != true ) {
          var scroll_left = $(this).data('scrollLeft') + $(this).data('x') - event.clientX;
          this.scrollLeft = scroll_left;
          var enlarged_scroll_left = scroll_left * scroll_ratio; 
          $('#enlargement').scrollLeft( enlarged_scroll_left );
          color_enlarged();
      }
    }
  }).mousewheel(function (event, delta) {
      if ( $('#update_workspace_button').data('locked') != true ) {
          var scroll_left = delta * 30;
          this.scrollLeft -= scroll_left;
          var enlarged_scroll_left = $('#enlargement').scrollLeft();
          enlarged_scroll_left -= (scroll_left * scroll_ratio);
          $('#enlargement').scrollLeft( enlarged_scroll_left );
          color_enlarged();      
      }
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
    open: function() {
      $(".ui-widget-overlay").css("background", "none");
      $("#dialog_overlay").show();
      $("#dialog_overlay").height( $("#enlargement_container").height() );
      $("#dialog_overlay").width( $("#enlargement_container").width() );
      $("#dialog_overlay").offset( $("#enlargement_container").offset() );
    },
    close: function() {
      $('#reason').val( "" ).removeClass( "ui-state-error" );
      $("#dialog_overlay").hide();
    }
  });

  $('#update_workspace_button').click( function() {
     var svg_enlargement = $('#svgenlargement').svg().svg('get').root();
     if( $(this).data('locked')==true) {
         $.each( ellipses_in_magnifier, function( index, ellipse ) {
             ellipse.data( 'node_obj' ).ungreyout_edges();
             ellipse.data( 'node_obj' ).set_draggable( false );
             ellipse.data( 'node_obj', null );
         })
         svg_enlargement.children[0].setAttribute( 'transform', $(this).data('transform_memo') );
         $('#enlargement').scrollLeft( $(this).data('scrollleft_memo') );
         $(this).data('locked', false);
         $(this).css('background-position', '0px 0px');
     } else {
         $(this).css('background-position', '0px 17px');
         var y_min = parseInt( ellipses_in_magnifier[0].attr('cy') ) - parseInt( ellipses_in_magnifier[0].attr('ry') ); 
         var y_max = parseInt( ellipses_in_magnifier[0].attr('cy') ) + parseInt( ellipses_in_magnifier[0].attr('ry') ); 
         $.each( ellipses_in_magnifier, function( index, ellipse ) {
             var ny_min = parseInt( ellipse.attr('cy') ) - parseInt( ellipse.attr('ry') ); 
             var ny_max = parseInt( ellipse.attr('cy') ) + parseInt( ellipse.attr('ry') ); 
             if( ny_min < y_min ) { y_min = ny_min }; 
             if( ny_max > y_max ) { y_max = ny_max };
             if( ellipse.data( 'node_obj' ) == null ) {
                 ellipse.data( 'node_obj', new node_obj( ellipse ) );
             } else {
                 ellipse.data( 'node_obj' ).set_draggable( true );
             }
             ellipse.data( 'node_obj' ).greyout_edges();
         })
         var graph_frag_height = y_max - y_min ;
         var svg_enlargement_vbheight = svg_enlargement.viewBox.baseVal.height;
         var svg_enlargement_vbwidth = svg_enlargement.viewBox.baseVal.width;
         var scale = svg_enlargement_vbheight / graph_frag_height;
         mousemove_enlargement_ratio = scroll_enlargement_ratio * scale;
         var scroll_padding = $('#enlargement_container').width();
         var scroll_scale =  svg_enlargement_vbwidth / ( parseFloat( $('#svgenlargement svg').attr('width') ) - scroll_padding );
         var vbx_of_scroll = ( $('#enlargement').scrollLeft() ) * scroll_scale;
         var translate_x = vbx_of_scroll;
         var transform = svg_enlargement.children[0].getAttribute('transform');
         $(this).data('transform_memo', transform );
         $(this).data('scrollleft_memo', $('#enlargement').scrollLeft() ); 
         $(this).data('locked', true );
         $('#enlargement').scrollLeft(0);
         transform = 'scale(' + scale + ') translate(' + (-1 * translate_x) + ',' + (-1 * y_min) + ')';
         svg_enlargement.children[0].setAttribute( 'transform', transform );
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

function color_enlarged() {
    ellipses_in_magnifier = [];
    var scroll_offset = parseInt( $('#enlargement').scrollLeft() );
    var scroll_padding = $('#enlargement_container').width()/2;
    $('#svgenlargement ellipse,#svgbasics ellipse' ).each( function( index ) {
        var cpos_inscrollcoor = parseInt( $(this).attr('cx') ) * scroll_enlargement_ratio;
        if ( ( cpos_inscrollcoor > (scroll_offset - scroll_padding) ) && ( cpos_inscrollcoor < ( scroll_offset + scroll_padding ) ) ) {
           $(this).attr( {stroke:'green', fill:'#b3f36d'} );
           if( $(this).parents('#svgenlargement').size() == 1 ) { ellipses_in_magnifier.push( $(this) ) };
        } else {
           $(this).attr( {stroke:'black', fill:'#fff'} );
        }
    });   
}
