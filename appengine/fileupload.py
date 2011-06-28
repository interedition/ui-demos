import simplejson as json
from google.appengine.api import users
from google.appengine.ext import blobstore
from google.appengine.ext.blobstore import BlobKey
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.webapp.util import run_wsgi_app

def GetUIData( blob_key ):
    blob_info = blobstore.BlobInfo.get( blob_key )
    data_struct = { 'name': blob_info.filename,
                    'size': blob_info.size,
                    'url': "//%s/serve/%s" % ( hostname, blob_info.filename ),
                    'delete_url': "//%s/delete/%s" % ( hostname, blob_info.filename ),
                    }
    return data_struct

class BlobOwner( db.Model ):
    user = db.UserProperty()
    blobkey = db.StringProperty()

class UploadURLHandler( webapp.RequestHandler ):
    def get( self ):
        upload_url = blobstore.create_upload_url( '/fileupload' )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( '"' + upload_url + '"' )

class FileUploadHandler( blobstore_handlers.BlobstoreUploadHandler ):
    def get( self ):
        '''Return information on file blobs that are here'''
        owner_files = db.GqlQuery( "SELECT * FROM BlobOwner WHERE user = USER('%s')" % users.get_current_user() )
        answer = []
        for file in owner_files:
            answer.append( GetUIData( file.blobkey ) )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )
    
    def post( self ):
        '''Handle the upload of file blobs'''
        ## self.request has a reference to the blob(s) uploaded.
        uploaded_files = self.get_uploads('file')
        query_files = []
        for blob_info in uploaded_files:
            # Associate the blob with the user who uploaded it
            b = BlobOwner( user = users.get_current_user(),
                           blobkey = str( blob_info.key() ) )
            # Push the blob key onto the query string for the JSON response
            b.put()
            query_files.append( "key=" + str( blob_info.key() ) )
        ## Return a redirect to a JSON respose for the file(s) uploaded.
        self.redirect( '/uploadjson?%s' % '&'.join( query_files ) )

class UploadJSONResponse( webapp.RequestHandler ):
    def get( self ):
        '''Return a JSON object with file info for each of the passed blobs'''
        answer = []
        for blob_key in self.request.get( 'key' ):
            answer.append( GetUIData( BlobKey( blob_key ) ) )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( json.dumps( answer, ensure_ascii=False ).encode( 'utf-8' ) )  # TODO json encode this

class ServeHandler( blobstore_handlers.BlobstoreDownloadHandler ):
    def get( self, resource ):
        resource = str(urllib.unquote(resource))
        blob_info = blobstore.BlobInfo.get(resource)
        self.send_blob(blob_info)

class DeleteHandler( webapp.RequestHandler ):
    def get( self, resource ):
        resource = str(urllib.unquote(resource))
        blob_info = blobstore.BlobInfo.get(resource)
        blob_info.delete()
        this_blob_owner = db.GqlQuery( "SELECT * FROM BlobOwner WHERE blobkey = %s" % blob_info.key() )
        for b in this_blob_owner:
            db.delete( b )
        self.response.out.write( "Deleted %s" % resource )


application = webapp.WSGIApplication(
                                     [
                                      ('/getUploadURL', UploadURLHandler),
                                      ('/fileupload', FileUploadHandler),
                                      ('/serve/([^/]+)?', ServeHandler),
                                      ('/uploadjson', UploadJSONResponse),
                                      ],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
