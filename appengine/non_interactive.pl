#!/opt/local/bin/perl

use strict;
use feature qw( say );
use LWP::UserAgent;

my $url = 'http://localhost:8080/return_texts';
my $req = { file1 => 'This is some text to be collated.',
	    file2 => 'Some more text to be collated.',
	    url1 => 'http://www.eccentricity.org/~tla/group.xml',
	  };

my $ua = LWP::UserAgent->new();
my $response = $ua->post($url, $req);

if( $response->is_success ) {
    say $response->headers->as_string;
    say $response->content;
}

