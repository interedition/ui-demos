from google.appengine.api import users
from google.appengine.ext import blobstore
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.ext.webapp.util import run_wsgi_app

class BlobOwner( db.Model ):
    user = db.UserProperty()
    blobkey = db.StringProperty()

class IndexPage( webapp.RequestHandler ):
    def get( self ):
        user = users.get_current_user()
        if user:
            main_page = open( 'html/fileupload.html' )
            self.response.out.write( main_page.read() )
        else:
            self.redirect(users.create_login_url(self.request.uri))

class UploadURLHandler( webapp.RequestHandler ):
    def get( self ):
        upload_url = blobstore.create_upload_url( '/fileupload' )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( '"' + upload_url + '"' )

class FileUploadHandler( webapp.RequestHandler ):
    def post( self ):
        '''Handle the upload of file blobs'''
        ## self.request has a reference to the blob(s) uploaded.
        uploaded_files = self.get_uploads('file')
        query_files = []
        for blob_info in uploaded_files:
            # Associate the blob with the user who uploaded it
            b = BlobOwner( user = users.get_current_user(),
                           blobkey = blob_info.key() )
            # Push the blob key onto the query string for the JSON response
            query_files.append( "key=" + blob_info.key() )
        ## Return a redirect to a JSON respose for the file(s) uploaded.
        self.redirect( '/uploadjson?%s' % '&'.join( query_files ) )

class UploadJSONResponse( webapp.RequestHandler ):
    def get( self ):
        '''Return a JSON object with file info for each of the passed blobs'''
        answer = []
        for blob_key in self.request.get( 'key' ):
            blob_info = blobstore.BlobInfo.get( blob_key )
            answer.append( { 'name': blob_info.filename,
                             'size': blob_info.size,
                             'url': "//%s/serve/%s" % ( hostname, blob_info.filename ),
                             'delete_url': "//%s/delete/%s" % ( hostname, blob_info.filename ),
                             } )
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write( answer )

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
                                     [('/', IndexPage),
                                      ('/getUploadURL', UploadURLHandler),
                                      ('/fileupload', FileUploadHandler),
                                      ('/serve/([^/]+)?', ServeHandler),
                                      ('/uploadjson', UploadJSONResponse)],
                                     debug=True)

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
