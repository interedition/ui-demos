package lemmatizer::Controller::Root;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use JSON;
use Text::Tradition;

#
# Sets the actions in this controller to be registered with no prefix
# so they function identically to actions created in MyApp.pm
#
__PACKAGE__->config->{namespace} = '';

=head1 NAME

lemmatizer::Controller::Root - Root Controller for lemmatizer

=head1 DESCRIPTION

[enter your description here]

=head1 METHODS

=cut

=head2 index

=cut

my $graph;

sub index :Path :Args(0) {
    my ( $self, $c ) = @_;

    # First we need to generate the SVG from the GraphML, and also keep track
    # of the GraphML nodes.

    # For now, we use a static GraphML.
    my $dummy_file = "t/data/Collatex-16.xml";
    open( GRAPHFILE, $dummy_file ) or die "Could not open $dummy_file";
    my @lines = <GRAPHFILE>;
    close GRAPHFILE;
    my $tradition = Text::Tradition->new( 
	'CollateX' => join( '', @lines ),
	'name' => 'Collatex_16', );
    $graph = $tradition->collation;
    my $svg_str = $graph->as_svg;
    $svg_str =~ s/\n//gs;
    $c->stash->{svg_string} = $svg_str;
    my @initial_nodes = $graph->lemma_readings();
    $c->stash->{initial_text} = join( ' ', map { $_->[1] ? $graph->reading( $_->[0] )->label : '...' } @initial_nodes );
    $c->stash->{template} = 'testsvg.tt2';
}

sub node_click :Global {
    my ( $self, $c ) = @_;
    my $node = $c->request->params->{'node_id'};

    my @off = $graph->toggle_reading( $node );
    my @active = $graph->lemma_readings( @off );

    $c->response->content_type( 'application/json' );
    $c->response->content_encoding( 'UTF-8' );
    $c->response->body( encode_json( \@active ) );
}

sub node_collapse :Global {
    my( $self, $c ) = @_;

    my $node = $c->request->params->{'source_id'};
    my $target = $c->request->params->{'target_id'};
    my $reason = $c->request->params->{'reason'};
    my $global = $c->request->params->{'global'};
    $global = 1 if $global; # make it a Bool for Moose
    my $response = {};

    # TODO all the work.  For now hardcode a test case.
    my $opts = { 'type' => $reason,
		 'global' => $global };
    my( $status, @nodes ) = $graph->add_relationship( $node, $target, $opts );

    $c->response->status( $status ? 200 : 403 );

    if( $status ) {
	# TODO work
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
    }
    $c->response->content_type( 'application/json' );
    $c->response->content_encoding( 'UTF-8' );
    $c->response->body( encode_json( $response ) );
}

sub find_dup_edges {
    my( $source, $target ) = @_;
    $graph->collapse_graph_paths();
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

sub default :Path {
    my ( $self, $c ) = @_;
    $c->response->body( 'Page not found' );
    $c->response->status(404);
}

=head2 end

Attempt to render a view, if needed.

=cut

sub end : ActionClass('RenderView') {}

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
