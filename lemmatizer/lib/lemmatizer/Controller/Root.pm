package lemmatizer::Controller::Root;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use JSON;
use lemmatizer::Model::Graph;
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

Do the initial page load, returning the SVG rendering of the collation graph
and a list of which of the graph nodes are initially 'on'.

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
    $graph = lemmatizer::Model::Graph->new( 'type' => 'CollateX',
					    'data' => join( '', @lines ) );
    my $svg_str = $graph->as_svg;
    $svg_str =~ s/\n//gs;
    $c->stash->{svg_string} = $svg_str;
    my @initial_nodes = $graph->lemma_readings();
    $c->stash->{initial_text} = join( ' ', map { $_->[1] ? $graph->reading( $_->[0] )->label : '...' } @initial_nodes );
    $c->stash->{template} = 'testsvg.tt2';
}

=head2 node_click

AJAX method: expects a node ID, and returns a structured JSON answer
to indicate what nodes should now be on (or off).

=cut

sub node_click :Global {
    my ( $self, $c ) = @_;
    my $node = $c->request->params->{'node_id'};

    my @off = $graph->toggle_reading( $node );
    my @active = $graph->lemma_readings( @off );

    $c->response->content_type( 'application/json' );
    $c->response->content_encoding( 'UTF-8' );
    $c->response->body( encode_json( \@active ) );
}

=head2 node_collapse

AJAX method: expects two node IDs, a relationship/'reason' tag, and a
boolean to indicate whether this collapse applies globally.  Returns a
JSON answer to indicate which nodes, and associated edges, need to be
collapsed onto each other.

=cut

sub node_collapse :Global {
    my( $self, $c ) = @_;

    my $response = $graph->node_collapse( $c->response->params );
    my $status = delete $response->{'status'};
    $c->response->status( $status );

    $c->response->content_type( 'application/json' );
    $c->response->content_encoding( 'UTF-8' );
    $c->response->body( encode_json( $response ) );
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
