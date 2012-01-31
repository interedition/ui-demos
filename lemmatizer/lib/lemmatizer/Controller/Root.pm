package lemmatizer::Controller::Root;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use JSON;
use Data::Dumper;
use Text::Tradition;
use TryCatch;

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
	my $input = $c->request->param('result');
	if( $input ) {
		my $datatype = $c->request->param('type') || 'CollateX';
		$tradition = Text::Tradition->new( 
			'name'  => 'inline', 
			'input' => $datatype,
			'string'  => $input,
			);
    } else {
    	_test_tradition( $c );
    }
	my $collation = $tradition->collation;
	my $svg_str = $collation->as_svg;
	$svg_str =~ s/\n//gs;
	$c->stash->{'svg_string'} = $svg_str;
	$c->stash->{'template'} = 'testsvg.tt2';
}

sub relationship_definition :Global {
	my( $self, $c ) = @_;
	my $valid_relationships = [ qw/ spelling orthographic grammatical meaning / ];
	my $valid_scopes = [ qw/ local global / ];
	$c->stash->{'result'} = { 'types' => $valid_relationships, 'scopes' => $valid_scopes };
	$c->forward('View::JSON');
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

sub render_subgraph :Global {
	my( $self, $c ) = @_;
	_test_tradition( $c ) unless $tradition;
	my $collation = $tradition->collation;
	my $nodeids = $c->req->params->{'node_ids[]'};
	my @active = ref( $nodeids ) eq 'ARRAY' ? @$nodeids : ( $nodeids );
	my( $min, $max ) = ( $collation->end->rank, 0 );
	foreach my $n ( @active ) {
		my $r = $collation->reading( $n )->rank;
		$min = $r if $r < $min;
		$max = $r if $r > $max;
	}
	$c->log->debug( "Rank range calculated as $min -> $max" );
	$c->stash->{'result'} = $collation->svg_subgraph( $min, $max );
	$c->forward('View::SVG');
}

sub render_alignment :Global {
	my( $self, $c ) = @_;
	_test_tradition( $c ) unless $tradition;
	my $collation = $tradition->collation;
	my $alignment = $collation->make_alignment_table;
	
	# Turn the table, so that witnesses are by column and the rows
	# are by rank.
	my $wits = [ map { $_->{'witness'} } @{$alignment->{'alignment'}} ];
	my $rows;
	foreach my $i ( 0 .. $alignment->{'length'} - 1 ) {
		my @rankrdgs = map { $_->{'tokens'}->[$i]->{'t'} } 
			@{$alignment->{'alignment'}};
		push( @$rows, { 'rank' => $i+1, 'readings' => \@rankrdgs } );
	}
	$c->log->debug( Dumper( $rows ) );
	$c->stash->{'witnesses'} = $wits;
	$c->stash->{'table'} = $rows;
	$c->stash->{'template'} = 'alignment_table.tt2';
}

sub set_relationship :Global {
	my( $self, $c ) = @_;
	my $collation = $tradition->collation;

	my $node = $c->request->param('source_id');
	my $target = $c->request->param('target_id');
	my $relation = $c->request->param('reason');
	my $note = $c->request->param('note');
	my $scope = $c->request->param('global') ? 'global' : 'local';

	my $opts = { 'type' => $relation,
				 'scope' => $scope };
	
	my @vectors;
	$c->response->content_type( 'application/json' );
	$c->response->content_encoding( 'UTF-8' );
	try {
		@vectors = $collation->add_relationship( $node, $target, $opts );
	} catch( Text::Tradition::Error $e ) {
		$c->response->status( '403' );
		$c->response->content_type( 'application/json' );
		$c->response->body( encode_json( { 'error' => $e->message } ) );
		return;
	}

	my $response = {};
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
		my $el = $collation->path_display_label( 
			$collation->path_witnesses( $n->id, $source ) );
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
		my $el = $collation->path_display_label(  
			$collation->path_witnesses( $source, $n->id ) );
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

# Set a default tradition for testing
sub _test_tradition {
	my $c = shift;
	my $testdata = $c->request->param('test') || 'Collatex-16.xml';
	# Default testing stuff.
	$tradition = Text::Tradition->new( 
		'name'  => 'inline', 
		'input' => $testdata eq 'john.xml' ? 'Self' : 'CollateX',
		'file'  => $c->path_to( 't', 'data', $testdata ),
	);
	# Fix up the CX file
	if( $testdata eq 'Collatex-16.xml' ) {
		$tradition->collation->reading( 'n9' )->rank( 17 );
		$tradition->collation->reading( 'n25' )->rank( 18 );
	}
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
