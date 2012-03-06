package lemmatizer::Controller::Root;

use strict;
use warnings;
use parent 'Catalyst::Controller';
use JSON;
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

 GET relation/$textid
 
Renders the application for the text identified by $textid.

=cut

my $tradition;

sub index :Path :Args(0) {
	my( $self, $c ) = @_;
	$c->stash->{'template'} = 'frontpage.tt2';
}

=head2 definitions

 GET definitions
 
Returns a data structure giving the valid types and scopes for a relationship.

=cut

sub definitions :Local :Args(0) {
	my( $self, $c ) = @_;
	my $valid_relationships = [ qw/ spelling orthographic grammatical meaning / ];
	my $valid_scopes = [ qw/ local global / ];
	$c->stash->{'result'} = { 'types' => $valid_relationships, 'scopes' => $valid_scopes };
	$c->forward('View::JSON');
}

=head2 text

 GET $textid/
 
 Runs the relationship mapper for the specified text ID.
 
=cut

sub text :Chained('/') :PathPart('') :CaptureArgs(1) {
	my( $self, $c, $textid ) = @_;
	$c->stash->{'tradition'} = $c->model('Directory')->tradition( $textid );
}

sub main :Chained('text') :PathPart('') :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	my $svg_str = $collation->as_svg;
	$svg_str =~ s/\n//gs;
	$c->stash->{'svg_string'} = $svg_str;
	$c->stash->{'template'} = 'testsvg.tt2';

}

=head2 relationships

 GET $textid/relationships

Returns the list of relationships defined for this text.

 POST $textid/relationships { request }
 
Attempts to define the requested relationship within the text. Returns 200 on
success or 403 on error.

 DELETE $textid/relationships { request }
 

=cut

sub relationships :Chained('text') :PathPart :Args(0) {
	my( $self, $c ) = @_;
	my $tradition = delete $c->stash->{'tradition'};
	my $collation = $tradition->collation;
	if( $c->request->method eq 'GET' ) {
		my @pairs = $collation->relationships; # returns the edges
		my @all_relations;
		foreach my $p ( @pairs ) {
			my $relobj = $collation->relations->get_relationship( @$p );
			my $relhash = { source => $p->[0], target => $p->[1], 
				  type => $relobj->type, scope => $relobj->scope };
			$relhash->{'note'} = $relobj->annotation if $relobj->has_annotation;
			push( @all_relations, $relhash );
		}
		$c->stash->{'result'} = \@all_relations;
	} elsif( $c->request->method eq 'POST' ) {
		my $node = $c->request->param('source_id');
		my $target = $c->request->param('target_id');
		my $relation = $c->request->param('rel_type');
		my $note = $c->request->param('note');
		my $scope = $c->request->param('scope');
	
		my $opts = { 'type' => $relation,
					 'scope' => $scope };
		$opts->{'annotation'} = $note if $note;
		
		try {
			my @vectors = $collation->add_relationship( $node, $target, $opts );
			$c->stash->{'result'} = \@vectors;
		} catch( Text::Tradition::Error $e ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 'error' => $e->message };
		}
	} elsif( $c->request->method eq 'DELETE' ) {
		my $node = $c->request->param('source_id');
		my $target = $c->request->param('target_id');
	
		try {
			my @vectors = $collation->del_relationship( $node, $target );
			$c->stash->{'result'} = \@vectors;
		} catch( Text::Tradition::Error $e ) {
			$c->response->status( '403' );
			$c->stash->{'result'} = { 'error' => $e->message };
		}	
	}
	$c->forward('View::JSON');
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
