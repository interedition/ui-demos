import re
import simplejson as json
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

def tokenize_plaintext( textstring, delimiter = None ):
    '''Take a plaintext string and tokenize it.  This means splitting on 
    whatever delimiter is supplied, or whitespace by default.
    Return a list of dictionaries that will be converted to JSON.'''
    tokens = []
    words = textstring.split( delimiter )
    for w in words:
        ( plainword, punct ) = strip_punct( w )
        wtoken = { 't': plainword }
        if len( punct ):
            wtoken['punctuation'] = punct
        tokens.append( wtoken )
    answer = { 'tokens': tokens }
    return answer

def strip_punct( wordstring ):
    posixpunct = re.compile( r"[!\"#$%&'()*+,\./:;<=>?@[\\\]^_`{|}~]" )
    punctiter = posixpunct.finditer( wordstring )
    punct = []
    for pi in punctiter:
        punct.append( { 'char': pi.group(0), 'pos': pi.start() } )
    word = posixpunct.sub( '', wordstring )
    return( word, punct )

class TokenizerPage( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Use post.</title></head><body>There is no UI for this form yet.</body></html>' )
        
    def post( self ):
        delim = self.request.get( 'delimiter', default_value=None )
        text = self.request.get( 'text' )
        tokens = tokenize_plaintext( text, delim)
        #self.response.headers.__setitem__( 'content-type', 'application/json; charset=utf-8' )
        self.response.headers.__setitem__( 'content-type', 'application/json' )
        self.response.out.write( json.dumps( tokens, encoding="UTF-8", ensure_ascii=False ) )
        
application = webapp.WSGIApplication(
                                     [('/plaintext_tokenize', TokenizerPage)],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
