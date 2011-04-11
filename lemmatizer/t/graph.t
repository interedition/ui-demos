#!/usr/bin/perl

use strict; use warnings;
use Test::More;
use lib 'lib';
use lemmatizer::Model::Graph;

my $datafile = 't/data/Collatex-16.xml';

open( GRAPHFILE, $datafile ) or die "Could not open $datafile";
my @lines = <GRAPHFILE>;
close GRAPHFILE;
my $graph = lemmatizer::Model::Graph->new( 'xml' => join( '', @lines ) );

# Test the svg creation
my $svg = $graph->as_svg();


# Test for the correct number of nodes

# Test for the correct number of edges

# Test for the correct common nodes
my @expected_nodes = map { "node_$_" } qw/0 1 8 12 13 16 19 20 23 27/;
my @active_nodes = $graph->active_nodes();
is_deeply( \@active_nodes, \@expected_nodes, "Initial common points" );

foreach my $idx ( qw/2 3 5 8 10 13 15/ ) {
    splice( @expected_nodes, $idx, 0, undef );
}
@active_nodes = $graph->active_nodes(1);
is_deeply( \@active_nodes, \@expected_nodes, "Common points with placeholders" );

# Test the manuscript paths

# Test the transposition identifiers
my $transposed_nodes = { 2 => 9,
			 9 => 2,
			 14 => 18,
			 15 => 17,
			 17 => 15,
			 18 => 14
};
is_deeply( $graph->{transpositions}, $transposed_nodes, "Found the right transpositions" );

# Test turning on a node
$graph->toggle_node( 24 );
$expected_nodes[ 15 ] = "node_24";
@active_nodes = $graph->active_nodes(1);
is_deeply( \@active_nodes, \@expected_nodes, "Turned on node for new location" );
 
# Test the toggling effects of same-column
$graph->toggle_node( 26 );
$expected_nodes[ 15 ] = "node_26";
@active_nodes = $graph->active_nodes(1);
is_deeply( \@active_nodes, \@expected_nodes, "Turned on other node in that location" );

# Test the toggling effects of transposition

$graph->toggle_node( 14 );
$expected_nodes[ 8 ] = "node_14";
@active_nodes = $graph->active_nodes(1);
is_deeply( \@active_nodes, \@expected_nodes, "Turned on transposition node" );
$graph->toggle_node( 18 );
$expected_nodes[ 8 ] = undef;
$expected_nodes[ 10 ] = "node_18";
@active_nodes = $graph->active_nodes(1);
is_deeply( \@active_nodes, \@expected_nodes, "Turned on that node's partner" );
$graph->toggle_node( 14 );
$expected_nodes[ 8 ] = "node_14";
$expected_nodes[ 10 ] = undef;
@active_nodes = $graph->active_nodes(1);
is_deeply( \@active_nodes, \@expected_nodes, "Turned on the original node" );



done_testing();
