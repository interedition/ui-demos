package lemmatizer::Controller::Root;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use JSON;
use lemmatizer::Model::Graph;

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
    $graph = lemmatizer::Model::Graph->new( 'xml' => join( '', @lines ) );
    
    my $svg_str = $graph->as_svg;
    $svg_str =~ s/\n//gs;
    $c->stash->{svg_string} = $svg_str;
    my @initial_nodes = $graph->active_nodes();
    $c->stash->{initial_text} = join( ' ', map { $_->[1] ? $graph->text_of_node( $_->[0] ) : '...' } @initial_nodes );
    $c->stash->{template} = 'testsvg.tt2';
}

sub nodeclick :Global {
    my ( $self, $c ) = @_;
    my $node = $c->request->params->{'node_id'};

 #$DB::single = 1;
    my @off = $graph->toggle_node( $node );
    my @active = $graph->active_nodes( @off );

    $c->response->content_type( 'application/json' );
    $c->response->content_encoding( 'UTF-8' );
    $c->response->body( encode_json( \@active ) );
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
