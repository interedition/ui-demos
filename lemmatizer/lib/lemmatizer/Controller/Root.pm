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
	'GraphML' => join( '', @lines ),
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
    my $response = {};

    # TODO all the work.  For now hardcode a test case.
    my $ok_mappings = { 
	'n8' => 'n13',
	'n13' => 'n8',
	'n9' => 'n23',
	'n23' => 'n9',
	'n25' => 'n26',
	'n26' => 'n25',
    };

    my $collapsing_edges = { 
	'n8' => { 'n12&#45;&gt;n8' => { 'target' => 'n12&#45;&gt;n13',
					'label' => ', C' },
		  'n8&#45;&gt;n14' => { 'target' => 'n13&#45;&gt;n14',
					'label' => ', C' },
	},
	'n13' => { 'n12&#45;&gt;n13' => { 'target' => 'n12&#45;&gt;n8',
					  'label' => ', C' },
		   'n13&#45;&gt;n14' => { 'target' => 'n8&#45;&gt;n14',
					  'label' => ', C' },
	},
	'n25' => { 'n25&#45;&gt;n27' => { 'target' => 'n26&#45;&gt;n27',
					  'label' => ', C' },
	},
	'n26' => { 'n26&#45;&gt;n27' => { 'target' => 'n25&#45;&gt;n27',
					  'label' => ', C' },
	},
	
    };

    if( exists( $ok_mappings->{$node} ) ) {
	$response->{'OK'} = 1;
	$response->{$node} = { 'target' => $ok_mappings->{$node} };
	if( $global ) {
	    my $extra;
	    $extra = 'n9' if $node eq 'n8';
	    $extra = 'n8' if $node eq 'n9';
	    $extra = 'n23' if $node eq 'n13';
	    $extra = 'n13' if $node eq 'n23';
	    $response->{$extra} = { 'target' => $ok_mappings->{$extra} }
	        if $extra;
	}
	foreach my $n ( keys %$response ) {
	    next if $n eq 'OK';
	    if( exists $collapsing_edges->{$n} ) {
		$response->{$n}->{'edges'} = $collapsing_edges->{$n};
	    }
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
