import handleInput
import logging
import simplejson as json
import urllib
from google.appengine.api import users
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.webapp.util import run_wsgi_app

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

#### Datastore classes
class FileInfo( db.Model ):
    blobkey = db.StringProperty()  # file ID: key
    user = db.UserProperty()       # who uploaded the thing
    type = db.StringProperty()     # plaintxt, teixml, collatexinput, etc.

class FileText( db.Model ):
    blobkey = db.StringProperty()  # file ID
    id = db.StringProperty()       # unique text ID
    textparent = db.StringProperty()   # parent text of this subtext
    offset = db.IntegerProperty()  # where in the file I start
    length = db.IntegerProperty()  # how long I am

#### Web request handler classes
class UploadURLHandler( webapp.RequestHandler ):
    def get( self ):
        upload_url = blobstore.create_upload_url( '/fileupload' )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( '"' + upload_url + '"' )

class FileUploadHandler( blobstore_handlers.BlobstoreUploadHandler ):
    def get( self ):
        '''Return information on file blobs that are here'''
        owner_files = db.GqlQuery( "SELECT * FROM FileInfo WHERE user = USER('%s')" % users.get_current_user() )
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
        logging.info( 'Have %d uploaded files' % len( uploaded_files ) )
        query_files = []
        for blob_info in uploaded_files:
            # Parse out the texts from the blob.
            reader = blobstore.BlobReader( blob_info )
            ### BIG TODO exception handling!
            file_texts = handleInput.parse_file( reader.read() )
            file_type = None
            for text in file_texts:
                logging.info( "Found text %s in file %s at offset %s, length %s" 
                               % ( text['id'], blob_info.filename, text['offset'], text['length'] ) )
                ft = FileText( blobkey = str( blob_info.key() ),
                               id = text['id'],
                               offset = text['offset'],
                               length = text['length'] )
                if 'parent' in text:
                    ft.textparent = text['parent']
                file_type = text['type']    # This can be taken from any record
                ft.put()
            # Associate the blob with the user who uploaded it
            b = FileInfo( user = users.get_current_user(),
                           type = file_type,
                           blobkey = str( blob_info.key() ) )
            # Push the blob key onto the query string for the JSON response
            b.put()
            query_files.append( str( blob_info.key() ) )
        ## Return a redirect to a JSON respose for the file(s) uploaded.
        query_string = '/'.join( query_files )
        logging.info( 'Redirecting with query string %s' % query_string )
        self.redirect( '/uploadjson/%s' % query_string )

class UploadJSONResponse( webapp.RequestHandler ):
    def get( self, resource ):
        '''Return a JSON object with file info for each of the blobs passed as
        part of the URL resource.'''
        logging.info( 'Got resource %s' % resource )
        blob_keys = resource.split('/')
        answer = []
        for blob_key in blob_keys:
            answer.append( GetUIData( blobstore.BlobInfo.get( str( urllib.unquote( blob_key ) ) ) ) )
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
        blob_info = blobstore.BlobInfo.get(resource)
        blob_info.delete()
        this_file_info = db.GqlQuery( "SELECT * FROM FileInfo WHERE blobkey = '%s'" % resource )
        for b in this_file_info:
            db.delete( b )
        this_file_texts = db.GqlQuery( "SELECT * FROM FileText WHERE blobkey = '%s'" % resource )
        for t in this_file_texts:
            db.delete( t )
        answer = []
        answer.append( "Deleted %s" % resource )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )

class ReturnTexts( webapp.RequestHandler ):
    def post( self ):
        return get( self )

    def get( self ):
        '''Return a JSON response that is the list of texts and default sigla
        that occur in the files uploaded by the user.'''
        answer = {}
        owner_files = db.GqlQuery( "SELECT * FROM FileInfo WHERE user = USER('%s')" % users.get_current_user() )
        sequence = 0
        for file in owner_files:
            fileblob = blobstore.BlobInfo.get( file.blobkey )  # use this to get filename
            logging.info( "Retrieving text(s) in file %s" % fileblob.filename )
            answer[fileblob.filename] = []
            stored_texts = db.GqlQuery( "SELECT * FROM FileText WHERE blobkey = '%s' ORDER BY id" % file.blobkey )
            for st in stored_texts:
                logging.info( "...found text %s for file %s" % ( st.id, fileblob.filename ) )
                answer[fileblob.filename].append( { 'text': file.blobkey + '-' + st.id,
                                                    'parent': st.textparent,
                                                    'autosigil': self.autosigil( file.type, st.id, sequence ) } )
                sequence += 1
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )
    
    def autosigil( self, filename, textid, autosig_sequence ):
        '''Assigns a default sigil for a text, depending on its order and its
        type.'''
        sigil = None
        if type == 'collatexinput':
            sigil = textid
        else:
            sigil = chr( autosig_sequence + 65 )
            autosig_sequence += 1
        return sigil

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
