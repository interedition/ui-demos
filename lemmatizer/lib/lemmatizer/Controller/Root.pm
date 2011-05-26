package lemmatizer::Controller::Root;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use JSON;
use Text::Tradition::Graph;

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
    $graph = Text::Tradition::Graph->new( 'GraphML' => join( '', @lines ) );
    
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

 $DB::single = 1;
    my @off = $graph->toggle_node( $node );
    my @active = $graph->active_nodes( @off );

    $c->response->content_type( 'application/json' );
    $c->response->content_encoding( 'UTF-8' );
    $c->response->body( encode_json( \@active ) );
}

sub node_collapse :Global {
    my( $self, $c ) = @_;

    my $node = $c->request->params->{'node_id'};
    my $target = $c->request->params->{'target_id'};
    my $reason = $c->request->params->{'reason'};
    my $global = $c->request->params->{'global'};
    my $response = {};

    # TODO all the work.  For now hardcode a test case.
    my %ok_mappings = ( 'n8' => 'n13',
			'n13' => 'n8',
			'n9' => 'n23',
			'n23' => 'n9',
			'n25' => 'n26',
			'n26' => 'n25',
	);

    if( exists( $ok_mappings{$node} ) ) {
	$response->{'OK'} = 1;
	$response->{$node} = $ok_mappings{$node};
	if( $global ) {
	    my $extra;
	    $extra = 'n9' if $node eq 'n8';
	    $extra = 'n8' if $node eq 'n9';
	    $extra = 'n23' if $node eq 'n13';
	    $extra = 'n13' if $node eq 'n23';
	    $response->{$extra} = $ok_mappings{$extra} if $extra;
	}
    } else {
	$response->{'OK'} = undef;
    }

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
