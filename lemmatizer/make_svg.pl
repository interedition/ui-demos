#!/usr/bin/perl

use strict;
use warnings;
use GraphViz;
use XML::LibXML;
use XML::LibXML::XPathContext;

my $parser = XML::LibXML->new();
my $doc = $parser->parse_file( $ARGV[0] );
my $collation = $doc->documentElement();
my $xpc = XML::LibXML::XPathContext->new( $collation );
$xpc->registerNs( 'g', 'http://graphml.graphdrawing.org/xmlns' );

# First get the ID keys, for witnesses and for collation data
my %nodedata;
foreach my $k ( $xpc->findnodes( '//g:key' ) ) {
    # Each key has a 'for' attribute; the edge keys are witnesses, and
    # the node keys contain an ID and string for each node.

    if( $k->getAttribute( 'for' ) eq 'node' ) {
	$nodedata{ $k->getAttribute( 'attr.name' ) } = $k->getAttribute( 'id' );
    # } else {
    # 	$witnesses{ $k->getAttribute( 'id' ) } = $k->getAttribute( 'attr.name' );
    }
}

# Now parse the graph into a GraphViz object.

my $g = GraphViz->new( rankdir => 1 );
my $graph = $xpc->find( '/g:graphml/g:graph' )->[0];
my $id_xpath = './g:data[@key="' . $nodedata{'number'} . '"]/child::text()';
my $token_xpath = './g:data[@key="' . $nodedata{'token'} . '"]/child::text()';
foreach my $node ( $graph->getChildrenByTagName( 'node' ) ) {
    $g->add_node( 'node_' . $xpc->findvalue( $id_xpath, $node ), 
		 label => $xpc->findvalue( $token_xpath, $node ) );
}
foreach my $edge ( $graph->getChildrenByTagName( 'edge' ) ) {
    my @witnesses = $xpc->findnodes( './g:data/child::text()', $edge );
    $g->add_edge( 'node_' . $edge->getAttribute( 'source' ) => 'node_' . $edge->getAttribute( 'target' ), 
		 label => join( ', ', map { $_->data } @witnesses ) );
}

print $g->as_svg;
