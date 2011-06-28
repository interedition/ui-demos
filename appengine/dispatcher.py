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
    
    resultactions = { 'application/xhtml+xml': { 'formaction': '/htmldisplay', 'buttons': [ 'Render the HTML' ] },
                      'application/xml': { 'formaction': '/teidisplay', 'buttons': [ 'Display in Versioning Machine' ] }, 
                      'application/graphml+xml': { 'formaction': 'http://eccentricity.org:3000', 'buttons': [ 'Send to lemmatizer' ] },
                      }
    
    def post( self ):
    	errormsg = []
        def is_text( x ):
            return( x.startswith( 'file' ) or x.startswith( 'url' ) )
        text_ids = filter( is_text, self.request.arguments() )
        tokenized_texts = { 'witnesses': [] }
        ## Use provided sigla iff a unique sigil is provided for each text.
        use_sigla = False
        sigla = {}
        for ti in text_ids:
            text = json.loads( self.request.get( ti ) )
            sigil = text['sigil']
            if sigil:
                sigla[sigil] = ti
        if len( sigla.keys() ) == len( text_ids ):
            use_sigla = True;
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
                    textid = ti
                    if use_sigla:
                        textid = text['sigil']
                    tokens = json.loads( urlresult.content )
                    tokenized_texts['witnesses'].append( { 'id': textid,
                                                           'tokens': tokens } )
                else:
                    raise ServiceNotOKError( 'Service %s returned status code %d' 
                                        % ( service, urlresult.status_code ) )
            else:
                raise NoServiceError( 'No defined tokenizer for type %s' % text['type'] )
        
        payload = json.dumps( tokenized_texts, ensure_ascii=False ).encode( 'utf-8' )
        
        if( self.request.get( 'fuzzymatch' ) == 'true' ):
            service = self.regularizers.get( 'fuzzymatch' )
            urlresult = urlfetch.fetch( url=service,
                                        payload=payload,
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = urlresult.content   # Still JSON here
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d' 
                                    % ( service, urlresult.status_code ) )
        
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
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = urlresult.content  ## Could be one of several formats now
                payload = payload.decode("utf-8")
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d, content %s' 
                                    % ( service, urlresult.status_code, urlresult.content ) )
        else: 
            raise NoServiceError( 'No defined collator %s' 
                             % self.request.get( collator ) )
        
        if( len( errormsg ) > 0 ):
            self.response.out.write( 'Got errors: %s' % "\n".join( errormsg ) )
        else:
            answer = { 'result': payload,
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
