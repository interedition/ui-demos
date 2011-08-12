import logging
import re
import simplejson as json
import urllib
from filedata import load_tokens_from_id, save_user_sigil
from handleInput import xml_regularize
from teiResult import add_witnesses
from google.appengine.api import urlfetch
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app


class MSDispatcher( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Another post-only page</title></head><body>You should not be navigating here via GET.</body></html>' )
    
    regularizers = { 
        'fuzzymatch': 'http://furious-wind-27.heroku.com/regularize_fuzzy',
        }
    collators = { 
        'collatex': 'http://gregor.middell.net/collatex/api/collate',
        'ncritic': 'http://eccentricity.org/ncritic/collate/run_collation',
        }
    
    resultactions = { 
        'application/xhtml+xml': { 'formaction': '/display', 'buttons': [ 'Render the HTML' ] },
        'image/svg+xml': { 'formaction': '/display', 'buttons': [ 'Render as SVG' ] },
        'application/json': { 'formaction': '', 'buttons': [] },
        'application/xml': { 'formaction': '/teidisplay', 'buttons': [ 'Display in Versioning Machine' ] }, 
        'application/graphml+xml': { 'formaction': 'http://eccentricity.org/lemmatizer', 'buttons': [ 'Send to lemmatizer' ] },
        }
    
    def post( self ):
        '''Run the collation toolchain on the selected texts with the selected
        options; return a collation result in the end.'''
    	errormsg = []
        tokenized_texts = { 'witnesses': [] }
        ## Get the texts that we plan to collate.
        text_ids = self.request.get_all( 'text' )
        
         # Tokenize those texts.
        sigilmap = {}
        for ti in text_ids:
            logging.info( "Processing text %s" % ti )
            tokenizer_args = {}
            sigil = self.request.get( 'sigil_' + ti )
            tokens = load_tokens_from_id( ti )
            sigilmap[sigil] = save_user_sigil( ti, sigil )
            tokenjson = { 'id': sigil, 'tokens': tokens }
            if self.request.get( 'collator' ) == 'ncritic':
                tokenjson['name'] = sigilmap[sigil].file
            tokenized_texts['witnesses'].append( tokenjson )
            
        
        payload = json.dumps( tokenized_texts, ensure_ascii=False ).encode( 'utf-8' )
        
        if( self.request.get( 'fuzzymatch' ) == 'on' ):
            logging.info( "About to fuzzy match" );
            service = self.regularizers.get( 'fuzzymatch' )
            urlresult = urlfetch.fetch( url=service,
                                        payload=payload,
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = urlresult.content   # Still JSON here
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d' 
                                    % ( service, urlresult.status_code ) )
        
        # Run the collation.  Hacky hacky, do it with RPC for the longer timeout.
        service = self.collators.get( self.request.get( 'collator' ) )
        output = self.request.get( 'output' )
        if( service ):
	    if( output == "application/graphml" or output == "image/svg" or output == "application/xhtml" ):
                output = output + "+xml"
            collation_headers = { 'Content-Type': 'application/json',
                                  'Accept' : output }
            # Cannot pass text/html in the Accept header evidently.
            if( output == 'text/html' ):
                del collation_headers['Accept']
            
            urlresult = urlfetch.fetch( url=service,
                                        headers=collation_headers,
                                        payload=payload,
                                        deadline=10,          
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = urlresult.content  ## Could be one of several formats now
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d, content %s' 
                                         % ( service, urlresult.status_code, urlresult.content ) )
        else: 
            raise NoServiceError( 'No defined collator %s' 
                             % self.request.get( 'collator' ) )
        
        if( len( errormsg ) > 0 ):
            self.response.out.write( 'Got errors: %s' % "\n".join( errormsg ) )
        else:
            result = payload.decode( 'utf-8' )
            if output == 'application/xml':
                result = add_witnesses( payload, sigilmap ).decode( 'utf-8' )
            answer = { 'result': result,
                       'output': output,
                       'formaction': self.resultactions.get( output ).get( 'formaction' ),
                       'buttons': self.resultactions.get( output ).get( 'buttons' ),
                       }
            self.response.headers.__setitem__( 'content-type', 'application/json' )
            self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )

class NoServiceError( Exception ): pass
class ServiceNotOKError( Exception ): pass

application = webapp.WSGIApplication(
                                      [('/run_toolchain', MSDispatcher),],
                                      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
