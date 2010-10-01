import simplejson as json
import handleInput
import sys
import xml
from google.appengine.api import urlfetch
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

def geturl( url ):
    try:
        urlresult = urlfetch.fetch( url )
        if urlresult.status_code == 200:
            return( True, urlresult.content )
        else:
            errormsg = 'Attempt to fetch %s gave status %d' % ( url, urlresult.status_code )
            return( False, errormsg )
    except urlfetch.Error, inst:
        return( False, inst.__str__() )


class FindTexts( webapp.RequestHandler ):
    def get( self ):
        self.response.out.write( '<html><head><title>Not done yet</title></head><body>There is no UI for this form yet.</body></html>' )
        
    def post( self ):
        errormsg = []
        files = {}
        # What do we have?  Can have url1..urlN and file1..fileN
        req_params = self.request.arguments()
        for param in req_params:
            if ( param.startswith( 'url' ) ):
                urlstring = self.request.get( param )
                ( success, content ) = geturl( urlstring )
                if( success ):
                    files[param] = content
                else:
                    errormsg.append( 'Could not fetch URL %s: %s' 
                                     % ( url, content ) )
            elif ( param.startswith( 'file' ) ):
                content = self.request.get( param )
                # Is it empty?
                if( content != '' ):
                    files[param] = self.request.get( param )
            else:
                errormsg.append( 'Unrecognized parameter name ' + param )
        
        # For each of the strings in files, we need to break them down
        # into texts. Then we will hand back a JSON data structure
        # that is a hash of parameter keys, where the value of each
        # key is an array of texts.
        textlist = {}
        for param in files.keys():
            content = files[param]
            #errormsg.append( 'Content for %s is %s' % ( param, content ) )
            try:
                filetype = handleInput.filetype( content )
            except xml.parsers.expat.ExpatError:
                errorobj = sys.exc_info()[1]
                errorstr = 'XML parsing error: line %d, column %d: %s' % ( errorobj.lineno, errorobj.offset, xml.parsers.expat.ErrorString( errorobj.code ) )
                errormsg.append( 'Malformed XML file for %s (content %s): %s' 
                                 % ( param, content, errorstr ) )
            else:
                if( filetype == 'plaintext' ):
                    textlist[param] = [ { 'content': content } ]
                elif( filetype == 'teixml' ):
                    rootnode = handleInput.get_tei_document_node( content )
                    teiTexts = handleInput.find_text_children( rootnode )
                    textlist[param] = []
                    for tt in teiTexts:
                        textlist[param].append( tt.dict_export() )
                else:
                    errormsg.append( 'Unsupported filetype %s for %s' 
                                     % ( filetype, param ) )
        # Do we have errors?
        if( len( errormsg ) > 0 ):
            self.response.out.write( 'Got errors: %s' % "\n".join( errormsg ) )
        else:
            self.response.headers.__setitem__( 'content-type', 'application/json' )
            self.response.out.write( json.dumps( textlist, encoding="UTF-8", ensure_ascii=False ) )
        
application = webapp.WSGIApplication(
                                     [('/return_texts', FindTexts)],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
