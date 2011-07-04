import datetime
import fileupload
import logging
from google.appengine.ext.blobstore import BlobInfo
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class Cleanup( webapp.RequestHandler ):
    def get( self ):
        '''Look for all blobs older than a day, and delete them and their
        associated datastore records'''
        logging.info( "Cleaning up old blobs..." )
        day_ago = datetime.datetime.utcnow().replace(microsecond=0) + datetime.timedelta( -1 )
        old_blobs = BlobInfo.gql( "WHERE creation < DATETIME('%s')" % day_ago )
        for ob in old_blobs:
            answer = fileupload.DeleteBlob( ob )
            logging.info( answer[0] )


class FileUploadHandler( webapp.RequestHandler ):
    def post( self ):
        contents = None
        if( self.request.get( 'inputfile' ) ):
            contents = self.request.get( 'inputfile' )
        if( contents ):
            self.response.out.write( contents )

application = webapp.WSGIApplication( [('/cleanup', Cleanup)],
                                      debug=True )

def main():
  run_wsgi_app(application)

if __name__ == "__main__":
  main()

