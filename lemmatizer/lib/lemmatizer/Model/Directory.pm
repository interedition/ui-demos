package lemmatizer::Model::Directory;
use Moose;
use MooseX::Types::Path::Class qw/ Dir /;
use namespace::autoclean;
use Text::Tradition;

extends 'Catalyst::Model';

has 'traditions' => (
	isa => 'HashRef[Text::Tradition]',
	traits => ['Hash'],
	handles => {
		add_tradition => 'set',
		tradition => 'get',
		has_tradition => 'exists',
		},
	default => sub { {} },
	);
	
has 'datapath' => (
	is => 'ro',
	isa => Dir,
	coerce => 1,
	required => 1,
	);

# Return one of our two test traditions, on ID 0 or 1.
around 'tradition' => sub {
	my( $orig, $self, $id ) = @_;
	if( !$self->has_tradition( $id ) ) {
		# Make it
		my $t = $self->_test_tradition( $id );
		$self->add_tradition( $id, $t );
	}
	$self->$orig( $id ); 	
};

# Our default test traditions. 0 for the simple one, 1 for the less
# simple one.
sub _test_tradition {
	my( $self, $tid ) = @_;
	my $testdata = $tid == 0 ? 'Collatex-16.xml' : 'john.xml';
	# Default testing stuff.
	my $tradition = Text::Tradition->new( 
		'name'  => 'inline', 
		'input' => $testdata eq 'john.xml' ? 'Self' : 'CollateX',
		'file'  => $self->datapath->absolute . "/$testdata",
	);
	if( $testdata eq 'Collatex-16.xml' ) {
		# Fix up the CX file
		$tradition->collation->reading( 'n21' )->rank( 17 );
		$tradition->collation->reading( 'n22' )->rank( 18 );
	} else {
		# Add a test pre-existing relationships
		$tradition->collation->add_relationship( '1,4', '1,5', 
			{ type => 'orthographic', scope => 'global' } );
	}
	return $tradition;
}


=head1 NAME

lemmatizer::Model::Directory - Catalyst Model

=head1 DESCRIPTION

A dummy model to return the requested tradition.

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software. You can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

__PACKAGE__->meta->make_immutable;

1;
