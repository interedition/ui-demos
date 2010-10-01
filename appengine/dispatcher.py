import re
# import simplejson as json
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class MSDispatcher( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Another post-only page</title></head><body>You should not be navigating here via GET.</body></html>' )
    
    tokenizers = { 'plaintext': 'http://tlatokenizer.appspot.com/plaintext_tokenize',
                   'teixml': 'http://www.eccentricity.org/teitokenizer/',
                   # 'lucene': 'maybe someday',
                   }
    regularizers = { 'fuzzymatch': 'http://furious-wind-27.heroku.com/regularize_fuzzy',
                     }
    collators = { 'collatex': 'http://gregor.middell.net/collatex/api/collate' }
    
    def post( self ):
        def is_text( x ):
            x.startswith( 'file' ) or x.startswth( 'url' )
        
        text_ids = filter( is_text, self.request.arguments() )
        tokenized_texts = { 'witnesses': [] }
        for ti in text_ids:
            tokenizer_args = {}
            text = json.loads( self.request.get( ti ) )
            if( text['type'] == 'plaintext' ):
                tokenizer_args['text'] = text['content']
            elif( text['type'] = 'teixml' ):
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
        if( self.request.get( 'fuzzymatch' ) ):
            service = self.regularizers.get( 'fuzzymatch' )
            urlresult = urlfetch.fetch( url=service,
                                        payload=payload,
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = json.loads( urlresult.content )
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d' 
                                    % ( service, urlresult.status_code ) )
        
        service = self.collators.get( self.request.get( 'collator' ) )
        if( service ):
            collation_headers = { 'Content-Type': 'application/json',
                                  'Accept' : self.request.get( 'output' ) }
            
            urlresult = urlfetch.fetch( url=service,
                                        headers=collation_headers,
                                        payload=payload,
                                        method='POST' )
            if urlresult.status_code == 200:
                payload = json.loads( urlresult.content )
            else:
                raise ServiceNotOKError( 'Service %s returned status code %d' 
                                    % ( service, urlresult.status_code ) )
        else: 
            raise NoServiceError( 'No defined collator %s' 
                             % self.request.get( collator ) )
        
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
