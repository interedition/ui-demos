function getRelativePath( action ) {
    path_elements = window.location.pathname.split('/'); 
    if( path_elements[1].length > 0 ) {
        return window.location.pathname.split('/')[1] + '/' + action;
    } else {
        return action;
    }
}

function svgEnlargementLoaded() {
    //Set viewbox widht and height to widht and height of $('#svgenlargement svg').
    //This is essential to make sure zooming and panning works properly.
    $('#svgenlargement ellipse').attr( {stroke:'green', fill:'#b3f36d'} );
    var graph_svg = $('#svgenlargement svg');
    var svg_g = $('#svgenlargement svg g')[0];
    svg_root = graph_svg.svg().svg('get').root();
    svg_root.viewBox.baseVal.width = graph_svg.attr( 'width' );
    svg_root.viewBox.baseVal.height = graph_svg.attr( 'height' );
    //Now set scale and translate so svg height is about 150px and vertically centered in viewbox.
    //This is just to create a nice starting enlargement.
    var initial_svg_height = 250;
    var scale = initial_svg_height/graph_svg.attr( 'height' );
    var additional_translate = (graph_svg.attr( 'height' ) - initial_svg_height)/(2*scale);
    var transform = svg_g.getAttribute('transform');
    var translate = parseFloat( transform.match( /translate\([^\)]*\)/ )[0].split('(')[1].split(' ')[1].split(')')[0] );
    translate += additional_translate;
    var transform = 'rotate(0) scale(' + scale + ') translate(4 ' + translate + ')';
    svg_g.setAttribute('transform', transform);
    //used to calculate min and max zoom level:
    start_element_height = $("#svgenlargement .node title:contains('#START#')").siblings('ellipse')[0].getBBox().height;
    add_relations();
}

function add_relations() {
    $.getJSON( 'relationship_definition', function(data) {
        var rel_types = data.types.sort();
        $.getJSON('get_relationships',
        function(data) {
            $.each(data, function( index, rel_info ) {
                var type_index = $.inArray(rel_info.type, rel_types);
                if( type_index != -1 ) {
                    relation_manager.create( rel_info.source, rel_info.target, type_index );
                    var node_obj = get_node_obj(rel_info.source);
                    node_obj.set_draggable( false );
                    node_obj.ellipse.data( 'node_obj', null );
                    node_obj = get_node_obj(rel_info.target);
                    node_obj.set_draggable( false );
                    node_obj.ellipse.data( 'node_obj', null );
                }
            })
        });
    });
}

function get_ellipse( node_id ) {
  return $('#svgenlargement .node').children('title').filter( function(index) {
    return $(this).text() == node_id;
  }).siblings('ellipse');
}

function get_node_obj( node_id ) {
    var node_ellipse = get_ellipse( node_id );
    if( node_ellipse.data( 'node_obj' ) == null ) {
        node_ellipse.data( 'node_obj', new node_obj(node_ellipse) );
    };
    return node_ellipse.data( 'node_obj' );
}

function get_edge( edge_id ) {
  return $('#svgenlargement .edge').filter( function(index) {
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
    self.dx = (evt.clientX - self.x) / mouse_scale;
    self.dy = (evt.clientY - self.y) / mouse_scale;
    self.move_elements();
  }

  this.mouseup_listener = function(evt) {    
    if( $('ellipse[fill="#ffccff"]').size() > 0 ) {
        var source_node_id = self.ellipse.siblings('title').text();
        var target_node_id = $('ellipse[fill="#ffccff"]').siblings("title").text();
        $('#source_node_id').val( source_node_id );
        $('#target_node_id').val( target_node_id );
        $('#dialog-form').dialog( 'open' );
    };
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr( 'fill', '#fff' );
    self.ellipse.hover( self.enter_node, self.leave_node );
    self.reset_elements();
  }

  this.cpos = function() {
    return { x: self.ellipse.attr('cx'), y: self.ellipse.attr('cy') };
  }

  this.get_g = function() {
    return self.ellipse.parent('g');
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

  this.update_elements = function() {
      self.node_elements = node_elements_for(self.ellipse);
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
  this.grey_out = function(filter) {
      if( this.svg_element.parent(filter).size() != 0 ) {
          this.svg_element.attr('stroke', '#e5e5e5');
          this.svg_element.siblings('text').attr('fill', '#e5e5e5');
      }
  }
  this.un_grey_out = function(filter) {
      if( this.svg_element.parent(filter).size() != 0 ) {
          this.svg_element.attr('stroke', '#000000');
          this.svg_element.siblings('text').attr('fill', '#000000');
      }
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
  $.each( $('#svgenlargement .edge,#svgenlargement .relation').children('title'), function(index) {
    title = $(this).text();
    if( edge_in_pattern.test(title) ) {
        polygon = $(this).siblings('polygon');
        if( polygon.size() > 0 ) {
            edge_elements.push( new svgshape( polygon ) );
        }
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

function relation_factory() {
    var self = this;
    this.color_memo = null;
    //TODO: colors hard coded for now
    this.temp_color = '#FFA14F';
    this.relation_colors = [ "#5CCCCC", "#67E667", "#F9FE72", "#6B90D4", "#FF7673", "#E467B3", "#AA67D5", "#8370D8", "#FFC173" ];

    this.create_temporary = function( source_node_id, target_node_id ) {
        var relation = $('#svgenlargement .relation').filter( function(index) {
            var relation_id = $(this).children('title').text();
            if( ( relation_id == ( source_node_id + '->' + target_node_id ) ) || ( relation_id == ( target_node_id + '->' + source_node_id ) ) ) {
                return true;
            } 
        } );
        if( relation.size() == 0 ) { 
            draw_relation( source_node_id, target_node_id, self.temp_color );
        } else {
            self.color_memo = relation.children('path').attr( 'stroke' );
            relation.children('path').attr( 'stroke', self.temp_color );
        }
    }
    this.remove_temporary = function() {
        var path_element = $('#svgenlargement .relation').children('path[stroke="' + self.temp_color + '"]');
        if( self.color_memo != null ) {
            path_element.attr( 'stroke', self.color_memo );
            self.color_memo = null;
        } else {
            path_element.parent('g').remove();
        }
    }
    this.create = function( source_node_id, target_node_id, color_index ) {
        //TODO: Protect from (color_)index out of bound..
        var relation_color = self.relation_colors[ color_index ];
        draw_relation( source_node_id, target_node_id, relation_color );
        get_node_obj( source_node_id ).update_elements();
        get_node_obj( target_node_id ).update_elements();
    }
    this.remove = function( source_node_id, target_id ) {
        //TODO (When needed)
        console.log( "Unsupported function node_obj.remove()." );
    }
}

function draw_relation( source_id, target_id, relation_color ) {
    var source_ellipse = get_ellipse( source_id );
    var target_ellipse = get_ellipse( target_id );
    var svg = $('#svgenlargement').children('svg').svg().svg('get');
    var path = svg.createPath(); 
    var sx = parseInt( source_ellipse.attr('cx') );
    var rx = parseInt( source_ellipse.attr('rx') );
    var sy = parseInt( source_ellipse.attr('cy') );
    var ex = parseInt( target_ellipse.attr('cx') );
    var ey = parseInt( target_ellipse.attr('cy') );
    var relation = svg.group( $("#svgenlargement svg g"), {'class':'relation'} );
    svg.title( relation, source_id + '->' + target_id );
    svg.path( relation, path.move( sx, sy ).curveC( sx + (2*rx), sy, ex + (2*rx), ey, ex, ey ), {fill: 'none', stroke: relation_color, strokeWidth: 4});
    var relation_element = $('#svgenlargement .relation').filter( ':last' );
    relation_element.insertBefore( $('#svgenlargement g g').filter(':first') );
}

$(document).ready(function () {
  
  relation_manager = new relation_factory();
  $('#update_workspace_button').data('locked', false);
  
  $('#enlargement').mousedown(function (event) {
    $(this)
        .data('down', true)
        .data('x', event.clientX)
        .data('y', event.clientY)
        .data('scrollLeft', this.scrollLeft)
        stateTf = svg_root.children[0].getCTM().inverse();
        var p = svg_root.createSVGPoint();
        p.x = event.clientX;
        p.y = event.clientY;
        stateOrigin = p.matrixTransform(stateTf);
        return false;
  }).mouseup(function (event) {
        $(this).data('down', false);
  }).mousemove(function (event) {
    if ( ($(this).data('down') == true) && ($('#update_workspace_button').data('locked') == false) ) {
        var p = svg_root.createSVGPoint();
        p.x = event.clientX;
        p.y = event.clientY;
        p = p.matrixTransform(stateTf);
        var matrix = stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y);
        var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
        svg_root.children[0].setAttribute("transform", s);
    }
  }).mousewheel(function (event, delta) {
    event.returnValue = false;
    event.preventDefault();
    if ( $('#update_workspace_button').data('locked') == false ) {
        if( delta < -9 ) { delta = -9 }; 
        var z = 1 + delta/10;
        var g = svg_root.children[0];
        if( (z<1 && (g.getScreenCTM().a * start_element_height) > 4.0) || (z>1 && (g.getScreenCTM().a * start_element_height) < 100) ) {
            var root = svg_root;
            var p = root.createSVGPoint();
            p.x = event.clientX;
            p.y = event.clientY;
            p = p.matrixTransform(g.getCTM().inverse());
            var k = root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);
            var matrix = g.getCTM().multiply(k);
            var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
            g.setAttribute("transform", s);
        }
    }
  }).css({
    'overflow' : 'hidden',
    'cursor' : '-moz-grab'
  });
  

  $( "#dialog-form" ).dialog({
    autoOpen: false,
    height: 270,
    width: 290,
    modal: true,
    buttons: {
      "Ok": function() {
        $('#status').empty();
        form_values = $('#collapse_node_form').serialize()
        ncpath = getRelativePath( 'set_relationship' );
        var jqjson = $.getJSON( ncpath, form_values, function(data) {
            $.each( data, function(item, source_target) { 
                relation_manager.create( source_target[0], source_target[1], $('#rel_type').attr('selectedIndex') );
            });
            relation_manager.remove_temporary();
            $( "#dialog-form" ).dialog( "close" );
        });
      },
      Cancel: function() {
          relation_manager.remove_temporary();
          $( this ).dialog( "close" );
      }
    },
    create: function(event, ui) { 
        $(this).data( 'relation_drawn', false );
        //TODO? Err handling?
        var jqjson = $.getJSON( 'relationship_definition', function(data) {
            var types = data.types.sort();
            $.each( types, function(index, value) {   
                 $('#rel_type').append( $('<option>').attr( "value", value ).text(value) ); 
                 $('#keymaplist').append( $('<li>').css( "border-color", relation_manager.relation_colors[index] ).text(value) ); 
            });
            var scopes = data.scopes;
            $.each( scopes, function(index, value) {   
                 $('#scope').append( $('<option>').attr( "value", value ).text(value) ); 
            });
        });        
    },
    open: function() {
        relation_manager.create_temporary( $('#source_node_id').val(), $('#target_node_id').val() );
        $(".ui-widget-overlay").css("background", "none");
        $("#dialog_overlay").show();
        $("#dialog_overlay").height( $("#enlargement_container").height() );
        $("#dialog_overlay").width( $("#enlargement_container").width() );
        $("#dialog_overlay").offset( $("#enlargement_container").offset() );
    },
    close: function() {
        $( '#status' ).empty();
        $("#dialog_overlay").hide();
    }
  }).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
      if( ( ajaxSettings.url.split("?")[0] == 'set_relationship' ) && jqXHR.status == 403 ) {
          $('#status').append( '<p class="error">The relationship can not be made in this way between these nodes.</p>' );
      }
  } );

  $('#update_workspace_button').click( function() {
     var svg_enlargement = $('#svgenlargement').svg().svg('get').root();
     mouse_scale = svg_root.children[0].getScreenCTM().a;
     if( $(this).data('locked') == true ) {
         $('#svgenlargement ellipse' ).each( function( index ) {
             if( $(this).data( 'node_obj' ) != null ) {
                 $(this).data( 'node_obj' ).ungreyout_edges();
                 $(this).data( 'node_obj' ).set_draggable( false );
                 $(this).data( 'node_obj', null );
             }
         })
         $(this).data('locked', false);
         $(this).css('background-position', '0px 44px');
     } else {
         var left = $('#enlargement').offset().left;
         var right = left + $('#enlargement').width();
         var tf = svg_root.children[0].getScreenCTM().inverse(); 
         var p = svg_root.createSVGPoint();
         p.x=left;
         p.y=100;
         var cx_min = p.matrixTransform(tf).x;
         p.x=right;
         var cx_max = p.matrixTransform(tf).x;
         ellipses_in_magnifier = [];
         $('#svgenlargement ellipse').each( function( index ) {
             var cx = parseInt( $(this).attr('cx') );
             if( cx > cx_min && cx < cx_max) { 
                 if( $(this).data( 'node_obj' ) == null ) {
                     $(this).data( 'node_obj', new node_obj( $(this) ) );
                 } else {
                     $(this).data( 'node_obj' ).set_draggable( true );
                 }
                 $(this).data( 'node_obj' ).greyout_edges();
             }
         });
         $(this).css('background-position', '0px 0px');
         $(this).data('locked', true );
     }
  });
  
});


