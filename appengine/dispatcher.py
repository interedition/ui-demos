import logging
import re
import simplejson as json
import urllib
from fileupload import FileInfo, FileText
from handleInput import xml_regularize
from teiResult import add_witnesses
from google.appengine.api import urlfetch
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

def load_text_from_id( textid_str, sigil ):
    '''Given a text ID, save the user-specified sigil and return its
    content and its type.'''
    textid_str = str( urllib.unquote( textid_str ) )
    id_parts = textid_str.split( '-' )
    text_id = id_parts.pop()
    blob_id = '-'.join( id_parts )
    text_record = list( db.GqlQuery( "SELECT * FROM FileText WHERE blobkey = '%s' AND id = '%s'" 
                                     % ( blob_id, text_id ) ) )
    if text_record == None:
        logging.error( "No record found for text ID %s" % textid_str )
        raise TextNotFoundError
    text_record = text_record[0]
    if text_record.sigil != sigil:
        text_record.sigil = sigil
        text_record.put()
    logging.info( "About to read %s at offset %s for length %s, text %s"
                  %( text_record.file, text_record.offset, text_record.length, text_record.id ) )
    reader = blobstore.BlobReader( blobstore.BlobKey( blob_id ) )
    if text_record.filetype == 'teixml':
        start = text_record.offset
        end = text_record.offset + text_record.length
        xmlfile = xml_regularize( reader.read() )
        content = xmlfile[start:end]
    else: 
        reader.seek( text_record.offset )
        content = reader.read( text_record.length )
    answer = { 'entity': text_record,
               'content': content,
               'type': text_record.filetype }
    return answer

def strip_tags( tstr ):
    cxtextmatch = re.match( r"\<witness[^\>]*\>(.*)\</witness\>", tstr )
    if cxtextmatch:
        return cxtextmatch.group(1)
    else:
        return tstr

class MSDispatcher( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Another post-only page</title></head><body>You should not be navigating here via GET.</body></html>' )
    
    tokenizers = { 'plaintext': 'http://interedition-tools.appspot.com/plaintext_tokenize',
                   'collatexinput': 'http://interedition-tools.appspot.com/plaintext_tokenize',
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
            text = load_text_from_id( ti, sigil )
            if( text['type'] == 'plaintext' ):
                tokenizer_args['text'] = text['content']
            elif( text['type'] == 'collatexinput' ):
                tokenizer_args['text'] = strip_tags( text['content'] )
            elif( text['type'] == 'teixml' ):
                tokenizer_args['xmltext'] = text['content']
            sigilmap[sigil] = text['entity']
            service = self.tokenizers.get( text['type'] )
            if service:
                form_data = urllib.urlencode( tokenizer_args )
                urlresult = urlfetch.fetch( url=service,
                                            payload=form_data,
                                            method='POST' )
                if urlresult.status_code == 200:
                    tokens = json.loads( urlresult.content )
                    tokenized_texts['witnesses'].append( { 'id': sigil,
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
            
            rpc = urlfetch.create_rpc()
            urlresult = urlfetch.make_fetch_call( rpc,
                                                  url=service,
                                                  headers=collation_headers,
                                                  payload=payload,
                                                  method='POST' )
            try: 
                result = rpc.get_result()
                if result.status_code == 200:
                    payload = result.content  ## Could be one of several formats now
                else:
                    raise ServiceNotOKError( 'Service %s returned status code %d, content %s' 
                                             % ( service, urlresult.status_code, urlresult.content ) )
            except urlfetch.DownloadError:
                raise ServiceNotOKError( 'Service %s errored or timed out' % service )
        else: 
            raise NoServiceError( 'No defined collator %s' 
                             % self.request.get( 'collator' ) )
        
        if( len( errormsg ) > 0 ):
            self.response.out.write( 'Got errors: %s' % "\n".join( errormsg ) )
        else:
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
class TextNotFoundError( Exception ): pass

application = webapp.WSGIApplication(
                                      [('/run_toolchain', MSDispatcher),],
                                      debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
