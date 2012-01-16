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

my $tradition;

sub index :Path :Args(0) {
	my ( $self, $c ) = @_;

	# First we need to generate the SVG from the GraphML, and also keep track
	# of the GraphML nodes.

	# Hacky hacky to make this work with the interedition-tools interface:
	# accept XML in a parameter called 'result'.
	my $datatype = $c->request->param('type') || 'Self';
	my $informat = $c->request->param('format') || 'string';
	my $input = $c->request->param('result');
	unless( $input ) {
		# Default testing stuff.
		$informat = 'file';
		$input = $c->path_to( 't', 'data', 'john.xml' );
	}
	$tradition = Text::Tradition->new( 
    	'name'  => 'inline', 
    	'input' => $datatype,
    	$informat  => $input,
    	);
	my $collation = $tradition->collation;
	my $svg_str = $collation->as_svg;
	$svg_str =~ s/\n//gs;
	$c->stash->{'svg_string'} = $svg_str;
	$c->stash->{'template'} = 'testsvg.tt2';
}

# Utility function to render SVG from a graph input.
sub renderSVG :Global {
	my( $self, $c ) = @_;
	my $origin_data = $c->request->param('data');
	my $format = $c->request->param('format') || 'string';
	my $type = $c->request->param('type');
	my $name = $c->request->param('name') || 'Collation graph';
	my $tradition = Text::Tradition->new( 
		'name' => $name,
		'input' => $type,
		$format => $origin_data,
		);
	$c->stash->{'result'} = $tradition->collation->as_svg;
	$c->forward('View::SVG');
}

sub node_collapse :Global {
	my( $self, $c ) = @_;
	my $collation = $tradition->collation;

	my $node = $c->request->param('source_id');
	my $target = $c->request->param('target_id');
	my $relation = $c->request->param('reason');
	my $note = $c->request->param('note');
	my $scope = $c->request->param('global') ? 'global' : 'local';
	my $response = {};

	# TODO all the work.  For now hardcode a test case.
	my $opts = { 'type' => $relation,
				 'scope' => $scope };
	my( $status, @vectors ) = $collation->add_relationship( $node, $target, $opts );

	$c->response->status( $status ? 200 : 403 );

	if( $status ) {
		# TODO work
		foreach my $pair ( @vectors ) {
			my( $ps, $pt ) = @$pair;
			$response->{$ps} = { 'target' => $pt };
		}

		foreach my $n ( keys %$response ) {
			# Edges are of the form $node . &#45;&gt; . $node
			# Look for any predecessor and successor node shared
			# between source and target, and collapse those edges.
			# We want response->node->target = (node)
			#						->edges->target = (edge)
			#							   ->label = (label)
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
	my $collation = $tradition->collation;
	my @source_origin = $collation->reading( $source )->predecessors();
	my @target_origin = $collation->reading( $target )->predecessors();
	my @source_dest = $collation->reading( $source )->successors();
	my @target_dest = $collation->reading( $target )->successors();
	my @shared_origin = union( \@source_origin, \@target_origin );
	my @shared_dest = union( \@source_dest, \@target_dest );
	my $result = {};
	foreach my $n ( @shared_origin ) {
		# This is a hardcoded hack that will break if GraphViz changes its
		# SVG rendering logic.
		my $source_svg_id = $n->id . '&#45;&gt;' . $source;
		my $target_svg_id = $n->id . '&#45;&gt;' . $target;
		# There is only one of these.
		my $el = $collation->path_display_label( [ $n->id, $source ] );
		my $edgelabel = join( ', ', '', $el );
		$result->{$source_svg_id} = { 'target' => $target_svg_id,
									  'label'  => $edgelabel };
	}
	foreach my $n ( @shared_dest ) {
		# This is a hardcoded hack that will break if GraphViz changes its
		# SVG rendering logic.
		my $source_svg_id = $source . '&#45;&gt;' . $n->id;
		my $target_svg_id = $target . '&#45;&gt;' . $n->id;
		# There is only one of these.
		my $el = $collation->path_display_label( [ $source, $n->id ] );
		my $edgelabel = join( ', ', '', $el );
		$result->{$source_svg_id} = { 'target' => $target_svg_id,
									  'label'  => $edgelabel };
	}
	return $result;
}

sub union {
	my( $list1, $list2 ) = @_;
	my %all;
	my @union;
	map { $all{$_->id} = 1 } @$list1;
	foreach my $l ( @$list2 ) {
		if( $all{$l->id} ) {
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
