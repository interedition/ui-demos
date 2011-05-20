package lemmatizer::Model::Graph;

use strict;
use warnings;
use Text::Tradition::Graph;

1;
__END__

use GraphViz;
# TODO use Graph Easy instead of Graphviz directly
use Graph::Easy;
use XML::LibXML;
use XML::LibXML::XPathContext;

# graphml_to_svg

sub new {
    my $proto = shift;
    my $class = ref( $proto ) || $proto;
    my %opts = ( 'on_color' => 'yellow',
		 'off_color' => 'white',
		 @_ );

    # TODO take other graph formats, e.g. dot
    unless( exists $opts{'xml'} ) {
	warn "Cannot initialize graph with no 'xml' argument";
	return undef;
    }
    my $xml = delete( $opts{'xml'} );
    my $self = \%opts;
    bless( $self, $class );

    # May as well parse the graph into the GraphViz object now.
    $self->parse_graphml( $xml );

    return $self;
}

sub parse_graphml {
    my( $self, $graphml_str ) = @_;

    my $parser = XML::LibXML->new();
    my $doc = $parser->parse_string( $graphml_str );
    my $collation = $doc->documentElement();
    my $xpc = XML::LibXML::XPathContext->new( $collation );
    $xpc->registerNs( 'g', 'http://graphml.graphdrawing.org/xmlns' );
    $self->{'xpc'} = $xpc;
    
    # First get the ID keys, for witnesses and for collation data
    my %nodedata;
    my %witnesses;
    foreach my $k ( $xpc->findnodes( '//g:key' ) ) {
	# Each key has a 'for' attribute; the edge keys are witnesses, and
	# the node keys contain an ID and string for each node.

	if( $k->getAttribute( 'for' ) eq 'node' ) {
	    $nodedata{ $k->getAttribute( 'attr.name' ) } = $k->getAttribute( 'id' );
	} else {
	    $witnesses{ $k->getAttribute( 'id' ) } = $k->getAttribute( 'attr.name' );
	}
    }
    $self->{nodedata} = \%nodedata;
    $self->{witnesses} = \%witnesses;

    my $graph = $xpc->find( '/g:graphml/g:graph' )->[0];
    $self->{graph} = $graph;

    # Find those nodes that are identical but for transposition.
    my $id_xpath = './g:node[g:data[@key="' . $nodedata{'identity'} . '"]]';
    my $transposed_nodes = $xpc->find( $id_xpath, $graph );
    foreach my $tn ( @$transposed_nodes ) {
	$self->{transpositions}->{$tn->getAttribute('id')} = 
	    $xpc->findvalue( './g:data[@key="' . $nodedata{'identity'} . '"]/text()', $tn );
    }

    # Find the beginning and end nodes of the graph.  The beginning node is
    # target of no edge; end node is source of no edge.
    my %node_hash;
    my $target_nodes = $xpc->find('./g:edge/attribute::target', $graph);
    my $source_nodes = $xpc->find('./g:edge/attribute::source', $graph);

    map { $node_hash{ $_->getValue() } = 1 } @$target_nodes;
    map { $node_hash{ $_->getValue() } = 0 
	      unless exists $node_hash{ $_->getValue };
	  $node_hash{ $_->getValue() } += 2 } @$source_nodes;
    my @end_node_id = grep { $node_hash{ $_->getValue() } == 1 } @$target_nodes;
    my $end_node = 
	$xpc->findnodes( './g:node[@id=' . $end_node_id[0]->getValue()
			 . ']', $graph )->[0];
    my @begin_node_id = grep { $node_hash{ $_->getValue() } == 2 } @$source_nodes;
    my $begin_node = 
	$xpc->findnodes( './g:node[@id=' . $begin_node_id[0]->getValue()
			 . ']', $graph )->[0];

    # %node_hash now contains a key for each node in the graph; we will use this 
    # to keep the 'on/off' state of each node.
    map { $node_hash{$_} = 0 } keys( %node_hash );

    # Now for each witness, walk the path through the graph.
    # Then we need to find the common nodes.  This method is going to
    # fall down if we have a very gappy text in the collation.
    my $paths = {};
    my @common_nodes;
    foreach my $wit ( keys %witnesses ) {
	my $node_id = $begin_node->getAttribute('id');
	my @wit_path = ( $node_id );
	# TODO Detect loops at some point
	while( $node_id != $end_node->getAttribute('id') ) {
	    # Find the node which is the target of the edge whose
	    # source is $node_id and applies to this witness.
	    my $xpath_expr = '//g:edge[child::g:data[@key="' 
		. $wit . '"] and attribute::source="'
		. $node_id . '"]';
	    my $next_edge = $xpc->find( $xpath_expr, $graph )->[0];
	    $node_id = $next_edge->getAttribute('target');
	    push( @wit_path, $node_id );
	}
	$paths->{$wit} = \@wit_path;
	if( @common_nodes ) {
	    my @cn;
	    foreach my $n ( @wit_path) {
		push( @cn, $n ) if grep { $_ eq $n } @common_nodes;
	    }
	    @common_nodes = ();
	    push( @common_nodes, @cn );
	} else {
	    push( @common_nodes, @wit_path );
	}
    }
    # Common nodes should be 'on' by default.
    map { $node_hash{$_} = 1 } @common_nodes;
    $self->{node_state} = \%node_hash;
    $self->{common_nodes} = \@common_nodes;

    # And then we have to calculate the position identifiers for
    # each word, keyed on the common nodes.  This will be 'fun'.
    # The end result is a hash per witness, whose key is the word
    # node and whose value is its position in the text.  Common 
    # nodes are always N,1 so have identical positions in each text.
    my $wit_indices = {};
    my $positions = {};
    foreach my $wit ( keys %witnesses ) {
	my $wit_matrix = [];
	my $cn = 0;
	my $row = [];
	foreach my $wn ( @{$paths->{$wit}} ) {
	    if( $wn eq $common_nodes[$cn] ) {
		$cn++;
		push( @$wit_matrix, $row ) if scalar( @$row );
		$row = [];
	    }
	    push( @$row, $wn );
	}
	push( @$wit_matrix, $row );
	# Now we have a matrix; we really want to invert this.
	my $wit_index;
	foreach my $li ( 1..scalar(@$wit_matrix) ) {
	    foreach my $di ( 1..scalar(@{$wit_matrix->[$li-1]}) ) {
		$wit_index->{ $wit_matrix->[$li-1]->[$di-1] } = "$li,$di";
		$positions->{ "$li,$di" } = 1;
	    }
	}
	
	$wit_indices->{$wit} = $wit_index;
    }
    $self->{indices} = $wit_indices;
    my @ap = sort _cmp_position keys( %$positions );
    $self->{_all_positions} = \@ap;

}
    
sub make_graphviz {
    my( $self ) = @_;
    # Now parse the graph into a GraphViz object.
    
    my $xpc = $self->{xpc};
    my $graph = $self->{graph};

    my $g = GraphViz->new( rankdir => 1 );
    my $id_xpath = './g:data[@key="' . $self->{nodedata}->{'number'} . '"]/child::text()';
    my $token_xpath = './g:data[@key="' . $self->{nodedata}->{'token'} . '"]/child::text()';
    foreach my $node ( $graph->getChildrenByTagName( 'node' ) ) {
	$g->add_node( 'node_' . $xpc->findvalue( $id_xpath, $node ), 
		      label => $xpc->findvalue( $token_xpath, $node ) );
    }
    foreach my $edge ( $graph->getChildrenByTagName( 'edge' ) ) {
	my @wits = $xpc->findnodes( './g:data/child::text()', $edge );
	$g->add_edge( 'node_' . $edge->getAttribute( 'source' ) => 'node_' . $edge->getAttribute( 'target' ), 
		      label => join( ', ', map { $_->data } @wits ) );
    }
    
    $self->{graphviz} = $g;
}

sub as_svg {
    my $self = shift;
    $self->make_graphviz() unless exists $self->{graphviz};
    return $self->{graphviz}->as_svg();
}

# Returns a list of the nodes that are currently on and the nodes for
# which an ellipsis needs to stand in.  Optionally takes a list of
# nodes that have just been turned off, to include in the list.
sub active_nodes {
    my( $self, @toggled_off_nodes ) = @_;
    
    my $all_nodes = {};
    map { $all_nodes->{ $_ } = $self->_find_position( $_ ) } keys %{$self->{node_state}};
    my $positions = _invert_hash( $all_nodes );
    my $positions_off = {};
    map { $positions_off->{ $all_nodes->{$_} } = $_ } @toggled_off_nodes;
    
    # Now for each position, we have to see if a node is on, and we
    # have to see if a node has been turned off.
    my @answer;
    foreach my $pos ( @{$self->{_all_positions}} ) {
	my $nodes = $positions->{$pos};

	# See if there is an active node for this position.
	my @active_nodes = grep { $self->{node_state}->{$_} == 1 } @$nodes;
	warn "More than one active node at position $pos!"
	    unless scalar( @active_nodes ) < 2;
	my $active;
	if( scalar( @active_nodes ) ) {
	    $active = $self->node_to_svg( $active_nodes[0]  );
	}

	# Is there a formerly active node that was toggled off?
	if( exists( $positions_off->{$pos} ) ) {
	    my $off_node = $self->node_to_svg( $positions_off->{$pos} );
	    if( $active ) {
		push( @answer, [ $off_node, 0 ], [ $active, 1 ] );
	    } elsif ( scalar @$nodes == 1 ) {
		# This was the only node at its position. No ellipsis.
		push( @answer, [ $off_node, 0 ] );
	    } else {
		# More than one node at this position, none now active.
		# Restore the ellipsis.
		push( @answer, [ $off_node, undef ] );
	    }
	# No formerly active node, so we just see if there is a currently
	# active one.
	} elsif( $active ) {
	    # Push the active node, whatever it is.
	    push( @answer, [ $active, 1 ] );
	} else {
	    # There is no change here; we need an ellipsis. Use
	    # the first node in the list, arbitrarily.
	    push( @answer, [ $self->node_to_svg( $nodes->[0] ), undef ] );
	}
    }

    return @answer;
}

# Compares two nodes according to their positions in the witness 
# index hash.
sub _by_position {
    my $self = shift;
    return _cmp_position( $self->_find_position( $a ), 
			 $self->_find_position( $b ) );
}

# Takes two position strings (X,Y) and sorts them.
sub _cmp_position {
    my @pos_a = split(/,/, $a );
    my @pos_b = split(/,/, $b );

    my $big_cmp = $pos_a[0] <=> $pos_b[0];
    return $big_cmp if $big_cmp;
    # else 
    return $pos_a[1] <=> $pos_b[1];
}
 
# Finds the position of a node in the witness index hash.  Warns if
# the same node has non-identical positions across witnesses.  Quite
# possibly should not warn.
sub _find_position {
    my $self = shift;
    my $node = shift;

    my $position;
    foreach my $wit ( keys %{$self->{indices}} ) {
	if( exists $self->{indices}->{$wit}->{$node} ) {
	    if( $position && $self->{indices}->{$wit}->{$node} ne $position ) {
		warn "Position for node $node varies between witnesses";
	    }
	    $position = $self->{indices}->{$wit}->{$node};
	}
    }

    warn "No position found for node $node" unless $position;
    return $position;
}

sub _invert_hash {
    my ( $hash, $plaintext_keys ) = @_;
    my %new_hash;
    foreach my $key ( keys %$hash ) {
        my $val = $hash->{$key};
        my $valkey = $val;
        if( $plaintext_keys 
            && ref( $val ) ) {
            $valkey = $plaintext_keys->{ scalar( $val ) };
            warn( "No plaintext value given for $val" ) unless $valkey;
        }
        if( exists ( $new_hash{$valkey} ) ) {
            push( @{$new_hash{$valkey}}, $key );
        } else {
            $new_hash{$valkey} = [ $key ];
        }
    }
    return \%new_hash;
}


# Takes a node ID to toggle; returns a list of nodes that are
# turned OFF as a result.
sub toggle_node {
    my( $self, $node_id ) = @_;
    $node_id = $self->node_from_svg( $node_id );

    # Is it a common node? If so, we don't want to turn it off.
    # Later we might want to allow it off, but give a warning.
    if( grep { $_ =~ /^$node_id$/ } @{$self->{common_nodes}} ) {
	return ();
    }

    my @nodes_off;
    # If we are about to turn on a node...
    if( !$self->{node_state}->{$node_id} ) {
	# Turn on the node.
	$self->{node_state}->{$node_id} = 1;
	# Turn off any other 'on' nodes in the same position.
	push( @nodes_off, $self->colocated_nodes( $node_id ) );
	# Turn off any node that is an identical transposed one.
	push( @nodes_off, $self->identical_nodes( $node_id ) )
	    if $self->identical_nodes( $node_id );
    } else {
	push( @nodes_off, $node_id );
    }

    # Turn off the nodes that need to be turned off.
    map { $self->{node_state}->{$_} = 0 } @nodes_off;
    return @nodes_off;
}

sub node_from_svg {
    my( $self, $node_id ) = @_;
    # TODO: implement this for real.  Need a mapping between SVG titles
    # and GraphML IDs, as created in make_graphviz.
    $node_id =~ s/^node_//;
    return $node_id;
}

sub node_to_svg {
    my( $self, $node_id ) = @_;
    # TODO: implement this for real.  Need a mapping between SVG titles
    # and GraphML IDs, as created in make_graphviz.
    $node_id = "node_$node_id";
    return $node_id;
}

sub colocated_nodes {
    my( $self, $node ) = @_;
    my @cl;

    # Get the position of the stated node.
    my $position;
    foreach my $index ( values %{$self->{indices}} ) {
	if( exists( $index->{$node} ) ) {
	    if( $position && $position ne $index->{$node} ) {
		warn "Two ms positions for the same node!";
	    }
	    $position = $index->{$node};
	}
    }
	
    # Now find the other nodes in that position, if any.
    foreach my $index ( values %{$self->{indices}} ) {
	my %location = reverse( %$index );
	push( @cl, $location{$position} )
	    if( exists $location{$position} 
		&& $location{$position} ne $node );
    }
    return @cl;
}

sub identical_nodes {
    my( $self, $node ) = @_;
    return undef unless exists $self->{transpositions} &&
	exists $self->{transpositions}->{$node};
    return $self->{transpositions}->{$node};
}

sub text_for_witness {
    my( $self, $wit ) = @_;
    # Get the witness name
    my %wit_id_for = reverse %{$self->{witnesses}};
    my $wit_id = $wit_id_for{$wit};
    unless( $wit_id ) {
        warn "Could not find an ID for witness $wit";
        return;
    }
    
    my $path = $self->{indices}->{$wit_id};
    my @nodes = sort { $self->_cmp_position( $path->{$a}, $path->{$b} ) } keys( %$path );
    my @words = map { $self->text_of_node( $_ ) } @nodes;
    return join( ' ', @words );
}

sub text_of_node {
    my( $self, $node_id ) = @_;
    my $xpath = '//g:node[@id="' . $self->node_from_svg( $node_id) .
        '"]/g:data[@key="' . $self->{nodedata}->{token} . '"]/child::text()';
    return $self->{xpc}->findvalue( $xpath );
}
1;
