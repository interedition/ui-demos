#!/opt/local/bin/perl

use strict;
use feature qw( say );
use LWP::UserAgent;

#my $url = 'http://localhost:8080/return_texts';
my $url = 'http://glowing-samurai-588.heroku.com/vmtransform';
open( XML, $ARGV[0] );
my @lines = <XML>;
close XML;
my $req = join( '', @lines );

my $ua = LWP::UserAgent->new();
my $response = $ua->post($url, Content => $req);

if( $response->is_success ) {
    say $response->headers->as_string;
    say $response->content;
}

