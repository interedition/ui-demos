package lemmatizer::View::TT;

use strict;
use base 'Catalyst::View::TT';

__PACKAGE__->config(
    TEMPLATE_EXTENSION => '.tt2',
    INCLUDE_PATH => [
		lemmatizer->path_to( 'root', 'src' ),
    ],
    ENCODING => 'utf-8',
    WRAPPER => 'wrapper.tt2',
);

=head1 NAME

TEITokenizer::View::TT - TT View for TEITokenizer

=head1 DESCRIPTION

TT View for TEITokenizer. 

=head1 SEE ALSO

L<TEITokenizer>

=head1 AUTHOR

Tara Andrews

=head1 LICENSE

This library is free software, you can redistribute it and/or modify
it under the same terms as Perl itself.

=cut

1;
