from __future__ import with_statement

import handleInput
import logging
import simplejson as json
import urllib
import sys
import xml
from google.appengine.api import files
from google.appengine.api import urlfetch
from google.appengine.api import users
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.webapp.util import run_wsgi_app

#### Datastore classes
class FileInfo( db.Model ):
    blobkey = db.StringProperty()  # file ID: key
    user = db.UserProperty()       # who uploaded the thing
    type = db.StringProperty()     # plaintxt, teixml, collatexinput, etc. // TODO do we use this?

class FileText( db.Model ):
    blobkey = db.StringProperty()  # file ID
    id = db.StringProperty()       # unique text ID
    offset = db.IntegerProperty()  # where in the file I start
    length = db.IntegerProperty()  # how long I am
    sigil = db.StringProperty()    # the eventual sigil for this text
    file = db.StringProperty()     # the name of the parent file
    filetype = db.StringProperty() # the type of the parent file

#### Utility functions
def GetUIData( blob_info ):
    '''Return information about the file blob in a form expected by the
    jQuery UI.'''
    data_struct = { 'name': blob_info.filename,
                    'size': blob_info.size,
                    'url': "/serve/%s" % blob_info.filename,
                    'delete_url': "/delete/%s" % ( urllib.quote( str( blob_info.key() ) ) ),
                    'delete_type': 'DELETE',
                    }
    return data_struct

def ProcessBlob( blob_info ):
    '''Populate the datastores with the appropriate meta-information about
    the given blob.'''
    # Parse out the texts from the blob.
    reader = blobstore.BlobReader( blob_info )
    # Associate the blob with the user who uploaded it
    b = FileInfo( user = users.get_current_user(),
                  blobkey = str( blob_info.key() ) )
    # Find the texts in this blob
    ft_records = []
    file_type = None
    try:
        file_texts = handleInput.parse_file( reader.read() )
    except xml.parsers.expat.ExpatError, e:
        raise FileParseError( 'XML parsing failed for %s: %s' % ( blob_info.filename, e.__str__() ) )
    except handleInput.UnsupportedFiletypeException:
        raise FileParseError( 'Cannot collate filetype of %s' % blob_info.filename )
    
    for text in file_texts:
        ft = FileText( blobkey = str( blob_info.key() ),
                       id = text['id'],
                       file = blob_info.filename,
                       filetype = text['type'],
                       offset = text['offset'],
                       length = text['length'] )
        file_type = text['type']    # This can be taken from any record
        ft_records.append( ft )
    # Record the file type as determined by parse_file
    b.type = file_type
    b.put()
    # Write all this to the datastore
    for ft in ft_records:
        ft.put()

def DeleteBlob( key ):
    if isinstance( key, blobstore.BlobInfo ):
        blob_info = key
        key = blob_info.key()
    else:
        blob_info = blobstore.BlobInfo.get(key)
    
    this_file_info = db.GqlQuery( "SELECT * FROM FileInfo WHERE blobkey = '%s'" % key )
    for b in this_file_info:
        db.delete( b )
    this_file_texts = db.GqlQuery( "SELECT * FROM FileText WHERE blobkey = '%s'" % key )
    for t in this_file_texts:
        db.delete( t )
    
    if blob_info == None:
        raise FileMissingError( 'Cannot delete non-existent file %s' % key )
    blob_info.delete()
    answer = [ "Deleted %s" % key ]
    return answer

def sigilcmp( x, y ):
    if x.isdigit() and y.isdigit():
        return cmp( int( x ), int( y ) )
    else:
        return cmp( x, y )


#### Web request handler classes
class UploadURLHandler( webapp.RequestHandler ):
    def get( self ):
        upload_url = blobstore.create_upload_url( '/fileupload' )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( '"' + upload_url + '"' )

class FileUploadHandler( blobstore_handlers.BlobstoreUploadHandler ):
    def get( self ):
        '''Return information on file blobs that are here'''
        owner_files = db.GqlQuery( "SELECT * FROM FileInfo WHERE user = :1", 
                                   users.get_current_user() )
        answer = []
        for file in owner_files:
            answer.append( GetUIData( blobstore.BlobInfo.get( file.blobkey ) ) )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )
    
    def post( self ):
        '''Handle the upload of file blobs, record the user to whom the blob
        belongs, and find the constituent texts in the blob'''
        ## self.request has a reference to the blob(s) uploaded.
        uploaded_files = self.get_uploads('files[]')
        query_files = []
        for blob_info in uploaded_files:
            try:
                ProcessBlob( blob_info )
            except FileParseError, f:
                query_files.append( 'ERROR=%s' % f.msg )
            except:
                ## Not sure yet what else might go wrong.
                exc_info = sys.exc_info()
                query_files.append( 'ERROR=unknown exception %s for %s' 
                                    % ( exc_info[0], blob_info.filename ) )
            else:
                # Push the blob key onto the query string for the JSON response
                query_files.append( str( blob_info.key() ) )
        ## Return a redirect to a JSON respose for the file(s) uploaded.
        query_string = '/'.join( query_files )
        self.redirect( '/uploadjson/%s' % query_string )

class UploadJSONResponse( webapp.RequestHandler ):
    def get( self, resource ):
        '''Return a JSON object with file info for each of the blobs passed as
        part of the URL resource.'''
        blob_keys = resource.split('/')
        answer = []
        for blob_key in blob_keys:
            blob_key = str( urllib.unquote( blob_key ) )
            if( blob_key.startswith( 'ERROR' ) ):
                errorstr = blob_key[6:]
                answer.append( { 'error': errorstr } )
            else:
                answer.append( GetUIData( blobstore.BlobInfo.get( blob_key ) ) )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )

class ServeHandler( blobstore_handlers.BlobstoreDownloadHandler ):
    def get( self, resource ):
        resource = str(urllib.unquote(resource))
        blob_info = blobstore.BlobInfo.get(resource)
        self.send_blob(blob_info)

class DeleteHandler( webapp.RequestHandler ):
    def delete( self, resource ):
        resource = str(urllib.unquote(resource))
        answer = DeleteBlob( resource )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )

class ReturnTexts( webapp.RequestHandler ):
    def post( self ):
        return self.get

    def get( self ):
        '''Fetch any provided URLs into the blobstore, then return a JSON
        response that is the list of texts and default sigla that
        occur in the files uploaded by the user.'''
        geturlfields = lambda x: x.startswith( 'url' )
        urlkeys = filter( geturlfields, self.request.arguments() )
        errormsg = None
        for urlkey in urlkeys:
            url = self.request.get( urlkey )
            if url == None or url == '':
                continue
            try:
                result = urlfetch.fetch( url )
            except:
                exc_info = sys.exc_info()
                errormsg = "Error fetching %s: %s" % ( url, exc_info[0] )
            else:
                if result.status_code == 200:
                    # Stick the content in the blobstore, detect texts, etc.
                    url_parts = url.split( '/' )
                    remote_filename = url_parts[-1]
                    url_file = files.blobstore.create( mime_type=result.headers['Content-Type'],
                                                       _blobinfo_uploaded_filename=remote_filename )
                    with files.open( url_file, 'a' ) as f:
                        f.write( result.content )
                    files.finalize( url_file )
                    blob_key = files.blobstore.get_blob_key( url_file )
                    ProcessBlob( blobstore.BlobInfo.get( blob_key ) )
                else:
                    errormsg = "HTTP error fetching %s: %s" % ( url, result.status_code )
        if errormsg:
            self.response.clear()
            self.response.set_status( 500 )
            self.response.out.write( errormsg )
        else:
            answer = []
            owner_files = db.GqlQuery( "SELECT * FROM FileInfo WHERE user = :1", users.get_current_user() )
            sequence = 0
            for file in owner_files:
                fileblob = blobstore.BlobInfo.get( file.blobkey )  # use this to get filename
                logging.info( "Retrieving text(s) in file %s" % fileblob.filename )
                stored_texts = db.GqlQuery( "SELECT * FROM FileText WHERE blobkey = '%s' ORDER BY id" % file.blobkey )
                for st in stored_texts:
                    logging.info( "...found text %s for file %s" % ( st.id, fileblob.filename ) )
                    ## What should the text's sigil be?
                    sigil = st.sigil
                    if st.sigil == None:
                        sigil = self.autosigil( file.type, st.id, sequence )
                    ## What should we entitle the text?
                    text_title = None
                    if file.type == 'plaintext':
                        text_title = fileblob.filename
                    elif file.type == 'collatexinput':
                        text_title = fileblob.filename + ' wit ' + st.id
                    elif file.type == 'teixml' and len( list( stored_texts ) ) == 1:
                        text_title = fileblob.filename
                    else:  # a TEI file with multiple texts
                        text_title = fileblob.filename + ' text ' + str( int( st.id ) + 1 )
                    answer.append( { 'text': file.blobkey + '-' + st.id,
                                     'title': text_title,
                                     'autosigil': sigil } )
                    sequence += 1
            answer.sort( cmp=lambda x, y: sigilcmp( x['autosigil'], y['autosigil'] ) )
            self.response.headers['Content-Type'] = 'application/json'
            self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )
    
    def autosigil( self, filetype, textid, autosig_sequence ):
        '''Assigns a default sigil for a text, depending on its order and its
        type.'''
        sigil = None
        if filetype == 'collatexinput':
            sigil = textid
        else:
            sigil = chr( autosig_sequence + 65 )
            autosig_sequence += 1
        return sigil

class FileParseError( Exception ):
    def __init__( self, msg ):
        self.msg = msg
    def __str__( self ):
        return repr( self.msg )
class FileMissingError( Exception ):
    def __init__( self, msg ):
        self.msg = msg
    def __str__( self ):
        return repr( self.msg )


application = webapp.WSGIApplication(
                                     [
                                      ('/getUploadURL', UploadURLHandler),
                                      ('/fileupload', FileUploadHandler),
                                      ('/serve/([^/]+)?', ServeHandler),
                                      ('/delete/([^/]+)?', DeleteHandler),
                                      ('/uploadjson/(.*)', UploadJSONResponse),
                                      ('/return_texts', ReturnTexts),
                                      ],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
