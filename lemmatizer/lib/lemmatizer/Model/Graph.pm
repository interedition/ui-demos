package lemmatizer::Model::Graph;

use strict;
use warnings;
use Text::Tradition;

## This is the module where the tradition graph can be manipulated for
## the purpose of the lemmatizer app.

sub new {
    my( $class, %args ) = shift;
    
    # Create the tradition and save it.  Most of the calls to the
    # graph will be passed to the Text::Tradition object, but some are
    # specific to our representation of the lemmatizer.

}

sub node_collapse {
    my( $self, $params ) = @_;
    
    # The node collapse operation adds a relationship between two
    # nodes, to say that A is a particular sort of variant of B and
    # that they should be considered the same reading for most editing
    # purposes.  We need to work out all pairs of nodes to which this
    # relationship applies, and all sets of path edges that will now
    # be collapsed into one path.  We'll return a hash reference with
    # the information our interface needs.

    my $node = $params->{'source_id'};
    my $target = $params->{'target_id'};
    my $reason = $params->{'reason'};
    my $global = $params->{'global'};
    $global = 1 if $global; # make it a Bool for Moose
    my $response = {};

    my $opts = { 'type' => $reason,
		 'global' => $global };
    my( $status, @nodes ) = $self->collation->add_relationship( $node, $target, $opts );

    if( $status ) {
	# TODO work
	$response->{'status'} = 200;
	foreach my $pair ( @nodes ) {
	    my( $ps, $pt ) = @$pair;
	    $response->{$ps} = { 'target' => $pt };
	}

	foreach my $n ( keys %$response ) {
	    # Edges are of the form $node . &#45;&gt; . $node
	    # Look for any predecessor and successor node shared
	    # between source and target, and collapse those edges.
	    # We want response->node->target = (node)
	    #                       ->edges->target = (edge)
	    #                              ->label = (label)
	    my $collapsed_edges = find_dup_edges( $n, $response->{$n}->{'target'} );
	    $response->{$n}->{'edges'} = $collapsed_edges;
	}
    } else {
	$response->{'status'} = 403;
	$response->{'error'} = "@nodes";
    }

    return $response;
}

## Helper methods for node collapse functionality
sub find_dup_edges {
    my( $source, $target ) = @_;

    # Origin: need to get the nodes on the 'from' side of both source
    # edges and target edges, and then see which in group A are either
    # identical or related to those in group B.  Source edge is the
    # one that leads from the relationship primary to the source;
    # target edge is the one that leads from the relationship primary
    # to the target.  Label is made from all the edges that go from
    # any of the relationship nodes to the source.

    my @source_origin = map { $_->from } $graph->reading( $source )->incoming();
    my @target_origin = map { $_->from } $graph->reading( $target )->incoming();
    my @source_dest = map { $_->to } $graph->reading( $source )->outgoing();
    my @target_dest = map { $_->to } $graph->reading( $target )->outgoing();
    my @shared_origin = union( \@source_origin, \@target_origin );
    my @shared_dest = union( \@source_dest, \@target_dest );
    my $result = {};
    foreach my $n ( @shared_origin ) {
	# This is a hardcoded hack that will break if GraphViz changes its
	# SVG rendering logic.
	my $source_svg_id = $n->name . '&#45;&gt;' . $source;
	my $target_svg_id = $n->name . '&#45;&gt;' . $target;
	# There is only one of these.
	my @el = $n->edges_to( $graph->reading( $source) );
	my $edgelabel = join( ', ', '', $el[0]->name );
	$result->{$source_svg_id} = { 'target' => $target_svg_id,
				      'label'  => $edgelabel };
    }
    foreach my $n ( @shared_dest ) {
	# This is a hardcoded hack that will break if GraphViz changes its
	# SVG rendering logic.
	my $source_svg_id = $source . '&#45;&gt;' . $n->name;
	my $target_svg_id = $target . '&#45;&gt;' . $n->name;
	# There is only one of these.
	my @el = $graph->reading( $source )->edges_to( $n );
	my $edgelabel = join( ', ', '', $el[0]->name );
	$result->{$source_svg_id} = { 'target' => $target_svg_id,
				      'label'  => $edgelabel };
    }
    $graph->expand_graph_paths();
    return $result;
}
sub union {
    my( $list1, $list2 ) = @_;
    my %all;
    my @union;
    map { $all{$_->name} = 1 } @$list1;
    foreach my $l ( @$list2 ) {
	if( $all{$l->name} ) {
	    push( @union, $l );
	}
    }
    return @union;
}


### Functions below this point get passed through to the tradition
### and/or collation object as appropriate.

sub as_svg {
    my $self = shift;
    return $self->collation->as_svg;
}

sub lemma_readings {
    my $self = shift;
    return $self->collation->lemma_readings;
}

sub toggle_reading {
    my $self = shift;
    return $self->collation->toggle_reading;
}


1;
