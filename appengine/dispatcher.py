import re
import simplejson as json
import urllib
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class MSDispatcher( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Another post-only page</title></head><body>You should not be navigating here via GET.</body></html>' )
    
    tokenizers = { 'plaintext': 'http://interedition-tools.appspot.com/plaintext_tokenize',
                   'teixml': 'http://www.eccentricity.org/teitokenizer/form_tokenize',
                   # 'lucene': 'maybe someday',
                   }
    regularizers = { 'fuzzymatch': 'http://furious-wind-27.heroku.com/regularize_fuzzy',
                     }
    collators = { 'collatex': 'http://gregor.middell.net/collatex/api/collate' }
    
    def post( self ):
    	errormsg = []
        def is_text( x ):
            return( x.startswith( 'file' ) or x.startswith( 'url' ) )
        text_ids = filter( is_text, self.request.arguments() )
        tokenized_texts = { 'witnesses': [] }
        for ti in text_ids:
            tokenizer_args = {}
            text = json.loads( self.request.get( ti ) )
            if( text['type'] == 'plaintext' ):
                tokenizer_args['text'] = text['content']
            elif( text['type'] == 'teixml' ):
                tokenizer_args['xmltext'] = text['content']
            service = self.tokenizers.get( text['type'] )
            if service:
                form_data = urllib.urlencode( tokenizer_args )
                urlresult = urlfetch.fetch( url=service,
                                            payload=form_data,
                                            method='POST' )
                if urlresult.status_code == 200:
                    tokens = json.loads( urlresult.content )
                    tokenized_texts['witnesses'].append( { 'id': ti,
                                                           'tokens': tokens } )
                else:
                    raise ServiceNotOKError( 'Service %s returned status code %d' 
                                        % ( service, urlresult.status_code ) )
            else:
                raise NoServiceError( 'No defined tokenizer for type %s' % text['type'] )
        
        payload = json.dumps( tokenized_texts, ensure_ascii=False ).encode( 'utf-8' )
        #errormsg.append( payload )
        
        if( self.request.get( 'fuzzymatch' ) == 'true' ):
            service = self.regularizers.get( 'fuzzymatch' )
            urlresult = urlfetch.fetch( url=service,
                                        payload=payload,
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = urlresult.content
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d' 
                                    % ( service, urlresult.status_code ) )
        
        service = self.collators.get( self.request.get( 'collator' ) )
        if( service ):
	    output = self.request.get( 'output' )
	    if( output == "application/graphml" ):
                output = "application/graphml+xml"
            collation_headers = { 'Content-Type': 'application/json',
                                  'Accept' : output }
            # Cannot pass text/html in the Accept header evidently.
            if( self.request.get( 'output' ) == 'text/html' ):
                del collation_headers['Accept']
            
            urlresult = urlfetch.fetch( url=service,
                                        headers=collation_headers,
                                        payload=payload,
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = urlresult.content
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d, content %s' 
                                    % ( service, urlresult.status_code, urlresult.content ) )
        else: 
            raise NoServiceError( 'No defined collator %s' 
                             % self.request.get( collator ) )
        
        if( len( errormsg ) > 0 ):
            self.response.out.write( 'Got errors: %s' % "\n".join( errormsg ) )
        else:
            self.response.headers.__setitem__( 'content-type', 'application/json' )
            self.response.out.write( payload )

class NoServiceError( Exception ): pass
class ServiceNotOKError( Exception ): pass

application = webapp.WSGIApplication(
                                      [('/run_toolchain', MSDispatcher),],
                                      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
